package com.futurevest.presentation.controller;

import com.futurevest.application.service.PaymentService;
import com.futurevest.presentation.dto.PaymentDto;
import com.futurevest.presentation.dto.PaymentOrderDto;
import com.futurevest.presentation.dto.PaymentVerificationDto;
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

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payment Management", description = "Payment processing with Razorpay integration")
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/create-order")
    @Operation(summary = "Create Razorpay order", description = "Create a new Razorpay payment order for course funding")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Order created successfully",
                content = @Content(schema = @Schema(implementation = Map.class))),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "403", description = "Access denied"),
        @ApiResponse(responseCode = "404", description = "User, investor, or course not found")
    })
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Map<String, Object>> createPaymentOrder(
            @Valid @RequestBody PaymentOrderDto paymentOrderDto,
            @AuthenticationPrincipal SecurityUser principal) {
        
        Map<String, Object> order = paymentService.createRazorpayOrder(paymentOrderDto, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(order);
    }

    @PostMapping("/verify-payment")
    @Operation(summary = "Verify Razorpay payment", description = "Verify Razorpay payment signature and update payment status")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Payment verified successfully",
                content = @Content(schema = @Schema(implementation = PaymentDto.class))),
        @ApiResponse(responseCode = "400", description = "Invalid payment details or signature verification failed"),
        @ApiResponse(responseCode = "404", description = "Payment order not found")
    })
    public ResponseEntity<EntityModel<PaymentDto>> verifyPayment(
            @Valid @RequestBody PaymentVerificationDto verificationDto) {
        
        PaymentDto paymentDto = paymentService.verifyPayment(verificationDto);
        return ResponseEntity.ok(EntityModel.of(paymentDto));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get payment by ID", description = "Get payment details by ID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Payment retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Payment not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('USER') or hasRole('INVESTOR') or hasRole('ADMIN')")
    public ResponseEntity<EntityModel<PaymentDto>> getPaymentById(
            @Parameter(description = "Payment ID") @PathVariable UUID id,
            @AuthenticationPrincipal SecurityUser principal) {
        
        PaymentDto paymentDto = paymentService.getPaymentById(id, principal.getId(), principal.getAuthorities());
        return ResponseEntity.ok(EntityModel.of(paymentDto));
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get user payments", description = "Get all payments for a specific user")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "User payments retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "User not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN') or #userId == authentication.principal.id")
    public ResponseEntity<List<PaymentDto>> getUserPayments(
            @Parameter(description = "User ID") @PathVariable UUID userId) {
        
        List<PaymentDto> payments = paymentService.getUserPayments(userId);
        return ResponseEntity.ok(payments);
    }

    @GetMapping("/investor/{investorId}")
    @Operation(summary = "Get investor payments", description = "Get all payments for a specific investor")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Investor payments retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Investor not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('INVESTOR') or hasRole('ADMIN') or #investorId == authentication.principal.id")
    public ResponseEntity<List<PaymentDto>> getInvestorPayments(
            @Parameter(description = "Investor ID") @PathVariable UUID investorId) {
        
        List<PaymentDto> payments = paymentService.getInvestorPayments(investorId);
        return ResponseEntity.ok(payments);
    }

    @GetMapping("/course/{courseId}")
    @Operation(summary = "Get course payments", description = "Get all payments for a specific course")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Course payments retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Course not found")
    })
    public ResponseEntity<List<PaymentDto>> getCoursePayments(
            @Parameter(description = "Course ID") @PathVariable UUID courseId) {
        
        List<PaymentDto> payments = paymentService.getCoursePayments(courseId);
        return ResponseEntity.ok(payments);
    }

    @GetMapping
    @Operation(summary = "Get all payments", description = "Get paginated list of all payments (admin only)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Payments retrieved successfully"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PagedModel<EntityModel<PaymentDto>>> getAllPayments(
            @Parameter(description = "Filter by status") @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable,
            PagedResourcesAssembler<PaymentDto> assembler) {
        
        Page<PaymentDto> payments = paymentService.getAllPayments(status, pageable);
        return ResponseEntity.ok(assembler.toModel(payments));
    }

    @PostMapping("/{id}/refund")
    @Operation(summary = "Refund payment", description = "Process a refund for a payment (admin only)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Refund processed successfully"),
        @ApiResponse(responseCode = "404", description = "Payment not found"),
        @ApiResponse(responseCode = "400", description = "Payment cannot be refunded"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EntityModel<PaymentDto>> refundPayment(
            @Parameter(description = "Payment ID") @PathVariable UUID id,
            @Parameter(description = "Refund reason") @RequestParam String reason) {
        
        PaymentDto refundedPayment = paymentService.refundPayment(id, reason);
        return ResponseEntity.ok(EntityModel.of(refundedPayment));
    }

    @GetMapping("/stats/summary")
    @Operation(summary = "Get payment statistics", description = "Get payment summary statistics (admin only)")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Statistics retrieved successfully"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getPaymentStatistics() {
        Map<String, Object> stats = paymentService.getPaymentStatistics();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/stats/investor/{investorId}")
    @Operation(summary = "Get investor payment statistics", description = "Get payment statistics for a specific investor")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Statistics retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Investor not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PreAuthorize("hasRole('INVESTOR') or hasRole('ADMIN') or #investorId == authentication.principal.id")
    public ResponseEntity<Map<String, Object>> getInvestorPaymentStatistics(
            @Parameter(description = "Investor ID") @PathVariable UUID investorId) {
        
        Map<String, Object> stats = paymentService.getInvestorPaymentStatistics(investorId);
        return ResponseEntity.ok(stats);
    }
}
