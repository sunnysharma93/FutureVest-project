package com.futurevest.presentation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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
public class MessageDto {
    private UUID id;
    
    @NotNull(message = "Chat ID is required")
    private UUID chatId;
    
    @NotNull(message = "Sender ID is required")
    private UUID senderId;
    
    @NotBlank(message = "Content is required")
    @Size(max = 1000, message = "Message content must not exceed 1000 characters")
    private String content;
    
    @Pattern(regexp = "^(TEXT|FILE|IMAGE)$", message = "Message type must be TEXT, FILE, or IMAGE")
    private String messageType;
    
    private String fileUrl;
    private boolean isRead;
    private Instant createdAt;
}
