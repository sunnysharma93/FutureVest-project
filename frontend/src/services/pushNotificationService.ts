import { toast } from 'react-toastify';

// Firebase Cloud Messaging (FCM) Configuration
declare global {
  interface Window {
    firebase: {
      messaging: {
        getToken: (options?: { vapidKey?: string }) => Promise<string>;
        onMessage: (callback: (payload: any) => void) => () => void;
        requestPermission: () => Promise<string>;
      };
    };
  }
}

interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  vibrate?: number[];
  sound?: string;
}

interface NotificationSubscription {
  endpoint: string;
  keys?: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

class PushNotificationService {
  private static instance: PushNotificationService;
  private isInitialized = false;
  private vapidKey: string;
  private subscription: NotificationSubscription | null = null;
  private messaging: any = null;
  private registration: ServiceWorkerRegistration | null = null;

  private constructor() {
    this.vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
  }

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  // Initialize Firebase Cloud Messaging
  public async initialize(): Promise<boolean> {
    try {
      // Check if Firebase is available
      if (!window.firebase) {
        console.warn('Firebase not available');
        return false;
      }

      // Initialize Firebase messaging
      this.messaging = window.firebase.messaging();
      this.isInitialized = true;

      // Request permission and get token
      await this.requestPermission();

      // Get current subscription
      await this.getSubscription();

      // Set up message handler
      this.setupMessageHandler();

      console.log('Push notifications initialized');
      return true;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return false;
    }
  }

  // Request notification permission
  public async requestPermission(): Promise<NotificationPermission> {
    try {
      if (!('Notification' in window)) {
        throw new Error('This browser does not support notifications');
      }

      const permission = await Notification.requestPermission();
      
      const permissionStatus: NotificationPermission = {
        granted: permission === 'granted',
        denied: permission === 'denied',
        default: permission === 'default',
      };

      if (permissionStatus.granted) {
        // Get FCM token
        const token = await this.messaging.getToken({
          vapidKey: this.vapidKey,
        });

        // Save token to backend
        await this.saveTokenToBackend(token);

        console.log('Notification permission granted, token:', token);
        toast.success('Notifications enabled successfully');
      } else {
        console.warn('Notification permission denied');
        toast.warning('Notifications are disabled');
      }

      return permissionStatus;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to enable notifications');
      throw error;
    }
  }

  // Get current permission status
  public getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return { granted: false, denied: false, default: false };
    }

