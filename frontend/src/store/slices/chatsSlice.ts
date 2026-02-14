import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Chat, ChatMessage, PaginatedResponse } from '../../types';

interface ChatsState {
  chats: Chat[];
  currentChat: Chat | null;
  messages: ChatMessage[];
  typingUsers: Record<string, { userId: string; userName: string; isTyping: boolean }>;
  onlineUsers: Record<string, { userId: string; isOnline: boolean; lastSeen?: string }>;
  unreadCounts: Record<string, number>;
  pagination: {
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
  };
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  socketConnected: boolean;
}

const initialState: ChatsState = {
  chats: [],
  currentChat: null,
  messages: [],
  typingUsers: {},
  onlineUsers: {},
  unreadCounts: {},
  pagination: {
    totalElements: 0,
    totalPages: 0,
    size: 20,
    number: 0,
    first: true,
    last: true,
  },
  isLoading: false,
  isSending: false,
  error: null,
  socketConnected: false,
};

const chatsSlice = createSlice({
  name: 'chats',
  initialState,
  reducers: {
    fetchChatsStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchChatsSuccess: (state, action: PayloadAction<PaginatedResponse<Chat>>) => {
      state.isLoading = false;
      state.chats = action.payload.data;
      state.pagination = {
        totalElements: action.payload.totalElements,
        totalPages: action.payload.totalPages,
        size: action.payload.size,
        number: action.payload.number,
        first: action.payload.first,
        last: action.payload.last,
      };
      state.error = null;
    },
    fetchChatsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    fetchChatByIdStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchChatByIdSuccess: (state, action: PayloadAction<Chat>) => {
      state.isLoading = false;
      state.currentChat = action.payload;
      state.error = null;
    },
    fetchChatByIdFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    fetchMessagesStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchMessagesSuccess: (state, action: PayloadAction<ChatMessage[]>) => {
      state.isLoading = false;
      state.messages = action.payload;
      state.error = null;
    },
    fetchMessagesFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
      
      // Update unread count if message is not from current user
      if (action.payload.senderId !== state.currentChat?.userId) {
        const chatId = action.payload.chatId;
        state.unreadCounts[chatId] = (state.unreadCounts[chatId] || 0) + 1;
      }
    },
    sendMessageStart: (state) => {
      state.isSending = true;
      state.error = null;
    },
    sendMessageSuccess: (state) => {
      state.isSending = false;
      state.error = null;
    },
    sendMessageFailure: (state, action: PayloadAction<string>) => {
      state.isSending = false;
      state.error = action.payload;
    },
    updateMessage: (state, action: PayloadAction<ChatMessage>) => {
      const index = state.messages.findIndex(msg => msg.id === action.payload.id);
      if (index !== -1) {
        state.messages[index] = action.payload;
      }
    },
    deleteMessage: (state, action: PayloadAction<string>) => {
      state.messages = state.messages.filter(msg => msg.id !== action.payload);
    },
    setTypingUsers: (state, action: PayloadAction<{ userId: string; userName: string; isTyping: boolean }>) => {
      const { userId, userName, isTyping } = action.payload;
      state.typingUsers[userId] = { userId, userName, isTyping };
    },
    clearTypingUser: (state, action: PayloadAction<string>) => {
      const userId = action.payload;
      delete state.typingUsers[userId];
    },
    setOnlineStatus: (state, action: PayloadAction<{ userId: string; isOnline: boolean; lastSeen?: string }>) => {
      const { userId, isOnline, lastSeen } = action.payload;
      state.onlineUsers[userId] = { userId, isOnline, lastSeen };
    },
    markMessagesAsRead: (state, action: PayloadAction<string>) => {
      const chatId = action.payload;
      state.messages.forEach(message => {
        if (message.chatId === chatId && message.status !== 'READ') {
          message.status = 'READ';
        }
      });
      state.unreadCounts[chatId] = 0;
    },
    clearUnreadCount: (state, action: PayloadAction<string>) => {
      const chatId = action.payload;
      state.unreadCounts[chatId] = 0;
    },
    setSocketConnected: (state, action: PayloadAction<boolean>) => {
      state.socketConnected = action.payload;
    },
    createChatStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    createChatSuccess: (state, action: PayloadAction<Chat>) => {
      state.isLoading = false;
      state.chats.unshift(action.payload);
      state.error = null;
    },
    createChatFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    updateChatSuccess: (state, action: PayloadAction<Chat>) => {
      const index = state.chats.findIndex(chat => chat.id === action.payload.id);
      if (index !== -1) {
        state.chats[index] = action.payload;
      }
      if (state.currentChat && state.currentChat.id === action.payload.id) {
        state.currentChat = action.payload;
      }
    },
    deleteChatSuccess: (state, action: PayloadAction<string>) => {
      state.chats = state.chats.filter(chat => chat.id !== action.payload);
      if (state.currentChat && state.currentChat.id === action.payload) {
        state.currentChat = null;
        state.messages = [];
      }
      delete state.unreadCounts[action.payload];
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchChatsStart,
  fetchChatsSuccess,
  fetchChatsFailure,
  fetchChatByIdStart,
  fetchChatByIdSuccess,
  fetchChatByIdFailure,
  fetchMessagesStart,
  fetchMessagesSuccess,
  fetchMessagesFailure,
  addMessage,
  sendMessageStart,
  sendMessageSuccess,
  sendMessageFailure,
  updateMessage,
  deleteMessage,
  setTypingUsers,
  clearTypingUser,
  setOnlineStatus,
  markMessagesAsRead,
  clearUnreadCount,
  setSocketConnected,
  createChatStart,
  createChatSuccess,
  createChatFailure,
  updateChatSuccess,
  deleteChatSuccess,
  clearMessages,
  clearError,
} = chatsSlice.actions;

export default chatsSlice.reducer;
