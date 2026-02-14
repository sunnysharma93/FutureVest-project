# FutureVest Frontend

A modern React TypeScript application for the FutureVest education funding platform, built with Material-UI, Redux Toolkit, and comprehensive state management.

## 🚀 Features

### **Core Functionality**
- **Authentication**: User and investor registration/login with JWT tokens
- **Course Management**: Browse, request, and manage educational courses
- **Job Portal**: Search and apply for job opportunities
- **Real-time Chat**: WebSocket-based messaging between users and investors
- **Payment Integration**: Razorpay payment processing for course funding
- **Responsive Design**: Mobile-first approach with Material-UI components

### **Technical Features**
- **TypeScript**: Full type safety throughout the application
- **Redux Toolkit**: Efficient state management with slices
- **React Router**: Client-side routing with protected routes
- **Material-UI**: Beautiful, accessible UI components
- **Theme System**: Dark/light mode support
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Loading States**: Optimistic UI with loading spinners
- **Toast Notifications**: User-friendly feedback system

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── layout/         # Layout components (Header, Footer, etc.)
│   ├── ui/             # Basic UI components (LoadingSpinner, etc.)
│   └── auth/           # Authentication components
├── hooks/              # Custom React hooks
│   ├── useAuth.ts      # Authentication logic
│   ├── useApi.ts       # Generic API calls
│   └── useTheme.ts     # Theme management
├── pages/              # Page components
│   ├── auth/           # Authentication pages
│   ├── DashboardPage.tsx
│   ├── ProfilePage.tsx
│   └── ...
├── services/           # API services
│   └── api.ts          # Axios configuration
├── store/              # Redux store
│   ├── index.ts        # Store configuration
│   └── slices/         # Redux slices
├── types/              # TypeScript type definitions
│   └── index.ts        # All application types
└── utils/              # Utility functions
```

## 🛠️ Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Material-UI (MUI)** - UI component library
- **Redux Toolkit** - State management
- **React Router** - Routing
- **Axios** - HTTP client
- **Socket.IO** - WebSocket client
- **React Toastify** - Notifications
- **Vite** - Build tool

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd futurevest/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Configure your environment variables in `.env`:
   ```env
   VITE_API_BASE=http://localhost:8080/api/v1
   VITE_WS_BASE=ws://localhost:8080/ws
   VITE_RAZORPAY_KEY=your_razorpay_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE` | Backend API base URL | `http://localhost:8080/api/v1` |
| `VITE_WS_BASE` | WebSocket base URL | `ws://localhost:8080/ws` |
| `VITE_RAZORPAY_KEY` | Razorpay API key | - |
| `VITE_APP_NAME` | Application name | `FutureVest` |
| `VITE_ENABLE_CHAT` | Enable chat functionality | `true` |

### Theme Configuration

The application supports both light and dark themes with customizable color schemes. Theme preferences are automatically saved to localStorage.

## 📊 State Management

### Redux Slices

- **authSlice**: User authentication state, JWT tokens
- **usersSlice**: User management and profiles
- **coursesSlice**: Course data and filtering
- **chatsSlice**: Real-time chat messages and typing indicators
- **paymentsSlice**: Payment processing and Razorpay integration

### Custom Hooks

- **useAuth**: Authentication operations (login, register, logout)
- **useApi**: Generic API calls with loading/error states
- **useTheme**: Theme management and switching

## 🔐 Authentication

The application uses JWT-based authentication with automatic token refresh:

1. **Login/Register**: Credentials sent to backend
2. **Token Storage**: JWT stored in localStorage
3. **Automatic Refresh**: Tokens refreshed on 401 responses
4. **Protected Routes**: Authentication required for main app features

## 💬 Real-time Features

### Chat System

- **WebSocket Connection**: Real-time messaging
- **Typing Indicators**: Show when users are typing
- **Message History**: Paginated message loading
- **Unread Counts**: Track unread messages per chat

### Implementation

```typescript
// WebSocket connection handled by Socket.IO client
// Messages dispatched to Redux store for state management
// UI updates automatically through Redux subscriptions
```

## 🎨 UI Components

### Material-UI Integration

- **Theme System**: Consistent design language
- **Responsive Layout**: Mobile-first design
- **Accessibility**: WCAG compliant components
- **Custom Components**: Extended MUI components

### Loading States

- **Global Loading**: Full-screen overlay for major operations
- **Component Loading**: Inline spinners for specific actions
- **Optimistic UI**: Immediate feedback for user actions

## 🚨 Error Handling

### Error Boundaries

- **Global Error Boundary**: Catches all React errors
- **Route-Level Boundaries**: Isolated error handling per route
- **Development Mode**: Detailed error information in development

### API Error Handling

- **Automatic Retry**: Retry failed requests
- **User Feedback**: Clear error messages via toast notifications
- **Graceful Degradation**: Fallback UI for failed operations

## 📱 Responsive Design

### Breakpoints

- **Mobile**: < 600px
- **Tablet**: 600px - 960px  
- **Desktop**: > 960px

### Adaptive UI

- **Navigation**: Collapsible menu on mobile
- **Layout**: Responsive grid system
- **Touch Support**: Mobile-optimized interactions

## 🧪 Testing

### Running Tests

```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### Test Structure

- **Unit Tests**: Component logic and hooks
- **Integration Tests**: API integration
- **E2E Tests**: User journey testing

## 🚀 Deployment

### Production Build

```bash
# Build optimized production bundle
npm run build

# Preview production build
npm run preview
```

### Docker Deployment

```bash
# Build Docker image
docker build -t futurevest-frontend .

# Run container
docker run -p 3000:3000 futurevest-frontend
```

## 🔄 CI/CD Pipeline

### GitHub Actions

- **Automated Testing**: Run tests on every push
- **Build Verification**: Ensure production build succeeds
- **Deployment**: Auto-deploy to staging/production

## 📈 Performance Optimization

### Code Splitting

- **Route-based**: Lazy loading per route
- **Component-based**: Dynamic imports for heavy components
- **Vendor Splitting**: Separate vendor bundles

### Optimization Techniques

- **Memoization**: React.memo and useMemo
- **Virtualization**: For large lists
- **Image Optimization**: Lazy loading and compression

## 🛡️ Security

### Best Practices

- **JWT Security**: Secure token storage and transmission
- **XSS Prevention**: Input sanitization
- **CSRF Protection**: Token-based CSRF protection
- **Content Security Policy**: CSP headers configured

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- 📧 Email: support@futurevest.com
- 📱 Discord: [Join our community](https://discord.gg/futurevest)
- 📖 Documentation: [docs.futurevest.com](https://docs.futurevest.com)

---

Built with ❤️ by the FutureVest Team
