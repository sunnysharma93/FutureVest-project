package com.futurevest.presentation.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class PaymentDto {
    private UUID id;
    
    @NotNull(message = "User ID is required")
    private UUID userId;
    
    @NotNull(message = "Investor ID is required")
    private UUID investorId;
    
    @NotNull(message = "Course ID is required")
    private UUID courseId;
    
    private String razorpayOrderId;
    private String razorpayPaymentId;
    
    @DecimalMin(value = "0.0", message = "Amount must be non-negative")
    private BigDecimal amount;
    
    @Pattern(regexp = "^(PENDING|COMPLETED|FAILED|REFUNDED)$", message = "Status must be PENDING, COMPLETED, FAILED, or REFUNDED")
    private String status;
    
    private String paymentMethod;
    private Instant createdAt;
    private Instant updatedAt;
}
