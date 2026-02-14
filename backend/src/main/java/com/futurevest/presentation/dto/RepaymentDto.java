package com.futurevest.presentation.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
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
public class RepaymentDto {
    private UUID id;
    
    @NotNull(message = "User ID is required")
    private UUID userId;
    
    @NotNull(message = "Investor ID is required")
    private UUID investorId;
    
    @NotNull(message = "Payment ID is required")
    private UUID paymentId;
    
    @DecimalMin(value = "0.0", message = "Amount must be non-negative")
    private BigDecimal amount;
    
    @DecimalMin(value = "0.0", message = "Salary percentage must be non-negative")
    private BigDecimal salaryPercentage;
    
    @Pattern(regexp = "^(PENDING|COMPLETED|FAILED)$", message = "Status must be PENDING, COMPLETED, or FAILED")
    private String status;
    
    private String dueDate;
    private Instant processedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
