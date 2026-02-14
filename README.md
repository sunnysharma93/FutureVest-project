# FutureVest 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/futurevest/futurevest/workflows/CI/badge.svg)](https://github.com/futurevest/futurevest/actions)
[![Coverage](https://codecov.io/gh/futurevest/futurevest/branch/main/graph/badge.svg)](https://codecov.io/gh/futurevest/futurevest)
[![Security Rating](https://sonarcloud.io/api/project_badges?measure=security_rating&project=futurevest_futurevest)](https://sonarcloud.io/dashboard?id=futurevest_futurevest)

FutureVest is a comprehensive financial technology platform that enables students to fund their education through income share agreements (ISAs) and connects them with job opportunities. Built with enterprise-grade architecture and security best practices.

## 🌟 Key Features

- **Student Investment Platform**: Students can receive funding for education in exchange for a percentage of future income
- **Job Matching**: AI-powered job recommendations based on student profiles and skills
- **Income Share Agreements**: Flexible repayment terms tied to income levels
- **Real-time Chat**: Integrated messaging between students, investors, and employers
- **Multi-language Support**: Internationalized interface supporting multiple languages
- **Advanced Analytics**: Comprehensive dashboards for investors, students, and administrators
- **Push Notifications**: Real-time updates via Firebase Cloud Messaging
- **Admin Dashboard**: Complete management system for users, jobs, and repayments
- **Mobile Responsive**: Progressive Web App (PWA) with offline capabilities

## 🏗️ Technology Stack

### Backend
- **Framework**: Spring Boot 3.2 with Java 21
- **Architecture**: Hexagonal/Clean Architecture
- **Database**: MySQL 8.0 with JPA/Hibernate
- **Cache**: Redis 7 for session and data caching
- **Security**: Spring Security with JWT authentication
- **WebSocket**: Real-time communication with STOMP
- **File Storage**: AWS S3 integration
- **Payments**: Razorpay integration
- **Scheduling**: Quartz for background jobs
- **Resilience**: Resilience4j for circuit breakers and retries
- **Monitoring**: Spring Actuator with Prometheus metrics

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and building
- **State Management**: Redux Toolkit with RTK Query
- **UI Library**: Material-UI (MUI) v5
- **Real-time**: Socket.io client for WebSocket connections
- **Charts**: Chart.js for data visualization
- **Internationalization**: react-i18next
- **Testing**: Vitest + React Testing Library
- **PWA**: Service worker for offline functionality

### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose for local development
- **CI/CD**: GitHub Actions with automated testing
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Reverse Proxy**: Nginx with SSL termination

## 📁 Project Structure

```
FutureVest/
├── backend/                    # Spring Boot backend
│   ├── src/main/java/com/futurevest/
│   │   ├── domain/             # Entities and value objects
│   │   ├── application/        # Use cases and application services
│   │   ├── infrastructure/    # External integrations
│   │   └── presentation/       # REST controllers and web layer
│   ├── src/test/               # Comprehensive test suite
│   └── Dockerfile              # Production Docker image
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Route-level components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API and external services
│   │   ├── store/             # Redux store configuration
│   │   ├── utils/             # Utility functions
│   │   └── types/             # TypeScript type definitions
│   ├── public/                # Static assets
│   └── Dockerfile             # Production Docker image
├── database/                   # Database scripts and migrations
├── docs/                      # Documentation
├── k8s/                       # Kubernetes manifests
├── .github/                   # GitHub workflows and templates
├── docker-compose.yml         # Development environment
├── docker-compose.prod.yml    # Production environment
└── README.md                  # This file
```

## 🚀 Quick Start

### Prerequisites

- **Java**: JDK 21 or later
- **Node.js**: Version 20 or later
- **Maven**: Version 3.9 or later
- **Docker**: Latest stable version
- **Docker Compose**: Version 2.0 or later

### Option 1: Full Stack with Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/futurevest/futurevest.git
cd futurevest

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# (Required: JWT_SECRET, AWS credentials, Razorpay keys, etc.)

# Start all services
docker compose up -d

# Wait for services to be ready (approximately 2-3 minutes)
docker compose logs -f

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080/api
# Admin Dashboard: http://localhost:3000/admin
# API Documentation: http://localhost:8080/swagger-ui.html
```

### Option 2: Local Development

1. **Start Infrastructure Services**
   ```bash
   docker compose up -d mysql redis
   ```

2. **Backend Setup**
   ```bash
   cd backend
   
   # Configure environment variables
   cp src/main/resources/application-dev.yml.example src/main/resources/application-dev.yml
   
   # Run the application
   mvn spring-boot:run -Dspring-boot.run.profiles=dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   
   # Install dependencies
   npm install
   
   # Start development server
   npm run dev
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Application
SPRING_PROFILES_ACTIVE=prod
JWT_SECRET=your-super-secret-jwt-key-min-256-bits
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Database
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_DATABASE=futurevest
MYSQL_USERNAME=futurevest
MYSQL_PASSWORD=your-mysql-password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=futurevest-uploads

# Razorpay
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# Firebase
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email

# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com

# Monitoring
GRAFANA_ADMIN_PASSWORD=your-grafana-password
```

## 📚 API Documentation

### Swagger/OpenAPI
- **Local**: http://localhost:8080/swagger-ui.html
- **Production**: https://api.yourdomain.com/swagger-ui.html

### Key Endpoints

#### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Token refresh
- `POST /api/v1/auth/logout` - User logout

#### Investments
- `GET /api/v1/investments` - List user investments
- `POST /api/v1/investments` - Create new investment
- `GET /api/v1/investments/{id}` - Get investment details
- `PUT /api/v1/investments/{id}` - Update investment

#### Jobs
- `GET /api/v1/jobs` - List available jobs
- `POST /api/v1/jobs` - Create job posting
- `POST /api/v1/jobs/{id}/apply` - Apply for job
- `GET /api/v1/jobs/{id}/applications` - List job applications

#### Payments
- `POST /api/v1/payments/create-order` - Create payment order
- `POST /api/v1/payments/verify` - Verify payment
- `GET /api/v1/payments/history` - Payment history

#### Admin (v2 API)
- `GET /api/v2/admin/users` - User management
- `GET /api/v2/admin/jobs` - Job management
- `GET /api/v2/admin/analytics` - Analytics dashboard
- `POST /api/v2/admin/notifications/send` - Send notifications

## 🧪 Testing

### Backend Tests
```bash
cd backend

# Run all tests
mvn test

# Run with coverage
mvn clean test jacoco:report

# Run integration tests
mvn test -P integration-tests

# Run specific test class
mvn test -Dtest=UserServiceTest
```

### Frontend Tests
```bash
cd frontend

# Run unit tests
npm run test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run linting
npm run lint

# Type checking
npm run type-check
```

### Test Coverage Targets
- **Backend**: Minimum 80% line coverage
- **Frontend**: Minimum 80% statement coverage
- **E2E**: Critical user paths 100% covered

## 🚀 Deployment

### Production Deployment with Docker

1. **Prepare Environment**
   ```bash
   # Copy production environment template
   cp .env.production.example .env.production
   
   # Update with production values
   nano .env.production
   ```

2. **Deploy**
   ```bash
   # Pull latest images
   docker compose -f docker-compose.prod.yml pull
   
   # Deploy with production configuration
   docker compose -f docker-compose.prod.yml up -d
   
   # Run database migrations
   docker compose -f docker-compose.prod.yml exec backend mvn flyway:migrate
   ```

### Kubernetes Deployment

```bash
# Apply namespace
kubectl apply -f k8s/namespace.yaml

# Deploy backend
kubectl apply -f k8s/backend-deployment.yaml

# Deploy frontend
kubectl apply -f k8s/frontend-deployment.yaml

# Deploy database
kubectl apply -f k8s/mysql-deployment.yaml

# Check deployment status
kubectl get pods -n futurevest
```

### CI/CD Pipeline

The project includes a comprehensive GitHub Actions workflow that:

- Runs automated tests on every push
- Builds Docker images
- Scans for security vulnerabilities
- Deploys to staging environment
- Promotes to production after manual approval

## 📊 Monitoring & Observability

### Health Checks
- **Backend**: `/api/actuator/health`
- **Frontend**: `/health` (service worker health)

### Metrics
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/grafana)

### Logs
- **ELK Stack**: 
  - Kibana: http://localhost:5601
  - Elasticsearch: http://localhost:9200

### Application Performance
- **APM**: Integrated with Spring Boot Actuator
- **Custom Metrics**: Business KPIs tracked in Prometheus
- **Error Tracking**: Centralized error logging and alerting

## 🔒 Security Features

- **Authentication**: JWT-based stateless authentication
- **Authorization**: Role-based access control (RBAC)
- **Encryption**: TLS 1.3 for all communications
- **Data Protection**: Sensitive data encrypted at rest
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: API rate limiting to prevent abuse
- **Audit Logging**: Complete audit trail for all actions
- **Security Headers**: OWASP recommended security headers
- **CORS**: Configurable cross-origin resource sharing

## 🌍 Internationalization

Supported Languages:
- English (en) - Default
- Spanish (es)
- French (fr)
- German (de)
- Hindi (hi)

Adding a new language:
1. Create translation file: `frontend/src/i18n/locales/{lang}.json`
2. Update `frontend/src/i18n/index.ts` to include new language
3. Run `npm run extract-translations` to update translation keys

## 📱 Mobile & PWA

### Progressive Web App Features
- **Offline Support**: Service worker caching
- **App-like Experience**: Fullscreen mode, splash screen
- **Push Notifications**: Real-time updates
- **Background Sync**: Data synchronization
- **Installable**: Add to home screen capability

### Mobile Optimization
- **Responsive Design**: Mobile-first approach
- **Touch Gestures**: Swipe, pinch, tap interactions
- **Performance**: Optimized for mobile networks
- **Accessibility**: WCAG 2.1 AA compliance

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- **Backend**: Follow Google Java Style Guide
- **Frontend**: ESLint + Prettier configuration
- **Commits**: Conventional Commits specification
- **Tests**: Write tests for all new features

## 📄 Legal

- **License**: MIT License - see [LICENSE](LICENSE) file
- **Terms of Service**: [TERMS.md](TERMS.md)
- **Privacy Policy**: [PRIVACY.md](PRIVACY.md)

## 🆘 Support

- **Documentation**: [docs.futurevest.com](https://docs.futurevest.com)
- **Issues**: [GitHub Issues](https://github.com/futurevest/futurevest/issues)
- **Discussions**: [GitHub Discussions](https://github.com/futurevest/futurevest/discussions)
- **Email**: support@futurevest.com

## 🗺️ Roadmap

### v2.0 (Q2 2024)
- [ ] Mobile apps (iOS/Android)
- [ ] Advanced AI matching algorithms
- [ ] Blockchain-based smart contracts
- [ ] Multi-currency support

### v2.1 (Q3 2024)
- [ ] Integration with more payment providers
- [ ] Advanced analytics dashboard
- [ ] API rate limiting and quotas
- [ ] Enhanced security features

### v3.0 (Q4 2024)
- [ ] Microservices architecture
- [ ] Event-driven architecture
- [ ] Machine learning predictions
- [ ] Global expansion support

## 📈 Performance

### Benchmarks
- **API Response Time**: < 200ms (95th percentile)
- **Page Load Time**: < 2 seconds
- **Database Query Time**: < 100ms (average)
- **Uptime**: 99.9% SLA

### Scalability
- **Horizontal Scaling**: Stateless backend services
- **Database**: Read replicas for query scaling
- **Cache**: Redis cluster for distributed caching
- **CDN**: CloudFront for static assets

## 🎯 Demo

Try our live demo: [demo.futurevest.com](https://demo.futurevest.com)

**Demo Credentials**:
- **Student**: student@demo.com / password123
- **Investor**: investor@demo.com / password123
- **Admin**: admin@demo.com / password123

## 📞 Contact

- **Website**: [futurevest.com](https://futurevest.com)
- **Email**: hello@futurevest.com
- **Twitter**: [@FutureVest](https://twitter.com/FutureVest)
- **LinkedIn**: [FutureVest](https://linkedin.com/company/futurevest)

---

**Built with ❤️ by the FutureVest Team**
