package com.futurevest.presentation.controller;

import com.futurevest.application.service.ChatService;
import com.futurevest.presentation.dto.MessageDto;
import com.futurevest.presentation.security.SecurityUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedResourcesAssembler;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.PagedModel;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chats")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Chat Management", description = "Real-time chat messaging with WebSocket support")
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat/{chatId}/sendMessage")
    @Operation(summary = "Send message via WebSocket", description = "Send a message to a specific chat room")
    public void sendMessage(
            @DestinationVariable UUID chatId,
            @Payload @Valid MessageDto messageDto,
            @AuthenticationPrincipal SecurityUser principal) {
        
        messageDto.setChatId(chatId);
        messageDto.setSenderId(principal.getId());
        
        MessageDto savedMessage = chatService.sendMessage(messageDto, principal.getId());
        
        // Broadcast message to chat subscribers
        messagingTemplate.convertAndSend("/topic/chat/" + chatId, savedMessage);
        
        // Send notification to specific user if they're not in the chat
        messagingTemplate.convertAndSendToUser(
            savedMessage.getSenderId().toString(), 
            "/queue/notifications", 
            savedMessage
        );
    }

    @PostMapping("/{chatId}/messages")
    @Operation(summary = "Send message via REST", description = "Send a message via REST API (alternative to WebSocket)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Message sent successfully",
                content = @Content(schema = @Schema(implementation = MessageDto.class))),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "403", description = "Access denied"),
        @ApiResponse(responseCode = "404", description = "Chat not found")
    })
    @PreAuthorize("hasRole('USER') or hasRole('INVESTOR')")
    public ResponseEntity<EntityModel<MessageDto>> sendMessageViaRest(
            @Parameter(description = "Chat ID") @PathVariable UUID chatId,
            @Valid @RequestBody MessageDto messageDto,
            @AuthenticationPrincipal SecurityUser principal) {
        
        messageDto.setChatId(chatId);
        messageDto.setSenderId(principal.getId());
        
        MessageDto savedMessage = chatService.sendMessage(messageDto, principal.getId());
        
        // Broadcast message to chat subscribers
        messagingTemplate.convertAndSend("/topic/chat/" + chatId, savedMessage);
        
        return ResponseEntity.status(201).body(EntityModel.of(savedMessage));
    }

    @GetMapping("/{chatId}/messages")
    @Operation(summary = "Get chat messages", description = "Get paginated list of messages in a chat")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Messages retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Chat not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('USER') or hasRole('INVESTOR')")
    public ResponseEntity<PagedModel<EntityModel<MessageDto>>> getChatMessages(
            @Parameter(description = "Chat ID") @PathVariable UUID chatId,
            @PageableDefault(size = 50, sort = "createdAt") Pageable pageable,
            PagedResourcesAssembler<MessageDto> assembler,
            @AuthenticationPrincipal SecurityUser principal) {
        
        Page<MessageDto> messages = chatService.getChatMessages(chatId, principal.getId(), pageable);
        return ResponseEntity.ok(assembler.toModel(messages));
    }

    @PostMapping("/start")
    @Operation(summary = "Start new chat", description = "Start a new chat between user and investor")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Chat started successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "403", description = "Access denied"),
        @ApiResponse(responseCode = "404", description = "User or investor not found")
    })
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<EntityModel<UUID>> startChat(
            @Parameter(description = "Investor ID") @RequestParam UUID investorId,
            @AuthenticationPrincipal SecurityUser principal) {
        
        UUID chatId = chatService.startChat(principal.getId(), investorId);
        return ResponseEntity.status(201).body(EntityModel.of(chatId));
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get user chats", description = "Get all chats for a specific user")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Chats retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "User not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN') or #userId == authentication.principal.id")
    public ResponseEntity<List<UUID>> getUserChats(
            @Parameter(description = "User ID") @PathVariable UUID userId) {
        
        List<UUID> chats = chatService.getUserChats(userId);
        return ResponseEntity.ok(chats);
    }

    @GetMapping("/investor/{investorId}")
    @Operation(summary = "Get investor chats", description = "Get all chats for a specific investor")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Chats retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Investor not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('INVESTOR') or hasRole('ADMIN') or #investorId == authentication.principal.id")
    public ResponseEntity<List<UUID>> getInvestorChats(
            @Parameter(description = "Investor ID") @PathVariable UUID investorId) {
        
        List<UUID> chats = chatService.getInvestorChats(investorId);
        return ResponseEntity.ok(chats);
    }

    @GetMapping("/{chatId}")
    @Operation(summary = "Get chat details", description = "Get chat details and participants")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Chat details retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Chat not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('USER') or hasRole('INVESTOR')")
    public ResponseEntity<Object> getChatDetails(
            @Parameter(description = "Chat ID") @PathVariable UUID chatId,
            @AuthenticationPrincipal SecurityUser principal) {
        
        Object chatDetails = chatService.getChatDetails(chatId, principal.getId());
        return ResponseEntity.ok(chatDetails);
    }

    @PostMapping("/{chatId}/mark-read")
    @Operation(summary = "Mark messages as read", description = "Mark all messages in chat as read for current user")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Messages marked as read"),
        @ApiResponse(responseCode = "404", description = "Chat not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('USER') or hasRole('INVESTOR')")
    public ResponseEntity<Void> markMessagesAsRead(
            @Parameter(description = "Chat ID") @PathVariable UUID chatId,
            @AuthenticationPrincipal SecurityUser principal) {
        
        chatService.markMessagesAsRead(chatId, principal.getId());
        
        // Notify other participant that messages were read
        messagingTemplate.convertAndSend("/topic/chat/" + chatId + "/read", principal.getId());
        
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{chatId}/typing")
    @Operation(summary = "Send typing indicator", description = "Send typing indicator to chat participants")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Typing indicator sent"),
        @ApiResponse(responseCode = "404", description = "Chat not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('USER') or hasRole('INVESTOR')")
    public ResponseEntity<Void> sendTypingIndicator(
            @Parameter(description = "Chat ID") @PathVariable UUID chatId,
            @Parameter(description = "Is typing") @RequestParam boolean isTyping,
            @AuthenticationPrincipal SecurityUser principal) {
        
        // Broadcast typing indicator to chat subscribers
        messagingTemplate.convertAndSend("/topic/chat/" + chatId + "/typing", 
            java.util.Map.of("userId", principal.getId(), "isTyping", isTyping));
        
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{chatId}")
    @Operation(summary = "Delete chat", description = "Delete a chat (admin only)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Chat deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Chat not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteChat(@Parameter(description = "Chat ID") @PathVariable UUID chatId) {
        chatService.deleteChat(chatId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{chatId}/archive")
    @Operation(summary = "Archive chat", description = "Archive a chat for the current user")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Chat archived successfully"),
        @ApiResponse(responseCode = "404", description = "Chat not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('USER') or hasRole('INVESTOR')")
    public ResponseEntity<Void> archiveChat(
            @Parameter(description = "Chat ID") @PathVariable UUID chatId,
            @AuthenticationPrincipal SecurityUser principal) {
        
        chatService.archiveChat(chatId, principal.getId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/unread/{userId}")
    @Operation(summary = "Get unread message count", description = "Get count of unread messages for a user")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Unread count retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "User not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('USER') or hasRole('INVESTOR') or #userId == authentication.principal.id")
    public ResponseEntity<Integer> getUnreadMessageCount(
            @Parameter(description = "User ID") @PathVariable UUID userId) {
        
        int count = chatService.getUnreadMessageCount(userId);
        return ResponseEntity.ok(count);
    }
}
