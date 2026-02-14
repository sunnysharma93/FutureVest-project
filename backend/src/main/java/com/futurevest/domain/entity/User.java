package com.futurevest.domain.entity;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.UUID;

/**
 * Domain entity - core business concept. No framework annotations.
 */
@Value
@Builder
public class User {

    UUID id;
    String email;
    String passwordHash;
    String displayName;
    boolean enabled;
    Instant createdAt;
    Instant updatedAt;
}
