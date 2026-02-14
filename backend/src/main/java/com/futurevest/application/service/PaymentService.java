package com.futurevest.application.service;

import com.futurevest.application.port.out.PaymentRepository;
import com.futurevest.domain.entity.Payment;
import com.futurevest.application.service.exception.PaymentProcessingException;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final RazorpayClient razorpayClient;

    @Value("${razorpay.currency:INR}")
    private String currency;

    @Transactional
    public Payment createOrder(UUID userId, UUID investorId, UUID courseId, BigDecimal amount) {
        log.info("Creating Razorpay order for user ID: {}, investor ID: {}, course ID: {}, amount: {}", 
                userId, investorId, courseId, amount);

        try {
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amount.multiply(BigDecimal.valueOf(100)).intValue()); // Convert to paise
            orderRequest.put("currency", currency);
            orderRequest.put("receipt", "receipt_" + UUID.randomUUID().toString());
            orderRequest.put("payment_capture", 1);

            Order razorpayOrder = razorpayClient.orders.create(orderRequest);
            String razorpayOrderId = razorpayOrder.get("id");

            Payment payment = Payment.builder()
                    .id(UUID.randomUUID())
                    .userId(userId)
                    .investorId(investorId)
                    .courseId(courseId)
                    .razorpayOrderId(razorpayOrderId)
                    .razorpayPaymentId(null)
                    .amount(amount)
                    .status("PENDING")
                    .paymentMethod("RAZORPAY")
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();

            Payment savedPayment = paymentRepository.save(payment);
            log.info("Successfully created payment order with ID: {}, Razorpay Order ID: {}", 
                    savedPayment.getId(), razorpayOrderId);

            return savedPayment;
        } catch (RazorpayException e) {
            log.error("Failed to create Razorpay order for user ID: {}, investor ID: {}", userId, investorId, e);
            throw new PaymentProcessingException("Failed to create payment order", e);
        }
    }

    @Transactional
    public Payment verifyPayment(String razorpayOrderId, String razorpayPaymentId, 
                               String razorpaySignature) {
        log.info("Verifying payment - Order ID: {}, Payment ID: {}", razorpayOrderId, razorpayPaymentId);

        Optional<Payment> paymentOpt = paymentRepository.findByRazorpayOrderId(razorpayOrderId);
        if (paymentOpt.isEmpty()) {
            log.error("Payment not found for Razorpay Order ID: {}", razorpayOrderId);
            throw new PaymentProcessingException("Payment order not found");
        }

        Payment payment = paymentOpt.get();

        try {
            String generatedSignature = generateSignature(razorpayOrderId, razorpayPaymentId);
            
            if (!generatedSignature.equals(razorpaySignature)) {
                log.error("Payment verification failed - signature mismatch for Order ID: {}", razorpayOrderId);
                Payment failedPayment = payment.toBuilder()
                        .status("FAILED")
                        .updatedAt(Instant.now())
                        .build();
                paymentRepository.save(failedPayment);
                throw new PaymentProcessingException("Payment verification failed - signature mismatch");
            }

            Payment verifiedPayment = payment.toBuilder()
                    .razorpayPaymentId(razorpayPaymentId)
                    .status("COMPLETED")
                    .updatedAt(Instant.now())
                    .build();

            Payment savedPayment = paymentRepository.save(verifiedPayment);
            log.info("Payment verified successfully for payment ID: {}", savedPayment.getId());

            return savedPayment;
        } catch (Exception e) {
            log.error("Payment verification error for Order ID: {}", razorpayOrderId, e);
            Payment failedPayment = payment.toBuilder()
                    .status("FAILED")
                    .updatedAt(Instant.now())
                    .build();
            paymentRepository.save(failedPayment);
            throw new PaymentProcessingException("Payment verification failed", e);
        }
    }

    @Transactional
    public Payment refundPayment(UUID paymentId) {
        log.info("Processing refund for payment ID: {}", paymentId);

        Optional<Payment> paymentOpt = paymentRepository.findById(paymentId);
        if (paymentOpt.isEmpty()) {
            log.error("Payment not found for refund - ID: {}", paymentId);
            throw new PaymentProcessingException("Payment not found");
        }

        Payment payment = paymentOpt.get();
        
        if (!"COMPLETED".equals(payment.getStatus())) {
            log.error("Cannot refund payment with status: {} for ID: {}", payment.getStatus(), paymentId);
            throw new PaymentProcessingException("Cannot refund payment - not completed");
        }

        try {
            JSONObject refundRequest = new JSONObject();
            refundRequest.put("payment_id", payment.getRazorpayPaymentId());

            com.razorpay.Refund refund = razorpayClient.payments.refund(payment.getRazorpayPaymentId(), refundRequest);

            Payment refundedPayment = payment.toBuilder()
                    .status("REFUNDED")
                    .updatedAt(Instant.now())
                    .build();

            Payment savedPayment = paymentRepository.save(refundedPayment);
            log.info("Payment refunded successfully for payment ID: {}", savedPayment.getId());

            return savedPayment;
        } catch (RazorpayException e) {
            log.error("Failed to refund payment ID: {}", paymentId, e);
            throw new PaymentProcessingException("Refund processing failed", e);
        }
    }

    public List<Payment> getPaymentsByUser(UUID userId) {
        log.info("Fetching payments for user ID: {}", userId);
        
        List<Payment> payments = paymentRepository.findByUserId(userId);
        log.info("Found {} payments for user ID: {}", payments.size(), userId);
        
        return payments;
    }

    public List<Payment> getPaymentsByInvestor(UUID investorId) {
        log.info("Fetching payments for investor ID: {}", investorId);
        
        List<Payment> payments = paymentRepository.findByInvestorId(investorId);
        log.info("Found {} payments for investor ID: {}", payments.size(), investorId);
        
        return payments;
    }

    public Payment getPaymentById(UUID paymentId) {
        log.info("Fetching payment by ID: {}", paymentId);
        
        Optional<Payment> paymentOpt = paymentRepository.findById(paymentId);
        if (paymentOpt.isEmpty()) {
            log.error("Payment not found for ID: {}", paymentId);
            throw new PaymentProcessingException("Payment not found");
        }

        return paymentOpt.get();
    }

    @Transactional
    public Payment updatePaymentStatus(UUID paymentId, String status) {
        log.info("Updating payment status to {} for ID: {}", status, paymentId);
        
        Optional<Payment> paymentOpt = paymentRepository.findById(paymentId);
        if (paymentOpt.isEmpty()) {
            log.error("Payment not found for ID: {}", paymentId);
            throw new PaymentProcessingException("Payment not found");
        }

        Payment updatedPayment = paymentOpt.get().toBuilder()
                .status(status)
                .updatedAt(Instant.now())
                .build();

        Payment savedPayment = paymentRepository.save(updatedPayment);
        log.info("Updated payment status to {} for ID: {}", status, paymentId);
        
        return savedPayment;
    }

    public List<Payment> getPaymentsByStatus(String status) {
        log.info("Fetching payments with status: {}", status);
        
        List<Payment> payments = paymentRepository.findByStatus(status);
        log.info("Found {} payments with status: {}", payments.size(), status);
        
        return payments;
    }

    private String generateSignature(String orderId, String paymentId) {
        try {
            String payload = orderId + "|" + paymentId;
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec(razorpayClient.getClientSecret().getBytes(), "HmacSHA256"));
            byte[] result = mac.doFinal(payload.getBytes());
            return java.util.Base64.getEncoder().encodeToString(result);
        } catch (Exception e) {
            log.error("Failed to generate signature for order ID: {}, payment ID: {}", orderId, paymentId, e);
            throw new PaymentProcessingException("Signature generation failed", e);
        }
    }
}
