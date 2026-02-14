import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import RegisterForm from '../../components/auth/RegisterForm';
import { useLocation } from 'react-router-dom';

const RegisterPage: React.FC = () => {
  const location = useLocation();
  const demoData = location.state?.demoData;

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4,
        }}
      >
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom color="primary">
            FutureVest
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Join our education funding community
          </Typography>
          {demoData && (
            <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
              Demo mode: {demoData.role === 'USER' ? 'Student' : 'Investor'} account
            </Typography>
          )}
        </Box>
        
        <RegisterForm 
          defaultRole={demoData?.role || 'USER'}
          onSuccess={() => {
            // Registration success is handled by the form component
          }}
        />
        
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default RegisterPage;
