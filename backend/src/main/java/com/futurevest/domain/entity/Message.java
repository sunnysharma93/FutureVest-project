package com.futurevest.domain.entity;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.UUID;

@Value
@Builder
public class Message {
    UUID id;
    UUID chatId;
    UUID senderId;
    String content;
    String messageType; // TEXT, FILE, IMAGE
    String fileUrl;
    boolean isRead;
    Instant createdAt;
}
