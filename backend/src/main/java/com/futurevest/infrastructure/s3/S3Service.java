package com.futurevest.infrastructure.s3;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awss.core.sync.RequestBody;
import software.amazon.awss.services.s3.S3Client;
import software.amazon.awss.services.s3.model.DeleteObjectRequest;
import software.amazon.awss.services.s3.model.GetObjectRequest;
import software.amazon.awss.services.s3.model.PutObjectRequest;
import software.amazon.awss.services.s3.model.S3Exception;
import software.amazon.awss.services.s3.model.S3Object;
import software.amazon.awss.services.s3.model.GetObjectResponse;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.Date;

@Service
@RequiredArgsConstructor
@Slf4j
public class S3Service {

    private final S3Client s3Client;

    @Value("${app.aws.s3.bucket}")
    private String bucket;

    @Value("${app.aws.s3.region}")
    private String region;

    // Allowed file types
    private static final List<String> ALLOWED_CONTENT_TYPES = Arrays.asList(
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "text/csv",
        "application/json"
    );

    // Maximum file size (5MB)
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    /**
     * Upload file asynchronously for scalability - offload I/O to worker.
     */
    @Async
    public CompletableFuture<String> uploadAsync(String key, InputStream inputStream, long contentLength, String contentType) {
        return CompletableFuture.supplyAsync(() -> upload(key, inputStream, contentLength, contentType));
    }

    /**
     * Upload file to S3
     */
    public String upload(String key, InputStream inputStream, long contentLength, String contentType) {
        try {
            validateFile(key, contentLength, contentType);
            
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(contentType)
                    .contentLength(contentLength)
                    .metadata(getMetadata(key))
                    .build();
            
            s3Client.putObject(request, RequestBody.fromInputStream(inputStream, contentLength));
            
            log.info("Successfully uploaded file to S3: bucket={}, key={}", bucket, key);
            return key;
        } catch (S3Exception e) {
            log.error("Failed to upload file to S3: {}", e.getMessage());
            throw new RuntimeException("Failed to upload file: " + e.getMessage(), e);
        } catch (IOException e) {
            log.error("IO error during file upload: {}", e.getMessage());
            throw new RuntimeException("IO error during file upload: " + e.getMessage(), e);
        }
    }

    /**
     * Upload MultipartFile to S3
     */
    public String uploadFile(String key, MultipartFile file) {
        try {
            validateFile(key, file.getSize(), file.getContentType());
            
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(file.getContentType())
                    .contentLength(file.getSize())
                    .metadata(getMetadata(key))
                    .build();
            
            s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            
            log.info("Successfully uploaded file to S3: bucket={}, key={}, size={} bytes", 
                bucket, key, file.getSize());
            return key;
        } catch (S3Exception e) {
            log.error("Failed to upload file to S3: {}", e.getMessage());
            throw new RuntimeException("Failed to upload file: " + e.getMessage(), e);
        } catch (IOException e) {
            log.error("IO error during file upload: {}", e.getMessage());
            throw new RuntimeException("IO error during file upload: " + e.getMessage(), e);
        }
    }

    /**
     * Download file from S3
     */
    public InputStream download(String key) {
        try {
            GetObjectRequest request = GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build();
            
            S3Object s3Object = s3Client.getObject(request);
            log.info("Successfully downloaded file from S3: bucket={}, key={}", bucket, key);
            return s3Object.getObjectContent();
        } catch (S3Exception e) {
            log.error("Failed to download file from S3: {}", e.getMessage());
            throw new RuntimeException("Failed to download file: " + e.getMessage(), e);
        }
    }

    /**
     * Get file URL for direct access
     */
    public String getFileUrl(String key) {
        try {
            // Set expiration to 1 hour
            Date expiration = new Date(System.currentTimeMillis() + 3600 * 1000);
            
            URL url = s3Client.generatePresignedUrl(bucket, key, expiration);
            
            log.debug("Generated presigned URL for S3 object: key={}", key);
            return url.toString();
        } catch (S3Exception e) {
            log.error("Failed to generate presigned URL: {}", e.getMessage());
            throw new RuntimeException("Failed to generate presigned URL: " + e.getMessage(), e);
        }
    }

    /**
     * Delete file from S3
     */
    public void deleteFile(String key) {
        try {
            DeleteObjectRequest request = DeleteObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build();
            
            s3Client.deleteObject(request);
            log.info("Successfully deleted file from S3: bucket={}, key={}", bucket, key);
        } catch (S3Exception e) {
            log.error("Failed to delete file from S3: {}", e.getMessage());
            throw new RuntimeException("Failed to delete file: " + e.getMessage(), e);
        }
    }

    /**
     * Check if file exists in S3
     */
    public boolean fileExists(String key) {
        try {
            GetObjectRequest request = GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build();
            
            s3Client.getObject(request);
            return true;
        } catch (S3Exception e) {
            if (e.getStatusCode() == 404) {
                return false;
            }
            throw new RuntimeException("Failed to check file existence: " + e.getMessage(), e);
        }
    }

    /**
     * Get file metadata
     */
    public String getFileMetadata(String key) {
        try {
            GetObjectRequest request = GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build();
            
            S3Object s3Object = s3Client.getObject(request);
            return s3Object.metadata().get("x-amz-meta-original-filename");
        } catch (S3Exception e) {
            log.error("Failed to get file metadata: {}", e.getMessage());
            throw new RuntimeException("Failed to get file metadata: " + e.getMessage(), e);
        }
    }

