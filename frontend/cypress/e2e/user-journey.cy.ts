describe('User Journey - Login → Register → Chat Flow', () => {
  beforeEach(() => {
    // Mock external services
    cy.intercept('POST', '/api/v1/auth/login', {
      fixture: 'login-success.json'
    }).as('loginRequest');
    
    cy.intercept('POST', '/api/v1/auth/register', {
      fixture: 'register-success.json'
    }).as('registerRequest');
    
    cy.intercept('GET', '/api/v1/chats', {
      fixture: 'chats-list.json'
    }).as('chatsListRequest');
    
    cy.intercept('GET', '/api/v1/chats/room-1/messages', {
      fixture: 'chat-messages.json'
    }).as('chatMessagesRequest');
    
    cy.intercept('POST', '/api/v1/payments/create-order', {
      fixture: 'payment-order.json'
    }).as('paymentOrderRequest');
    
    // Mock Razorpay
    cy.window().then((win) => {
      win.Razorpay = {
        open: (options) => {
          // Simulate successful payment
          options.handler({
            razorpay_order_id: 'order_123',
            razorpay_payment_id: 'pay_123',
            razorpay_signature: 'signature_123'
          });
        }
      };
    });
  });

  it('should complete full user journey from registration to chat', () => {
    // Step 1: Visit landing page
    cy.visit('/');
    
    // Verify landing page elements
    cy.get('[data-testid="landing-page"]').should('be.visible');
    cy.get('[data-testid="get-started-button"]').should('be.visible');
    cy.get('[data-testid="login-button"]').should('be.visible');
    
    // Step 2: Navigate to registration
    cy.get('[data-testid="get-started-button"]').click();
    cy.url().should('include', '/register');
    
    // Step 3: Fill registration form
    cy.get('[data-testid="registration-form"]').should('be.visible');
    
    // Fill personal information
    cy.get('[data-testid="name-input"]').type('John Doe');
    cy.get('[data-testid="email-input"]').type('john.doe@example.com');
    cy.get('[data-testid="password-input"]').type('Password123!');
    cy.get('[data-testid="confirm-password-input"]').type('Password123!');
    
    // Upload resume
    cy.get('[data-testid="resume-upload"]').should('be.visible');
    cy.fixture('resume.pdf').then((fileContent) => {
      cy.get('[data-testid="resume-input"]').attachFile({
        fileContent: fileContent.toString(),
        fileName: 'resume.pdf',
        mimeType: 'application/pdf'
      });
    });
    
    // Upload Aadhaar
    cy.fixture('aadhaar.pdf').then((fileContent) => {
      cy.get('[data-testid="aadhaar-input"]').attachFile({
        fileContent: fileContent.toString(),
        fileName: 'aadhaar.pdf',
        mimeType: 'application/pdf'
      });
    });
    
    // Accept terms and conditions
    cy.get('[data-testid="terms-checkbox"]').check();
    
    // Submit registration
    cy.get('[data-testid="register-button"]').click();
    
    // Wait for registration to complete
    cy.wait('@registerRequest');
    
    // Verify registration success
    cy.get('[data-testid="registration-success"]').should('be.visible');
    cy.get('[data-testid="success-message"]').should('contain', 'Registration successful!');
    
    // Step 4: Navigate to login
    cy.get('[data-testid="go-to-login-button"]').click();
    cy.url().should('include', '/login');
    
    // Step 5: Login with registered credentials
    cy.get('[data-testid="login-form"]').should('be.visible');
    
    cy.get('[data-testid="email-input"]').type('john.doe@example.com');
    cy.get('[data-testid="password-input"]').type('Password123!');
    cy.get('[data-testid="remember-me-checkbox"]').check();
    
    cy.get('[data-testid="login-button"]').click();
    
    // Wait for login to complete
    cy.wait('@loginRequest');
    
    // Verify login success and redirect to dashboard
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="user-dashboard"]').should('be.visible');
    cy.get('[data-testid="user-name"]').should('contain', 'John Doe');
    cy.get('[data-testid="user-email"]').should('contain', 'john.doe@example.com');
    
    // Step 6: Navigate to chat
    cy.get('[data-testid="chat-navigation"]').click();
    cy.url().should('include', '/chat');
    
    // Wait for chat data to load
    cy.wait('@chatsListRequest');
    
    // Verify chat interface
    cy.get('[data-testid="chat-page"]').should('be.visible');
    cy.get('[data-testid="chat-list"]').should('be.visible');
    cy.get('[data-testid="chat-room"]').should('be.visible');
    
    // Step 7: Select a chat room
    cy.get('[data-testid="chat-item"]').first().click();
    cy.wait('@chatMessagesRequest');
    
    // Verify chat room interface
    cy.get('[data-testid="chat-messages"]').should('be.visible');
    cy.get('[data-testid="message-input"]').should('be.visible');
    cy.get('[data-testid="send-button"]').should('be.visible');
    
    // Step 8: Send a message
    cy.get('[data-testid="message-input"]').type('Hello, this is a test message!');
    cy.get('[data-testid="send-button"]').click();
    
    // Verify message appears in chat
    cy.get('[data-testid="message-item"]').should('contain', 'Hello, this is a test message!');
    cy.get('[data-testid="message-timestamp"]').should('be.visible');
    
    // Step 9: Test typing indicators
    cy.get('[data-testid="message-input"]').type('Typing...');
    cy.get('[data-testid="typing-indicator"]').should('be.visible');
    
    // Clear input to stop typing
    cy.get('[data-testid="message-input"]').clear();
    cy.get('[data-testid="typing-indicator"]').should('not.be.visible');
    
    // Step 10: Test file upload in chat
    cy.get('[data-testid="file-upload-button"]').click();
    cy.fixture('chat-document.pdf').then((fileContent) => {
      cy.get('[data-testid="file-input"]').attachFile({
        fileContent: fileContent.toString(),
        fileName: 'document.pdf',
        mimeType: 'application/pdf'
      });
    });
    
    // Verify file upload progress
    cy.get('[data-testid="upload-progress"]').should('be.visible');
    cy.get('[data-testid="upload-progress"]').should('contain', '100%');
    
    // Verify file appears in chat
    cy.get('[data-testid="file-message"]').should('be.visible');
    cy.get('[data-testid="file-name"]').should('contain', 'document.pdf');
    
    // Step 11: Test online status
    cy.get('[data-testid="online-status"]').should('be.visible');
    cy.get('[data-testid="online-users"]').should('be.visible');
    
    // Step 12: Test chat settings
    cy.get('[data-testid="chat-settings-button"]').click();
    cy.get('[data-testid="chat-settings-menu"]').should('be.visible');
    cy.get('[data-testid="mute-notifications-option"]').should('be.visible');
    cy.get('[data-testid="clear-chat-option"]').should('be.visible');
    
    // Close settings menu
    cy.get('[data-testid="chat-settings-button"]').click();
    cy.get('[data-testid="chat-settings-menu"]').should('not.be.visible');
    
    // Step 13: Test search functionality
    cy.get('[data-testid="chat-search-input"]').type('test message');
    cy.get('[data-testid="search-results"]').should('be.visible');
    cy.get('[data-testid="search-result-item"]').should('contain', 'test message');
    
    // Clear search
    cy.get('[data-testid="chat-search-input"]').clear();
    cy.get('[data-testid="search-results"]').should('not.be.visible');
    
    // Step 14: Test logout
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="logout-button"]').click();
    
    // Verify logout and redirect to landing page
    cy.url().should('include', '/');
    cy.get('[data-testid="landing-page"]').should('be.visible');
    
    // Verify user is logged out
    cy.get('[data-testid="user-name"]').should('not.exist');
    cy.get('[data-testid="user-dashboard"]').should('not.exist');
  });

  it('should handle registration validation errors', () => {
    cy.visit('/register');
    
    // Try to submit empty form
    cy.get('[data-testid="register-button"]').click();
    
    // Verify validation errors
    cy.get('[data-testid="name-error"]').should('be.visible');
    cy.get('[data-testid="email-error"]').should('be.visible');
    cy.get('[data-testid="password-error"]').should('be.visible');
    cy.get('[data-testid="confirm-password-error"]').should('be.visible');
    
    // Test email validation
    cy.get('[data-testid="email-input"]').type('invalid-email');
    cy.get('[data-testid="email-error"]').should('contain', 'Please enter a valid email');
    
    // Test password validation
    cy.get('[data-testid="password-input"]').type('123');
    cy.get('[data-testid="password-error"]').should('contain', 'Password must be at least 6 characters');
    
    // Test password mismatch
    cy.get('[data-testid="password-input"]').clear().type('Password123!');
    cy.get('[data-testid="confirm-password-input"]').type('DifferentPassword');
    cy.get('[data-testid="confirm-password-error"]').should('contain', 'Passwords do not match');
    
    // Test terms acceptance
    cy.get('[data-testid="name-input"]').type('John Doe');
    cy.get('[data-testid="email-input"]').clear().type('john.doe@example.com');
    cy.get('[data-testid="password-input"]').clear().type('Password123!');
    cy.get('[data-testid="confirm-password-input"]').clear().type('Password123!');
    
    cy.get('[data-testid="register-button"]').click();
    cy.get('[data-testid="terms-error"]').should('contain', 'You must accept the terms and conditions');
  });

  it('should handle login errors', () => {
    // Mock login failure
    cy.intercept('POST', '/api/v1/auth/login', {
      statusCode: 401,
      body: { message: 'Invalid credentials' }
    }).as('loginError');
    
    cy.visit('/login');
    
    // Try to login with invalid credentials
    cy.get('[data-testid="email-input"]').type('invalid@example.com');
    cy.get('[data-testid="password-input"]').type('wrongpassword');
    cy.get('[data-testid="login-button"]').click();
    
    cy.wait('@loginError');
    
    // Verify error message
    cy.get('[data-testid="login-error"]').should('be.visible');
    cy.get('[data-testid="login-error"]').should('contain', 'Invalid credentials');
  });

  it('should handle chat connection errors', () => {
    // Mock successful login
    cy.intercept('POST', '/api/v1/auth/login', {
      fixture: 'login-success.json'
    }).as('loginRequest');
    
    // Mock chat connection error
    cy.intercept('GET', '/api/v1/chats', {
      statusCode: 500,
      body: { message: 'Chat service unavailable' }
    }).as('chatError');
    
    cy.visit('/login');
    
    // Login successfully
    cy.get('[data-testid="email-input"]').type('john.doe@example.com');
    cy.get('[data-testid="password-input"]').type('Password123!');
    cy.get('[data-testid="login-button"]').click();
    
    cy.wait('@loginRequest');
    
    // Navigate to chat
    cy.get('[data-testid="chat-navigation"]').click();
    cy.wait('@chatError');
    
    // Verify error handling
    cy.get('[data-testid="chat-error"]').should('be.visible');
    cy.get('[data-testid="chat-error"]').should('contain', 'Chat service unavailable');
    cy.get('[data-testid="retry-button"]').should('be.visible');
  });

  it('should handle payment flow during chat interaction', () => {
    // Mock successful login and chat data
    cy.intercept('POST', '/api/v1/auth/login', {
      fixture: 'login-success.json'
    }).as('loginRequest');
    
    cy.intercept('GET', '/api/v1/chats', {
      fixture: 'chats-list.json'
    }).as('chatsListRequest');
    
    cy.intercept('GET', '/api/v1/chats/room-1/messages', {
      fixture: 'chat-messages.json'
    }).as('chatMessagesRequest');
    
    cy.visit('/login');
    
    // Login
    cy.get('[data-testid="email-input"]').type('john.doe@example.com');
    cy.get('[data-testid="password-input"]').type('Password123!');
    cy.get('[data-testid="login-button"]').click();
    
    cy.wait('@loginRequest');
    
    // Navigate to chat
    cy.get('[data-testid="chat-navigation"]').click();
    cy.wait('@chatsListRequest');
    
    // Select chat room
    cy.get('[data-testid="chat-item"]').first().click();
    cy.wait('@chatMessagesRequest');
    
    // Trigger payment flow (e.g., for premium features)
    cy.get('[data-testid="premium-features-button"]').click();
    cy.get('[data-testid="payment-modal"]').should('be.visible');
    
    // Fill payment form
    cy.get('[data-testid="payment-amount-input"]').type('5000');
    cy.get('[data-testid="payment-description-input"]').type('Premium chat features');
    
    // Initiate payment
    cy.get('[data-testid="payment-submit-button"]').click();
    cy.wait('@paymentOrderRequest');
    
    // Verify payment success
    cy.get('[data-testid="payment-success"]').should('be.visible');
    cy.get('[data-testid="payment-success-message"]').should('contain', 'Payment successful!');
    
    // Verify premium features are unlocked
    cy.get('[data-testid="premium-feature-indicator"]').should('be.visible');
  });

  it('should handle mobile responsive design', () => {
    // Set mobile viewport
    cy.viewport(375, 667);
    
    cy.visit('/register');
    
    // Verify mobile layout
    cy.get('[data-testid="registration-form"]').should('be.visible');
    cy.get('[data-testid="mobile-navigation"]').should('be.visible');
    cy.get('[data-testid="mobile-menu-button"]').should('be.visible');
    
    // Test mobile menu
    cy.get('[data-testid="mobile-menu-button"]').click();
    cy.get('[data-testid="mobile-menu"]').should('be.visible');
    cy.get('[data-testid="mobile-menu-items"]').should('be.visible');
    
    // Close mobile menu
    cy.get('[data-testid="mobile-menu-button"]').click();
    cy.get('[data-testid="mobile-menu"]').should('not.be.visible');
    
    // Test mobile registration
    cy.get('[data-testid="name-input"]').type('John Doe');
    cy.get('[data-testid="email-input"]').type('john.doe@example.com');
    cy.get('[data-testid="password-input"]').type('Password123!');
    cy.get('[data-testid="confirm-password-input"]').type('Password123!');
    cy.get('[data-testid="terms-checkbox"]').check();
    
    cy.get('[data-testid="register-button"]').click();
    cy.wait('@registerRequest');
    
    // Verify mobile success state
    cy.get('[data-testid="registration-success"]').should('be.visible');
    cy.get('[data-testid="mobile-success-message"]').should('be.visible');
  });

  it('should handle accessibility features', () => {
    cy.visit('/register');
    
    // Test keyboard navigation
    cy.get('[data-testid="name-input"]').focus();
    cy.get('body').tab();
    cy.get('[data-testid="email-input"]').should('be.focused');
    
    cy.get('body').tab();
    cy.get('[data-testid="password-input"]').should('be.focused');
    
    // Test ARIA labels
    cy.get('[data-testid="name-input"]').should('have.attr', 'aria-label', 'Full Name');
    cy.get('[data-testid="email-input"]').should('have.attr', 'aria-label', 'Email');
    cy.get('[data-testid="password-input"]').should('have.attr', 'aria-label', 'Password');
    
    // Test screen reader support
    cy.get('[data-testid="registration-form"]').should('have.attr', 'role', 'form');
    cy.get('[data-testid="register-button"]').should('have.attr', 'aria-label', 'Register Account');
    
    // Test focus management
    cy.get('[data-testid="register-button"]').click();
    cy.get('[data-testid="name-error"]').should('be.focused');
  });

  it('should handle performance and loading states', () => {
    // Mock slow API responses
    cy.intercept('POST', '/api/v1/auth/login', {
      fixture: 'login-success.json',
      delay: 2000
    }).as('slowLogin');
    
    cy.visit('/login');
    
    // Fill login form
    cy.get('[data-testid="email-input"]').type('john.doe@example.com');
    cy.get('[data-testid="password-input"]').type('Password123!');
    
    // Submit and verify loading state
    cy.get('[data-testid="login-button"]').click();
    cy.get('[data-testid="login-button"]').should('be.disabled');
    cy.get('[data-testid="loading-spinner"]').should('be.visible');
    cy.get('[data-testid="loading-text"]').should('contain', 'Logging in...');
    
    // Wait for completion
    cy.wait('@slowLogin');
    
    // Verify loading state is removed
    cy.get('[data-testid="login-button"]').should('not.be.disabled');
    cy.get('[data-testid="loading-spinner"]').should('not.be.visible');
  });

  it('should handle data persistence and session management', () => {
    // Mock successful login
    cy.intercept('POST', '/api/v1/auth/login', {
      fixture: 'login-success.json'
    }).as('loginRequest');
    
    cy.visit('/login');
    
    // Login
    cy.get('[data-testid="email-input"]').type('john.doe@example.com');
    cy.get('[data-testid="password-input"]').type('Password123!');
    cy.get('[data-testid="remember-me-checkbox"]').check();
    cy.get('[data-testid="login-button"]').click();
    
    cy.wait('@loginRequest');
    
    // Verify session is stored
    cy.window().then((win) => {
      expect(win.localStorage.getItem('authToken')).to.exist;
      expect(win.localStorage.getItem('user')).to.exist;
    });
    
    // Navigate to chat and verify data persistence
    cy.get('[data-testid="chat-navigation"]').click();
    cy.wait('@chatsListRequest');
    
    // Verify chat data is cached
    cy.window().then((win) => {
      expect(win.sessionStorage.getItem('chatData')).to.exist;
    });
    
    // Refresh page and verify session persistence
    cy.reload();
    
    // Verify user is still logged in
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="user-name"]').should('contain', 'John Doe');
  });
});
