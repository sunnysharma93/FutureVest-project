# Contributing to FutureVest

Thank you for your interest in contributing to FutureVest! This document provides guidelines and information for contributors to help ensure a smooth and effective collaboration process.

## 🤝 How to Contribute

### Ways to Contribute

1. **Code Contributions**: Bug fixes, new features, performance improvements
2. **Documentation**: Improving docs, tutorials, and guides
3. **Testing**: Writing tests, improving test coverage
4. **Design**: UI/UX improvements, design system contributions
5. **Bug Reports**: Reporting and helping fix issues
6. **Feature Requests**: Suggesting and discussing new features
7. **Community**: Helping others, answering questions, sharing knowledge

### Getting Started

1. **Fork the Repository**
   ```bash
   # Fork the repository on GitHub
   # Clone your fork locally
   git clone https://github.com/YOUR_USERNAME/futurevest.git
   cd futurevest
   ```

2. **Set Up Development Environment**
   ```bash
   # Install dependencies
   # Backend
   cd backend
   mvn clean install
   
   # Frontend
   cd ../frontend
   npm install
   
   # Start development services
   docker compose up -d mysql redis
   ```

3. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

## 📝 Development Guidelines

### Code Standards

#### Backend (Java/Spring Boot)

1. **Code Style**
   - Follow Google Java Style Guide
   - Use 4-space indentation (no tabs)
   - Maximum line length: 120 characters
   - Use meaningful variable and method names

2. **Code Structure**
   ```java
   // Package structure follows hexagonal architecture
   package com.futurevest.domain;        // Entities, value objects
   package com.futurevest.application;   // Use cases, ports
   package com.futurevest.infrastructure; // External integrations
   package com.futurevest.presentation;  // Controllers, web layer
   ```

3. **Best Practices**
   - Use dependency injection
   - Write unit tests for all new code
   - Use meaningful comments for complex logic
   - Handle exceptions appropriately
   - Follow SOLID principles

4. **Example Code**
   ```java
   @Service
   @RequiredArgsConstructor
   public class UserService {
       private final UserRepository userRepository;
       private final PasswordEncoder passwordEncoder;
       
       @Transactional
       public User createUser(UserRequest request) {
           validateUserRequest(request);
           
           User user = User.builder()
               .email(request.getEmail())
               .password(passwordEncoder.encode(request.getPassword()))
               .name(request.getName())
               .build();
               
           return userRepository.save(user);
       }
       
       private void validateUserRequest(UserRequest request) {
           if (userRepository.existsByEmail(request.getEmail())) {
               throw new DuplicateEmailException(request.getEmail());
           }
       }
   }
   ```

#### Frontend (React/TypeScript)

1. **Code Style**
   - Use ESLint + Prettier configuration
   - 2-space indentation
   - Maximum line length: 100 characters
   - Use TypeScript for all new code

2. **Component Structure**
   ```typescript
   // Functional components with hooks
   // Use TypeScript interfaces for props
   // Follow React best practices
   // Use Material-UI components
   ```

3. **Best Practices**
   - Use functional components with hooks
   - Implement proper error boundaries
   - Use Redux Toolkit for state management
   - Write tests for components
   - Follow accessibility guidelines

4. **Example Component**
   ```typescript
   interface UserCardProps {
     user: User;
     onEdit: (user: User) => void;
     onDelete: (userId: string) => void;
   }
   
   const UserCard: React.FC<UserCardProps> = ({ user, onEdit, onDelete }) => {
     const [isLoading, setIsLoading] = useState(false);
     
     const handleDelete = useCallback(async () => {
       setIsLoading(true);
       try {
         await deleteUser(user.id);
         onDelete(user.id);
       } catch (error) {
         console.error('Failed to delete user:', error);
       } finally {
         setIsLoading(false);
       }
     }, [user.id, onDelete]);
     
     return (
       <Card>
         <CardContent>
           <Typography variant="h6">{user.name}</Typography>
           <Typography variant="body2">{user.email}</Typography>
           <Box mt={2}>
             <Button onClick={() => onEdit(user)}>Edit</Button>
             <Button 
               onClick={handleDelete}
               disabled={isLoading}
               color="error"
             >
               Delete
             </Button>
           </Box>
         </CardContent>
       </Card>
     );
   };
   
   export default UserCard;
   ```

