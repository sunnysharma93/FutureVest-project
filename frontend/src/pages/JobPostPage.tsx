import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Divider,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Work,
  Business,
  AttachMoney,
  Description,
  LocationOn,
  AccessTime,
  Send,
  ArrowBack,
  CheckCircle,
  Category,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Validation schema
const jobPostSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must not exceed 200 characters'),
  description: z.string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must not exceed 2000 characters'),
  companyName: z.string()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name must not exceed 100 characters'),
  location: z.string()
    .min(2, 'Location is required')
    .max(100, 'Location must not exceed 100 characters'),
  jobType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']),
  workMode: z.enum(['REMOTE', 'HYBRID', 'ONSITE']),
  salaryMin: z.number()
    .min(0, 'Minimum salary must be non-negative')
    .max(1000000, 'Minimum salary is too high'),
  salaryMax: z.number()
    .min(0, 'Maximum salary must be non-negative')
    .max(1000000, 'Maximum salary is too high'),
  requiredSkills: z.string()
    .min(2, 'Required skills are required')
    .max(500, 'Required skills must not exceed 500 characters'),
  experienceLevel: z.string()
    .max(50, 'Experience level must not exceed 50 characters')
    .optional(),
});

type JobPostFormData = z.infer<typeof jobPostSchema>;

