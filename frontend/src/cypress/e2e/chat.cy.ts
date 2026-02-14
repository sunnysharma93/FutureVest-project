describe('Chat Interface E2E Tests', () => {
  beforeEach(() => {
    // Mock socket service
    cy.intercept('GET', '/api/v1/chats', {
      fixture: 'chat-list.json',
    }).as('getChats');

    cy.intercept('GET', '/api/v1/chats/*/messages', {
      fixture: 'chat-messages.json',
    }).as('getMessages');

    cy.intercept('POST', '/api/v1/chats/*/messages', {
      fixture: 'send-message.json',
    }).as('sendMessage');

    cy.intercept('GET', '/api/v1/chats/*', {
      fixture: 'chat-details.json',
    }).as('getChatDetails');

    cy.intercept('POST', '/api/v1/chats/*/uploadFile', {
      fixture: 'file-upload.json',
    }).as('uploadFile');

    // Mock socket events
    cy.window().addEventListener('message', (event) => {
      // Mock receiving messages
      if (event.detail.type === 'receiveMessage') {
        cy.window().dispatchEvent(new CustomEvent('socket:receiveMessage', {
          detail: event.detail
        }));
      }
    });
  });

  describe('Chat Page', () => {
    beforeEach(() => {
      cy.login('student@example.com', 'password123');
      cy.visit('/chat');
    });

    it('should display chat list', () => {
      cy.get('[data-testid="chat-list"]').should('be.visible');
      cy.contains('Messages');
      cy.get('[data-testid="chat-list-item"]').should('have.length.greaterThan', 0);
    });

    it('should show online status indicators', () => {
      cy.get('[data-testid="chat-list-item"]').first().within(() => {
        cy.get('[data-testid="online-status"]').should('be.visible');
        cy.get('[data-testid="online-status"]').should('contain', 'Online');
      });
    });

    it('should display unread message counts', () => {
      cy.get('[data-testid="chat-list-item"]').first().within(() => {
        cy.get('[data-testid="unread-count"]').should('contain', '1');
      });
    });

    it('should navigate to chat room when chat is selected', () => {
      cy.get('[data-testid="chat-list-item"]').first().click();
      cy.url().should('include', '/chat/');
    });
  });

  describe('Chat Room Page', () => {
    beforeEach(() => {
      cy.login('student@example.com', 'password123');
      cy.visit('/chat/test-chat-id');
    });

    it('should display chat header with user info', () => {
      cy.get('[data-testid="chat-header"]').should('be.visible');
      cy.get('[data-testid="user-avatar"]').should('be.visible');
      cy.get('[data-testid="user-name"]').should('be.visible');
      cy.get('[data-testid="user-status"]').should('contain', 'Online');
    });

    it('should display messages list', () => {
      cy.get('[data-testid="messages-container"]').should('be.visible');
      cy.get('[data-testid="message-item"]').should('have.length.greaterThan', 0);
    });

    it('should show message timestamps', () => {
      cy.get('[data-testid="message-item"]').first().within(() => {
        cy.get('[data-testid="message-timestamp"]').should('be.visible');
      });
    });

    it('should differentiate own and other users messages', () => {
      cy.get('[data-testid="message-item"]').first().should('have.attr', 'data-own', 'true');
      cy.get('[data-testid="message-item"]').last().should('have.attr', 'data-own', 'false');
    });

    it('should scroll to bottom when new message arrives', () => {
      cy.get('[data-testid="messages-container"]').should('be.visible');
      
      // Send a message
      cy.get('[data-testid="message-input"]').type('Hello World');
      cy.get('[data-testid="send-button"]').click();
      
      // Check if scrolled to bottom
      cy.get('[data-testid="messages-container"]').should('contain', 'Hello World');
      
      // Check scroll position
      cy.get('[data-testid="messages-container"]').invoke('scrollTop').should('be.greaterThan', 0);
    });
  });

  describe('Message Sending', () => {
    beforeEach(() => {
      cy.login('student@example.com', 'password123');
      cy.visit('/chat/test-chat-id');
    });

    it('should send text message', () => {
      const message = 'Hello, this is a test message!';
      
      cy.get('[data-testid="message-input"]').type(message);
      cy.get('[data-testid="send-button"]').click();
      
      // Check if message appears in the list
      cy.contains(message);
      cy.get('[data-testid="message-item"]').last().should('contain', message);
    });

    it('should send file attachment', () => {
      const fileName = 'test-document.pdf';
      
      cy.get('[data-testid="attach-file"]').click();
      cy.get('[data-testid="file-input"]').attachFile(fileName);
      cy.get('[data-testid="send-button"]').click();
      
      // Check if file indicator appears
      cy.get('[data-testid="message-item"]').last().within(() => {
        cy.get('[data-testid="file-attachment"]').should('be.visible');
      });
    });

    it('should show typing indicators', () => {
      // Start typing
      cy.get('[data-testid="message-input"]').type('Hello');
      
      // Check if typing indicator appears (mocked)
      cy.get('[data-testid="typing-indicator"]').should('be.visible');
      cy.contains('is typing...');
      
      // Stop typing
      cy.get('[data-testid="message-input"]').clear();
      
      // Typing indicator should disappear
      cy.get('[data-testid="typing-indicator"]').should('not.exist');
    });

    it('should handle rate limiting', () => {
      // Send multiple messages quickly
      cy.get('[data-testid="message-input"]').type('Message 1');
      cy.get('[data-testid="send-button"]').click();
      
      // Second message should be rate limited
      cy.get('[data-testid="send-button"]').should('be.disabled');
      
      // Wait for rate limit to reset
      cy.wait(2000);
      cy.get('[data-testid="send-button"]').should('not.be.disabled');
    });

    it('should show error when sending fails', () => {
      // Mock network error
      cy.intercept('POST', '/api/v1/chats/*/messages', {
        statusCode: 500,
        body: { error: 'Failed to send message' },
      }).as('sendMessageError');

      cy.get('[data-testid="message-input"]').type('This will fail');
      cy.get('[data-testid="send-button"]').click();
      
      // Should show error message
      cy.contains('Failed to send message');
    });
  });

  describe('Socket Connection', () => {
    beforeEach(() => {
      cy.login('student@example.com', 'password123');
      cy.visit('/chat/test-chat-id');
    });

    it('should connect to socket on mount', () => {
      // Check if socket connection indicator is shown
      cy.get('[data-testid="socket-status"]').should('contain', 'Connected');
    });

    it('should handle disconnection gracefully', () => {
      // Simulate disconnection
      cy.window().dispatchEvent(new CustomEvent('socket:disconnect'));
      
      // Should show connection lost overlay
      cy.get('[data-testid="connection-lost"]').should('be.visible');
      cy.contains('Connection Lost');
      cy.contains('Trying to reconnect...');
    });

    it('should reconnect automatically', () => {
      // Simulate reconnection
      cy.window().dispatchEvent(new CustomEvent('socket:reconnect'));
      
      // Should remove connection lost overlay
      cy.get('[data-testid="connection-lost"]').should('not.exist');
      cy.get('[data-testid="socket-status"]').should('contain', 'Connected');
    });

    it('should handle connection errors', () => {
      // Simulate connection error
      cy.window().dispatchEvent(new CustomEvent('socket:error', {
        detail: { error: 'Connection failed' }
      }));
      
      // Should show error alert
      cy.get('[data-testid="connection-error"]').should('be.visible');
      cy.contains('Failed to connect to chat server');
    });
  });

  describe('File Upload', () => {
    beforeEach(() => {
      cy.login('student@example.com', 'password123');
      cy.visit('/chat/test-chat-id');
    });

    it('should upload image files', () => {
      const fileName = 'test-image.png';
      
      cy.get('[data-testid="attach-file"]').click();
      cy.get('[data-testid="file-input"]').attachFile(fileName);
      
      // Check if file is being uploaded
      cy.get('[data-testid="upload-progress"]').should('be.visible');
      cy.contains('Uploading...');
      
      // Wait for upload to complete
      cy.get('[data-testid="upload-progress"]').should('contain', '100%');
      cy.get('[data-testid="file-attachment"]').should('be.visible');
    });

    it('should validate file size', () => {
      const largeFileName = 'large-file.pdf';
      
      cy.get('[data-testid="attach-file"]').click();
      cy.get('[data-testid="file-input"]').attachFile(largeFileName);
      
      // Should show size error
      cy.contains('File size must be less than 10MB');
    });

    it('should validate file type', () => {
      const invalidFileName = 'invalid-file.txt';
      
      cy.get('[data-testid="attach-file"]').click();
      cy.get('[data-testid="file-input"]').attachFile(invalidFileName);
      
      // Should show type error
      cy.contains('Invalid file type');
    });
  });

  describe('Online Status', () => {
    beforeEach(() => {
      cy.login('student@example.com', 'password123');
      cy.visit('/chat/test-chat-id');
    });

    it('should show online status for active users', () => {
      cy.get('[data-testid="user-status"]').should('contain', 'Online');
      cy.get('[data-testid="online-indicator"]').should('have.attr', 'color', 'success');
    });

    it('should show offline status for inactive users', () => {
      // Mock user going offline
      cy.window().dispatchEvent(new CustomEvent('socket:userOffline', {
        detail: { userId: 'other-user-id', isOnline: false }
      }));
      
      cy.get('[data-testid="user-status"]').should('contain', 'Offline');
      cy.get('[data-testid="online-indicator"]').should('have.attr', 'color', 'default');
    });

    it('should show last seen time for offline users', () => {
      const lastSeen = '2024-01-15T10:30:00Z';
      
      cy.window().dispatchEvent(new CustomEvent('socket:userOffline', {
        detail: { userId: 'other-user-id', isOnline: false, lastSeen }
      }));
      
      cy.get('[data-testid="user-status"]').should('contain', 'Offline');
      cy.get('[data-testid="last-seen"]').should('contain', 'Last seen: Jan 15, 2024');
    });
  });

  describe('Message History', () => {
    beforeEach(() => {
      cy.login('student@example.com', 'password123');
      cy.visit('/chat/test-chat-id');
    });

    it('should persist messages on page reload', () => {
      // Send a message
      cy.get('[data-testid="message-input"]').type('Test message');
      cy.get('[data-testid="send-button"]').click();
      
      // Reload page
      cy.reload();
      
      // Message should still be there
      cy.contains('Test message');
      cy.get('[data-testid="message-item"]').should('have.length', 1);
    });

    it('should fetch message history on load', () => {
      // Should load existing messages
      cy.get('[data-testid="message-item"]').should('have.length.greaterThan', 0);
      
      // Messages should be in chronological order
      cy.get('[data-testid="message-item"]').first().should('contain', 'Older message');
      cy.get('[data-testid="message-item"]').last().should('contain', 'Newer message');
    });

    it('should mark messages as read', () => {
      // Send a message
      cy.get('[data-testid="message-input"]').type('Test message');
      cy.get('[data-testid="send-button"]').click();
      
      // Check if message is marked as read
      cy.get('[data-testid="message-item"]').last().should('have.attr', 'data-status', 'READ');
    });
  });

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      cy.login('student@example.com', 'password123');
      cy.visit('/chat/test-chat-id');
    });

    context('Mobile View', () => {
      beforeEach(() => {
        cy.viewport('iphone-x');
      });

      it('should adapt layout for mobile', () => {
        // Check mobile-specific elements
        cy.get('[data-testid="mobile-back-button"]').should('be.visible');
        cy.get('[data-testid="mobile-chat-input"]').should('be.visible');
        cy.get('[data-testid="messages-container"]').should('have.css', 'height', 'calc(100vh - 120px)');
      });

      it('should show floating action button', () => {
        cy.get('[data-testid="mobile-fab"]').should('be.visible');
        cy.get('[data-testid="mobile-fab"]').should('contain', 'ArrowBack');
      });
    });

    context('Desktop View', () => {
      beforeEach(() => {
        cy.viewport(1280, 720);
      });

      it('should use full layout on desktop', () => {
        // Check desktop-specific elements
        cy.get('[data-testid="desktop-header"]').should('be.visible');
        cy.get('[data-testid="desktop-actions"]').should('be.visible');
        cy.get('[data-testid="messages-container"]').should('have.css', 'height', 'calc(100vh - 120px)');
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      cy.login('student@example.com', 'password123');
      cy.visit('/chat/test-chat-id');
    });

    it('should handle network errors gracefully', () => {
      // Mock network failure
      cy.intercept('GET', '/api/v1/chats/*/messages', {
        statusCode: 500,
        body: { error: 'Network error' },
      }).as('networkError');

      // Should show error message
      cy.contains('Failed to fetch messages');
      cy.get('[data-testid="error-message"]').should('be.visible');
    });

    it('should handle authentication errors', () => {
      // Clear authentication
      cy.window().localStorage.removeItem('token');
      
      // Should redirect to login
      cy.url().should('include', '/login');
    });

    it('should handle invalid chat ID', () => {
      cy.visit('/chat/invalid-chat-id');
      
      // Should show not found error
      cy.contains('Chat not found');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      cy.login('student@example.com', 'password123');
      cy.visit('/chat/test-chat-id');
    });

    it('should be keyboard navigable', () => {
      // Test tab navigation
      cy.get('[data-testid="message-input"]').focus();
      cy.focused().should('have.attr', 'aria-label', 'Message input');
      
      cy.tab().should('have.focus', 'send-button');
      cy.focused().should('have.attr', 'aria-label', 'Send message');
    });

    it('should have proper ARIA labels', () => {
      cy.get('[data-testid="message-input"]').should('have.attr', 'aria-label', 'Message input');
      cy.get('[data-testid="send-button"]').should('have.attr', 'aria-label', 'Send message');
      cy.get('[data-testid="attach-file"]').should('have.attr', 'aria-label', 'Attach file');
    });

    it('should announce new messages to screen readers', () => {
      // Send a message
      cy.get('[data-testid="message-input"]').type('New message');
      cy.get('[data-testid="send-button"]').click();
      
      // Should announce to screen readers
      cy.get('[data-testid="message-item"]').last().should('have.attr', 'aria-live', 'polite');
      cy.get('[data-testid="message-item"]').last().should('contain', 'aria-label', 'New message from');
    });
  });

  describe('Performance', () => {
    beforeEach(() => {
      cy.login('student@example.com', 'password123');
      cy.visit('/chat/test-chat-id');
    });

    it('should handle large message lists efficiently', () => {
      // Mock many messages
      const manyMessages = Array.from({ length: 100 }, (_, index) => ({
        id: `msg-${index}`,
        chatId: 'test-chat-id',
        senderId: 'other-user-id',
        content: `Message ${index}`,
        messageType: 'TEXT',
        createdAt: new Date(Date.now() - (index * 1000 * 60).toISOString(),
        senderName: 'Other User',
        senderRole: 'INVESTOR',
      }));

      cy.window().dispatchEvent(new CustomEvent('socket:receiveMessage', {
        detail: manyMessages
      }));

      // Should handle large number of messages without performance issues
      cy.get('[data-testid="message-item"]').should('have.length', 100);
      cy.get('[data-testid="messages-container"]').should('be.visible');
    });

    it('should auto-scroll smoothly', () => {
      // Send multiple messages
      for (let i = 0; i < 10; i++) {
        cy.get('[data-testid="message-input"]').type(`Message ${i}`);
        cy.get('[data-testid="send-button"]').click();
        cy.wait(100);
      }
      
      // Should be at bottom
      cy.get('[data-testid="messages-container"]').invoke('scrollTop').should('be.close', 0);
    });
  });
});
