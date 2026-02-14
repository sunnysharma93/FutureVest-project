describe('Course Requests E2E Tests', () => {
  beforeEach(() => {
    cy.login('student@example.com', 'password123');
    cy.visit('/courses/request');
  });

  it('should display course request form', () => {
    cy.get('[data-testid="course-request-form"]').should('be.visible');
    cy.contains('h1', 'Request a Course');
    cy.get('label').contains('Course Title').should('be.visible');
    cy.get('label').contains('Course Description').should('be.visible');
    cy.get('label').contains('Course Provider').should('be.visible');
    cy.get('label').contains('Category').should('be.visible');
  });

  it('should validate required fields', () => {
    // Try to proceed without filling required fields
    cy.get('button').contains('Next').click();
    
    // Check for validation errors
    cy.contains('Name must be at least 5 characters');
    cy.contains('Email should be valid');
    cy.contains('Category is required');
  });

  it('should fill form and submit course request', () => {
    // Step 1: Basic Information
    cy.get('input[name="title"]').type('Complete Web Development Bootcamp 2024');
    cy.get('textarea[name="description"]').type(
      'Learn HTML, CSS, JavaScript, React, Node.js and more in this comprehensive web development course.'
    );
    cy.get('select#provider-label').click();
    cy.get('[data-value="UDEMY"]').click();
    cy.get('select#category-label').click();
    cy.get('[data-value="Web Development"]').click();
    
    cy.get('button').contains('Next').click();
    
    // Wait for step 2
    cy.contains('Additional Information');
    
    // Step 2: Additional Information
    cy.get('input[name="durationInHours"]').type('40');
    cy.get('input[name="externalCourseId"]').type('udemy-123');
    cy.get('textarea[name="justification"]').type(
      'This course will help me transition into a web development career.'
    );
    
    cy.get('button').contains('Next').click();
    
    // Step 3: Review & Submit
    cy.contains('Review Your Course Request');
    cy.contains('Complete Web Development Bootcamp 2024');
    cy.contains('UDEMY');
    cy.contains('Web Development');
    cy.contains('40 hours');
    
    cy.get('button[type="submit"]').contains('Submit Request').click();
    
    // Wait for success
    cy.contains('Course Request Submitted!', { timeout: 10000 });
    cy.contains('Your course request has been submitted successfully');
  });

  it('should handle file upload for documents', () => {
    // Navigate to documents step
    cy.get('input[name="title"]').type('Test Course');
    cy.get('textarea[name="description"]').type('Test Description');
    cy.get('select#provider-label').click();
    cy.get('[data-value="UDEMY"]').click();
    cy.get('select#category-label').click();
    cy.get('[data-value="Web Development"]').click();
    
    cy.get('button').contains('Next').click();
    cy.get('input[name="password"]').type('StrongPass123!');
    
    cy.get('button').contains('Next').click();
    
    // Check document upload areas
    cy.contains('Resume (Optional)');
    cy.contains('Aadhaar Card (Optional)');
    cy.get('[data-testid="resume-upload"]').should('be.visible');
    cy.get('[data-testid="aadhaar-upload"]').should('be.visible');
  });

  it('should validate file upload', () => {
    // Try to upload oversized file
    cy.fixture('large-file.pdf', 'base64').then(fileContent => {
      cy.get('[data-testid="resume-upload"]').selectFile({
        contents: fileContent,
        fileName: 'large-file.pdf',
        mimeType: 'application/pdf',
      });
    });
    
    // Should show error alert
    cy.on('window:alert', (text) => {
      expect(text).to.include('File size must be less than 10MB');
    });
    
    // Try to upload invalid file type
    cy.get('[data-testid="resume-upload"]').selectFile({
      fileName: 'invalid.txt',
      mimeType: 'text/plain',
    });
    
    cy.on('window:alert', (text) => {
      expect(text).to.include('Invalid file type');
    });
  });

  it('should proceed to payment after successful request', () => {
      // Complete the form submission
      cy.get('input[name="title"]').type('Test Course for Payment');
      cy.get('textarea[name="description"]').type('Test Description');
      cy.get('select#provider-label').click();
      cy.get('[data-value="UDEMY"]').click();
      cy.get('select#category-label').click();
      cy.get('[data-value="Web Development"]').click();
      
      cy.get('button').contains('Next').click();
      cy.get('input[name="password"]').type('StrongPass123!');
      
      cy.get('button').contains('Next').click();
      cy.get('button[type="submit"]').contains('Submit Request').click();
      
      // Wait for success and payment button
      cy.contains('Course Request Submitted!', { timeout: 10000 });
      cy.get('button').contains('Proceed to Payment').should('be.visible');
      
      // Click payment button
      cy.get('button').contains('Proceed to Payment').click();
      
      // Should redirect to payment page
      cy.url().should('include', '/payment/create');
      cy.url().should('include', 'courseId=');
  });

  it('should show loading states during submission', () => {
    cy.get('input[name="title"]').type('Loading Test Course');
    cy.get('textarea[name="description"]').type('Loading test description');
    cy.get('select#provider-label').click();
    cy.get('[data-value="UDEMY"]').click();
    cy.get('select#category-label').click();
    cy.get('[data-value="Web Development"]').click();
    
    cy.get('button').contains('Next').click();
    cy.get('input[name="password"]').type('StrongPass123!');
    
    cy.get('button').contains('Next').click();
    cy.get('button[type="submit"]').contains('Submit Request').click();
    
    // Check loading state
    cy.get('[data-testid="loading-spinner"]').should('be.visible');
    cy.contains('Submitting Request...');
  });

  it('should be accessible via keyboard navigation', () => {
    // Test keyboard navigation
    cy.get('input[name="title"]').focus();
    cy.focused().should('have.attr', 'aria-label', 'Course title');
    
    cy.tab().should('have.focus', 'input[name="description"]');
    cy.focused().should('have.attr', 'aria-label', 'Course description');
    
    cy.tab().should('have.focus', 'select#provider-label');
    cy.focused().should('have.attr', 'aria-label', 'Course provider');
    
    // Test form submission with keyboard
    cy.get('button[type="submit"]').focus();
    cy.focused().type('{enter}');
    
    // Should trigger form validation or submission
    cy.get('.Mui-error').should('be.visible');
  });

  it('should handle API errors gracefully', () => {
      // Mock API error
      cy.intercept('POST', '/api/v1/courses/request', {
        statusCode: 500,
        body: { error: 'Internal server error' },
      }).as('courseRequestError');
      
      // Fill and submit form
      cy.get('input[name="title"]').type('Error Test Course');
      cy.get('textarea[name="description"]').type('Error test description');
      cy.get('select#provider-label').click();
      cy.get('[data-value="UDEMY"]').click();
      cy.get('select#category-label').click();
      cy.get('[data-value="Web Development"]').click();
      
      cy.get('button').contains('Next').click();
      cy.get('input[name="password"]').type('StrongPass123!');
      
      cy.get('button').contains('Next').click();
      cy.get('button[type="submit"]').contains('Submit Request').click();
      
      // Should show error message
      cy.contains('Failed to submit course request');
  });

  context('Mobile Responsiveness', () => {
    beforeEach(() => {
      cy.viewport('iphone-x');
    });

    it('should be mobile-friendly', () => {
      // Check mobile layout
      cy.get('[data-testid="course-request-form"]').should('be.visible');
      
      // Stepper should be responsive
      cy.get('.MuiStepper-root').should('be.visible');
      
      // Form fields should be full width on mobile
      cy.get('input[name="title"]').should('have.css', 'width', '100%');
      cy.get('textarea[name="description"]').should('have.css', 'width', '100%');
      
      // Buttons should be stacked on mobile
      cy.get('.MuiButton-root').should('have.css', 'margin-bottom', '8px');
    });
  });

  context('Desktop Responsiveness', () => {
    beforeEach(() => {
      cy.viewport(1280, 720);
    });

    it('should utilize desktop layout effectively', () => {
      // Check desktop layout
      cy.get('[data-testid="course-request-form"]').should('be.visible');
      
      // Stepper should be horizontal
      cy.get('.MuiStepper-root').should('have.css', 'flex-direction', 'row');
      
      // Form fields should be in grid layout
      cy.get('.MuiGrid-root').should('be.visible');
      
      // Buttons should be side by side on desktop
      cy.get('.MuiButton-root').should('have.css', 'margin-bottom', '0px');
    });
  });
});
