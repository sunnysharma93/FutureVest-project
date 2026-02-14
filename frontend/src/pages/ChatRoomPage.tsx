import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Fab,
  Backdrop,
} from '@mui/material';
import {
  ArrowBack,
  Phone,
  VideoCall,
  MoreVert,
  Circle,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { RootState } from '../store';
import { socketService } from '../services/socket';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
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
import { ChatMessage as IChatMessage } from '../types';

const ChatRoomPage: React.FC = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { 
    messages, 
    typingUsers, 
    onlineUsers, 
    isLoading, 
    isSending, 
    error, 
    socketConnected 
  } = useSelector((state: RootState) => state.chats);
  
  const dispatch = useDispatch();
  const { chatId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const initializeSocket = async () => {
      try {
        if (chatId) {
          await socketService.connect(chatId, user.id);
          dispatch(setSocketConnected(true));
          setConnectionError(null);
          
          // Fetch chat details to get other user info
          try {
            const response = await fetch(`/api/v1/chats/${chatId}`);
            const chatData = await response.json();
            setOtherUser(chatData.investorId ? {
              id: chatData.investorId,
              name: chatData.investorName,
              role: 'INVESTOR',
            } : {
              id: chatData.userId,
              name: chatData.userName,
              role: 'USER',
            });
          } catch (error) {
            console.error('Failed to fetch chat details:', error);
          }
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

  // Fetch messages when connected
  useEffect(() => {
    if (chatId && socketConnected) {
      const fetchMessages = async () => {
        try {
          dispatch(fetchMessagesStart());
          const response = await fetch(`/api/v1/chats/${chatId}/messages`);
          const messagesData = await response.json();
          dispatch(fetchMessagesSuccess(messagesData));
          
          // Mark messages as read
          dispatch(markMessagesAsRead(chatId));
        } catch (error) {
          console.error('Failed to fetch messages:', error);
          dispatch(fetchMessagesFailure('Failed to fetch messages'));
        }
      };

      fetchMessages();
    }
  }, [chatId, socketConnected, dispatch]);

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

  const handleGoBack = useCallback(() => {
    navigate('/chat');
  }, [navigate]);

  const getTypingUsers = () => {
    return Object.values(typingUsers).filter(user => user.isTyping);
  };

  const isOtherUserOnline = () => {
    if (!otherUser) return false;
    return onlineUsers[otherUser.id]?.isOnline || false;
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
    <Container maxWidth="lg" sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', py: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={handleGoBack} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          {otherUser && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: isOtherUserOnline() ? 'success.main' : 'grey.500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Circle sx={{ width: 12, height: 12, bgcolor: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="h6">
                    {otherUser.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isOtherUserOnline() ? 'Online' : 'Offline'} • {otherUser.role}
                  </Typography>
                </Box>
              </Box>
            </>
          )}
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
      </Paper>

      {/* Messages Area */}
      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, bgcolor: 'background.default' }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                Loading messages...
              </Typography>
            </Box>
          ) : messages.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              textAlign: 'center',
              py: 4
            }}>
              <Box sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}>
                💬
              </Box>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Start the conversation
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Send a message to begin chatting with {otherUser?.name || 'this person'}
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

        {/* Connection Status Overlay */}
        {!socketConnected && (
          <Backdrop open>
            <Box sx={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              bgcolor: 'background.paper',
              p: 3,
              borderRadius: 2,
              boxShadow: 3,
              textAlign: 'center'
            }}>
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Connection Lost
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Trying to reconnect to the chat server...
              </Typography>
            </Box>
          </Backdrop>
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
      </Paper>

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
        <LoadingSpinner message="Loading chat..." fullScreen />
      )}

      {/* Floating Action Button for mobile */}
      <Fab
        color="primary"
        onClick={handleGoBack}
        sx={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          display: { xs: 'flex', md: 'none' },
        }}
      >
        <ArrowBack />
      </Fab>
    </Container>
  );
};

export default ChatRoomPage;
