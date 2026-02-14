import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  InputAdornment,
  Skeleton,
  Fab,
} from '@mui/material';
import {
  Search,
  FilterList,
  School,
  AttachMoney,
  Timer,
  Category,
  Refresh,
  ShoppingCart,
  Visibility,
  Star,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Course } from '../types';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface CourseListPageProps {
  category?: string;
}

const CourseListPage: React.FC<CourseListPageProps> = ({ category: initialCategory }) => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || '');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
  const observer = useRef<IntersectionObserver>();
  const lastCourseElementRef = useRef<HTMLDivElement>(null);

  // Mock data for development
  const mockCourses: Course[] = [
    {
      id: '1',
      title: 'Complete Web Development Bootcamp 2024',
      description: 'Learn HTML, CSS, JavaScript, React, Node.js and more in this comprehensive web development course.',
      provider: 'UDEMY',
      externalCourseId: 'udemy-123',
      cost: 89.99,
      status: 'AVAILABLE',
      category: 'Web Development',
      durationInHours: 40,
      createdAt: new Date('2024-01-15').toISOString(),
      updatedAt: new Date('2024-01-15').toISOString(),
    },
    {
      id: '2',
      title: 'Machine Learning A-Z: Hands-On Python & R',
      description: 'Learn to create Machine Learning Algorithms in Python and R. Two data science languages in one course.',
      provider: 'UDEMY',
      externalCourseId: 'udemy-456',
      cost: 94.99,
      status: 'AVAILABLE',
      category: 'Data Science',
      durationInHours: 21,
      createdAt: new Date('2024-01-20').toISOString(),
      updatedAt: new Date('2024-01-20').toISOString(),
    },
    {
      id: '3',
      title: 'Python for Data Science and Machine Learning Bootcamp',
      description: 'Learn how to use NumPy, Pandas, Seaborn, Matplotlib, Plotly, Scikit-Learn, Machine Learning, and more!',
      provider: 'UDEMY',
      externalCourseId: 'udemy-789',
      cost: 84.99,
      status: 'AVAILABLE',
      category: 'Data Science',
      durationInHours: 25,
      createdAt: new Date('2024-02-01').toISOString(),
      updatedAt: new Date('2024-02-01').toISOString(),
    },
    {
      id: '4',
      title: 'React - The Complete Guide',
      description: 'Dive in and learn React from scratch! Learn React, Redux, React-Native, Hooks, and more!',
      provider: 'UDEMY',
      externalCourseId: 'udemy-101',
      cost: 89.99,
      status: 'AVAILABLE',
      category: 'Web Development',
      durationInHours: 48,
      createdAt: new Date('2024-02-10').toISOString(),
      updatedAt: new Date('2024-02-10').toISOString(),
    },
    {
      id: '5',
      title: 'Digital Marketing Complete Course',
      description: '12 courses in 1! Learn Digital Marketing, SEO, WordPress, Email Marketing, Social Media Marketing, and more.',
      provider: 'UDEMY',
      externalCourseId: 'udemy-202',
      cost: 94.99,
      status: 'AVAILABLE',
      category: 'Marketing',
      durationInHours: 23,
      createdAt: new Date('2024-02-15').toISOString(),
      updatedAt: new Date('2024-02-15').toISOString(),
    },
  ];

  const categories = ['Web Development', 'Data Science', 'Marketing', 'Business', 'Design', 'Programming'];
  const providers = ['UDEMY', 'COURSERA', 'LINKEDIN', 'OTHER'];

  // Fetch courses with infinite scroll
  const fetchCourses = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (reset) {
        setCourses(mockCourses);
        setPage(0);
        setHasMore(mockCourses.length >= 10);
      } else {
        // In a real app, this would fetch the next page
        setHasMore(false); // No more data for demo
      }
    } catch (err) {
      setError('Failed to fetch courses');
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCourses(true);
  }, [fetchCourses]);

  // Intersection Observer for infinite scroll
  const lastCourseElementCallback = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
        fetchCourses(false);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, fetchCourses]);

  // Filter courses based on search and filters
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || course.category === selectedCategory;
    const matchesProvider = !selectedProvider || course.provider === selectedProvider;
    
    return matchesSearch && matchesCategory && matchesProvider;
  });

  const handleEnroll = useCallback((courseId: string) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/courses/enroll/${courseId}` } });
      return;
    }
    navigate(`/payment/create?courseId=${courseId}`);
  }, [isAuthenticated, navigate]);

  const handleViewDetails = useCallback((courseId: string) => {
    navigate(`/courses/${courseId}`);
  }, [navigate]);

  const handleRefresh = useCallback(() => {
    fetchCourses(true);
  }, [fetchCourses]);

  const handleSearch = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  const handleCategoryChange = useCallback((event: any) => {
    setSelectedCategory(event.target.value);
  }, []);

  const handleProviderChange = useCallback((event: any) => {
    setSelectedProvider(event.target.value);
  }, []);

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'UDEMY': return 'primary';
      case 'COURSERA': return 'secondary';
      case 'LINKEDIN': return 'info';
      default: return 'default';
    }
  };

  const renderCourseCard = (course: Course, index: number) => {
    const isLast = index === filteredCourses.length - 1;
    
    return (
      <Grid item xs={12} sm={6} md={4} key={course.id}>
        <Card 
          sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 4,
            },
          }}
          ref={isLast ? lastCourseElementCallback : null}
        >
          <CardMedia
            component="div"
            sx={{
              height: 140,
              bgcolor: 'primary.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <School sx={{ fontSize: 48, color: 'white' }} />
          </CardMedia>
          
          <CardContent sx={{ flexGrow: 1, pb: 1 }}>
            <Typography variant="h6" component="h3" gutterBottom noWrap>
              {course.title}
            </Typography>
            
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {course.description}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip 
                label={course.category} 
                size="small" 
                color="primary" 
                variant="outlined"
              />
              <Chip 
                label={course.provider} 
                size="small" 
                color={getProviderColor(course.provider) as any}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AttachMoney sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
                <Typography variant="body2" fontWeight="bold">
                  ${course.cost}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Timer sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
                <Typography variant="body2">
                  {course.durationInHours}h
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<ShoppingCart />}
                onClick={() => handleEnroll(course.id)}
                sx={{ flexGrow: 1 }}
              >
                Enroll
              </Button>
              
              <Tooltip title="View Details">
                <IconButton 
                  size="small" 
                  onClick={() => handleViewDetails(course.id)}
                  aria-label={`View details for ${course.title}`}
                >
                  <Visibility />
                </IconButton>
              </Tooltip>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    );
  };

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
          Available Courses
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Discover and enroll in courses to enhance your skills and advance your career.
        </Typography>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search courses..."
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
                  'aria-label': 'Search courses',
                }}
              />
            </Grid>

            <Grid item xs={12} sm={4} md={2}>
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

            <Grid item xs={12} sm={4} md={2}>
              <FormControl fullWidth>
                <InputLabel id="provider-filter">Provider</InputLabel>
                <Select
                  labelId="provider-filter"
                  value={selectedProvider}
                  onChange={handleProviderChange}
                  label="Provider"
                  inputProps={{
                    'aria-label': 'Filter by provider',
                  }}
                >
                  <MenuItem value="">All Providers</MenuItem>
                  {providers.map((provider) => (
                    <MenuItem key={provider} value={provider}>
                      {provider}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleRefresh}
                disabled={loading}
                aria-label="Refresh courses"
              >
                Refresh
              </Button>
            </Grid>

            <Grid item xs={12} sm={4} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<FilterList />}
                onClick={() => navigate('/courses/request')}
                aria-label="Request a new course"
              >
                Request Course
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Course Grid */}
      {loading && courses.length === 0 ? (
        <Grid container spacing={3}>
          {[...Array(6)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card sx={{ height: '100%' }}>
                <Skeleton variant="rectangular" height={140} />
                <CardContent>
                  <Skeleton variant="text" />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" width="60%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <>
          {filteredCourses.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <School sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No courses found
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Try adjusting your search terms or filters, or request a new course.
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/courses/request')}
                startIcon={<School />}
                sx={{ mt: 2 }}
              >
                Request a Course
              </Button>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {filteredCourses.map((course, index) => renderCourseCard(course, index))}
            </Grid>
          )}
        </>
      )}

      {/* Loading indicator for infinite scroll */}
      {loading && courses.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* No more courses indicator */}
      {!hasMore && !loading && courses.length > 0 && (
        <Box sx={{ textAlign: 'center', mt: 4, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No more courses to load
          </Typography>
        </Box>
      )}

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        aria-label="Request course"
        onClick={() => navigate('/courses/request')}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', md: 'none' },
        }}
      >
        <School />
      </Fab>
    </Container>
  );
};

export default CourseListPage;
