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
  Paper,
  Button,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Visibility,
  Download,
  Refresh,
  Search,
  FilterList,
  Receipt,
  Payment as PaymentIcon,
  CheckCircle,
  Error as ErrorIcon,
  Schedule,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { paymentService } from '../services/paymentService';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { toast } from 'react-toastify';

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  type: 'COURSE_PAYMENT' | 'INVESTMENT' | 'REPAYMENT';
  paymentId: string;
  orderId: string;
  receipt: string;
  createdAt: string;
  updatedAt: string;
  notes: Record<string, string>;
  refundId?: string;
  refundAmount?: number;
  courseTitle?: string;
  jobTitle?: string;
}

interface PaymentHistoryResponse {
  payments: PaymentRecord[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
  pageSize: number;
}

const PaymentHistoryPage: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');

  const pageSize = 10;

  // Fetch payment history
  const fetchPaymentHistory = useCallback(async (currentPage = page) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await paymentService.getPaymentHistory(currentPage, pageSize);
      
      setPayments(response.payments);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setError('Failed to fetch payment history');
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchPaymentHistory();
    }
  }, [isAuthenticated, fetchPaymentHistory]);

  // Handle page change
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value - 1);
    fetchPaymentHistory(value - 1);
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchPaymentHistory();
  };

  // Handle view details
  const handleViewDetails = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setShowDetails(true);
  };

  // Handle download receipt
  const handleDownloadReceipt = async (payment: PaymentRecord) => {
    try {
      const response = await fetch(`/api/v1/payments/${payment.id}/receipt`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt_${payment.receipt}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success('Receipt downloaded successfully');
      } else {
        throw new Error('Failed to download receipt');
      }
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Failed to download receipt');
    }
  };

  // Filter payments
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.receipt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.courseTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || payment.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || payment.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Format currency
  const formatCurrency = (amount: number, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'PENDING':
        return 'warning';
      case 'REFUNDED':
        return 'info';
      default:
        return 'default';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle />;
      case 'FAILED':
        return <ErrorIcon />;
      case 'PENDING':
        return <Schedule />;
      case 'REFUNDED':
        return <Refresh />;
      default:
        return <PaymentIcon />;
    }
  };

  // Get type label
  const getTypeLabel = (type: string) => {
    return type.replace('_', ' ');
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6">Please log in to view payment history</Typography>
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
          Payment History
        </Typography>
        
        <IconButton onClick={handleRefresh} disabled={loading} aria-label="Refresh">
          <Refresh />
        </IconButton>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search by receipt, course, or job..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                inputProps={{
                  'aria-label': 'Search payments',
                }}
              />
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel id="status-filter">Status</InputLabel>
                <Select
                  labelId="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                  inputProps={{
                    'aria-label': 'Filter by status',
                  }}
                >
                  <MenuItem value="ALL">All Status</MenuItem>
                  <MenuItem value="SUCCESS">Success</MenuItem>
                  <MenuItem value="FAILED">Failed</MenuItem>
                  <MenuItem value="PENDING">Pending</MenuItem>
                  <MenuItem value="REFUNDED">Refunded</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel id="type-filter">Type</InputLabel>
                <Select
                  labelId="type-filter"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  label="Type"
                  inputProps={{
                    'aria-label': 'Filter by type',
                  }}
                >
                  <MenuItem value="ALL">All Types</MenuItem>
                  <MenuItem value="COURSE_PAYMENT">Course Payment</MenuItem>
                  <MenuItem value="INVESTMENT">Investment</MenuItem>
                  <MenuItem value="REPAYMENT">Repayment</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel id="date-filter">Date Range</InputLabel>
                <Select
                  labelId="date-filter"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  label="Date Range"
                  inputProps={{
                    'aria-label': 'Filter by date',
                  }}
                >
                  <MenuItem value="ALL">All Time</MenuItem>
                  <MenuItem value="TODAY">Today</MenuItem>
                  <MenuItem value="WEEK">This Week</MenuItem>
                  <MenuItem value="MONTH">This Month</MenuItem>
                  <MenuItem value="YEAR">This Year</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredPayments.length} of {totalElements} payments
        </Typography>
      </Box>

      {/* Payment Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Receipt</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Receipt sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No payments found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Try adjusting your search or filters
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {payment.receipt}
                    </Typography>
                    {payment.courseTitle && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {payment.courseTitle}
                      </Typography>
                    )}
                    {payment.jobTitle && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {payment.jobTitle}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getTypeLabel(payment.type)} 
                      size="small" 
                      variant="outlined" 
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(payment.amount, payment.currency)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(payment.status)}
                      label={payment.status}
                      size="small"
                      color={getStatusColor(payment.status) as any}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                      {formatDate(payment.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(payment)}
                          aria-label={`View details for ${payment.receipt}`}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      {payment.status === 'SUCCESS' && (
                        <Tooltip title="Download Receipt">
                          <IconButton
                            size="small"
                            onClick={() => handleDownloadReceipt(payment)}
                            aria-label={`Download receipt for ${payment.receipt}`}
                          >
                            <Download />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page + 1}
            onChange={handlePageChange}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Payment Details Dialog */}
      <Dialog 
        open={showDetails} 
        onClose={() => setShowDetails(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Payment Details</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Receipt Number
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                  {selectedPayment.receipt}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Payment ID
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                  {selectedPayment.paymentId}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Order ID
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                  {selectedPayment.orderId}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Amount
                </Typography>
                <Typography variant="h6" color="primary">
                  {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                </Typography>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Type
                </Typography>
                <Typography variant="body1">
                  {getTypeLabel(selectedPayment.type)}
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
                  Created At
                </Typography>
                <Typography variant="body1">
                  {formatDate(selectedPayment.createdAt)}
                </Typography>
              </Grid>
              
              {selectedPayment.refundAmount && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Refund Amount
                  </Typography>
                  <Typography variant="body1" color="error">
                    {formatCurrency(selectedPayment.refundAmount, selectedPayment.currency)}
                  </Typography>
                </Grid>
              )}
              
              {selectedPayment.notes && Object.keys(selectedPayment.notes).length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Additional Information
                  </Typography>
                  {Object.entries(selectedPayment.notes).map(([key, value]) => (
                    <Box key={key} sx={{ mb: 1 }}>
                      <Typography variant="body2" component="span">
                        <strong>{key}:</strong> {value}
                      </Typography>
                    </Box>
                  ))}
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>Close</Button>
          {selectedPayment?.status === 'SUCCESS' && (
            <Button
              variant="contained"
              onClick={() => {
                handleDownloadReceipt(selectedPayment);
                setShowDetails(false);
              }}
              startIcon={<Download />}
            >
              Download Receipt
            </Button>
          )}
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
        <LoadingSpinner message="Loading payment history..." fullScreen />
      )}
    </Box>
  );
};

export default PaymentHistoryPage;
