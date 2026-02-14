package com.futurevest.infrastructure.scheduling;

import com.futurevest.application.service.RepaymentService;
import com.futurevest.application.service.EmailService;
import com.futurevest.application.service.NotificationService;
import com.futurevest.domain.entity.RepaymentSchedule;
import com.futurevest.domain.entity.User;
import com.futurevest.domain.entity.Investment;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Component
@RequiredArgsConstructor
@Slf4j
public class RepaymentScheduler implements Job {

    private final RepaymentService repaymentService;
    private final EmailService emailService;
    private final NotificationService notificationService;

    @Value("${app.repayment.default-interest-rate:0.12}")
    private double defaultInterestRate;

    @Value("${app.repayment.processing-days:7}")
    private int processingDays;

    @Value("${app.repayment.reminder-days:3}")
    private int reminderDays;

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        log.info("Starting repayment scheduler job");
        
        try {
            // Process due repayments
            processDueRepayments();
            
            // Generate upcoming repayment reminders
            generateRepaymentReminders();
            
            // Calculate and update overdue penalties
            updateOverduePenalties();
            
            // Send daily repayment summary
            sendDailyRepaymentSummary();
            
            log.info("Repayment scheduler job completed successfully");
        } catch (Exception e) {
            log.error("Error in repayment scheduler job", e);
            throw new JobExecutionException("Repayment scheduler failed", e);
        }
    }

    /**
     * Process due repayments for the current date
     */
    private void processDueRepayments() {
        LocalDate today = LocalDate.now();
        
        try {
            Pageable pageable = PageRequest.of(0, 100);
            Page<RepaymentSchedule> dueRepayments = repaymentService.getDueRepayments(today, pageable);
            
            log.info("Found {} due repayments for {}", dueRepayments.getTotalElements(), today);
            
            dueRepayments.getContent().forEach(this::processIndividualRepayment);
            
            // Handle pagination if there are more due repayments
            while (dueRepayments.hasNext()) {
                pageable = dueRepayments.nextPageable();
                dueRepayments = repaymentService.getDueRepayments(today, pageable);
                dueRepayments.getContent().forEach(this::processIndividualRepayment);
            }
            
        } catch (Exception e) {
            log.error("Error processing due repayments for {}", today, e);
        }
    }

    /**
     * Process individual repayment
     */
    private void processIndividualRepayment(RepaymentSchedule repayment) {
        try {
            log.debug("Processing repayment: {}", repayment.getId());
            
            // Mark as overdue if payment is not completed
            if (repayment.getStatus() == RepaymentSchedule.RepaymentStatus.PENDING) {
                repaymentService.markAsOverdue(repayment.getId());
                
                // Send overdue notification
                sendOverdueNotification(repayment);
                
                // Calculate and apply penalty
                applyLatePenalty(repayment);
            }
            
        } catch (Exception e) {
            log.error("Error processing repayment: {}", repayment.getId(), e);
        }
    }

    /**
     * Generate repayment reminders for upcoming payments
     */
    private void generateRepaymentReminders() {
        LocalDate reminderDate = LocalDate.now().plusDays(reminderDays);
        
        try {
            Pageable pageable = PageRequest.of(0, 100);
            Page<RepaymentSchedule> upcomingRepayments = repaymentService.getDueRepayments(reminderDate, pageable);
            
            log.info("Found {} upcoming repayments for {}", upcomingRepayments.getTotalElements(), reminderDate);
            
            upcomingRepayments.getContent().forEach(this::sendRepaymentReminder);
            
            // Handle pagination
            while (upcomingRepayments.hasNext()) {
                pageable = upcomingRepayments.nextPageable();
                upcomingRepayments = repaymentService.getDueRepayments(reminderDate, pageable);
                upcomingRepayments.getContent().forEach(this::sendRepaymentReminder);
            }
            
        } catch (Exception e) {
            log.error("Error generating repayment reminders for {}", reminderDate, e);
        }
    }

    /**
     * Send repayment reminder
     */
    private void sendRepaymentReminder(RepaymentSchedule repayment) {
        try {
            User user = repayment.getUser();
            
            // Send email reminder
            CompletableFuture.runAsync(() -> {
                try {
                    emailService.sendRepaymentReminder(user, repayment);
                } catch (Exception e) {
                    log.error("Failed to send repayment reminder email to user: {}", user.getId(), e);
                }
            });
            
            // Send in-app notification
            notificationService.sendRepaymentReminder(user, repayment);
            
            log.debug("Sent repayment reminder to user: {} for repayment: {}", user.getId(), repayment.getId());
            
        } catch (Exception e) {
            log.error("Error sending repayment reminder for repayment: {}", repayment.getId(), e);
        }
    }

    /**
     * Send overdue notification
     */
    private void sendOverdueNotification(RepaymentSchedule repayment) {
        try {
            User user = repayment.getUser();
            
            // Send email notification
            CompletableFuture.runAsync(() -> {
                try {
                    emailService.sendOverdueNotification(user, repayment);
                } catch (Exception e) {
                    log.error("Failed to send overdue notification email to user: {}", user.getId(), e);
                }
            });
            
            // Send in-app notification
            notificationService.sendOverdueNotification(user, repayment);
            
            log.info("Sent overdue notification to user: {} for repayment: {}", user.getId(), repayment.getId());
            
        } catch (Exception e) {
            log.error("Error sending overdue notification for repayment: {}", repayment.getId(), e);
        }
    }

    /**
     * Calculate and apply late penalty
     */
    private void applyLatePenalty(RepaymentSchedule repayment) {
        try {
            BigDecimal penalty = calculateLatePenalty(repayment);
            
            if (penalty.compareTo(BigDecimal.ZERO) > 0) {
                repaymentService.applyLatePenalty(repayment.getId(), penalty);
                
                // Send penalty notification
                sendPenaltyNotification(repayment, penalty);
                
                log.info("Applied late penalty of {} to repayment: {}", penalty, repayment.getId());
            }
            
        } catch (Exception e) {
            log.error("Error applying late penalty for repayment: {}", repayment.getId(), e);
        }
    }

    /**
     * Calculate late penalty based on days overdue and amount
     */
    private BigDecimal calculateLatePenalty(RepaymentSchedule repayment) {
        LocalDate dueDate = repayment.getDueDate();
        LocalDate today = LocalDate.now();
        
        long daysOverdue = java.time.temporal.ChronoUnit.DAYS.between(dueDate, today);
        
        if (daysOverdue <= 0) {
            return BigDecimal.ZERO;
        }
        
        // Penalty calculation: 1% of principal amount per month overdue
        BigDecimal principalAmount = repayment.getAmount();
        BigDecimal monthlyRate = new BigDecimal("0.01"); // 1% per month
        BigDecimal overdueMonths = new BigDecimal(daysOverdue).divide(new BigDecimal("30"), 2, RoundingMode.UP);
        
        return principalAmount.multiply(monthlyRate).multiply(overdueMonths);
    }

    /**
     * Send penalty notification
     */
    private void sendPenaltyNotification(RepaymentSchedule repayment, BigDecimal penalty) {
        try {
            User user = repayment.getUser();
            
            // Send email notification
            CompletableFuture.runAsync(() -> {
                try {
                    emailService.sendPenaltyNotification(user, repayment, penalty);
                } catch (Exception e) {
                    log.error("Failed to send penalty notification email to user: {}", user.getId(), e);
                }
            });
            
            // Send in-app notification
            notificationService.sendPenaltyNotification(user, repayment, penalty);
            
            log.info("Sent penalty notification to user: {} for repayment: {} with penalty: {}", 
                user.getId(), repayment.getId(), penalty);
            
        } catch (Exception e) {
            log.error("Error sending penalty notification for repayment: {}", repayment.getId(), e);
        }
    }

    /**
     * Send daily repayment summary to administrators
     */
    private void sendDailyRepaymentSummary() {
        try {
            LocalDate today = LocalDate.now();
            
            // Get summary statistics
            long totalDue = repaymentService.getDueRepaymentsCount(today);
            long totalOverdue = repaymentService.getOverdueRepaymentsCount(today);
            BigDecimal totalAmountDue = repaymentService.getTotalAmountDue(today);
            BigDecimal totalPenalties = repaymentService.getTotalPenalties(today);
            
            // Send summary email to administrators
            CompletableFuture.runAsync(() -> {
                try {
                    emailService.sendDailyRepaymentSummary(
                        today,
                        totalDue,
                        totalOverdue,
                        totalAmountDue,
                        totalPenalties
                    );
                } catch (Exception e) {
                    log.error("Failed to send daily repayment summary email", e);
                }
            });
            
            log.info("Daily repayment summary sent for {}: {} due, {} overdue, {} amount due, {} penalties",
                today, totalDue, totalOverdue, totalAmountDue, totalPenalties);
            
        } catch (Exception e) {
            log.error("Error sending daily repayment summary", e);
        }
    }

    /**
     * Generate repayment schedule for new investment
     */
    public void generateRepaymentSchedule(Investment investment) {
        try {
            log.info("Generating repayment schedule for investment: {}", investment.getId());
            
            BigDecimal totalAmount = investment.getAmount();
            int tenureMonths = investment.getTenureMonths();
            BigDecimal monthlyAmount = totalAmount.divide(new BigDecimal(tenureMonths), 2, RoundingMode.UP);
            
            // Generate monthly repayment schedule
            LocalDate startDate = LocalDate.now().plusMonths(1); // Start next month
            
            for (int month = 1; month <= tenureMonths; month++) {
                LocalDate dueDate = startDate.plusMonths(month - 1);
                
                RepaymentSchedule schedule = RepaymentSchedule.builder()
                    .id(java.util.UUID.randomUUID())
                    .investment(investment)
                    .user(investment.getUser())
                    .amount(monthlyAmount)
                    .dueDate(dueDate)
                    .status(RepaymentSchedule.RepaymentStatus.PENDING)
                    .createdAt(LocalDate.now())
                    .build();
                
                repaymentService.saveRepaymentSchedule(schedule);
            }
            
            log.info("Generated {} monthly repayment schedules for investment: {}", 
                tenureMonths, investment.getId());
            
        } catch (Exception e) {
            log.error("Error generating repayment schedule for investment: {}", investment.getId(), e);
        }
    }

    /**
     * Calculate total repayment amount with interest
     */
    public BigDecimal calculateTotalRepayment(Investment investment) {
        try {
            BigDecimal principal = investment.getAmount();
            double rate = investment.getInterestRate() > 0 ? investment.getInterestRate() : defaultInterestRate;
            int tenureMonths = investment.getTenureMonths();
            
            // Simple interest calculation
            BigDecimal interestRate = new BigDecimal(rate);
            BigDecimal totalInterest = principal.multiply(interestRate).multiply(new BigDecimal(tenureMonths))
                .divide(new BigDecimal("12"), 2, RoundingMode.UP);
            
            return principal.add(totalInterest);
            
        } catch (Exception e) {
            log.error("Error calculating total repayment for investment: {}", investment.getId(), e);
            return investment.getAmount(); // Fallback to principal amount
        }
    }

    /**
     * Get repayment statistics for dashboard
     */
    public RepaymentStatistics getRepaymentStatistics(java.util.UUID userId) {
        try {
            LocalDate today = LocalDate.now();
            LocalDate monthStart = today.withDayOfMonth(1);
            LocalDate monthEnd = today.withDayOfMonth(today.lengthOfMonth());
            
            return RepaymentStatistics.builder()
                .totalDue(repaymentService.getTotalAmountDue(userId))
                .totalPaid(repaymentService.getTotalAmountPaid(userId))
                .totalOverdue(repaymentService.getTotalOverdueAmount(userId))
                .currentMonthDue(repaymentService.getAmountDueBetween(userId, monthStart, monthEnd))
                .nextPaymentDue(repaymentService.getNextPaymentDue(userId))
                .build();
            
        } catch (Exception e) {
            log.error("Error getting repayment statistics for user: {}", userId, e);
            return RepaymentStatistics.builder().build();
        }
    }

    // Inner class for statistics
    public static class RepaymentStatistics {
        private final BigDecimal totalDue;
        private final BigDecimal totalPaid;
        private final BigDecimal totalOverdue;
        private final BigDecimal currentMonthDue;
        private final RepaymentSchedule nextPaymentDue;

        private RepaymentStatistics(Builder builder) {
            this.totalDue = builder.totalDue;
            this.totalPaid = builder.totalPaid;
            this.totalOverdue = builder.totalOverdue;
            this.currentMonthDue = builder.currentMonthDue;
            this.nextPaymentDue = builder.nextPaymentDue;
        }

        public BigDecimal getTotalDue() { return totalDue; }
        public BigDecimal getTotalPaid() { return totalPaid; }
        public BigDecimal getTotalOverdue() { return totalOverdue; }
        public BigDecimal getCurrentMonthDue() { return currentMonthDue; }
        public RepaymentSchedule getNextPaymentDue() { return nextPaymentDue; }

        public static Builder builder() {
            return new Builder();
        }

        public static class Builder {
            private BigDecimal totalDue = BigDecimal.ZERO;
            private BigDecimal totalPaid = BigDecimal.ZERO;
            private BigDecimal totalOverdue = BigDecimal.ZERO;
            private BigDecimal currentMonthDue = BigDecimal.ZERO;
            private RepaymentSchedule nextPaymentDue;

            public Builder totalDue(BigDecimal totalDue) {
                this.totalDue = totalDue;
                return this;
            }

            public Builder totalPaid(BigDecimal totalPaid) {
                this.totalPaid = totalPaid;
                return this;
            }

            public Builder totalOverdue(BigDecimal totalOverdue) {
                this.totalOverdue = totalOverdue;
                return this;
            }

            public Builder currentMonthDue(BigDecimal currentMonthDue) {
                this.currentMonthDue = currentMonthDue;
                return this;
            }

            public Builder nextPaymentDue(RepaymentSchedule nextPaymentDue) {
                this.nextPaymentDue = nextPaymentDue;
                return this;
            }

            public RepaymentStatistics build() {
                return new RepaymentStatistics(this);
            }
        }
    }
}
