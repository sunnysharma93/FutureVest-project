package com.futurevest.application.service;

import com.futurevest.application.port.out.RepaymentRepository;
import com.futurevest.application.port.out.PaymentRepository;
import com.futurevest.application.port.out.UserRepository;
import com.futurevest.application.port.out.InvestorRepository;
import com.futurevest.domain.entity.Repayment;
import com.futurevest.domain.entity.Payment;
import com.futurevest.domain.entity.User;
import com.futurevest.domain.entity.Investor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class RepaymentService {

    private final RepaymentRepository repaymentRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final InvestorRepository investorRepository;
    private final EmailService emailService;
    
    private static final BigDecimal DEFAULT_SALARY_PERCENTAGE = new BigDecimal("0.02"); // 2%
    private static final String DEFAULT_DUE_DATE = "01"; // 1st of every month

    @Transactional
    public Repayment createRepaymentSchedule(UUID paymentId, BigDecimal salaryPercentage, String dueDate) {
        log.info("Creating repayment schedule for payment ID: {} with {}% salary, due date: {}", 
                paymentId, salaryPercentage.multiply(BigDecimal.valueOf(100)), dueDate);

        Optional<Payment> paymentOpt = paymentRepository.findById(paymentId);
        if (paymentOpt.isEmpty()) {
            log.error("Payment not found for repayment schedule - ID: {}", paymentId);
            throw new RuntimeException("Payment not found");
        }

        Payment payment = paymentOpt.get();
        
        Repayment repayment = Repayment.builder()
                .id(UUID.randomUUID())
                .userId(payment.getUserId())
                .investorId(payment.getInvestorId())
                .paymentId(paymentId)
                .amount(BigDecimal.ZERO) // Will be calculated when due
                .salaryPercentage(salaryPercentage)
                .status("PENDING")
                .dueDate(dueDate)
                .processedAt(null)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Repayment savedRepayment = repaymentRepository.save(repayment);
        log.info("Created repayment schedule with ID: {}", savedRepayment.getId());
        
        return savedRepayment;
    }

    @Scheduled(cron = "0 0 9 1 * ?") // 9 AM on 1st of every month
    @Transactional
    public void processMonthlyRepayments() {
        log.info("Starting monthly repayment processing job");
        
        try {
            List<Repayment> pendingRepayments = repaymentRepository.findByStatus("PENDING");
            log.info("Found {} pending repayments to process", pendingRepayments.size());

            for (Repayment repayment : pendingRepayments) {
                processRepayment(repayment);
            }

            log.info("Completed monthly repayment processing job");
        } catch (Exception e) {
            log.error("Error in monthly repayment processing job", e);
        }
    }

    @Scheduled(cron = "0 0 8 1 * ?") // 8 AM on 1st of every month - notification before processing
    public void sendRepaymentNotifications() {
        log.info("Sending repayment notifications");
        
        try {
            List<Repayment> pendingRepayments = repaymentRepository.findByStatus("PENDING");
            log.info("Sending notifications for {} pending repayments", pendingRepayments.size());

            for (Repayment repayment : pendingRepayments) {
                sendRepaymentNotificationAsync(repayment);
            }

            log.info("Completed sending repayment notifications");
        } catch (Exception e) {
            log.error("Error sending repayment notifications", e);
        }
    }

    @Transactional
    public Repayment processRepayment(Repayment repayment) {
        log.info("Processing repayment ID: {}", repayment.getId());

        try {
            BigDecimal repaymentAmount = calculateRepaymentAmount(repayment);
            
            Repayment processedRepayment = repayment.toBuilder()
                    .amount(repaymentAmount)
                    .status("COMPLETED")
                    .processedAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();

            Repayment savedRepayment = repaymentRepository.save(processedRepayment);
            log.info("Successfully processed repayment ID: {} for amount: {}", 
                    savedRepayment.getId(), repaymentAmount);

            sendRepaymentConfirmationAsync(savedRepayment);
            
            return savedRepayment;
        } catch (Exception e) {
            log.error("Failed to process repayment ID: {}", repayment.getId(), e);
            
            Repayment failedRepayment = repayment.toBuilder()
                    .status("FAILED")
                    .updatedAt(Instant.now())
                    .build();
            
            repaymentRepository.save(failedRepayment);
            sendRepaymentFailureAsync(failedRepayment);
            
            throw new RuntimeException("Repayment processing failed", e);
        }
    }

    private BigDecimal calculateRepaymentAmount(Repayment repayment) {
        // This is a simplified calculation - in real scenario, you'd fetch actual salary data
        // For now, we'll use a fixed amount based on the original payment
        Optional<Payment> paymentOpt = paymentRepository.findById(repayment.getPaymentId());
        if (paymentOpt.isEmpty()) {
            throw new RuntimeException("Payment not found for repayment calculation");
        }

        Payment payment = paymentOpt.get();
        // Calculate 2% of the course fee as monthly repayment
        return payment.getAmount().multiply(repayment.getSalaryPercentage())
                .setScale(2, RoundingMode.HALF_UP);
    }

    @Async
    public CompletableFuture<Void> sendRepaymentNotificationAsync(Repayment repayment) {
        try {
            Optional<User> userOpt = userRepository.findById(repayment.getUserId());
            Optional<Investor> investorOpt = investorRepository.findById(repayment.getInvestorId());

            if (userOpt.isPresent() && investorOpt.isPresent()) {
                User user = userOpt.get();
                Investor investor = investorOpt.get();

                String subject = "FutureVest - Monthly Repayment Due";
                String message = String.format(
                    "Dear %s,\n\n" +
                    "Your monthly repayment of %.2f is due today.\n" +
                    "Investor: %s\n" +
                    "Payment ID: %s\n" +
                    "Due Date: %s\n\n" +
                    "Please ensure sufficient funds are available.\n\n" +
                    "Best regards,\n" +
                    "FutureVest Team",
                    user.getName(),
                    calculateRepaymentAmount(repayment),
                    investor.getName(),
                    repayment.getPaymentId(),
                    getNextDueDate(repayment.getDueDate())
                );

                emailService.sendEmail(user.getEmail(), subject, message);
                log.info("Sent repayment notification to user: {}", user.getEmail());
            }
        } catch (Exception e) {
            log.error("Failed to send repayment notification for repayment ID: {}", repayment.getId(), e);
        }
        
        return CompletableFuture.completedFuture(null);
    }

    @Async
    public CompletableFuture<Void> sendRepaymentConfirmationAsync(Repayment repayment) {
        try {
            Optional<User> userOpt = userRepository.findById(repayment.getUserId());
            Optional<Investor> investorOpt = investorRepository.findById(repayment.getInvestorId());

            if (userOpt.isPresent() && investorOpt.isPresent()) {
                User user = userOpt.get();
                Investor investor = investorOpt.get();

                String subject = "FutureVest - Repayment Processed Successfully";
                String message = String.format(
                    "Dear %s,\n\n" +
                    "Your monthly repayment of %.2f has been processed successfully.\n" +
                    "Investor: %s\n" +
                    "Payment ID: %s\n" +
                    "Processed Date: %s\n\n" +
                    "Thank you for your timely payment.\n\n" +
                    "Best regards,\n" +
                    "FutureVest Team",
                    user.getName(),
                    repayment.getAmount(),
                    investor.getName(),
                    repayment.getPaymentId(),
                    Instant.now().atZone(ZoneId.systemDefault()).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                );

                emailService.sendEmail(user.getEmail(), subject, message);
                log.info("Sent repayment confirmation to user: {}", user.getEmail());
            }
        } catch (Exception e) {
            log.error("Failed to send repayment confirmation for repayment ID: {}", repayment.getId(), e);
        }
        
        return CompletableFuture.completedFuture(null);
    }

    @Async
    public CompletableFuture<Void> sendRepaymentFailureAsync(Repayment repayment) {
        try {
            Optional<User> userOpt = userRepository.findById(repayment.getUserId());
            Optional<Investor> investorOpt = investorRepository.findById(repayment.getInvestorId());

            if (userOpt.isPresent() && investorOpt.isPresent()) {
                User user = userOpt.get();
                Investor investor = investorOpt.get();

                String subject = "FutureVest - Repayment Processing Failed";
                String message = String.format(
                    "Dear %s,\n\n" +
                    "We encountered an issue processing your monthly repayment.\n" +
                    "Investor: %s\n" +
                    "Payment ID: %s\n" +
                    "Failed Date: %s\n\n" +
                    "Please contact our support team for assistance.\n\n" +
                    "Best regards,\n" +
                    "FutureVest Team",
                    user.getName(),
                    investor.getName(),
                    repayment.getPaymentId(),
                    Instant.now().atZone(ZoneId.systemDefault()).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                );

                emailService.sendEmail(user.getEmail(), subject, message);
                log.info("Sent repayment failure notification to user: {}", user.getEmail());
            }
        } catch (Exception e) {
            log.error("Failed to send repayment failure notification for repayment ID: {}", repayment.getId(), e);
        }
        
        return CompletableFuture.completedFuture(null);
    }

    public List<Repayment> getRepaymentsByUser(UUID userId) {
        log.info("Fetching repayments for user ID: {}", userId);
        
        List<Repayment> repayments = repaymentRepository.findByUserId(userId);
        log.info("Found {} repayments for user ID: {}", repayments.size(), userId);
        
        return repayments;
    }

    public List<Repayment> getRepaymentsByInvestor(UUID investorId) {
        log.info("Fetching repayments for investor ID: {}", investorId);
        
        List<Repayment> repayments = repaymentRepository.findByInvestorId(investorId);
        log.info("Found {} repayments for investor ID: {}", repayments.size(), investorId);
        
        return repayments;
    }

    public List<Repayment> getPendingRepayments() {
        log.info("Fetching all pending repayments");
        
        List<Repayment> pendingRepayments = repaymentRepository.findByStatus("PENDING");
        log.info("Found {} pending repayments", pendingRepayments.size());
        
        return pendingRepayments;
    }

    private String getNextDueDate(String dueDay) {
        LocalDate today = LocalDate.now();
        int day = Integer.parseInt(dueDay);
        LocalDate nextDue = today.withDayOfMonth(Math.min(day, today.lengthOfMonth()));
        
        if (nextDue.isBefore(today)) {
            nextDue = nextDue.plusMonths(1);
        }
        
        return nextDue.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
    }
}
