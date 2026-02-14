package com.futurevest.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
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
public class JobDto {
    private UUID id;
    
    @NotBlank(message = "Title is required")
    @Size(min = 5, max = 200, message = "Title must be between 5 and 200 characters")
    private String title;
    
    @NotBlank(message = "Description is required")
    @Size(min = 20, max = 2000, message = "Description must be between 20 and 2000 characters")
    private String description;
    
    @NotBlank(message = "Company name is required")
    @Size(max = 100, message = "Company name must not exceed 100 characters")
    private String companyName;
    
    @NotBlank(message = "Location is required")
    private String location;
    
    @Pattern(regexp = "^(FULL_TIME|PART_TIME|CONTRACT|INTERNSHIP)$", 
             message = "Job type must be FULL_TIME, PART_TIME, CONTRACT, or INTERNSHIP")
    private String jobType;
    
    @Pattern(regexp = "^(REMOTE|HYBRID|ONSITE)$", 
             message = "Work mode must be REMOTE, HYBRID, or ONSITE")
    private String workMode;
    
    @Positive(message = "Salary must be positive")
    private BigDecimal salaryMin;
    
    private BigDecimal salaryMax;
    
    @NotBlank(message = "Required skills are required")
    private String requiredSkills;
    
    private String experienceLevel;
    private UUID postedBy;
    private boolean active;
    private Instant createdAt;
    private Instant updatedAt;
}
