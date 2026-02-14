import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  IconButton,
  Tooltip,
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
  Pagination,
  CircularProgress,
  Alert,
  LinearProgress,
  Badge,
  Menu,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Switch,
  InputAdornment,
  Fab,
  Backdrop,
} from '@mui/material';
import {
  People,
  Search,
  FilterList,
  Edit,
  Delete,
  Block,
  CheckCircle,
  Refresh,
  Download,
  Upload,
  MoreVert,
  Visibility,
  Email,
  Phone,
  LocationOn,
  School,
  Work,
  AccountCircle,
  Security,
  Notifications,
  Assessment,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useTranslation } from 'react-i18next';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useNotification } from '../../hooks/useNotification';
import { exportToCSV, exportToExcel } from '../../utils/exportUtils';
import { formatDate, formatCurrency, formatPhoneNumber } from '../../utils/formatUtils';
import { validateEmail, validatePhone } from '../../utils/validationUtils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';
import { User, UserFilters, UserStats } from '../../types/admin';

const UserManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { showSuccess, showError, showWarning } = useNotification();
  
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'all',
    status: 'all',
    registrationDate: null,
    lastLoginDate: null,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    rowsPerPage: 25,
    total: 0,
  });
  const [sortConfig, setSortConfig] = useState<{
    field: keyof User;
    direction: 'asc' | 'desc';
  }>({ field: 'createdAt', direction: 'desc' });
  
  // Dialog states
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    user: User | null;
  }>({ open: false, user: null });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    user: User | null;
  }>({ open: false, user: null });
  const [bulkActionMenu, setBulkActionMenu] = useState<null | HTMLElement>(null);
  
  // Local storage for preferences
  const [viewMode, setViewMode] = useLocalStorage<'table' | 'card'>('userViewMode', 'table');
  const [savedFilters, setSavedFilters] = useLocalStorage<UserFilters>('userFilters', filters);
  
  // API hooks
  const { data: usersData, execute: fetchUsers } = useApi<{
    content: User[];
    totalElements: number;
  }>('/api/v1/admin/users');
  
  const { data: statsData, execute: fetchStats } = useApi<UserStats>('/api/v1/admin/users/stats');
  
  // Debounced search
  const debouncedSearch = useDebounce(filters.search, 500);
  
  // Memoized filtered users
  const filteredUsers = useMemo(() => {
    if (!usersData?.content) return [];
    
    return usersData.content.filter(user => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.phone?.toLowerCase().includes(searchLower) ||
          user.location?.toLowerCase().includes(searchLower)
        );
      }
      
      // Role filter
      if (filters.role !== 'all' && user.role !== filters.role) {
        return false;
      }
      
      // Status filter
      if (filters.status !== 'all') {
        const isActive = filters.status === 'active';
        if (user.enabled !== isActive) {
          return false;
        }
      }
      
      // Registration date filter
      if (filters.registrationDate) {
        const userDate = new Date(user.createdAt);
        const filterDate = new Date(filters.registrationDate);
        if (userDate.toDateString() !== filterDate.toDateString()) {
          return false;
        }
      }
      
      // Last login date filter
      if (filters.lastLoginDate && user.lastLoginAt) {
        const userDate = new Date(user.lastLoginAt);
        const filterDate = new Date(filters.lastLoginDate);
        if (userDate.toDateString() !== filterDate.toDateString()) {
          return false;
        }
      }
      
      return true;
    });
  }, [usersData?.content, filters]);
  
  // Sorted users
  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers];
    sorted.sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredUsers, sortConfig]);
  
  // Paginated users
  const paginatedUsers = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.rowsPerPage;
    const endIndex = startIndex + pagination.rowsPerPage;
    return sortedUsers.slice(startIndex, endIndex);
  }, [sortedUsers, pagination]);
  
  // Fetch data
  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [fetchUsers, fetchStats]);
  
  // Update pagination when data changes
  useEffect(() => {
    if (usersData) {
      setPagination(prev => ({
        ...prev,
        total: usersData.totalElements,
      }));
    }
  }, [usersData]);
  
  // Apply saved filters
  useEffect(() => {
    if (savedFilters) {
      setFilters(savedFilters);
    }
  }, [savedFilters]);
  
  // Save filters when they change
  useEffect(() => {
    setSavedFilters(filters);
  }, [filters, setSavedFilters]);
  
  // Handle search
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilters(prev => ({ ...prev, search: debouncedSearch }));
    }
  }, [debouncedSearch, filters.search]);
  
  // Handle sort
  const handleSort = (field: keyof User) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };
  
  // Handle user selection
  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };
  
  // Handle select all
  const handleSelectAll = () => {
    if (selectedUsers.size === paginatedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(paginatedUsers.map(user => user.id)));
    }
  };
  
  // Handle user actions
  const handleEditUser = (user: User) => {
    setEditDialog({ open: true, user });
  };
  
  const handleDeleteUser = (user: User) => {
    setDeleteDialog({ open: true, user });
  };
  
  const handleToggleUserStatus = async (user: User) => {
    try {
      // API call to toggle user status
      await fetch(`/api/v1/admin/users/${user.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !user.enabled }),
      });
      
      showSuccess(t('admin.userStatusUpdated'));
      fetchUsers();
    } catch (error) {
      showError(t('admin.userStatusUpdateFailed'));
    }
  };
  
  const handleSendNotification = async (user: User) => {
    try {
      // API call to send notification
      await fetch(`/api/v1/admin/users/${user.id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'custom',
          title: t('admin.customNotification'),
          message: t('admin.customNotificationMessage'),
        }),
      });
      
      showSuccess(t('admin.notificationSent'));
    } catch (error) {
      showError(t('admin.notificationSendFailed'));
    }
  };
  
  // Handle bulk actions
  const handleBulkAction = async (action: 'enable' | 'disable' | 'delete' | 'notify') => {
    if (selectedUsers.size === 0) {
      showWarning(t('admin.noUsersSelected'));
      return;
    }
    
    try {
      const userIds = Array.from(selectedUsers);
      
      switch (action) {
        case 'enable':
        case 'disable':
          await fetch('/api/v1/admin/users/bulk/status', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userIds,
              enabled: action === 'enable',
            }),
          });
          showSuccess(t('admin.bulkStatusUpdated'));
          break;
          
        case 'delete':
          await fetch('/api/v1/admin/users/bulk/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds }),
          });
          showSuccess(t('admin.bulkDeleted'));
          break;
          
        case 'notify':
          await fetch('/api/v1/admin/users/bulk/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userIds,
              type: 'bulk',
              title: t('admin.bulkNotification'),
              message: t('admin.bulkNotificationMessage'),
            }),
          });
          showSuccess(t('admin.bulkNotificationSent'));
          break;
      }
      
      setSelectedUsers(new Set());
      fetchUsers();
      setBulkActionMenu(null);
    } catch (error) {
      showError(t('admin.bulkActionFailed'));
    }
  };
  
  // Handle export
  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      const data = paginatedUsers.map(user => ({
        ID: user.id,
        Name: user.name,
        Email: user.email,
        Phone: user.phone || '',
        Role: user.role,
        Status: user.enabled ? 'Active' : 'Inactive',
        Location: user.location || '',
        Education: user.education || '',
        Experience: user.experience || '',
        'Registration Date': formatDate(user.createdAt),
        'Last Login': user.lastLoginAt ? formatDate(user.lastLoginAt) : '',
        'Investment Count': user.investmentCount || 0,
        'Total Investment': formatCurrency(user.totalInvestment || 0),
      }));
      
      if (format === 'csv') {
        exportToCSV(data, `users_${formatDate(new Date())}.csv`);
      } else {
        exportToExcel(data, `users_${formatDate(new Date())}.xlsx`);
      }
      
      showSuccess(t('admin.exportSuccess'));
    } catch (error) {
      showError(t('admin.exportFailed'));
    }
  };
  
  // Handle refresh
  const handleRefresh = () => {
    setLoading(true);
    fetchUsers().finally(() => setLoading(false));
  };
  
  // Render user status chip
  const renderStatusChip = (user: User) => (
    <Chip
      icon={user.enabled ? <CheckCircle /> : <Block />}
      label={user.enabled ? t('admin.active') : t('admin.inactive')}
      color={user.enabled ? 'success' : 'error'}
      size="small"
      variant="outlined"
    />
  );
  
  // Render user role chip
  const renderRoleChip = (role: string) => {
    const colors: Record<string, 'primary' | 'secondary' | 'default'> = {
      ADMIN: 'secondary',
      USER: 'primary',
      INVESTOR: 'default',
    };
    
    return (
      <Chip
        label={t(`admin.roles.${role.toLowerCase()}`)}
        color={colors[role] || 'default'}
        size="small"
        variant="outlined"
      />
    );
  };
  
  return (
    <ErrorBoundary>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Box sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1">
              {t('admin.userManagement')}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => handleExport('csv')}
                disabled={paginatedUsers.length === 0}
              >
                {t('admin.exportCSV')}
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => handleExport('excel')}
                disabled={paginatedUsers.length === 0}
              >
                {t('admin.exportExcel')}
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleRefresh}
                disabled={loading}
              >
                {t('admin.refresh')}
              </Button>
              
              {selectedUsers.size > 0 && (
                <Button
                  variant="contained"
                  startIcon={<MoreVert />}
                  onClick={(e) => setBulkActionMenu(e.currentTarget)}
                >
                  {t('admin.bulkActions')} ({selectedUsers.size})
                </Button>
              )}
            </Box>
          </Box>
          
          {/* Stats Cards */}
          {statsData && (
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <People sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">{t('admin.totalUsers')}</Typography>
                  </Box>
                  <Typography variant="h4">{statsData.totalUsers}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {statsData.activeUsers} {t('admin.active')}
                  </Typography>
                </CardContent>
              </Card>
              
              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AccountCircle sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="h6">{t('admin.newUsers')}</Typography>
                  </Box>
                  <Typography variant="h4">{statsData.newUsersThisMonth}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.thisMonth')}
                  </Typography>
                </CardContent>
              </Card>
              
              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Assessment sx={{ mr: 1, color: 'warning.main' }} />
                    <Typography variant="h6">{t('admin.avgInvestment')}</Typography>
                  </Box>
                  <Typography variant="h4">
                    {formatCurrency(statsData.averageInvestment)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.perUser')}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          )}
          
          {/* Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  placeholder={t('admin.searchUsers')}
                  variant="outlined"
                  size="small"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ minWidth: 250 }}
                />
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>{t('admin.role')}</InputLabel>
                  <Select
                    value={filters.role}
                    label={t('admin.role')}
                    onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <MenuItem value="all">{t('admin.allRoles')}</MenuItem>
                    <MenuItem value="USER">{t('admin.roles.user')}</MenuItem>
                    <MenuItem value="INVESTOR">{t('admin.roles.investor')}</MenuItem>
                    <MenuItem value="ADMIN">{t('admin.roles.admin')}</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>{t('admin.status')}</InputLabel>
                  <Select
                    value={filters.status}
                    label={t('admin.status')}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <MenuItem value="all">{t('admin.allStatuses')}</MenuItem>
                    <MenuItem value="active">{t('admin.active')}</MenuItem>
                    <MenuItem value="inactive">{t('admin.inactive')}</MenuItem>
                  </Select>
                </FormControl>
                
                <DatePicker
                  label={t('admin.registrationDate')}
                  value={filters.registrationDate}
                  onChange={(date) => setFilters(prev => ({ ...prev, registrationDate: date }))}
                  slotProps={{ textField: { size: 'small', sx: { minWidth: 150 } } }}
                />
                
                <DatePicker
                  label={t('admin.lastLoginDate')}
                  value={filters.lastLoginDate}
                  onChange={(date) => setFilters(prev => ({ ...prev, lastLoginDate: date }))}
                  slotProps={{ textField: { size: 'small', sx: { minWidth: 150 } } }}
                />
                
                <Button
                  variant="outlined"
                  startIcon={<FilterList />}
                  onClick={() => setFilters({
                    search: '',
                    role: 'all',
                    status: 'all',
                    registrationDate: null,
                    lastLoginDate: null,
                  })}
                >
                  {t('admin.clearFilters')}
                </Button>
              </Box>
            </CardContent>
          </Card>
          
          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} action={
              <IconButton size="small" onClick={handleRefresh}>
                <Refresh />
              </IconButton>
            }>
              {error}
            </Alert>
          )}
          
          {/* Loading State */}
          {loading && <LinearProgress sx={{ mb: 2 }} />}
          
          {/* Users Table */}
          <Card>
            <CardContent>
              {paginatedUsers.length === 0 && !loading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="text.secondary">
                    {t('admin.noUsersFound')}
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            indeterminate={selectedUsers.size > 0 && selectedUsers.size < paginatedUsers.length}
                            checked={selectedUsers.size === paginatedUsers.length}
                            onChange={handleSelectAll}
                          />
                        </TableCell>
                        <TableCell
                          onClick={() => handleSort('name')}
                          sx={{ cursor: 'pointer' }}
                        >
                          {t('admin.name')} {sortConfig.field === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell
                          onClick={() => handleSort('email')}
                          sx={{ cursor: 'pointer' }}
                        >
                          {t('admin.email')} {sortConfig.field === 'email' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell
                          onClick={() => handleSort('role')}
                          sx={{ cursor: 'pointer' }}
                        >
                          {t('admin.role')} {sortConfig.field === 'role' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell
                          onClick={() => handleSort('enabled')}
                          sx={{ cursor: 'pointer' }}
                        >
                          {t('admin.status')} {sortConfig.field === 'enabled' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell
                          onClick={() => handleSort('location')}
                          sx={{ cursor: 'pointer' }}
                        >
                          {t('admin.location')} {sortConfig.field === 'location' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell
                          onClick={() => handleSort('createdAt')}
                          sx={{ cursor: 'pointer' }}
                        >
                          {t('admin.registrationDate')} {sortConfig.field === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell
                          onClick={() => handleSort('lastLoginAt')}
                          sx={{ cursor: 'pointer' }}
                        >
                          {t('admin.lastLogin')} {sortConfig.field === 'lastLoginAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </TableCell>
                        <TableCell>{t('admin.actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedUsers.map((user) => (
                        <TableRow key={user.id} hover>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedUsers.has(user.id)}
                              onChange={() => handleSelectUser(user.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar src={user.avatar} sx={{ width: 32, height: 32 }}>
                                {user.name.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {user.name}
                                </Typography>
                                {user.investmentCount && user.investmentCount > 0 && (
                                  <Typography variant="caption" color="text.secondary">
                                    {user.investmentCount} {t('admin.investments')}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Email fontSize="small" color="action" />
                              <Typography variant="body2">{user.email}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{renderRoleChip(user.role)}</TableCell>
                          <TableCell>{renderStatusChip(user)}</TableCell>
                          <TableCell>
                            {user.location && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LocationOn fontSize="small" color="action" />
                                <Typography variant="body2">{user.location}</Typography>
                              </Box>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(user.createdAt)}</TableCell>
                          <TableCell>
                            {user.lastLoginAt ? (
                              <Typography variant="body2">
                                {formatDate(user.lastLoginAt)}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                {t('admin.never')}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title={t('admin.viewDetails')}>
                                <IconButton size="small">
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title={t('admin.editUser')}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditUser(user)}
                                >
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title={t('admin.toggleStatus')}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleToggleUserStatus(user)}
                                  color={user.enabled ? 'warning' : 'success'}
                                >
                                  {user.enabled ? <Block /> : <CheckCircle />}
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title={t('admin.sendNotification')}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleSendNotification(user)}
                                >
                                  <Notifications />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title={t('admin.deleteUser')}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteUser(user)}
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('admin.showing', {
                    start: (pagination.page - 1) * pagination.rowsPerPage + 1,
                    end: Math.min(pagination.page * pagination.rowsPerPage, pagination.total),
                    total: pagination.total,
                  })}
                </Typography>
                
                <Pagination
                  count={Math.ceil(pagination.total / pagination.rowsPerPage)}
                  page={pagination.page}
                  onChange={(e, page) => setPagination(prev => ({ ...prev, page }))}
                  color="primary"
                />
              </Box>
            </CardContent>
          </Card>
          
          {/* Bulk Action Menu */}
          <Menu
            anchorEl={bulkActionMenu}
            open={Boolean(bulkActionMenu)}
            onClose={() => setBulkActionMenu(null)}
          >
            <MenuItem onClick={() => handleBulkAction('enable')}>
              <CheckCircle sx={{ mr: 1 }} />
              {t('admin.enableUsers')}
            </MenuItem>
            <MenuItem onClick={() => handleBulkAction('disable')}>
              <Block sx={{ mr: 1 }} />
              {t('admin.disableUsers')}
            </MenuItem>
            <MenuItem onClick={() => handleBulkAction('notify')}>
              <Notifications sx={{ mr: 1 }} />
              {t('admin.sendNotification')}
            </MenuItem>
            <MenuItem onClick={() => handleBulkAction('delete')} sx={{ color: 'error.main' }}>
              <Delete sx={{ mr: 1 }} />
              {t('admin.deleteUsers')}
            </MenuItem>
          </Menu>
          
          {/* Edit User Dialog */}
          <Dialog
            open={editDialog.open}
            onClose={() => setEditDialog({ open: false, user: null })}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>{t('admin.editUser')}</DialogTitle>
            <DialogContent>
              {editDialog.user && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                  <TextField
                    label={t('admin.name')}
                    defaultValue={editDialog.user.name}
                    fullWidth
                  />
                  <TextField
                    label={t('admin.email')}
                    defaultValue={editDialog.user.email}
                    fullWidth
                    disabled
                  />
                  <TextField
                    label={t('admin.phone')}
                    defaultValue={editDialog.user.phone}
                    fullWidth
                  />
                  <TextField
                    label={t('admin.location')}
                    defaultValue={editDialog.user.location}
                    fullWidth
                  />
                  <FormControl fullWidth>
                    <InputLabel>{t('admin.role')}</InputLabel>
                    <Select
                      defaultValue={editDialog.user.role}
                      label={t('admin.role')}
                    >
                      <MenuItem value="USER">{t('admin.roles.user')}</MenuItem>
                      <MenuItem value="INVESTOR">{t('admin.roles.investor')}</MenuItem>
                      <MenuItem value="ADMIN">{t('admin.roles.admin')}</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControlLabel
                    control={
                      <Switch
                        defaultChecked={editDialog.user.enabled}
                      />
                    }
                    label={t('admin.enabled')}
                  />
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditDialog({ open: false, user: null })}>
                {t('admin.cancel')}
              </Button>
              <Button variant="contained">
                {t('admin.save')}
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Delete User Dialog */}
          <Dialog
            open={deleteDialog.open}
            onClose={() => setDeleteDialog({ open: false, user: null })}
          >
            <DialogTitle>{t('admin.deleteUser')}</DialogTitle>
            <DialogContent>
              <Typography>
                {t('admin.deleteUserConfirmation', { name: deleteDialog.user?.name })}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialog({ open: false, user: null })}>
                {t('admin.cancel')}
              </Button>
              <Button variant="contained" color="error">
                {t('admin.delete')}
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Loading Backdrop */}
          <Backdrop
            sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
            open={loading}
          >
            <CircularProgress color="inherit" />
          </Backdrop>
        </Box>
      </LocalizationProvider>
    </ErrorBoundary>
  );
};

export default UserManagementPage;
