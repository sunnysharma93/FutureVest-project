package com.futurevest.web.controller;

import com.futurevest.application.service.AdminService;
import com.futurevest.domain.entity.User;
import com.futurevest.domain.entity.Job;
import com.futurevest.web.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    // User Management Endpoints
    @GetMapping("/users")
    public ResponseEntity<Page<User>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String search) {
        
        Page<User> users = adminService.getAllUsers(page, size, sortBy, sortDir, search);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<User> getUserDetails(@PathVariable UUID userId) {
        User user = adminService.getUserDetails(userId);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/users/{userId}/status")
    public ResponseEntity<User> updateUserStatus(
            @PathVariable UUID userId,
            @RequestBody UserStatusRequest request) {
        
        User user = adminService.updateUserStatus(userId, request.isEnabled());
        return ResponseEntity.ok(user);
    }

    @PutMapping("/users/{userId}/role")
    public ResponseEntity<User> updateUserRole(
            @PathVariable UUID userId,
            @RequestBody UserRoleRequest request) {
        
        User user = adminService.updateUserRole(userId, request.getRole());
        return ResponseEntity.ok(user);
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID userId) {
        adminService.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/users/{userId}/activity")
    public ResponseEntity<List<UserActivity>> getUserActivity(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "30") int days) {
        
        List<UserActivity> activities = adminService.getUserActivity(userId, days);
        return ResponseEntity.ok(activities);
    }

    // Bulk User Operations
    @PutMapping("/users/bulk/status")
    public ResponseEntity<List<User>> bulkUpdateUserStatus(@RequestBody BulkUserStatusRequest request) {
        List<User> updatedUsers = adminService.bulkUpdateUserStatus(request.getUserIds(), request.isEnabled());
        return ResponseEntity.ok(updatedUsers);
    }

    // Job Management Endpoints
    @GetMapping("/jobs")
    public ResponseEntity<Page<Job>> getAllJobs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String search) {
        
        Page<Job> jobs = adminService.getAllJobs(page, size, sortBy, sortDir, search);
        return ResponseEntity.ok(jobs);
    }

    @PostMapping("/jobs")
    public ResponseEntity<Job> createJob(@RequestBody JobRequest request) {
        Job job = convertToJob(request);
        Job createdJob = adminService.createJob(job);
        return ResponseEntity.ok(createdJob);
    }

    @PutMapping("/jobs/{jobId}")
    public ResponseEntity<Job> updateJob(
            @PathVariable UUID jobId,
            @RequestBody JobRequest request) {
        
        Job job = convertToJob(request);
        Job updatedJob = adminService.updateJob(jobId, job);
        return ResponseEntity.ok(updatedJob);
    }

    @PutMapping("/jobs/{jobId}/status")
    public ResponseEntity<Job> updateJobStatus(
            @PathVariable UUID jobId,
            @RequestBody JobStatusRequest request) {
        
        Job job = adminService.updateJobStatus(jobId, request.isActive());
        return ResponseEntity.ok(job);
    }

    @DeleteMapping("/jobs/{jobId}")
    public ResponseEntity<Void> deleteJob(@PathVariable UUID jobId) {
        adminService.deleteJob(jobId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/jobs/{jobId}/stats")
    public ResponseEntity<List<JobApplicationStats>> getJobApplicationStats(@PathVariable UUID jobId) {
        List<JobApplicationStats> stats = adminService.getJobApplicationStats(jobId);
        return ResponseEntity.ok(stats);
    }

    // Bulk Job Operations
    @PutMapping("/jobs/bulk/status")
    public ResponseEntity<List<Job>> bulkUpdateJobStatus(@RequestBody BulkJobStatusRequest request) {
        List<Job> updatedJobs = adminService.bulkUpdateJobStatus(request.getJobIds(), request.isActive());
        return ResponseEntity.ok(updatedJobs);
    }

    // Analytics and Statistics
    @GetMapping("/dashboard/stats")
    public ResponseEntity<AdminDashboardStats> getDashboardStats() {
        AdminDashboardStats stats = adminService.getDashboardStats();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/system/health")
    public ResponseEntity<SystemHealth> getSystemHealth() {
        SystemHealth health = adminService.getSystemHealth();
        return ResponseEntity.ok(health);
    }

    // Audit Logs
    @GetMapping("/audit-logs")
    public ResponseEntity<Page<AuditLog>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "timestamp") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir,
            @RequestParam(required = false) String search) {
        
        Page<AuditLog> logs = adminService.getAuditLogs(page, size, sortBy, sortDir, search);
        return ResponseEntity.ok(logs);
    }

    // Export Endpoints
    @GetMapping("/export/users")
    public void exportUsers(HttpServletResponse response) {
        byte[] csvData = adminService.exportUsers();
        
        response.setContentType("text/csv");
        response.setHeader("Content-Disposition", "attachment; filename=\"users.csv\"");
        response.setContentLength(csvData.length);
        
        try {
            response.getOutputStream().write(csvData);
            response.getOutputStream().flush();
        } catch (Exception e) {
            log.error("Error exporting users", e);
        }
    }

    @GetMapping("/export/jobs")
    public void exportJobs(HttpServletResponse response) {
        byte[] csvData = adminService.exportJobs();
        
        response.setContentType("text/csv");
        response.setHeader("Content-Disposition", "attachment; filename=\"jobs.csv\"");
        response.setContentLength(csvData.length);
        
        try {
            response.getOutputStream().write(csvData);
            response.getOutputStream().flush();
        } catch (Exception e) {
            log.error("Error exporting jobs", e);
        }
    }

    @GetMapping("/export/analytics")
    public void exportAnalytics(HttpServletResponse response) {
        byte[] excelData = adminService.exportAnalytics();
        
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=\"analytics.xlsx\"");
        response.setContentLength(excelData.length);
        
        try {
            response.getOutputStream().write(excelData);
            response.getOutputStream().flush();
        } catch (Exception e) {
            log.error("Error exporting analytics", e);
        }
    }

    // Helper methods
    private Job convertToJob(JobRequest request) {
        return Job.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .company(request.getCompany())
                .location(request.getLocation())
                .type(request.getType())
                .workMode(request.getWorkMode())
                .experienceLevel(request.getExperienceLevel())
                .minExperience(request.getMinExperience())
                .maxExperience(request.getMaxExperience())
                .minSalary(request.getMinSalary())
                .maxSalary(request.getMaxSalary())
                .requiredSkills(request.getRequiredSkills())
                .preferredSkills(request.getPreferredSkills())
                .requiredEducation(request.getRequiredEducation())
                .applicationDeadline(request.getApplicationDeadline())
                .build();
    }
}
