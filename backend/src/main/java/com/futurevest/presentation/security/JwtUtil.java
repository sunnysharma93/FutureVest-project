package com.futurevest.presentation.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

/**
 * Production JWT utility: token generation, validation, and subject extraction.
 * Secret and expiration come from config (app.jwt).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtUtil {

    private final JwtProperties jwtProperties;

    public String generateToken(UUID userId, String email) {
        SecretKey key = getSigningKey();
        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtProperties.getExpirationMs());
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .issuer(jwtProperties.getIssuer())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    /**
     * Validates the token and returns claims if valid. Returns null if invalid or expired.
     */
    public Claims validateToken(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(getSigningKey())
                    .requireIssuer(jwtProperties.getIssuer())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            log.debug("JWT expired: {}", e.getMessage());
            return null;
        } catch (JwtException e) {
            log.debug("Invalid JWT: {}", e.getMessage());
            return null;
        }
    }

    public boolean isValidToken(String token) {
        return validateToken(token) != null;
    }

    public UUID getUserIdFromToken(String token) {
        Claims claims = validateToken(token);
        if (claims == null) return null;
        try {
            return UUID.fromString(claims.getSubject());
        } catch (IllegalArgumentException e) {
            log.debug("Invalid JWT subject: {}", e.getMessage());
            return null;
        }
    }

    /** Returns email claim from token, or null if invalid. */
    public String getEmailFromToken(String token) {
        Claims claims = validateToken(token);
        return claims != null ? claims.get("email", String.class) : null;
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException("JWT secret must be at least 256 bits (32 chars). Set JWT_SECRET in production.");
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
