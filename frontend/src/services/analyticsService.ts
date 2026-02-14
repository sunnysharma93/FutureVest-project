import { toast } from 'react-toastify';

// Google Analytics 4 Configuration
declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: any) => void;
    dataLayer: any[];
  }
}

interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  userId?: string;
  sessionId?: string;
}

interface InvestmentAnalytics {
  amount: number;
  type: string;
  userId: string;
  timestamp: number;
  source: string;
  campaign?: string;
}

interface RepaymentAnalytics {
  amount: number;
  investmentId: string;
  userId: string;
  timestamp: number;
  method: string;
  status: 'completed' | 'failed' | 'pending';
}

interface JobApplicationAnalytics {
  jobId: string;
  userId: string;
  timestamp: number;
  source: string;
  status: 'applied' | 'viewed' | 'saved';
}

interface UserEngagementAnalytics {
  userId: string;
  action: string;
  page: string;
  duration?: number;
  timestamp: number;
  device: string;
  browser: string;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private isInitialized = false;
  private trackingId: string;
  private userId: string | null = null;
  private sessionId: string;

  private constructor() {
    this.trackingId = import.meta.env.VITE_GA_TRACKING_ID || '';
    this.sessionId = this.generateSessionId();
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  // Initialize Google Analytics
  public initialize(): void {
    if (this.isInitialized || !this.trackingId) {
      return;
    }

    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.trackingId}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    // Configure GA4
    window.gtag('js', new Date());
    window.gtag('config', this.trackingId, {
      send_page_view: false,
      debug_mode: import.meta.env.DEV,
    });

    this.isInitialized = true;
    console.log('Analytics initialized with tracking ID:', this.trackingId);
  }

  // Set user ID for cross-device tracking
  public setUserId(userId: string): void {
    this.userId = userId;
    if (this.isInitialized) {
      window.gtag('config', this.trackingId, {
        user_id: userId,
      });
    }
  }

  // Track page view
  public trackPageView(page: string, title?: string): void {
    if (!this.isInitialized) return;

    const pageData: any = {
      page_title: title || page,
      page_location: window.location.href,
    };

    if (this.userId) {
      pageData.user_id = this.userId;
    }

    window.gtag('event', 'page_view', pageData);
  }

  // Track custom event
  public trackEvent(event: AnalyticsEvent): void {
    if (!this.isInitialized) return;

    const eventData: any = {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
    };

    if (this.userId) {
      eventData.user_id = this.userId;
    }

    if (this.sessionId) {
      eventData.session_id = this.sessionId;
    }

    window.gtag('event', event.action, eventData);

    // Also send to our backend for custom analytics
    this.sendToBackend('event', event);
  }

  // Track investment
  public trackInvestment(investment: InvestmentAnalytics): void {
    this.trackEvent({
      action: 'investment_completed',
      category: 'investment',
      label: investment.type,
      value: Math.round(investment.amount),
      userId: investment.userId,
    });

    // Send detailed investment data to backend
    this.sendToBackend('investment', investment);
  }

  // Track repayment
  public trackRepayment(repayment: RepaymentAnalytics): void {
    this.trackEvent({
      action: 'repayment_' + repayment.status,
      category: 'repayment',
      label: repayment.method,
      value: Math.round(repayment.amount),
      userId: repayment.userId,
    });

    // Send detailed repayment data to backend
    this.sendToBackend('repayment', repayment);
  }

  // Track job application
  public trackJobApplication(application: JobApplicationAnalytics): void {
    this.trackEvent({
      action: 'job_' + application.status,
      category: 'job_application',
      label: application.jobId,
      userId: application.userId,
    });

    // Send detailed application data to backend
    this.sendToBackend('job_application', application);
  }

  // Track user engagement
  public trackUserEngagement(engagement: UserEngagementAnalytics): void {
    this.trackEvent({
      action: engagement.action,
      category: 'engagement',
      label: engagement.page,
      userId: engagement.userId,
    });

    // Send detailed engagement data to backend
    this.sendToBackend('engagement', engagement);
  }

  // Track file upload
  public trackFileUpload(fileType: string, fileSize: number, success: boolean): void {
    this.trackEvent({
      action: success ? 'file_upload_success' : 'file_upload_failed',
      category: 'file_upload',
      label: fileType,
      value: Math.round(fileSize / 1024), // Size in KB
    });
  }

  // Track chat activity
  public trackChatActivity(action: 'message_sent' | 'message_received' | 'typing', roomId: string): void {
    this.trackEvent({
      action: 'chat_' + action,
      category: 'chat',
      label: roomId,
    });
  }

  // Track payment flow
  public trackPaymentFlow(step: string, amount?: number, success?: boolean): void {
    this.trackEvent({
      action: 'payment_' + step,
      category: 'payment',
      label: success ? 'success' : 'failed',
      value: amount ? Math.round(amount) : undefined,
    });
  }

