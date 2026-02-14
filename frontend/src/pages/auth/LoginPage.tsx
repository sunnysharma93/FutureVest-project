import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import LoginForm from '../../components/auth/LoginForm';

const LoginPage: React.FC = () => {
  return (
    <Container component="main" maxWidth="sm">
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
            Education Funding Platform
          </Typography>
        </Box>
        
        <LoginForm />
        
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            © 2024 FutureVest. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default LoginPage;
