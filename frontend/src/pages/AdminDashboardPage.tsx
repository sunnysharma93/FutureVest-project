import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Badge,
  Menu,
  Pagination,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  People,
  Work,
  TrendingUp,
  Assessment,
  Visibility,
  Edit,
  Delete,
  Block,
  CheckCircle,
  Refresh,
  Download,
  Settings,
  Notifications,
  Timeline,
  BarChart,
  PieChart,
  MoreVert,
  FilterList,
  Search,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { useApi } from '../hooks/useApi';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { toast } from 'react-toastify';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  enabled: boolean;
  createdAt: string;
  lastLoginAt?: string;
  investmentCount?: number;
  totalInvestment?: number;
}

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  workMode: string;
  active: boolean;
  createdAt: string;
  applicationCount?: number;
  views?: number;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalJobs: number;
  activeJobs: number;
  totalInvestments: number;
  totalInvestmentAmount: number;
  totalRepayments: number;
  totalRepaymentAmount: number;
  userRegistrationTrends: Record<string, number>;
  investmentTrends: Record<string, number>;
}

interface SystemHealth {
  activeConnections: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  databaseConnections: number;
  cacheHitRate: number;
}

const AdminDashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  
  const [activeTab, setActiveTab] = useState(0);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showJobDialog, setShowJobDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // API hooks
  const { data: statsData, execute: fetchStats } = useApi<DashboardStats>('/api/v1/admin/dashboard/stats');
  const { data: healthData, execute: fetchHealth } = useApi<SystemHealth>('/api/v1/admin/system/health');
  const { data: usersData, execute: fetchUsers } = useApi<{ content: User[]; totalElements: number }>(
    `/api/v1/admin/users?page=${page}&size=${rowsPerPage}&sortBy=${sortBy}&sortDir=${sortDir}&search=${searchTerm}`
  );
  const { data: jobsData, execute: fetchJobs } = useApi<{ content: Job[]; totalElements: number }>(
    `/api/v1/admin/jobs?page=${page}&size=${rowsPerPage}&sortBy=${sortBy}&sortDir=${sortDir}&search=${searchTerm}`
  );

  // Fetch data on mount
  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      fetchDashboardData();
    }
  }, [isAuthenticated, user]);

  // Update state when data changes
  useEffect(() => {
    if (statsData) setDashboardStats(statsData);
    if (healthData) setSystemHealth(healthData);
    if (usersData) setUsers(usersData.content);
    if (jobsData) setJobs(jobsData.content);
  }, [statsData, healthData, usersData, jobsData]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(() => {
    setLoading(true);
    setError(null);
    
    Promise.all([
      fetchStats(),
      fetchHealth(),
      fetchUsers(),
      fetchJobs(),
    ]).catch((error) => {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    }).finally(() => {
      setLoading(false);
    });
  }, [fetchStats, fetchHealth, fetchUsers, fetchJobs]);

  // Handle user actions
  const handleUserStatusToggle = useCallback(async (userId: string, enabled: boolean) => {
    try {
      // API call to update user status
      await fetch(`/api/v1/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      
      toast.success(`User ${enabled ? 'enabled' : 'disabled'} successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  }, [fetchUsers]);

  const handleUserRoleUpdate = useCallback(async (userId: string, role: string) => {
    try {
      await fetch(`/api/v1/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      
      toast.success('User role updated successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  }, [fetchUsers]);

  const handleUserDelete = useCallback(async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await fetch(`/api/v1/admin/users/${userId}`, { method: 'DELETE' });
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  }, [fetchUsers]);

  // Handle job actions
  const handleJobStatusToggle = useCallback(async (jobId: string, active: boolean) => {
    try {
      await fetch(`/api/v1/admin/jobs/${jobId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      
      toast.success(`Job ${active ? 'activated' : 'deactivated'} successfully`);
      fetchJobs();
    } catch (error) {
      console.error('Error updating job status:', error);
      toast.error('Failed to update job status');
    }
  }, [fetchJobs]);

  const handleJobDelete = useCallback(async (jobId: string) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;
    
    try {
      await fetch(`/api/v1/admin/jobs/${jobId}`, { method: 'DELETE' });
      toast.success('Job deleted successfully');
      fetchJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Failed to delete job');
    }
  }, [fetchJobs]);

  // Handle export
  const handleExportUsers = useCallback(() => {
    window.open('/api/v1/admin/export/users', '_blank');
  }, []);

  const handleExportJobs = useCallback(() => {
    window.open('/api/v1/admin/export/jobs', '_blank');
  }, []);

  const handleExportAnalytics = useCallback(() => {
    window.open('/api/v1/admin/export/analytics', '_blank');
  }, []);

  // Handle search
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setPage(0);
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value - 1);
  }, []);

  // Handle sort
  const handleSort = useCallback((field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  }, [sortBy, sortDir]);

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

  // Prepare chart data
  const userRegistrationChartData = dashboardStats?.userRegistrationTrends 
    ? Object.entries(dashboardStats.userRegistrationTrends).map(([date, count]) => ({
        date,
        users: count,
      }))
    : [];

  const investmentChartData = dashboardStats?.investmentTrends
    ? Object.entries(dashboardStats.investmentTrends).map(([date, amount]) => ({
        date,
        amount,
      }))
    : [];

  const pieChartData = dashboardStats ? [
    { name: 'Active Users', value: dashboardStats.activeUsers, color: '#4caf50' },
    { name: 'Inactive Users', value: dashboardStats.totalUsers - dashboardStats.activeUsers, color: '#f44336' },
  ] : [];

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6">Access denied. Admin privileges required.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Admin Dashboard
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={fetchDashboardData}
            startIcon={<Refresh />}
            disabled={loading}
          >
            Refresh
          </Button>
          
          <Button
            variant="outlined"
            onClick={handleExportAnalytics}
            startIcon={<Download />}
          >
            Export Analytics
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={
          <IconButton size="small" onClick={fetchDashboardData}>
            <Refresh />
          </IconButton>
        }>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Dashboard" icon={<Assessment />} />
        <Tab label="Users" icon={<People />} />
        <Tab label="Jobs" icon={<Work />} />
        <Tab label="System Health" icon={<Settings />} />
      </Tabs>

      {/* Dashboard Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Summary Cards */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <People sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Total Users</Typography>
                </Box>
                <Typography variant="h4">{dashboardStats?.totalUsers || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {dashboardStats?.activeUsers || 0} active
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Work sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="h6">Total Jobs</Typography>
                </Box>
                <Typography variant="h4">{dashboardStats?.totalJobs || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {dashboardStats?.activeJobs || 0} active
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUp sx={{ mr: 1, color: 'warning.main' }} />
                  <Typography variant="h6">Total Investments</Typography>
                </Box>
                <Typography variant="h4">{dashboardStats?.totalInvestments || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatCurrency(dashboardStats?.totalInvestmentAmount || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <BarChart sx={{ mr: 1, color: 'info.main' }} />
                  <Typography variant="h6">Total Repayments</Typography>
                </Box>
                <Typography variant="h4">{dashboardStats?.totalRepayments || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatCurrency(dashboardStats?.totalRepaymentAmount || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Charts */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>User Registration Trends</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={userRegistrationChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>User Status Distribution</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Investment Trends</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={investmentChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="amount" fill="#82ca9d" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Users Tab */}
      {activeTab === 1 && (
        <Box>
          {/* Search and Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <TextField
              placeholder="Search users..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ width: 300 }}
            />
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={handleExportUsers}
                startIcon={<Download />}
              >
                Export Users
              </Button>
            </Box>
          </Box>

          {/* Users Table */}
          <Card>
            <CardContent>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell onClick={() => handleSort('name')} sx={{ cursor: 'pointer' }}>
                          Name {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell onClick={() => handleSort('email')} sx={{ cursor: 'pointer' }}>
                          Email {sortBy === 'email' && (sortDir === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell onClick={() => handleSort('role')} sx={{ cursor: 'pointer' }}>
                          Role {sortBy === 'role' && (sortDir === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell onClick={() => handleSort('enabled')} sx={{ cursor: 'pointer' }}>
                          Status {sortBy === 'enabled' && (sortDir === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell onClick={() => handleSort('createdAt')} sx={{ cursor: 'pointer' }}>
                          Created {sortBy === 'createdAt' && (sortDir === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Chip label={user.role} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={user.enabled ? <CheckCircle /> : <Block />}
                              label={user.enabled ? 'Active' : 'Inactive'}
                              color={user.enabled ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{formatDate(user.createdAt)}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="View Details">
                                <IconButton size="small">
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Toggle Status">
                                <IconButton
                                  size="small"
                                  onClick={() => handleUserStatusToggle(user.id, !user.enabled)}
                                >
                                  {user.enabled ? <Block /> : <CheckCircle />}
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Delete User">
                                <IconButton
                                  size="small"
                                  onClick={() => handleUserDelete(user.id)}
                                  color="error"
                                >
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              {/* Pagination */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination
                  count={Math.ceil((usersData?.totalElements || 0) / rowsPerPage)}
                  page={page + 1}
                  onChange={handlePageChange}
                />
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Jobs Tab */}
      {activeTab === 2 && (
        <Box>
          {/* Search and Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <TextField
              placeholder="Search jobs..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
              sx={{ width: 300 }}
            />
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={handleExportJobs}
                startIcon={<Download />}
              >
                Export Jobs
              </Button>
            </Box>
          </Box>

          {/* Jobs Table */}
          <Card>
            <CardContent>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell onClick={() => handleSort('title')} sx={{ cursor: 'pointer' }}>
                          Title {sortBy === 'title' && (sortDir === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell onClick={() => handleSort('company')} sx={{ cursor: 'pointer' }}>
                          Company {sortBy === 'company' && (sortDir === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell onClick={() => handleSort('location')} sx={{ cursor: 'pointer' }}>
                          Location {sortBy === 'location' && (sortDir === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell onClick={() => handleSort('type')} sx={{ cursor: 'pointer' }}>
                          Type {sortBy === 'type' && (sortDir === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell onClick={() => handleSort('active')} sx={{ cursor: 'pointer' }}>
                          Status {sortBy === 'active' && (sortDir === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell onClick={() => handleSort('createdAt')} sx={{ cursor: 'pointer' }}>
                          Created {sortBy === 'createdAt' && (sortDir === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {jobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell>{job.title}</TableCell>
                          <TableCell>{job.company}</TableCell>
                          <TableCell>{job.location}</TableCell>
                          <TableCell>
                            <Chip label={job.type} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={job.active ? <CheckCircle /> : <Block />}
                              label={job.active ? 'Active' : 'Inactive'}
                              color={job.active ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{formatDate(job.createdAt)}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="View Details">
                                <IconButton size="small">
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Toggle Status">
                                <IconButton
                                  size="small"
                                  onClick={() => handleJobStatusToggle(job.id, !job.active)}
                                >
                                  {job.active ? <Block /> : <CheckCircle />}
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Delete Job">
                                <IconButton
                                  size="small"
                                  onClick={() => handleJobDelete(job.id)}
                                  color="error"
                                >
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              {/* Pagination */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination
                  count={Math.ceil((jobsData?.totalElements || 0) / rowsPerPage)}
                  page={page + 1}
                  onChange={handlePageChange}
                />
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* System Health Tab */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>System Resources</Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>CPU Usage</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={systemHealth?.cpuUsage || 0}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="caption">{systemHealth?.cpuUsage || 0}%</Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>Memory Usage</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={systemHealth?.memoryUsage || 0}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="caption">{systemHealth?.memoryUsage || 0}%</Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>Disk Usage</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={systemHealth?.diskUsage || 0}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="caption">{systemHealth?.diskUsage || 0}%</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>System Metrics</Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2">Active Connections</Typography>
                  <Typography variant="h4">{systemHealth?.activeConnections || 0}</Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2">Database Connections</Typography>
                  <Typography variant="h4">{systemHealth?.databaseConnections || 0}</Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2">Cache Hit Rate</Typography>
                  <Typography variant="h4">{systemHealth?.cacheHitRate || 0}%</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Loading Spinner */}
      {loading && (
        <LoadingSpinner message="Loading dashboard..." fullScreen />
      )}
    </Box>
  );
};

export default AdminDashboardPage;
