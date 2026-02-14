package com.futurevest.presentation.controller;

import com.futurevest.application.service.UserService;
import com.futurevest.presentation.dto.AuthResponseDto;
import com.futurevest.presentation.dto.LoginDto;
import com.futurevest.presentation.dto.UserDto;
import com.futurevest.presentation.security.SecurityUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedResourcesAssembler;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "User Management", description = "User registration, login, and profile management")
public class UserController {

    private final UserService userService;

    @PostMapping("/register")
    @Operation(summary = "Register a new user", description = "Register a new user with optional file uploads for resume and aadhaar")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "User registered successfully",
                content = @Content(schema = @Schema(implementation = AuthResponseDto.class))),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "409", description = "Email already exists")
    })
    public ResponseEntity<AuthResponseDto> registerUser(
            @RequestPart("user") @Valid UserDto userDto,
            @RequestPart(value = "resume", required = false) MultipartFile resume,
            @RequestPart(value = "aadhaar", required = false) MultipartFile aadhaar) {
        
        AuthResponseDto response = userService.registerUser(userDto, resume, aadhaar);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    @Operation(summary = "User login", description = "Authenticate user and return JWT token")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Login successful",
                content = @Content(schema = @Schema(implementation = AuthResponseDto.class))),
        @ApiResponse(responseCode = "401", description = "Invalid credentials"),
        @ApiResponse(responseCode = "400", description = "Invalid input")
    })
    public ResponseEntity<AuthResponseDto> loginUser(@Valid @RequestBody LoginDto loginDto) {
        AuthResponseDto response = userService.authenticateUser(loginDto);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profile/{id}")
    @Operation(summary = "Get user profile", description = "Get user profile by ID (secured endpoint)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Profile retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "User not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('USER') or hasRole('INVESTOR') or #id == authentication.principal.id")
    public ResponseEntity<EntityModel<UserDto>> getUserProfile(
            @Parameter(description = "User ID") @PathVariable UUID id) {
        
        UserDto userDto = userService.getUserById(id);
        return ResponseEntity.ok(EntityModel.of(userDto));
    }

    @GetMapping("/profile")
    @Operation(summary = "Get current user profile", description = "Get current authenticated user's profile")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Profile retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    @PreAuthorize("hasRole('USER') or hasRole('INVESTOR')")
    public ResponseEntity<EntityModel<UserDto>> getCurrentUserProfile(
            @AuthenticationPrincipal SecurityUser principal) {
        
        UserDto userDto = userService.getUserById(principal.getId());
        return ResponseEntity.ok(EntityModel.of(userDto));
    }

    @PutMapping("/profile/{id}")
    @Operation(summary = "Update user profile", description = "Update user profile information")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Profile updated successfully"),
        @ApiResponse(responseCode = "404", description = "User not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('USER') or hasRole('INVESTOR') or #id == authentication.principal.id")
    public ResponseEntity<EntityModel<UserDto>> updateUserProfile(
            @Parameter(description = "User ID") @PathVariable UUID id,
            @Valid @RequestBody UserDto userDto) {
        
        UserDto updatedUser = userService.updateUser(id, userDto);
        return ResponseEntity.ok(EntityModel.of(updatedUser));
    }

    @GetMapping
    @Operation(summary = "Get all users", description = "Get paginated list of all users (admin only)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Users retrieved successfully"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PagedModel<EntityModel<UserDto>>> getAllUsers(
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable,
            PagedResourcesAssembler<UserDto> assembler) {
        
        Page<UserDto> users = userService.getAllUsers(pageable);
        return ResponseEntity.ok(assembler.toModel(users));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete user", description = "Delete user by ID (admin only)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "User deleted successfully"),
        @ApiResponse(responseCode = "404", description = "User not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@Parameter(description = "User ID") @PathVariable UUID id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
