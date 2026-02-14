package com.futurevest.presentation.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Audit logging for authentication events. Logs to SLF4J for correlation and SIEM.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthAuditService {

    public void logLoginSuccess(String email, UUID userId) {
        log.info("AUTH_SUCCESS login email={} userId={}", email, userId);
    }

    public void logLoginFailure(String email, String reason) {
        log.warn("AUTH_FAILURE login email={} reason={}", email, reason);
    }

    public void logRegisterSuccess(String email, UUID userId) {
        log.info("AUTH_REGISTER email={} userId={}", email, userId);
    }

    public void logRegisterFailure(String email, String reason) {
        log.warn("AUTH_REGISTER_FAILURE email={} reason={}", email, reason);
    }
}
