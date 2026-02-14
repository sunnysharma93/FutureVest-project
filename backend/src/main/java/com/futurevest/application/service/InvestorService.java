package com.futurevest.application.service;

import com.futurevest.application.port.out.InvestorRepository;
import com.futurevest.application.port.out.UserRepository;
import com.futurevest.domain.entity.Investor;
import com.futurevest.domain.entity.User;
import com.futurevest.application.service.exception.DuplicateEmailException;
import com.futurevest.application.service.exception.AuthenticationException;
import com.futurevest.application.service.exception.FileUploadException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Async;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.core.sync.RequestBody;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class InvestorService {

    private final InvestorRepository investorRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final S3Client s3Client;
    private static final String BUCKET_NAME = "futurevest-documents";

    @Transactional
    public Investor register(String name, String email, String password, 
                           MultipartFile panCard) {
        log.info("Registering new investor with email: {}", email);
        
        if (investorRepository.findByEmail(email).isPresent()) {
            log.error("Investor registration failed - email already exists: {}", email);
            throw new DuplicateEmailException("Email already registered: " + email);
        }

        String passwordHash = passwordEncoder.encode(password);
        
        String panCardUrl = null;
        try {
            if (panCard != null && !panCard.isEmpty()) {
                panCardUrl = uploadFileAsync(panCard, "pancard/" + UUID.randomUUID()).get();
            }
        } catch (Exception e) {
            log.error("PAN card upload failed during investor registration for email: {}", email, e);
            throw new FileUploadException("Failed to upload PAN card", e);
        }

        Investor investor = Investor.builder()
                .id(UUID.randomUUID())
                .name(name)
                .email(email)
                .passwordHash(passwordHash)
                .totalInvestment(BigDecimal.ZERO)
                .verificationStatus("PENDING")
                .panCardUrl(panCardUrl)
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Investor savedInvestor = investorRepository.save(investor);
        log.info("Successfully registered investor with ID: {}", savedInvestor.getId());
        return savedInvestor;
    }

    public Investor login(String email, String password) {
        log.info("Investor login attempt for email: {}", email);
        
        Optional<Investor> investorOpt = investorRepository.findByEmail(email);
        if (investorOpt.isEmpty()) {
            log.error("Investor login failed - not found: {}", email);
            throw new AuthenticationException("Invalid credentials");
        }

        Investor investor = investorOpt.get();
        if (!investor.isEnabled()) {
            log.error("Investor login failed - account disabled: {}", email);
            throw new AuthenticationException("Account is disabled");
        }

        if (!passwordEncoder.matches(password, investor.getPasswordHash())) {
            log.error("Investor login failed - invalid password: {}", email);
            throw new AuthenticationException("Invalid credentials");
        }

        log.info("Investor login successful for ID: {}", investor.getId());
        return investor;
    }

    public Investor getProfile(UUID investorId) {
        log.info("Fetching investor profile for ID: {}", investorId);
        
        Optional<Investor> investorOpt = investorRepository.findById(investorId);
        if (investorOpt.isEmpty()) {
            log.error("Investor profile not found for ID: {}", investorId);
            throw new AuthenticationException("Investor not found");
        }

        return investorOpt.get();
    }

    public List<User> getInvestedUsers(UUID investorId) {
        log.info("Fetching invested users for investor ID: {}", investorId);
        
        if (!investorRepository.existsById(investorId)) {
            log.error("Investor not found for ID: {}", investorId);
            throw new AuthenticationException("Investor not found");
        }

        List<User> investedUsers = userRepository.findInvestedUsersByInvestorId(investorId);
        log.info("Found {} invested users for investor ID: {}", investedUsers.size(), investorId);
        
        return investedUsers;
    }

    @Async
    public CompletableFuture<String> uploadFileAsync(MultipartFile file, String key) {
        try {
            log.info("Uploading investor file with key: {}", key);
            
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(BUCKET_NAME)
                    .key(key)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(file.getBytes()));
            
            String fileUrl = String.format("https://%s.s3.amazonaws.com/%s", BUCKET_NAME, key);
            log.info("Investor file uploaded successfully: {}", fileUrl);
            
            return CompletableFuture.completedFuture(fileUrl);
        } catch (IOException e) {
            log.error("Failed to upload investor file: {}", key, e);
            throw new FileUploadException("Failed to upload file: " + key, e);
        }
    }

    @Transactional
    public Investor updateTotalInvestment(UUID investorId, BigDecimal additionalAmount) {
        log.info("Updating total investment for investor ID: {} by amount: {}", investorId, additionalAmount);
        
        Optional<Investor> investorOpt = investorRepository.findById(investorId);
        if (investorOpt.isEmpty()) {
            log.error("Investor not found for ID: {}", investorId);
            throw new AuthenticationException("Investor not found");
        }

        Investor investor = investorOpt.get();
        Investor updatedInvestor = investor.toBuilder()
                .totalInvestment(investor.getTotalInvestment().add(additionalAmount))
                .updatedAt(Instant.now())
                .build();

        Investor savedInvestor = investorRepository.save(updatedInvestor);
        log.info("Updated total investment for investor ID: {} to: {}", 
                investorId, savedInvestor.getTotalInvestment());
        
        return savedInvestor;
    }
}
