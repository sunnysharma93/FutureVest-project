package com.futurevest.integration;

import com.futurevest.application.port.out.UserRepository;
import com.futurevest.domain.entity.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureWebMvc
@ActiveProfiles("test")
@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("User Controller Integration Tests")
class UserControllerIntegrationTest {

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

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    private MockMvc mockMvc;
    private TestRestTemplate restTemplate;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
        restTemplate = new TestRestTemplate(webApplicationContext.getEnvironment());
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("Should register user successfully")
    void shouldRegisterUserSuccessfully() throws Exception {
        // Given
        Map<String, Object> userData = Map.of(
                "name", "John Doe",
                "email", "john.doe@example.com",
                "password", "password123"
        );

        // When
        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/v1/users/register",
                userData,
                String.class
        );

        // Then
        assertEquals(201, response.getStatusCodeValue());
        
        // Verify user was created in database
        Optional<User> createdUser = userRepository.findByEmail("john.doe@example.com");
        assertTrue(createdUser.isPresent());
        assertEquals("John Doe", createdUser.get().getName());
        assertTrue(passwordEncoder.matches("password123", createdUser.get().getPasswordHash()));
    }

    @Test
    @DisplayName("Should reject duplicate email registration")
    void shouldRejectDuplicateEmailRegistration() throws Exception {
        // Given
        User existingUser = User.builder()
                .id(UUID.randomUUID())
                .name("Existing User")
                .email("existing@example.com")
                .passwordHash(passwordEncoder.encode("password"))
                .role("USER")
                .enabled(true)
                .build();
        userRepository.save(existingUser);

        Map<String, Object> userData = Map.of(
                "name", "New User",
                "email", "existing@example.com",
                "password", "password123"
        );

        // When
        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/v1/users/register",
                userData,
                String.class
        );

        // Then
        assertEquals(409, response.getStatusCodeValue());
    }

    @Test
    @DisplayName("Should login user successfully")
    void shouldLoginUserSuccessfully() throws Exception {
        // Given
        User user = User.builder()
                .id(UUID.randomUUID())
                .name("Test User")
                .email("test@example.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .role("USER")
                .enabled(true)
                .build();
        userRepository.save(user);

        Map<String, Object> loginData = Map.of(
                "email", "test@example.com",
                "password", "password123"
        );

        // When
        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/v1/users/login",
                loginData,
                String.class
        );

        // Then
        assertEquals(200, response.getStatusCodeValue());
        assertTrue(response.getHeaders().containsKey("Authorization"));
    }

    @Test
    @DisplayName("Should reject invalid credentials")
    void shouldRejectInvalidCredentials() throws Exception {
        // Given
        User user = User.builder()
                .id(UUID.randomUUID())
                .name("Test User")
                .email("test@example.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .role("USER")
                .enabled(true)
                .build();
        userRepository.save(user);

        Map<String, Object> loginData = Map.of(
                "email", "test@example.com",
                "password", "wrongpassword"
        );

        // When
        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/v1/users/login",
                loginData,
                String.class
        );

        // Then
        assertEquals(401, response.getStatusCodeValue());
    }

    @Test
    @DisplayName("Should get user profile with authentication")
    void shouldGetUserProfileWithAuthentication() throws Exception {
        // Given
        User user = User.builder()
                .id(UUID.randomUUID())
                .name("Test User")
                .email("test@example.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .role("USER")
                .enabled(true)
                .build();
        userRepository.save(user);

        // Login to get token
        Map<String, Object> loginData = Map.of(
                "email", "test@example.com",
                "password", "password123"
        );

        ResponseEntity<String> loginResponse = restTemplate.postForEntity(
                "/api/v1/users/login",
                loginData,
                String.class
        );

        String token = loginResponse.getHeaders().getFirst("Authorization");

        // When
        ResponseEntity<String> profileResponse = restTemplate.exchange(
                "/api/v1/users/profile",
                org.springframework.http.HttpMethod.GET,
                new org.springframework.http.HttpEntity<>(null, 
                        org.springframework.http.HttpHeaders.builder()
                                .setBearerAuth(token.substring(7))
                                .build()),
                String.class
        );

        // Then
        assertEquals(200, profileResponse.getStatusCodeValue());
    }

    @Test
    @DisplayName("Should reject profile access without authentication")
    void shouldRejectProfileAccessWithoutAuthentication() throws Exception {
        // When
        ResponseEntity<String> response = restTemplate.getForEntity(
                "/api/v1/users/profile",
                String.class
        );

        // Then
        assertEquals(401, response.getStatusCodeValue());
    }

    @Test
    @DisplayName("Should update user profile")
    void shouldUpdateUserProfile() throws Exception {
        // Given
        User user = User.builder()
                .id(UUID.randomUUID())
                .name("Test User")
                .email("test@example.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .role("USER")
                .enabled(true)
                .build();
        userRepository.save(user);

        // Login to get token
        Map<String, Object> loginData = Map.of(
                "email", "test@example.com",
                "password", "password123"
        );

        ResponseEntity<String> loginResponse = restTemplate.postForEntity(
                "/api/v1/users/login",
                loginData,
                String.class
        );

        String token = loginResponse.getHeaders().getFirst("Authorization");

        Map<String, Object> updateData = Map.of(
                "name", "Updated Name"
        );

        // When
        ResponseEntity<String> updateResponse = restTemplate.exchange(
                "/api/v1/users/profile",
                org.springframework.http.HttpMethod.PUT,
                new org.springframework.http.HttpEntity<>(updateData,
                        org.springframework.http.HttpHeaders.builder()
                                .setBearerAuth(token.substring(7))
                                .build()),
                String.class
        );

        // Then
        assertEquals(200, updateResponse.getStatusCodeValue());
        
        // Verify update in database
        Optional<User> updatedUser = userRepository.findByEmail("test@example.com");
        assertTrue(updatedUser.isPresent());
        assertEquals("Updated Name", updatedUser.get().getName());
    }

    @Test
    @DisplayName("Should handle file upload")
    void shouldHandleFileUpload() throws Exception {
        // Given
        User user = User.builder()
                .id(UUID.randomUUID())
                .name("Test User")
                .email("test@example.com")
                .passwordHash(passwordEncoder.encode("password123"))
                .role("USER")
                .enabled(true)
                .build();
        userRepository.save(user);

        // Login to get token
        Map<String, Object> loginData = Map.of(
                "email", "test@example.com",
                "password", "password123"
        );

        ResponseEntity<String> loginResponse = restTemplate.postForEntity(
                "/api/v1/users/login",
                loginData,
                String.class
        );

        String token = loginResponse.getHeaders().getFirst("Authorization");

        // Create mock file
        byte[] fileContent = "test file content".getBytes();
        org.springframework.mock.web.MockMultipartFile file = 
                new org.springframework.mock.web.MockMultipartFile(
                        "file",
                        "test.txt",
                        MediaType.TEXT_PLAIN_VALUE,
                        fileContent
                );

        // When
        mockMvc.perform(multipart("/api/v1/users/resume")
                .file(file)
                .header("Authorization", token))
                .andExpect(status().isOk());

        // Then
        Optional<User> updatedUser = userRepository.findByEmail("test@example.com");
        assertTrue(updatedUser.isPresent());
        assertNotNull(updatedUser.get().getResumeUrl());
    }

    @Test
    @DisplayName("Should handle concurrent requests")
    void shouldHandleConcurrentRequests() throws Exception {
        // Given
        Map<String, Object> userData = Map.of(
                "name", "Concurrent User",
                "email", "concurrent@example.com",
                "password", "password123"
        );

        // When
        CompletableFuture<ResponseEntity<String>> future1 = CompletableFuture.supplyAsync(() -> {
            return restTemplate.postForEntity(
                    "/api/v1/users/register",
                    userData,
                    String.class
            );
        });

        CompletableFuture<ResponseEntity<String>> future2 = CompletableFuture.supplyAsync(() -> {
            return restTemplate.postForEntity(
                    "/api/v1/users/register",
                    userData,
                    String.class
            );
        });

        // Then
        CompletableFuture.allOf(future1, future1).join();
        
        // One should succeed, one should fail
        ResponseEntity<String> response1 = future1.get();
        ResponseEntity<String> response2 = future2.get();
        
        assertTrue(
                (response1.getStatusCodeValue() == 201 && response2.getStatusCodeValue() == 409) ||
                (response1.getStatusCodeValue() == 409 && response2.getStatusCodeValue() == 201)
        );
    }

    @Test
    @DisplayName("Should validate input data")
    void shouldValidateInputData() throws Exception {
        // Given
        Map<String, Object> invalidData = Map.of(
                "name", "", // Empty name
                "email", "invalid-email", // Invalid email
                "password", "123" // Too short password
        );

        // When
        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/v1/users/register",
                invalidData,
                String.class
        );

        // Then
        assertEquals(400, response.getStatusCodeValue());
    }

    @Test
    @DisplayName("Should handle database connection issues")
    void shouldHandleDatabaseConnectionIssues() throws Exception {
        // Given
        // Stop the PostgreSQL container to simulate connection issue
        postgres.stop();

        // When
        ResponseEntity<String> response = restTemplate.postForEntity(
                "/api/v1/users/register",
                Map.of("name", "Test", "email", "test@example.com", "password", "password123"),
                String.class
        );

        // Then
        assertEquals(500, response.getStatusCodeValue());
    }
}