    /**
     * Validate file before upload
     */
    private void validateFile(String key, long contentLength, String contentType) {
        // Validate file size
        if (contentLength > MAX_FILE_SIZE) {
            throw new IllegalArgumentException(
                String.format("File size exceeds maximum allowed size of %d bytes", MAX_FILE_SIZE)
            );
        }

        // Validate content type
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException(
                String.format("File type '%s' is not allowed. Allowed types: %s", 
                    contentType, String.join(", ", ALLOWED_CONTENT_TYPES))
            );
        }

        // Validate key (no path traversal)
        if (key.contains("..") || key.startsWith("/") || key.contains("//")) {
            throw new IllegalArgumentException("Invalid file key: " + key);
        }

        log.debug("File validation passed: key={}, size={}, type={}", key, contentLength, contentType);
    }

    /**
     * Generate metadata for S3 object
     */
    private java.util.Map<String, String> getMetadata(String key) {
        java.util.Map<String, String> metadata = new java.util.HashMap<>();
        metadata.put("x-amz-meta-original-filename", key);
        metadata.put("uploaded-by", "FutureVest");
        metadata.put("uploaded-at", new Date().toString());
        metadata.put("content-type", "application/octet-stream");
        return metadata;
    }

    /**
     * Generate unique file key
     */
    public String generateFileKey(String originalFilename) {
        String sanitizedFilename = sanitizeFilename(originalFilename);
        String extension = "";
        
        if (sanitizedFilename.contains(".")) {
            extension = sanitizedFilename.substring(sanitizedFilename.lastIndexOf("."));
            sanitizedFilename = sanitizedFilename.substring(0, sanitizedFilename.lastIndexOf("."));
        }
        
        String timestamp = new Date().getTime() + "";
        String uuid = UUID.randomUUID().toString();
        
        return String.format("%s/%s_%s_%s%s", 
                timestamp.substring(0, 8), 
                uuid.substring(0, 8),
                sanitizedFilename,
                extension);
    }

    /**
     * Sanitize filename to prevent path traversal
     */
    private String sanitizeFilename(String filename) {
        // Remove path separators
        String sanitized = filename.replaceAll("[/\\\\]", "_");
        
        // Remove special characters except dots, hyphens, and underscores
        sanitized = sanitized.replaceAll("[^a-zA-Z0-9._-]", "_");
        
        // Convert to lowercase
        sanitized = sanitized.toLowerCase();
        
        // Remove consecutive underscores
        sanitized = sanitized.replaceAll("_+", "_");
        
        // Remove leading and trailing underscores
        sanitized = sanitized.replaceAll("^_+|_+$", "");
        
        return sanitized;
    }

    /**
     * Get file content type from filename
     */
    public String getContentType(String filename) {
        String extension = "";
        if (filename.contains(".")) {
            extension = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
        }
        
        switch (extension) {
            case "jpg":
            return "image/jpeg";
            case "jpeg":
                return "image/jpeg";
            case "png":
                return "image/png";
            case "gif":
                return "image/gif";
            case "webp":
                return "image/webp";
            case "pdf":
                return "application/pdf";
            case "doc":
                return "application/msword";
            case "docx":
                return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "xls":
                return "application/vnd.ms-excel";
            case "xlsx":
                return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case "txt":
                return "text/plain";
            case "csv":
                return "text/csv";
            case "json":
                return "application/json";
            default:
                return "application/octet-stream";
        }
    }

    /**
     * Get file size in human readable format
     */
    public String getFormattedFileSize(long bytes) {
        if (bytes < 1024) {
            return bytes + " B";
        } else if (bytes < 1024 * 1024) {
            return String.format("%.1f KB", bytes / 1024.0);
        } else if (bytes < 1024 * 1024 * 1024) {
            return String.format("%.1f MB", bytes / (1024.0 * 1024.0));
        } else {
            return String.format("%.1f GB", bytes / (1024.0 * 1024.0 * 1024.0));
        }
    }

    /**
     * Check if file type is an image
     */
    public boolean isImageFile(String contentType) {
        return contentType != null && contentType.startsWith("image/");
    }

    /**
     * Check if file type is a document
     */
    public boolean isDocumentFile(String contentType) {
        return contentType != null && (
            contentType.equals("application/pdf") ||
            contentType.contains("word") ||
            contentType.contains("excel") ||
            contentType.contains("powerpoint") ||
            contentType.equals("text/plain") ||
            contentType.equals("text/csv")
        );
    }

    /**
     * Get file extension from content type
     */
    public String getFileExtension(String contentType) {
        if (contentType == null) return "";
        
        if (contentType.equals("image/jpeg") || contentType.equals("image/jpg")) return ".jpg";
        if (contentType.equals("image/png")) return ".png";
        if (contentType.equals("image/gif")) return ".gif";
        if (contentType.equals("image/webp")) return ".webp";
        if (contentType.equals("application/pdf")) return ".pdf";
        if (contentType.contains("word")) return ".docx";
        if (contentType.contains("excel")) return ".xlsx";
        if (contentType.equals("text/plain")) return ".txt";
        if (contentType.equals("text/csv")) return ".csv";
        if (contentType.equals("application/json")) return ".json";
        
        return "";
    }
}
