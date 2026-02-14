package com.futurevest.web.controller.v2;

import com.futurevest.application.service.AdminService;
import com.futurevest.domain.entity.User;
import com.futurevest.domain.entity.Job;
import com.futurevest.web.dto.*;
import com.futurevest.web.annotation.ApiVersion;
import com.futurevest.web.annotation.DeprecatedApi;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import javax.servlet.http.HttpServletResponse;
import javax.validation.Valid;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/v2/admin")
@RequiredArgsConstructor
@Slf4j
@ApiVersion("2.0")
@PreAuthorize("hasRole('ADMIN')")
public class AdminControllerV2 {

    private final AdminService adminService;

    // User Management Endpoints
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<Page<User>>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate registrationDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate lastLoginDate) {
        
        Pageable pageable = PageRequest.of(page, size, 
            Sort.by(Sort.Direction.fromString(sortDir), sortBy));
        
        Page<User> users = adminService.getAllUsersWithFilters(
            pageable, search, role, status, registrationDate, lastLoginDate);
        
        return ResponseEntity.ok(ApiResponse.<Page<User>>builder()
            .success(true)
            .data(users)
            .message("Users retrieved successfully")
            .build());
    }

    @GetMapping("/users/stats")
    public ResponseEntity<ApiResponse<UserStatsDTO>> getUserStats() {
        UserStatsDTO stats = adminService.getUserStats();
        
        return ResponseEntity.ok(ApiResponse.<UserStatsDTO>builder()
            .success(true)
            .data(stats)
            .message("User statistics retrieved successfully")
            .build());
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<ApiResponse<User>> getUserDetails(@PathVariable UUID userId) {
        User user = adminService.getUserDetails(userId);
        
        return ResponseEntity.ok(ApiResponse.<User>builder()
            .success(true)
            .data(user)
            .message("User details retrieved successfully")
            .build());
    }

    @PutMapping("/users/{userId}/status")
    public ResponseEntity<ApiResponse<User>> updateUserStatus(
            @PathVariable UUID userId,
            @Valid @RequestBody UserStatusRequest request) {
        
        User user = adminService.updateUserStatus(userId, request.isEnabled());
        
        return ResponseEntity.ok(ApiResponse.<User>builder()
            .success(true)
            .data(user)
            .message("User status updated successfully")
            .build());
    }

    @PutMapping("/users/{userId}/role")
    public ResponseEntity<ApiResponse<User>> updateUserRole(
            @PathVariable UUID userId,
            @Valid @RequestBody UserRoleRequest request) {
        
        User user = adminService.updateUserRole(userId, request.getRole());
        
        return ResponseEntity.ok(ApiResponse.<User>builder()
            .success(true)
            .data(user)
            .message("User role updated successfully")
            .build());
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable UUID userId) {
        adminService.deleteUser(userId);
        
        return ResponseEntity.ok(ApiResponse.<Void>builder()
            .success(true)
            .message("User deleted successfully")
            .build());
    }

    @GetMapping("/users/{userId}/activity")
    public ResponseEntity<ApiResponse<List<UserActivityDTO>>> getUserActivity(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "30") int days) {
        
        List<UserActivityDTO> activities = adminService.getUserActivity(userId, days);
        
        return ResponseEntity.ok(ApiResponse.<List<UserActivityDTO>>builder()
            .success(true)
            .data(activities)
            .message("User activity retrieved successfully")
            .build());
    }

    // Bulk User Operations
    @PutMapping("/users/bulk/status")
    public ResponseEntity<ApiResponse<List<User>>> bulkUpdateUserStatus(
            @Valid @RequestBody BulkUserStatusRequest request) {
        
        List<User> updatedUsers = adminService.bulkUpdateUserStatus(
            request.getUserIds(), request.isEnabled());
        
        return ResponseEntity.ok(ApiResponse.<List<User>>builder()
            .success(true)
            .data(updatedUsers)
            .message("Bulk user status updated successfully")
            .build());
    }

    @DeleteMapping("/users/bulk")
    public ResponseEntity<ApiResponse<Void>> bulkDeleteUsers(
            @Valid @RequestBody BulkDeleteUsersRequest request) {
        
        adminService.bulkDeleteUsers(request.getUserIds());
        
        return ResponseEntity.ok(ApiResponse.<Void>builder()
            .success(true)
            .message("Bulk users deleted successfully")
            .build());
    }

    @PostMapping("/users/bulk/notify")
    public ResponseEntity<ApiResponse<Void>> bulkNotifyUsers(
            @Valid @RequestBody BulkNotificationRequest request) {
        
        adminService.bulkNotifyUsers(request.getUserIds(), request.getNotification());
        
        return ResponseEntity.ok(ApiResponse.<Void>builder()
            .success(true)
            .message("Bulk notification sent successfully")
            .build());
    }

    // Job Management Endpoints
    @GetMapping("/jobs")
    public ResponseEntity<ApiResponse<Page<Job>>> getAllJobs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String workMode,
            @RequestParam(required = false) String status) {
        
        Pageable pageable = PageRequest.of(page, size, 
            Sort.by(Sort.Direction.fromString(sortDir), sortBy));
        
        Page<Job> jobs = adminService.getAllJobsWithFilters(
            pageable, search, type, workMode, status);
        
        return ResponseEntity.ok(ApiResponse.<Page<Job>>builder()
            .success(true)
            .data(jobs)
            .message("Jobs retrieved successfully")
            .build());
    }

    @GetMapping("/jobs/stats")
    public ResponseEntity<ApiResponse<JobStatsDTO>> getJobStats() {
        JobStatsDTO stats = adminService.getJobStats();
        
        return ResponseEntity.ok(ApiResponse.<JobStatsDTO>builder()
            .success(true)
            .data(stats)
            .message("Job statistics retrieved successfully")
            .build());
    }

    @PostMapping("/jobs")
    public ResponseEntity<ApiResponse<Job>> createJob(@Valid @RequestBody JobRequest request) {
        Job job = adminService.createJob(request);
        
        return ResponseEntity.status(201).body(ApiResponse.<Job>builder()
            .success(true)
            .data(job)
            .message("Job created successfully")
            .build());
    }

    @PutMapping("/jobs/{jobId}")
    public ResponseEntity<ApiResponse<Job>> updateJob(
            @PathVariable UUID jobId,
            @Valid @RequestBody JobRequest request) {
        
        Job job = adminService.updateJob(jobId, request);
        
        return ResponseEntity.ok(ApiResponse.<Job>builder()
            .success(true)
            .data(job)
            .message("Job updated successfully")
            .build());
    }

    @PutMapping("/jobs/{jobId}/status")
    public ResponseEntity<ApiResponse<Job>> updateJobStatus(
            @PathVariable UUID jobId,
            @Valid @RequestBody JobStatusRequest request) {
        
        Job job = adminService.updateJobStatus(jobId, request.isActive());
        
        return ResponseEntity.ok(ApiResponse.<Job>builder()
            .success(true)
            .data(job)
            .message("Job status updated successfully")
            .build());
    }

    @DeleteMapping("/jobs/{jobId}")
    public ResponseEntity<ApiResponse<Void>> deleteJob(@PathVariable UUID jobId) {
        adminService.deleteJob(jobId);
        
        return ResponseEntity.ok(ApiResponse.<Void>builder()
            .success(true)
            .message("Job deleted successfully")
            .build());
    }

    @GetMapping("/jobs/{jobId}/stats")
    public ResponseEntity<ApiResponse<List<JobApplicationStatsDTO>>> getJobApplicationStats(
            @PathVariable UUID jobId) {
        
        List<JobApplicationStatsDTO> stats = adminService.getJobApplicationStats(jobId);
        
        return ResponseEntity.ok(ApiResponse.<List<JobApplicationStatsDTO>>builder()
            .success(true)
            .data(stats)
            .message("Job application statistics retrieved successfully")
            .build());
    }

    // Bulk Job Operations
    @PutMapping("/jobs/bulk/status")
    public ResponseEntity<ApiResponse<List<Job>>> bulkUpdateJobStatus(
            @Valid @RequestBody BulkJobStatusRequest request) {
        
        List<Job> updatedJobs = adminService.bulkUpdateJobStatus(
            request.getJobIds(), request.isActive());
        
        return ResponseEntity.ok(ApiResponse.<List<Job>>builder()
            .success(true)
            .data(updatedJobs)
            .message("Bulk job status updated successfully")
            .build());
    }

    // Analytics and Statistics
    @GetMapping("/dashboard/stats")
    public ResponseEntity<ApiResponse<DashboardStatsDTO>> getDashboardStats() {
        DashboardStatsDTO stats = adminService.getDashboardStats();
        
        return ResponseEntity.ok(ApiResponse.<DashboardStatsDTO>builder()
            .success(true)
            .data(stats)
            .message("Dashboard statistics retrieved successfully")
            .build());
    }

    @GetMapping("/analytics/investments")
    public ResponseEntity<ApiResponse<InvestmentAnalyticsDTO>> getInvestmentAnalytics(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate endDate) {
        
        InvestmentAnalyticsDTO analytics = adminService.getInvestmentAnalytics(startDate, endDate);
        
        return ResponseEntity.ok(ApiResponse.<InvestmentAnalyticsDTO>builder()
            .success(true)
            .data(analytics)
            .message("Investment analytics retrieved successfully")
            .build());
    }

    @GetMapping("/analytics/repayments")
    public ResponseEntity<ApiResponse<RepaymentAnalyticsDTO>> getRepaymentAnalytics(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate endDate) {
        
        RepaymentAnalyticsDTO analytics = adminService.getRepaymentAnalytics(startDate, endDate);
        
        return ResponseEntity.ok(ApiResponse.<RepaymentAnalyticsDTO>builder()
            .success(true)
            .data(analytics)
            .message("Repayment analytics retrieved successfully")
            .build());
    }

    @GetMapping("/analytics/engagement")
    public ResponseEntity<ApiResponse<UserEngagementAnalyticsDTO>> getUserEngagementAnalytics(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate endDate) {
        
        UserEngagementAnalyticsDTO analytics = adminService.getUserEngagementAnalytics(startDate, endDate);
        
        return ResponseEntity.ok(ApiResponse.<UserEngagementAnalyticsDTO>builder()
            .success(true)
            .data(analytics)
            .message("User engagement analytics retrieved successfully")
            .build());
    }

    // System Health and Monitoring
    @GetMapping("/system/health")
    public ResponseEntity<ApiResponse<SystemHealthDTO>> getSystemHealth() {
        SystemHealthDTO health = adminService.getSystemHealth();
        
        return ResponseEntity.ok(ApiResponse.<SystemHealthDTO>builder()
            .success(true)
            .data(health)
            .message("System health retrieved successfully")
            .build());
    }

    @GetMapping("/system/metrics")
    public ResponseEntity<ApiResponse<SystemMetricsDTO>> getSystemMetrics() {
        SystemMetricsDTO metrics = adminService.getSystemMetrics();
        
        return ResponseEntity.ok(ApiResponse.<SystemMetricsDTO>builder()
            .success(true)
            .data(metrics)
            .message("System metrics retrieved successfully")
            .build());
    }

    // Real-time monitoring with Server-Sent Events
    @GetMapping("/system/realtime")
    public SseEmitter getRealTimeSystemMetrics() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        
        CompletableFuture.runAsync(() -> {
            try {
                while (true) {
                    SystemMetricsDTO metrics = adminService.getSystemMetrics();
                    emitter.send(SseEmitter.event()
                        .name("metrics")
                        .data(metrics));
                    
                    Thread.sleep(5000); // Send every 5 seconds
                }
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        });
        
        return emitter;
    }

    // Audit and Logging
    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<Page<AuditLogDTO>>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(defaultValue = "timestamp") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate endDate) {
        
        Pageable pageable = PageRequest.of(page, size, 
            Sort.by(Sort.Direction.fromString(sortDir), sortBy));
        
        Page<AuditLogDTO> logs = adminService.getAuditLogsWithFilters(
            pageable, search, action, userId, startDate, endDate);
        
        return ResponseEntity.ok(ApiResponse.<Page<AuditLogDTO>>builder()
            .success(true)
            .data(logs)
            .message("Audit logs retrieved successfully")
            .build());
    }

    // Export Endpoints
    @GetMapping("/export/users")
    public void exportUsers(
            @RequestParam(required = false) String format,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            HttpServletResponse response) {
        
        String fileFormat = format != null ? format.toLowerCase() : "csv";
        byte[] data = adminService.exportUsers(fileFormat, search, role, status);
        
        String contentType = fileFormat.equals("excel") ? 
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : 
            "text/csv";
        String filename = "users_export." + fileFormat;
        
        response.setContentType(contentType);
        response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
        response.setContentLength(data.length);
        
        try {
            response.getOutputStream().write(data);
            response.getOutputStream().flush();
        } catch (Exception e) {
            log.error("Error exporting users", e);
        }
    }

    @GetMapping("/export/jobs")
    public void exportJobs(
            @RequestParam(required = false) String format,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            HttpServletResponse response) {
        
        String fileFormat = format != null ? format.toLowerCase() : "csv";
        byte[] data = adminService.exportJobs(fileFormat, search, type, status);
        
        String contentType = fileFormat.equals("excel") ? 
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : 
            "text/csv";
        String filename = "jobs_export." + fileFormat;
        
        response.setContentType(contentType);
        response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
        response.setContentLength(data.length);
        
        try {
            response.getOutputStream().write(data);
            response.getOutputStream().flush();
        } catch (Exception e) {
            log.error("Error exporting jobs", e);
        }
    }

    @GetMapping("/export/analytics")
    public void exportAnalytics(
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate startDate,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate endDate,
            HttpServletResponse response) {
        
        byte[] data = adminService.exportAnalytics(startDate, endDate);
        
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=\"analytics_export.xlsx\"");
        response.setContentLength(data.length);
        
        try {
            response.getOutputStream().write(data);
            response.getOutputStream().flush();
        } catch (Exception e) {
            log.error("Error exporting analytics", e);
        }
    }

    // Notification Management
    @PostMapping("/notifications/send")
    public ResponseEntity<ApiResponse<Void>> sendNotification(
            @Valid @RequestBody SendNotificationRequest request) {
        
        adminService.sendNotification(request);
        
        return ResponseEntity.ok(ApiResponse.<Void>builder()
            .success(true)
            .message("Notification sent successfully")
            .build());
    }

    @PostMapping("/notifications/broadcast")
    public ResponseEntity<ApiResponse<Void>> sendBroadcastNotification(
            @Valid @RequestBody BroadcastNotificationRequest request) {
        
        adminService.sendBroadcastNotification(request);
        
        return ResponseEntity.ok(ApiResponse.<Void>builder()
            .success(true)
            .message("Broadcast notification sent successfully")
            .build());
    }

    @GetMapping("/notifications/templates")
    public ResponseEntity<ApiResponse<List<NotificationTemplateDTO>>> getNotificationTemplates() {
        List<NotificationTemplateDTO> templates = adminService.getNotificationTemplates();
        
        return ResponseEntity.ok(ApiResponse.<List<NotificationTemplateDTO>>builder()
            .success(true)
            .data(templates)
            .message("Notification templates retrieved successfully")
            .build());
    }

    @PostMapping("/notifications/templates")
    public ResponseEntity<ApiResponse<NotificationTemplateDTO>> createNotificationTemplate(
            @Valid @RequestBody CreateNotificationTemplateRequest request) {
        
        NotificationTemplateDTO template = adminService.createNotificationTemplate(request);
        
        return ResponseEntity.status(201).body(ApiResponse.<NotificationTemplateDTO>builder()
            .success(true)
            .data(template)
            .message("Notification template created successfully")
            .build());
    }

    // Settings Management
    @GetMapping("/settings")
    public ResponseEntity<ApiResponse<AdminSettingsDTO>> getAdminSettings() {
        AdminSettingsDTO settings = adminService.getAdminSettings();
        
        return ResponseEntity.ok(ApiResponse.<AdminSettingsDTO>builder()
            .success(true)
            .data(settings)
            .message("Admin settings retrieved successfully")
            .build());
    }

    @PutMapping("/settings")
    public ResponseEntity<ApiResponse<AdminSettingsDTO>> updateAdminSettings(
            @Valid @RequestBody UpdateAdminSettingsRequest request) {
        
        AdminSettingsDTO settings = adminService.updateAdminSettings(request);
        
        return ResponseEntity.ok(ApiResponse.<AdminSettingsDTO>builder()
            .success(true)
            .data(settings)
            .message("Admin settings updated successfully")
            .build());
    }

    // Backup and Restore
    @PostMapping("/backup/create")
    public ResponseEntity<ApiResponse<BackupDTO>> createBackup(
            @Valid @RequestBody CreateBackupRequest request) {
        
        BackupDTO backup = adminService.createBackup(request);
        
        return ResponseEntity.ok(ApiResponse.<BackupDTO>builder()
            .success(true)
            .data(backup)
            .message("Backup created successfully")
            .build());
    }

    @GetMapping("/backup/list")
    public ResponseEntity<ApiResponse<List<BackupDTO>>> listBackups() {
        List<BackupDTO> backups = adminService.listBackups();
        
        return ResponseEntity.ok(ApiResponse.<List<BackupDTO>>builder()
            .success(true)
            .data(backups)
            .message("Backups retrieved successfully")
            .build());
    }

    @PostMapping("/backup/restore")
    public ResponseEntity<ApiResponse<Void>> restoreBackup(
            @Valid @RequestBody RestoreBackupRequest request) {
        
        adminService.restoreBackup(request);
        
        return ResponseEntity.ok(ApiResponse.<Void>builder()
            .success(true)
            .message("Backup restored successfully")
            .build());
    }

    // Maintenance Mode
    @PostMapping("/maintenance/enable")
    public ResponseEntity<ApiResponse<Void>> enableMaintenanceMode() {
        adminService.enableMaintenanceMode();
        
        return ResponseEntity.ok(ApiResponse.<Void>builder()
            .success(true)
            .message("Maintenance mode enabled")
            .build());
    }

    @PostMapping("/maintenance/disable")
    public ResponseEntity<ApiResponse<Void>> disableMaintenanceMode() {
        adminService.disableMaintenanceMode();
        
        return ResponseEntity.ok(ApiResponse.<Void>builder()
            .success(true)
            .message("Maintenance mode disabled")
            .build());
    }

    @GetMapping("/maintenance/status")
    public ResponseEntity<ApiResponse<MaintenanceStatusDTO>> getMaintenanceStatus() {
        MaintenanceStatusDTO status = adminService.getMaintenanceStatus();
        
        return ResponseEntity.ok(ApiResponse.<MaintenanceStatusDTO>builder()
            .success(true)
            .data(status)
            .message("Maintenance status retrieved successfully")
            .build());
    }
}
