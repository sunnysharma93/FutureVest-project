import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
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
  Avatar,
  Badge,
  Menu,
  MenuItem,
  LinearProgress,
  Rating,
  ButtonGroup,
} from '@mui/material';
import {
  Work,
  Business,
  LocationOn,
  AttachMoney,
  Schedule,
  Refresh,
  Visibility,
  Bookmark,
  BookmarkBorder,
  MoreVert,
  TrendingUp,
  Star,
  StarBorder,
  FilterList,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { useApi } from '../hooks/useApi';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { toast } from 'react-toastify';

interface JobMatch {
  userId: string;
  jobId: string;
  job: Job;
  score: number;
  skillMatch: number;
  experienceMatch: number;
  locationMatch: number;
  salaryMatch: number;
  educationMatch: number;
  matchedAt: string;
}

interface Job {
  id: string;
  title: string;
  description: string;
  company: string;
  location: string;
  type: string;
  workMode: string;
  experienceLevel: string;
  minExperience: number;
  maxExperience?: number;
  minSalary: number;
  maxSalary: number;
  requiredSkills: string[];
  preferredSkills: string[];
  requiredEducation: string;
  postedBy: string;
  postedAt: string;
  isActive: boolean;
  applicationDeadline?: string;
}

const JobMatchesPage: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [sortBy, setSortBy] = useState<'score' | 'date' | 'salary'>('score');
  const [filterType, setFilterType] = useState<'all' | 'full-time' | 'part-time' | 'remote'>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Fetch job matches
  const { data: matchesData, execute: fetchMatches } = useApi<JobMatch[]>(
    '/api/v1/jobs/matches',
    {},
    { immediate: false }
  );

  // Fetch job matches on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchMatches();
    }
  }, [isAuthenticated, fetchMatches]);

  // Update state when data changes
  useEffect(() => {
    if (matchesData) {
      setJobMatches(matchesData);
    }
  }, [matchesData]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Handle sort
  const handleSort = useCallback((type: 'score' | 'date' | 'salary') => {
    setSortBy(type);
    
    const sortedMatches = [...jobMatches].sort((a, b) => {
      switch (type) {
        case 'score':
          return b.score - a.score;
        case 'date':
          return new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime();
        case 'salary':
          return b.job.maxSalary - a.job.maxSalary;
        default:
          return 0;
      }
    });
    
    setJobMatches(sortedMatches);
  }, [jobMatches]);

  // Handle filter
  const handleFilter = useCallback((type: 'all' | 'full-time' | 'part-time' | 'remote') => {
    setFilterType(type);
    
    if (type === 'all') {
      setJobMatches(matchesData || []);
    } else {
      const filtered = (matchesData || []).filter(match => 
        type === 'all' || match.job.workMode.toLowerCase() === type
      );
      setJobMatches(filtered);
    }
  }, [matchesData]);

  // Handle view details
  const handleViewDetails = useCallback((job: Job) => {
    setSelectedJob(job);
    setShowDetailsDialog(true);
  }, []);

  // Handle apply to job
  const handleApply = useCallback(async (jobId: string) => {
    try {
      // This would typically call an API to apply to the job
      toast.success('Application submitted successfully!');
    } catch (error) {
      console.error('Error applying to job:', error);
      toast.error('Failed to submit application');
    }
  }, []);

  // Handle save job
  const handleSaveJob = useCallback(async (jobId: string) => {
    try {
      // This would typically call an API to save the job
      toast.info('Job saved to your favorites!');
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error('Failed to save job');
    }
  }, []);

  // Handle menu click
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format salary
  const formatSalary = (min: number, max: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(min) + ' - ' + new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(max);
  };

  // Get match score color
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    if (score >= 0.4) return 'info';
    return 'default';
  };

  // Get match score text
  const getScoreText = (score: number) => {
    if (score >= 0.9) return 'Excellent Match';
    if (score >= 0.8) return 'Very Good Match';
    if (score >= 0.7) return 'Good Match';
    if (score >= 0.6) return 'Fair Match';
    if (score >= 0.4) return 'Possible Match';
    return 'Low Match';
  };

  // Get work mode icon
  const getWorkModeIcon = (workMode: string) => {
    switch (workMode.toLowerCase()) {
      case 'remote':
        return '🏠';
      case 'hybrid':
        return '🏢';
      default:
        return '🏢';
    }
  };

  // Get job type icon
  const getJobTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'full-time':
        return '👔';
      case 'part-time':
        return '⏱';
      case 'contract':
        return '📄';
      case 'internship':
        return '🎓';
      default:
        return '💼';
    }
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6">Please log in to view job matches</Typography>
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
          Recommended Jobs
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handleRefresh}
            disabled={loading}
            startIcon={<Refresh />}
          >
            Refresh
          </Button>
          
          <Button
            variant="outlined"
            onClick={handleMenuClick}
            startIcon={<FilterList />}
          >
            Filter: {filterType === 'all' ? 'All' : filterType}
          </Button>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => { handleFilter('all'); handleMenuClose(); }}>
              All Jobs
            </MenuItem>
            <MenuItem onClick={() => { handleFilter('full-time'); handleMenuClose(); }}>
              Full-time
            </MenuItem>
            <MenuItem onClick={() => { handleFilter('part-time'); handleMenuClose(); }}>
              Part-time
            </MenuItem>
            <MenuItem onClick={() => { handleFilter('remote'); handleMenuClose(); }}>
              Remote
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Sort Options */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Sort by:
        </Typography>
        <ButtonGroup variant="outlined" size="small">
          <Button
            variant={sortBy === 'score' ? 'contained' : 'outlined'}
            onClick={() => handleSort('score')}
          >
            Match Score
          </Button>
          <Button
            variant={sortBy === 'date' ? 'contained' : 'outlined'}
            onClick={() => handleSort('date')}
          >
            Date Posted
          </Button>
          <Button
            variant={sortBy === 'salary' ? 'contained' : 'outlined'}
            onClick={() => handleSort('salary')}
          >
            Salary
          </Button>
        </ButtonGroup>
      </Box>

      {/* Job Matches Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : jobMatches.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Work sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Job Matches Found
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Update your profile and skills to get better job recommendations
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/profile')}
            sx={{ mt: 2 }}
          >
            Update Profile
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {jobMatches.map((match) => (
            <Grid item xs={12} md={6} lg={4} key={match.jobId}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
                onClick={() => handleViewDetails(match.job)}
              >
                {/* Match Score Badge */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    zIndex: 1,
                  }}
                >
                  <Chip
                    label={`${Math.round(match.score * 100)}%`}
                    color={getScoreColor(match.score)}
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>

                <CardContent sx={{ flexGrow: 1, pb: 2 }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        mr: 2,
                        width: 48,
                        height: 48,
                      }}
                    >
                      <Business />
                    </Avatar>
                    
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        {match.job.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {match.job.company}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Match Score Details */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      {getScoreText(match.score)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={`Skills: ${Math.round(match.skillMatch * 100)}%`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`Experience: ${Math.round(match.experienceMatch * 100)}%`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`Location: ${Math.round(match.locationMatch * 100)}%`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Box>

                  {/* Job Details */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {getWorkModeIcon(match.job.workMode)} {match.job.workMode}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getJobTypeIcon(match.job.type)} {match.job.type}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <LocationOn sx={{ fontSize: 14 }} /> {match.job.location}
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {match.job.description.length > 150
                        ? match.job.description.substring(0, 150) + '...'
                        : match.job.description}
                    </Typography>
                  </Box>

                  {/* Skills */}
                  {match.job.requiredSkills.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        Required Skills:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {match.job.requiredSkills.slice(0, 5).map((skill, index) => (
                          <Chip
                            key={index}
                            label={skill}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                        {match.job.requiredSkills.length > 5 && (
                          <Chip
                            label={`+${match.job.requiredSkills.length - 5} more`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Salary */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {formatSalary(match.job.minSalary, match.job.maxSalary)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {match.job.experienceLevel}+ years
                    </Typography>
                  </Box>

                  {/* Footer */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Posted {formatDate(match.job.postedAt)}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="View Details">
                        <IconButton size="small">
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Save Job">
                        <IconButton size="small">
                          <BookmarkBorder />
                        </IconButton>
                      </Tooltip>
                      
                      <Button
                        variant="contained"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApply(match.jobId);
                        }}
                      >
                        Apply
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Job Details Dialog */}
      <Dialog
        open={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Job Details</DialogTitle>
        <DialogContent>
          {selectedJob && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="h5" gutterBottom>
                    {selectedJob.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    {selectedJob.description}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Company
                  </Typography>
                  <Typography variant="body1">
                    {selectedJob.company}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Location
                  </Typography>
                  <Typography variant="body1">
                    {selectedJob.location}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Work Mode
                  </Typography>
                  <Typography variant="body1">
                    {selectedJob.workMode}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Job Type
                  </Typography>
                  <Typography variant="body1">
                    {selectedJob.type}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Experience Level
                  </Typography>
                  <Typography variant="body1">
                    {selectedJob.experienceLevel}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text-secondary">
                    Salary Range
                  </Typography>
                  <Typography variant="body1">
                    {formatSalary(selectedJob.minSalary, selectedJob.maxSalary)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Required Education
                  </Typography>
                  <Typography variant="body1">
                    {selectedJob.requiredEducation}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Required Skills
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedJob.requiredSkills.map((skill, index) => (
                      <Chip
                        key={index}
                        label={skill}
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Box>
                </Grid>
                
                {selectedJob.preferredSkills.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Preferred Skills
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {selectedJob.preferredSkills.map((skill, index) => (
                        <Chip
                          key={index}
                          label={skill}
                          variant="outlined"
                          size="small"
                          color="secondary"
                        />
                      ))}
                    </Box>
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Application Deadline
                  </Typography>
                  <Typography variant="body1">
                    {selectedJob.applicationDeadline
                      ? formatDate(selectedJob.applicationDeadline)
                      : 'No deadline'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailsDialog(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedJob) {
                handleApply(selectedJob.id);
                setShowDetailsDialog(false);
              }
            }}
          >
            Apply Now
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
        <LoadingSpinner message="Loading job matches..." fullScreen />
      )}
    </Box>
  );
};

export default JobMatchesPage;
