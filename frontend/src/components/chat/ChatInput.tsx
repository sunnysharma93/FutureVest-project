import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  Chip,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Send,
  AttachFile,
  Mic,
  MicOff,
  EmojiEmotions,
  Clear,
} from '@mui/icons-material';

interface ChatInputProps {
  onSendMessage: (message: string, file?: File) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  showTypingIndicator?: boolean;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Type a message...",
  maxLength = 1000,
  showTypingIndicator = false,
  onTypingStart,
  onTypingStop,
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    
    if (value.length <= maxLength) {
      setMessage(value);
      
      // Handle typing indicators
      if (onTypingStart && value.length > 0) {
        onTypingStart();
        
        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        // Set new timeout to stop typing indicator
        typingTimeoutRef.current = setTimeout(() => {
          if (onTypingStop) {
            onTypingStop();
          }
        }, 1000);
      } else if (onTypingStop && value.length === 0) {
        onTypingStop();
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    }
  }, [maxLength, onTypingStart, onTypingStop]);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }, []);

  const handleSend = useCallback(async () => {
    if ((!message.trim() && !attachedFile) || disabled || isSending) {
      return;
    }

    setIsSending(true);
    
    try {
      await onSendMessage(message.trim(), attachedFile || undefined);
      setMessage('');
      setAttachedFile(null);
      
      // Clear typing indicator
      if (onTypingStop) {
        onTypingStop();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Focus back to input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }, [message, attachedFile, disabled, isSending, onSendMessage, onTypingStop]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please upload an image, PDF, or document.');
      return;
    }

    setAttachedFile(file);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleVoiceToggle = useCallback(() => {
    if (isRecording) {
      setIsRecording(false);
      // In a real implementation, this would stop recording and send the voice message
    } else {
      setIsRecording(true);
      // In a real implementation, this would start voice recording
    }
  }, [isRecording]);

  const getCharacterCountColor = () => {
    const percentage = (message.length / maxLength) * 100;
    if (percentage >= 90) return 'error';
    if (percentage >= 75) return 'warning';
    return 'text.secondary';
  };

  const canSend = (message.trim().length > 0 || attachedFile !== null) && !disabled && !isSending;

  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
      {/* Typing indicator */}
      {showTypingIndicator && (
        <Box sx={{ mb: 1, ml: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Someone is typing...
          </Typography>
        </Box>
      )}

      {/* File attachment preview */}
      {attachedFile && (
        <Box sx={{ mb: 2, ml: 1 }}>
          <Chip
            icon={<AttachFile />}
            label={attachedFile.name}
            onDelete={handleRemoveFile}
            deleteIcon={<Clear />}
            color="primary"
            variant="outlined"
            size="small"
          />
        </Box>
      )}

      {/* Input area */}
      <Paper
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          p: 1,
          gap: 1,
          bgcolor: 'background.default',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        {/* File attachment button */}
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
        />
        <Tooltip title="Attach file">
          <IconButton
            size="small"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            aria-label="Attach file"
          >
            <AttachFile />
          </IconButton>
        </Tooltip>

        {/* Message input */}
        <TextField
          ref={inputRef}
          fullWidth
          multiline
          maxRows={4}
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          variant="standard"
          InputProps={{
            disableUnderline: true,
            sx: {
              px: 1,
              '& textarea': {
                resize: 'none',
              },
            },
          }}
          inputProps={{
            'aria-label': 'Message input',
            maxLength: maxLength,
          }}
        />

        {/* Voice recording button */}
        <Tooltip title={isRecording ? "Stop recording" : "Start voice recording"}>
          <IconButton
            size="small"
            onClick={handleVoiceToggle}
            disabled={disabled}
            color={isRecording ? 'error' : 'default'}
            aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
          >
            {isRecording ? <MicOff /> : <Mic />}
          </IconButton>
        </Tooltip>

        {/* Send button */}
        <Tooltip title="Send message">
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
          >
            {isSending ? (
              <CircularProgress size={20} />
            ) : (
              <Send />
            )}
          </IconButton>
        </Tooltip>
      </Paper>

      {/* Character count */}
      {message.length > maxLength * 0.75 && (
        <Box sx={{ textAlign: 'right', mt: 0.5, mr: 1 }}>
          <Typography
            variant="caption"
            color={getCharacterCountColor()}
          >
            {message.length}/{maxLength}
          </Typography>
        </Box>
      )}

      {/* Voice recording indicator */}
      {isRecording && (
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: 'error.main',
              animation: 'pulse 1.5s infinite',
            }}
          />
          <Typography variant="caption" color="error.main">
            Recording...
          </Typography>
        </Box>
      )}

      <style>
        {`
          @keyframes pulse {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.2);
              opacity: 0.7;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
    </Box>
  );
};

export default ChatInput;
