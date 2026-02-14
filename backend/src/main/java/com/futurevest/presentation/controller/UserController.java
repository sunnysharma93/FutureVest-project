package com.futurevest.presentation.controller;

import com.futurevest.application.port.in.GetUserUseCase;
import com.futurevest.domain.entity.User;
import com.futurevest.presentation.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/v1/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('USER') or hasRole('INVESTOR')")
public class UserController {

    private final GetUserUseCase getUserUseCase;

    @GetMapping("/me")
    public ResponseEntity<UserProfileDto> getCurrentUser(@AuthenticationPrincipal SecurityUser principal) {
        return getUserUseCase.getById(principal.getId())
                .map(UserController::toDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    private static UserProfileDto toDto(User user) {
        UserProfileDto dto = new UserProfileDto();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole());
        return dto;
    }

    @lombok.Data
    public static class UserProfileDto {
        private UUID id;
        private String name;
        private String email;
        private String role;
    }
}
