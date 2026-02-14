package com.futurevest.application.service;

import com.futurevest.application.port.out.CourseRepository;
import com.futurevest.domain.entity.Course;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CourseService {

    private final CourseRepository courseRepository;
    private final RestTemplate restTemplate;
    private static final String UDEMOCK_API_BASE = "https://api.udemymock.com/v1";

    @Transactional
    public Course createCourse(String title, String description, String provider, 
                            String externalCourseId, BigDecimal cost, String category, 
                            int durationInHours) {
        log.info("Creating new course: {} from provider: {}", title, provider);
        
        Course course = Course.builder()
                .id(UUID.randomUUID())
                .title(title)
                .description(description)
                .provider(provider)
                .externalCourseId(externalCourseId)
                .cost(cost)
                .status("AVAILABLE")
                .category(category)
                .durationInHours(durationInHours)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Course savedCourse = courseRepository.save(course);
        log.info("Successfully created course with ID: {}", savedCourse.getId());
        return savedCourse;
    }

    @Transactional
    public Course requestCourse(String title, String description, String provider, 
                              String category, int durationInHours) {
        log.info("Requesting new course: {} from provider: {}", title, provider);
        
        Course course = Course.builder()
                .id(UUID.randomUUID())
                .title(title)
                .description(description)
                .provider(provider)
                .externalCourseId(null)
                .cost(BigDecimal.ZERO)
                .status("REQUESTED")
                .category(category)
                .durationInHours(durationInHours)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Course savedCourse = courseRepository.save(course);
        log.info("Successfully requested course with ID: {}", savedCourse.getId());
        return savedCourse;
    }

    public List<Course> getAvailableCourses() {
        log.info("Fetching all available courses");
        
        List<Course> availableCourses = courseRepository.findByStatus("AVAILABLE");
        log.info("Found {} available courses", availableCourses.size());
        
        return availableCourses;
    }

    public List<Course> getRequestedCourses() {
        log.info("Fetching all requested courses");
        
        List<Course> requestedCourses = courseRepository.findByStatus("REQUESTED");
        log.info("Found {} requested courses", requestedCourses.size());
        
        return requestedCourses;
    }

    public List<Course> fetchCoursesFromUdemyMock() {
        log.info("Fetching courses from Udemy mock API");
        
        try {
            String url = UDEMOCK_API_BASE + "/courses";
            ResponseEntity<Map[]> response = restTemplate.getForEntity(url, Map[].class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Course> courses = Arrays.stream(response.getBody())
                        .map(this::mapToCourse)
                        .collect(Collectors.toList());
                
                log.info("Successfully fetched {} courses from Udemy mock API", courses.size());
                return courses;
            } else {
                log.error("Failed to fetch courses from Udemy mock API. Status: {}", 
                        response.getStatusCode());
                return List.of();
            }
        } catch (Exception e) {
            log.error("Error fetching courses from Udemy mock API", e);
            return List.of();
        }
    }

    @Transactional
    public Course syncCourseFromProvider(String externalCourseId, String provider) {
        log.info("Syncing course {} from provider: {}", externalCourseId, provider);
        
        try {
            String url = UDEMOCK_API_BASE + "/courses/" + externalCourseId;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Course course = mapToCourse(response.getBody());
                
                Optional<Course> existingCourse = courseRepository
                        .findByExternalCourseIdAndProvider(externalCourseId, provider);
                
                if (existingCourse.isPresent()) {
                    Course updatedCourse = existingCourse.get().toBuilder()
                            .title(course.getTitle())
                            .description(course.getDescription())
                            .cost(course.getCost())
                            .category(course.getCategory())
                            .durationInHours(course.getDurationInHours())
                            .status("AVAILABLE")
                            .updatedAt(Instant.now())
                            .build();
                    
                    Course savedCourse = courseRepository.save(updatedCourse);
                    log.info("Updated existing course with ID: {}", savedCourse.getId());
                    return savedCourse;
                } else {
                    Course newCourse = course.toBuilder()
                            .id(UUID.randomUUID())
                            .provider(provider)
                            .status("AVAILABLE")
                            .createdAt(Instant.now())
                            .updatedAt(Instant.now())
                            .build();
                    
                    Course savedCourse = courseRepository.save(newCourse);
                    log.info("Created new course from provider with ID: {}", savedCourse.getId());
                    return savedCourse;
                }
            } else {
                log.error("Failed to sync course {} from provider {}. Status: {}", 
                        externalCourseId, provider, response.getStatusCode());
                throw new RuntimeException("Failed to sync course from provider");
            }
        } catch (Exception e) {
            log.error("Error syncing course {} from provider: {}", externalCourseId, provider, e);
            throw new RuntimeException("Error syncing course from provider", e);
        }
    }

    public Course getCourseById(UUID courseId) {
        log.info("Fetching course by ID: {}", courseId);
        
        Optional<Course> courseOpt = courseRepository.findById(courseId);
        if (courseOpt.isEmpty()) {
            log.error("Course not found for ID: {}", courseId);
            throw new RuntimeException("Course not found");
        }

        return courseOpt.get();
    }

    @Transactional
    public Course updateCourseStatus(UUID courseId, String status) {
        log.info("Updating course status to {} for ID: {}", status, courseId);
        
        Optional<Course> courseOpt = courseRepository.findById(courseId);
        if (courseOpt.isEmpty()) {
            log.error("Course not found for ID: {}", courseId);
            throw new RuntimeException("Course not found");
        }

        Course updatedCourse = courseOpt.get().toBuilder()
                .status(status)
                .updatedAt(Instant.now())
                .build();

        Course savedCourse = courseRepository.save(updatedCourse);
        log.info("Updated course status to {} for ID: {}", status, courseId);
        
        return savedCourse;
    }

    private Course mapToCourse(Map<String, Object> courseData) {
        return Course.builder()
                .title((String) courseData.get("title"))
                .description((String) courseData.get("description"))
                .provider("UDEMY")
                .externalCourseId((String) courseData.get("id"))
                .cost(new BigDecimal(courseData.getOrDefault("price", "0").toString()))
                .category((String) courseData.getOrDefault("category", "GENERAL"))
                .durationInHours(Integer.parseInt(courseData.getOrDefault("duration", "0").toString()))
                .build();
    }
}
