import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import RegisterForm from '../RegisterForm';
import authSlice from '../../store/slices/authSlice';
import { toast } from 'react-toastify';

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock API
const mockRegister = jest.fn();
jest.mock('../../services/authService', () => ({
  authService: {
    register: mockRegister,
  },
}));

describe('RegisterForm Component', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authSlice,
      },
    });
    
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <Provider store={store}>
        <BrowserRouter>
          <RegisterForm />
        </BrowserRouter>
      </Provider>
    );
  };

  test('renders registration form correctly', () => {
    renderComponent();

    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument();
    expect(screen.getByText(/Already have an account/i)).toBeInTheDocument();
  });

  test('shows validation errors for empty fields', async () => {
    renderComponent();

    const submitButton = screen.getByRole('button', { name: /Register/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Full name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Please confirm your password/i)).toBeInTheDocument();
    });
  });

  test('shows validation error for invalid email', async () => {
    renderComponent();

    const emailInput = screen.getByLabelText(/Email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    const submitButton = screen.getByRole('button', { name: /Register/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  test('shows validation error for short password', async () => {
    renderComponent();

    const passwordInput = screen.getByLabelText(/Password/i);
    fireEvent.change(passwordInput, { target: { value: '123' } });

    const submitButton = screen.getByRole('button', { name: /Register/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Password must be at least 6 characters/i)).toBeInTheDocument();
    });
  });

  test('shows validation error for password mismatch', async () => {
    renderComponent();

    const passwordInput = screen.getByLabelText(/Password/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
    
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'different-password' } });

    const submitButton = screen.getByRole('button', { name: /Register/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });
  });

  test('submits form successfully with valid data', async () => {
    mockRegister.mockResolvedValue({
      user: {
        id: 'user-123',
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'USER',
      },
      token: 'mock-jwt-token',
    });

    renderComponent();

    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'john.doe@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'password123' },
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Register/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Registration successful!');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('handles registration error', async () => {
    mockRegister.mockRejectedValue(new Error('Registration failed'));

    renderComponent();

    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'john.doe@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'password123' },
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Register/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Registration failed');
    });
  });

  test('shows loading state during submission', async () => {
    mockRegister.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    renderComponent();

    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'john.doe@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'password123' },
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Register/i });
    fireEvent.click(submitButton);

    // Check loading state
    expect(screen.getByRole('button', { name: /Register/i })).toBeDisabled();
    expect(screen.getByText(/Registering.../)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Register/i })).not.toBeDisabled();
    }, { timeout: 2000 });
  });

  test('navigates to login page when clicking login link', () => {
    renderComponent();

    const loginLink = screen.getByText(/Sign in/i);
    fireEvent.click(loginLink);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('handles file upload for resume', async () => {
    renderComponent();

    const fileInput = screen.getByLabelText(/Resume/i);
    const file = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/resume.pdf/i)).toBeInTheDocument();
    });
  });

  test('handles file upload for Aadhaar', async () => {
    renderComponent();

    const fileInput = screen.getByLabelText(/Aadhaar/i);
    const file = new File(['test content'], 'aadhaar.pdf', { type: 'application/pdf' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/aadhaar.pdf/i)).toBeInTheDocument();
    });
  });

  test('removes uploaded file when clicking remove button', async () => {
    renderComponent();

    const fileInput = screen.getByLabelText(/Resume/i);
    const file = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/resume.pdf/i)).toBeInTheDocument();
    });

    const removeButton = screen.getByRole('button', { name: /Remove/i });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText(/resume.pdf/i)).not.toBeInTheDocument();
    });
  });

  test('shows file validation error for invalid file type', async () => {
    renderComponent();

    const fileInput = screen.getByLabelText(/Resume/i);
    const file = new File(['test content'], 'invalid.exe', { type: 'application/octet-stream' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
    });
  });

  test('shows file validation error for large file', async () => {
    renderComponent();

    const fileInput = screen.getByLabelText(/Resume/i);
    const file = new File(['x'.repeat(6 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/File size exceeds 5MB limit/i)).toBeInTheDocument();
    });
  });

  test('handles keyboard navigation', async () => {
    renderComponent();

    const nameInput = screen.getByLabelText(/Full Name/i);
    nameInput.focus();

    // Tab through fields
    fireEvent.keyDown(nameInput, { key: 'Tab' });
    
    expect(screen.getByLabelText(/Email/i)).toHaveFocus();

    fireEvent.keyDown(screen.getByLabelText(/Email/i), { key: 'Tab' });
    
    expect(screen.getByLabelText(/Password/i)).toHaveFocus();

    fireEvent.keyDown(screen.getByLabelText(/Password/i), { key: 'Tab' });
    
    expect(screen.getByLabelText(/Confirm Password/i)).toHaveFocus();
  });

  test('handles Enter key submission', async () => {
    mockRegister.mockResolvedValue({
      user: {
        id: 'user-123',
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'USER',
      },
      token: 'mock-jwt-token',
    });

    renderComponent();

    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'john.doe@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'password123' },
    });

    // Submit with Enter key
    fireEvent.keyDown(screen.getByLabelText(/Confirm Password/i), { key: 'Enter' });

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password123',
      });
    });
  });

  test('shows password strength indicator', async () => {
    renderComponent();

    const passwordInput = screen.getByLabelText(/Password/i);
    
    // Test weak password
    fireEvent.change(passwordInput, { target: { value: '123' } });
    
    await waitFor(() => {
      expect(screen.getByText(/Weak password/i)).toBeInTheDocument();
    });

    // Test strong password
    fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });
    
    await waitFor(() => {
      expect(screen.getByText(/Strong password/i)).toBeInTheDocument();
    });
  });

  test('handles form reset', async () => {
    renderComponent();

    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'john.doe@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'password123' },
    });

    // Reset form
    const resetButton = screen.getByRole('button', { name: /Reset/i });
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toHaveValue('');
      expect(screen.getByLabelText(/Email/i)).toHaveValue('');
      expect(screen.getByLabelText(/Password/i)).toHaveValue('');
      expect(screen.getByLabelText(/Confirm Password/i)).toHaveValue('');
    });
  });

  test('shows terms and conditions checkbox', () => {
    renderComponent();

    const termsCheckbox = screen.getByLabelText(/I agree to the Terms and Conditions/i);
    expect(termsCheckbox).toBeInTheDocument();

    // Test checkbox interaction
    fireEvent.click(termsCheckbox);
    expect(termsCheckbox).toBeChecked();

    fireEvent.click(termsCheckbox);
    expect(termsCheckbox).not.toBeChecked();
  });

  test('prevents submission without accepting terms', async () => {
    renderComponent();

    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'john.doe@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'password123' },
    });

    // Submit without accepting terms
    const submitButton = screen.getByRole('button', { name: /Register/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/You must accept the terms and conditions/i)).toBeInTheDocument();
    });
  });

  test('shows success message after successful registration', async () => {
    mockRegister.mockResolvedValue({
      user: {
        id: 'user-123',
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'USER',
      },
      token: 'mock-jwt-token',
    });

    renderComponent();

    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'john.doe@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'password123' },
    });

    // Accept terms
    fireEvent.click(screen.getByLabelText(/I agree to the Terms and Conditions/i));

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Register/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Registration successful!/i)).toBeInTheDocument();
      expect(screen.getByText(/Welcome to FutureVest!/i)).toBeInTheDocument();
    });
  });
});
