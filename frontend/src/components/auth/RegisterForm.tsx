import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Grid,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Visibility,
  VisibilityOff,
  Person,
  Email,
  Lock,
  Description,
  AssignmentInd,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { UserRegistration } from '../../types';
import LoadingSpinner from '../ui/LoadingSpinner';

// Validation schema
const registrationSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  email: z.string()
    .email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 
           'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character'),
  role: z.enum(['USER', 'INVESTOR']),
  resume: z.any().optional(),
  aadhaar: z.any().optional(),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface RegisterFormProps {
  onSuccess?: () => void;
  defaultRole?: 'USER' | 'INVESTOR';
}

const RegisterForm: React.FC<RegisterFormProps> = ({ 
  onSuccess, 
  defaultRole = 'USER' 
}) => {
  const { registerUser, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [resumePreview, setResumePreview] = useState<string | null>(null);
  const [aadhaarPreview, setAadhaarPreview] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    trigger,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      role: defaultRole,
    },
    mode: 'onChange',
  });

  const selectedRole = watch('role');

  const steps = ['Personal Information', 'Security', 'Documents'];

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
      setValue('resume', file);
      trigger('resume');
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setResumePreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setResumePreview(null);
      }
    } else {
      setAadhaarFile(file);
      setValue('aadhaar', file);
      trigger('aadhaar');
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setAadhaarPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setAadhaarPreview(null);
      }
    }
  }, [setValue, trigger]);

  const removeFile = useCallback((fileType: 'resume' | 'aadhaar') => {
    if (fileType === 'resume') {
      setResumeFile(null);
      setResumePreview(null);
      setValue('resume', null);
    } else {
      setAadhaarFile(null);
      setAadhaarPreview(null);
      setValue('aadhaar', null);
    }
  }, [setValue]);

  const onSubmit = useCallback(async (data: RegistrationFormData) => {
    try {
      await registerUser({
        ...data,
        resume: resumeFile || undefined,
        aadhaar: aadhaarFile || undefined,
      });
      onSuccess?.();
    } catch (error) {
      // Error is handled by useAuth hook
    }
  }, [registerUser, resumeFile, aadhaarFile, onSuccess]);

  const nextStep = useCallback(async () => {
    let fieldsToValidate: (keyof RegistrationFormData)[] = [];
    
    switch (currentStep) {
      case 0:
        fieldsToValidate = ['name', 'email', 'role'];
        break;
      case 1:
        fieldsToValidate = ['password'];
        break;
      case 2:
        if (selectedRole === 'USER') {
          fieldsToValidate = ['resume', 'aadhaar'];
        }
        break;
    }

    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, selectedRole, trigger]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => prev - 1);
  }, []);

  const renderStepContent = useCallback(() => {
    switch (currentStep) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Full Name"
                    placeholder="Enter your full name"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    InputProps={{
                      startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    inputProps={{
                      'aria-label': 'Full name',
                      'aria-required': 'true',
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="email"
                    label="Email Address"
                    placeholder="Enter your email address"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    InputProps={{
                      startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    inputProps={{
                      'aria-label': 'Email address',
                      'aria-required': 'true',
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    fullWidth
                    label="Account Type"
                    error={!!errors.role}
                    helperText={errors.role?.message}
                    InputProps={{
                      startAdornment: <AssignmentInd sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    inputProps={{
                      'aria-label': 'Account type',
                      'aria-required': 'true',
                    }}
                  >
                    <option value="USER">Student</option>
                    <option value="INVESTOR">Investor</option>
                  </TextField>
                )}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type={showPassword ? 'text' : 'password'}
                    label="Password"
                    placeholder="Create a strong password"
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    InputProps={{
                      startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />,
                      endAdornment: (
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      ),
                    }}
                    inputProps={{
                      'aria-label': 'Password',
                      'aria-required': 'true',
                      'aria-describedby': 'password-helper-text',
                    }}
                  />
                )}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Password must contain at least 8 characters with uppercase, lowercase, digit, and special character
              </Typography>
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            {selectedRole === 'USER' && (
              <>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Resume (Optional)
                  </Typography>
                  <Box
                    sx={{
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 3,
                      textAlign: 'center',
                      bgcolor: 'background.paper',
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                      },
                    }}
                    component="label"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        document.getElementById('resume-upload')?.click();
                      }
                    }}
                    aria-label="Upload resume"
                  >
                    <input
                      id="resume-upload"
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => handleFileChange(e, 'resume')}
                      aria-label="Resume file input"
                    />
                    {resumeFile ? (
                      <Box>
                        <Description sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                        <Typography variant="body2" color="text.primary">
                          {resumeFile.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                        </Typography>
                        <IconButton
                          onClick={(e) => {
                            e.preventDefault();
                            removeFile('resume');
                          }}
                          color="error"
                          sx={{ mt: 1 }}
                          aria-label="Remove resume"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box>
                        <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          Click to upload or drag and drop
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          PDF, DOC, DOCX (MAX. 10MB)
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Aadhaar Card (Optional)
                  </Typography>
                  <Box
                    sx={{
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 3,
                      textAlign: 'center',
                      bgcolor: 'background.paper',
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                      },
                    }}
                    component="label"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        document.getElementById('aadhaar-upload')?.click();
                      }
                    }}
                    aria-label="Upload Aadhaar card"
                  >
                    <input
                      id="aadhaar-upload"
                      type="file"
                      hidden
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, 'aadhaar')}
                      aria-label="Aadhaar file input"
                    />
                    {aadhaarFile ? (
                      <Box>
                        <AssignmentInd sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                        <Typography variant="body2" color="text.primary">
                          {aadhaarFile.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(aadhaarFile.size / 1024 / 1024).toFixed(2)} MB
                        </Typography>
                        <IconButton
                          onClick={(e) => {
                            e.preventDefault();
                            removeFile('aadhaar');
                          }}
                          color="error"
                          sx={{ mt: 1 }}
                          aria-label="Remove Aadhaar card"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box>
                        <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          Click to upload or drag and drop
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          PDF, JPG, PNG (MAX. 10MB)
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
              </>
            )}
            
            {selectedRole === 'INVESTOR' && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    As an investor, you can upload your PAN card and other verification documents 
                    after registration in your profile settings.
                  </Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        );

      default:
        return null;
    }
  }, [currentStep, selectedRole, control, errors, showPassword, resumeFile, aadhaarFile, handleFileChange, removeFile, trigger]);

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Create Account
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
          Join FutureVest to access education funding opportunities
        </Typography>

        <Stepper activeStep={currentStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {renderStepContent()}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={currentStep === 0}
              onClick={prevStep}
              variant="outlined"
            >
              Previous
            </Button>

            {currentStep === steps.length - 1 ? (
              <Button
                type="submit"
                variant="contained"
                disabled={!isValid || isLoading}
                startIcon={isLoading ? <CircularProgress size={20} /> : null}
                aria-label="Complete registration"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                variant="contained"
                aria-label={`Go to ${steps[currentStep + 1]}`}
              >
                Next
              </Button>
            )}
          </Box>
        </form>

        {isLoading && (
          <Box sx={{ mt: 2 }}>
            <LoadingSpinner message="Creating your account..." overlay />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RegisterForm;
