import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Chip,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Payment,
  CheckCircle,
  Error as ErrorIcon,
  Refresh,
  Info,
  ArrowBack,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { RootState } from '../store';
import { paymentService } from '../services/paymentService';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { toast } from 'react-toastify';

interface PaymentPageProps {
  courseId?: string;
  jobIdId?: string;
  amount?: number;
  type?: 'COURSE_PAYMENT' | 'INVESTMENT' | 'REPAYMENT';
}

const PaymentPage: React.FC<PaymentPageProps> = ({
  courseId,
  jobIdId,
  amount: initialAmount,
  type = 'COURSE_PAYMENT',
}) => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { isProcessing, error } = useSelector((state: RootState) => state.payments);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [amount, setAmount] = useState(initialAmount || 0);
  const [order, setOrder] = useState<any>(null);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  // Get payment details from location state or fetch
  useEffect(() => {
    if (location.state?.paymentDetails) {
      setPaymentDetails(location.state.paymentDetails);
      setAmount(location.state.paymentDetails.amount || 0);
    } else if (courseId || jobIdId) {
      // Fetch payment details based on type
      fetchPaymentDetails();
    }
  }, [location.state, courseId, jobIdId]);

  const fetchPaymentDetails = async () => {
    try {
      let endpoint = '';
      if (courseId) {
        endpoint = `/courses/${courseId}/payment-details`;
      } else if (jobIdId) {
        endpoint = `/jobs/${jobIdId}/payment-details`;
      }

      const response = await fetch(`/api/v1${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const details = await response.json();
        setPaymentDetails(details);
        setAmount(details.amount || 0);
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
    }
  };

  const steps = [
    'Payment Details',
    'Review & Confirm',
    'Payment',
    'Confirmation',
  ];

  const validateAmount = useCallback(() => {
    const validation = paymentService.validatePaymentAmount(amount);
    if (!validation.isValid) {
      toast.error(validation.error);
      return false;
    }
    return true;
  }, [amount]);

  const createOrder = useCallback(async () => {
    if (!validateAmount()) return;

    try {
      setLoading(true);
      
      const paymentRequest = {
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        receipt: paymentService.generateReceiptNumber(),
        notes: {
          userId: user?.id,
          type,
          courseId: courseId || '',
          jobIdId: jobIdId || '',
        },
        type,
      };

      const createdOrder = await paymentService.createPaymentOrder(paymentRequest);
      setOrder(createdOrder);
      setCurrentStep(2);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create payment order');
    } finally {
      setLoading(false);
    }
  }, [amount, user, type, courseId, jobIdId, validateAmount]);

  const handlePayment = useCallback(async () => {
    if (!order || !user) return;

    try {
      setLoading(true);
      
      const result = await paymentService.initiatePayment(order, {
        name: user.name,
        description: getPaymentDescription(),
        email: user.email,
        contact: user.phone,
        theme: {
          color: '#3399cc',
        },
      });

      if (result.success) {
        setPaymentResult(result);
        setCurrentStep(3);
        setShowSuccess(true);
        
        // Show success notification
        toast.success('Payment completed successfully!');
        
        // Redirect to success page or dashboard
        setTimeout(() => {
          if (courseId) {
            navigate(`/courses/${courseId}/payment-success`, {
              state: { paymentData: result },
            });
          } else if (jobIdId) {
            navigate(`/jobs/${jobIdId}/payment-success`, {
              state: { paymentData: result },
            });
          } else {
            navigate('/dashboard');
          }
        }, 2000);
      } else {
        setShowError(true);
        toast.error(result.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      setShowError(true);
      toast.error('Payment processing failed');
    } finally {
      setLoading(false);
    }
  }, [order, user, courseId, jobIdId, navigate]);

  const getPaymentDescription = () => {
    if (type === 'COURSE_PAYMENT') {
      return `Payment for course: ${paymentDetails?.title || 'Course'}`;
    } else if (type === 'INVESTMENT') {
      return `Investment in: ${paymentDetails?.title || 'Investment'}`;
    } else if (type === 'REPAYMENT') {
      return `Loan repayment for: ${paymentDetails?.title || 'Repayment'}`;
    }
    return 'Payment';
  };

  const handleRetry = useCallback(() => {
    setShowError(false);
    setCurrentStep(1);
    createOrder();
  }, [createOrder]);

  const handleCancel = useCallback(() => {
    setShowConfirmation(false);
  }, []);

  const handleConfirmPayment = useCallback(() => {
    setShowConfirmation(false);
    handlePayment();
  }, [handlePayment]);

  const nextStep = useCallback(() => {
    if (currentStep === 0) {
      if (validateAmount()) {
        setCurrentStep(1);
      }
    } else if (currentStep === 1) {
      createOrder();
    }
  }, [currentStep, validateAmount, createOrder]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  if (!isAuthenticated) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6">Please log in to make a payment</Typography>
        <Button variant="contained" onClick={() => navigate('/login')} sx={{ mt: 2 }}>
          Login
        </Button>
      </Box>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Payment Details
            </Typography>
            
            {paymentDetails && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {paymentDetails.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {paymentDetails.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Chip label={type.replace('_', ' ')} size="small" color="primary" />
                    {paymentDetails.duration && (
                      <Chip label={paymentDetails.duration} size="small" variant="outlined" />
                    )}
                  </Box>
                </CardContent>
              </Card>
            )}

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Amount
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  inputProps={{
                    min: 1,
                    max: 100000,
                    'aria-label': 'Payment amount',
                  }}
                  helperText="Enter amount in INR"
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review & Confirm
            </Typography>
            
            <Paper sx={{ p: 3, mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Payment For
                  </Typography>
                  <Typography variant="body1">
                    {paymentDetails?.title || getPaymentDescription()}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Amount
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {paymentService.formatCurrency(amount * 100)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Payment Type
                  </Typography>
                  <Typography variant="body1">
                    {type.replace('_', ' ')}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Payment Method
                  </Typography>
                  <Typography variant="body1">
                    Razorpay (Secure Payment Gateway)
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            <Alert severity="info">
              <Typography variant="body2">
                <strong>Important:</strong> Your payment will be processed securely through Razorpay.
                All transactions are encrypted and PCI-DSS compliant.
              </Typography>
            </Alert>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Processing Payment
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait while we process your payment...
            </Typography>
          </Box>
        );

      case 3:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            {paymentResult?.success ? (
              <>
                <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Payment Successful!
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Your payment has been processed successfully.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Payment ID: {paymentResult.paymentId}
                </Typography>
              </>
            ) : (
              <>
                <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Payment Failed
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  {paymentResult?.error || 'Payment could not be processed'}
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleRetry}
                  startIcon={<Refresh />}
                  sx={{ mt: 2 }}
                >
                  Try Again
                </Button>
              </>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          Payment
        </Typography>
      </Box>

      <Stepper activeStep={currentStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Card>
        <CardContent sx={{ p: 4 }}>
          {renderStepContent()}

          {currentStep < 2 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button
                disabled={currentStep === 0}
                onClick={prevStep}
                variant="outlined"
              >
                Previous
              </Button>

              {currentStep === 1 ? (
                <Button
                  variant="contained"
                  onClick={() => setShowConfirmation(true)}
                  disabled={loading || amount <= 0}
                  startIcon={loading ? <CircularProgress size={20} /> : <Payment />}
                >
                  {loading ? 'Processing...' : 'Pay Now'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={nextStep}
                  disabled={loading}
                >
                  Next
                </Button>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onClose={handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Payment</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Are you sure you want to proceed with the payment of{' '}
            <strong>{paymentService.formatCurrency(amount * 100)}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This action will initiate the payment process through Razorpay.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleConfirmPayment} variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onClose={() => setShowSuccess(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Payment Successful!</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Your payment has been processed successfully.
          </Typography>
          {paymentResult && (
            <Typography variant="body2" color="text.secondary">
              Payment ID: {paymentResult.paymentId}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSuccess(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={showError} onClose={() => setShowError(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Payment Failed</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            {paymentResult?.error || 'Payment could not be processed. Please try again.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowError(false)}>Close</Button>
          <Button onClick={handleRetry} variant="contained">
            Try Again
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mt: 2 }}
          action={
            <IconButton size="small" onClick={() => dispatch({ type: 'payments/clearError' })}>
              <Refresh />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}

      {/* Loading Spinner */}
      {loading && (
        <LoadingSpinner message="Processing payment..." fullScreen />
      )}
    </Container>
  );
};

export default PaymentPage;
