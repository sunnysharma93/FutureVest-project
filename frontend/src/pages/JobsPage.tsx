import React from 'react';
import { Typography, Container, Paper } from '@mui/material';

const JobsPage: React.FC = () => {
  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        Jobs
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Find job opportunities posted by investors and companies in the FutureVest network.
        </Typography>
      </Paper>
    </Container>
  );
};

export default JobsPage;
