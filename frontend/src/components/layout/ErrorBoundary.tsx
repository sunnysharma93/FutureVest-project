import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  Refresh,
  Home,
  ReportProblem,
  BugReport,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // You could also log the error to a service here
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // In a real application, you would send this to your error reporting service
    // like Sentry, LogRocket, or your own API endpoint
    try {
      console.log('Error logged to service:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorBoundaryContent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorBoundaryContentProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReload: () => void;
  onGoHome: () => void;
}

const ErrorBoundaryContent: React.FC<ErrorBoundaryContentProps> = ({
  error,
  errorInfo,
  onReload,
  onGoHome,
}) => {
  const navigate = useNavigate();

  const handleReload = () => {
    onReload();
  };

  const handleGoHome = () => {
    onGoHome();
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Box sx={{ mb: 3 }}>
          <ReportProblem sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Oops! Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            We're sorry, but something unexpected happened. Our team has been notified 
            and is working to fix this issue.
          </Typography>
        </Box>

        <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
          <AlertTitle>Error Details</AlertTitle>
          <Typography variant="body2" component="pre" sx={{ 
            fontSize: '0.75rem', 
            overflow: 'auto', 
            maxHeight: 200,
            bgcolor: 'grey.100',
            p: 1,
            borderRadius: 1,
          }}>
            {error?.message}
          </Typography>
        </Alert>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={handleReload}
          >
            Reload Page
          </Button>
          <Button
            variant="outlined"
            startIcon={<Home />}
            onClick={handleGoHome}
          >
            Go Home
          </Button>
          <Button
            variant="text"
            onClick={handleGoBack}
          >
            Go Back
          </Button>
        </Box>

        {/* Development-only error details */}
        {process.env.NODE_ENV === 'development' && error && errorInfo && (
          <Box sx={{ mt: 4, textAlign: 'left' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <BugReport sx={{ mr: 1, color: 'warning.main' }} />
              <Typography variant="h6">Development Error Details</Typography>
            </Box>
            
            <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100' }}>
              <Typography variant="subtitle2" gutterBottom>
                Error Stack:
              </Typography>
              <pre style={{ fontSize: '0.75rem', overflow: 'auto', maxHeight: 200 }}>
                {error.stack}
              </pre>
              
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Component Stack:
              </Typography>
              <pre style={{ fontSize: '0.75rem', overflow: 'auto', maxHeight: 200 }}>
                {errorInfo.componentStack}
              </pre>
            </Paper>
          </Box>
        )}

        <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            If this problem persists, please contact our support team at 
            <strong> support@futurevest.com</strong>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default ErrorBoundary;
