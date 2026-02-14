package com.futurevest.infrastructure.persistence.repository;

import com.futurevest.infrastructure.persistence.entity.PaymentEntity;
import com.futurevest.infrastructure.persistence.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentJpaRepository extends JpaRepository<PaymentEntity, UUID> {

    List<PaymentEntity> findByUser_Id(UUID userId);

    List<PaymentEntity> findByInvestor_Id(UUID investorId);

    List<PaymentEntity> findByStatus(PaymentStatus status);

    Optional<PaymentEntity> findByRazorpayOrderId(String razorpayOrderId);
}
