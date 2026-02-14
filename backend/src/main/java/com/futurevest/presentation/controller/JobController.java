package com.futurevest.presentation.controller;

import com.futurevest.application.service.JobService;
import com.futurevest.presentation.dto.JobDto;
import com.futurevest.presentation.security.SecurityUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedResourcesAssembler;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/jobs")
@RequiredArgsConstructor
@Tag(name = "Job Management", description = "Job posting and search with pagination")
public class JobController {

    private final JobService jobService;

    @PostMapping("/post-job")
    @Operation(summary = "Post a new job", description = "Investors and companies can post new job opportunities")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Job posted successfully",
                content = @Content(schema = @Schema(implementation = JobDto.class))),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('INVESTOR') or hasRole('COMPANY')")
    public ResponseEntity<EntityModel<JobDto>> postJob(
            @Valid @RequestBody JobDto jobDto,
            @AuthenticationPrincipal SecurityUser principal) {
        
        JobDto createdJob = jobService.postJob(jobDto, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(EntityModel.of(createdJob));
    }

    @GetMapping("/jobs")
    @Operation(summary = "Get all jobs", description = "Get paginated list of all active jobs with filtering options")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Jobs retrieved successfully")
    })
    public ResponseEntity<PagedModel<EntityModel<JobDto>>> getAllJobs(
            @Parameter(description = "Filter by job type") @RequestParam(required = false) String jobType,
            @Parameter(description = "Filter by work mode") @RequestParam(required = false) String workMode,
            @Parameter(description = "Filter by location") @RequestParam(required = false) String location,
            @Parameter(description = "Filter by skills") @RequestParam(required = false) String skills,
            @Parameter(description = "Filter by company") @RequestParam(required = false) String company,
            @Parameter(description = "Minimum salary") @RequestParam(required = false) Double minSalary,
            @Parameter(description = "Maximum salary") @RequestParam(required = false) Double maxSalary,
            @Parameter(description = "Search in title and description") @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable,
            PagedResourcesAssembler<JobDto> assembler) {
        
        Page<JobDto> jobs = jobService.getAllJobs(jobType, workMode, location, skills, company, 
                                                minSalary, maxSalary, search, pageable);
        return ResponseEntity.ok(assembler.toModel(jobs));
    }

    @GetMapping("/active")
    @Operation(summary = "Get active jobs", description = "Get paginated list of only active jobs")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Active jobs retrieved successfully")
    })
    public ResponseEntity<PagedModel<EntityModel<JobDto>>> getActiveJobs(
            @Parameter(description = "Filter by job type") @RequestParam(required = false) String jobType,
            @Parameter(description = "Filter by work mode") @RequestParam(required = false) String workMode,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable,
            PagedResourcesAssembler<JobDto> assembler) {
        
        Page<JobDto> jobs = jobService.getActiveJobs(jobType, workMode, pageable);
        return ResponseEntity.ok(assembler.toModel(jobs));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get job by ID", description = "Get job details by ID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Job retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Job not found")
    })
    public ResponseEntity<EntityModel<JobDto>> getJobById(
            @Parameter(description = "Job ID") @PathVariable UUID id) {
        
        JobDto jobDto = jobService.getJobById(id);
        return ResponseEntity.ok(EntityModel.of(jobDto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update job", description = "Update job information (job owner only)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Job updated successfully"),
        @ApiResponse(responseCode = "404", description = "Job not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('INVESTOR') or hasRole('COMPANY')")
    public ResponseEntity<EntityModel<JobDto>> updateJob(
            @Parameter(description = "Job ID") @PathVariable UUID id,
            @Valid @RequestBody JobDto jobDto,
            @AuthenticationPrincipal SecurityUser principal) {
        
        JobDto updatedJob = jobService.updateJob(id, jobDto, principal.getId());
        return ResponseEntity.ok(EntityModel.of(updatedJob));
    }

    @PostMapping("/{id}/close")
    @Operation(summary = "Close job", description = "Close a job posting (job owner only)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Job closed successfully"),
        @ApiResponse(responseCode = "404", description = "Job not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('INVESTOR') or hasRole('COMPANY')")
    public ResponseEntity<EntityModel<JobDto>> closeJob(
            @Parameter(description = "Job ID") @PathVariable UUID id,
            @AuthenticationPrincipal SecurityUser principal) {
        
        JobDto closedJob = jobService.closeJob(id, principal.getId());
        return ResponseEntity.ok(EntityModel.of(closedJob));
    }

    @PostMapping("/{id}/reopen")
    @Operation(summary = "Reopen job", description = "Reopen a closed job posting (job owner only)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Job reopened successfully"),
        @ApiResponse(responseCode = "404", description = "Job not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('INVESTOR') or hasRole('COMPANY')")
    public ResponseEntity<EntityModel<JobDto>> reopenJob(
            @Parameter(description = "Job ID") @PathVariable UUID id,
            @AuthenticationPrincipal SecurityUser principal) {
        
        JobDto reopenedJob = jobService.reopenJob(id, principal.getId());
        return ResponseEntity.ok(EntityModel.of(reopenedJob));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete job", description = "Delete job posting (job owner only)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Job deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Job not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('INVESTOR') or hasRole('COMPANY')")
    public ResponseEntity<Void> deleteJob(
            @Parameter(description = "Job ID") @PathVariable UUID id,
            @AuthenticationPrincipal SecurityUser principal) {
        
        jobService.deleteJob(id, principal.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/posted/{investorId}")
    @Operation(summary = "Get posted jobs", description = "Get all jobs posted by a specific investor or company")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Posted jobs retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Investor not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('INVESTOR') or hasRole('COMPANY') or hasRole('ADMIN') or #investorId == authentication.principal.id")
    public ResponseEntity<PagedModel<EntityModel<JobDto>>> getPostedJobs(
            @Parameter(description = "Investor/Company ID") @PathVariable UUID investorId,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable,
            PagedResourcesAssembler<JobDto> assembler) {
        
        Page<JobDto> jobs = jobService.getPostedJobs(investorId, pageable);
        return ResponseEntity.ok(assembler.toModel(jobs));
    }

    @GetMapping("/search")
    @Operation(summary = "Search jobs", description = "Advanced job search with multiple filters")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Search results retrieved successfully")
    })
    public ResponseEntity<PagedModel<EntityModel<JobDto>>> searchJobs(
            @Parameter(description = "Search query") @RequestParam String query,
            @Parameter(description = "Filter by location") @RequestParam(required = false) String location,
            @Parameter(description = "Filter by job type") @RequestParam(required = false) String jobType,
            @Parameter(description = "Filter by work mode") @RequestParam(required = false) String workMode,
            @PageableDefault(size = 20, sort = "relevance") Pageable pageable,
            PagedResourcesAssembler<JobDto> assembler) {
        
        Page<JobDto> jobs = jobService.searchJobs(query, location, jobType, workMode, pageable);
        return ResponseEntity.ok(assembler.toModel(jobs));
    }

    @GetMapping("/recommendations/{userId}")
    @Operation(summary = "Get job recommendations", description = "Get personalized job recommendations for a user")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Recommendations retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "User not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN') or #userId == authentication.principal.id")
    public ResponseEntity<List<JobDto>> getJobRecommendations(
            @Parameter(description = "User ID") @PathVariable UUID userId) {
        
        List<JobDto> recommendations = jobService.getJobRecommendations(userId);
        return ResponseEntity.ok(recommendations);
    }

    @GetMapping("/statistics")
    @Operation(summary = "Get job statistics", description = "Get job market statistics and insights")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Statistics retrieved successfully")
    })
    public ResponseEntity<Map<String, Object>> getJobStatistics() {
        Map<String, Object> stats = jobService.getJobStatistics();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/filters")
    @Operation(summary = "Get available filters", description = "Get available filter options for job search")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Filters retrieved successfully")
    })
    public ResponseEntity<Map<String, List<String>>> getAvailableFilters() {
        Map<String, List<String>> filters = jobService.getAvailableFilters();
        return ResponseEntity.ok(filters);
    }
}
