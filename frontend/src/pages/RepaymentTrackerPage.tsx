import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Payment,
  Schedule,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Refresh,
  Info,
  CalendarToday,
  AccountBalance,
  TrendingUp,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { paymentService } from '../services/paymentService';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { toast } from 'react-toastify';

interface RepaymentSchedule {
  id: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paymentId?: string;
  createdAt: string;
  paidDate?: string;
  lateFee?: number;
  principalAmount?: number;
  interestAmount?: number;
}

interface RepaymentSummary {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  nextDueDate: string;
  nextDueAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  pendingInstallments: number;
  overdueInstallments: number;
}

const RepaymentTrackerPage: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  
  const [repaymentSchedule, setRepaymentSchedule] = useState<RepaymentSchedule[]>([]);
  const [summary, setSummary] = useState<RepaymentSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<RepaymentSchedule | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  // Fetch repayment schedule
  const fetchRepaymentSchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const schedule = await paymentService.getRepaymentSchedule();
      setRepaymentSchedule(schedule);
      
      // Calculate summary
      const summaryData = calculateSummary(schedule);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error fetching repayment schedule:', error);
      setError('Failed to fetch repayment schedule');
      toast.error('Failed to load repayment information');
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate repayment summary
  const calculateSummary = (schedule: RepaymentSchedule[]): RepaymentSummary => {
    const totalAmount = schedule.reduce((sum, item) => sum + item.amount, 0);
    const paidAmount = schedule
      .filter(item => item.status === 'PAID')
      .reduce((sum, item) => sum + item.amount, 0);
    const pendingAmount = schedule
      .filter(item => item.status === 'PENDING')
      .reduce((sum, item) => sum + item.amount, 0);
    const overdueAmount = schedule
      .filter(item => item.status === 'OVERDUE')
      .reduce((sum, item) => sum + item.amount, 0);
    
    const pendingPayments = schedule.filter(item => item.status === 'PENDING');
    const nextDue = pendingPayments.length > 0 
      ? pendingPayments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]
      : null;
    
    return {
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
      nextDueDate: nextDue?.dueDate || '',
      nextDueAmount: nextDue?.amount || 0,
      totalInstallments: schedule.length,
      paidInstallments: schedule.filter(item => item.status === 'PAID').length,
      pendingInstallments: schedule.filter(item => item.status === 'PENDING').length,
      overdueInstallments: schedule.filter(item => item.status === 'OVERDUE').length,
    };
  };

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchRepaymentSchedule();
    }
  }, [isAuthenticated, fetchRepaymentSchedule]);

  // Handle payment
  const handlePayment = useCallback(async (scheduleId: string) => {
    try {
      setProcessingPayment(scheduleId);
      
      const order = await paymentService.processRepayment(scheduleId);
      
      // Initiate Razorpay payment
      const result = await paymentService.initiatePayment(order, {
        name: user?.name || 'User',
        description: `Loan Repayment - ${order.receipt}`,
        email: user?.email || '',
        theme: {
          color: '#4caf50',
        },
      });

      if (result.success) {
        toast.success('Repayment processed successfully!');
        fetchRepaymentSchedule(); // Refresh the schedule
      } else {
        toast.error(result.error || 'Repayment failed');
      }
    } catch (error) {
      console.error('Error processing repayment:', error);
      toast.error('Failed to process repayment');
    } finally {
      setProcessingPayment(null);
      setShowPaymentDialog(false);
    }
  }, [user]);

  // Handle refresh
  const handleRefresh = () => {
    fetchRepaymentSchedule();
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'OVERDUE':
        return 'error';
      default:
        return 'default';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle />;
      case 'PENDING':
        return <Schedule />;
      case 'OVERDUE':
        return <Warning />;
      default:
        return <ErrorIcon />;
    }
  };

  // Get days until due
  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get status text
  const getStatusText = (status: string, dueDate: string) => {
    if (status === 'PAID') {
      return 'Paid';
    } else if (status === 'OVERDUE') {
      return 'Overdue';
    } else {
      const daysUntilDue = getDaysUntilDue(dueDate);
      if (daysUntilDue < 0) {
        return 'Overdue';
      } else if (daysUntilDue === 0) {
        return 'Due Today';
      } else if (daysUntilDue <= 7) {
        return `Due in ${daysUntilDue} days`;
      } else {
        return `Due on ${formatDate(dueDate)}`;
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6">Please log in to view repayment tracker</Typography>
        <Button variant="contained" onClick={() => navigate('/login')} sx={{ mt: 2 }}>
          Login
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Repayment Tracker
        </Typography>
        
        <IconButton onClick={handleRefresh} disabled={loading} aria-label="Refresh">
          <Refresh />
        </IconButton>
      </Box>

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AccountBalance sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Total Amount
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {formatCurrency(summary.totalAmount)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CheckCircle sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Paid Amount
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {formatCurrency(summary.paidAmount)}
                </Typography>
                <Typography variant="body2">
                  {summary.paidInstallments} of {summary.totalInstallments} installments
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Schedule sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Pending Amount
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {formatCurrency(summary.pendingAmount)}
                </Typography>
                <Typography variant="body2">
                  {summary.pendingInstallments} installments pending
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: 'error.main', color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Warning sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Overdue Amount
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {formatCurrency(summary.overdueAmount)}
                </Typography>
                <Typography variant="body2">
                  {summary.overdueInstallments} installments overdue
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Next Due Payment */}
      {summary && summary.nextDueDate && (
        <Card sx={{ mb: 3, bgcolor: 'info.main', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Next Due Payment
                </Typography>
                <Typography variant="h5">
                  {formatCurrency(summary.nextDueAmount)}
                </Typography>
                <Typography variant="body2">
                  Due: {formatDate(summary.nextDueDate)}
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => {
                  const nextPayment = repaymentSchedule.find(item => item.dueDate === summary.nextDueDate);
                  if (nextPayment) {
                    setSelectedPayment(nextPayment);
                    setShowPaymentDialog(true);
                  }
                }}
                sx={{ ml: 2 }}
              >
                Pay Now
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Progress Overview */}
      {summary && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Repayment Progress
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                {Math.round((summary.paidAmount / summary.totalAmount) * 100)}% Complete
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(summary.paidAmount / summary.totalAmount) * 100}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  Paid
                </Typography>
                <Typography variant="body2">
                  {summary.paidInstallments} installments
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  Pending
                </Typography>
                <Typography variant="body2">
                  {summary.pendingInstallments} installments
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  Overdue
                </Typography>
                <Typography variant="body2">
                  {summary.overdueInstallments} installments
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Repayment Schedule */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Repayment Schedule
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : repaymentSchedule.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Payment sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Repayment Schedule
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You don't have any active repayment schedule
              </Typography>
            </Box>
          ) : (
            <List>
              {repaymentSchedule.map((payment, index) => (
                <Box key={payment.id}>
                  <ListItem
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon>
                      <Chip
                        icon={getStatusIcon(payment.status)}
                        label={getStatusText(payment.status, payment.dueDate)}
                        color={getStatusColor(payment.status) as any}
                        size="small"
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                            Installment #{index + 1}
                          </Typography>
                          <Typography variant="h6" color="primary">
                            {formatCurrency(payment.amount)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Due: {formatDate(payment.dueDate)}
                          </Typography>
                          {payment.paidDate && (
                            <Typography variant="body2" color="success.main">
                              Paid: {formatDate(payment.paidDate)}
                            </Typography>
                          )}
                          {payment.lateFee && payment.lateFee > 0 && (
                            <Typography variant="body2" color="error.main">
                              Late Fee: {formatCurrency(payment.lateFee)}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    {payment.status === 'PENDING' && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowPaymentDialog(true);
                        }}
                        disabled={processingPayment === payment.id}
                        sx={{ ml: 2 }}
                      >
                        {processingPayment === payment.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          'Pay Now'
                        )}
                      </Button>
                    )}
                  </ListItem>
                  {index < repaymentSchedule.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onClose={() => setShowPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Payment</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" paragraph>
                Are you sure you want to pay{' '}
                <strong>{formatCurrency(selectedPayment.amount)}</strong> for installment{' '}
                <strong>#{repaymentSchedule.indexOf(selectedPayment) + 1}</strong>?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Due Date: {formatDate(selectedPayment.dueDate)}
              </Typography>
              {selectedPayment.lateFee && selectedPayment.lateFee > 0 && (
                <Typography variant="body2" color="error.main">
                  Late Fee: {formatCurrency(selectedPayment.lateFee)}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (selectedPayment) {
                handlePayment(selectedPayment.id);
              }
            }}
            variant="contained"
            disabled={!selectedPayment}
          >
            Confirm Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mt: 2 }}
          action={
            <IconButton size="small" onClick={handleRefresh}>
              <Refresh />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}

      {/* Loading Spinner */}
      {loading && (
        <LoadingSpinner message="Loading repayment schedule..." fullScreen />
      )}
    </Box>
  );
};

export default RepaymentTrackerPage;
