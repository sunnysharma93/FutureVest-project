package com.futurevest.infrastructure.persistence.repository;

import com.futurevest.infrastructure.persistence.entity.UserEntity;
import com.futurevest.infrastructure.persistence.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserJpaRepository extends JpaRepository<UserEntity, UUID> {

    Optional<UserEntity> findByEmail(String email);

    boolean existsByEmail(String email);

    List<UserEntity> findByRole(UserRole role);

    List<UserEntity> findByEnabledTrue();
}