    const permission = Notification.permission;
    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default',
    };
  }

  // Get FCM token
  public async getToken(): Promise<string | null> {
    try {
      if (!this.messaging || !this.isInitialized) {
        throw new Error('Push notifications not initialized');
      }

      const token = await this.messaging.getToken({
        vapidKey: this.vapidKey,
      });

      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  // Save token to backend
  private async saveTokenToBackend(token: string): Promise<void> {
    try {
      await fetch('/api/v1/notifications/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          token,
          platform: 'web',
          userAgent: navigator.userAgent,
        }),
      });
    } catch (error) {
      console.error('Error saving token to backend:', error);
      // Don't throw error to avoid breaking user experience
    }
  }

  // Delete token from backend
  private async deleteTokenFromBackend(token: string): Promise<void> {
    try {
      await fetch('/api/v1/notifications/token', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ token }),
      });
    } catch (error) {
      console.error('Error deleting token from backend:', error);
      // Don't throw error to avoid breaking user experience
    }
  }

  // Set up message handler
  private setupMessageHandler(): void {
    if (!this.messaging) return;

    this.messaging.onMessage((payload: any) => {
      this.handleIncomingMessage(payload);
    });
  }

  // Handle incoming message
  private handleIncomingMessage(payload: any): void {
    try {
      const notification = payload.notification;
      const data = payload.data || {};

      // Show browser notification
      this.showNotification({
        title: notification.title || 'New Notification',
        body: notification.body || '',
        icon: notification.icon || '/favicon.ico',
        image: notification.image,
        badge: notification.badge,
        tag: notification.tag,
        data,
        requireInteraction: notification.requireInteraction,
        silent: notification.silent,
        timestamp: notification.timestamp,
        vibrate: notification.vibrate,
        sound: notification.sound,
      });

      // Track notification received
      this.trackNotification('received', data.type || 'general');

      // Show toast notification
      toast.info(notification.title || 'New notification', {
        toastId: notification.tag,
        onClick: () => this.handleNotificationClick(data),
      });
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  }

  // Show browser notification
  private showNotification(notification: PushNotification): void {
    try {
      const notificationOptions: NotificationOptions = {
        body: notification.body,
        icon: notification.icon,
        image: notification.image,
        badge: notification.badge,
        tag: notification.tag,
        data: notification.data,
        requireInteraction: notification.requireInteraction,
        silent: notification.silent,
        timestamp: notification.timestamp,
        vibrate: notification.vibrate,
        sound: notification.sound,
      };

      const browserNotification = new Notification(notification.title, notificationOptions);

      // Handle click events
      browserNotification.onclick = () => {
        this.handleNotificationClick(notification.data || {});
        browserNotification.close();
      };

      // Auto-close after 5 seconds if not required interaction
      if (!notification.requireInteraction) {
        setTimeout(() => {
          browserNotification.close();
        }, 5000);
      }
    } catch (error) {
      console.error('Error showing browser notification:', error);
    }
  }

  // Handle notification click
  private handleNotificationClick(data: Record<string, any>): void {
    try {
      // Track notification clicked
      this.trackNotification('clicked', data.type || 'general');

      // Handle different notification types
      switch (data.type) {
        case 'chat_message':
          // Navigate to chat
          window.location.href = '/chat';
          break;
        case 'payment':
          // Navigate to payment page
          window.location.href = '/payments';
          break;
        case 'job_match':
          // Navigate to job matches
          window.location.href = '/jobs/matches';
          break;
        case 'repayment_due':
          // Navigate to repayment dashboard
          window.location.href = '/repayments';
          break;
        case 'investment':
          // Navigate to investment page
          window.location.href = '/investments';
          break;
        default:
          // Navigate to dashboard
          window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  }

  // Subscribe to push notifications
  public async subscribe(): Promise<NotificationSubscription | null> {
    try {
      if (!this.isInitialized) {
        throw new Error('Push notifications not initialized');
      }

      // Register service worker
      this.registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

      // Subscribe to push notifications
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidKey),
      });

      this.subscription = subscription;

      // Save subscription to backend
      await this.saveSubscriptionToBackend(subscription);

      console.log('Subscribed to push notifications');
      toast.success('Successfully subscribed to notifications');

      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast.error('Failed to subscribe to notifications');
      return null;
    }
  }

  // Unsubscribe from push notifications
  public async unsubscribe(): Promise<boolean> {
    try {
      if (this.subscription) {
        await this.subscription.unsubscribe();
        await this.deleteSubscriptionFromBackend(this.subscription);
        this.subscription = null;
      }

      // Delete FCM token
      const token = await this.getToken();
      if (token) {
        await this.deleteTokenFromBackend(token);
      }

      console.log('Unsubscribed from push notifications');
      toast.info('Unsubscribed from notifications');

      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast.error('Failed to unsubscribe from notifications');
      return false;
    }
  }

  // Save subscription to backend
  private async saveSubscriptionToBackend(subscription: NotificationSubscription): Promise<void> {
    try {
      await fetch('/api/v1/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          subscription,
          platform: 'web',
          userAgent: navigator.userAgent,
        }),
      });
    } catch (error) {
      console.error('Error saving subscription to backend:', error);
      // Don't throw error to avoid breaking user experience
    }
  }

  // Delete subscription from backend
  private async deleteSubscriptionFromBackend(subscription: NotificationSubscription): Promise<void> {
    try {
      await fetch('/api/v1/notifications/unsubscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          subscription,
        }),
      });
    } catch (error) {
      console.error('Error deleting subscription from backend:', error);
      // Don't throw error to avoid breaking user experience
    }
  }

  // Get subscription status
  public getSubscriptionStatus(): boolean {
    return this.subscription !== null;
  }

  // Send notification to specific user (admin function)
  public async sendNotificationToUser(
    userId: string,
    notification: Omit<PushNotification, 'timestamp' | 'vibrate' | 'sound'>
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/v1/admin/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          userId,
          notification: {
            ...notification,
            timestamp: Date.now(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      toast.success('Notification sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending notification to user:', error);
      toast.error('Failed to send notification');
      return false;
    }
  }

  // Send broadcast notification (admin function)
  public async sendBroadcastNotification(
    notification: Omit<PushNotification, 'timestamp' | 'vibrate' | 'sound'>
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/v1/admin/notifications/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          notification: {
            ...notification,
            timestamp: Date.now(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send broadcast notification');
      }

      toast.success('Broadcast notification sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending broadcast notification:', error);
      toast.error('Failed to send broadcast notification');
      return false;
    }
  }

  // Track notification events
  private trackNotification(action: string, type: string): void {
    try {
      // Send to analytics
      if (window.gtag) {
        window.gtag('event', 'notification_' + action, {
          event_category: 'notifications',
          event_label: type,
        });
      }

      // Send to backend analytics
      fetch('/api/v1/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          type: 'notification',
          data: {
            action,
            type,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
          },
        }),
      }).catch((error) => {
        console.error('Error tracking notification:', error);
      });
    } catch (error) {
      console.error('Error tracking notification:', error);
    }
  }

  // Utility function to convert VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  // Check if push notifications are supported
  public static isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  }

  // Get current subscription
  public async getSubscription(): Promise<NotificationSubscription | null> {
    try {
      if (!this.registration) {
        this.registration = await navigator.serviceWorker.ready;
      }

      const subscription = await this.registration.pushManager.getSubscription();
      this.subscription = subscription;
      return subscription;
    } catch (error) {
      console.error('Error getting subscription:', error);
      return null;
    }
  }

  // Enable/disable notifications
  public async setEnabled(enabled: boolean): Promise<boolean> {
    if (enabled) {
      const permission = await this.requestPermission();
      if (permission.granted) {
        return await this.subscribe();
      }
      return false;
    } else {
      return await this.unsubscribe();
    }
  }

  // Get notification settings
  public getSettings(): {
    enabled: boolean;
    permission: NotificationPermission;
    subscribed: boolean;
  } {
    return {
      enabled: this.isInitialized,
      permission: this.getPermissionStatus(),
      subscribed: this.getSubscriptionStatus(),
    };
  }
}

// Create singleton instance
export const pushNotificationService = PushNotificationService.getInstance();

// Hook for using push notification service
export const usePushNotifications = () => {
  return pushNotificationService;
};

// Custom hooks for common notification operations
export const useNotificationPermission = () => {
  return pushNotificationService.getPermissionStatus();
};

export const useNotificationSubscription = () => {
  return pushNotificationService.getSubscriptionStatus();
};

export default pushNotificationService;
