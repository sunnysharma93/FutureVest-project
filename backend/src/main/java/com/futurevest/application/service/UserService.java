package com.futurevest.application.service;

import com.futurevest.application.port.in.GetUserUseCase;
import com.futurevest.application.port.out.UserRepository;
import com.futurevest.domain.entity.User;
import com.futurevest.application.service.exception.DuplicateEmailException;
import com.futurevest.application.service.exception.AuthenticationException;
import com.futurevest.application.service.exception.FileUploadException;
import com.futurevest.infrastructure.s3.S3Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Async;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class UserService implements GetUserUseCase {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final S3Service s3Service;

    @Value("${app.aws.s3.bucket}")
    private String bucketName;

    @Override
    public Optional<User> getById(UUID id) {
        return userRepository.findById(id);
    }

    @Override
    public Optional<User> getByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Transactional
    public User register(String name, String email, String password, 
                        MultipartFile resume, MultipartFile aadhaar) {
        log.info("Registering new user with email: {}", email);
        
        if (userRepository.findByEmail(email).isPresent()) {
            log.error("Registration failed - email already exists: {}", email);
            throw new DuplicateEmailException("Email already registered: " + email);
        }

        String passwordHash = passwordEncoder.encode(password);
        
        String resumeUrl = null;
        String aadhaarUrl = null;
        
        try {
            if (resume != null && !resume.isEmpty()) {
                String resumeKey = s3Service.generateFileKey("resume_" + resume.getOriginalFilename());
                resumeUrl = uploadFileAsync(resume, resumeKey).get();
                log.info("Resume uploaded successfully for user: {}", email);
            }
            if (aadhaar != null && !aadhaar.isEmpty()) {
                String aadhaarKey = s3Service.generateFileKey("aadhaar_" + aadhaar.getOriginalFilename());
                aadhaarUrl = uploadFileAsync(aadhaar, aadhaarKey).get();
                log.info("Aadhaar uploaded successfully for user: {}", email);
            }
        } catch (Exception e) {
            log.error("File upload failed during registration for email: {}", email, e);
            // Clean up uploaded files if registration fails
            if (resumeUrl != null) {
                try {
                    String resumeKey = extractKeyFromUrl(resumeUrl);
                    s3Service.deleteFile(resumeKey);
                } catch (Exception cleanupError) {
                    log.error("Failed to cleanup resume file: {}", cleanupError.getMessage());
                }
            }
            if (aadhaarUrl != null) {
                try {
                    String aadhaarKey = extractKeyFromUrl(aadhaarUrl);
                    s3Service.deleteFile(aadhaarKey);
                } catch (Exception cleanupError) {
                    log.error("Failed to cleanup aadhaar file: {}", cleanupError.getMessage());
                }
            }
            throw new FileUploadException("Failed to upload documents: " + e.getMessage(), e);
        }

        User user = User.builder()
                .id(UUID.randomUUID())
                .name(name)
                .email(email)
                .passwordHash(passwordHash)
                .role("USER")
                .resumeUrl(resumeUrl)
                .aadhaarUrl(aadhaarUrl)
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        User savedUser = userRepository.save(user);
        log.info("Successfully registered user with ID: {}", savedUser.getId());
        return savedUser;
    }

    public User login(String email, String password) {
        log.info("Login attempt for email: {}", email);
        
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            log.error("Login failed - user not found: {}", email);
            throw new AuthenticationException("Invalid credentials");
        }

        User user = userOpt.get();
        if (!user.isEnabled()) {
            log.error("Login failed - user disabled: {}", email);
            throw new AuthenticationException("Account is disabled");
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            log.error("Login failed - invalid password for email: {}", email);
            throw new AuthenticationException("Invalid credentials");
        }

        log.info("Login successful for user ID: {}", user.getId());
        return user;
    }

    public User getProfile(UUID userId) {
        log.info("Fetching profile for user ID: {}", userId);
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            log.error("Profile not found for user ID: {}", userId);
            throw new AuthenticationException("User not found");
        }

        return userOpt.get();
    }

    @Transactional
    public User updateProfile(UUID userId, String name, MultipartFile resume, MultipartFile aadhaar) {
        log.info("Updating profile for user ID: {}", userId);
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            log.error("Profile update failed - user not found: {}", userId);
            throw new AuthenticationException("User not found");
        }

        User user = userOpt.get();
        
        // Update name if provided
        if (name != null && !name.trim().isEmpty()) {
            user.setName(name.trim());
        }

        // Update resume if provided
        if (resume != null && !resume.isEmpty()) {
            try {
                // Delete old resume if exists
                if (user.getResumeUrl() != null) {
                    String oldResumeKey = extractKeyFromUrl(user.getResumeUrl());
                    s3Service.deleteFile(oldResumeKey);
                    log.info("Deleted old resume for user: {}", userId);
                }
                
                // Upload new resume
                String resumeKey = s3Service.generateFileKey("resume_" + resume.getOriginalFilename());
                String resumeUrl = uploadFileAsync(resume, resumeKey).get();
                user.setResumeUrl(resumeUrl);
                log.info("Updated resume for user: {}", userId);
            } catch (Exception e) {
                log.error("Failed to update resume for user: {}", userId, e);
                throw new FileUploadException("Failed to update resume: " + e.getMessage(), e);
            }
        }

        // Update Aadhaar if provided
        if (aadhaar != null && !aadhaar.isEmpty()) {
            try {
                // Delete old Aadhaar if exists
                if (user.getAadhaarUrl() != null) {
                    String oldAadhaarKey = extractKeyFromUrl(user.getAadhaarUrl());
                    s3Service.deleteFile(oldAadhaarKey);
                    log.info("Deleted old Aadhaar for user: {}", userId);
                }
                
                // Upload new Aadhaar
                String aadhaarKey = s3Service.generateFileKey("aadhaar_" + aadhaar.getOriginalFilename());
                String aadhaarUrl = uploadFileAsync(aadhaar, aadhaarKey).get();
                user.setAadhaarUrl(aadhaarUrl);
                log.info("Updated Aadhaar for user: {}", userId);
            } catch (Exception e) {
                log.error("Failed to update Aadhaar for user: {}", userId, e);
                throw new FileUploadException("Failed to update Aadhaar: " + e.getMessage(), e);
            }
        }

        user.setUpdatedAt(Instant.now());
        User updatedUser = userRepository.save(user);
        log.info("Successfully updated profile for user ID: {}", userId);
        return updatedUser;
    }

    @Transactional
    public User uploadResume(UUID userId, MultipartFile resume) {
        log.info("Uploading resume for user ID: {}", userId);
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            log.error("Resume upload failed - user not found: {}", userId);
            throw new AuthenticationException("User not found");
        }

        User user = userOpt.get();
        
        try {
            // Delete old resume if exists
            if (user.getResumeUrl() != null) {
                String oldResumeKey = extractKeyFromUrl(user.getResumeUrl());
                s3Service.deleteFile(oldResumeKey);
                log.info("Deleted old resume for user: {}", userId);
            }
            
            // Upload new resume
            String resumeKey = s3Service.generateFileKey("resume_" + resume.getOriginalFilename());
            String resumeUrl = uploadFileAsync(resume, resumeKey).get();
            user.setResumeUrl(resumeUrl);
            user.setUpdatedAt(Instant.now());
            
            User updatedUser = userRepository.save(user);
            log.info("Successfully uploaded resume for user ID: {}", userId);
            return updatedUser;
        } catch (Exception e) {
            log.error("Failed to upload resume for user: {}", userId, e);
            throw new FileUploadException("Failed to upload resume: " + e.getMessage(), e);
        }
    }

    @Transactional
    public User uploadAadhaar(UUID userId, MultipartFile aadhaar) {
        log.info("Uploading Aadhaar for user ID: {}", userId);
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            log.error("Aadhaar upload failed - user not found: {}", userId);
            throw new AuthenticationException("User not found");
        }

        User user = userOpt.get();
        
        try {
            // Delete old Aadhaar if exists
            if (user.getAadhaarUrl() != null) {
                String oldAadhaarKey = extractKeyFromUrl(user.getAadhaarUrl());
                s3Service.deleteFile(oldAadhaarKey);
                log.info("Deleted old Aadhaar for user: {}", userId);
            }
            
            // Upload new Aadhaar
            String aadhaarKey = s3Service.generateFileKey("aadhaar_" + aadhaar.getOriginalFilename());
            String aadhaarUrl = uploadFileAsync(aadhaar, aadhaarKey).get();
            user.setAadhaarUrl(aadhaarUrl);
            user.setUpdatedAt(Instant.now());
            
            User updatedUser = userRepository.save(user);
            log.info("Successfully uploaded Aadhaar for user ID: {}", userId);
            return updatedUser;
        } catch (Exception e) {
            log.error("Failed to upload Aadhaar for user: {}", userId, e);
            throw new FileUploadException("Failed to upload Aadhaar: " + e.getMessage(), e);
        }
    }

    @Transactional
    public void deleteResume(UUID userId) {
        log.info("Deleting resume for user ID: {}", userId);
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            log.error("Resume deletion failed - user not found: {}", userId);
            throw new AuthenticationException("User not found");
        }

        User user = userOpt.get();
        
        if (user.getResumeUrl() != null) {
            try {
                String resumeKey = extractKeyFromUrl(user.getResumeUrl());
                s3Service.deleteFile(resumeKey);
                user.setResumeUrl(null);
                user.setUpdatedAt(Instant.now());
                userRepository.save(user);
                log.info("Successfully deleted resume for user ID: {}", userId);
            } catch (Exception e) {
                log.error("Failed to delete resume for user: {}", userId, e);
                throw new FileUploadException("Failed to delete resume: " + e.getMessage(), e);
            }
        }
    }

    @Transactional
    public void deleteAadhaar(UUID userId) {
        log.info("Deleting Aadhaar for user ID: {}", userId);
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            log.error("Aadhaar deletion failed - user not found: {}", userId);
            throw new AuthenticationException("User not found");
        }

        User user = userOpt.get();
        
        if (user.getAadhaarUrl() != null) {
            try {
                String aadhaarKey = extractKeyFromUrl(user.getAadhaarUrl());
                s3Service.deleteFile(aadhaarKey);
                user.setAadhaarUrl(null);
                user.setUpdatedAt(Instant.now());
                userRepository.save(user);
                log.info("Successfully deleted Aadhaar for user ID: {}", userId);
            } catch (Exception e) {
                log.error("Failed to delete Aadhaar for user: {}", userId, e);
                throw new FileUploadException("Failed to delete Aadhaar: " + e.getMessage(), e);
            }
        }
    }

    public String getFileUrl(String fileKey) {
        try {
            return s3Service.getFileUrl(fileKey);
        } catch (Exception e) {
            log.error("Failed to generate file URL for key: {}", fileKey, e);
            throw new FileUploadException("Failed to generate file URL: " + e.getMessage(), e);
        }
    }

    @Async
    public CompletableFuture<String> uploadFileAsync(MultipartFile file, String key) {
        try {
            log.info("Uploading file with key: {}", key);
            
            // Validate file
            validateFile(file);
            
            // Upload to S3
            String fileKey = s3Service.uploadFile(key, file);
            
            // Generate URL
            String fileUrl = s3Service.getFileUrl(fileKey);
            
            log.info("File uploaded successfully: {}", fileUrl);
            return CompletableFuture.completedFuture(fileUrl);
        } catch (Exception e) {
            log.error("Failed to upload file: {}", key, e);
            return CompletableFuture.failedFuture(
                new FileUploadException("Failed to upload file: " + key, e)
            );
        }
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }
        
        // Check file size (5MB limit)
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("File size exceeds 5MB limit");
        }
        
        // Check content type
        String contentType = file.getContentType();
        if (contentType == null || !isAllowedContentType(contentType)) {
            throw new IllegalArgumentException("File type not allowed: " + contentType);
        }
        
        log.debug("File validation passed: name={}, size={}, type={}", 
            file.getOriginalFilename(), file.getSize(), contentType);
    }

    private boolean isAllowedContentType(String contentType) {
        return contentType.equals("image/jpeg") ||
               contentType.equals("image/png") ||
               contentType.equals("image/gif") ||
               contentType.equals("application/pdf") ||
               contentType.equals("application/msword") ||
               contentType.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
               contentType.equals("text/plain");
    }

    private String extractKeyFromUrl(String url) {
        // Extract key from S3 URL
        // Expected format: https://bucket.s3.amazonaws.com/key
        if (url != null && url.contains(bucketName)) {
            int startIndex = url.indexOf(bucketName) + bucketName.length() + 1;
            return url.substring(startIndex);
        }
        return url;
    }
}
