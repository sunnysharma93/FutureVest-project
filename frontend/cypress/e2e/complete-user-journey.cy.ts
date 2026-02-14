describe('Complete User Journey - Registration → File Upload → Chat → Payment → Repayment', () => {
  beforeEach(() => {
    // Reset database and clear local storage
    cy.task('db:seed');
    cy.clearLocalStorage();
    cy.clearCookies();
    
    // Mock external services
    cy.intercept('POST', '/api/v1/payments/create-order', {
      fixture: 'payment-order-success.json'
    }).as('createPaymentOrder');
    
    cy.intercept('POST', '/api/v1/payments/verify', {
      fixture: 'payment-verify-success.json'
    }).as('verifyPayment');
    
    cy.intercept('POST', '/api/v1/files/upload', {
      fixture: 'file-upload-success.json'
    }).as('fileUpload');
    
    cy.intercept('GET', '/api/v1/chats', {
      fixture: 'chats-list.json'
    }).as('getChats');
    
    cy.intercept('POST', '/api/v1/chats/messages', {
      fixture: 'chat-message-success.json'
    }).as('sendMessage');
    
    // Mock Razorpay
    cy.window().then((win) => {
      win.Razorpay = {
        open: (options) => {
          // Simulate successful payment
          options.handler({
            razorpay_order_id: 'order_123456789',
            razorpay_payment_id: 'pay_123456789',
            razorpay_signature: 'generated_signature'
          });
        }
      };
    });
  });

  it('should complete full user journey successfully', () => {
    // Step 1: Navigate to registration page
    cy.visit('/register');
    cy.url().should('include', '/register');
    
    // Verify registration page elements
    cy.get('[data-testid="registration-form"]').should('be.visible');
    cy.get('[data-testid="name-input"]').should('be.visible');
    cy.get('[data-testid="email-input"]').should('be.visible');
    cy.get('[data-testid="password-input"]').should('be.visible');
    cy.get('[data-testid="confirm-password-input"]').should('be.visible');
    cy.get('[data-testid="register-button"]').should('be.visible');
    
    // Step 2: Fill registration form with valid data
    cy.get('[data-testid="name-input"]').type('John Doe');
    cy.get('[data-testid="email-input"]').type('john.doe@example.com');
    cy.get('[data-testid="password-input"]').type('Password123!');
    cy.get('[data-testid="confirm-password-input"]').type('Password123!');
    
    // Step 3: Upload resume file
    cy.get('[data-testid="resume-upload"]').should('be.visible');
    cy.fixture('resume.pdf').then((fileContent) => {
      cy.get('[data-testid="resume-input"]').attachFile({
        fileContent: fileContent.toString(),
        fileName: 'resume.pdf',
        mimeType: 'application/pdf'
      });
    });
    
    // Verify file upload progress and success
    cy.get('[data-testid="upload-progress"]').should('be.visible');
    cy.get('[data-testid="upload-progress"]', { timeout: 10000 }).should('contain', '100%');
    cy.get('[data-testid="file-upload-success"]').should('be.visible');
    
    // Step 4: Upload Aadhaar file
    cy.fixture('aadhaar.pdf').then((fileContent) => {
      cy.get('[data-testid="aadhaar-input"]').attachFile({
        fileContent: fileContent.toString(),
        fileName: 'aadhaar.pdf',
        mimeType: 'application/pdf'
      });
    });
    
    // Verify Aadhaar upload success
    cy.get('[data-testid="aadhaar-upload-success"]').should('be.visible');
    
    // Step 5: Accept terms and conditions
    cy.get('[data-testid="terms-checkbox"]').check();
    cy.get('[data-testid="terms-checkbox"]').should('be.checked');
    
    // Step 6: Submit registration form
    cy.get('[data-testid="register-button"]').click();
    
    // Wait for registration to complete
    cy.wait('@fileUpload');
    cy.get('[data-testid="registration-success"]').should('be.visible');
    cy.get('[data-testid="success-message"]').should('contain', 'Registration successful!');
    
    // Step 7: Navigate to login page
    cy.get('[data-testid="go-to-login-button"]').click();
    cy.url().should('include', '/login');
    
    // Step 8: Login with registered credentials
    cy.get('[data-testid="email-input"]').type('john.doe@example.com');
    cy.get('[data-testid="password-input"]').type('Password123!');
    cy.get('[data-testid="remember-me-checkbox"]').check();
    cy.get('[data-testid="login-button"]').click();
    
    // Verify login success and redirect to dashboard
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="user-dashboard"]').should('be.visible');
    cy.get('[data-testid="user-name"]').should('contain', 'John Doe');
    cy.get('[data-testid="user-email"]').should('contain', 'john.doe@example.com');
    
    // Step 9: Navigate to chat
    cy.get('[data-testid="chat-navigation"]').click();
    cy.url().should('include', '/chat');
    
    // Wait for chat data to load
    cy.wait('@getChats');
    
    // Verify chat interface
    cy.get('[data-testid="chat-page"]').should('be.visible');
    cy.get('[data-testid="chat-list"]').should('be.visible');
    cy.get('[data-testid="chat-room"]').should('be.visible');
    
    // Step 10: Select a chat room
    cy.get('[data-testid="chat-item"]').first().click();
    cy.get('[data-testid="chat-messages"]').should('be.visible');
    cy.get('[data-testid="message-input"]').should('be.visible');
    cy.get('[data-testid="send-button"]').should('be.visible');
    
    // Step 11: Send a chat message
    cy.get('[data-testid="message-input"]').type('Hello, this is a test message!');
    cy.get('[data-testid="send-button"]').click();
    
    // Verify message appears in chat
    cy.wait('@sendMessage');
    cy.get('[data-testid="message-item"]').should('contain', 'Hello, this is a test message!');
    cy.get('[data-testid="message-timestamp"]').should('be.visible');
    
    // Step 12: Test typing indicators
    cy.get('[data-testid="message-input"]').type('Typing...');
    cy.get('[data-testid="typing-indicator"]').should('be.visible');
    
    // Clear input to stop typing
    cy.get('[data-testid="message-input"]').clear();
    cy.get('[data-testid="typing-indicator"]').should('not.be.visible');
    
    // Step 13: Test file upload in chat
    cy.get('[data-testid="file-upload-button"]').click();
    cy.fixture('chat-document.pdf').then((fileContent) => {
      cy.get('[data-testid="file-input"]').attachFile({
        fileContent: fileContent.toString(),
        fileName: 'document.pdf',
        mimeType: 'application/pdf'
      });
    });
    
    // Verify file upload progress and success
    cy.get('[data-testid="upload-progress"]').should('be.visible');
    cy.get('[data-testid="upload-progress"]', { timeout: 10000 }).should('contain', '100%');
    cy.get('[data-testid="file-message"]').should('be.visible');
    cy.get('[data-testid="file-name"]').should('contain', 'document.pdf');
    
    // Step 14: Navigate to investments
    cy.get('[data-testid="investments-navigation"]').click();
    cy.url().should('include', '/investments');
    
    // Verify investments page
    cy.get('[data-testid="investments-page"]').should('be.visible');
    cy.get('[data-testid="create-investment-button"]').should('be.visible');
    
    // Step 15: Create a new investment
    cy.get('[data-testid="create-investment-button"]').click();
    cy.get('[data-testid="investment-form"]').should('be.visible');
    
    // Fill investment details
    cy.get('[data-testid="amount-input"]').type('50000');
    cy.get('[data-testid="duration-select"]').select('24');
    cy.get('[data-testid="interest-rate-input"]').should('have.value', '10.5');
    
    // Submit investment form
    cy.get('[data-testid="submit-investment-button"]').click();
    
    // Verify investment creation
    cy.get('[data-testid="investment-success"]').should('be.visible');
    cy.get('[data-testid="investment-details"]').should('contain', '₹50,000');
    
    // Step 16: Navigate to payments
    cy.get('[data-testid="payments-navigation"]').click();
    cy.url().should('include', '/payments');
    
    // Verify payments page
    cy.get('[data-testid="payments-page"]').should('be.visible');
    cy.get('[data-testid="payment-form"]').should('be.visible');
    
    // Step 17: Make a payment
    cy.get('[data-testid="payment-amount-input"]').should('have.value', '2315.47');
    cy.get('[data-testid="payment-method-select"]').select('RAZORPAY');
    cy.get('[data-testid="pay-button"]').click();
    
    // Wait for payment order creation
    cy.wait('@createPaymentOrder');
    
    // Verify Razorpay modal opens (mocked)
    cy.get('[data-testid="payment-processing"]').should('be.visible');
    
    // Wait for payment verification
    cy.wait('@verifyPayment');
    
    // Verify payment success
    cy.get('[data-testid="payment-success"]').should('be.visible');
    cy.get('[data-testid="payment-confirmation"]').should('contain', 'Payment successful!');
    
    // Step 18: Navigate to repayments
    cy.get('[data-testid="repayments-navigation"]').click();
    cy.url().should('include', '/repayments');
    
    // Verify repayments page
    cy.get('[data-testid="repayments-page"]').should('be.visible');
    cy.get('[data-testid="repayment-schedule"]').should('be.visible');
    
    // Step 19: Make a repayment
    cy.get('[data-testid="repayment-item"]').first().within(() => {
      cy.get('[data-testid="repayment-amount"]').should('contain', '₹2,315.47');
      cy.get('[data-testid="repayment-status"]').should('contain', 'PENDING');
      cy.get('[data-testid="pay-repayment-button"]').click();
    });
    
    // Wait for repayment payment order creation
    cy.wait('@createPaymentOrder');
    
    // Wait for repayment payment verification
    cy.wait('@verifyPayment');
    
    // Verify repayment success
    cy.get('[data-testid="repayment-success"]').should('be.visible');
    cy.get('[data-testid="repayment-confirmation"]').should('contain', 'Repayment successful!');
    
    // Step 20: Verify repayment status updated
    cy.get('[data-testid="repayment-item"]').first().within(() => {
      cy.get('[data-testid="repayment-status"]').should('contain', 'PAID');
    });
    
    // Step 21: Navigate to profile
    cy.get('[data-testid="profile-navigation"]').click();
    cy.url().should('include', '/profile');
    
    // Verify profile page
    cy.get('[data-testid="profile-page"]').should('be.visible');
    cy.get('[data-testid="user-info"]').should('contain', 'John Doe');
    cy.get('[data-testid="user-email"]').should('contain', 'john.doe@example.com');
    
    // Verify uploaded files
    cy.get('[data-testid="resume-file"]').should('be.visible');
    cy.get('[data-testid="aadhaar-file"]').should('be.visible');
    
    // Step 22: Logout
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

  it('should handle file upload errors', () => {
    cy.visit('/register');
    
    // Fill basic form
    cy.get('[data-testid="name-input"]').type('John Doe');
    cy.get('[data-testid="email-input"]').type('john.doe@example.com');
    cy.get('[data-testid="password-input"]').type('Password123!');
    cy.get('[data-testid="confirm-password-input"]').type('Password123!');
    
    // Try to upload invalid file type
    cy.fixture('invalid-file.txt').then((fileContent) => {
      cy.get('[data-testid="resume-input"]').attachFile({
        fileContent: fileContent.toString(),
        fileName: 'invalid-file.txt',
        mimeType: 'text/plain'
      });
    });
    
    // Verify file type error
    cy.get('[data-testid="file-type-error"]').should('be.visible');
    cy.get('[data-testid="file-type-error"]').should('contain', 'Invalid file type');
    
    // Try to upload oversized file
    cy.fixture('large-file.pdf').then((fileContent) => {
      cy.get('[data-testid="resume-input"]').attachFile({
        fileContent: fileContent.toString(),
        fileName: 'large-file.pdf',
        mimeType: 'application/pdf'
      });
    });
    
    // Verify file size error
    cy.get('[data-testid="file-size-error"]').should('be.visible');
    cy.get('[data-testid="file-size-error"]').should('contain', 'File size exceeds limit');
  });

  it('should handle payment failures', () => {
    // Mock payment failure
    cy.intercept('POST', '/api/v1/payments/create-order', {
      statusCode: 500,
      body: { message: 'Payment service unavailable' }
    }).as('createPaymentOrderFailure');
    
    // Login and navigate to payments
    cy.login('john.doe@example.com', 'Password123!');
    cy.visit('/payments');
    
    // Try to make payment
    cy.get('[data-testid="pay-button"]').click();
    
    // Wait for payment failure
    cy.wait('@createPaymentOrderFailure');
    
    // Verify error handling
    cy.get('[data-testid="payment-error"]').should('be.visible');
    cy.get('[data-testid="payment-error"]').should('contain', 'Payment service unavailable');
    cy.get('[data-testid="retry-button"]').should('be.visible');
  });

  it('should handle chat connection errors', () => {
    // Mock chat connection error
    cy.intercept('GET', '/api/v1/chats', {
      statusCode: 500,
      body: { message: 'Chat service unavailable' }
    }).as('chatError');
    
    // Login and navigate to chat
    cy.login('john.doe@example.com', 'Password123!');
    cy.visit('/chat');
    
    // Wait for chat error
    cy.wait('@chatError');
    
    // Verify error handling
    cy.get('[data-testid="chat-error"]').should('be.visible');
    cy.get('[data-testid="chat-error"]').should('contain', 'Chat service unavailable');
    cy.get('[data-testid="retry-button"]').should('be.visible');
  });

  it('should handle network timeouts', () => {
    // Mock slow API responses
    cy.intercept('POST', '/api/v1/auth/login', {
      delay: 10000,
      fixture: 'login-success.json'
    }).as('slowLogin');
    
    cy.visit('/login');
    
    // Fill login form
    cy.get('[data-testid="email-input"]').type('john.doe@example.com');
    cy.get('[data-testid="password-input"]').type('Password123!');
    cy.get('[data-testid="login-button"]').click();
    
    // Verify loading state
    cy.get('[data-testid="login-button"]').should('be.disabled');
    cy.get('[data-testid="loading-spinner"]').should('be.visible');
    cy.get('[data-testid="loading-text"]').should('contain', 'Logging in...');
  });

  it('should handle concurrent operations', () => {
    // Login
    cy.login('john.doe@example.com', 'Password123!');
    
    // Navigate to chat and payments simultaneously
    cy.visit('/chat');
    cy.visit('/payments');
    
    // Verify both pages work correctly
    cy.get('[data-testid="payments-page"]').should('be.visible');
    cy.get('[data-testid="payment-form"]').should('be.visible');
    
    // Navigate back to chat
    cy.visit('/chat');
    cy.get('[data-testid="chat-page"]').should('be.visible');
  });

  it('should handle browser refresh and session persistence', () => {
    // Complete registration and login
    cy.register('John Doe', 'john.doe@example.com', 'Password123!');
    cy.login('john.doe@example.com', 'Password123!');
    
    // Navigate to dashboard
    cy.visit('/dashboard');
    cy.get('[data-testid="user-dashboard"]').should('be.visible');
    
    // Refresh page
    cy.reload();
    
    // Verify user is still logged in
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="user-dashboard"]').should('be.visible');
    cy.get('[data-testid="user-name"]').should('contain', 'John Doe');
  });

  it('should handle mobile responsive design', () => {
    // Set mobile viewport
    cy.viewport(375, 667);
    
    // Test registration on mobile
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
    
    // Complete mobile registration
    cy.get('[data-testid="name-input"]').type('John Doe');
    cy.get('[data-testid="email-input"]').type('john.doe@example.com');
    cy.get('[data-testid="password-input"]').type('Password123!');
    cy.get('[data-testid="confirm-password-input"]').type('Password123!');
    cy.get('[data-testid="terms-checkbox"]').check();
    cy.get('[data-testid="register-button"]').click();
    
    // Verify mobile success state
    cy.get('[data-testid="registration-success"]').should('be.visible');
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
      delay: 2000,
      fixture: 'login-success.json'
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
    cy.wait('@getChats');
    
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
