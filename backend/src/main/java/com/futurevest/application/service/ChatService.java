package com.futurevest.application.service;

import com.futurevest.application.port.out.ChatRepository;
import com.futurevest.application.port.out.MessageRepository;
import com.futurevest.application.port.out.UserRepository;
import com.futurevest.application.port.out.InvestorRepository;
import com.futurevest.domain.entity.Chat;
import com.futurevest.domain.entity.Message;
import com.futurevest.domain.entity.User;
import com.futurevest.domain.entity.Investor;
import com.futurevest.application.service.exception.InvalidChatException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.core.sync.RequestBody;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ChatService {

    private final ChatRepository chatRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final InvestorRepository investorRepository;
    private final S3Client s3Client;
    private static final String BUCKET_NAME = "futurevest-chat-files";

    @Transactional
    public Chat createChat(UUID userId, UUID investorId) {
        log.info("Creating chat between user ID: {} and investor ID: {}", userId, investorId);
        
        validateChatPair(userId, investorId);
        
        Optional<Chat> existingChat = chatRepository.findByUserIdAndInvestorId(userId, investorId);
        if (existingChat.isPresent()) {
            log.info("Chat already exists between user ID: {} and investor ID: {}", userId, investorId);
            return existingChat.get();
        }

        Chat chat = Chat.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .investorId(investorId)
                .status("ACTIVE")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Chat savedChat = chatRepository.save(chat);
        log.info("Successfully created chat with ID: {}", savedChat.getId());
        
        return savedChat;
    }

    @Transactional
    public Message sendMessage(UUID chatId, UUID senderId, String content, 
                              String messageType, MultipartFile file) {
        log.info("Sending message in chat ID: {} from sender ID: {}", chatId, senderId);
        
        Optional<Chat> chatOpt = chatRepository.findById(chatId);
        if (chatOpt.isEmpty()) {
            log.error("Chat not found for ID: {}", chatId);
            throw new InvalidChatException("Chat not found");
        }

        Chat chat = chatOpt.get();
        validateMessageSender(chat, senderId);

        String fileUrl = null;
        if (file != null && !file.isEmpty()) {
            fileUrl = uploadFileAsync(file, "chat/" + chatId + "/" + UUID.randomUUID()).join();
        }

        Message message = Message.builder()
                .id(UUID.randomUUID())
                .chatId(chatId)
                .senderId(senderId)
                .content(content)
                .messageType(messageType != null ? messageType : "TEXT")
                .fileUrl(fileUrl)
                .isRead(false)
                .createdAt(Instant.now())
                .build();

        Message savedMessage = messageRepository.save(message);
        
        // Update chat timestamp
        chatRepository.save(chat.toBuilder()
                .updatedAt(Instant.now())
                .build());

        log.info("Successfully sent message with ID: {} in chat ID: {}", savedMessage.getId(), chatId);
        
        return savedMessage;
    }

    public List<Message> getChatMessages(UUID chatId, UUID requesterId) {
        log.info("Fetching messages for chat ID: {} by requester ID: {}", chatId, requesterId);
        
        Optional<Chat> chatOpt = chatRepository.findById(chatId);
        if (chatOpt.isEmpty()) {
            log.error("Chat not found for ID: {}", chatId);
            throw new InvalidChatException("Chat not found");
        }

        Chat chat = chatOpt.get();
        validateMessageAccess(chat, requesterId);

        List<Message> messages = messageRepository.findByChatIdOrderByCreatedAt(chatId);
        log.info("Found {} messages for chat ID: {}", messages.size(), chatId);
        
        return messages;
    }

    @Transactional
    public Message markMessageAsRead(UUID messageId, UUID readerId) {
        log.info("Marking message as read - ID: {} by reader ID: {}", messageId, readerId);
        
        Optional<Message> messageOpt = messageRepository.findById(messageId);
        if (messageOpt.isEmpty()) {
            log.error("Message not found for ID: {}", messageId);
            throw new InvalidChatException("Message not found");
        }

        Message message = messageOpt.get();
        
        Optional<Chat> chatOpt = chatRepository.findById(message.getChatId());
        if (chatOpt.isEmpty()) {
            log.error("Chat not found for message ID: {}", messageId);
            throw new InvalidChatException("Chat not found");
        }

        Chat chat = chatOpt.get();
        validateMessageAccess(chat, readerId);

        if (!message.getSenderId().equals(readerId)) {
            Message updatedMessage = message.toBuilder()
                    .isRead(true)
                    .build();

            Message savedMessage = messageRepository.save(updatedMessage);
            log.info("Marked message as read - ID: {}", messageId);
            
            return savedMessage;
        }

        return message;
    }

    public List<Chat> getUserChats(UUID userId) {
        log.info("Fetching chats for user ID: {}", userId);
        
        List<Chat> chats = chatRepository.findByUserId(userId);
        log.info("Found {} chats for user ID: {}", chats.size(), userId);
        
        return chats;
    }

    public List<Chat> getInvestorChats(UUID investorId) {
        log.info("Fetching chats for investor ID: {}", investorId);
        
        List<Chat> chats = chatRepository.findByInvestorId(investorId);
        log.info("Found {} chats for investor ID: {}", chats.size(), investorId);
        
        return chats;
    }

    @Transactional
    public Chat updateChatStatus(UUID chatId, String status, UUID requesterId) {
        log.info("Updating chat status to {} for chat ID: {} by requester ID: {}", status, chatId, requesterId);
        
        Optional<Chat> chatOpt = chatRepository.findById(chatId);
        if (chatOpt.isEmpty()) {
            log.error("Chat not found for ID: {}", chatId);
            throw new InvalidChatException("Chat not found");
        }

        Chat chat = chatOpt.get();
        validateMessageAccess(chat, requesterId);

        Chat updatedChat = chat.toBuilder()
                .status(status)
                .updatedAt(Instant.now())
                .build();

        Chat savedChat = chatRepository.save(updatedChat);
        log.info("Updated chat status to {} for chat ID: {}", status, chatId);
        
        return savedChat;
    }

    public int getUnreadMessageCount(UUID chatId, UUID userId) {
        log.info("Counting unread messages for chat ID: {} and user ID: {}", chatId, userId);
        
        Optional<Chat> chatOpt = chatRepository.findById(chatId);
        if (chatOpt.isEmpty()) {
            log.error("Chat not found for ID: {}", chatId);
            throw new InvalidChatException("Chat not found");
        }

        Chat chat = chatOpt.get();
        validateMessageAccess(chat, userId);

        int unreadCount = messageRepository.countUnreadMessagesByChatIdAndSenderId(chatId, userId);
        log.info("Found {} unread messages for chat ID: {} and user ID: {}", unreadCount, chatId, userId);
        
        return unreadCount;
    }

    private void validateChatPair(UUID userId, UUID investorId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            log.error("User not found for ID: {}", userId);
            throw new InvalidChatException("User not found");
        }

        Optional<Investor> investorOpt = investorRepository.findById(investorId);
        if (investorOpt.isEmpty()) {
            log.error("Investor not found for ID: {}", investorId);
            throw new InvalidChatException("Investor not found");
        }

        // Additional validation: Check if investor has invested in this user
        // This would require checking payment records
        // For now, we'll allow any user-investor pair
    }

    private void validateMessageSender(Chat chat, UUID senderId) {
        if (!senderId.equals(chat.getUserId()) && !senderId.equals(chat.getInvestorId())) {
            log.error("Unauthorized message sender ID: {} for chat ID: {}", senderId, chat.getId());
            throw new InvalidChatException("Unauthorized sender");
        }
    }

    private void validateMessageAccess(Chat chat, UUID requesterId) {
        if (!requesterId.equals(chat.getUserId()) && !requesterId.equals(chat.getInvestorId())) {
            log.error("Unauthorized access to chat ID: {} by requester ID: {}", chat.getId(), requesterId);
            throw new InvalidChatException("Unauthorized access");
        }
    }

    @Transactional
    public void deleteMessage(UUID messageId, UUID requesterId) {
        log.info("Deleting message ID: {} by requester ID: {}", messageId, requesterId);
        
        Optional<Message> messageOpt = messageRepository.findById(messageId);
        if (messageOpt.isEmpty()) {
            log.error("Message not found for ID: {}", messageId);
            throw new InvalidChatException("Message not found");
        }

        Message message = messageOpt.get();
        
        if (!message.getSenderId().equals(requesterId)) {
            log.error("Unauthorized deletion attempt for message ID: {} by requester ID: {}", messageId, requesterId);
            throw new InvalidChatException("Unauthorized deletion");
        }

        messageRepository.deleteById(messageId);
        log.info("Successfully deleted message ID: {}", messageId);
    }

    @Transactional
    public void deleteChat(UUID chatId, UUID requesterId) {
        log.info("Deleting chat ID: {} by requester ID: {}", chatId, requesterId);
        
        Optional<Chat> chatOpt = chatRepository.findById(chatId);
        if (chatOpt.isEmpty()) {
            log.error("Chat not found for ID: {}", chatId);
            throw new InvalidChatException("Chat not found");
        }

        Chat chat = chatOpt.get();
        validateMessageAccess(chat, requesterId);

        // Delete all messages first
        messageRepository.deleteByChatId(chatId);
        
        // Delete the chat
        chatRepository.deleteById(chatId);
        
        log.info("Successfully deleted chat ID: {} and all its messages", chatId);
    }

    @Transactional
    public CompletableFuture<String> uploadFileAsync(MultipartFile file, String key) {
        try {
            log.info("Uploading chat file with key: {}", key);
            
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(BUCKET_NAME)
                    .key(key)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(file.getBytes()));
            
            String fileUrl = String.format("https://%s.s3.amazonaws.com/%s", BUCKET_NAME, key);
            log.info("Chat file uploaded successfully: {}", fileUrl);
            
            return CompletableFuture.completedFuture(fileUrl);
        } catch (IOException e) {
            log.error("Failed to upload chat file: {}", key, e);
            throw new RuntimeException("Failed to upload file: " + key, e);
        }
    }
}
