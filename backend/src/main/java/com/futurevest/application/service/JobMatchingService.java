package com.futurevest.application.service;

import com.futurevest.domain.entity.Job;
import com.futurevest.domain.entity.User;
import com.futurevest.domain.entity.Resume;
import com.futurevest.domain.entity.Skill;
import com.futurevest.application.port.out.JobRepository;
import com.futurevest.application.port.out.UserRepository;
import com.futurevest.application.port.out.ResumeRepository;
import com.futurevest.application.port.out.SkillRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class JobMatchingService {

    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final ResumeRepository resumeRepository;
    private final SkillRepository skillRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private final NotificationService notificationService;

    @Value("${app.job.matching.cache-ttl:3600}")
    private long cacheTtlSeconds;

    @Value("${app.job.matching.min-skills:3}")
    private int minSkillsRequired;

    @Value("${app.job.matching.max-results:20}")
    private int maxResults;

    /**
     * Get job matches for a user based on their skills and preferences
     */
    public List<JobMatch> getJobMatches(UUID userId) {
        String cacheKey = "job_matches:" + userId.toString();
        
        // Try to get from cache first
        List<JobMatch> cachedMatches = (List<JobMatch>) redisTemplate.opsForValue().get(cacheKey);
        if (cachedMatches != null) {
            log.debug("Retrieved {} job matches from cache for user: {}", cachedMatches.size(), userId);
            return cachedMatches;
        }

        // Calculate matches
        List<JobMatch> matches = calculateJobMatches(userId);
        
        // Cache the results
        redisTemplate.opsForValue().set(cacheKey, matches, cacheTtlSeconds, TimeUnit.SECONDS);
        
        log.info("Calculated {} job matches for user: {}", matches.size(), userId);
        return matches;
    }

    /**
     * Calculate job matches for a user
     */
    private List<JobMatch> calculateJobMatches(UUID userId) {
        try {
            // Get user and their resume
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                log.warn("User not found: {}", userId);
                return Collections.emptyList();
            }

            User user = userOpt.get();
            
            // Get user's skills from resume
            Set<String> userSkills = getUserSkills(userId);
            if (userSkills.size() < minSkillsRequired) {
                log.debug("User {} has insufficient skills for matching: {}", userId, userSkills.size());
                return Collections.emptyList();
            }

            // Get active jobs
            Pageable pageable = PageRequest.of(0, maxResults);
            Page<Job> activeJobs = jobRepository.findActiveJobs(pageable);

            // Calculate match scores
            List<JobMatch> matches = new ArrayList<>();
            
            for (Job job : activeJobs.getContent()) {
                JobMatch match = calculateMatchScore(user, job, userSkills);
                if (match.getScore() > 0) {
                    matches.add(match);
                }
            }

            // Sort by score (highest first) and limit results
            matches.sort((a, b) -> Double.compare(b.getScore(), a.getScore()));
            
            return matches.stream()
                    .limit(maxResults)
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Error calculating job matches for user: {}", userId, e);
            return Collections.emptyList();
        }
    }

    /**
     * Calculate match score between user and job
     */
    private JobMatch calculateMatchScore(User user, Job job, Set<String> userSkills) {
        try {
            // Get job requirements
            Set<String> requiredSkills = getJobSkills(job.getId());
            Set<String> preferredSkills = getJobPreferredSkills(job.getId());
            
            // Calculate skill match score
            double skillScore = calculateSkillMatchScore(userSkills, requiredSkills, preferredSkills);
            
            // Calculate experience match score
            double experienceScore = calculateExperienceMatchScore(user, job);
            
            // Calculate location match score
            double locationScore = calculateLocationMatchScore(user, job);
            
            // Calculate salary match score
            double salaryScore = calculateSalaryMatchScore(user, job);
            
            // Calculate education match score
            double educationScore = calculateEducationMatchScore(user, job);
            
            // Calculate overall score (weighted average)
            double overallScore = (skillScore * 0.4) + 
                                 (experienceScore * 0.2) + 
                                 (locationScore * 0.15) + 
                                 (salaryScore * 0.15) + 
                                 (educationScore * 0.1);
            
            return JobMatch.builder()
                    .userId(user.getId())
                    .jobId(job.getId())
                    .job(job)
                    .score(overallScore)
                    .skillMatch(skillScore)
                    .experienceMatch(experienceScore)
                    .locationMatch(locationScore)
                    .salaryMatch(salaryScore)
                    .educationMatch(educationScore)
                    .matchedAt(LocalDateTime.now())
                    .build();

        } catch (Exception e) {
            log.error("Error calculating match score for user {} and job {}", user.getId(), job.getId(), e);
            return JobMatch.builder()
                    .userId(user.getId())
                    .jobId(job.getId())
                    .job(job)
                    .score(0.0)
                    .matchedAt(LocalDateTime.now())
                    .build();
        }
    }

    /**
     * Calculate skill match score
     */
    private double calculateSkillMatchScore(Set<String> userSkills, Set<String> requiredSkills, Set<String> preferredSkills) {
        if (requiredSkills.isEmpty()) {
            return 0.5; // No requirements, give neutral score
        }

        // Calculate required skills match
        int requiredMatches = 0;
        for (String skill : requiredSkills) {
            if (userSkills.contains(skill.toLowerCase())) {
                requiredMatches++;
            }
        }
        
        double requiredScore = (double) requiredMatches / requiredSkills.size();
        
        // Calculate preferred skills match (bonus)
        int preferredMatches = 0;
        for (String skill : preferredSkills) {
            if (userSkills.contains(skill.toLowerCase())) {
                preferredMatches++;
            }
        }
        
        double preferredScore = preferredSkills.isEmpty() ? 0 : 
            (double) preferredMatches / preferredSkills.size() * 0.3; // 30% bonus
        
        return Math.min(1.0, requiredScore + preferredScore);
    }

    /**
     * Calculate experience match score
     */
    private double calculateExperienceMatchScore(User user, Job job) {
        if (job.getMinExperience() == null) {
            return 1.0; // No experience requirement
        }

        int userExperience = user.getExperience() != null ? user.getExperience() : 0;
        int requiredExperience = job.getMinExperience();
        
        if (userExperience >= requiredExperience) {
            return 1.0; // Meets requirement
        }
        
        // Partial score based on how close they are
        double ratio = (double) userExperience / requiredExperience;
        return Math.max(0.0, ratio * 0.8); // Max 80% if underqualified
    }

    /**
     * Calculate location match score
     */
    private double calculateLocationMatchScore(User user, Job job) {
        if (job.getLocation() == null || user.getLocation() == null) {
            return 0.5; // No location info, give neutral score
        }

        String userLocation = user.getLocation().toLowerCase().trim();
        String jobLocation = job.getLocation().toLowerCase().trim();
        
        if (userLocation.equals(jobLocation)) {
            return 1.0; // Exact match
        }
        
        // Check if same city (simplified)
        String[] userParts = userLocation.split(",");
        String[] jobParts = jobLocation.split(",");
        
        for (String userPart : userParts) {
            for (String jobPart : jobParts) {
                if (userPart.trim().equals(jobPart.trim())) {
                    return 0.8; // Same city
                }
            }
        }
        
        return 0.2; // Different location
    }

    /**
     * Calculate salary match score
     */
    private double calculateSalaryMatchScore(User user, Job job) {
        if (job.getMinSalary() == null) {
            return 0.5; // No salary info, give neutral score
        }

        // For now, assume user expects at least the job's minimum salary
        // In a real implementation, you'd get user's expected salary
        double userExpectedSalary = job.getMinSalary(); // Simplified
        
        if (userExpectedSalary <= job.getMinSalary()) {
            return 0.3; // User expects less or equal to minimum
        }
        
        if (userExpectedSalary <= job.getMaxSalary()) {
            return 1.0; // Within salary range
        }
        
        // User expects more than maximum
        double ratio = (double) job.getMaxSalary() / userExpectedSalary;
        return Math.max(0.0, ratio * 0.7); // Max 70% if overpaid
    }

    /**
     * Calculate education match score
     */
    private double calculateEducationMatchScore(User user, Job job) {
        if (job.getRequiredEducation() == null) {
            return 0.5; // No education requirement
        }

        String userEducation = user.getEducation() != null ? user.getEducation().toLowerCase() : "";
        String requiredEducation = job.getRequiredEducation().toLowerCase();
        
        // Simple education level matching
        Map<String, Integer> educationLevels = Map.of(
            "high school", 1,
            "diploma", 2,
            "bachelor", 3,
            "master", 4,
            "phd", 5
        );
        
        int userLevel = educationLevels.getOrDefault(userEducation, 0);
        int requiredLevel = educationLevels.getOrDefault(requiredEducation, 0);
        
        if (userLevel >= requiredLevel) {
            return 1.0; // Meets or exceeds requirement
        }
        
        // Partial score based on level difference
        double ratio = (double) userLevel / requiredLevel;
        return Math.max(0.0, ratio * 0.8); // Max 80% if underqualified
    }

    /**
     * Get user's skills from resume
     */
    private Set<String> getUserSkills(UUID userId) {
        try {
            Optional<Resume> resumeOpt = resumeRepository.findByUserId(userId);
            if (resumeOpt.isEmpty()) {
                return Collections.emptySet();
            }

            Resume resume = resumeOpt.get();
            return resume.getSkills().stream()
                    .map(skill -> skill.getName().toLowerCase())
                    .collect(Collectors.toSet());

        } catch (Exception e) {
            log.error("Error getting skills for user: {}", userId, e);
            return Collections.emptySet();
        }
    }

    /**
     * Get job's required skills
     */
    private Set<String> getJobSkills(UUID jobId) {
        try {
            Optional<Job> jobOpt = jobRepository.findById(jobId);
            if (jobOpt.isEmpty()) {
                return Collections.emptySet();
            }

            Job job = jobOpt.get();
            return job.getRequiredSkills().stream()
                    .map(skill -> skill.getName().toLowerCase())
                    .collect(Collectors.toSet());

        } catch (Exception e) {
            log.error("Error getting required skills for job: {}", jobId, e);
            return Collections.emptySet();
        }
    }

    /**
     * Get job's preferred skills
     */
    private Set<String> getJobPreferredSkills(UUID jobId) {
        try {
            Optional<Job> jobOpt = jobRepository.findById(jobId);
            if (jobOpt.isEmpty()) {
                return Collections.emptySet();
            }

            Job job = jobOpt.get();
            return job.getPreferredSkills().stream()
                    .map(skill -> skill.getName().toLowerCase())
                    .collect(Collectors.toSet());

        } catch (Exception e) {
            log.error("Error getting preferred skills for job: {}", jobId, e);
            return Collections.emptySet();
        }
    }

    /**
     * Refresh job matches for a user
     */
    public void refreshJobMatches(UUID userId) {
        String cacheKey = "job_matches:" + userId.toString();
        redisTemplate.delete(cacheKey);
        
        // Recalculate matches
        List<JobMatch> matches = calculateJobMatches(userId);
        
        // Cache new results
        redisTemplate.opsForValue().set(cacheKey, matches, cacheTtlSeconds, TimeUnit.SECONDS);
        
        log.info("Refreshed job matches for user: {} ({} matches)", userId, matches.size());
    }

    /**
     * Get job matches for multiple users (batch processing)
     */
    public Map<UUID, List<JobMatch>> getBatchJobMatches(List<UUID> userIds) {
        Map<UUID, List<JobMatch>> results = new HashMap<>();
        
        for (UUID userId : userIds) {
            List<JobMatch> matches = getJobMatches(userId);
            results.put(userId, matches);
        }
        
        return results;
    }

    /**
     * Get top job matches across all users (for analytics)
     */
    public List<JobMatch> getTopJobMatches(int limit) {
        try {
            // This would typically involve querying a materialized view or using a scoring algorithm
            // For now, we'll return empty list as this would require significant database optimization
            log.info("Top job matches requested with limit: {}", limit);
            return Collections.emptyList();
            
        } catch (Exception e) {
            log.error("Error getting top job matches", e);
            return Collections.emptyList();
        }
    }

    /**
     * Update user skills and refresh matches
     */
    public void updateUserSkills(UUID userId, Set<String> newSkills) {
        try {
            // Update user's skills in resume
            Optional<Resume> resumeOpt = resumeRepository.findByUserId(userId);
            if (resumeOpt.isPresent()) {
                Resume resume = resumeOpt.get();
                
                // Clear existing skills and add new ones
                resume.getSkills().clear();
                
                for (String skillName : newSkills) {
                    Skill skill = skillRepository.findByName(skillName)
                            .orElseGet(() -> {
                                Skill newSkill = new Skill();
                                newSkill.setName(skillName);
                                newSkill.setCreatedAt(LocalDateTime.now());
                                return skillRepository.save(newSkill);
                            });
                    resume.getSkills().add(skill);
                }
                
                resume.setUpdatedAt(LocalDateTime.now());
                resumeRepository.save(resume);
                
                // Refresh job matches
                refreshJobMatches(userId);
                
                log.info("Updated skills for user: {} ({} skills)", userId, newSkills.size());
            }
            
        } catch (Exception e) {
            log.error("Error updating skills for user: {}", userId, e);
        }
    }

    /**
     * Get matching statistics
     */
    public MatchingStatistics getMatchingStatistics() {
        try {
            // This would typically involve querying aggregated data
            // For now, return placeholder statistics
            return MatchingStatistics.builder()
                    .totalUsers(userRepository.count())
                    .totalJobs(jobRepository.count())
                    .averageMatches(15.5) // Placeholder
                    .topSkills(getTopSkills())
                    .build();
            
        } catch (Exception e) {
            log.error("Error getting matching statistics", e);
            return MatchingStatistics.builder().build();
        }
    }

    /**
     * Get top skills in the system
     */
    private List<String> getTopSkills() {
        try {
            // This would typically involve querying aggregated data
            // For now, return placeholder skills
            return Arrays.asList("java", "python", "javascript", "react", "nodejs", "sql", "aws", "docker");
            
        } catch (Exception e) {
            log.error("Error getting top skills", e);
            return Collections.emptyList();
        }
    }

    // Inner classes
    public static class JobMatch {
        private final UUID userId;
        private final UUID jobId;
        private final Job job;
        private final double score;
        private final double skillMatch;
        private final double experienceMatch;
        private final double locationMatch;
        private final double salaryMatch;
        private final double educationMatch;
        private final LocalDateTime matchedAt;

        private JobMatch(Builder builder) {
            this.userId = builder.userId;
            this.jobId = builder.jobId;
            this.job = builder.job;
            this.score = builder.score;
            this.skillMatch = builder.skillMatch;
            this.experienceMatch = builder.experienceMatch;
            this.locationMatch = builder.locationMatch;
            this.salaryMatch = builder.salaryMatch;
            this.educationMatch = builder.educationMatch;
            this.matchedAt = builder.matchedAt;
        }

        // Getters
        public UUID getUserId() { return userId; }
        public UUID getJobId() { return jobId; }
        public Job getJob() { return job; }
        public double getScore() { return score; }
        public double getSkillMatch() { return skillMatch; }
        public double getExperienceMatch() { return experienceMatch; }
        public double getLocationMatch() { return locationMatch; }
        public double getSalaryMatch() { return salaryMatch; }
        public double getEducationMatch() { return educationMatch; }
        public LocalDateTime getMatchedAt() { return matchedAt; }

        public static Builder builder() {
            return new Builder();
        }

        public static class Builder {
            private UUID userId;
            private UUID jobId;
            private Job job;
            private double score;
            private double skillMatch;
            private double experienceMatch;
            private double locationMatch;
            private double salaryMatch;
            private double educationMatch;
            private LocalDateTime matchedAt;

            public Builder userId(UUID userId) {
                this.userId = userId;
                return this;
            }

            public Builder jobId(UUID jobId) {
                this.jobId = jobId;
                return this;
            }

            public Builder job(Job job) {
                this.job = job;
                return this;
            }

            public Builder score(double score) {
                this.score = score;
                return this;
            }

            public Builder skillMatch(double skillMatch) {
                this.skillMatch = skillMatch;
                return this;
            }

            public Builder experienceMatch(double experienceMatch) {
                this.experienceMatch = experienceMatch;
                return this;
            }

            public Builder locationMatch(double locationMatch) {
                this.locationMatch = locationMatch;
                return this;
            }

            public Builder salaryMatch(double salaryMatch) {
                this.salaryMatch = salaryMatch;
                return this;
            }

            public Builder educationMatch(double educationMatch) {
                this.educationMatch = educationMatch;
                return this;
            }

            public Builder matchedAt(LocalDateTime matchedAt) {
                this.matchedAt = matchedAt;
                return this;
            }

            public JobMatch build() {
                return new JobMatch(this);
            }
        }
    }

    public static class MatchingStatistics {
        private final long totalUsers;
        private final long totalJobs;
        private final double averageMatches;
        private final List<String> topSkills;

        private MatchingStatistics(Builder builder) {
            this.totalUsers = builder.totalUsers;
            this.totalJobs = builder.totalJobs;
            this.averageMatches = builder.averageMatches;
            this.topSkills = builder.topSkills;
        }

        public long getTotalUsers() { return totalUsers; }
        public long getTotalJobs() { return totalJobs; }
        public double getAverageMatches() { return averageMatches; }
        public List<String> getTopSkills() { return topSkills; }

        public static Builder builder() {
            return new Builder();
        }

        public static class Builder {
            private long totalUsers;
            private long totalJobs;
            private double averageMatches;
            private List<String> topSkills;

            public Builder totalUsers(long totalUsers) {
                this.totalUsers = totalUsers;
                return this;
            }

            public Builder totalJobs(long totalJobs) {
                this.totalJobs = totalJobs;
                return this;
            }

            public Builder averageMatches(double averageMatches) {
                this.averageMatches = averageMatches;
                return this;
            }

            public Builder topSkills(List<String> topSkills) {
                this.topSkills = topSkills;
                return this;
            }

            public MatchingStatistics build() {
                return new MatchingStatistics(this);
            }
        }
    }
}
