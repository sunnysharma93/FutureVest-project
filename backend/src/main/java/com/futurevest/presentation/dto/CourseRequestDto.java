package com.futurevest.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseRequestDto {
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
    
    @NotBlank(message = "Category is required")
    private String category;
    
    private Integer durationInHours;
    
    private String justification;
}
