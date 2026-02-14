package com.futurevest.infrastructure.persistence.repository;

import com.futurevest.infrastructure.persistence.entity.CourseEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CourseJpaRepository extends JpaRepository<CourseEntity, UUID> {

    List<CourseEntity> findByProvider(String provider);

    List<CourseEntity> findByNameContainingIgnoreCase(String name);
}
