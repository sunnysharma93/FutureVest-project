package com.futurevest.presentation.controller;

import com.futurevest.infrastructure.persistence.entity.UserEntity;
import com.futurevest.infrastructure.persistence.repository.UserJpaRepository;
import com.futurevest.presentation.dto.AuthResponse;
import com.futurevest.presentation.dto.LoginRequest;
import com.futurevest.presentation.dto.RegisterRequest;
import com.futurevest.presentation.exception.BusinessException;
import com.futurevest.presentation.security.AuthAuditService;
import com.futurevest.presentation.security.JwtUtil;
import com.futurevest.presentation.security.SecurityUser;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserJpaRepository userRepository;
    private final AuthAuditService auditService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    @RateLimiter(name = "auth")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        try {
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
            SecurityUser user = (SecurityUser) auth.getPrincipal();
            String token = jwtUtil.generateToken(user.getId(), user.getEmail());
            auditService.logLoginSuccess(user.getEmail(), user.getId());
            return ResponseEntity.ok(AuthResponse.builder()
                    .accessToken(token)
                    .tokenType("Bearer")
                    .userId(user.getId())
                    .email(user.getEmail())
                    .build());
        } catch (BadCredentialsException e) {
            auditService.logLoginFailure(request.getEmail(), "Invalid credentials");
            throw new BusinessException("Invalid email or password", "AUTH_FAILED");
        }
    }

    @PostMapping("/register")
    @RateLimiter(name = "auth")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            auditService.logRegisterFailure(request.getEmail(), "Email already registered");
            throw new BusinessException("Email already registered", "EMAIL_EXISTS");
        }
        UserEntity user = UserEntity.builder()
                .name(request.getName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .enabled(true)
                .build();
        user = userRepository.save(user);
        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        auditService.logRegisterSuccess(user.getEmail(), user.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .email(user.getEmail())
                .build());
    }
}
