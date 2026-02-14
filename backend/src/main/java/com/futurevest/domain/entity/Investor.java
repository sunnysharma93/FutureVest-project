package com.futurevest.domain.entity;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Value
@Builder
public class Investor {
    UUID id;
    String name;
    String email;
    String passwordHash;
    BigDecimal totalInvestment;
    String verificationStatus; // PENDING, VERIFIED, REJECTED
    String panCardUrl;
    boolean enabled;
    Instant createdAt;
    Instant updatedAt;
}
