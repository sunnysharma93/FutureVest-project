package com.futurevest.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.client.WebSocketClient;
import org.springframework.web.reactive.socket.client.ReactorNettyWebSocketClient;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("WebSocket Integration Tests")
class WebSocketIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("futurevest_test")
            .withUsername("test")
            .withPassword("test");

    @Container
    @ServiceConnection
    static GenericContainer<?> redis = new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
            .withExposedPorts(6379);

    @LocalServerPort
    private int port;

    @Autowired
    private WebTestClient webTestClient;

    @Autowired
    private ObjectMapper objectMapper;

    private WebSocketClient webSocketClient;
    private URI webSocketUri;

    @BeforeEach
    void setUp() {
        webSocketClient = new ReactorNettyWebSocketClient();
        webSocketUri = URI.create("ws://localhost:" + port + "/ws");
    }

    @Test
    @DisplayName("Should establish WebSocket connection")
    void shouldEstablishWebSocketConnection() throws Exception {
        // Given
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> message = new AtomicReference<>();

        // When
        webSocketClient.execute(webSocketUri, session -> {
            session.receive()
                    .map(WebSocketMessage::getPayloadAsText)
                    .subscribe(msg -> {
                        message.set(msg);
                        latch.countDown();
                    });
            
            // Send a test message
            session.send(Mono.just(session.textMessage("{\"type\":\"ping\"}")));
            
            return session.close();
        });

        // Then
        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertNotNull(message.get());
    }

    @Test
    @DisplayName("Should handle chat messages")
    void shouldHandleChatMessages() throws Exception {
        // Given
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> receivedMessage = new AtomicReference<>();

        // When
        webSocketClient.execute(webSocketUri, session -> {
            session.receive()
                    .map(WebSocketMessage::getPayloadAsText)
                    .subscribe(msg -> {
                        receivedMessage.set(msg);
                        latch.countDown();
                    });
            
            // Send chat message
            String chatMessage = objectMapper.writeValueAsString(
                    Map.of(
                            "type", "chat",
                            "roomId", "test-room",
                            "message", "Hello, World!",
                            "senderId", "user-123"
                    )
            );
            
            session.send(Mono.just(session.textMessage(chatMessage)));
            
            return session.close();
        });

        // Then
        assertTrue(latch.await(5, TimeUnit.SECONDS));
        String message = receivedMessage.get();
        assertNotNull(message);
        assertTrue(message.contains("chat"));
    }

    @Test
    @DisplayName("Should handle typing indicators")
    void shouldHandleTypingIndicators() throws Exception {
        // Given
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> receivedMessage = new AtomicReference<>();

        // When
        webSocketClient.execute(webSocketUri, session -> {
            session.receive()
                    .map(WebSocketMessage::getPayloadAsText)
                    .subscribe(msg -> {
                        receivedMessage.set(msg);
                        latch.countDown();
                    });
            
            // Send typing indicator
            String typingMessage = objectMapper.writeValueAsString(
                    Map.of(
                            "type", "typing",
                            "roomId", "test-room",
                            "userId", "user-123",
                            "isTyping", true
                    )
            );
            
            session.send(Mono.just(session.textMessage(typingMessage)));
            
            return session.close();
        });

        // Then
        assertTrue(latch.await(5, TimeUnit.SECONDS));
        String message = receivedMessage.get();
        assertNotNull(message);
        assertTrue(message.contains("typing"));
    }

    @Test
    @DisplayName("Should handle online status updates")
    void shouldHandleOnlineStatusUpdates() throws Exception {
        // Given
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> receivedMessage = new AtomicReference<>();

        // When
        webSocketClient.execute(webSocketUri, session -> {
            session.receive()
                    .map(WebSocketMessage::getPayloadAsText)
                    .subscribe(msg -> {
                        receivedMessage.set(msg);
                        latch.countDown();
                    });
            
            // Send online status
            String statusMessage = objectMapper.writeValueAsString(
                    Map.of(
                            "type", "status",
                            "userId", "user-123",
                            "status", "online"
                    )
            );
            
            session.send(Mono.just(session.textMessage(statusMessage)));
            
            return session.close();
        });

        // Then
        assertTrue(latch.await(5, TimeUnit.SECONDS));
        String message = receivedMessage.get();
        assertNotNull(message);
        assertTrue(message.contains("status"));
    }

    @Test
    @DisplayName("Should handle multiple concurrent connections")
    void shouldHandleMultipleConcurrentConnections() throws Exception {
        // Given
        int connectionCount = 5;
        CountDownLatch latch = new CountDownLatch(connectionCount);
        AtomicReference<List<String>> messages = new AtomicReference<>(List.of());

        // When
        for (int i = 0; i < connectionCount; i++) {
            webSocketClient.execute(webSocketUri, session -> {
                session.receive()
                        .map(WebSocketMessage::getPayloadAsText)
                        .subscribe(msg -> {
                            messages.getAndUpdate(list -> {
                                List<String> newList = new ArrayList<>(list);
                                newList.add(msg);
                                return newList;
                            });
                            latch.countDown();
                        });
                
                // Send test message
                String testMessage = objectMapper.writeValueAsString(
                        Map.of(
                                "type", "test",
                                "connectionId", i,
                                "message", "Test message from connection " + i
                        )
                );
                
                session.send(Mono.just(session.textMessage(testMessage)));
                
                return session.close();
            });
        }

        // Then
        assertTrue(latch.await(10, TimeUnit.SECONDS));
        assertEquals(connectionCount, messages.get().size());
    }

    @Test
    @DisplayName("Should handle invalid messages gracefully")
    void shouldHandleInvalidMessagesGracefully() throws Exception {
        // Given
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> receivedMessage = new AtomicReference<>();

        // When
        webSocketClient.execute(webSocketUri, session -> {
            session.receive()
                    .map(WebSocketMessage::getPayloadAsText)
                    .subscribe(msg -> {
                        receivedMessage.set(msg);
                        latch.countDown();
                    });
            
            // Send invalid JSON
            session.send(Mono.just(session.textMessage("invalid json")));
            
            // Wait a bit for error handling
            Thread.sleep(1000);
            
            return session.close();
        });

        // Then
        // Should not crash, connection should close gracefully
        assertTrue(latch.await(5, TimeUnit.SECONDS));
    }

    @Test
    @DisplayName("Should handle connection timeout")
    void shouldHandleConnectionTimeout() throws Exception {
        // Given
        WebSocketClient timeoutClient = new ReactorNettyWebSocketClient();
        timeoutClient.setHandshakeTimeout(Duration.ofSeconds(2));

        // When
        assertThrows(Exception.class, () -> {
            timeoutClient.execute(
                    URI.create("ws://localhost:" + port + "/ws"),
                    session -> {
                        // Simulate slow connection
                        Thread.sleep(3000);
                        return session.close();
                    }
            ).block(Duration.ofSeconds(5));
        });
    }

    @Test
    @DisplayName("Should handle authentication")
    void shouldHandleAuthentication() throws Exception {
        // Given
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> receivedMessage = new AtomicReference<>();

        // When
        webSocketClient.execute(webSocketUri, session -> {
            session.receive()
                    .map(WebSocketMessage::getPayloadAsText)
                    .subscribe(msg -> {
                        receivedMessage.set(msg);
                        latch.countDown();
                    });
            
            // Send authenticated message
            String authMessage = objectMapper.writeValueAsString(
                    Map.of(
                            "type", "auth",
                            "token", "test-token"
                    )
            );
            
            session.send(Mono.just(session.textMessage(authMessage)));
            
            return session.close();
        });

        // Then
        assertTrue(latch.await(5, TimeUnit.SECONDS));
        String message = receivedMessage.get();
        assertNotNull(message);
    }

    @Test
    @DisplayName("Should handle room management")
    void shouldHandleRoomManagement() throws Exception {
        // Given
        CountDownLatch latch = new CountDownLatch(2);
        AtomicReference<List<String>> messages = new AtomicReference<>(List.of());

        // When
        webSocketClient.execute(webSocketUri, session -> {
            session.receive()
                    .map(WebSocketMessage::getPayloadAsText)
                    .subscribe(msg -> {
                        messages.getAndUpdate(list -> {
                            List<String> newList = new ArrayList<>(list);
                            newList.add(msg);
                            return newList;
                        });
                        latch.countDown();
                    });
            
            // Join room
            String joinMessage = objectMapper.writeValueAsString(
                    Map.of(
                            "type", "joinRoom",
                            "roomId", "test-room"
                    )
            );
            
            session.send(Mono.just(session.textMessage(joinMessage)));
            
            // Leave room
            String leaveMessage = objectMapper.writeValueAsString(
                    Map.of(
                            "type", "leaveRoom",
                            "roomId", "test-room"
                    )
            );
            
            session.send(Mono.just(session.textMessage(leaveMessage)));
            
            return session.close();
        });

        // Then
        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertEquals(2, messages.get().size());
    }

    @Test
    @DisplayName("Should handle large messages")
    void shouldHandleLargeMessages() throws Exception {
        // Given
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> receivedMessage = new AtomicReference<>();

        // Create large message
        StringBuilder largeMessage = new StringBuilder();
        for (int i = 0; i < 1000; i++) {
            largeMessage.append("This is a test message. ");
        }

        // When
        webSocketClient.execute(webSocketUri, session -> {
            session.receive()
                    .map(WebSocketMessage::getPayloadAsText)
                    .subscribe(msg -> {
                        receivedMessage.set(msg);
                        latch.countDown();
                    });
            
            // Send large message
            String largeMsg = objectMapper.writeValueAsString(
                    Map.of(
                            "type", "large",
                            "content", largeMessage.toString()
                    )
            );
            
            session.send(Mono.just(session.textMessage(largeMsg)));
            
            return session.close();
        });

        // Then
        assertTrue(latch.await(10, TimeUnit.SECONDS));
        String message = receivedMessage.get();
        assertNotNull(message);
        assertTrue(message.contains("large"));
    }

    @Test
    @DisplayName("Should handle connection close gracefully")
    void shouldHandleConnectionCloseGracefully() throws Exception {
        // Given
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> receivedMessage = new AtomicReference<>();

        // When
        webSocketClient.execute(webSocketUri, session -> {
            session.receive()
                    .map(WebSocketMessage::getPayloadAsText)
                    .subscribe(msg -> {
                        receivedMessage.set(msg);
                        latch.countDown();
                    });
            
            // Send close message
            String closeMessage = objectMapper.writeValueAsString(
                    Map.of(
                            "type", "close"
                    )
            );
            
            session.send(Mono.just(session.textMessage(closeMessage)));
            
            return session.close();
        });

        // Then
        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertNotNull(receivedMessage.get());
    }
}
