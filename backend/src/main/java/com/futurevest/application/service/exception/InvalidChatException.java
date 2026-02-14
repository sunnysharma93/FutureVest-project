package com.futurevest.application.service.exception;

public class InvalidChatException extends RuntimeException {
    public InvalidChatException(String message) {
        super(message);
    }
    
    public InvalidChatException(String message, Throwable cause) {
        super(message, cause);
    }
}