### Testing Guidelines

#### Backend Testing

1. **Unit Tests**
   - Use JUnit 5 and Mockito
   - Test all public methods
   - Mock external dependencies
   - Aim for 80%+ code coverage

2. **Integration Tests**
   - Use @SpringBootTest
   - Test with real database (TestContainers)
   - Test API endpoints
   - Test database operations

3. **Example Test**
   ```java
   @ExtendWith(MockitoExtension.class)
   class UserServiceTest {
       
       @Mock
       private UserRepository userRepository;
       
       @Mock
       private PasswordEncoder passwordEncoder;
       
       @InjectMocks
       private UserService userService;
       
       @Test
       void shouldCreateUserSuccessfully() {
           // Given
           UserRequest request = UserRequest.builder()
               .email("test@example.com")
               .password("password123")
               .name("Test User")
               .build();
               
           User savedUser = User.builder()
               .id("123")
               .email(request.getEmail())
               .name(request.getName())
               .build();
               
           when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
           when(passwordEncoder.encode(request.getPassword())).thenReturn("encoded");
           when(userRepository.save(any(User.class))).thenReturn(savedUser);
           
           // When
           User result = userService.createUser(request);
           
           // Then
           assertThat(result.getEmail()).isEqualTo(request.getEmail());
           assertThat(result.getName()).isEqualTo(request.getName());
           verify(userRepository).save(any(User.class));
       }
   }
   ```

#### Frontend Testing

1. **Unit Tests**
   - Use Vitest + React Testing Library
   - Test component behavior
   - Mock API calls
   - Test user interactions

2. **Integration Tests**
   - Test component integration
   - Test Redux store interactions
   - Test API integration

3. **Example Test**
   ```typescript
   import { render, screen, fireEvent, waitFor } from '@testing-library/react';
   import { Provider } from 'react-redux';
   import { configureStore } from '@reduxjs/toolkit';
   import UserCard from './UserCard';
   import { userSlice } from '../store/slices/userSlice';
   
   const createMockStore = (initialState = {}) => {
     return configureStore({
       reducer: {
         users: userSlice.reducer,
       },
       preloadedState: initialState,
     });
   };
   
   describe('UserCard', () => {
     const mockUser = {
       id: '1',
       name: 'John Doe',
       email: 'john@example.com',
     };
     
     const mockOnEdit = jest.fn();
     const mockOnDelete = jest.fn();
     
     it('should render user information correctly', () => {
       const store = createMockStore();
       
       render(
         <Provider store={store}>
           <UserCard 
             user={mockUser} 
             onEdit={mockOnEdit} 
             onDelete={mockOnDelete} 
           />
         </Provider>
       );
       
       expect(screen.getByText('John Doe')).toBeInTheDocument();
       expect(screen.getByText('john@example.com')).toBeInTheDocument();
     });
     
     it('should call onEdit when Edit button is clicked', () => {
       const store = createMockStore();
       
       render(
         <Provider store={store}>
           <UserCard 
             user={mockUser} 
             onEdit={mockOnEdit} 
             onDelete={mockOnDelete} 
           />
         </Provider>
       );
       
       fireEvent.click(screen.getByText('Edit'));
       expect(mockOnEdit).toHaveBeenCalledWith(mockUser);
     });
   });
   ```

## 🐛 Bug Reports

### Reporting Bugs

1. **Search Existing Issues**
   - Check if the bug is already reported
   - Add information to existing issues if relevant

