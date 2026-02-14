package com.futurevest.domain.entity;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Value
@Builder
public class Course {
    UUID id;
    String title;
    String description;
    String provider; // UDEMY, COURSERA, etc.
    String externalCourseId;
    BigDecimal cost;
    String status; // REQUESTED, AVAILABLE, COMPLETED
    String category;
    int durationInHours;
    Instant createdAt;
    Instant updatedAt;
}
