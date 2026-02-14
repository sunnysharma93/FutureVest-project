import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  IconButton,
  Badge,
  CircularProgress,
  Alert,
  Divider,
  Tooltip,
  Fab,
} from '@mui/material';
import {
  Send,
  Chat,
  Person,
  Business,
  Circle,
  Phone,
  VideoCall,
  MoreVert,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { RootState } from '../store';
import { socketService } from '../services/socket';
import { useApi } from '../hooks/useApi';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  fetchChatsStart,
  fetchChatsSuccess,
  fetchChatsFailure,
  fetchMessagesStart,
  fetchMessagesSuccess,
  fetchMessagesFailure,
  addMessage,
  sendMessageStart,
  sendMessageSuccess,
  sendMessageFailure,
  setTypingUsers,
  clearTypingUser,
  setOnlineStatus,
  setSocketConnected,
  markMessagesAsRead,
} from '../store/slices/chatsSlice';
import { Chat as IChat, ChatMessage as IChatMessage } from '../types';

const ChatPage: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { 
    chats, 
    currentChat, 
    messages, 
    typingUsers, 
    onlineUsers, 
    unreadCounts, 
    isLoading, 
    isSending, 
    error, 
    socketConnected 
  } = useSelector((state: RootState) => state.chats);
  
  const dispatch = useDispatch();
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Fetch chats
  const { data: chatsData, execute: fetchChats } = useApi<IChat[]>('/chats');
  
  // Fetch messages for current chat
  const { data: messagesData, execute: fetchMessages } = useApi<IChatMessage[]>(
    chatId ? `/chats/${chatId}/messages` : null,
    {},
    { immediate: false }
  );

  // Initialize socket connection
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const initializeSocket = async () => {
      try {
        if (chatId) {
          await socketService.connect(chatId, user.id);
          dispatch(setSocketConnected(true));
          setConnectionError(null);
        }
      } catch (error) {
        console.error('Failed to connect to socket:', error);
        setConnectionError('Failed to connect to chat server');
        dispatch(setSocketConnected(false));
      }
    };

    initializeSocket();

    return () => {
      socketService.disconnect();
      dispatch(setSocketConnected(false));
    };
  }, [isAuthenticated, user, chatId, dispatch]);

  // Fetch chats on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchChats();
    }
  }, [isAuthenticated, fetchChats]);

  // Fetch messages when chat changes
  useEffect(() => {
    if (chatId && socketConnected) {
      fetchMessages();
      
      // Mark messages as read
      dispatch(markMessagesAsRead(chatId));
    }
  }, [chatId, socketConnected, fetchMessages, dispatch]);

  // Update Redux store with fetched data
  useEffect(() => {
    if (chatsData) {
      dispatch(fetchChatsSuccess({
        data: chatsData,
        totalElements: chatsData.length,
        totalPages: 1,
        size: 20,
        number: 0,
        first: true,
        last: true,
      }));
    }
  }, [chatsData, dispatch]);

  useEffect(() => {
    if (messagesData) {
      dispatch(fetchMessagesSuccess(messagesData));
    }
  }, [messagesData, dispatch]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSendMessage = useCallback(async (content: string, file?: File) => {
    if (!user || !chatId || !socketConnected) return;

    try {
      dispatch(sendMessageStart());

      let fileUrl: string | undefined;
      
      // Upload file if provided
      if (file) {
        fileUrl = await socketService.uploadFile(file, chatId, user.id);
      }

      const message: Omit<IChatMessage, 'id' | 'createdAt'> = {
        chatId,
        senderId: user.id,
        content,
        messageType: file ? 'FILE' : 'TEXT',
        fileUrl,
        senderName: user.name,
        senderRole: user.role,
      };

      socketService.sendMessage(message);
      dispatch(sendMessageSuccess());
      
      // Update last message time for rate limiting
      socketService.updateLastMessageTime();
    } catch (error) {
      console.error('Failed to send message:', error);
      dispatch(sendMessageFailure('Failed to send message'));
    }
  }, [user, chatId, socketConnected, dispatch]);

  const handleTypingStart = useCallback(() => {
    if (!isTyping && user && chatId && socketConnected) {
      setIsTyping(true);
      socketService.sendTypingIndicator(chatId, user.id, user.name, true);
    }
  }, [isTyping, user, chatId, socketConnected]);

  const handleTypingStop = useCallback(() => {
    if (isTyping && user && chatId && socketConnected) {
      setIsTyping(false);
      socketService.sendTypingIndicator(chatId, user.id, user.name, false);
    }
  }, [isTyping, user, chatId, socketConnected]);

  const handleChatSelect = useCallback((selectedChatId: string) => {
    navigate(`/chat/${selectedChatId}`);
  }, [navigate]);

  const formatLastMessage = (message: IChatMessage) => {
    if (message.fileUrl) {
      return '📎 Attachment';
    }
    return message.content.length > 30 
      ? message.content.substring(0, 30) + '...'
      : message.content;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const isUserOnline = (userId: string) => {
    return onlineUsers[userId]?.isOnline || false;
  };

  const getTypingUsers = () => {
    return Object.values(typingUsers).filter(user => user.isTyping);
  };

  if (!isAuthenticated) {
    return (
      <Container>
        <Alert severity="info" sx={{ mt: 2 }}>
          Please log in to access the chat feature.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flexGrow: 1, display: 'flex', gap: 2, py: 2 }}>
        {/* Chat List Sidebar */}
        <Grid item xs={12} md={4} lg={3}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">Messages</Typography>
            </Box>
            
            <List sx={{ flexGrow: 1, overflow: 'auto', py: 1 }}>
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : chats.length === 0 ? (
                <Box sx={{ textAlign: 'center', p: 4 }}>
                  <Chat sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    No conversations yet
                  </Typography>
                </Box>
              ) : (
                chats.map((chat) => (
                  <ListItem
                    key={chat.id}
                    button
                    onClick={() => handleChatSelect(chat.id)}
                    selected={chatId === chat.id}
                    sx={{
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{
                          vertical: 'bottom',
                          horizontal: 'right',
                        }}
                        variant="dot"
                        color={isUserOnline(chat.investorId || chat.userId) ? 'success' : 'default'}
                      >
                        <Avatar sx={{ bgcolor: chat.investorId ? 'secondary.main' : 'primary.main' }}>
                          {chat.investorId ? <Business /> : <Person />}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {chat.investorName || chat.userName}
                          </Typography>
                          {chat.investorId && (
                            <Chip label="Investor" size="small" variant="outlined" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {chat.lastMessage ? formatLastMessage(chat.lastMessage) : 'No messages yet'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {chat.lastMessageTime && formatTime(chat.lastMessageTime)}
                          </Typography>
                        </Box>
                      }
                    />
                    
                    {unreadCounts[chat.id] > 0 && (
                      <Badge badgeContent={unreadCounts[chat.id]} color="primary" />
                    )}
                  </ListItem>
                ))
              )}
            </List>
          </Paper>
        </Grid>

        {/* Chat Area */}
        <Grid item xs={12} md={8} lg={9}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {chatId && currentChat ? (
              <>
                {/* Chat Header */}
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    variant="dot"
                    color={isUserOnline(currentChat.investorId || currentChat.userId) ? 'success' : 'default'}
                  >
                    <Avatar sx={{ bgcolor: currentChat.investorId ? 'secondary.main' : 'primary.main' }}>
                      {currentChat.investorId ? <Business /> : <Person />}
                    </Avatar>
                  </Badge>
                  
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">
                      {currentChat.investorName || currentChat.userName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isUserOnline(currentChat.investorId || currentChat.userId) ? 'Online' : 'Offline'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Voice Call">
                      <IconButton size="small">
                        <Phone />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Video Call">
                      <IconButton size="small">
                        <VideoCall />
                      </IconButton>
                    </Tooltip>
                    <IconButton size="small">
                      <MoreVert />
                    </IconButton>
                  </Box>
                </Box>

                {/* Messages Area */}
                <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                  {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : messages.length === 0 ? (
                    <Box sx={{ textAlign: 'center', p: 4 }}>
                      <Chat sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Start the conversation
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Send a message to begin chatting with {currentChat.investorName || currentChat.userName}
                      </Typography>
                    </Box>
                  ) : (
                    <Box>
                      {messages.map((message, index) => (
                        <Box key={message.id}>
                          <ChatMessage
                            message={message}
                            isOwn={message.senderId === user?.id}
                            showAvatar={index === 0 || messages[index - 1]?.senderId !== message.senderId}
                            showTimestamp={
                              index === 0 || 
                              new Date(message.createdAt).getTime() - new Date(messages[index - 1]?.createdAt).getTime() > 300000
                            }
                          />
                        </Box>
                      ))}
                      
                      {/* Typing Indicator */}
                      {getTypingUsers().length > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 1 }}>
                          <Circle sx={{ width: 8, height: 8, bgcolor: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {getTypingUsers().map(user => user.userName).join(', ')} is typing...
                          </Typography>
                        </Box>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </Box>
                  )}
                </Box>

                {/* Connection Status */}
                {!socketConnected && (
                  <Alert severity="warning" sx={{ m: 2 }}>
                    Connection lost. Trying to reconnect...
                  </Alert>
                )}

                {/* Message Input */}
                <ChatInput
                  onSendMessage={handleSendMessage}
                  disabled={!socketConnected || isSending}
                  placeholder={socketConnected ? "Type a message..." : "Reconnecting..."}
                  showTypingIndicator={getTypingUsers().length > 0}
                  onTypingStart={handleTypingStart}
                  onTypingStop={handleTypingStop}
                />
              </>
            ) : (
              <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Chat sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Select a conversation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Choose a chat from the list to start messaging
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}
          onClose={() => dispatch({ type: 'chats/clearError' })}
        >
          {error}
        </Alert>
      )}

      {connectionError && (
        <Alert 
          severity="error" 
          sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}
          action={
            <IconButton
              size="small"
              onClick={() => window.location.reload()}
            >
              Refresh
            </IconButton>
          }
        >
          {connectionError}
        </Alert>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <LoadingSpinner message="Loading chats..." fullScreen />
      )}
    </Container>
  );
};

export default ChatPage;
