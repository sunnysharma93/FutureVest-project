package com.futurevest.infrastructure.persistence.repository;

import com.futurevest.infrastructure.persistence.entity.JobEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface JobJpaRepository extends JpaRepository<JobEntity, UUID> {

    List<JobEntity> findByCompany(String company);

    List<JobEntity> findByTitleContainingIgnoreCase(String title);
}
