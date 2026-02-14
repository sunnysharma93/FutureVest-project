import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Payment, PaymentStats, RazorpayOrder } from '../../types';

interface PaymentsState {
  payments: Payment[];
  userPayments: Payment[];
  investorPayments: Payment[];
  currentPayment: Payment | null;
  razorpayOrder: RazorpayOrder | null;
  stats: PaymentStats | null;
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
}

const initialState: PaymentsState = {
  payments: [],
  userPayments: [],
  investorPayments: [],
  currentPayment: null,
  razorpayOrder: null,
  stats: null,
  isLoading: false,
  isProcessing: false,
  error: null,
};

const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    fetchPaymentsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchPaymentsSuccess: (state, action: PayloadAction<Payment[]>) => {
      state.isLoading = false;
      state.payments = action.payload;
      state.error = null;
    },
    fetchPaymentsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    fetchUserPaymentsSuccess: (state, action: PayloadAction<Payment[]>) => {
      state.userPayments = action.payload;
    },
    fetchInvestorPaymentsSuccess: (state, action: PayloadAction<Payment[]>) => {
      state.investorPayments = action.payload;
    },
    fetchPaymentByIdSuccess: (state, action: PayloadAction<Payment>) => {
      state.currentPayment = action.payload;
    },
    createOrderStart: (state) => {
      state.isProcessing = true;
      state.error = null;
    },
    createOrderSuccess: (state, action: PayloadAction<RazorpayOrder>) => {
      state.isProcessing = false;
      state.razorpayOrder = action.payload;
      state.error = null;
    },
    createOrderFailure: (state, action: PayloadAction<string>) => {
      state.isProcessing = false;
      state.error = action.payload;
    },
    verifyPaymentStart: (state) => {
      state.isProcessing = true;
      state.error = null;
    },
    verifyPaymentSuccess: (state, action: PayloadAction<Payment>) => {
      state.isProcessing = false;
      const index = state.payments.findIndex(payment => payment.id === action.payload.id);
      if (index !== -1) {
        state.payments[index] = action.payload;
      } else {
        state.payments.unshift(action.payload);
      }
      
      const userIndex = state.userPayments.findIndex(payment => payment.id === action.payload.id);
      if (userIndex !== -1) {
        state.userPayments[userIndex] = action.payload;
      } else {
        state.userPayments.unshift(action.payload);
      }
      
      const investorIndex = state.investorPayments.findIndex(payment => payment.id === action.payload.id);
      if (investorIndex !== -1) {
        state.investorPayments[investorIndex] = action.payload;
      } else {
        state.investorPayments.unshift(action.payload);
      }
      
      state.currentPayment = action.payload;
      state.razorpayOrder = null;
      state.error = null;
    },
    verifyPaymentFailure: (state, action: PayloadAction<string>) => {
      state.isProcessing = false;
      state.error = action.payload;
    },
    refundPaymentSuccess: (state, action: PayloadAction<Payment>) => {
      const index = state.payments.findIndex(payment => payment.id === action.payload.id);
      if (index !== -1) {
        state.payments[index] = action.payload;
      }
    },
    fetchPaymentStatsSuccess: (state, action: PayloadAction<PaymentStats>) => {
      state.stats = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearRazorpayOrder: (state) => {
      state.razorpayOrder = null;
    },
  },
});

export const {
  fetchPaymentsStart,
  fetchPaymentsSuccess,
  fetchPaymentsFailure,
  fetchUserPaymentsSuccess,
  fetchInvestorPaymentsSuccess,
  fetchPaymentByIdSuccess,
  createOrderStart,
  createOrderSuccess,
  createOrderFailure,
  verifyPaymentStart,
  verifyPaymentSuccess,
  verifyPaymentFailure,
  refundPaymentSuccess,
  fetchPaymentStatsSuccess,
  clearError,
  clearRazorpayOrder,
} = paymentsSlice.actions;

export default paymentsSlice.reducer;
