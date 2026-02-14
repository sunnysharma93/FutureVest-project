package com.futurevest.application.service;

import com.futurevest.domain.entity.User;
import com.futurevest.domain.entity.Job;
import com.futurevest.domain.entity.Investment;
import com.futurevest.domain.entity.RepaymentSchedule;
import com.futurevest.application.port.out.UserRepository;
import com.futurevest.application.port.out.JobRepository;
import com.futurevest.application.port.out.InvestmentRepository;
import com.futurevest.application.port.out.RepaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final InvestmentRepository investmentRepository;
    private final RepaymentRepository repaymentRepository;
    private final NotificationService notificationService;

    // User Management
    public Page<User> getAllUsers(int page, int size, String sortBy, String sortDir, String search) {
        Pageable pageable = PageRequest.of(page, size, 
            Sort.by(Sort.Direction.fromString(sortDir), sortBy));
        
        if (search != null && !search.trim().isEmpty()) {
            return userRepository.searchUsers(search.trim(), pageable);
        }
        
        return userRepository.findAll(pageable);
    }

    @Transactional
    public User updateUserStatus(UUID userId, boolean enabled) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        
        user.setEnabled(enabled);
        user.setUpdatedAt(LocalDateTime.now());
        
        User updatedUser = userRepository.save(user);
        
        // Send notification to user
        if (!enabled) {
            notificationService.sendAccountDisabledNotification(user);
        } else {
            notificationService.sendAccountEnabledNotification(user);
        }
        
        log.info("Updated user {} status to {}", userId, enabled);
        return updatedUser;
    }

    @Transactional
    public User updateUserRole(UUID userId, String role) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        
        user.setRole(role);
        user.setUpdatedAt(LocalDateTime.now());
        
        User updatedUser = userRepository.save(user);
        
        // Send notification to user
        notificationService.sendRoleUpdatedNotification(user, role);
        
        log.info("Updated user {} role to {}", userId, role);
        return updatedUser;
    }

    public User getUserDetails(UUID userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found: " + userId));
    }

    @Transactional
    public void deleteUser(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        
        // Send notification before deletion
        notificationService.sendAccountDeletedNotification(user);
        
        userRepository.delete(user);
        
        log.info("Deleted user {}", userId);
    }

    // Job Management
    public Page<Job> getAllJobs(int page, int size, String sortBy, String sortDir, String search) {
        Pageable pageable = PageRequest.of(page, size, 
            Sort.by(Sort.Direction.fromString(sortDir), sortBy));
        
        if (search != null && !search.trim().isEmpty()) {
            return jobRepository.searchJobs(search.trim(), pageable);
        }
        
        return jobRepository.findAll(pageable);
    }

    @Transactional
    public Job updateJobStatus(UUID jobId, boolean active) {
        Job job = jobRepository.findById(jobId)
            .orElseThrow(() -> new RuntimeException("Job not found: " + jobId));
        
        job.setActive(active);
        job.setUpdatedAt(LocalDateTime.now());
        
        Job updatedJob = jobRepository.save(job);
        
        // Notify affected users
        if (!active) {
            notificationService.sendJobDeactivatedNotification(updatedJob);
        }
        
        log.info("Updated job {} status to {}", jobId, active);
        return updatedJob;
    }

    @Transactional
    public Job createJob(Job job) {
        job.setId(UUID.randomUUID());
        job.setCreatedAt(LocalDateTime.now());
        job.setUpdatedAt(LocalDateTime.now());
        job.setActive(true);
        
        Job createdJob = jobRepository.save(job);
        
        // Notify users about new job
        notificationService.sendNewJobNotification(createdJob);
        
        log.info("Created new job {}", jobId);
        return createdJob;
    }

    @Transactional
    public Job updateJob(UUID jobId, Job jobDetails) {
        Job job = jobRepository.findById(jobId)
            .orElseThrow(() -> new RuntimeException("Job not found: " + jobId));
        
        job.setTitle(jobDetails.getTitle());
        job.setDescription(jobDetails.getDescription());
        job.setCompany(jobDetails.getCompany());
        job.setLocation(jobDetails.getLocation());
        job.setType(jobDetails.getType());
        job.setWorkMode(jobDetails.getWorkMode());
        job.setExperienceLevel(jobDetails.getExperienceLevel());
        job.setMinExperience(jobDetails.getMinExperience());
        job.setMaxExperience(jobDetails.getMaxExperience());
        job.setMinSalary(jobDetails.getMinSalary());
        job.setMaxSalary(jobDetails.getMaxSalary());
        job.setRequiredSkills(jobDetails.getRequiredSkills());
        job.setPreferredSkills(jobDetails.getPreferredSkills());
        job.setRequiredEducation(jobDetails.getRequiredEducation());
        job.setApplicationDeadline(jobDetails.getApplicationDeadline());
        job.setUpdatedAt(LocalDateTime.now());
        
        Job updatedJob = jobRepository.save(job);
        
        // Notify users about job update
        notificationService.sendJobUpdatedNotification(updatedJob);
        
        log.info("Updated job {}", jobId);
        return updatedJob;
    }

    @Transactional
    public void deleteJob(UUID jobId) {
        Job job = jobRepository.findById(jobId)
            .orElseThrow(() -> new RuntimeException("Job not found: " + jobId));
        
        // Notify users about job deletion
        notificationService.sendJobDeletedNotification(job);
        
        jobRepository.delete(job);
        
        log.info("Deleted job {}", jobId);
    }

    // Analytics and Statistics
    public AdminDashboardStats getDashboardStats() {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByEnabled(true);
        long totalJobs = jobRepository.count();
        long activeJobs = jobRepository.countByActive(true);
        long totalInvestments = investmentRepository.count();
        double totalInvestmentAmount = investmentRepository.getTotalInvestmentAmount();
        long totalRepayments = repaymentRepository.count();
        double totalRepaymentAmount = repaymentRepository.getTotalRepaymentAmount();
        
        // Get user registration trends
        List<Object[]> userRegistrationTrends = userRepository.getUserRegistrationTrends();
        Map<String, Long> registrationTrends = userRegistrationTrends.stream()
            .collect(Collectors.toMap(
                row -> row[0].toString(),
                row -> (Long) row[1]
            ));
        
        // Get investment trends
        List<Object[]> investmentTrends = investmentRepository.getInvestmentTrends();
        Map<String, Double> investmentTrendsMap = investmentTrends.stream()
            .collect(Collectors.toMap(
                row -> row[0].toString(),
                row -> (Double) row[1]
            ));
        
        return AdminDashboardStats.builder()
            .totalUsers(totalUsers)
            .activeUsers(activeUsers)
            .totalJobs(totalJobs)
            .activeJobs(activeJobs)
            .totalInvestments(totalInvestments)
            .totalInvestmentAmount(totalInvestmentAmount)
            .totalRepayments(totalRepayments)
            .totalRepaymentAmount(totalRepaymentAmount)
            .userRegistrationTrends(registrationTrends)
            .investmentTrends(investmentTrendsMap)
            .build();
    }

    public List<UserActivity> getUserActivity(UUID userId, int days) {
        LocalDateTime startDate = LocalDateTime.now().minusDays(days);
        List<Object[]> activities = userRepository.getUserActivity(userId, startDate);
        
        return activities.stream()
            .map(row -> UserActivity.builder()
                .activityType(row[0].toString())
                .activityDescription(row[1].toString())
                .activityDate((LocalDateTime) row[2])
                .build())
            .collect(Collectors.toList());
    }

    public List<JobApplicationStats> getJobApplicationStats(UUID jobId) {
        List<Object[]> stats = jobRepository.getJobApplicationStats(jobId);
        
        return stats.stream()
            .map(row -> JobApplicationStats.builder()
                .applicationDate(row[0].toString())
                .applicationCount((Long) row[1])
                .build())
            .collect(Collectors.toList());
    }

    // System Health and Monitoring
    public SystemHealth getSystemHealth() {
        long activeConnections = getActiveWebSocketConnections();
        double cpuUsage = getCpuUsage();
        double memoryUsage = getMemoryUsage();
        double diskUsage = getDiskUsage();
        
        return SystemHealth.builder()
            .activeConnections(activeConnections)
            .cpuUsage(cpuUsage)
            .memoryUsage(memoryUsage)
            .diskUsage(diskUsage)
            .databaseConnections(getDatabaseConnections())
            .cacheHitRate(getCacheHitRate())
            .build();
    }

    // Audit and Logging
    public Page<AuditLog> getAuditLogs(int page, int size, String sortBy, String sortDir, String search) {
        Pageable pageable = PageRequest.of(page, size, 
            Sort.by(Sort.Direction.fromString(sortDir), sortBy));
        
        if (search != null && !search.trim().isEmpty()) {
            return auditLogRepository.searchAuditLogs(search.trim(), pageable);
        }
        
        return auditLogRepository.findAll(pageable);
    }

    // Bulk Operations
    @Transactional
    public List<User> bulkUpdateUserStatus(List<UUID> userIds, boolean enabled) {
        List<User> updatedUsers = new ArrayList<>();
        
        for (UUID userId : userIds) {
            try {
                User user = updateUserStatus(userId, enabled);
                updatedUsers.add(user);
            } catch (Exception e) {
                log.error("Failed to update user {} status: {}", userId, e.getMessage());
            }
        }
        
        return updatedUsers;
    }

    @Transactional
    public List<Job> bulkUpdateJobStatus(List<UUID> jobIds, boolean active) {
        List<Job> updatedJobs = new ArrayList<>();
        
        for (UUID jobId : jobIds) {
            try {
                Job job = updateJobStatus(jobId, active);
                updatedJobs.add(job);
            } catch (Exception e) {
                log.error("Failed to update job {} status: {}", jobId, e.getMessage());
            }
        }
        
        return updatedJobs;
    }

    // Export and Import
    public byte[] exportUsers() {
        List<User> users = userRepository.findAll();
        // Convert to CSV or Excel format
        return convertUsersToCsv(users);
    }

    public byte[] exportJobs() {
        List<Job> jobs = jobRepository.findAll();
        // Convert to CSV or Excel format
        return convertJobsToCsv(jobs);
    }

    public byte[] exportAnalytics() {
        AdminDashboardStats stats = getDashboardStats();
        // Convert to Excel format
        return convertStatsToExcel(stats);
    }

    // Helper methods
    private long getActiveWebSocketConnections() {
        // Implementation to get active WebSocket connections
        return 0L;
    }

    private double getCpuUsage() {
        // Implementation to get CPU usage
        return 0.0;
    }

    private double getMemoryUsage() {
        // Implementation to get memory usage
        return 0.0;
    }

    private double getDiskUsage() {
        // Implementation to get disk usage
        return 0.0;
    }

    private long getDatabaseConnections() {
        // Implementation to get database connections
        return 0L;
    }

    private double getCacheHitRate() {
        // Implementation to get cache hit rate
        return 0.0;
    }

    private byte[] convertUsersToCsv(List<User> users) {
        // Implementation to convert users to CSV
        return new byte[0];
    }

    private byte[] convertJobsToCsv(List<Job> jobs) {
        // Implementation to convert jobs to CSV
        return new byte[0];
    }

    private byte[] convertStatsToExcel(AdminDashboardStats stats) {
        // Implementation to convert stats to Excel
        return new byte[0];
    }

    // Inner classes for DTOs
    public static class AdminDashboardStats {
        private final long totalUsers;
        private final long activeUsers;
        private final long totalJobs;
        private final long activeJobs;
        private final long totalInvestments;
        private final double totalInvestmentAmount;
        private final long totalRepayments;
        private final double totalRepaymentAmount;
        private final Map<String, Long> userRegistrationTrends;
        private final Map<String, Double> investmentTrends;

        // Getters and builder pattern
        // ... implementation omitted for brevity
    }

    public static class UserActivity {
        private final String activityType;
        private final String activityDescription;
        private final LocalDateTime activityDate;

        // Getters and builder pattern
        // ... implementation omitted for brevity
    }

    public static class JobApplicationStats {
        private final String applicationDate;
        private final long applicationCount;

        // Getters and builder pattern
        // ... implementation omitted for brevity
    }

    public static class SystemHealth {
        private final long activeConnections;
        private final double cpuUsage;
        private final double memoryUsage;
        private final double diskUsage;
        private final long databaseConnections;
        private final double cacheHitRate;

        // Getters and builder pattern
        // ... implementation omitted for brevity
    }

    public static class AuditLog {
        private final UUID id;
        private final String userId;
        private final String action;
        private final String details;
        private final LocalDateTime timestamp;

        // Getters and builder pattern
        // ... implementation omitted for brevity
    }
}
