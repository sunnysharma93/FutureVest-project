import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Backdrop,
  Fade,
} from '@mui/material';

interface LoadingSpinnerProps {
  size?: number;
  color?: 'primary' | 'secondary' | 'inherit';
  message?: string;
  fullScreen?: boolean;
  overlay?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  color = 'primary',
  message,
  fullScreen = false,
  overlay = false,
}) => {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        ...(fullScreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 9999,
        }),
        ...(overlay && {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(255, 255, 255, 0.7)',
          zIndex: 1000,
        }),
      }}
    >
      <CircularProgress size={size} color={color} />
      {message && (
        <Typography variant="body2" color="text.secondary" align="center">
          {message}
        </Typography>
      )}
    </Box>
  );

  if (fullScreen) {
    return (
      <Fade in>
        <Backdrop open sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          {content}
        </Backdrop>
      </Fade>
    );
  }

  return content;
};

export default LoadingSpinner;
