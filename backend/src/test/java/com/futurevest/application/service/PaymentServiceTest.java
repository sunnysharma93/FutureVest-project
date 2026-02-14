package com.futurevest.application.service;

import com.futurevest.application.port.out.PaymentRepository;
import com.futurevest.application.port.out.InvestmentRepository;
import com.futurevest.application.port.out.UserRepository;
import com.futurevest.domain.entity.Payment;
import com.futurevest.domain.entity.Investment;
import com.futurevest.domain.entity.User;
import com.futurevest.domain.exception.PaymentException;
import com.futurevest.infrastructure.external.RazorpayService;
import com.futurevest.infrastructure.external.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private InvestmentRepository investmentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RazorpayService razorpayService;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private PaymentService paymentService;

    private User testUser;
    private Investment testInvestment;
    private Payment testPayment;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
            .id(UUID.randomUUID())
            .name("John Doe")
            .email("john.doe@example.com")
            .enabled(true)
            .createdAt(LocalDateTime.now())
            .build();

        testInvestment = Investment.builder()
            .id(UUID.randomUUID())
            .user(testUser)
            .amount(new BigDecimal("50000"))
            .duration(24)
            .interestRate(new BigDecimal("10.5"))
            .monthlyPayment(new BigDecimal("2315.47"))
            .status("ACTIVE")
            .createdAt(LocalDateTime.now())
            .build();

        testPayment = Payment.builder()
            .id(UUID.randomUUID())
            .investment(testInvestment)
            .user(testUser)
            .amount(new BigDecimal("2315.47"))
            .paymentMethod("RAZORPAY")
            .status("COMPLETED")
            .transactionId("txn_123456789")
            .createdAt(LocalDateTime.now())
            .build();

        ReflectionTestUtils.setField(paymentService, "razorpayKeyId", "rzp_test_key_id");
        ReflectionTestUtils.setField(paymentService, "razorpaySecret", "rzp_test_secret");
    }

    @Test
    void createPaymentOrder_ShouldCreateOrderSuccessfully() {
        // Given
        BigDecimal amount = new BigDecimal("2315.47");
        String expectedOrderId = "order_123456789";
        
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(investmentRepository.findById(testInvestment.getId())).thenReturn(Optional.of(testInvestment));
        when(razorpayService.createOrder(amount, "INR")).thenReturn(expectedOrderId);

        // When
        String orderId = paymentService.createPaymentOrder(testUser.getId(), testInvestment.getId(), amount);

        // Then
        assertEquals(expectedOrderId, orderId);
        verify(userRepository).findById(testUser.getId());
        verify(investmentRepository).findById(testInvestment.getId());
        verify(razorpayService).createOrder(amount, "INR");
    }

    @Test
    void createPaymentOrder_ShouldThrowException_WhenUserNotFound() {
        // Given
        BigDecimal amount = new BigDecimal("2315.47");
        
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.empty());

        // When & Then
        assertThrows(PaymentException.class, () -> 
            paymentService.createPaymentOrder(testUser.getId(), testInvestment.getId(), amount));
        
        verify(userRepository).findById(testUser.getId());
        verify(investmentRepository, never()).findById(any());
        verify(razorpayService, never()).createOrder(any(), any());
    }

    @Test
    void createPaymentOrder_ShouldThrowException_WhenInvestmentNotFound() {
        // Given
        BigDecimal amount = new BigDecimal("2315.47");
        
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(investmentRepository.findById(testInvestment.getId())).thenReturn(Optional.empty());

        // When & Then
        assertThrows(PaymentException.class, () -> 
            paymentService.createPaymentOrder(testUser.getId(), testInvestment.getId(), amount));
        
        verify(userRepository).findById(testUser.getId());
        verify(investmentRepository).findById(testInvestment.getId());
        verify(razorpayService, never()).createOrder(any(), any());
    }

    @Test
    void createPaymentOrder_ShouldThrowException_WhenAmountIsInvalid() {
        // Given
        BigDecimal invalidAmount = new BigDecimal("-100.00");
        
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(investmentRepository.findById(testInvestment.getId())).thenReturn(Optional.of(testInvestment));

        // When & Then
        assertThrows(PaymentException.class, () -> 
            paymentService.createPaymentOrder(testUser.getId(), testInvestment.getId(), invalidAmount));
        
        verify(userRepository).findById(testUser.getId());
        verify(investmentRepository).findById(testInvestment.getId());
        verify(razorpayService, never()).createOrder(any(), any());
    }

    @Test
    void verifyPayment_ShouldVerifySuccessfully() {
        // Given
        String orderId = "order_123456789";
        String paymentId = "pay_123456789";
        String signature = "generated_signature";
        
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(investmentRepository.findById(testInvestment.getId())).thenReturn(Optional.of(testInvestment));
        when(razorpayService.verifySignature(orderId, paymentId, signature)).thenReturn(true);
        when(paymentRepository.save(any(Payment.class))).thenReturn(testPayment);

        // When
        Payment verifiedPayment = paymentService.verifyPayment(
            testUser.getId(), testInvestment.getId(), orderId, paymentId, signature, new BigDecimal("2315.47")
        );

        // Then
        assertNotNull(verifiedPayment);
        assertEquals("COMPLETED", verifiedPayment.getStatus());
        assertEquals(paymentId, verifiedPayment.getTransactionId());
        verify(userRepository).findById(testUser.getId());
        verify(investmentRepository).findById(testInvestment.getId());
        verify(razorpayService).verifySignature(orderId, paymentId, signature);
        verify(paymentRepository).save(any(Payment.class));
        verify(emailService).sendPaymentConfirmationEmail(testUser, verifiedPayment);
    }

    @Test
    void verifyPayment_ShouldThrowException_WhenSignatureVerificationFails() {
        // Given
        String orderId = "order_123456789";
        String paymentId = "pay_123456789";
        String signature = "invalid_signature";
        
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(investmentRepository.findById(testInvestment.getId())).thenReturn(Optional.of(testInvestment));
        when(razorpayService.verifySignature(orderId, paymentId, signature)).thenReturn(false);

        // When & Then
        assertThrows(PaymentException.class, () -> 
            paymentService.verifyPayment(testUser.getId(), testInvestment.getId(), orderId, paymentId, signature, new BigDecimal("2315.47")));
        
        verify(userRepository).findById(testUser.getId());
        verify(investmentRepository).findById(testInvestment.getId());
        verify(razorpayService).verifySignature(orderId, paymentId, signature);
        verify(paymentRepository, never()).save(any());
        verify(emailService, never()).sendPaymentConfirmationEmail(any(), any());
    }

    @Test
    void getPaymentHistory_ShouldReturnPaginatedPayments() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        List<Payment> payments = Arrays.asList(testPayment);
        Page<Payment> expectedPage = new PageImpl<>(payments, pageable, 1);
        
        when(paymentRepository.findByUserIdOrderByCreatedAtDesc(testUser.getId(), pageable)).thenReturn(expectedPage);

        // When
        Page<Payment> result = paymentService.getPaymentHistory(testUser.getId(), pageable);

        // Then
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(testPayment.getId(), result.getContent().get(0).getId());
        verify(paymentRepository).findByUserIdOrderByCreatedAtDesc(testUser.getId(), pageable);
    }

    @Test
    void getPaymentHistory_ShouldReturnEmptyPage_WhenNoPayments() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        Page<Payment> expectedPage = new PageImpl<>(Arrays.asList(), pageable, 0);
        
        when(paymentRepository.findByUserIdOrderByCreatedAtDesc(testUser.getId(), pageable)).thenReturn(expectedPage);

        // When
        Page<Payment> result = paymentService.getPaymentHistory(testUser.getId(), pageable);

        // Then
        assertNotNull(result);
        assertEquals(0, result.getTotalElements());
        assertTrue(result.getContent().isEmpty());
        verify(paymentRepository).findByUserIdOrderByCreatedAtDesc(testUser.getId(), pageable);
    }

    @Test
    void getPaymentById_ShouldReturnPayment_WhenFound() {
        // Given
        when(paymentRepository.findById(testPayment.getId())).thenReturn(Optional.of(testPayment));

        // When
        Optional<Payment> result = paymentService.getPaymentById(testPayment.getId());

        // Then
        assertTrue(result.isPresent());
        assertEquals(testPayment.getId(), result.get().getId());
        verify(paymentRepository).findById(testPayment.getId());
    }

    @Test
    void getPaymentById_ShouldReturnEmpty_WhenNotFound() {
        // Given
        UUID paymentId = UUID.randomUUID();
        when(paymentRepository.findById(paymentId)).thenReturn(Optional.empty());

        // When
        Optional<Payment> result = paymentService.getPaymentById(paymentId);

        // Then
        assertFalse(result.isPresent());
        verify(paymentRepository).findById(paymentId);
    }

    @Test
    void getTotalPaymentsByUser_ShouldReturnTotalAmount() {
        // Given
        BigDecimal expectedTotal = new BigDecimal("50000.00");
        when(paymentRepository.getTotalPaymentsByUserId(testUser.getId())).thenReturn(expectedTotal);

        // When
        BigDecimal result = paymentService.getTotalPaymentsByUser(testUser.getId());

        // Then
        assertEquals(expectedTotal, result);
        verify(paymentRepository).getTotalPaymentsByUserId(testUser.getId());
    }

    @Test
    void getTotalPaymentsByUser_ShouldReturnZero_WhenNoPayments() {
        // Given
        when(paymentRepository.getTotalPaymentsByUserId(testUser.getId())).thenReturn(BigDecimal.ZERO);

        // When
        BigDecimal result = paymentService.getTotalPaymentsByUserId(testUser.getId());

        // Then
        assertEquals(BigDecimal.ZERO, result);
        verify(paymentRepository).getTotalPaymentsByUserId(testUser.getId());
    }

    @Test
    void refundPayment_ShouldProcessRefundSuccessfully() {
        // Given
        String refundId = "refund_123456789";
        
        when(paymentRepository.findById(testPayment.getId())).thenReturn(Optional.of(testPayment));
        when(razorpayService.processRefund(testPayment.getTransactionId(), testPayment.getAmount())).thenReturn(refundId);
        when(paymentRepository.save(any(Payment.class))).thenReturn(testPayment);

        // When
        Payment refundedPayment = paymentService.refundPayment(testPayment.getId(), "Customer request");

        // Then
        assertNotNull(refundedPayment);
        assertEquals("REFUNDED", refundedPayment.getStatus());
        verify(paymentRepository).findById(testPayment.getId());
        verify(razorpayService).processRefund(testPayment.getTransactionId(), testPayment.getAmount());
        verify(paymentRepository).save(testPayment);
        verify(emailService).sendRefundConfirmationEmail(testUser, refundedPayment);
    }

    @Test
    void refundPayment_ShouldThrowException_WhenPaymentNotFound() {
        // Given
        UUID paymentId = UUID.randomUUID();
        when(paymentRepository.findById(paymentId)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(PaymentException.class, () -> 
            paymentService.refundPayment(paymentId, "Customer request"));
        
        verify(paymentRepository).findById(paymentId);
        verify(razorpayService, never()).processRefund(any(), any());
        verify(paymentRepository, never()).save(any());
        verify(emailService, never()).sendRefundConfirmationEmail(any(), any());
    }

    @Test
    void refundPayment_ShouldThrowException_WhenRefundFails() {
        // Given
        when(paymentRepository.findById(testPayment.getId())).thenReturn(Optional.of(testPayment));
        when(razorpayService.processRefund(testPayment.getTransactionId(), testPayment.getAmount()))
            .thenThrow(new PaymentException("Refund failed"));

        // When & Then
        assertThrows(PaymentException.class, () -> 
            paymentService.refundPayment(testPayment.getId(), "Customer request"));
        
        verify(paymentRepository).findById(testPayment.getId());
        verify(razorpayService).processRefund(testPayment.getTransactionId(), testPayment.getAmount());
        verify(paymentRepository, never()).save(any());
        verify(emailService, never()).sendRefundConfirmationEmail(any(), any());
    }

    @Test
    void getPaymentStatistics_ShouldReturnStatistics() {
        // Given
        BigDecimal totalAmount = new BigDecimal("100000.00");
        Long totalPayments = 50L;
        BigDecimal averageAmount = new BigDecimal("2000.00");
        
        when(paymentRepository.getTotalPaymentAmount()).thenReturn(totalAmount);
        when(paymentRepository.count()).thenReturn(totalPayments);
        when(paymentRepository.getAveragePaymentAmount()).thenReturn(averageAmount);

        // When
        var statistics = paymentService.getPaymentStatistics();

        // Then
        assertNotNull(statistics);
        assertEquals(totalAmount, statistics.getTotalAmount());
        assertEquals(totalPayments, statistics.getTotalPayments());
        assertEquals(averageAmount, statistics.getAverageAmount());
        verify(paymentRepository).getTotalPaymentAmount();
        verify(paymentRepository).count();
        verify(paymentRepository).getAveragePaymentAmount();
    }

    @Test
    void getPaymentsByStatus_ShouldReturnPayments() {
        // Given
        String status = "COMPLETED";
        List<Payment> expectedPayments = Arrays.asList(testPayment);
        
        when(paymentRepository.findByStatus(status)).thenReturn(expectedPayments);

        // When
        List<Payment> result = paymentService.getPaymentsByStatus(status);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(testPayment.getId(), result.get(0).getId());
        verify(paymentRepository).findByStatus(status);
    }

    @Test
    void getPaymentsByDateRange_ShouldReturnPayments() {
        // Given
        LocalDateTime startDate = LocalDateTime.now().minusDays(30);
        LocalDateTime endDate = LocalDateTime.now();
        List<Payment> expectedPayments = Arrays.asList(testPayment);
        
        when(paymentRepository.findByCreatedAtBetween(startDate, endDate)).thenReturn(expectedPayments);

        // When
        List<Payment> result = paymentService.getPaymentsByDateRange(startDate, endDate);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(testPayment.getId(), result.get(0).getId());
        verify(paymentRepository).findByCreatedAtBetween(startDate, endDate);
    }

    @Test
    void updatePaymentStatus_ShouldUpdateStatusSuccessfully() {
        // Given
        String newStatus = "FAILED";
        
        when(paymentRepository.findById(testPayment.getId())).thenReturn(Optional.of(testPayment));
        when(paymentRepository.save(any(Payment.class))).thenReturn(testPayment);

        // When
        Payment updatedPayment = paymentService.updatePaymentStatus(testPayment.getId(), newStatus);

        // Then
        assertNotNull(updatedPayment);
        assertEquals(newStatus, updatedPayment.getStatus());
        verify(paymentRepository).findById(testPayment.getId());
        verify(paymentRepository).save(testPayment);
    }

    @Test
    void updatePaymentStatus_ShouldThrowException_WhenPaymentNotFound() {
        // Given
        UUID paymentId = UUID.randomUUID();
        String newStatus = "FAILED";
        
        when(paymentRepository.findById(paymentId)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(PaymentException.class, () -> 
            paymentService.updatePaymentStatus(paymentId, newStatus));
        
        verify(paymentRepository).findById(paymentId);
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void deletePayment_ShouldDeletePaymentSuccessfully() {
        // Given
        when(paymentRepository.findById(testPayment.getId())).thenReturn(Optional.of(testPayment));
        doNothing().when(paymentRepository).delete(testPayment);

        // When
        paymentService.deletePayment(testPayment.getId());

        // Then
        verify(paymentRepository).findById(testPayment.getId());
        verify(paymentRepository).delete(testPayment);
    }

    @Test
    void deletePayment_ShouldThrowException_WhenPaymentNotFound() {
        // Given
        UUID paymentId = UUID.randomUUID();
        when(paymentRepository.findById(paymentId)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(PaymentException.class, () -> 
            paymentService.deletePayment(paymentId));
        
        verify(paymentRepository).findById(paymentId);
        verify(paymentRepository, never()).delete(any());
    }

    @Test
    void retryFailedPayment_ShouldRetrySuccessfully() {
        // Given
        Payment failedPayment = Payment.builder()
            .id(UUID.randomUUID())
            .investment(testInvestment)
            .user(testUser)
            .amount(new BigDecimal("2315.47"))
            .paymentMethod("RAZORPAY")
            .status("FAILED")
            .transactionId("failed_txn_123")
            .createdAt(LocalDateTime.now())
            .build();
        
        String newOrderId = "order_retry_123456789";
        
        when(paymentRepository.findById(failedPayment.getId())).thenReturn(Optional.of(failedPayment));
        when(razorpayService.createOrder(failedPayment.getAmount(), "INR")).thenReturn(newOrderId);

        // When
        String resultOrderId = paymentService.retryFailedPayment(failedPayment.getId());

        // Then
        assertEquals(newOrderId, resultOrderId);
        verify(paymentRepository).findById(failedPayment.getId());
        verify(razorpayService).createOrder(failedPayment.getAmount(), "INR");
    }

    @Test
    void retryFailedPayment_ShouldThrowException_WhenPaymentNotFailed() {
        // Given
        when(paymentRepository.findById(testPayment.getId())).thenReturn(Optional.of(testPayment));

        // When & Then
        assertThrows(PaymentException.class, () -> 
            paymentService.retryFailedPayment(testPayment.getId()));
        
        verify(paymentRepository).findById(testPayment.getId());
        verify(razorpayService, never()).createOrder(any(), any());
    }

    @Test
    void getPendingPayments_ShouldReturnPendingPayments() {
        // Given
        List<Payment> expectedPayments = Arrays.asList(testPayment);
        
        when(paymentRepository.findByStatus("PENDING")).thenReturn(expectedPayments);

        // When
        List<Payment> result = paymentService.getPendingPayments();

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(testPayment.getId(), result.get(0).getId());
        verify(paymentRepository).findByStatus("PENDING");
    }

    @Test
    void processScheduledPayments_ShouldProcessAllPendingPayments() {
        // Given
        List<Payment> pendingPayments = Arrays.asList(testPayment);
        
        when(paymentRepository.findByStatus("PENDING")).thenReturn(pendingPayments);
        when(razorpayService.verifySignature(anyString(), anyString(), anyString())).thenReturn(true);
        when(paymentRepository.save(any(Payment.class))).thenReturn(testPayment);

        // When
        int processedCount = paymentService.processScheduledPayments();

        // Then
        assertEquals(1, processedCount);
        verify(paymentRepository).findByStatus("PENDING");
        verify(paymentRepository, times(1)).save(any(Payment.class));
    }

    @Test
    void getPaymentMetrics_ShouldReturnMetrics() {
        // Given
        BigDecimal totalRevenue = new BigDecimal("500000.00");
        Long successfulPayments = 200L;
        Long failedPayments = 10L;
        Double successRate = 0.95;
        
        when(paymentRepository.getTotalPaymentAmount()).thenReturn(totalRevenue);
        when(paymentRepository.countByStatus("COMPLETED")).thenReturn(successfulPayments);
        when(paymentRepository.countByStatus("FAILED")).thenReturn(failedPayments);

        // When
        var metrics = paymentService.getPaymentMetrics();

        // Then
        assertNotNull(metrics);
        assertEquals(totalRevenue, metrics.getTotalRevenue());
        assertEquals(successfulPayments, metrics.getSuccessfulPayments());
        assertEquals(failedPayments, metrics.getFailedPayments());
        assertTrue(metrics.getSuccessRate() > 0);
        verify(paymentRepository).getTotalPaymentAmount();
        verify(paymentRepository).countByStatus("COMPLETED");
        verify(paymentRepository).countByStatus("FAILED");
    }

    @Test
    void validatePaymentAmount_ShouldThrowException_WhenAmountIsZero() {
        // Given
        BigDecimal zeroAmount = BigDecimal.ZERO;

        // When & Then
        assertThrows(PaymentException.class, () -> 
            paymentService.validatePaymentAmount(zeroAmount));
    }

    @Test
    void validatePaymentAmount_ShouldThrowException_WhenAmountIsNegative() {
        // Given
        BigDecimal negativeAmount = new BigDecimal("-100.00");

        // When & Then
        assertThrows(PaymentException.class, () -> 
            paymentService.validatePaymentAmount(negativeAmount));
    }

    @Test
    void validatePaymentAmount_ShouldPass_WhenAmountIsValid() {
        // Given
        BigDecimal validAmount = new BigDecimal("1000.00");

        // When & Then
        assertDoesNotThrow(() -> 
            paymentService.validatePaymentAmount(validAmount));
    }

    @Test
    void validatePaymentMethod_ShouldThrowException_WhenMethodIsInvalid() {
        // Given
        String invalidMethod = "INVALID_METHOD";

        // When & Then
        assertThrows(PaymentException.class, () -> 
            paymentService.validatePaymentMethod(invalidMethod));
    }

    @Test
    void validatePaymentMethod_ShouldPass_WhenMethodIsValid() {
        // Given
        String validMethod = "RAZORPAY";

        // When & Then
        assertDoesNotThrow(() -> 
            paymentService.validatePaymentMethod(validMethod));
    }
}