2. **Create New Issue**
   - Use appropriate bug report template
   - Provide clear, descriptive title
   - Include all required information

3. **Bug Report Template**
   ```markdown
   ## Bug Description
   Brief description of the bug
   
   ## Steps to Reproduce
   1. Go to '...'
   2. Click on '....'
   3. Scroll down to '....'
   4. See error
   
   ## Expected Behavior
   Clear description of what should happen
   
   ## Actual Behavior
   Clear description of what actually happens
   
   ## Screenshots
   Add screenshots to help explain the problem
   
   ## Environment
   - OS: [e.g. iOS, Android, Windows, macOS]
   - Browser: [e.g. Chrome, Safari, Firefox]
   - Version: [e.g. 22]
   
   ## Additional Context
   Add any other context about the problem
   ```

### Fixing Bugs

1. **Claim the Issue**
   - Comment that you're working on it
   - Assign the issue to yourself
   - Provide estimated timeline

2. **Create Branch**
   ```bash
   git checkout -b fix/issue-number-description
   ```

3. **Implement Fix**
   - Write code to fix the issue
   - Add tests to prevent regression
   - Update documentation if needed

4. **Submit Pull Request**
   - Reference the issue number
   - Describe the fix
   - Include test results

## ✨ Feature Requests

### Requesting Features

1. **Check Roadmap**
   - Review existing roadmap
   - Check if feature is already planned

2. **Create Feature Request**
   - Use feature request template
   - Provide clear use case
   - Explain benefits

3. **Feature Request Template**
   ```markdown
   ## Feature Description
   Clear description of the feature
   
   ## Problem Statement
   What problem does this feature solve?
   
   ## Proposed Solution
   How should this feature work?
   
   ## Alternatives Considered
   What other approaches did you consider?
   
   ## Additional Context
   Add any other context about the feature
   ```

### Implementing Features

1. **Discuss First**
   - Create issue for discussion
   - Get feedback from maintainers
   - Ensure alignment with roadmap

2. **Design Phase**
   - Create design document
   - Consider edge cases
   - Plan testing approach

3. **Implementation**
   - Follow coding standards
   - Write comprehensive tests
   - Update documentation

## 📖 Documentation

### Improving Documentation

1. **Identify Areas for Improvement**
   - Outdated information
   - Missing explanations
   - Unclear instructions
   - Broken links

2. **Documentation Types**
   - API documentation
   - User guides
   - Developer guides
   - Architecture documentation
   - Deployment guides

3. **Documentation Standards**
   - Use clear, concise language
   - Include code examples
   - Add screenshots where helpful
   - Keep documentation up to date

### Writing Documentation

1. **Structure**
   - Use clear headings
   - Include table of contents
   - Provide examples
   - Add troubleshooting sections

2. **Code Examples**
   ```java
   // Example: Creating a new user
   UserRequest request = UserRequest.builder()
       .email("user@example.com")
       .password("securePassword")
       .name("User Name")
       .build();
   
   User user = userService.createUser(request);
   ```

3. **Screenshots**
   - Use clear, high-quality screenshots
   - Add annotations if needed
   - Keep images up to date

## 🔄 Pull Request Process

### Preparing Pull Requests

1. **Create Pull Request**
   - Use descriptive title
   - Reference related issues
   - Fill out PR template

2. **PR Template**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Testing
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed
   - [ ] Added tests for new functionality
   
   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] No breaking changes without version bump
   ```

3. **Code Review Requirements**
   - At least one approval from maintainer
   - All automated checks pass
   - No merge conflicts
   - Documentation updated

### Review Process

1. **Self-Review**
   - Review your own code
   - Check for obvious issues
   - Ensure tests are comprehensive

2. **Peer Review**
   - Request review from team members
   - Address feedback promptly
   - Be open to suggestions

3. **Maintainer Review**
   - Final approval from maintainer
   - Check for architectural alignment
   - Verify quality standards

### Merging

1. **Merge Requirements**
   - All approvals received
   - CI/CD checks pass
   - No merge conflicts
   - Documentation updated

2. **Merge Strategy**
   - Use squash merge for feature branches
   - Keep commit history clean
   - Delete feature branch after merge

## 🏷️ Commit Guidelines

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes
- `build`: Build system changes

### Examples

```bash
feat(auth): add two-factor authentication

