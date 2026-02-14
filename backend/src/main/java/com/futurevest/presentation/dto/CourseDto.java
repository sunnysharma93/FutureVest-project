package com.futurevest.presentation.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseDto {
    private UUID id;
    
    @NotBlank(message = "Title is required")
    @Size(min = 5, max = 200, message = "Title must be between 5 and 200 characters")
    private String title;
    
    @NotBlank(message = "Description is required")
    @Size(min = 10, max = 1000, message = "Description must be between 10 and 1000 characters")
    private String description;
    
    @NotBlank(message = "Provider is required")
    @Pattern(regexp = "^(UDEMY|COURSERA|LINKEDIN|OTHER)$", message = "Provider must be UDEMY, COURSERA, LINKEDIN, or OTHER")
    private String provider;
    
    private String externalCourseId;
    
    @DecimalMin(value = "0.0", message = "Cost must be non-negative")
    private BigDecimal cost;
    
    @Pattern(regexp = "^(REQUESTED|AVAILABLE|COMPLETED)$", message = "Status must be REQUESTED, AVAILABLE, or COMPLETED")
    private String status;
    
    @NotBlank(message = "Category is required")
    private String category;
    
    @Positive(message = "Duration must be positive")
    private Integer durationInHours;
    
    private Instant createdAt;
    private Instant updatedAt;
}
