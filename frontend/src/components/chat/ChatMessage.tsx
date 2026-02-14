import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  alpha,
} from '@mui/material';
import {
  Person,
  Business,
  Schedule,
  Done,
  DoneAll,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { ChatMessage as IChatMessage } from '../../types';

interface ChatMessageProps {
  message: IChatMessage;
  isOwn: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isOwn,
  showAvatar = true,
  showTimestamp = true,
}) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'DELIVERED':
        return <Done sx={{ fontSize: 16, color: 'text.secondary' }} />;
      case 'READ':
        return <DoneAll sx={{ fontSize: 16, color: 'primary.main' }} />;
      case 'FAILED':
        return <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />;
      default:
        return null;
    }
  };

  const getAvatarColor = (senderRole?: string) => {
    switch (senderRole) {
      case 'USER':
        return 'primary';
      case 'INVESTOR':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getAvatarIcon = (senderRole?: string) => {
    switch (senderRole) {
      case 'USER':
        return <Person />;
      case 'INVESTOR':
        return <Business />;
      default:
        return <Person />;
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        mb: 2,
        alignItems: 'flex-start',
        gap: 1,
      }}
    >
      {showAvatar && !isOwn && (
        <Avatar
          sx={{
            bgcolor: `${getAvatarColor(message.senderRole)}.main`,
            width: 36,
            height: 36,
          }}
        >
          {getAvatarIcon(message.senderRole)}
        </Avatar>
      )}

      <Box
        sx={{
          maxWidth: isOwn ? '70%' : '75%',
          minWidth: '120px',
        }}
      >
        {/* Message bubble */}
        <Paper
          sx={{
            p: 2,
            bgcolor: isOwn ? 'primary.main' : 'background.paper',
            color: isOwn ? 'primary.contrastText' : 'text.primary',
            borderTopLeftRadius: isOwn ? 16 : 4,
            borderTopRightRadius: isOwn ? 4 : 16,
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
            boxShadow: 1,
            position: 'relative',
            '&:hover': {
              boxShadow: 2,
            },
          }}
        >
          {/* Sender name (for group chats or when not own message) */}
          {!isOwn && message.senderName && (
            <Typography
              variant="caption"
              sx={{
                fontWeight: 'bold',
                mb: 0.5,
                display: 'block',
                color: 'inherit',
                opacity: 0.8,
              }}
            >
              {message.senderName}
            </Typography>
          )}

          {/* Message content */}
          <Typography
            variant="body2"
            sx={{
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.4,
            }}
          >
            {message.content}
          </Typography>

          {/* File attachment indicator */}
          {message.fileUrl && (
            <Box sx={{ mt: 1 }}>
              <Chip
                label="📎 Attachment"
                size="small"
                variant="outlined"
                sx={{
                  borderColor: isOwn ? 'rgba(255,255,255,0.5)' : 'divider',
                  color: 'inherit',
                }}
              />
            </Box>
          )}

          {/* Timestamp and status */}
          {(showTimestamp || message.status) && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: isOwn ? 'flex-end' : 'flex-start',
                alignItems: 'center',
                gap: 0.5,
                mt: 1,
              }}
            >
              {showTimestamp && (
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.7rem',
                    opacity: 0.7,
                    color: 'inherit',
                  }}
                >
                  {formatTime(message.createdAt)}
                </Typography>
              )}
              
              {isOwn && getStatusIcon(message.status)}
            </Box>
          )}
        </Paper>

        {/* Date separator */}
        {showTimestamp && (
          <Typography
            variant="caption"
            sx={{
              mt: 0.5,
              color: 'text.secondary',
              fontSize: '0.7rem',
              textAlign: isOwn ? 'right' : 'left',
              display: 'block',
            }}
          >
            {formatDate(message.createdAt)}
          </Typography>
        )}
      </Box>

      {/* Own avatar (shown on the right) */}
      {showAvatar && isOwn && (
        <Avatar
          sx={{
            bgcolor: `${getAvatarColor(message.senderRole)}.main`,
            width: 36,
            height: 36,
          }}
        >
          {getAvatarIcon(message.senderRole)}
        </Avatar>
      )}
    </Box>
  );
};

export default ChatMessage;
