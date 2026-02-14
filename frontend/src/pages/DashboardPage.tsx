import React from 'react';
import { Box, Typography, Container, Paper } from '@mui/material';

const DashboardPage: React.FC = () => {
  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Welcome to your FutureVest dashboard! This page will show your overview, 
          recent activities, and quick actions.
        </Typography>
      </Paper>
    </Container>
  );
};

export default DashboardPage;
