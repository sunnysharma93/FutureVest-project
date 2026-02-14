import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Pagination,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  InputAdornment,
  Skeleton,
  Fab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
} from '@mui/material';
import {
  Search,
  FilterList,
  Work,
  Business,
  LocationOn,
  AttachMoney,
  AccessTime,
  ExpandMore,
  Send,
  Bookmark,
  BookmarkBorder,
  Refresh,
  Computer,
  Home,
  Public,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Job } from '../types';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface JobListPageProps {
  category?: string;
}

const JobListPage: React.FC<JobListPageProps> = ({ category: initialCategory }) => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || '');
  const [selectedJobType, setSelectedJobType] = useState('');
  const [selectedWorkMode, setSelectedWorkMode] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());

  // Mock data for development
  const mockJobs: Job[] = [
    {
      id: '1',
      title: 'Senior Frontend Developer',
      description: 'We are looking for an experienced Frontend Developer to join our growing team. You will work on cutting-edge web applications using React, TypeScript, and modern CSS frameworks.',
      companyName: 'TechCorp Solutions',
      location: 'San Francisco, CA',
      jobType: 'FULL_TIME',
      workMode: 'HYBRID',
      salaryMin: 120000,
      salaryMax: 180000,
      requiredSkills: 'React, TypeScript, CSS, HTML5, JavaScript, Git',
      experienceLevel: 'Senior',
      postedBy: 'investor1',
      active: true,
      createdAt: new Date('2024-02-01').toISOString(),
      updatedAt: new Date('2024-02-01').toISOString(),
    },
    {
      id: '2',
      title: 'Data Scientist Intern',
      description: 'Join our data science team for a 3-month internship. You will work on real-world projects, analyze data, and build machine learning models.',
      companyName: 'DataTech Analytics',
      location: 'Remote',
      jobType: 'INTERNSHIP',
      workMode: 'REMOTE',
      salaryMin: 25000,
      salaryMax: 35000,
      requiredSkills: 'Python, Machine Learning, Data Analysis, SQL, Statistics',
      experienceLevel: 'Entry Level',
      postedBy: 'investor2',
      active: true,
      createdAt: new Date('2024-02-05').toISOString(),
      updatedAt: new Date('2024-02-05').toISOString(),
    },
    {
      id: '3',
      title: 'Full Stack Developer',
      description: 'We are seeking a talented Full Stack Developer to build scalable web applications. Experience with both frontend and backend technologies is required.',
      companyName: 'StartupHub',
      location: 'New York, NY',
      jobType: 'FULL_TIME',
      workMode: 'ONSITE',
      salaryMin: 100000,
      salaryMax: 150000,
      requiredSkills: 'React, Node.js, Express, MongoDB, AWS, Docker',
      experienceLevel: 'Mid-Level',
      postedBy: 'investor1',
      active: true,
      createdAt: new Date('2024-02-10').toISOString(),
      updatedAt: new Date('2024-02-10').toISOString(),
    },
    {
      id: '4',
      title: 'UX/UI Designer',
      description: 'Creative UX/UI Designer needed to design user-friendly interfaces for our mobile and web applications. Portfolio required.',
      companyName: 'Design Studio Pro',
      location: 'Los Angeles, CA',
      jobType: 'CONTRACT',
      workMode: 'REMOTE',
      salaryMin: 80,
      salaryMax: 120,
      requiredSkills: 'Figma, Adobe XD, Sketch, Prototyping, User Research',
      experienceLevel: 'Mid-Level',
      postedBy: 'investor3',
      active: true,
      createdAt: new Date('2024-02-12').toISOString(),
      updatedAt: new Date('2024-02-12').toISOString(),
    },
    {
      id: '5',
      title: 'Backend Engineer',
      description: 'Experienced Backend Engineer to design and implement scalable APIs and microservices. Strong knowledge of databases and cloud platforms required.',
      companyName: 'CloudTech Systems',
      location: 'Seattle, WA',
      jobType: 'FULL_TIME',
      workMode: 'HYBRID',
      salaryMin: 130000,
      salaryMax: 190000,
      requiredSkills: 'Java, Spring Boot, Microservices, AWS, PostgreSQL, Redis',
      experienceLevel: 'Senior',
      postedBy: 'investor2',
      active: true,
      createdAt: new Date('2024-02-15').toISOString(),
      updatedAt: new Date('2024-02-15').toISOString(),
    },
  ];

  const jobTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'];
  const workModes = ['REMOTE', 'HYBRID', 'ONSITE'];
  const categories = ['Software Development', 'Data Science', 'Design', 'Marketing', 'Sales', 'Product Management'];
  const locations = ['San Francisco, CA', 'New York, NY', 'Los Angeles, CA', 'Seattle, WA', 'Remote', 'Austin, TX'];

  // Fetch jobs with pagination
  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setJobs(mockJobs);
      setTotalPages(3);
      setTotalElements(mockJobs.length);
    } catch (err) {
      setError('Failed to fetch jobs');
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Handle page change
  const handlePageChange = useCallback((event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    fetchJobs();
  }, [fetchJobs]);

  // Filter jobs based on search and filters
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || job.requiredSkills.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesJobType = !selectedJobType || job.jobType === selectedJobType;
    const matchesWorkMode = !selectedWorkMode || job.workMode === selectedWorkMode;
    const matchesLocation = !selectedLocation || job.location.toLowerCase().includes(selectedLocation.toLowerCase());
    const matchesMinSalary = !minSalary || job.salaryMin >= parseInt(minSalary);
    const matchesMaxSalary = !maxSalary || job.salaryMax <= parseInt(maxSalary);

    return matchesSearch && matchesCategory && matchesJobType && matchesWorkMode && matchesLocation && matchesMinSalary && matchesMaxSalary;
  });

  const handleApply = useCallback((jobId: string) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/jobs/apply/${jobId}` } });
      return;
    }
    navigate(`/jobs/apply/${jobId}`);
  }, [isAuthenticated, navigate]);

  const handleSaveJob = useCallback((jobId: string) => {
    setSavedJobs(prev => {
      const newSaved = new Set(prev);
      if (newSaved.has(jobId)) {
        newSaved.delete(jobId);
      } else {
        newSaved.add(jobId);
      }
      return newSaved;
    });
  }, []);

  const handleRefresh = useCallback(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSearch = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(1);
  }, []);

  const handleCategoryChange = useCallback((event: any) => {
    setSelectedCategory(event.target.value);
    setPage(1);
  }, []);

  const handleJobTypeChange = useCallback((event: any) => {
    setSelectedJobType(event.target.value);
    setPage(1);
  }, []);

  const handleWorkModeChange = useCallback((event: any) => {
    setSelectedWorkMode(event.target.value);
    setPage(1);
  }, []);

  const handleLocationChange = useCallback((event: any) => {
    setSelectedLocation(event.target.value);
    setPage(1);
  }, []);

  const getJobTypeColor = (jobType: string) => {
    switch (jobType) {
      case 'FULL_TIME': return 'success';
      case 'PART_TIME': return 'info';
      case 'CONTRACT': return 'warning';
      case 'INTERNSHIP': return 'secondary';
      default: return 'default';
    }
  };

  const getWorkModeIcon = (workMode: string) => {
    switch (workMode) {
      case 'REMOTE': return <Public />;
      case 'HYBRID': return <Computer />;
      case 'ONSITE': return <Home />;
      default: return <Work />;
    }
  };

  const formatSalary = (min: number, max: number) => {
    if (min < 1000) {
      return `$${min}/hr - $${max}/hr`;
    }
    return `$${(min / 1000).toFixed(0)}k - ${(max / 1000).toFixed(0)}k`;
  };

  const renderJobCard = (job: Job) => (
    <Card key={job.id} sx={{ mb: 2 }}>
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" component="h3" gutterBottom>
                  {job.title}
                </Typography>
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  {job.companyName}
                </Typography>
              </Box>
              <IconButton
                onClick={() => handleSaveJob(job.id)}
                color={savedJobs.has(job.id) ? 'primary' : 'default'}
                aria-label={savedJobs.has(job.id) ? 'Remove from saved jobs' : 'Save job'}
              >
                {savedJobs.has(job.id) ? <Bookmark /> : <BookmarkBorder />}
              </IconButton>
            </Box>

            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {job.description}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip 
                label={job.jobType.replace('_', ' ')} 
                size="small" 
                color={getJobTypeColor(job.jobType) as any}
              />
              <Chip 
                label={job.workMode} 
                size="small" 
                variant="outlined"
                icon={getWorkModeIcon(job.workMode)}
              />
              <Chip 
                label={job.experienceLevel} 
                size="small" 
                variant="outlined"
              />
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocationOn sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                  <Typography variant="body2">
                    {job.location}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AttachMoney sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                  <Typography variant="body2">
                    {formatSalary(job.salaryMin, job.salaryMax)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AccessTime sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                  <Typography variant="body2">
                    {job.jobType === 'CONTRACT' ? 'Contract' : 'Full-time'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Business sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                  <Typography variant="body2">
                    Posted {new Date(job.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="body2">View Requirements & Apply</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Required Skills:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {job.requiredSkills.split(',').map((skill, index) => (
                      <Chip key={index} label={skill.trim()} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<Send />}
                    onClick={() => handleApply(job.id)}
                    sx={{ flexGrow: 1 }}
                  >
                    Apply Now
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    View Details
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  if (error) {
    return (
      <Container>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" onClick={handleRefresh}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Job Opportunities
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Find your next career opportunity with companies and investors in the FutureVest network.
        </Typography>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                placeholder="Search jobs, companies, or skills..."
                value={searchTerm}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                inputProps={{
                  'aria-label': 'Search jobs',
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel id="category-filter">Category</InputLabel>
                <Select
                  labelId="category-filter"
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  label="Category"
                  inputProps={{
                    'aria-label': 'Filter by category',
                  }}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel id="jobtype-filter">Job Type</InputLabel>
                <Select
                  labelId="jobtype-filter"
                  value={selectedJobType}
                  onChange={handleJobTypeChange}
                  label="Job Type"
                  inputProps={{
                    'aria-label': 'Filter by job type',
                  }}
                >
                  <MenuItem value="">All Types</MenuItem>
                  {jobTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.replace('_', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel id="workmode-filter">Work Mode</InputLabel>
                <Select
                  labelId="workmode-filter"
                  value={selectedWorkMode}
                  onChange={handleWorkModeChange}
                  label="Work Mode"
                  inputProps={{
                    'aria-label': 'Filter by work mode',
                  }}
                >
                  <MenuItem value="">All Modes</MenuItem>
                  {workModes.map((mode) => (
                    <MenuItem key={mode} value={mode}>
                      {mode}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={1}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleRefresh}
                disabled={loading}
                aria-label="Refresh jobs"
              >
                Refresh
              </Button>
            </Grid>
          </Grid>

          {/* Advanced Filters */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel id="location-filter">Location</InputLabel>
                <Select
                  labelId="location-filter"
                  value={selectedLocation}
                  onChange={handleLocationChange}
                  label="Location"
                  inputProps={{
                    'aria-label': 'Filter by location',
                  }}
                >
                  <MenuItem value="">All Locations</MenuItem>
                  {locations.map((location) => (
                    <MenuItem key={location} value={location}>
                      {location}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Min Salary"
                type="number"
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value)}
                inputProps={{
                  'aria-label': 'Minimum salary filter',
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Max Salary"
                type="number"
                value={maxSalary}
                onChange={(e) => setMaxSalary(e.target.value)}
                inputProps={{
                  'aria-label': 'Maximum salary filter',
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              {user?.role === 'INVESTOR' && (
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Work />}
                  onClick={() => navigate('/jobs/post')}
                  aria-label="Post a new job"
                >
                  Post Job
                </Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {!loading && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Showing {filteredJobs.length} of {totalElements} jobs
          </Typography>
          {savedJobs.size > 0 && (
            <Typography variant="body2" color="text.secondary">
              {savedJobs.size} saved jobs
            </Typography>
          )}
        </Box>
      )}

      {/* Job Listings */}
      {loading && jobs.length === 0 ? (
        <Box>
          {[...Array(5)].map((_, index) => (
            <Card key={index} sx={{ mb: 2 }}>
              <CardContent>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="rectangular" height={100} sx={{ mt: 2 }} />
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <>
          {filteredJobs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Work sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No jobs found
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Try adjusting your search terms or filters to find more opportunities.
              </Typography>
            </Box>
          ) : (
            <Box>
              {filteredJobs.map(renderJobCard)}
            </Box>
          )}
        </>
      )}

      {/* Pagination */}
      {filteredJobs.length > 0 && totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Loading indicator */}
      {loading && jobs.length > 0 && (
        <LinearProgress sx={{ mb: 2 }} />
      )}

      {/* Floating Action Button for mobile */}
      {user?.role === 'INVESTOR' && (
        <Fab
          color="primary"
          aria-label="Post job"
          onClick={() => navigate('/jobs/post')}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            display: { xs: 'flex', md: 'none' },
          }}
        >
          <Work />
        </Fab>
      )}
    </Container>
  );
};

export default JobListPage;
