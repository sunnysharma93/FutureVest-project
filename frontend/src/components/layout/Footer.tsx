import React from 'react';
import {
  Box,
  Container,
  Typography,
  Link,
  Grid,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Facebook,
  Twitter,
  LinkedIn,
  Instagram,
  Email,
  Phone,
  LocationOn,
} from '@mui/icons-material';

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'background.paper',
        py: 6,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Company Info */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              FutureVest
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Empowering education through innovative funding solutions. 
              Connect students with investors to build a brighter future.
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <IconButton color="primary" size="small">
                <Facebook />
              </IconButton>
              <IconButton color="primary" size="small">
                <Twitter />
              </IconButton>
              <IconButton color="primary" size="small">
                <LinkedIn />
              </IconButton>
              <IconButton color="primary" size="small">
                <Instagram />
              </IconButton>
            </Box>
          </Grid>

          {/* Quick Links */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Quick Links
            </Typography>
            <Link href="#" color="text.secondary" display="block" sx={{ mb: 1 }}>
              About Us
            </Link>
            <Link href="#" color="text.secondary" display="block" sx={{ mb: 1 }}>
              How It Works
            </Link>
            <Link href="#" color="text.secondary" display="block" sx={{ mb: 1 }}>
              For Students
            </Link>
            <Link href="#" color="text.secondary" display="block" sx={{ mb: 1 }}>
              For Investors
            </Link>
            <Link href="#" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Success Stories
            </Link>
          </Grid>

          {/* Resources */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Resources
            </Typography>
            <Link href="#" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Blog
            </Link>
            <Link href="#" color="text.secondary" display="block" sx={{ mb: 1 }}>
              FAQ
            </Link>
            <Link href="#" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Terms of Service
            </Link>
            <Link href="#" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Privacy Policy
            </Link>
            <Link href="#" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Contact Support
            </Link>
          </Grid>

          {/* Contact Info */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Contact Us
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Email sx={{ mr: 1, fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">
                support@futurevest.com
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Phone sx={{ mr: 1, fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">
                +1 (555) 123-4567
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <LocationOn sx={{ mr: 1, fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">
                123 Education Street, Learning City, LC 12345
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} FutureVest. All rights reserved.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Link href="#" color="text.secondary" variant="body2">
              Terms
            </Link>
            <Link href="#" color="text.secondary" variant="body2">
              Privacy
            </Link>
            <Link href="#" color="text.secondary" variant="body2">
              Cookies
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
