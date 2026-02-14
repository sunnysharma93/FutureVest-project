package com.futurevest.domain.entity;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Value
@Builder
public class Repayment {
    UUID id;
    UUID userId;
    UUID investorId;
    UUID paymentId;
    BigDecimal amount;
    BigDecimal salaryPercentage; // e.g., 2.0 for 2%
    String status; // PENDING, COMPLETED, FAILED
    String dueDate; // Monthly due date
    Instant processedAt;
    Instant createdAt;
    Instant updatedAt;
}
