# WayGlobe MLM Platform - Firebase Functions

This directory contains the Firebase Cloud Functions for the WayGlobe MLM platform, providing backend services for user management, transactions, income processing, and administrative operations.

## 🏗️ Architecture

The functions are organized into several key components:

- **Callable Functions**: Direct client-callable functions for user operations
- **HTTP Handlers**: RESTful API endpoints for web and mobile clients  
- **Services**: Business logic and data processing services
- **Triggers**: Database and authentication event handlers
- **Types**: TypeScript interfaces and type definitions
- **Utils**: Shared utilities and helper functions

## 📋 Prerequisites

- Node.js 18+ 
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project with Firestore and Authentication enabled

## 🚀 Getting Started

### Installation

```bash
# Install dependencies
npm install

# Login to Firebase (if not already logged in)
firebase login

# Set your Firebase project
firebase use your-project-id
```

### Development

```bash
# Start the Firebase emulator suite
npm run serve

# Build the functions
npm run build

# Watch for changes during development
npm run build:watch

# Deploy to Firebase
npm run deploy
```

## 🧪 Testing

The project includes comprehensive testing with unit, integration, and end-to-end tests.

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run end-to-end tests only
npm run test:e2e

# Run performance tests
npm run test:performance

# Run security tests
npm run test:security

# Watch mode for development
npm run test:watch
```

### Test Structure

```
test/
├── unit/           # Unit tests for individual functions/services
├── integration/    # Integration tests for API endpoints
├── e2e/           # End-to-end user journey tests
├── performance/   # Load and performance tests
├── security/      # Security and vulnerability tests
├── mocks/         # Mock implementations for testing
├── utils/         # Test utilities and helpers
└── setup.ts       # Global test configuration
```

## 📁 Project Structure

```
src/
├── callable/      # Firebase callable functions
│   ├── signup.ts
│   ├── activation.ts
│   ├── withdrawal.ts
│   └── seedDatabase.ts
├── handlers/      # HTTP request handlers
│   ├── userHandlers.ts
│   ├── adminHandlers.ts
│   └── publicHandlers.ts
├── services/      # Business logic services
│   ├── incomeEngine.ts
│   ├── validationService.ts
│   ├── userService.ts
│   └── transactionService.ts
├── triggers/      # Database and auth triggers
│   ├── userTriggers.ts
│   └── transactionTriggers.ts
├── types/         # TypeScript type definitions
│   └── index.ts
├── utils/         # Shared utilities
│   ├── auth.ts
│   ├── validation.ts
│   └── helpers.ts
├── config.ts      # Configuration settings
└── index.ts       # Main exports
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the functions directory:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_REGION=us-central1

# API Configuration
API_BASE_URL=https://your-domain.com
CORS_ORIGINS=https://your-frontend-domain.com

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# External Services
PAYMENT_GATEWAY_API_KEY=your-payment-api-key
EMAIL_SERVICE_API_KEY=your-email-api-key
```

### Firebase Configuration

Ensure your Firebase project has the following services enabled:

- **Authentication**: Email/password provider
- **Firestore**: Database with security rules
- **Cloud Functions**: Enabled with appropriate IAM roles
- **Cloud Storage**: For file uploads (optional)

## 📊 Database Seeding

The project includes a database seeding system for development and testing:

```bash
# Seed initial data (ranks, settings, test users)
npm run seed

# Clear all data
npm run seed:clear

# Check seed status
npm run seed:status

# Re-seed database (clear + seed)
npm run seed:reseed
```

## 🔐 Security

### Authentication & Authorization

- JWT token validation for all protected endpoints
- Role-based access control (user, admin, super_admin)
- Custom claims for fine-grained permissions
- Rate limiting on sensitive operations

### Data Protection

- Input validation and sanitization
- SQL/NoSQL injection prevention
- XSS protection
- Secure password hashing (handled by Firebase Auth)
- Sensitive data masking in responses

### Security Headers

All HTTP responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- Proper CORS configuration

## 📈 Performance

### Optimization Strategies

- Database query optimization with proper indexing
- Connection pooling for external services
- Caching for frequently accessed data
- Batch operations for bulk updates
- Pagination for large datasets

### Monitoring

- Cloud Functions metrics and logging
- Error tracking and alerting
- Performance monitoring
- Cost optimization tracking

## 🚀 Deployment

### Development Deployment

```bash
# Deploy all functions
npm run deploy

# Deploy specific function
firebase deploy --only functions:functionName

# Deploy with specific project
firebase deploy --project your-project-id
```

### Production Deployment

```bash
# Build for production
npm run build

# Run tests before deployment
npm test

# Deploy to production
npm run deploy:prod
```

### CI/CD Pipeline

The project is configured for automated deployment with:

1. **Pre-deployment**: Linting, testing, security checks
2. **Build**: TypeScript compilation and optimization
3. **Deploy**: Staged deployment with rollback capability
4. **Post-deployment**: Health checks and monitoring

## 🛠️ Development Workflow

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type checking
npm run type-check

# Run all quality checks
npm run validate
```

### Git Hooks

Pre-commit hooks ensure code quality:
- ESLint validation
- Prettier formatting
- TypeScript compilation
- Unit test execution

## 📚 API Documentation

### Callable Functions

- `signup`: User registration with sponsor/placement
- `activation`: User activation and rank upgrades
- `withdrawal`: Withdrawal request processing
- `seedDatabase`: Database seeding (super admin only)

### HTTP Endpoints

#### User Endpoints (`/user`)
- `GET /user/dashboard`: User dashboard data
- `GET /user/profile`: User profile information
- `PUT /user/profile`: Update user profile
- `GET /user/referral`: Referral system data
- `GET /user/transactions`: Transaction history
- `GET /user/incomes`: Income history
- `GET /user/withdrawals`: Withdrawal history
- `GET /user/team`: Team structure

#### Admin Endpoints (`/admin`)
- `GET /admin/users`: User management
- `GET /admin/transactions`: Transaction management
- `GET /admin/withdrawals`: Withdrawal management
- `GET /admin/settings`: System settings
- `GET /admin/dashboard`: Admin dashboard

## 🐛 Troubleshooting

### Common Issues

1. **Function timeout**: Increase timeout in firebase.json
2. **Memory issues**: Optimize queries and increase memory allocation
3. **Permission errors**: Check IAM roles and security rules
4. **CORS errors**: Verify CORS configuration in handlers

### Debugging

```bash
# View function logs
firebase functions:log

# Debug locally with emulator
npm run serve

# Enable debug logging
export DEBUG=*
npm run serve
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

### Code Standards

- Follow TypeScript best practices
- Write comprehensive tests
- Document public APIs
- Use meaningful commit messages
- Follow the existing code style

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

For technical support or questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation in `/docs`

---

**Note**: This is a production system handling financial transactions. Always test thoroughly before deploying changes.