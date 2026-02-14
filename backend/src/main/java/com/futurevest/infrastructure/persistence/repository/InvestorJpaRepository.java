package com.futurevest.infrastructure.persistence.repository;

import com.futurevest.infrastructure.persistence.entity.InvestorEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface InvestorJpaRepository extends JpaRepository<InvestorEntity, UUID> {

    Optional<InvestorEntity> findByEmail(String email);

    boolean existsByEmail(String email);
}
