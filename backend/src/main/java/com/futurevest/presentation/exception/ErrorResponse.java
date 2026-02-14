package com.futurevest.presentation.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {

    private Instant timestamp;
    private String path;
    private int status;
    private String error;
    private String message;
    private String code;
    private List<FieldErrorDetail> details;

    @Data
    @Builder
    public static class FieldErrorDetail {
        private String field;
        private String message;
    }
}
