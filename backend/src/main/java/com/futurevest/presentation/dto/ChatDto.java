package com.futurevest.presentation.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatDto {
    private UUID id;
    
    @NotNull(message = "User ID is required")
    private UUID userId;
    
    @NotNull(message = "Investor ID is required")
    private UUID investorId;
    
    @Pattern(regexp = "^(ACTIVE|CLOSED|ARCHIVED)$", message = "Status must be ACTIVE, CLOSED, or ARCHIVED")
    private String status;
    
    private Instant createdAt;
    private Instant updatedAt;
    
    // Additional fields for response
    private String userName;
    private String investorName;
    private MessageDto lastMessage;
    private Integer unreadMessageCount;
}
