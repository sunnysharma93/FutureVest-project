import React from 'react';
import { Typography, Container, Paper } from '@mui/material';

const CoursesPage: React.FC = () => {
  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        Courses
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Browse and request educational courses available through FutureVest.
        </Typography>
      </Paper>
    </Container>
  );
};

export default CoursesPage;
