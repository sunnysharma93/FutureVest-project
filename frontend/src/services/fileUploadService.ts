import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from 'react-toastify';

export interface FileUploadResponse {
  id: string;
  filename: string;
  originalName: string;
  contentType: string;
  size: number;
  url: string;
  uploadedAt: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

class FileUploadService {
  private readonly API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

  // Upload single file
  async uploadFile(
    file: File,
    onProgress?: (progress: UploadProgress) => void,
    additionalData?: Record<string, any>
  ): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    // Add additional data if provided
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress: UploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
          };
          onProgress(progress);
        }
      },
    };

    try {
      const response: AxiosResponse<FileUploadResponse> = await axios.post(
        `${this.API_BASE_URL}/files/upload`,
        formData,
        config
      );

      return response.data;
    } catch (error) {
      console.error('File upload error:', error);
      throw this.handleError(error);
    }
  }

  // Upload multiple files
  async uploadMultipleFiles(
    files: File[],
    onProgress?: (progress: UploadProgress) => void,
    additionalData?: Record<string, any>
  ): Promise<FileUploadResponse[]> {
    const formData = new FormData();
    
    files.forEach((file, index) => {
      formData.append(`files`, file);
    });

    // Add additional data if provided
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress: UploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
          };
          onProgress(progress);
        }
      },
    };

    try {
      const response: AxiosResponse<FileUploadResponse[]> = await axios.post(
        `${this.API_BASE_URL}/files/upload-multiple`,
        formData,
        config
      );

      return response.data;
    } catch (error) {
      console.error('Multiple file upload error:', error);
      throw this.handleError(error);
    }
  }

  // Upload resume
  async uploadResume(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileUploadResponse> {
    return this.uploadFile(file, onProgress, { type: 'resume' });
  }

  // Upload Aadhaar
  async uploadAadhaar(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileUploadResponse> {
    return this.uploadFile(file, onProgress, { type: 'aadhaar' });
  }

  // Upload course document
  async uploadCourseDocument(
    file: File,
    courseId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileUploadResponse> {
    return this.uploadFile(file, onProgress, { type: 'course', courseId });
  }

  // Upload job document
  async uploadJobDocument(
    file: File,
    jobId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileUploadResponse> {
    return this.uploadFile(file, onProgress, { type: 'job', jobId });
  }

  // Get file info
  async getFileInfo(fileId: string): Promise<FileUploadResponse> {
    try {
      const response: AxiosResponse<FileUploadResponse> = await axios.get(
        `${this.API_BASE_URL}/files/${fileId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Get file info error:', error);
      throw this.handleError(error);
    }
  }

  // Download file
  async downloadFile(fileId: string): Promise<Blob> {
    try {
      const response: AxiosResponse<Blob> = await axios.get(
        `${this.API_BASE_URL}/files/${fileId}/download`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          responseType: 'blob',
        }
      );

      return response.data;
    } catch (error) {
      console.error('Download file error:', error);
      throw this.handleError(error);
    }
  }

  // Delete file
  async deleteFile(fileId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.API_BASE_URL}/files/${fileId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
    } catch (error) {
      console.error('Delete file error:', error);
      throw this.handleError(error);
    }
  }

  // Get file URL
  getFileUrl(fileId: string): string {
    return `${this.API_BASE_URL}/files/${fileId}/view`;
  }

  // Get download URL
  getDownloadUrl(fileId: string): string {
    return `${this.API_BASE_URL}/files/${fileId}/download`;
  }

  // Validate file before upload
  validateFile(file: File, maxSize: number = 5 * 1024 * 1024, allowedTypes: string[] = []): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit`,
      };
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type "${file.type}" is not allowed`,
      };
    }

    return { valid: true };
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get file type icon
  getFileTypeIcon(contentType: string): string {
    if (contentType.startsWith('image/')) {
      return 'image';
    } else if (contentType === 'application/pdf') {
      return 'pdf';
    } else if (contentType.includes('word') || contentType.includes('document')) {
      return 'document';
    } else if (contentType.includes('excel') || contentType.includes('spreadsheet')) {
      return 'spreadsheet';
    } else if (contentType === 'text/plain') {
      return 'text';
    } else {
      return 'file';
    }
  }

  // Get file type label
  getFileTypeLabel(contentType: string): string {
    const typeMap: Record<string, string> = {
      'image/jpeg': 'JPEG',
      'image/png': 'PNG',
      'image/gif': 'GIF',
      'image/webp': 'WebP',
      'application/pdf': 'PDF',
      'text/plain': 'TXT',
      'application/msword': 'DOC',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'application/vnd.ms-excel': 'XLS',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
      'application/json': 'JSON',
    };
    return typeMap[contentType] || contentType.split('/')[1]?.toUpperCase() || 'FILE';
  }

  // Check if file is an image
  isImageFile(contentType: string): boolean {
    return contentType.startsWith('image/');
  }

  // Check if file is a document
  isDocumentFile(contentType: string): boolean {
    return contentType === 'application/pdf' ||
           contentType.includes('word') ||
           contentType.includes('excel') ||
           contentType.includes('powerpoint') ||
           contentType === 'text/plain';
  }

  // Generate preview URL for image files
  generatePreviewUrl(file: File): string {
    if (this.isImageFile(file.type)) {
      return URL.createObjectURL(file);
    }
    return '';
  }

  // Revoke preview URL
  revokePreviewUrl(url: string): void {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  // Handle API errors
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error;
      
      if (axiosError.response) {
        // Server responded with error status
        const status = axiosError.response.status;
        const data = axiosError.response.data;
        
        switch (status) {
          case 400:
            return new Error(data.message || 'Invalid request');
          case 401:
            return new Error('Unauthorized - Please login again');
          case 403:
            return new Error('Forbidden - You don\'t have permission to upload files');
          case 413:
            return new Error('File too large');
          case 415:
            return new Error('Unsupported file type');
          case 429:
            return new Error('Too many upload requests - Please try again later');
          case 500:
            return new Error('Server error - Please try again later');
          default:
            return new Error(data.message || `Upload failed with status ${status}`);
        }
      } else if (axiosError.request) {
        // Network error
        return new Error('Network error - Please check your internet connection');
      } else {
        // Other error
        return new Error('Upload failed - Please try again');
      }
    } else {
      return new Error('Upload failed - Please try again');
    }
  }

  // Upload with retry mechanism
  async uploadWithRetry(
    file: File,
    maxRetries: number = 3,
    onProgress?: (progress: UploadProgress) => void,
    additionalData?: Record<string, any>
  ): Promise<FileUploadResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.uploadFile(file, onProgress, additionalData);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Upload failed');
        
        if (attempt < maxRetries) {
          console.warn(`Upload attempt ${attempt} failed, retrying...`, error);
          // Exponential backoff
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Upload failed after multiple attempts');
  }

  // Batch upload multiple files with progress tracking
  async batchUpload(
    files: File[],
    onProgress?: (progress: { current: number; total: number; percentage: number }) => void,
    additionalData?: Record<string, any>
  ): Promise<FileUploadResponse[]> {
    const results: FileUploadResponse[] = [];
    const totalFiles = files.length;
    
    for (let i = 0; i < files.length; i++) {
      try {
        const result = await this.uploadFile(
          files[i],
          (fileProgress) => {
            if (onProgress) {
              const overallProgress = {
                current: i,
                total: totalFiles,
                percentage: Math.round(((i + fileProgress.percentage / 100) / totalFiles) * 100),
              };
              onProgress(overallProgress);
            }
          },
          additionalData
        );
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload file ${files[i].name}:`, error);
        // Continue with other files even if one fails
      }
    }
    
    return results;
  }

  // Mock upload for testing
  async mockUpload(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileUploadResponse> {
    return new Promise((resolve, reject) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        
        if (onProgress) {
          onProgress({
            loaded: (file.size * progress) / 100,
            total: file.size,
            percentage: progress,
          });
        }
        
        if (progress >= 100) {
          clearInterval(interval);
          
          // Simulate success
          resolve({
            id: 'mock-' + Date.now(),
            filename: 'mock-' + file.name,
            originalName: file.name,
            contentType: file.type,
            size: file.size,
            url: URL.createObjectURL(file),
            uploadedAt: new Date().toISOString(),
          });
        }
      }, 200);
    });
  }
}

// Create singleton instance
export const fileUploadService = new FileUploadService();

// Hook for using file upload service
export const useFileUpload = () => {
  return fileUploadService;
};

export default fileUploadService;
