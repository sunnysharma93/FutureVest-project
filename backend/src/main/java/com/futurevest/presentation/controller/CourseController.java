package com.futurevest.presentation.controller;

import com.futurevest.application.service.CourseService;
import com.futurevest.presentation.dto.CourseDto;
import com.futurevest.presentation.dto.CourseRequestDto;
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
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/courses")
@RequiredArgsConstructor
@Tag(name = "Course Management", description = "Course requests, listings, and management")
public class CourseController {

    private final CourseService courseService;

    @PostMapping("/request")
    @Operation(summary = "Request a new course", description = "Users can request new courses for consideration")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Course request submitted successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<EntityModel<CourseDto>> requestCourse(
            @Valid @RequestBody CourseRequestDto courseRequestDto,
            @AuthenticationPrincipal SecurityUser principal) {
        
        CourseDto courseDto = courseService.requestCourse(courseRequestDto, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(EntityModel.of(courseDto));
    }

    @GetMapping("/courses")
    @Operation(summary = "Get all courses", description = "Get paginated list of all available courses")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Courses retrieved successfully")
    })
    public ResponseEntity<PagedModel<EntityModel<CourseDto>>> getAllCourses(
            @Parameter(description = "Filter by category") @RequestParam(required = false) String category,
            @Parameter(description = "Filter by provider") @RequestParam(required = false) String provider,
            @Parameter(description = "Filter by status") @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable,
            PagedResourcesAssembler<CourseDto> assembler) {
        
        Page<CourseDto> courses = courseService.getAllCourses(category, provider, status, pageable);
        return ResponseEntity.ok(assembler.toModel(courses));
    }

    @GetMapping("/available")
    @Operation(summary = "Get available courses", description = "Get paginated list of available courses for users")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Available courses retrieved successfully")
    })
    public ResponseEntity<PagedModel<EntityModel<CourseDto>>> getAvailableCourses(
            @Parameter(description = "Filter by category") @RequestParam(required = false) String category,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable,
            PagedResourcesAssembler<CourseDto> assembler) {
        
        Page<CourseDto> courses = courseService.getAvailableCourses(category, pageable);
        return ResponseEntity.ok(assembler.toModel(courses));
    }

    @GetMapping("/requested")
    @Operation(summary = "Get requested courses", description = "Get paginated list of requested courses (admin only)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Requested courses retrieved successfully"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PagedModel<EntityModel<CourseDto>>> getRequestedCourses(
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable,
            PagedResourcesAssembler<CourseDto> assembler) {
        
        Page<CourseDto> courses = courseService.getRequestedCourses(pageable);
        return ResponseEntity.ok(assembler.toModel(courses));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get course by ID", description = "Get course details by ID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Course retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Course not found")
    })
    public ResponseEntity<EntityModel<CourseDto>> getCourseById(
            @Parameter(description = "Course ID") @PathVariable UUID id) {
        
        CourseDto courseDto = courseService.getCourseById(id);
        return ResponseEntity.ok(EntityModel.of(courseDto));
    }

    @PostMapping("/{id}/approve")
    @Operation(summary = "Approve course", description = "Approve a requested course (admin only)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Course approved successfully"),
        @ApiResponse(responseCode = "404", description = "Course not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EntityModel<CourseDto>> approveCourse(
            @Parameter(description = "Course ID") @PathVariable UUID id) {
        
        CourseDto approvedCourse = courseService.approveCourse(id);
        return ResponseEntity.ok(EntityModel.of(approvedCourse));
    }

    @PostMapping("/{id}/reject")
    @Operation(summary = "Reject course", description = "Reject a requested course (admin only)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Course rejected successfully"),
        @ApiResponse(responseCode = "404", description = "Course not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EntityModel<CourseDto>> rejectCourse(
            @Parameter(description = "Course ID") @PathVariable UUID id) {
        
        CourseDto rejectedCourse = courseService.rejectCourse(id);
        return ResponseEntity.ok(EntityModel.of(rejectedCourse));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update course", description = "Update course information (admin only)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Course updated successfully"),
        @ApiResponse(responseCode = "404", description = "Course not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EntityModel<CourseDto>> updateCourse(
            @Parameter(description = "Course ID") @PathVariable UUID id,
            @Valid @RequestBody CourseDto courseDto) {
        
        CourseDto updatedCourse = courseService.updateCourse(id, courseDto);
        return ResponseEntity.ok(EntityModel.of(updatedCourse));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete course", description = "Delete course by ID (admin only)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Course deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Course not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteCourse(@Parameter(description = "Course ID") @PathVariable UUID id) {
        courseService.deleteCourse(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/categories")
    @Operation(summary = "Get course categories", description = "Get list of all available course categories")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Categories retrieved successfully")
    })
    public ResponseEntity<List<String>> getCourseCategories() {
        List<String> categories = courseService.getCourseCategories();
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/providers")
    @Operation(summary = "Get course providers", description = "Get list of all available course providers")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Providers retrieved successfully")
    })
    public ResponseEntity<List<String>> getCourseProviders() {
        List<String> providers = courseService.getCourseProviders();
        return ResponseEntity.ok(providers);
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get user courses", description = "Get courses associated with a specific user")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "User courses retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "User not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN') or #userId == authentication.principal.id")
    public ResponseEntity<List<CourseDto>> getUserCourses(
            @Parameter(description = "User ID") @PathVariable UUID userId) {
        
        List<CourseDto> courses = courseService.getUserCourses(userId);
        return ResponseEntity.ok(courses);
    }
}
