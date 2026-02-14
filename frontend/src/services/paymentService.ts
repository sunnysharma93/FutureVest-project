import { store } from '../store';
import { addPayment, updatePaymentStatus, clearPaymentError } from '../store/slices/paymentsSlice';

export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
  status: 'created' | 'paid' | 'failed';
  createdAt: string;
}

export interface PaymentRequest {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
  courseId?: string;
  jobIdId?: string;
  type: 'COURSE_PAYMENT' | 'INVESTMENT' | 'REPAYMENT';
}

export interface PaymentVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RepaymentSchedule {
  id: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paymentId?: string;
  createdAt: string;
}

class PaymentService {
  private readonly API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
  private readonly RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

  // Load Razorpay script
  async loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (window.Razorpay) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      
      script.onload = () => {
        console.log('Razorpay script loaded successfully');
        resolve();
      };
      
      script.onerror = () => {
        console.error('Failed to load Razorpay script');
        reject(new Error('Failed to load Razorpay script'));
      };
      
      document.head.appendChild(script);
    });
  }

  // Create payment order
  async createPaymentOrder(paymentRequest: PaymentRequest): Promise<PaymentOrder> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(paymentRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment order');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating payment order:', error);
      throw error;
    }
  }

  // Verify payment
  async verifyPayment(paymentData: PaymentVerification): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payment verification failed');
      }

      const result = await response.json();
      return result.verified;
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  }

  // Get payment history
  async getPaymentHistory(page = 0, size = 20): Promise<{
    payments: any[];
    totalPages: number;
    totalElements: number;
    currentPage: number;
  }> {
    try {
      const response = await fetch(
        `${this.API_BASE_URL}/payments/history?page=${page}&size=${size}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch payment history');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }
  }

  // Get repayment schedule
  async getRepaymentSchedule(): Promise<RepaymentSchedule[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/payments/repayment-schedule`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch repayment schedule');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching repayment schedule:', error);
      throw error;
    }
  }

  // Process repayment
  async processRepayment(scheduleId: string): Promise<PaymentOrder> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/payments/process-repayment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ scheduleId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process repayment');
      }

      return await response.json();
    } catch (error) {
      console.error('Error processing repayment:', error);
      throw error;
    }
  }

  // Initiate Razorpay payment
  async initiatePayment(order: PaymentOrder, options: {
    name: string;
    description: string;
    email: string;
    contact?: string;
    theme?: {
      color: string;
    };
  }): Promise<{
    success: boolean;
    paymentId?: string;
    orderId?: string;
    signature?: string;
    error?: string;
  }> {
    try {
      // Ensure Razorpay script is loaded
      await this.loadRazorpayScript();

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not loaded');
      }

      return new Promise((resolve) => {
        const razorpayOptions = {
          key: this.RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: order.currency,
          name: options.name,
          description: options.description,
          order_id: order.id,
          prefill: {
            name: options.name,
            email: options.email,
            contact: options.contact,
          },
          theme: {
            color: options.theme?.color || '#3399cc',
          },
          modal: {
            ondismiss: () => {
              resolve({ success: false, error: 'Payment cancelled by user' });
            },
          },
          handler: async (response: any) => {
            try {
              // Verify payment with backend
              const verificationData = {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              };

              const isVerified = await this.verifyPayment(verificationData);

              if (isVerified) {
                // Update Redux store with successful payment
                store.dispatch(updatePaymentStatus({
                  orderId: response.razorpay_order_id,
                  status: 'paid',
                  paymentId: response.razorpay_payment_id,
                }));

                resolve({
                  success: true,
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                  signature: response.razorpay_signature,
                });
              } else {
                resolve({ success: false, error: 'Payment verification failed' });
              }
            } catch (error) {
              console.error('Error in payment handler:', error);
              resolve({ success: false, error: 'Payment processing failed' });
            }
          },
        };

        const razorpay = new window.Razorpay(razorpayOptions);
        razorpay.open();
      });
    } catch (error) {
      console.error('Error initiating payment:', error);
      return { success: false, error: error.message };
    }
  }

  // Get payment details
  async getPaymentDetails(paymentId: string): Promise<any> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment details');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching payment details:', error);
      throw error;
    }
  }

  // Cancel payment
  async cancelPayment(orderId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/payments/cancel/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel payment');
      }

      return await response.json();
    } catch (error) {
      console.error('Error cancelling payment:', error);
      throw error;
    }
  }

  // Refund payment
  async refundPayment(paymentId: string, amount?: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/payments/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ paymentId, amount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process refund');
      }

      return await response.json();
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  // Format currency
  formatCurrency(amount: number, currency = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100); // Razorpay uses paise (amount in paise)
  }

  // Validate payment amount
  validatePaymentAmount(amount: number): { isValid: boolean; error?: string } {
    if (amount <= 0) {
      return { isValid: false, error: 'Amount must be greater than 0' };
    }
    if (amount > 10000000) { // 1 lakh rupees
      return { isValid: false, error: 'Amount exceeds maximum limit' };
    }
    return { isValid: true };
  }

  // Generate receipt number
  generateReceiptNumber(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `RCPT_${timestamp}_${random}`;
  }
}

// Create singleton instance
export const paymentService = new PaymentService();

// Hook for using payment service
export const usePaymentService = () => {
  return paymentService;
};

export default paymentService;
