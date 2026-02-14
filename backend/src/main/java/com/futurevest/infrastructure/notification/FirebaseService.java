package com.futurevest.infrastructure.notification;

import com.google.firebase.messaging.*;
import com.futurevest.domain.entity.User;
import com.futurevest.web.dto.NotificationRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FirebaseService {

    private final FirebaseMessaging firebaseMessaging;
    private final UserDeviceTokenRepository deviceTokenRepository;

    /**
     * Send notification to a specific user
     */
    @Transactional
    public CompletableFuture<BatchResponse> sendNotificationToUser(UUID userId, NotificationRequest request) {
        try {
            // Get user's device tokens
            List<UserDeviceToken> deviceTokens = deviceTokenRepository.findByUserId(userId);
            
            if (deviceTokens.isEmpty()) {
                log.warn("No device tokens found for user: {}", userId);
                return CompletableFuture.completedFuture(null);
            }

            // Build notification message
            Message.Builder messageBuilder = Message.builder()
                .setNotification(Notification.builder()
                    .setTitle(request.getTitle())
                    .setBody(request.getBody())
                    .setImage(request.getImageUrl())
                    .build())
                .putAllData(request.getData())
                .setApnsConfig(getApnsConfig(request))
                .setAndroidConfig(getAndroidConfig(request))
                .setWebpushConfig(getWebpushConfig(request));

            // Create multicast message for all devices
            List<String> tokens = deviceTokens.stream()
                .map(UserDeviceToken::getToken)
                .collect(Collectors.toList());

            MulticastMessage multicastMessage = MulticastMessage.builder()
                .addAllTokens(tokens)
                .setNotification(Notification.builder()
                    .setTitle(request.getTitle())
                    .setBody(request.getBody())
                    .setImage(request.getImageUrl())
                    .build())
                .putAllData(request.getData())
                .setApnsConfig(getApnsConfig(request))
                .setAndroidConfig(getAndroidConfig(request))
                .setWebpushConfig(getWebpushConfig(request))
                .build();

            // Send multicast message
            return firebaseMessaging.sendMulticastAsync(multicastMessage)
                .thenApply(response -> {
                    log.info("Sent notification to {} devices for user {}: {} successful, {} failed",
                        response.getSuccessCount() + response.getFailureCount(),
                        userId,
                        response.getSuccessCount(),
                        response.getFailureCount());

                    // Handle failed tokens
                    handleFailedTokens(response, deviceTokens);

                    return response;
                })
                .exceptionally(throwable -> {
                    log.error("Failed to send notification to user: {}", userId, throwable);
                    throw new NotificationException("Failed to send notification", throwable);
                });

        } catch (Exception e) {
            log.error("Error preparing notification for user: {}", userId, e);
            return CompletableFuture.failedFuture(e);
        }
    }

    /**
     * Send broadcast notification to all users
     */
    @Transactional
    public CompletableFuture<BatchResponse> sendBroadcastNotification(NotificationRequest request) {
        try {
            // Get all active device tokens
            List<UserDeviceToken> deviceTokens = deviceTokenRepository.findAllActive();

            if (deviceTokens.isEmpty()) {
                log.warn("No device tokens found for broadcast");
                return CompletableFuture.completedFuture(null);
            }

            // Batch tokens (Firebase supports max 500 tokens per multicast)
            List<List<String>> tokenBatches = partitionTokens(
                deviceTokens.stream()
                    .map(UserDeviceToken::getToken)
                    .collect(Collectors.toList()),
                500
            );

            List<CompletableFuture<BatchResponse>> futures = new ArrayList<>();

            for (List<String> tokenBatch : tokenBatches) {
                MulticastMessage multicastMessage = MulticastMessage.builder()
                    .addAllTokens(tokenBatch)
                    .setNotification(Notification.builder()
                        .setTitle(request.getTitle())
                        .setBody(request.getBody())
                        .setImage(request.getImageUrl())
                        .build())
                    .putAllData(request.getData())
                    .setApnsConfig(getApnsConfig(request))
                    .setAndroidConfig(getAndroidConfig(request))
                    .setWebpushConfig(getWebpushConfig(request))
                    .build();

                futures.add(firebaseMessaging.sendMulticastAsync(multicastMessage));
            }

            // Wait for all batches to complete
            return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .thenApply(v -> {
                    int totalSuccess = 0;
                    int totalFailure = 0;

                    for (CompletableFuture<BatchResponse> future : futures) {
                        try {
                            BatchResponse response = future.get();
                            totalSuccess += response.getSuccessCount();
                            totalFailure += response.getFailureCount();
                        } catch (Exception e) {
                            log.error("Error getting batch response", e);
                            totalFailure += 500; // Max batch size
                        }
                    }

                    log.info("Broadcast notification sent: {} successful, {} failed", totalSuccess, totalFailure);

                    return BatchResponse.builder()
                        .setSuccessCount(totalSuccess)
                        .setFailureCount(totalFailure)
                        .build();
                })
                .exceptionally(throwable -> {
                    log.error("Failed to send broadcast notification", throwable);
                    throw new NotificationException("Failed to send broadcast notification", throwable);
                });

        } catch (Exception e) {
            log.error("Error preparing broadcast notification", e);
            return CompletableFuture.failedFuture(e);
        }
    }

    /**
     * Send notification to specific device tokens
     */
    public CompletableFuture<BatchResponse> sendNotificationToTokens(List<String> tokens, NotificationRequest request) {
        try {
            if (tokens.isEmpty()) {
                log.warn("No tokens provided for notification");
                return CompletableFuture.completedFuture(null);
            }

            MulticastMessage multicastMessage = MulticastMessage.builder()
                .addAllTokens(tokens)
                .setNotification(Notification.builder()
                    .setTitle(request.getTitle())
                    .setBody(request.getBody())
                    .setImage(request.getImageUrl())
                    .build())
                .putAllData(request.getData())
                .setApnsConfig(getApnsConfig(request))
                .setAndroidConfig(getAndroidConfig(request))
                .setWebpushConfig(getWebpushConfig(request))
                .build();

            return firebaseMessaging.sendMulticastAsync(multicastMessage)
                .thenApply(response -> {
                    log.info("Sent notification to {} tokens: {} successful, {} failed",
                        tokens.size(),
                        response.getSuccessCount(),
                        response.getFailureCount());
                    return response;
                })
                .exceptionally(throwable -> {
                    log.error("Failed to send notification to tokens", throwable);
                    throw new NotificationException("Failed to send notification to tokens", throwable);
                });

        } catch (Exception e) {
            log.error("Error preparing notification for tokens", e);
            return CompletableFuture.failedFuture(e);
        }
    }

    /**
     * Register device token for user
     */
    @Transactional
    public void registerDeviceToken(UUID userId, String token, String deviceType, String deviceId) {
        try {
            // Check if token already exists for this device
            Optional<UserDeviceToken> existingToken = deviceTokenRepository
                .findByUserIdAndDeviceId(userId, deviceId);

            if (existingToken.isPresent()) {
                // Update existing token
                UserDeviceToken userDeviceToken = existingToken.get();
                userDeviceToken.setToken(token);
                userDeviceToken.setDeviceType(deviceType);
                userDeviceToken.setUpdatedAt(LocalDateTime.now());
                deviceTokenRepository.save(userDeviceToken);
                log.info("Updated device token for user: {}, device: {}", userId, deviceId);
            } else {
                // Create new token
                UserDeviceToken userDeviceToken = UserDeviceToken.builder()
                    .userId(userId)
                    .token(token)
                    .deviceType(deviceType)
                    .deviceId(deviceId)
                    .isActive(true)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
                deviceTokenRepository.save(userDeviceToken);
                log.info("Registered new device token for user: {}, device: {}", userId, deviceId);
            }

            // Clean up old inactive tokens for this user
            cleanupOldTokens(userId, deviceId);

        } catch (Exception e) {
            log.error("Error registering device token for user: {}, device: {}", userId, deviceId, e);
            throw new NotificationException("Failed to register device token", e);
        }
    }

    /**
     * Unregister device token
     */
    @Transactional
    public void unregisterDeviceToken(UUID userId, String deviceId) {
        try {
            Optional<UserDeviceToken> token = deviceTokenRepository
                .findByUserIdAndDeviceId(userId, deviceId);

            if (token.isPresent()) {
                deviceTokenRepository.delete(token.get());
                log.info("Unregistered device token for user: {}, device: {}", userId, deviceId);
            } else {
                log.warn("Device token not found for user: {}, device: {}", userId, deviceId);
            }

        } catch (Exception e) {
            log.error("Error unregistering device token for user: {}, device: {}", userId, deviceId, e);
            throw new NotificationException("Failed to unregister device token", e);
        }
    }

    /**
     * Send chat notification
     */
    public CompletableFuture<BatchResponse> sendChatNotification(UUID userId, String senderName, String message, String chatRoomId) {
        Map<String, String> data = new HashMap<>();
        data.put("type", "chat");
        data.put("senderName", senderName);
        data.put("message", message);
        data.put("chatRoomId", chatRoomId);
        data.put("timestamp", String.valueOf(System.currentTimeMillis()));

        NotificationRequest request = NotificationRequest.builder()
            .title("New Message from " + senderName)
            .body(message)
            .data(data)
            .build();

        return sendNotificationToUser(userId, request);
    }

    /**
     * Send payment notification
     */
    public CompletableFuture<BatchResponse> sendPaymentNotification(UUID userId, String paymentType, double amount, String status) {
        Map<String, String> data = new HashMap<>();
        data.put("type", "payment");
        data.put("paymentType", paymentType);
        data.put("amount", String.valueOf(amount));
        data.put("status", status);
        data.put("timestamp", String.valueOf(System.currentTimeMillis()));

        String title = status.equalsIgnoreCase("success") ? "Payment Successful" : "Payment Failed";
        String body = String.format("%s: ₹%.2f", paymentType, amount);

        NotificationRequest request = NotificationRequest.builder()
            .title(title)
            .body(body)
            .data(data)
            .build();

        return sendNotificationToUser(userId, request);
    }

    /**
     * Send investment notification
     */
    public CompletableFuture<BatchResponse> sendInvestmentNotification(UUID userId, String investmentType, double amount) {
        Map<String, String> data = new HashMap<>();
        data.put("type", "investment");
        data.put("investmentType", investmentType);
        data.put("amount", String.valueOf(amount));
        data.put("timestamp", String.valueOf(System.currentTimeMillis()));

        NotificationRequest request = NotificationRequest.builder()
            .title("Investment Created")
            .body(String.format("Your %s investment of ₹%.2f has been created successfully", investmentType, amount))
            .data(data)
            .build();

        return sendNotificationToUser(userId, request);
    }

    /**
     * Send repayment reminder notification
     */
    public CompletableFuture<BatchResponse> sendRepaymentReminderNotification(UUID userId, double amount, LocalDateTime dueDate) {
        Map<String, String> data = new HashMap<>();
        data.put("type", "repayment_reminder");
        data.put("amount", String.valueOf(amount));
        data.put("dueDate", dueDate.toString());
        data.put("timestamp", String.valueOf(System.currentTimeMillis()));

        NotificationRequest request = NotificationRequest.builder()
            .title("Repayment Reminder")
            .body(String.format("Your repayment of ₹%.2f is due on %s", amount, dueDate.toLocalDate()))
            .data(data)
            .build();

        return sendNotificationToUser(userId, request);
    }

    /**
     * Send job application notification
     */
    public CompletableFuture<BatchResponse> sendJobApplicationNotification(UUID userId, String jobTitle, String company) {
        Map<String, String> data = new HashMap<>();
        data.put("type", "job_application");
        data.put("jobTitle", jobTitle);
        data.put("company", company);
        data.put("timestamp", String.valueOf(System.currentTimeMillis()));

        NotificationRequest request = NotificationRequest.builder()
            .title("Job Application Received")
            .body(String.format("Your application for %s at %s has been received", jobTitle, company))
            .data(data)
            .build();

        return sendNotificationToUser(userId, request);
    }

    /**
     * Handle failed tokens and remove invalid ones
     */
    private void handleFailedTokens(BatchResponse response, List<UserDeviceToken> deviceTokens) {
        List<String> tokensToRemove = new ArrayList<>();

        for (int i = 0; i < response.getResponses().size(); i++) {
            if (!response.getResponses().get(i).isSuccessful()) {
                String token = deviceTokens.get(i).getToken();
                tokensToRemove.add(token);

                // Log specific error
                SendResponse sendResponse = response.getResponses().get(i);
                log.warn("Failed to send notification to token {}: {}", 
                    token, sendResponse.getException().getMessage());
            }
        }

        // Remove invalid tokens from database
        if (!tokensToRemove.isEmpty()) {
            deviceTokenRepository.deleteByTokenIn(tokensToRemove);
            log.info("Removed {} invalid tokens from database", tokensToRemove.size());
        }
    }

    /**
     * Clean up old inactive tokens for user
     */
    private void cleanupOldTokens(UUID userId, String currentDeviceId) {
        try {
            // Keep only the most recent 5 tokens per user, excluding current device
            List<UserDeviceToken> oldTokens = deviceTokenRepository
                .findByUserIdOrderByUpdatedAtDesc(userId)
                .stream()
                .filter(token -> !token.getDeviceId().equals(currentDeviceId))
                .skip(4) // Keep only 4 old tokens + current token
                .collect(Collectors.toList());

            if (!oldTokens.isEmpty()) {
                deviceTokenRepository.deleteAll(oldTokens);
                log.info("Cleaned up {} old tokens for user: {}", oldTokens.size(), userId);
            }

        } catch (Exception e) {
            log.error("Error cleaning up old tokens for user: {}", userId, e);
        }
    }

    /**
     * Partition tokens into batches
     */
    private List<List<String>> partitionTokens(List<String> tokens, int batchSize) {
        List<List<String>> batches = new ArrayList<>();
        for (int i = 0; i < tokens.size(); i += batchSize) {
            batches.add(tokens.subList(i, Math.min(i + batchSize, tokens.size())));
        }
        return batches;
    }

    /**
     * Get Android configuration
     */
    private AndroidConfig getAndroidConfig(NotificationRequest request) {
        return AndroidConfig.builder()
            .setNotification(AndroidNotification.builder()
                .setColor("#4CAF50")
                .setSound("default")
                .setClickAction(request.getClickAction())
                .setIcon("ic_notification")
                .setTag(request.getTag())
                .build())
            .setPriority(AndroidConfig.Priority.HIGH)
            .setTtl(Duration.ofSeconds(3600)) // 1 hour
            .build();
    }

    /**
     * Get APNS configuration
     */
    private ApnsConfig getApnsConfig(NotificationRequest request) {
        return ApnsConfig.builder()
            .setAps(Aps.builder()
                .setSound("default")
                .setBadge(request.getBadge())
                .setCategory(request.getCategory())
                .setContentAvailable(request.isContentAvailable())
                .build())
            .putAllCustomData(request.getApnsCustomData())
            .build();
    }

    /**
     * Get Webpush configuration
     */
    private WebpushConfig getWebpushConfig(NotificationRequest request) {
        return WebpushConfig.builder()
            .setNotification(WebpushNotification.builder()
                .setTitle(request.getTitle())
                .setBody(request.getBody())
                .setIcon(request.getIcon())
                .setImage(request.getImageUrl())
                .setBadge(request.getBadge())
                .setTag(request.getTag())
                .setRenotify(request.isRenotify())
                .setRequireInteraction(request.isRequireInteraction())
                .setSilent(request.isSilent())
                .setVibrate(request.getVibrate())
                .setData(request.getWebpushData())
                .setActions(request.getActions())
                .build())
            .putAllCustomData(request.getWebpushCustomData())
            .build();
    }

    /**
     * Send topic notification
     */
    public CompletableFuture<String> sendTopicNotification(String topic, NotificationRequest request) {
        try {
            Message message = Message.builder()
                .setTopic(topic)
                .setNotification(Notification.builder()
                    .setTitle(request.getTitle())
                    .setBody(request.getBody())
                    .setImage(request.getImageUrl())
                    .build())
                .putAllData(request.getData())
                .setApnsConfig(getApnsConfig(request))
                .setAndroidConfig(getAndroidConfig(request))
                .setWebpushConfig(getWebpushConfig(request))
                .build();

            return firebaseMessaging.sendAsync(message)
                .thenApply(messageId -> {
                    log.info("Sent topic notification to {}: {}", topic, messageId);
                    return messageId;
                })
                .exceptionally(throwable -> {
                    log.error("Failed to send topic notification to: {}", topic, throwable);
                    throw new NotificationException("Failed to send topic notification", throwable);
                });

        } catch (Exception e) {
            log.error("Error preparing topic notification for: {}", topic, e);
            return CompletableFuture.failedFuture(e);
        }
    }

    /**
     * Subscribe user to topic
     */
    public CompletableFuture<TopicManagementResponse> subscribeToTopic(UUID userId, String topic) {
        try {
            List<UserDeviceToken> deviceTokens = deviceTokenRepository.findByUserId(userId);
            
            if (deviceTokens.isEmpty()) {
                log.warn("No device tokens found for user: {}", userId);
                return CompletableFuture.completedFuture(null);
            }

            List<String> tokens = deviceTokens.stream()
                .map(UserDeviceToken::getToken)
                .collect(Collectors.toList());

            return firebaseMessaging.subscribeToTopicAsync(tokens, topic)
                .thenApply(response -> {
                    log.info("Subscribed {} tokens to topic {}: {} successful, {} failed",
                        tokens.size(), topic, response.getSuccessCount(), response.getFailureCount());
                    return response;
                })
                .exceptionally(throwable -> {
                    log.error("Failed to subscribe user {} to topic: {}", userId, topic, throwable);
                    throw new NotificationException("Failed to subscribe to topic", throwable);
                });

        } catch (Exception e) {
            log.error("Error subscribing user {} to topic: {}", userId, topic, e);
            return CompletableFuture.failedFuture(e);
        }
    }

    /**
     * Unsubscribe user from topic
     */
    public CompletableFuture<TopicManagementResponse> unsubscribeFromTopic(UUID userId, String topic) {
        try {
            List<UserDeviceToken> deviceTokens = deviceTokenRepository.findByUserId(userId);
            
            if (deviceTokens.isEmpty()) {
                log.warn("No device tokens found for user: {}", userId);
                return CompletableFuture.completedFuture(null);
            }

            List<String> tokens = deviceTokens.stream()
                .map(UserDeviceToken::getToken)
                .collect(Collectors.toList());

            return firebaseMessaging.unsubscribeFromTopicAsync(tokens, topic)
                .thenApply(response -> {
                    log.info("Unsubscribed {} tokens from topic {}: {} successful, {} failed",
                        tokens.size(), topic, response.getSuccessCount(), response.getFailureCount());
                    return response;
                })
                .exceptionally(throwable -> {
                    log.error("Failed to unsubscribe user {} from topic: {}", userId, topic, throwable);
                    throw new NotificationException("Failed to unsubscribe from topic", throwable);
                });

        } catch (Exception e) {
            log.error("Error unsubscribing user {} from topic: {}", userId, topic, e);
            return CompletableFuture.failedFuture(e);
        }
    }
}
