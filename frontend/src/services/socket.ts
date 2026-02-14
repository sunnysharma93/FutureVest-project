import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import { addMessage, setTypingUsers, clearTypingUser, setOnlineStatus } from '../store/slices/chatsSlice';

const WS_URL = import.meta.env.VITE_WS_BASE ?? 'ws://localhost:8080/ws';

export interface SocketMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  messageType: 'TEXT' | 'FILE' | 'IMAGE';
  fileUrl?: string;
  createdAt: string;
  senderName?: string;
  senderRole?: string;
  status?: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  chatId: string;
  isTyping: boolean;
}

export interface OnlineStatus {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private messageQueue: SocketMessage[] = [];
  private isConnected = false;

  connect(chatId: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(WS_URL, {
          transports: ['websocket', 'polling'],
          autoConnect: false,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
          timeout: 10000,
        });

        this.setupEventListeners(chatId, userId);

        this.socket.connect();

        this.socket.on('connect', () => {
          console.log('Socket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Join the chat room
          this.joinRoom(chatId, userId);
          
          // Send queued messages
          this.flushMessageQueue();
          
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          this.isConnected = false;
          reject(error);
        });

      } catch (error) {
        console.error('Failed to create socket connection:', error);
        reject(error);
      }
    });
  }

  private setupEventListeners(chatId: string, userId: string): void {
    if (!this.socket) return;

    // Message events
    this.socket.on('receiveMessage', (message: SocketMessage) => {
      console.log('Received message:', message);
      store.dispatch(addMessage(message));
    });

    // Typing events
    this.socket.on('userTyping', (typing: TypingIndicator) => {
      if (typing.chatId === chatId && typing.userId !== userId) {
        store.dispatch(setTypingUsers({
          userId: typing.userId,
          userName: typing.userName,
          isTyping: true,
        }));

        // Clear typing indicator after timeout
        const timeout = setTimeout(() => {
          store.dispatch(clearTypingUser(typing.userId));
        }, 3000);

        this.typingTimeouts.set(typing.userId, timeout);
      }
    });

    this.socket.on('userStopTyping', (typing: TypingIndicator) => {
      if (typing.chatId === chatId) {
        store.dispatch(clearTypingUser(typing.userId));
        
        // Clear timeout if exists
        const timeout = this.typingTimeouts.get(typing.userId);
        if (timeout) {
          clearTimeout(timeout);
          this.typingTimeouts.delete(typing.userId);
        }
      }
    });

    // Online status events
    this.socket.on('userOnline', (status: OnlineStatus) => {
      store.dispatch(setOnlineStatus({
        userId: status.userId,
        isOnline: true,
        lastSeen: status.lastSeen,
      }));
    });

    this.socket.on('userOffline', (status: OnlineStatus) => {
      store.dispatch(setOnlineStatus({
        userId: status.userId,
        isOnline: false,
        lastSeen: status.lastSeen,
      }));
    });

    // Connection events
    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      
      // Clear all typing timeouts
      this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
      this.typingTimeouts.clear();
    });

    this.socket.on('reconnect', () => {
      console.log('Socket reconnected');
      this.isConnected = true;
      
      // Re-join room
      this.joinRoom(chatId, userId);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  joinRoom(chatId: string, userId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('joinRoom', { chatId, userId });
    }
  }

  leaveRoom(chatId: string, userId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('leaveRoom', { chatId, userId });
    }
  }

  sendMessage(message: Omit<SocketMessage, 'id' | 'createdAt'>): void {
    const fullMessage: SocketMessage = {
      ...message,
      id: this.generateMessageId(),
      createdAt: new Date().toISOString(),
      status: 'SENT',
    };

    if (this.socket && this.isConnected) {
      this.socket.emit('sendMessage', fullMessage);
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(fullMessage);
      console.warn('Socket not connected, message queued');
    }
  }

  sendTypingIndicator(chatId: string, userId: string, userName: string, isTyping: boolean): void {
    if (this.socket && this.isConnected) {
      const event = isTyping ? 'userTyping' : 'userStopTyping';
      this.socket.emit(event, {
        userId,
        userName,
        chatId,
        isTyping,
      });
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message && this.socket) {
        this.socket.emit('sendMessage', message);
      }
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    
    // Clear timeouts
    this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.typingTimeouts.clear();
    
    // Clear message queue
    this.messageQueue = [];
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Rate limiting for messages
  private lastMessageTime = 0;
  private readonly MESSAGE_RATE_LIMIT = 1000; // 1 second between messages

  canSendMessage(): boolean {
    const now = Date.now();
    return now - this.lastMessageTime >= this.MESSAGE_RATE_LIMIT;
  }

  updateLastMessageTime(): void {
    this.lastMessageTime = Date.now();
  }

  // File upload via socket
  uploadFile(file: File, chatId: string, userId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const fileData = event.target?.result as string;
        
        this.socket.emit('uploadFile', {
          chatId,
          userId,
          fileName: file.name,
          fileType: file.type,
          fileData,
        });

        // Listen for file upload confirmation
        const handleFileUploaded = (response: { fileUrl: string; fileId: string }) => {
          this.socket?.off('fileUploaded', handleFileUploaded);
          resolve(response.fileUrl);
        };

        const handleFileUploadError = (error: { message: string }) => {
          this.socket?.off('fileUploadError', handleFileUploadError);
          reject(new Error(error.message));
        };

        this.socket.once('fileUploaded', handleFileUploaded);
        this.socket.once('fileUploadError', handleFileUploadError);

        // Timeout after 30 seconds
        setTimeout(() => {
          this.socket?.off('fileUploaded', handleFileUploaded);
          this.socket?.off('fileUploadError', handleFileUploadError);
          reject(new Error('File upload timeout'));
        }, 30000);
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }
}

// Singleton instance
export const socketService = new SocketService();

// Hook for using socket service
export const useSocket = () => {
  return socketService;
};

export default socketService;
