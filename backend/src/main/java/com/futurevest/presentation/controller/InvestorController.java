package com.futurevest.presentation.controller;

import com.futurevest.application.service.InvestorService;
import com.futurevest.presentation.dto.AuthResponseDto;
import com.futurevest.presentation.dto.InvestorDto;
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
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/investors")
@RequiredArgsConstructor
@Tag(name = "Investor Management", description = "Investor registration, profile, and investment management")
public class InvestorController {

    private final InvestorService investorService;

    @PostMapping("/register")
    @Operation(summary = "Register a new investor", description = "Register a new investor with optional PAN card upload")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Investor registered successfully",
                content = @Content(schema = @Schema(implementation = AuthResponseDto.class))),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "409", description = "Email already exists")
    })
    public ResponseEntity<AuthResponseDto> registerInvestor(
            @RequestPart("investor") @Valid InvestorDto investorDto,
            @RequestPart(value = "panCard", required = false) MultipartFile panCard) {
        
        AuthResponseDto response = investorService.registerInvestor(investorDto, panCard);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    @Operation(summary = "Investor login", description = "Authenticate investor and return JWT token")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Login successful",
                content = @Content(schema = @Schema(implementation = AuthResponseDto.class))),
        @ApiResponse(responseCode = "401", description = "Invalid credentials"),
        @ApiResponse(responseCode = "400", description = "Invalid input")
    })
    public ResponseEntity<AuthResponseDto> loginInvestor(@Valid @RequestBody LoginDto loginDto) {
        AuthResponseDto response = investorService.authenticateInvestor(loginDto);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profile/{id}")
    @Operation(summary = "Get investor profile", description = "Get investor profile by ID (secured endpoint)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Profile retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Investor not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('INVESTOR') or #id == authentication.principal.id")
    public ResponseEntity<EntityModel<InvestorDto>> getInvestorProfile(
            @Parameter(description = "Investor ID") @PathVariable UUID id) {
        
        InvestorDto investorDto = investorService.getInvestorById(id);
        return ResponseEntity.ok(EntityModel.of(investorDto));
    }

    @GetMapping("/profile")
    @Operation(summary = "Get current investor profile", description = "Get current authenticated investor's profile")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Profile retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Investor not found")
    })
    @PreAuthorize("hasRole('INVESTOR')")
    public ResponseEntity<EntityModel<InvestorDto>> getCurrentInvestorProfile(
            @AuthenticationPrincipal SecurityUser principal) {
        
        InvestorDto investorDto = investorService.getInvestorById(principal.getId());
        return ResponseEntity.ok(EntityModel.of(investorDto));
    }

    @PutMapping("/profile/{id}")
    @Operation(summary = "Update investor profile", description = "Update investor profile information")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Profile updated successfully"),
        @ApiResponse(responseCode = "404", description = "Investor not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('INVESTOR') or #id == authentication.principal.id")
    public ResponseEntity<EntityModel<InvestorDto>> updateInvestorProfile(
            @Parameter(description = "Investor ID") @PathVariable UUID id,
            @Valid @RequestBody InvestorDto investorDto) {
        
        InvestorDto updatedInvestor = investorService.updateInvestor(id, investorDto);
        return ResponseEntity.ok(EntityModel.of(updatedInvestor));
    }

    @GetMapping("/invested-users/{investorId}")
    @Operation(summary = "Get invested users", description = "Get list of users invested by a specific investor")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Invested users retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Investor not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('INVESTOR') or #investorId == authentication.principal.id")
    public ResponseEntity<List<UserDto>> getInvestedUsers(
            @Parameter(description = "Investor ID") @PathVariable UUID investorId) {
        
        List<UserDto> investedUsers = investorService.getInvestedUsers(investorId);
        return ResponseEntity.ok(investedUsers);
    }

    @GetMapping
    @Operation(summary = "Get all investors", description = "Get paginated list of all investors")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Investors retrieved successfully"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('ADMIN') or hasRole('INVESTOR')")
    public ResponseEntity<PagedModel<EntityModel<InvestorDto>>> getAllInvestors(
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable,
            PagedResourcesAssembler<InvestorDto> assembler) {
        
        Page<InvestorDto> investors = investorService.getAllInvestors(pageable);
        return ResponseEntity.ok(assembler.toModel(investors));
    }

    @GetMapping("/verified")
    @Operation(summary = "Get verified investors", description = "Get paginated list of verified investors")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Verified investors retrieved successfully")
    })
    public ResponseEntity<PagedModel<EntityModel<InvestorDto>>> getVerifiedInvestors(
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable,
            PagedResourcesAssembler<InvestorDto> assembler) {
        
        Page<InvestorDto> investors = investorService.getVerifiedInvestors(pageable);
        return ResponseEntity.ok(assembler.toModel(investors));
    }

    @PostMapping("/{investorId}/verify")
    @Operation(summary = "Verify investor", description = "Verify investor status (admin only)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Investor verified successfully"),
        @ApiResponse(responseCode = "404", description = "Investor not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EntityModel<InvestorDto>> verifyInvestor(
            @Parameter(description = "Investor ID") @PathVariable UUID investorId) {
        
        InvestorDto verifiedInvestor = investorService.verifyInvestor(investorId);
        return ResponseEntity.ok(EntityModel.of(verifiedInvestor));
    }

    @PostMapping("/{investorId}/reject")
    @Operation(summary = "Reject investor", description = "Reject investor verification (admin only)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Investor rejected successfully"),
        @ApiResponse(responseCode = "404", description = "Investor not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EntityModel<InvestorDto>> rejectInvestor(
            @Parameter(description = "Investor ID") @PathVariable UUID investorId) {
        
        InvestorDto rejectedInvestor = investorService.rejectInvestor(investorId);
        return ResponseEntity.ok(EntityModel.of(rejectedInvestor));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete investor", description = "Delete investor by ID (admin only)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Investor deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Investor not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteInvestor(@Parameter(description = "Investor ID") @PathVariable UUID id) {
        investorService.deleteInvestor(id);
        return ResponseEntity.noContent().build();
    }
}
