import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PaymentForm from '../PaymentForm';
import { paymentService } from '../../services/paymentService';

// Mock the payment service
jest.mock('../../services/paymentService');
const mockPaymentService = paymentService as jest.Mocked<typeof paymentService>;

// Mock Razorpay
const mockRazorpay = {
  open: jest.fn(),
  close: jest.fn(),
};

// Mock window.Razorpay
Object.defineProperty(window, 'Razorpay', {
  writable: true,
  value: jest.fn(() => mockRazorpay),
});

// Mock toast
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = createTheme();
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('PaymentForm Component', () => {
  const mockInvestment = {
    id: 'investment-123',
    amount: 50000,
    duration: 24,
    interestRate: 10.5,
    monthlyPayment: 2315.47,
    status: 'ACTIVE',
  };

  const mockUser = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john.doe@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('user', JSON.stringify(mockUser));
    
    // Mock successful payment order creation
    mockPaymentService.createPaymentOrder.mockResolvedValue('order_123456789');
  });

  afterEach(() => {
    localStorage.clear();
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      investment: mockInvestment,
      amount: 2315.47,
      onSuccess: jest.fn(),
      onCancel: jest.fn(),
      ...props,
    };

    return render(
      <TestWrapper>
        <PaymentForm {...defaultProps} />
      </TestWrapper>
    );
  };

  describe('Component Rendering', () => {
    it('should render payment form correctly', () => {
      renderComponent();

      expect(screen.getByText('Payment Details')).toBeInTheDocument();
      expect(screen.getByText('Amount to Pay')).toBeInTheDocument();
      expect(screen.getByDisplayValue('₹2,315.47')).toBeInTheDocument();
      expect(screen.getByText('Investment ID')).toBeInTheDocument();
      expect(screen.getByText('investment-123')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pay now/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should display investment details correctly', () => {
      renderComponent();

      expect(screen.getByText('Duration')).toBeInTheDocument();
      expect(screen.getByText('24 months')).toBeInTheDocument();
      expect(screen.getByText('Interest Rate')).toBeInTheDocument();
      expect(screen.getByText('10.5%')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      mockPaymentService.createPaymentOrder.mockImplementation(() => new Promise(() => {}));
      
      renderComponent();

      expect(screen.getByRole('button', { name: /pay now/i })).toBeDisabled();
    });
  });

  describe('Payment Flow', () => {
    it('should initiate payment when Pay Now button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const payButton = screen.getByRole('button', { name: /pay now/i });
      
      await act(async () => {
        await user.click(payButton);
      });

      expect(mockPaymentService.createPaymentOrder).toHaveBeenCalledWith(
        mockUser.id,
        mockInvestment.id,
        2315.47
      );
    });

    it('should open Razorpay modal after order creation', async () => {
      const user = userEvent.setup();
      renderComponent();

      const payButton = screen.getByRole('button', { name: /pay now/i });
      
      await act(async () => {
        await user.click(payButton);
      });

      await waitFor(() => {
        expect(mockRazorpay.open).toHaveBeenCalled();
      });
    });

    it('should handle successful payment', async () => {
      const mockOnSuccess = jest.fn();
      const user = userEvent.setup();
      
      renderComponent({ onSuccess: mockOnSuccess });

      const payButton = screen.getByRole('button', { name: /pay now/i });
      
      await act(async () => {
        await user.click(payButton);
      });

      // Simulate successful payment
      await waitFor(() => {
        expect(mockRazorpay.open).toHaveBeenCalled();
      });

      // Trigger payment success handler
      const paymentHandler = mockRazorpay.open.mock.calls[0][0].handler;
      
      await act(async () => {
        paymentHandler({
          razorpay_order_id: 'order_123456789',
          razorpay_payment_id: 'pay_123456789',
          razorpay_signature: 'generated_signature',
        });
      });

      expect(mockPaymentService.verifyPayment).toHaveBeenCalledWith(
        mockUser.id,
        mockInvestment.id,
        'order_123456789',
        'pay_123456789',
        'generated_signature',
        2315.47
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('should handle payment failure', async () => {
      const user = userEvent.setup();
      mockPaymentService.verifyPayment.mockRejectedValue(new Error('Payment failed'));
      
      renderComponent();

      const payButton = screen.getByRole('button', { name: /pay now/i });
      
      await act(async () => {
        await user.click(payButton);
      });

      // Simulate successful payment but verification fails
      await waitFor(() => {
        expect(mockRazorpay.open).toHaveBeenCalled();
      });

      const paymentHandler = mockRazorpay.open.mock.calls[0][0].handler;
      
      await act(async () => {
        paymentHandler({
          razorpay_order_id: 'order_123456789',
          razorpay_payment_id: 'pay_123456789',
          razorpay_signature: 'generated_signature',
        });
      });

      expect(mockPaymentService.verifyPayment).toHaveBeenCalled();
      expect(screen.getByText(/payment failed/i)).toBeInTheDocument();
    });

    it('should handle Razorpay modal dismissal', async () => {
      const user = userEvent.setup();
      
      renderComponent();

      const payButton = screen.getByRole('button', { name: /pay now/i });
      
      await act(async () => {
        await user.click(payButton);
      });

      await waitFor(() => {
        expect(mockRazorpay.open).toHaveBeenCalled();
      });

      // Simulate modal dismissal
      const modalHandler = mockRazorpay.open.mock.calls[0][0].modal;
      
      await act(async () => {
        modalHandler.onclose();
      });

      expect(screen.getByText(/payment cancelled/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle order creation failure', async () => {
      const user = userEvent.setup();
      mockPaymentService.createPaymentOrder.mockRejectedValue(new Error('Order creation failed'));
      
      renderComponent();

      const payButton = screen.getByRole('button', { name: /pay now/i });
      
      await act(async () => {
        await user.click(payButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/failed to create payment order/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      const user = userEvent.setup();
      mockPaymentService.createPaymentOrder.mockRejectedValue(new Error('Network error'));
      
      renderComponent();

      const payButton = screen.getByRole('button', { name: /pay now/i });
      
      await act(async () => {
        await user.click(payButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should handle invalid amount', async () => {
      renderComponent({ amount: 0 });

      expect(screen.getByText(/invalid amount/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pay now/i })).toBeDisabled();
    });

    it('should handle negative amount', async () => {
      renderComponent({ amount: -100 });

      expect(screen.getByText(/invalid amount/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pay now/i })).toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('should validate investment data', () => {
      renderComponent({ investment: null });

      expect(screen.getByText(/invalid investment data/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pay now/i })).toBeDisabled();
    });

    it('should validate user authentication', () => {
      localStorage.removeItem('user');
      renderComponent();

      expect(screen.getByText(/please login to continue/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pay now/i })).toBeDisabled();
    });
  });

  describe('UI Interactions', () => {
    it('should cancel payment when Cancel button is clicked', async () => {
      const mockOnCancel = jest.fn();
      const user = userEvent.setup();
      
      renderComponent({ onCancel: mockOnCancel });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      
      await act(async () => {
        await user.click(cancelButton);
      });

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should show payment summary', () => {
      renderComponent();

      expect(screen.getByText('Payment Summary')).toBeInTheDocument();
      expect(screen.getByText('Principal Amount')).toBeInTheDocument();
      expect(screen.getByText('₹50,000.00')).toBeInTheDocument();
      expect(screen.getByText('Monthly Installment')).toBeInTheDocument();
      expect(screen.getByText('₹2,315.47')).toBeInTheDocument();
    });

    it('should display payment methods', () => {
      renderComponent();

      expect(screen.getByText('Payment Method')).toBeInTheDocument();
      expect(screen.getByText('Razorpay')).toBeInTheDocument();
      expect(screen.getByText('Credit Card')).toBeInTheDocument();
      expect(screen.getByText('Debit Card')).toBeInTheDocument();
      expect(screen.getByText('Net Banking')).toBeInTheDocument();
      expect(screen.getByText('UPI')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderComponent();

      expect(screen.getByRole('button', { name: /pay now/i })).toHaveAttribute('aria-label');
      expect(screen.getByRole('button', { name: /cancel/i })).toHaveAttribute('aria-label');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      renderComponent();

      const payButton = screen.getByRole('button', { name: /pay now/i });
      
      await user.tab();
      expect(payButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(mockPaymentService.createPaymentOrder).toHaveBeenCalled();
    });

    it('should announce payment status to screen readers', async () => {
      const user = userEvent.setup();
      renderComponent();

      const payButton = screen.getByRole('button', { name: /pay now/i });
      
      await act(async () => {
        await user.click(payButton);
      });

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should not make unnecessary API calls', () => {
      renderComponent();

      // Should not call API on initial render
      expect(mockPaymentService.createPaymentOrder).not.toHaveBeenCalled();
    });

    it('should prevent multiple payment submissions', async () => {
      const user = userEvent.setup();
      renderComponent();

      const payButton = screen.getByRole('button', { name: /pay now/i });
      
      await act(async () => {
        await user.click(payButton);
      });

      // Button should be disabled during processing
      expect(payButton).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large amounts', () => {
      renderComponent({ amount: 999999999 });

      expect(screen.getByDisplayValue('₹999,999,999.00')).toBeInTheDocument();
    });

    it('should handle decimal amounts', () => {
      renderComponent({ amount: 2315.47 });

      expect(screen.getByDisplayValue('₹2,315.47')).toBeInTheDocument();
    });

    it('should handle missing investment properties', () => {
      const incompleteInvestment = { id: 'test' };
      
      renderComponent({ investment: incompleteInvestment });

      expect(screen.getByText(/incomplete investment data/i)).toBeInTheDocument();
    });

    it('should handle slow network', async () => {
      const user = userEvent.setup();
      mockPaymentService.createPaymentOrder.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );
      
      renderComponent();

      const payButton = screen.getByRole('button', { name: /pay now/i });
      await act(async () => {
        await user.click(payButton);
      });

      expect(screen.getByText(/processing/i)).toBeInTheDocument();
      expect(payButton).toBeDisabled();
    });
  });

  describe('Integration', () => {
    it('should integrate with payment service correctly', async () => {
      const user = userEvent.setup();
      renderComponent();

      const payButton = screen.getByRole('button', { name: /pay now/i });
      
      await act(async () => {
        await user.click(payButton);
      });

      expect(mockPaymentService.createPaymentOrder).toHaveBeenCalledWith(
        mockUser.id,
        mockInvestment.id,
        2315.47
      );
    });

    it('should integrate with Razorpay correctly', async () => {
      const user = userEvent.setup();
      renderComponent();

      const payButton = screen.getByRole('button', { name: /pay now/i });
      
      await act(async () => {
        await user.click(payButton);
      });

      await waitFor(() => {
        expect(window.Razorpay).toHaveBeenCalled();
        expect(mockRazorpay.open).toHaveBeenCalled();
      });
    });
  });

  describe('Security', () => {
    it('should not expose sensitive data in DOM', () => {
      renderComponent();

      // Check that sensitive data is not exposed
      expect(screen.queryByText(/razorpay_secret/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/jwt_token/i)).not.toBeInTheDocument();
    });

    it('should validate payment amount on client side', () => {
      renderComponent({ amount: -100 });

      expect(screen.getByText(/invalid amount/i)).toBeInTheDocument();
      expect(mockPaymentService.createPaymentOrder).not.toHaveBeenCalled();
    });
  });

  describe('Localization', () => {
    it('should display localized currency', () => {
      renderComponent();

      expect(screen.getByText('₹2,315.47')).toBeInTheDocument();
    });

    it('should support different currencies', () => {
      // This would test currency localization
      renderComponent({ amount: 1000, currency: 'USD' });

      // Implementation would depend on localization setup
    });
  });
});
