package com.futurevest.presentation.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {

    @NotBlank(message = "JWT secret must be set (use env JWT_SECRET in production)")
    private String secret = "default-change-me";

    @Positive
    private long expirationMs = 86400000L;

    private String issuer = "futurevest";
}
