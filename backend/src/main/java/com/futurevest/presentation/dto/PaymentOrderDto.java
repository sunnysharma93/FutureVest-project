package com.futurevest.presentation.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentOrderDto {
    @NotNull(message = "User ID is required")
    private UUID userId;
    
    @NotNull(message = "Investor ID is required")
    private UUID investorId;
    
    @NotNull(message = "Course ID is required")
    private UUID courseId;
    
    @DecimalMin(value = "1.0", message = "Amount must be at least 1.0")
    private BigDecimal amount;
    
    @NotBlank(message = "Currency is required")
    private String currency;
}
