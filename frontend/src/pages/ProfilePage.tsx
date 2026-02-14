import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Grid,
  Paper,
  Avatar,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  CloudUpload,
  Delete,
  Visibility,
  Description,
  AssignmentInd,
  Email,
  Person,
  Lock,
  History,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useAuth } from '../hooks/useAuth';
import { User } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Validation schema
const profileSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  email: z.string()
    .email('Please enter a valid email address')
    .readonly(), // Email cannot be changed
});

type ProfileFormData = z.infer<typeof profileSchema>;

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { updateProfile, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
    setValue,
    trigger,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange',
  });

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
      });
    }
  }, [user, reset]);

  const handleFileChange = useCallback((
    event: React.ChangeEvent<HTMLInputElement>,
    fileType: 'resume' | 'aadhaar'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = fileType === 'resume' 
      ? ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      : ['application/pdf', 'image/jpeg', 'image/png'];

    if (!allowedTypes.includes(file.type)) {
      alert(`Invalid file type. Please upload a ${fileType === 'resume' ? 'PDF or Word document' : 'PDF, JPEG, or PNG image'}`);
      return;
    }

    if (fileType === 'resume') {
      setResumeFile(file);
    } else {
      setAadhaarFile(file);
    }
  }, []);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setSuccessMessage('');
  }, []);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    if (user) {
      reset({
        name: user.name,
        email: user.email,
      });
    }
    setResumeFile(null);
    setAadhaarFile(null);
    setUploadProgress(0);
  }, [user, reset]);

  const onSubmit = useCallback(async (data: ProfileFormData) => {
    try {
      await updateProfile(data);
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      // Error is handled by useAuth hook
    }
  }, [updateProfile]);

  const handleUploadFiles = useCallback(async () => {
    // This would integrate with a file upload service
    // For now, just simulate the upload
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    setTimeout(() => {
      setResumeFile(null);
      setAadhaarFile(null);
      setUploadProgress(0);
      setSuccessMessage('Files uploaded successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }, 2000);
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Typography variant="h6">Please log in to view your profile</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Profile
      </Typography>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Personal Information</Typography>
                {!isEditing ? (
                  <IconButton onClick={handleEdit} color="primary" aria-label="Edit profile">
                    <Edit />
                  </IconButton>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton onClick={handleCancel} color="error" aria-label="Cancel editing">
                      <Cancel />
                    </IconButton>
                    <IconButton 
                      onClick={handleSubmit(onSubmit)} 
                      color="success"
                      disabled={!isValid || !isDirty}
                      aria-label="Save changes"
                    >
                      <Save />
                    </IconButton>
                  </Box>
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ width: 80, height: 80, mr: 3, bgcolor: 'primary.main' }}>
                  {user.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h5">{user.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                  <Chip 
                    label={user.role} 
                    size="small" 
                    color="primary" 
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Box>

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="name"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Full Name"
                          disabled={!isEditing}
                          error={!isEditing && !!errors.name}
                          helperText={!isEditing && errors.name?.message}
                          InputProps={{
                            startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                            readOnly: !isEditing,
                          }}
                          inputProps={{
                            'aria-label': 'Full name',
                            'aria-readonly': !isEditing,
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="email"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Email Address"
                          disabled
                          InputProps={{
                            startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                            readOnly: true,
                          }}
                          inputProps={{
                            'aria-label': 'Email address',
                            'aria-readonly': true,
                          }}
                          helperText="Email cannot be changed"
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </form>

              <Divider sx={{ my: 3 }} />

              {/* Password Change */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1">Password</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last changed: Never
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<Lock />}
                  onClick={() => setShowPasswordDialog(true)}
                  aria-label="Change password"
                >
                  Change Password
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Documents */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom>
                Documents
              </Typography>

              {/* Resume */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Resume
                </Typography>
                {user.resumeUrl ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Description color="primary" />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      Resume uploaded
                    </Typography>
                    <IconButton size="small" aria-label="View resume">
                      <Visibility />
                    </IconButton>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 2,
                      textAlign: 'center',
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                      },
                    }}
                    component="label"
                  >
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => handleFileChange(e, 'resume')}
                    />
                    <CloudUpload sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      Upload Resume
                    </Typography>
                  </Box>
                )}
                {resumeFile && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {resumeFile.name}
                    </Typography>
                    <IconButton size="small" onClick={() => setResumeFile(null)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>

              {/* Aadhaar */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Aadhaar Card
                </Typography>
                {user.aadhaarUrl ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AssignmentInd color="primary" />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      Aadhaar uploaded
                    </Typography>
                    <IconButton size="small" aria-label="View Aadhaar">
                      <Visibility />
                    </IconButton>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 2,
                      textAlign: 'center',
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                      },
                    }}
                    component="label"
                  >
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, 'aadhaar')}
                    />
                    <CloudUpload sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      Upload Aadhaar
                    </Typography>
                  </Box>
                )}
                {aadhaarFile && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {aadhaarFile.name}
                    </Typography>
                    <IconButton size="small" onClick={() => setAadhaarFile(null)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>

              {(resumeFile || aadhaarFile) && (
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleUploadFiles}
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} /> : <CloudUpload />}
                  sx={{ mt: 2 }}
                >
                  {isLoading ? 'Uploading...' : 'Upload Files'}
                </Button>
              )}

              {uploadProgress > 0 && uploadProgress < 100 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Upload Progress: {uploadProgress}%
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Account Activity */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom>
                Account Activity
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Account Created"
                    secondary={new Date(user.createdAt).toLocaleDateString()}
                  />
                  <ListItemSecondaryAction>
                    <History color="action" />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Last Updated"
                    secondary={new Date(user.updatedAt).toLocaleDateString()}
                  />
                  <ListItemSecondaryAction>
                    <History color="action" />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Account Status"
                    secondary={user.enabled ? 'Active' : 'Inactive'}
                  />
                  <ListItemSecondaryAction>
                    <Chip 
                      label={user.enabled ? 'Active' : 'Inactive'} 
                      size="small" 
                      color={user.enabled ? 'success' : 'error'}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onClose={() => setShowPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter your current password and new password to update your credentials.
          </Typography>
          {/* Password change form would go here */}
          <Alert severity="info">
            Password change functionality will be implemented in a future update.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
          <Button variant="contained">Update Password</Button>
        </DialogActions>
      </Dialog>

      {isLoading && (
        <LoadingSpinner message="Updating profile..." fullScreen />
      )}
    </Box>
  );
};

export default ProfilePage;
