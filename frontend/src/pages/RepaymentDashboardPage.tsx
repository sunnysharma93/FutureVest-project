import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Grid,
  LinearProgress,
  Badge,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Payment,
  Schedule,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Refresh,
  Visibility,
  Download,
  MoreVert,
  CalendarToday,
  TrendingUp,
  AccountBalance,
  Receipt,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { paymentService } from '../services/paymentService';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { toast } from 'react-toastify';

interface RepaymentSchedule {
  id: string;
  investmentId: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paidDate?: string;
  createdAt: string;
  updatedAt: string;
  penaltyAmount?: number;
  investmentTitle?: string;
  investmentType?: string;
}

interface RepaymentStatistics {
  totalDue: number;
  totalPaid: number;
  totalOverdue: number;
  currentMonthDue: number;
  nextPaymentDue?: RepaymentSchedule;
}

const RepaymentDashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  
  const [repaymentSchedule, setRepaymentSchedule] = useState<RepaymentSchedule[]>([]);
  const [statistics, setStatistics] = useState<RepaymentStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<RepaymentSchedule | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Fetch repayment data
  const fetchRepaymentData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch repayment schedule
      const schedule = await paymentService.getRepaymentSchedule();
      setRepaymentSchedule(schedule);
      
      // Calculate statistics
      const stats = calculateStatistics(schedule);
      setStatistics(stats);
      
    } catch (error) {
      console.error('Error fetching repayment data:', error);
      setError('Failed to load repayment information');
      toast.error('Failed to load repayment data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate statistics from schedule
  const calculateStatistics = (schedule: RepaymentSchedule[]): RepaymentStatistics => {
    const totalAmount = schedule.reduce((sum, item) => sum + item.amount + (item.penaltyAmount || 0), 0);
    const paidAmount = schedule
      .filter(item => item.status === 'PAID')
      .reduce((sum, item) => sum + item.amount + (item.penaltyAmount || 0), 0);
    const pendingAmount = schedule
      .filter(item => item.status === 'PENDING')
      .reduce((sum, item) => sum + item.amount + (item.penaltyAmount || 0), 0);
    const overdueAmount = schedule
      .filter(item => item.status === 'OVERDUE')
      .reduce((sum, item) => sum + item.amount + (item.penaltyAmount || 0), 0);
    
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const currentMonthDue = schedule
      .filter(item => {
        const dueDate = new Date(item.dueDate);
        return dueDate >= currentMonthStart && dueDate <= currentMonthEnd;
      })
      .filter(item => item.status === 'PENDING')
      .reduce((sum, item) => sum + item.amount + (item.penaltyAmount || 0), 0);
    
    const nextPayment = schedule
      .filter(item => item.status === 'PENDING')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
    
    return {
      totalDue: totalAmount,
      totalPaid: paidAmount,
      totalOverdue: overdueAmount,
      currentMonthDue,
      nextPaymentDue: nextPayment,
    };
  };

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchRepaymentData();
    }
  }, [isAuthenticated, fetchRepaymentData]);

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
        fetchRepaymentData(); // Refresh data
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

  // Handle view details
  const handleViewDetails = (payment: RepaymentSchedule) => {
    setSelectedPayment(payment);
    setShowDetailsDialog(true);
  };

  // Handle menu click
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
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

  // Get status text
  const getStatusText = (status: string, dueDate: string) => {
    if (status === 'PAID') {
      return 'Paid';
    } else if (status === 'OVERDUE') {
      return 'Overdue';
    } else {
      const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
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

  // Get days until due
  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6">Please log in to view repayment dashboard</Typography>
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
          Repayment Dashboard
        </Typography>
        
        <IconButton onClick={fetchRepaymentData} disabled={loading} aria-label="Refresh">
          <Refresh />
        </IconButton>
      </Box>

      {/* Summary Cards */}
      {statistics && (
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
                  {formatCurrency(statistics.totalDue)}
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
                  {formatCurrency(statistics.totalPaid)}
                </Typography>
                <Typography variant="body2">
                  {Math.round((statistics.totalPaid / statistics.totalDue) * 100)}% Complete
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
                  {formatCurrency(statistics.totalDue - statistics.totalPaid - statistics.totalOverdue)}
                </Typography>
                <Typography variant="body2">
                  Current Month: {formatCurrency(statistics.currentMonthDue)}
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
                  {formatCurrency(statistics.totalOverdue)}
                </Typography>
                <Typography variant="body2">
                  Requires Immediate Attention
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Next Due Payment */}
      {statistics?.nextPaymentDue && (
        <Card sx={{ mb: 3, bgcolor: 'info.main', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Next Due Payment
                </Typography>
                <Typography variant="h5">
                  {formatCurrency(statistics.nextPaymentDue.amount)}
                </Typography>
                <Typography variant="body2">
                  Due: {formatDate(statistics.nextPaymentDue.dueDate)}
                </Typography>
                {statistics.nextPaymentDue.penaltyAmount && statistics.nextPaymentDue.penaltyAmount > 0 && (
                  <Typography variant="body2" color="warning.light">
                    Late Fee: {formatCurrency(statistics.nextPaymentDue.penaltyAmount)}
                  </Typography>
                )}
              </Box>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => {
                  setSelectedPayment(statistics.nextPaymentDue);
                  setShowPaymentDialog(true);
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
      {statistics && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Repayment Progress
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                {Math.round((statistics.totalPaid / statistics.totalDue) * 100)}% Complete
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(statistics.totalPaid / statistics.totalDue) * 100}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary">
                  Paid
                </Typography>
                <Typography variant="body2">
                  {formatCurrency(statistics.totalPaid)}
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary">
                  Pending
                </Typography>
                <Typography variant="body2">
                  {formatCurrency(statistics.totalDue - statistics.totalPaid - statistics.totalOverdue)}
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary">
                  Overdue
                </Typography>
                <Typography variant="body2">
                  {formatCurrency(statistics.totalOverdue)}
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary">
                  Current Month
                </Typography>
                <Typography variant="body2">
                  {formatCurrency(statistics.currentMonthDue)}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Repayment Schedule Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Repayment Schedule
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Investment</TableCell>
                    <TableCell>Penalty</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {repaymentSchedule.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Payment sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                          <Typography variant="h6" color="text.secondary" gutterBottom>
                            No Repayment Schedule
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            You don't have any active repayment schedule
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    repaymentSchedule
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {formatDate(payment.dueDate)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {getDaysUntilDue(payment.dueDate)} days
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {formatCurrency(payment.amount)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={getStatusIcon(payment.status)}
                              label={getStatusText(payment.status, payment.dueDate)}
                              color={getStatusColor(payment.status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {payment.investmentTitle || 'Investment'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {payment.investmentType || 'Loan'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {payment.penaltyAmount && payment.penaltyAmount > 0 ? (
                              <Typography variant="body2" color="error.main">
                                {formatCurrency(payment.penaltyAmount)}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewDetails(payment)}
                                  aria-label={`View details for ${payment.id}`}
                                >
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                              
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
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          {/* Pagination */}
          {repaymentSchedule.length > rowsPerPage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Typography sx={{ mx: 2 }}>
                Page {page + 1} of {Math.ceil(repaymentSchedule.length / rowsPerPage)}
              </Typography>
              <Button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(repaymentSchedule.length / rowsPerPage) - 1}
              >
                Next
              </Button>
            </Box>
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
                <strong>{formatCurrency(selectedPayment.amount)}</strong>?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Due Date: {formatDate(selectedPayment.dueDate)}
              </Typography>
              {selectedPayment.penaltyAmount && selectedPayment.penaltyAmount > 0 && (
                <Typography variant="body2" color="error.main">
                  Late Fee: {formatCurrency(selectedPayment.penaltyAmount)}
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

      {/* Details Dialog */}
      <Dialog
        open={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Repayment Details</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Due Date
                </Typography>
                <Typography variant="body1">
                  {formatDate(selectedPayment.dueDate)}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Amount
                </Typography>
                <Typography variant="h6" color="primary">
                  {formatCurrency(selectedPayment.amount)}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  icon={getStatusIcon(selectedPayment.status)}
                  label={selectedPayment.status}
                  color={getStatusColor(selectedPayment.status) as any}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Investment
                </Typography>
                <Typography variant="body1">
                  {selectedPayment.investmentTitle || 'Investment'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedPayment.investmentType || 'Loan'}
                </Typography>
              </Grid>
              
              {selectedPayment.paidDate && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Paid Date
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(selectedPayment.paidDate)}
                  </Typography>
                </Grid>
              )}
              
              {selectedPayment.penaltyAmount && selectedPayment.penaltyAmount > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Late Fee
                  </Typography>
                  <Typography variant="body1" color="error.main">
                    {formatCurrency(selectedPayment.penaltyAmount)}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mt: 2 }}
          action={
            <IconButton size="small" onClick={fetchRepaymentData}>
              <Refresh />
            </IconButton>
          }
        >
          {error}
        </Alert>
      )}

      {/* Loading Spinner */}
      {loading && (
        <LoadingSpinner message="Loading repayment data..." fullScreen />
      )}
    </Box>
  );
};

export default RepaymentDashboardPage;
