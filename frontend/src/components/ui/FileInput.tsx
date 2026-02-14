import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  LinearProgress,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Visibility,
  InsertDriveFile,
  Image,
  Description,
  Error as ErrorIcon,
  Refresh,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';

interface FileInputProps {
  accept?: string[];
  maxSize?: number; // in bytes
  maxFiles?: number;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  description?: string;
  helperText?: string;
  required?: boolean;
  showPreview?: boolean;
  onUpload?: (files: File[]) => Promise<string[]>;
  onRemove?: (file: File) => void;
  onPreview?: (file: File) => void;
  className?: string;
  sx?: object;
}

interface UploadedFile {
  file: File;
  url?: string;
  progress?: number;
  error?: string;
  uploading?: boolean;
}

const FileInput: React.FC<FileInputProps> = ({
  accept = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'],
  maxSize = 5 * 1024 * 1024, // 5MB
  maxFiles = 1,
  multiple = false,
  disabled = false,
  label = 'Upload File',
  description = 'Drag and drop files here or click to browse',
  helperText = 'Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF (Max 5MB)',
  required = false,
  showPreview = true,
  onUpload,
  onRemove,
  onPreview,
  className,
  sx,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit`;
    }

    // Check file type
    if (accept.length > 0 && !accept.includes(file.type)) {
      return `File type "${file.type}" is not allowed`;
    }

    return null;
  }, [accept, maxSize]);

  const handleFileUpload = useCallback(async (files: File[]) => {
    if (disabled) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate files
    files.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    // Show validation errors
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }

    // Check max files limit
    if (!multiple && validFiles.length > 1) {
      toast.error('Only one file is allowed');
      return;
    }

    if (multiple && uploadedFiles.length + validFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Add files to upload queue
    const newUploadedFiles: UploadedFile[] = validFiles.map(file => ({
      file,
      progress: 0,
      uploading: true,
    }));

    setUploadedFiles(prev => {
      if (multiple) {
        return [...prev, ...newUploadedFiles];
      } else {
        return newUploadedFiles;
      }
    });

    // Upload files
    if (onUpload) {
      try {
        const uploadPromises = validFiles.map(async (file, index) => {
          try {
            const result = await onUpload([file]);
            
            // Update file status
            setUploadedFiles(prev => {
              const updatedFiles = [...prev];
              const fileIndex = multiple ? 
                uploadedFiles.length + index : 
                index;
              
              if (updatedFiles[fileIndex]) {
                updatedFiles[fileIndex] = {
                  ...updatedFiles[fileIndex],
                  url: result[0],
                  progress: 100,
                  uploading: false,
                };
              }
              
              return updatedFiles;
            });
            
            return result[0];
          } catch (error) {
            // Update file error status
            setUploadedFiles(prev => {
              const updatedFiles = [...prev];
              const fileIndex = multiple ? 
                uploadedFiles.length + index : 
                index;
              
              if (updatedFiles[fileIndex]) {
                updatedFiles[fileIndex] = {
                  ...updatedFiles[fileIndex],
                  error: error instanceof Error ? error.message : 'Upload failed',
                  uploading: false,
                };
              }
              
              return updatedFiles;
            });
            
            throw error;
          }
        });

        await Promise.all(uploadPromises);
        toast.success(`${validFiles.length} file(s) uploaded successfully`);
      } catch (error) {
        console.error('Upload failed:', error);
        toast.error('Upload failed');
      }
    } else {
      // Simulate upload progress
      validFiles.forEach((file, index) => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          
          setUploadedFiles(prev => {
            const updatedFiles = [...prev];
            const fileIndex = multiple ? uploadedFiles.length + index : index;
            
            if (updatedFiles[fileIndex]) {
              updatedFiles[fileIndex] = {
                ...updatedFiles[fileIndex],
                progress,
                uploading: progress < 100,
              };
            }
            
            return updatedFiles;
          });
          
          if (progress >= 100) {
            clearInterval(interval);
            
            // Create preview URL for images
            if (file.type.startsWith('image/')) {
              setUploadedFiles(prev => {
                const updatedFiles = [...prev];
                const fileIndex = multiple ? uploadedFiles.length + index : index;
                
                if (updatedFiles[fileIndex]) {
                  updatedFiles[fileIndex] = {
                    ...updatedFiles[fileIndex],
                    url: URL.createObjectURL(file),
                  };
                }
                
                return updatedFiles;
              });
            }
          }
        }, 100);
      });
    }
  }, [disabled, multiple, maxFiles, uploadedFiles.length, validateFile, onUpload]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setIsDragging(false);
    handleFileUpload(acceptedFiles);
  }, [handleFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    accept: accept.reduce((acc, type) => {
      const [mainType, subType] = type.split('/');
      acc[mainType] = [...(acc[mainType] || []], subType];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize,
    maxFiles: multiple ? maxFiles : 1,
    multiple,
    disabled,
  });

  const handleRemoveFile = useCallback((index: number) => {
    const fileToRemove = uploadedFiles[index];
    
    // Clean up preview URL if it exists
    if (fileToRemove.url && fileToRemove.url.startsWith('blob:')) {
      URL.revokeObjectURL(fileToRemove.url);
    }
    
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    
    if (onRemove) {
      onRemove(fileToRemove.file);
    }
    
    toast.info('File removed');
  }, [uploadedFiles, onRemove]);

  const handlePreview = useCallback((file: UploadedFile) => {
    if (onPreview) {
      onPreview(file.file);
    } else if (showPreview) {
      setPreviewFile(file.file);
      setShowPreviewDialog(true);
    }
  }, [onPreview, showPreview]);

  const handleRetryUpload = useCallback((index: number) => {
    const fileToRetry = uploadedFiles[index];
    handleFileUpload([fileToRetry.file]);
  }, [uploadedFiles, handleFileUpload]);

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image />;
    } else if (file.type === 'application/pdf') {
      return <Description />;
    } else {
      return <InsertDriveFile />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeLabel = (file: File) => {
    const typeMap: Record<string, string> = {
      'image/jpeg': 'JPEG',
      'image/png': 'PNG',
      'image/gif': 'GIF',
      'application/pdf': 'PDF',
      'text/plain': 'TXT',
      'application/msword': 'DOC',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    };
    return typeMap[file.type] || file.type.split('/')[1]?.toUpperCase() || 'FILE';
  };

  return (
    <Box className={className} sx={sx}>
      <Typography variant="subtitle1" gutterBottom>
        {label}
        {required && <span style={{ color: 'red' }}> *</span>}
      </Typography>
      
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
      )}

      {/* Dropzone */}
      <Paper
        {...getRootProps()}
        sx={{
          border: `2px dashed ${isDragActive ? 'primary.main' : 'grey.300'}`,
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s ease-in-out',
          opacity: disabled ? 0.5 : 1,
          '&:hover': {
            borderColor: disabled ? 'grey.300' : 'primary.main',
            bgcolor: disabled ? 'background.paper' : 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        
        <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Drop files here' : label}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {description}
        </Typography>
        
        <Button
          variant="outlined"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          Browse Files
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept.join(',')}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) {
              handleFileUpload(files);
            }
            e.target.value = '';
          }}
          style={{ display: 'none' }}
        />
      </Paper>

      {helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          {helperText}
        </Typography>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Uploaded Files ({uploadedFiles.length}/{maxFiles})
          </Typography>
          
          {uploadedFiles.map((uploadedFile, index) => (
            <Paper
              key={index}
              sx={{
                p: 2,
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                border: '1px solid',
                borderColor: uploadedFile.error ? 'error.main' : 'divider',
                bgcolor: uploadedFile.error ? 'error.light' : 'background.paper',
              }}
            >
              {/* File Icon */}
              {getFileIcon(uploadedFile.file)}
              
              {/* File Info */}
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {uploadedFile.file.name}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                  <Chip
                    label={getFileTypeLabel(uploadedFile.file)}
                    size="small"
                    variant="outlined"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(uploadedFile.file.size)}
                  </Typography>
                </Box>
                
                {/* Upload Progress */}
                {uploadedFile.uploading && (
                  <Box sx={{ mt: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={uploadedFile.progress || 0}
                      sx={{ height: 4, borderRadius: 2 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Uploading... {uploadedFile.progress}%
                    </Typography>
                  </Box>
                )}
                
                {/* Error Message */}
                {uploadedFile.error && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {uploadedFile.error}
                  </Alert>
                )}
              </Box>
              
              {/* Actions */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                {uploadedFile.url && showPreview && (
                  <Tooltip title="Preview">
                    <IconButton
                      size="small"
                      onClick={() => handlePreview(uploadedFile)}
                      color="primary"
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                )}
                
                {uploadedFile.error && (
                  <Tooltip title="Retry">
                    <IconButton
                      size="small"
                      onClick={() => handleRetryUpload(index)}
                      color="warning"
                    >
                      <Refresh />
                    </IconButton>
                  </Tooltip>
                )}
                
                <Tooltip title="Remove">
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveFile(index)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </Tooltip>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={showPreviewDialog}
        onClose={() => setShowPreviewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>File Preview</DialogTitle>
        <DialogContent>
          {previewFile && (
            <Box sx={{ textAlign: 'center' }}>
              {previewFile.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(previewFile)}
                  alt={previewFile.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <Box sx={{ py: 4 }}>
                  <InsertDriveFile sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6">{previewFile.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatFileSize(previewFile.size)}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreviewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FileInput;