Add support for TOTP-based two-factor authentication
to improve account security.

Closes #123

fix(api): handle null response in user service

Prevents NullPointerException when API returns null
response for user lookup.

Closes #456

docs(readme): update installation instructions

Add Docker Compose setup instructions and update
prerequisites section.
```

## 🌐 Internationalization

### Adding New Languages

1. **Create Translation File**
   ```json
   // frontend/src/i18n/locales/es.json
   {
     "common": {
       "save": "Guardar",
       "cancel": "Cancelar"
     },
     "auth": {
       "login": "Iniciar sesión",
       "register": "Registrarse"
     }
   }
   ```

2. **Update Configuration**
   ```typescript
   // frontend/src/i18n/index.ts
   import es from './locales/es.json';
   
   const resources = {
     en: { translation: en },
     es: { translation: es },
     // Add new language
   };
   ```

3. **Test Translation**
   - Verify all text is translated
   - Check for missing keys
   - Test language switching

### Translation Guidelines

- Use consistent terminology
- Keep translations concise
- Consider cultural differences
- Test with native speakers

## 🔒 Security

### Security Guidelines

1. **Never Commit Secrets**
   - API keys, passwords, tokens
   - Use environment variables
   - Use secret management

2. **Report Security Issues**
   - Use private channels
   - Email security@futurevest.com
   - Don't create public issues

3. **Security Best Practices**
   - Validate all inputs
   - Use parameterized queries
   - Implement proper authentication
   - Follow OWASP guidelines

### Security Review Process

1. **Code Review**
   - Check for security vulnerabilities
   - Review data handling
   - Verify authentication logic

2. **Automated Scanning**
   - Dependency vulnerability scans
   - Static code analysis
   - Container security scans

## 📱 Mobile Development

### React Native Guidelines

1. **Code Structure**
   - Follow React Native best practices
   - Use TypeScript
   - Organize by feature

2. **Performance**
   - Optimize images
   - Use lazy loading
   - Monitor memory usage

3. **Testing**
   - Unit tests for logic
   - Integration tests for components
   - E2E tests for critical flows

## 🚀 Deployment

### Deployment Guidelines

1. **Environment Setup**
   - Use environment-specific configs
   - Never hardcode secrets
   - Use proper versioning

2. **Database Changes**
   - Use migration scripts
   - Test migrations thoroughly
   - Backup before deployment

3. **Monitoring**
   - Add health checks
   - Monitor key metrics
   - Set up alerts

## 🏆 Recognition

### Contributor Recognition

1. **Contributors List**
   - Added to README contributors
   - Featured in release notes
   - Highlighted in communications

2. **Recognition Program**
   - Top contributors spotlight
   - Contributor of the month
   - Special badges and rewards

### Getting Help

1. **Community Channels**
   - GitHub Discussions
   - Discord community
   - Stack Overflow tags

2. **Direct Support**
   - Email maintainers
   - Schedule office hours
   - Pair programming sessions

## 📋 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors.

### Expected Behavior

- Be respectful and considerate
- Use welcoming and inclusive language
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, discrimination, or bullying
- Sharing private information
- Publishing private communications
- Creating disruptive behavior

### Reporting Issues

Report violations to conduct@futurevest.com

---

## 🎉 Thank You!

Thank you for contributing to FutureVest! Your contributions help make education financing more accessible and fair for everyone.

If you have any questions or need help getting started, please don't hesitate to reach out to our community.

**Happy Contributing! 🚀**