const JobPostPage: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [postedJob, setPostedJob] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
    watch,
    trigger,
    setValue,
  } = useForm<JobPostFormData>({
    resolver: zodResolver(jobPostSchema),
    mode: 'onChange',
    defaultValues: {
      jobType: 'FULL_TIME',
      workMode: 'HYBRID',
      experienceLevel: 'Mid-Level',
    },
  });

  const salaryMin = watch('salaryMin');
  const salaryMax = watch('salaryMax');

  const steps = ['Basic Information', 'Job Details', 'Compensation', 'Review & Post'];

  const nextStep = useCallback(async () => {
    let fieldsToValidate: (keyof JobPostFormData)[] = [];
    
    switch (currentStep) {
      case 0:
        fieldsToValidate = ['title', 'description', 'companyName', 'location'];
        break;
      case 1:
        fieldsToValidate = ['jobType', 'workMode', 'requiredSkills'];
        break;
      case 2:
        fieldsToValidate = ['salaryMin', 'salaryMax'];
        break;
      case 3:
        // No validation needed for review step
        break;
    }

    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, trigger]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => prev - 1);
  }, []);

  const onSubmit = useCallback(async (data: JobPostFormData) => {
    try {
      setIsSubmitting(true);

      // This would integrate with the actual API
      const response = await fetch('/api/v1/jobs/post-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to post job');
      }

      const result = await response.json();
      setPostedJob(result);
      setCurrentStep(4); // Move to success step
      setSuccessMessage('Job posted successfully!');
    } catch (error) {
      console.error('Error posting job:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleViewPostedJob = useCallback(() => {
    if (postedJob) {
      navigate(`/jobs/${postedJob.id}`);
    }
  }, [postedJob, navigate]);

  const handlePostAnother = useCallback(() => {
    reset();
    setCurrentStep(0);
    setPostedJob(null);
    setSuccessMessage('');
  }, [reset]);

  const renderStepContent = useCallback(() => {
    switch (currentStep) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Job Title"
                    placeholder="Enter a clear, descriptive job title"
                    error={!!errors.title}
                    helperText={errors.title?.message}
                    InputProps={{
                      startAdornment: <Work sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    inputProps={{
                      'aria-label': 'Job title',
                      'aria-required': 'true',
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    rows={6}
                    label="Job Description"
                    placeholder="Provide a detailed description of the role, responsibilities, and what you're looking for in a candidate"
                    error={!!errors.description}
                    helperText={errors.description?.message}
                    InputProps={{
                      startAdornment: <Description sx={{ mr: 1, color: 'text.secondary', alignSelf: 'flex-start', mt: 2 }} />,
                    }}
                    inputProps={{
                      'aria-label': 'Job description',
                      'aria-required': 'true',
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="companyName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Company Name"
                    placeholder="Your company or organization name"
                    error={!!errors.companyName}
                    helperText={errors.companyName?.message}
                    InputProps={{
                      startAdornment: <Business sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    inputProps={{
                      'aria-label': 'Company name',
                      'aria-required': 'true',
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="location"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Location"
                    placeholder="City, State or Remote"
                    error={!!errors.location}
                    helperText={errors.location?.message}
                    InputProps={{
                      startAdornment: <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    inputProps={{
                      'aria-label': 'Job location',
                      'aria-required': 'true',
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Controller
                name="jobType"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.jobType}>
                    <InputLabel id="jobtype-label">Job Type</InputLabel>
                    <Select
                      {...field}
                      labelId="jobtype-label"
                      label="Job Type"
                      inputProps={{
                        'aria-label': 'Job type',
                        'aria-required': 'true',
                      }}
                    >
                      <MenuItem value="FULL_TIME">Full Time</MenuItem>
                      <MenuItem value="PART_TIME">Part Time</MenuItem>
                      <MenuItem value="CONTRACT">Contract</MenuItem>
                      <MenuItem value="INTERNSHIP">Internship</MenuItem>
                    </Select>
                    {errors.jobType && (
                      <Typography variant="caption" color="error">
                        {errors.jobType.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="workMode"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.workMode}>
                    <InputLabel id="workmode-label">Work Mode</InputLabel>
                    <Select
                      {...field}
                      labelId="workmode-label"
                      label="Work Mode"
                      inputProps={{
                        'aria-label': 'Work mode',
                        'aria-required': 'true',
                      }}
                    >
                      <MenuItem value="REMOTE">Remote</MenuItem>
                      <MenuItem value="HYBRID">Hybrid</MenuItem>
                      <MenuItem value="ONSITE">On-site</MenuItem>
                    </Select>
                    {errors.workMode && (
                      <Typography variant="caption" color="error">
                        {errors.workMode.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="requiredSkills"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    rows={3}
                    label="Required Skills"
                    placeholder="List the key skills and qualifications required for this role (comma-separated)"
                    error={!!errors.requiredSkills}
                    helperText={errors.requiredSkills?.message || 'e.g., React, TypeScript, Node.js, AWS'}
                    InputProps={{
                      startAdornment: <Category sx={{ mr: 1, color: 'text.secondary', alignSelf: 'flex-start', mt: 2 }} />,
                    }}
                    inputProps={{
                      'aria-label': 'Required skills',
                      'aria-required': 'true',
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="experienceLevel"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Experience Level (Optional)"
                    placeholder="e.g., Entry Level, Mid-Level, Senior"
                    error={!!errors.experienceLevel}
                    helperText={errors.experienceLevel?.message || 'Specify the desired experience level'}
                    InputProps={{
                      startAdornment: <AccessTime sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    inputProps={{
                      'aria-label': 'Experience level',
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Controller
                name="salaryMin"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Minimum Salary"
                    placeholder="Minimum annual salary"
                    error={!!errors.salaryMin}
                    helperText={errors.salaryMin?.message}
                    InputProps={{
                      startAdornment: <AttachMoney sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    inputProps={{
                      'aria-label': 'Minimum salary',
                      'aria-required': 'true',
                      min: 0,
                      max: 1000000,
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="salaryMax"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Maximum Salary"
                    placeholder="Maximum annual salary"
                    error={!!errors.salaryMax}
                    helperText={errors.salaryMax?.message}
                    InputProps={{
                      startAdornment: <AttachMoney sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    inputProps={{
                      'aria-label': 'Maximum salary',
                      'aria-required': 'true',
                      min: 0,
                      max: 1000000,
                    }}
                  />
                )}
              />
            </Grid>

            {salaryMin && salaryMax && salaryMin > salaryMax && (
              <Grid item xs={12}>
                <Alert severity="warning">
                  Minimum salary should not be greater than maximum salary.
                </Alert>
              </Grid>
            )}

            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Salary Guidelines:</strong>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Be competitive with market rates</li>
                    <li>Consider experience level and location</li>
                    <li>Include benefits and bonuses if applicable</li>
                    <li>Be transparent about the compensation structure</li>
                  </ul>
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Your Job Posting
            </Typography>

            <Paper sx={{ p: 3, mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Job Title
                  </Typography>
                  <Typography variant="body1">
                    {watch('title')}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Company
                  </Typography>
                  <Typography variant="body1">
                    {watch('companyName')}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Location
                  </Typography>
                  <Typography variant="body1">
                    {watch('location')}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Job Type
                  </Typography>
                  <Chip label={watch('jobType').replace('_', ' ')} size="small" />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Work Mode
                  </Typography>
                  <Chip label={watch('workMode')} size="small" color="primary" />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Salary Range
                  </Typography>
                  <Typography variant="body1">
                    ${salaryMin?.toLocaleString()} - ${salaryMax?.toLocaleString()}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Required Skills
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {watch('requiredSkills')?.split(',').map((skill, index) => (
                      <Chip key={index} label={skill.trim()} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Grid>

                {watch('experienceLevel') && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Experience Level
                    </Typography>
                    <Typography variant="body1">
                      {watch('experienceLevel')}
                    </Typography>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1">
                    {watch('description')}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            <Alert severity="success">
              <Typography variant="body2">
                <strong>Important:</strong> By posting this job, you agree to our terms of service. 
                The job will be visible to qualified candidates and you'll receive applications directly.
              </Typography>
            </Alert>
          </Box>
        );

      case 4:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Job Posted Successfully!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Your job posting has been successfully published and is now visible to qualified candidates.
            </Typography>
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={handleViewPostedJob}
                startIcon={<Work />}
              >
                View Job
              </Button>
              <Button
                variant="outlined"
                onClick={handlePostAnother}
                startIcon={<Send />}
              >
                Post Another Job
              </Button>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  }, [currentStep, control, errors, watch, salaryMin, salaryMax, trigger, postedJob, handleViewPostedJob, handlePostAnother]);

  if (!isAuthenticated) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6">Please log in to post jobs</Typography>
        <Button variant="contained" onClick={() => navigate('/login')} sx={{ mt: 2 }}>
          Login
        </Button>
      </Box>
    );
  }

  if (user?.role !== 'INVESTOR' && user?.role !== 'COMPANY') {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6">Access denied</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Only investors and companies can post jobs.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/dashboard')} sx={{ mt: 2 }}>
          Go to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Post a Job
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Reach qualified candidates by posting your job opportunity on FutureVest.
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 4 }}>
          <Stepper activeStep={currentStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {renderStepContent()}

            {currentStep < 4 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  disabled={currentStep === 0}
                  onClick={prevStep}
                  variant="outlined"
                >
                  Previous
                </Button>

                {currentStep === 3 ? (
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!isValid || !isDirty || isSubmitting}
                    startIcon={isSubmitting ? <CircularProgress size={20} /> : <Send />}
                  >
                    {isSubmitting ? 'Posting...' : 'Post Job'}
                  </Button>
                ) : (
                  <Button
                    onClick={nextStep}
                    variant="contained"
                  >
                    Next
                  </Button>
                )}
              </Box>
            )}
          </form>
        </CardContent>
      </Card>

      {isSubmitting && (
        <LoadingSpinner message="Posting your job..." fullScreen />
      )}
    </Container>
  );
};

export default JobPostPage;
