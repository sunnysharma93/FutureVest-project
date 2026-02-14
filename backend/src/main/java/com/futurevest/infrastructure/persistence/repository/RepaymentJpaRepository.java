package com.futurevest.infrastructure.persistence.repository;

import com.futurevest.infrastructure.persistence.entity.RepaymentEntity;
import com.futurevest.infrastructure.persistence.entity.RepaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface RepaymentJpaRepository extends JpaRepository<RepaymentEntity, UUID> {

    List<RepaymentEntity> findByUser_Id(UUID userId);

    List<RepaymentEntity> findByInvestor_Id(UUID investorId);

    List<RepaymentEntity> findByStatus(RepaymentStatus status);

    List<RepaymentEntity> findByDueDateBeforeAndStatus(LocalDate dueDate, RepaymentStatus status);
}
