package com.futurevest.application.service;

import com.futurevest.application.service.exception.DuplicateEmailException;
import com.futurevest.domain.entity.User;
import com.futurevest.application.port.out.UserRepository;
import com.futurevest.infrastructure.s3.S3Service;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.DisplayName;
import org.mockito.Mock;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.boot.test.context.TestContext;
import org.springframework.mock.mockito.MockedStatic;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;

@ExtendWith(MockitoAnnotations.class)
@DisplayName("UserService Tests")
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    
    @Mock
    private PasswordEncoder passwordEncoder;
    
    @Mock
    private S3Service s3Service;

    @Inject
    private UserService userService;

    private User testUser;
    private MultipartFile testResume;
    private MultipartFile testAadhaar;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID())
                .name("Test User")
                .email("test@example.com")
                .passwordHash("hashedPassword")
                .role("USER")
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Now())
                .build();

        testResume = createMockMultipartFile("resume.pdf", "application/pdf", "test resume content");
        testAadhaar = createMockMultipartFile("aadhaar.pdf", "application/pdf", "test aadhaar content");
    }

    @Test
    @DisplayName("Should register new user successfully")
    void shouldRegisterNewUserSuccessfully() {
        // Given
        String name = "John Doe";
        String email = "john.doe@example.com";
        String password = "password123";

        // When
        User registeredUser = userService.register(name, email, password, testResume, testAadhaar);

        // Then
        assertNotNull(registeredUser.getId());
        assertEquals(name, registeredUser.getName());
        assertEquals(email, registeredUser.getEmail());
        assertTrue(passwordEncoder.matches(password, registeredUser.getPasswordHash()));
        assertEquals("USER", registeredUser.getRole());
        assertTrue(registeredUser.isEnabled());
        assertNotNull(registeredUser.getCreatedAt());
        assertNotNull(registeredUser.getUpdatedAt());
    }

    @Test
    @DisplayName("Should throw exception for duplicate email")
    void shouldThrowExceptionForDuplicateEmail() {
        // Given
        String name = "Jane Doe";
        String email = "jane.doe@example.com";
        String password = "password123";

        // When
        userRepository.save(testUser); // Simulate existing user

        // Then
        assertThrows(DuplicateEmailException.class, () -> {
            userService.register(name, email, password, testResume, testAadhaar);
        });
    }

    @Test
    @DisplayName("Should handle file upload failure gracefully")
    void shouldHandleFileUploadFailure() {
        // Given
        String name = "Test User";
        String email = "test@example.com";
        String password = "password123";

        // Mock S3 service to throw exception
        Mockito.when(s3Service.uploadFile(Mockito.any(), Mockito.any(), Mockito.any()))
            .thenThrow(new RuntimeException("S3 upload failed"));

        // When
        assertThrows(RuntimeException.class, () -> {
            userService.register(name, email, password, testResume, testAadhaar);
        });
    }

    @Test
    @DisplayName("Should handle file upload cleanup on failure")
    void shouldHandleFileUploadCleanupOnFailure() {
        // Given
        String name = "Test User";
        String email = "test@example.com";
        String password = "password123";

        // Mock S3 service to succeed for first upload and fail for second
        Mockito.when(s3Service.uploadFile(Mockito.any(), Mockito.any(), Mockito.any()))
            .thenReturn("resume-url");
        Mockito.when(s3Service.uploadFile(Mockito.any(), Mockito.any(), Mockito.any()))
            .thenThrow(new RuntimeException("S3 upload failed"));

        // When
        assertThrows(RuntimeException.class, () -> {
            userService.register(name, email, password, testResume, testAadhaar);
        });

        // Then
        // Verify cleanup was attempted (mock verification)
        Mockito.verify(s3Service.deleteFile(Mockito.any()));
    }

    @Test
    @DisplayName("Should update user profile with new files")
    void shouldUpdateProfileWithNewFiles() {
        // Given
        String name = "Test User";
        String email = "test@example.com";
        String password = "password123";

        User registeredUser = userService.register(name, email, password, testResume, testAadhaar);
        
        String newName = "Updated Name";
        MultipartFile newResume = createMockMultipartFile("new-resume.pdf", "application/pdf", "new resume content");
        MultipartFile newAadhaar = createMockMultipartFile("new-aadhaar.pdf", "application/pdf", "new aadhaar content");

        // When
        User updatedUser = userService.updateProfile(registeredUser.getId(), newName, newResume, newAadhaar);

        // Then
        assertEquals(newName, updatedUser.getName());
        assertNotNull(updatedUser.getResumeUrl());
        assertNotNull(updatedUser.getAadhaarUrl());
        assertTrue(updatedUser.getUpdatedAt().isAfter(registeredUser.getUpdatedAt()));
    }

    @Test
    @DisplayName("Should delete resume successfully")
    void shouldDeleteResumeSuccessfully() {
        // Given
        String name = "Test User";
        String email = "test@example.com";
        String password = "password123";

        User registeredUser = userService.register(name, email, password, testResume, testAadhaar);
        
        // When
        userService.deleteResume(registeredUser.getId());

        // Then
        assertNull(registeredUser.getResumeUrl());
        assertNull(registeredUser.getAadhaarUrl());
    }

    @Test
    @DisplayName("Should delete Aadhaar successfully")
    void shouldDeleteAadhaarSuccessfully() {
        // Given
        String name = "Test User";
        String email = "test@example.com";
        String password = "password123";

        User registeredUser = userService.register(name, email, password, testResume, testAadhaar);
        
        // When
        userService.deleteAadhaar(registeredUser.getId());

        // Then
        assertNotNull(registeredUser.getResumeUrl());
        assertNull(registeredUser.getAadhaarUrl());
    }

    @Test
    @DisplayName("Should get user profile")
    void shouldGetUserProfile() {
        // Given
        String name = "Test User";
        String email = "test@example.com";
        String password = "password123";

        User registeredUser = userService.register(name, email, password, testResume, testAadhaar);

        // When
        User profile = userService.getProfile(registeredUser.getId());

        // Then
        assertNotNull(profile);
        assertEquals(name, profile.getName());
        assertEquals(email, profile.getEmail());
        assertNotNull(profile.getCreatedAt());
        assertEquals(email, profile.getEmail());
    }

    @Test
    @DisplayName("Should throw exception for non-existent user")
    void shouldThrowExceptionForNonExistentUser() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When
        assertThrows(AuthenticationException.class, () -> {
            userService.getProfile(nonExistentId);
        });
    }

    @Test
    @DisplayName("Should validate file before upload")
    void shouldValidateFileBeforeUpload() {
        // Given
        String name = "Test User";
        String email = "test@example.com";
        String password = "password123";

        // When
        // Test with oversized file
        MultipartFile oversizedFile = createMockMultipartFile("large-file.pdf", "application/pdf", "Large file content");
        assertThrows(IllegalArgumentException.class, () -> {
            userService.register(name, email, password, oversizedFile, testAadhaar);
        });

        // Test with invalid file type
        MultipartFile invalidFile = createMockMultipartFile("invalid.exe", "application/octet-stream", "Invalid file");
        assertThrows(IllegalArgumentException.class, () -> {
            userService.register(name, email, password, invalidFile, testAadhaar);
        });
    }

    @Test
    @DisplayName("Should handle concurrent file uploads")
    void shouldHandleConcurrentFileUploads() throws Exception {
        // Given
        String name = "Test User";
        String email = "test@example.com";
        String password = "password123";

        User registeredUser = userService.register(name, email, password, testResume, testAadhaar);

        // When
        CompletableFuture<String> upload1 = userService.uploadFileAsync(testResume);
        CompletableFuture<String> upload2 = userService.uploadFileAsync(testAadhaar);

        // Then
        assertDoesNotThrow(() -> {
            CompletableFuture.all(upload1, upload2);
        });

        // Verify both uploads complete
        String resumeUrl = upload1.get();
        String aadhaarUrl = upload2.get();
        
        assertNotNull(resumeUrl);
        assertNotNull(aadhaarUrl);
    }

    private MultipartFile createMockMultipartFile(String filename, String contentType, String content) {
        try {
            return new MockMultipartFile(
                filename,
                filename,
                contentType,
                content.getBytes(),
                filename
            );
        } catch (IOException e) {
            throw new RuntimeException("Failed to create mock file", e);
        }
    }
}
