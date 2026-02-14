import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import RegisterForm from '../RegisterForm';
import authReducer from '../../../store/slices/authSlice';

// Mock the useAuth hook
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    registerUser: jest.fn().mockResolvedValue({
      token: 'test-token',
      userId: 'test-user-id',
      email: 'test@example.com',
      role: 'USER',
      name: 'Test User',
    }),
    isLoading: false,
  }),
}));

// Mock file upload
const createMockFile = (name: string, type: string, size: number) => {
  const file = new File(['content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
  });
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <Provider store={createTestStore()}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </Provider>
  );
};

describe('RegisterForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders registration form with all required fields', () => {
    renderWithProviders(<RegisterForm />);
    
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Account Type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    renderWithProviders(<RegisterForm />);
    
    // Try to proceed without filling fields
    const nextButton = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Name must be at least 2 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('allows navigation between form steps', async () => {
    renderWithProviders(<RegisterForm />);
    
    // Fill first step
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'john@example.com' },
    });
    
    const nextButton = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Previous/i })).toBeInTheDocument();
    });
  });

  it('validates password requirements', async () => {
    renderWithProviders(<RegisterForm />);
    
    // Navigate to password step
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'john@example.com' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    });
    
    // Try weak password
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'weak' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/Password must contain at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('shows file upload for student role', async () => {
    renderWithProviders(<RegisterForm />);
    
    // Navigate through steps
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'john@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Account Type/i), {
      target: { value: 'USER' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    });
    
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'StrongPass123!' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/Resume \(Optional\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Aadhaar Card \(Optional\)/i)).toBeInTheDocument();
    });
  });

  it('handles file upload correctly', async () => {
    renderWithProviders(<RegisterForm defaultRole="USER" />);
    
    // Navigate to documents step
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'john@example.com' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    });
    
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'StrongPass123!' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/Resume \(Optional\)/i)).toBeInTheDocument();
    });
    
    // Test file upload
    const resumeFile = createMockFile('resume.pdf', 'application/pdf', 1024);
    const resumeInput = screen.getByLabelText(/Upload Resume/i);
    
    fireEvent.change(resumeInput, { target: { files: [resumeFile] } });
    
    await waitFor(() => {
      expect(screen.getByText('resume.pdf')).toBeInTheDocument();
    });
  });

  it('validates file size and type', async () => {
    renderWithProviders(<RegisterForm defaultRole="USER" />);
    
    // Navigate to documents step
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'john@example.com' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    });
    
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'StrongPass123!' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/Resume \(Optional\)/i)).toBeInTheDocument();
    });
    
    // Test oversized file
    const largeFile = createMockFile('large.pdf', 'application/pdf', 20 * 1024 * 1024); // 20MB
    const resumeInput = screen.getByLabelText(/Upload Resume/i);
    
    // Mock window.alert
    const mockAlert = jest.spyOn(window, 'alert').mockImplementation();
    
    fireEvent.change(resumeInput, { target: { files: [largeFile] } });
    
    expect(mockAlert).toHaveBeenCalledWith('File size must be less than 10MB');
    
    mockAlert.mockRestore();
  });

  it('submits form successfully', async () => {
    const mockRegisterUser = jest.fn().mockResolvedValue({
      token: 'test-token',
      userId: 'test-user-id',
      email: 'john@example.com',
      role: 'USER',
      name: 'John Doe',
    });

    jest.doMock('../../../hooks/useAuth', () => ({
      useAuth: () => ({
        registerUser: mockRegisterUser,
        isLoading: false,
      }),
    }));

    renderWithProviders(<RegisterForm />);
    
    // Fill all steps
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'john@example.com' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    });
    
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'StrongPass123!' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));
    
    await waitFor(() => {
      expect(mockRegisterUser).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'StrongPass123!',
        role: 'USER',
        resume: undefined,
        aadhaar: undefined,
      });
    });
  });

  it('shows loading state during submission', async () => {
    const mockRegisterUser = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    jest.doMock('../../../hooks/useAuth', () => ({
      useAuth: () => ({
        registerUser: mockRegisterUser,
        isLoading: true,
      }),
    }));

    renderWithProviders(<RegisterForm />);
    
    // Fill form and submit
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'john@example.com' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    });
    
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'StrongPass123!' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/Creating Account.../i)).toBeInTheDocument();
    });
  });

  it('is accessible with proper ARIA labels', () => {
    renderWithProviders(<RegisterForm />);
    
    expect(screen.getByLabelText(/Full Name/i)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText(/Email Address/i)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByLabelText(/Account Type/i)).toHaveAttribute('aria-required', 'true');
  });
});
