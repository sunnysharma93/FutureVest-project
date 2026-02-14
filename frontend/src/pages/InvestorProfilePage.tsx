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
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
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
  TrendingUp,
  AccountBalance,
  VerifiedUser,
  Pending,
  Gavel,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useAuth } from '../hooks/useAuth';
import { Investor, Payment } from '../types';
import { usePaginatedApi } from '../hooks/useApi';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Validation schema
const investorProfileSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  email: z.string()
    .email('Please enter a valid email address')
    .readonly(), // Email cannot be changed
  totalInvestment: z.number()
    .min(0, 'Total investment must be non-negative')
    .optional(),
});

type InvestorProfileFormData = z.infer<typeof investorProfileSchema>;

const InvestorProfilePage: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { updateProfile, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [panCardFile, setPanCardFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch investor's payments/investments
  const { 
    data: paymentsData, 
    isLoading: paymentsLoading, 
    execute: fetchPayments 
  } = usePaginatedApi<Payment>('/payments/investor', {}, { immediate: false });

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
    setValue,
    trigger,
  } = useForm<InvestorProfileFormData>({
    resolver: zodResolver(investorProfileSchema),
    mode: 'onChange',
  });

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        totalInvestment: 0, // This would come from investor data
      });
    }
  }, [user, reset]);

  // Fetch payments when component mounts
  useEffect(() => {
    if (isAuthenticated && user?.role === 'INVESTOR') {
      fetchPayments();
    }
  }, [isAuthenticated, user, fetchPayments]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please upload a PDF, JPEG, or PNG image');
      return;
    }

    setPanCardFile(file);
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
        totalInvestment: 0,
      });
    }
    setPanCardFile(null);
    setUploadProgress(0);
  }, [user, reset]);

  const onSubmit = useCallback(async (data: InvestorProfileFormData) => {
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

  const handleUploadPanCard = useCallback(async () => {
    // This would integrate with a file upload service
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
      setPanCardFile(null);
      setUploadProgress(0);
      setSuccessMessage('PAN card uploaded successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }, 2000);
  }, []);

  // Mock investor data (in real app, this would come from API)
  const investorData: Partial<Investor> = {
    verificationStatus: 'VERIFIED',
    totalInvestment: 150000,
    enabled: true,
  };

  // Mock payments data
  const mockPayments: Payment[] = [
    {
      id: '1',
      userId: 'user1',
      investorId: user?.id || '',
      courseId: 'course1',
      amount: 25000,
      status: 'COMPLETED',
      paymentMethod: 'RAZORPAY',
      createdAt: new Date('2024-01-15').toISOString(),
      updatedAt: new Date('2024-01-15').toISOString(),
    },
    {
      id: '2',
      userId: 'user2',
      investorId: user?.id || '',
      courseId: 'course2',
      amount: 35000,
      status: 'COMPLETED',
      paymentMethod: 'RAZORPAY',
      createdAt: new Date('2024-02-20').toISOString(),
      updatedAt: new Date('2024-02-20').toISOString(),
    },
  ];

  const payments = paymentsData?.data || mockPayments;
  const totalInvested = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const activeInvestments = payments.filter(p => p.status === 'COMPLETED').length;

  if (!isAuthenticated || !user || user.role !== 'INVESTOR') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Typography variant="h6">Access denied. Investor profile only.</Typography>
      </Box>
    );
  }

  const getVerificationStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <VerifiedUser color="success" />;
      case 'PENDING':
        return <Pending color="warning" />;
      case 'REJECTED':
        return <Gavel color="error" />;
      default:
        return <Pending color="action" />;
    }
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'REJECTED':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Investor Profile
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
                <Typography variant="h6">Investor Information</Typography>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Chip 
                      label={user.role} 
                      size="small" 
                      color="primary" 
                    />
                    <Tooltip title={`Verification Status: ${investorData.verificationStatus}`}>
                      <Chip
                        icon={getVerificationStatusIcon(investorData.verificationStatus || 'PENDING')}
                        label={investorData.verificationStatus || 'PENDING'}
                        size="small"
                        color={getVerificationStatusColor(investorData.verificationStatus || 'PENDING') as any}
                      />
                    </Tooltip>
                  </Box>
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
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="totalInvestment"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          type="number"
                          label="Total Investment Capacity"
                          disabled={!isEditing}
                          error={!isEditing && !!errors.totalInvestment}
                          helperText={!isEditing && errors.totalInvestment?.message}
                          InputProps={{
                            startAdornment: <AccountBalance sx={{ mr: 1, color: 'text.secondary' }} />,
                            readOnly: !isEditing,
                          }}
                          inputProps={{
                            'aria-label': 'Total investment capacity',
                            'aria-readonly': !isEditing,
                          }}
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

        {/* Investment Overview */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Investment Overview
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Invested
                </Typography>
                <Typography variant="h4" color="primary.main">
                  ₹{totalInvested.toLocaleString()}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Active Investments
                </Typography>
                <Typography variant="h6">
                  {activeInvestments}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Average Investment
                </Typography>
                <Typography variant="h6">
                  ₹{activeInvestments > 0 ? Math.round(totalInvested / activeInvestments).toLocaleString() : 0}
                </Typography>
              </Box>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<TrendingUp />}
                href="/dashboard"
                sx={{ mt: 2 }}
              >
                View Dashboard
              </Button>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Verification Documents
              </Typography>

              {/* PAN Card */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  PAN Card
                </Typography>
                {investorData.panCardUrl ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AssignmentInd color="primary" />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      PAN card uploaded
                    </Typography>
                    <IconButton size="small" aria-label="View PAN card">
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
                      onChange={handleFileChange}
                    />
                    <CloudUpload sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      Upload PAN Card
                    </Typography>
                  </Box>
                )}
                {panCardFile && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {panCardFile.name}
                    </Typography>
                    <IconButton size="small" onClick={() => setPanCardFile(null)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>

              {panCardFile && (
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleUploadPanCard}
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} /> : <CloudUpload />}
                  sx={{ mt: 2 }}
                >
                  {isLoading ? 'Uploading...' : 'Upload PAN Card'}
                </Button>
              )}

              {uploadProgress > 0 && uploadProgress < 100 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Upload Progress: {uploadProgress}%
                  </Typography>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Investment History */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom>
                Investment History
              </Typography>

              {paymentsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : payments.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Student</TableCell>
                        <TableCell>Course</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>Student {payment.userId.slice(-4)}</TableCell>
                          <TableCell>Course {payment.courseId.slice(-4)}</TableCell>
                          <TableCell align="right">
                            ₹{payment.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={payment.status}
                              size="small"
                              color={payment.status === 'COMPLETED' ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" aria-label="View investment details">
                              <Visibility />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No investments yet. Start investing to help students achieve their education goals.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<TrendingUp />}
                    href="/dashboard"
                    sx={{ mt: 2 }}
                  >
                    Find Investment Opportunities
                  </Button>
                </Box>
              )}
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

export default InvestorProfilePage;
