package com.futurevest.presentation.exception;

import lombok.Getter;

/**
 * Application business rule violation. Mapped to 4xx by global exception handler.
 */
@Getter
public class BusinessException extends RuntimeException {

    private final String code;

    public BusinessException(String message) {
        super(message);
        this.code = "BUSINESS_ERROR";
    }

    public BusinessException(String message, String code) {
        super(message);
        this.code = code != null ? code : "BUSINESS_ERROR";
    }

    public BusinessException(String message, Throwable cause) {
        super(message, cause);
        this.code = "BUSINESS_ERROR";
    }
}