  // Track search activity
  public trackSearch(query: string, results: number, category: string): void {
    this.trackEvent({
      action: 'search_performed',
      category: 'search',
      label: category,
      value: results,
    });
  }

  // Track form interactions
  public trackFormInteraction(formName: string, action: 'start' | 'complete' | 'abandon'): void {
    this.trackEvent({
      action: 'form_' + action,
      category: 'form_interaction',
      label: formName,
    });
  }

  // Track performance metrics
  public trackPerformance(metricName: string, value: number): void {
    this.trackEvent({
      action: 'performance_metric',
      category: 'performance',
      label: metricName,
      value: Math.round(value),
    });
  }

  // Track errors
  public trackError(error: Error, context?: string): void {
    this.trackEvent({
      action: 'error_occurred',
      category: 'error',
      label: context || error.name,
    });

    // Send error details to backend
    this.sendToBackend('error', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      userId: this.userId,
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  }

  // Track feature usage
  public trackFeatureUsage(featureName: string, action: string): void {
    this.trackEvent({
      action: 'feature_' + action,
      category: 'feature_usage',
      label: featureName,
    });
  }

  // Track A/B tests
  public trackABTest(testName: string, variant: string): void {
    this.trackEvent({
      action: 'ab_test_participated',
      category: 'ab_testing',
      label: testName,
    });

    // Send A/B test data to backend
    this.sendToBackend('ab_test', {
      testName,
      variant,
      userId: this.userId,
      timestamp: Date.now(),
    });
  }

  // Track conversion funnels
  public trackFunnelStep(funnelName: string, step: number, stepName: string): void {
    this.trackEvent({
      action: 'funnel_step',
      category: 'conversion_funnel',
      label: funnelName,
      value: step,
    });

    // Send funnel data to backend
    this.sendToBackend('funnel', {
      funnelName,
      step,
      stepName,
      userId: this.userId,
      timestamp: Date.now(),
    });
  }

  // Get analytics data from backend
  public async getAnalyticsData(startDate: string, endDate: string): Promise<any> {
    try {
      const response = await fetch(`/api/v1/analytics/data?startDate=${startDate}&endDate=${endDate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      throw error;
    }
  }

  // Get investment analytics
  public async getInvestmentAnalytics(): Promise<any> {
    try {
      const response = await fetch('/api/v1/analytics/investments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch investment analytics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching investment analytics:', error);
      throw error;
    }
  }

  // Get user engagement analytics
  public async getUserEngagementAnalytics(): Promise<any> {
    try {
      const response = await fetch('/api/v1/analytics/engagement', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch engagement analytics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching engagement analytics:', error);
      throw error;
    }
  }

  // Send data to backend for custom analytics
  private async sendToBackend(type: string, data: any): Promise<void> {
    try {
      await fetch('/api/v1/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          type,
          data,
          timestamp: Date.now(),
          userId: this.userId,
          sessionId: this.sessionId,
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });
    } catch (error) {
      console.error('Error sending analytics to backend:', error);
      // Don't throw error to avoid breaking user experience
    }
  }

  // Generate session ID
  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Reset session (call when user logs out)
  public resetSession(): void {
    this.userId = null;
    this.sessionId = this.generateSessionId();
  }

  // Get current session ID
  public getSessionId(): string {
    return this.sessionId;
  }

  // Check if analytics is initialized
  public isReady(): boolean {
    return this.isInitialized;
  }

  // Enable/disable analytics (for privacy compliance)
  public setEnabled(enabled: boolean): void {
    if (!enabled && this.isInitialized) {
      // Clear existing data
      window.dataLayer = [];
      this.isInitialized = false;
    } else if (enabled && !this.isInitialized) {
      this.initialize();
    }
  }

  // Get consent status
  public getConsentStatus(): boolean {
    return localStorage.getItem('analytics_consent') === 'true';
  }

  // Set consent status
  public setConsentStatus(consented: boolean): void {
    localStorage.setItem('analytics_consent', consented.toString());
    this.setEnabled(consented);
    
    if (consented) {
      toast.info('Analytics consent granted');
    } else {
      toast.info('Analytics consent withdrawn');
    }
  }

  // Track consent changes
  public trackConsentChange(action: 'granted' | 'withdrawn'): void {
    this.trackEvent({
      action: 'analytics_consent_' + action,
      category: 'privacy',
    });
  }
}

// Create singleton instance
export const analyticsService = AnalyticsService.getInstance();

// Hook for using analytics service
export const useAnalytics = () => {
  return analyticsService;
};

// Custom hooks for common analytics events
export const usePageViewTracking = (page: string, title?: string) => {
  useEffect(() => {
    analyticsService.trackPageView(page, title);
  }, [page, title]);
};

export const useErrorTracking = () => {
  return useCallback((error: Error, context?: string) => {
    analyticsService.trackError(error, context);
  }, []);
};

export const usePerformanceTracking = () => {
  return useCallback((metricName: string, value: number) => {
    analyticsService.trackPerformance(metricName, value);
  }, []);
};

export default analyticsService;
