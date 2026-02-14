// Base API Response
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'INVESTOR' | 'ADMIN';
  resumeUrl?: string;
  aadhaarUrl?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserRegistration {
  name: string;
  email: string;
  password: string;
  role: 'USER' | 'INVESTOR';
  resume?: File;
  aadhaar?: File;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  type: string;
  userId: string;
  email: string;
  role: string;
  name: string;
}

// Investor Types
export interface Investor {
  id: string;
  name: string;
  email: string;
  totalInvestment: number;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  panCardUrl?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvestorRegistration {
  name: string;
  email: string;
  password: string;
  totalInvestment?: number;
  panCard?: File;
}

// Course Types
export interface Course {
  id: string;
  title: string;
  description: string;
  provider: 'UDEMY' | 'COURSERA' | 'LINKEDIN' | 'OTHER';
  externalCourseId?: string;
  cost: number;
  status: 'REQUESTED' | 'AVAILABLE' | 'COMPLETED';
  category: string;
  durationInHours: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseRequest {
  title: string;
  description: string;
  provider: 'UDEMY' | 'COURSERA' | 'LINKEDIN' | 'OTHER';
  externalCourseId?: string;
  category: string;
  durationInHours?: number;
  justification?: string;
}

// Payment Types
export interface Payment {
  id: string;
  userId: string;
  investorId: string;
  courseId: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentOrder {
  userId: string;
  investorId: string;
  courseId: string;
  amount: number;
  currency: string;
}

export interface PaymentVerification {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  offer_id?: string;
  status: string;
  attempts: number;
  notes?: Record<string, string>;
  created_at: number;
}

// Job Types
export interface Job {
  id: string;
  title: string;
  description: string;
  companyName: string;
  location: string;
  jobType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
  workMode: 'REMOTE' | 'HYBRID' | 'ONSITE';
  salaryMin: number;
  salaryMax?: number;
  requiredSkills: string;
  experienceLevel?: string;
  postedBy: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Chat Types
export interface Chat {
  id: string;
  userId: string;
  investorId: string;
  status: 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  userName?: string;
  investorName?: string;
  lastMessage?: ChatMessage;
  unreadMessageCount?: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  messageType: 'TEXT' | 'FILE' | 'IMAGE';
  fileUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface TypingIndicator {
  userId: string;
  isTyping: boolean;
}

// Repayment Types
export interface Repayment {
  id: string;
  userId: string;
  investorId: string;
  paymentId: string;
  amount: number;
  salaryPercentage: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  dueDate: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// UI State Types
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface ApiState<T> extends LoadingState {
  data: T | null;
}

// Theme Types
export type ThemeMode = 'light' | 'dark';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  secondaryColor: string;
}

// Navigation Types
export interface NavItem {
  label: string;
  path: string;
  icon?: string;
  roles?: string[];
}

// Filter Types
export interface CourseFilters {
  category?: string;
  provider?: string;
  status?: string;
  search?: string;
}

export interface JobFilters {
  jobType?: string;
  workMode?: string;
  location?: string;
  skills?: string;
  company?: string;
  minSalary?: number;
  maxSalary?: number;
  search?: string;
}

// Statistics Types
export interface PaymentStats {
  totalPayments: number;
  totalAmount: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  refundedPayments: number;
}

export interface JobStats {
  totalJobs: number;
  activeJobs: number;
  closedJobs: number;
  jobsByType: Record<string, number>;
  jobsByLocation: Record<string, number>;
}
