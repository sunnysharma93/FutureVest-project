import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  Divider,
  Chip,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Login as LoginIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoginCredentials } from '../../types';
import LoadingSpinner from '../ui/LoadingSpinner';

// Validation schema
const loginSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address'),
  password: z.string()
    .min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  onSuccess, 
  redirectTo 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const destination = redirectTo || location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo, location.state]);

  // Set form error from auth state
  useEffect(() => {
    if (error) {
      setError('root', { message: error });
    }
  }, [error, setError]);

  const onSubmit = useCallback(async (data: LoginFormData) => {
    try {
      await login(data);
      onSuccess?.();
    } catch (error) {
      // Error is handled by useAuth hook
    }
  }, [login, onSuccess]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(onSubmit)();
    }
  }, [handleSubmit, onSubmit]);

  const handleForgotPassword = useCallback(() => {
    navigate('/forgot-password');
  }, [navigate]);

  const handleRegister = useCallback(() => {
    navigate('/register', { state: { from: location } });
  }, [navigate, location]);

  return (
    <Card 
      sx={{ 
        maxWidth: 400, 
        mx: 'auto', 
        mt: 4,
        boxShadow: (theme) => theme.shadows[8],
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome Back
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in to your FutureVest account
          </Typography>
        </Box>

        {errors.root && (
          <Alert severity="error" sx={{ mb: 3 }} role="alert">
            {errors.root.message}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate onKeyPress={handleKeyPress}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  type="email"
                  label="Email Address"
                  placeholder="Enter your email"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="action" />
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{
                    'aria-label': 'Email address',
                    'aria-required': 'true',
                    'aria-invalid': !!errors.email,
                    autoComplete: 'email',
                  }}
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  placeholder="Enter your password"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={togglePasswordVisibility}
                          edge="end"
                          disabled={isLoading}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          aria-pressed={showPassword}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{
                    'aria-label': 'Password',
                    'aria-required': 'true',
                    'aria-invalid': !!errors.password,
                    'aria-describedby': errors.password ? 'password-helper-text' : undefined,
                    autoComplete: 'current-password',
                  }}
                />
              )}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                <label htmlFor="remember-me" style={{ fontSize: '0.875rem' }}>
                  Remember me
                </label>
              </Box>
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={handleForgotPassword}
                disabled={isLoading}
                sx={{ textDecoration: 'none' }}
                aria-label="Forgot password"
              >
                Forgot password?
              </Link>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={!isValid || isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : <LoginIcon />}
              sx={{ py: 1.5 }}
              aria-label="Sign in to your account"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </Box>
        </form>

        <Divider sx={{ my: 3 }}>
          <Chip label="OR" size="small" />
        </Divider>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={handleRegister}
              disabled={isLoading}
              sx={{ textDecoration: 'none', fontWeight: 'bold' }}
              aria-label="Create a new account"
            >
              Sign up
            </Link>
          </Typography>
        </Box>

        {/* Quick login options for demo */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            Demo Accounts:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label="Student Demo"
              size="small"
              variant="outlined"
              clickable
              onClick={() => {
                navigate('/register', { 
                  state: { 
                    demoData: { 
                      email: 'student@demo.com', 
                      role: 'USER' 
                    } 
                  } 
                });
              }}
              aria-label="Try student demo"
            />
            <Chip
              label="Investor Demo"
              size="small"
              variant="outlined"
              clickable
              onClick={() => {
                navigate('/register', { 
                  state: { 
                    demoData: { 
                      email: 'investor@demo.com', 
                      role: 'INVESTOR' 
                    } 
                  } 
                });
              }}
              aria-label="Try investor demo"
            />
          </Box>
        </Box>

        {isLoading && (
          <Box sx={{ mt: 2 }}>
            <LoadingSpinner message="Signing you in..." overlay />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default LoginForm;
