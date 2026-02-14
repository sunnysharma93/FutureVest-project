package com.futurevest.domain.entity;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.UUID;

@Value
@Builder
public class Chat {
    UUID id;
    UUID userId;
    UUID investorId;
    String status; // ACTIVE, CLOSED, ARCHIVED
    Instant createdAt;
    Instant updatedAt;
}
