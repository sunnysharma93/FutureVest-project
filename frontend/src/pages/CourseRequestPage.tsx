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
  Alert,
  CircularProgress,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  School,
  Description,
  Category,
  Timer,
  AttachMoney,
  Send,
  ArrowBack,
  Info,
  CheckCircle,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useApi } from '../hooks/useApi';
import { CourseRequest } from '../types';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Validation schema
const courseRequestSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must not exceed 200 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must not exceed 1000 characters'),
  provider: z.enum(['UDEMY', 'COURSERA', 'LINKEDIN', 'OTHER']),
  category: z.string()
    .min(2, 'Category is required'),
  durationInHours: z.number()
    .min(1, 'Duration must be at least 1 hour')
    .max(1000, 'Duration must not exceed 1000 hours')
    .optional(),
  externalCourseId: z.string()
    .max(100, 'External course ID must not exceed 100 characters')
    .optional(),
  justification: z.string()
    .max(500, 'Justification must not exceed 500 characters')
    .optional(),
});

type CourseRequestFormData = z.infer<typeof courseRequestSchema>;

const CourseRequestPage: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [submittedCourse, setSubmittedCourse] = useState<any>(null);

  // Fetch available categories and providers
  const { data: categories, isLoading: categoriesLoading } = useApi<string[]>('/courses/categories');
  const { data: providers, isLoading: providersLoading } = useApi<string[]>('/courses/providers');

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
    watch,
    trigger,
  } = useForm<CourseRequestFormData>({
    resolver: zodResolver(courseRequestSchema),
    mode: 'onChange',
  });

  const selectedProvider = watch('provider');
  const selectedCategory = watch('category');

  const steps = ['Course Details', 'Additional Information', 'Review & Submit'];

  const nextStep = useCallback(async () => {
    let fieldsToValidate: (keyof CourseRequestFormData)[] = [];
    
    switch (currentStep) {
      case 0:
        fieldsToValidate = ['title', 'description', 'provider', 'category'];
        break;
      case 1:
        fieldsToValidate = ['durationInHours'];
        break;
      case 2:
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

  const onSubmit = useCallback(async (data: CourseRequestFormData) => {
    try {
      // This would integrate with the actual API
      const response = await fetch('/api/v1/courses/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to submit course request');
      }

      const result = await response.json();
      setSubmittedCourse(result);
      setCurrentStep(3); // Move to success step
      setSuccessMessage('Course request submitted successfully!');
    } catch (error) {
      console.error('Error submitting course request:', error);
    }
  }, []);

  const handlePaymentIntent = useCallback(() => {
    if (submittedCourse) {
      navigate(`/payment/create?courseId=${submittedCourse.id}&amount=${submittedCourse.cost || 0}`);
    }
  }, [submittedCourse, navigate]);

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
                    label="Course Title"
                    placeholder="Enter the course title"
                    error={!!errors.title}
                    helperText={errors.title?.message}
                    InputProps={{
                      startAdornment: <School sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    inputProps={{
                      'aria-label': 'Course title',
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
                    rows={4}
                    label="Course Description"
                    placeholder="Describe what this course covers and why you want to take it"
                    error={!!errors.description}
                    helperText={errors.description?.message}
                    InputProps={{
                      startAdornment: <Description sx={{ mr: 1, color: 'text.secondary', alignSelf: 'flex-start', mt: 2 }} />,
                    }}
                    inputProps={{
                      'aria-label': 'Course description',
                      'aria-required': 'true',
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="provider"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.provider}>
                    <InputLabel id="provider-label">Course Provider</InputLabel>
                    <Select
                      {...field}
                      labelId="provider-label"
                      label="Course Provider"
                      disabled={providersLoading}
                      inputProps={{
                        'aria-label': 'Course provider',
                        'aria-required': 'true',
                      }}
                    >
                      {providers?.map((provider) => (
                        <MenuItem key={provider} value={provider}>
                          {provider}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.provider && (
                      <Typography variant="caption" color="error">
                        {errors.provider.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.category}>
                    <InputLabel id="category-label">Category</InputLabel>
                    <Select
                      {...field}
                      labelId="category-label"
                      label="Category"
                      disabled={categoriesLoading}
                      inputProps={{
                        'aria-label': 'Course category',
                        'aria-required': 'true',
                      }}
                    >
                      {categories?.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.category && (
                      <Typography variant="caption" color="error">
                        {errors.category.message}
                      </Typography>
                    )}
                  </FormControl>
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
                name="durationInHours"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Duration (hours)"
                    placeholder="Estimated course duration"
                    error={!!errors.durationInHours}
                    helperText={errors.durationInHours?.message}
                    InputProps={{
                      startAdornment: <Timer sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    inputProps={{
                      'aria-label': 'Course duration in hours',
                      min: 1,
                      max: 1000,
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="externalCourseId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="External Course ID (Optional)"
                    placeholder="Course ID from provider platform"
                    error={!!errors.externalCourseId}
                    helperText={errors.externalCourseId?.message || 'Optional: Course ID from Udemy, Coursera, etc.'}
                    inputProps={{
                      'aria-label': 'External course ID',
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="justification"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    rows={3}
                    label="Justification (Optional)"
                    placeholder="Why do you want to take this course? How will it help your career?"
                    error={!!errors.justification}
                    helperText={errors.justification?.message || 'Explain why this course is important for your education/career'}
                    InputProps={{
                      startAdornment: <Info sx={{ mr: 1, color: 'text.secondary', alignSelf: 'flex-start', mt: 2 }} />,
                    }}
                    inputProps={{
                      'aria-label': 'Course justification',
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Note:</strong> Course requests are reviewed by our team. Once approved, 
                  you'll be able to proceed with payment and enrollment.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Your Course Request
            </Typography>

            <Paper sx={{ p: 3, mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Course Title
                  </Typography>
                  <Typography variant="body1">
                    {watch('title')}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1">
                    {watch('description')}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Provider
                  </Typography>
                  <Chip label={watch('provider')} size="small" />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Category
                  </Typography>
                  <Chip label={watch('category')} size="small" color="primary" />
                </Grid>

                {watch('durationInHours') && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Duration
                    </Typography>
                    <Typography variant="body1">
                      {watch('durationInHours')} hours
                    </Typography>
                  </Grid>
                )}

                {watch('externalCourseId') && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      External Course ID
                    </Typography>
                    <Typography variant="body1">
                      {watch('externalCourseId')}
                    </Typography>
                  </Grid>
                )}

                {watch('justification') && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Justification
                    </Typography>
                    <Typography variant="body1">
                      {watch('justification')}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>

            <Alert severity="success">
              <Typography variant="body2">
                By submitting this request, you agree to our terms of service. 
                The course will be reviewed and you'll be notified once it's available for enrollment.
              </Typography>
            </Alert>
          </Box>
        );

      case 3:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Course Request Submitted!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Your course request has been submitted successfully. Our team will review it and you'll be notified once it's approved.
            </Typography>
            
            {submittedCourse && (
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={handlePaymentIntent}
                  startIcon={<AttachMoney />}
                  sx={{ mr: 2 }}
                >
                  Proceed to Payment
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/courses')}
                  startIcon={<ArrowBack />}
                >
                  Back to Courses
                </Button>
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  }, [currentStep, control, errors, watch, categories, providers, trigger, submittedCourse, handlePaymentIntent, navigate]);

  if (!isAuthenticated) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6">Please log in to request courses</Typography>
        <Button variant="contained" onClick={() => navigate('/login')} sx={{ mt: 2 }}>
          Login
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Request a Course
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Can't find the course you're looking for? Request it here and we'll make it available for you.
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

          {categoriesLoading || providersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {renderStepContent()}

              {currentStep < 3 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                  <Button
                    disabled={currentStep === 0}
                    onClick={prevStep}
                    variant="outlined"
                  >
                    Previous
                  </Button>

                  {currentStep === 2 ? (
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={!isValid || !isDirty}
                      startIcon={<Send />}
                    >
                      Submit Request
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
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default CourseRequestPage;
