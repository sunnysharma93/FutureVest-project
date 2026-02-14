package com.futurevest.domain.entity;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Value
@Builder
public class Payment {
    UUID id;
    UUID userId;
    UUID investorId;
    UUID courseId;
    String razorpayOrderId;
    String razorpayPaymentId;
    BigDecimal amount;
    String status; // PENDING, COMPLETED, FAILED, REFUNDED
    String paymentMethod;
    Instant createdAt;
    Instant updatedAt;
}
