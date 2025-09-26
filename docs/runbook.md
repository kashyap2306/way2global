# Runbook - Development & Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Environment Configuration](#environment-configuration)
4. [Firebase Setup](#firebase-setup)
5. [Development Workflow](#development-workflow)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **Git**: Latest version
- **Firebase CLI**: v12.0.0 or higher
- **VS Code**: Recommended IDE

### Required Accounts
- Firebase/Google Cloud Platform account
- GitHub account (for CI/CD)
- Domain registrar account (for production)

### System Requirements
- **RAM**: Minimum 8GB, Recommended 16GB
- **Storage**: Minimum 10GB free space
- **OS**: Windows 10/11, macOS 10.15+, or Ubuntu 18.04+

## Local Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/wayglobe.git
cd wayglobe
```

### 2. Install Dependencies

#### Root Dependencies
```bash
npm install
```

#### Web Application
```bash
cd web
npm install
cd ..
```

#### Firebase Functions
```bash
cd functions
npm install
cd ..
```

#### Admin Panel
```bash
cd admin
npm install
cd ..
```

### 3. Firebase CLI Setup
```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (if not already done)
firebase init
```

### 4. Project Structure Verification
```
wayglobe/
├── .github/workflows/          # CI/CD pipelines
├── infra/                      # Infrastructure configs
├── docs/                       # Documentation
├── scripts/                    # Seed & utility scripts
├── functions/                  # Firebase Cloud Functions
├── web/                        # React frontend
├── admin/                      # Admin panel
├── tests/                      # Test suites
├── .env.example               # Environment template
├── firebase.json              # Firebase configuration
├── firestore.rules           # Firestore security rules
└── README.md                 # Project overview
```

## Environment Configuration

### 1. Environment Files

#### Root `.env` (Copy from `.env.example`)
```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=wayglobe-dev
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=wayglobe-dev.firebaseapp.com
FIREBASE_DATABASE_URL=https://wayglobe-dev-default-rtdb.firebaseio.com
FIREBASE_PROJECT_ID=wayglobe-dev
FIREBASE_STORAGE_BUCKET=wayglobe-dev.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef

# Environment
NODE_ENV=development

# API Configuration
API_BASE_URL=http://localhost:5001/wayglobe-dev/us-central1

# Security
ENCRYPTION_KEY=your_32_character_encryption_key
JWT_SECRET=your_jwt_secret_key

# External APIs
PAYMENT_GATEWAY_API_KEY=your_payment_api_key
BLOCKCHAIN_API_KEY=your_blockchain_api_key
```

#### Web `.env.local`
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=wayglobe-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=wayglobe-dev
VITE_FIREBASE_STORAGE_BUCKET=wayglobe-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_API_BASE_URL=http://localhost:5001/wayglobe-dev/us-central1
```

#### Functions `.env`
```bash
ENCRYPTION_KEY=your_32_character_encryption_key
JWT_SECRET=your_jwt_secret_key
PAYMENT_GATEWAY_API_KEY=your_payment_api_key
BLOCKCHAIN_API_KEY=your_blockchain_api_key
```

### 2. Firebase Configuration

#### `firebase.json`
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "infra/firebase/firestore.indexes.json"
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log"
      ],
      "predeploy": [
        "npm --prefix \"$RESOURCE_DIR\" run build"
      ]
    }
  ],
  "hosting": [
    {
      "target": "web",
      "public": "web/dist",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    },
    {
      "target": "admin",
      "public": "admin/dist",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  ],
  "storage": {
    "rules": "infra/firebase/storage.rules"
  }
}
```

## Firebase Setup

### 1. Create Firebase Project
```bash
# Create new project (if needed)
firebase projects:create wayglobe-dev

# Set active project
firebase use wayglobe-dev
```

### 2. Enable Required Services
```bash
# Enable Authentication
firebase auth:enable

# Enable Firestore
firebase firestore:enable

# Enable Storage
firebase storage:enable

# Enable Functions
firebase functions:enable
```

### 3. Configure Authentication Providers
```bash
# Enable Email/Password authentication
# This needs to be done via Firebase Console
# Go to Authentication > Sign-in method > Email/Password > Enable
```

### 4. Deploy Security Rules
```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage
```

### 5. Seed Initial Data
```bash
# Run seed scripts
npm run seed:ranks
npm run seed:settings
npm run seed:test-users
```

## Development Workflow

### 1. Start Development Servers

#### Terminal 1: Firebase Emulators
```bash
firebase emulators:start
```

#### Terminal 2: Web Application
```bash
cd web
npm run dev
```

#### Terminal 3: Admin Panel
```bash
cd admin
npm run dev
```

#### Terminal 4: Functions Development
```bash
cd functions
npm run serve
```

### 2. Available Scripts

#### Root Level
```bash
npm run dev              # Start all development servers
npm run build           # Build all applications
npm run test            # Run all tests
npm run lint            # Lint all code
npm run seed:all        # Run all seed scripts
npm run deploy:dev      # Deploy to development
npm run deploy:prod     # Deploy to production
```

#### Web Application
```bash
cd web
npm run dev             # Start development server
npm run build          # Build for production
npm run preview        # Preview production build
npm run test           # Run tests
npm run lint           # Lint code
npm run type-check     # TypeScript type checking
```

#### Functions
```bash
cd functions
npm run serve          # Start local functions
npm run build         # Build functions
npm run deploy        # Deploy functions
npm run logs          # View function logs
npm run test          # Run function tests
```

### 3. Code Quality

#### Pre-commit Hooks
```bash
# Install husky for git hooks
npm install --save-dev husky

# Setup pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run test"
```

#### ESLint Configuration
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

## Testing

### 1. Test Structure
```
tests/
├── unit/                      # Unit tests
│   ├── incomeEngine.test.ts
│   ├── validators.test.ts
│   └── utils.test.ts
├── integration/               # Integration tests
│   ├── functions-integration.test.ts
│   ├── firestore-integration.test.ts
│   └── auth-integration.test.ts
└── e2e/                      # End-to-end tests
    ├── signup-login-flow.spec.ts
    ├── mlm-income-flow.spec.ts
    └── withdrawal-flow.spec.ts
```

### 2. Running Tests

#### All Tests
```bash
npm run test
```

#### Unit Tests
```bash
npm run test:unit
```

#### Integration Tests
```bash
npm run test:integration
```

#### E2E Tests
```bash
npm run test:e2e
```

#### Test Coverage
```bash
npm run test:coverage
```

### 3. Test Configuration

#### Jest Configuration (`jest.config.js`)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'functions/src/**/*.ts',
    'web/src/**/*.{ts,tsx}',
    '!**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## Deployment

### 1. Environment Setup

#### Development Environment
```bash
# Set Firebase project
firebase use wayglobe-dev

# Deploy all services
npm run deploy:dev
```

#### Staging Environment
```bash
# Set Firebase project
firebase use wayglobe-staging

# Deploy all services
npm run deploy:staging
```

#### Production Environment
```bash
# Set Firebase project
firebase use wayglobe-prod

# Deploy all services
npm run deploy:prod
```

### 2. Deployment Scripts

#### `package.json` Scripts
```json
{
  "scripts": {
    "deploy:dev": "firebase deploy --project wayglobe-dev",
    "deploy:staging": "firebase deploy --project wayglobe-staging",
    "deploy:prod": "firebase deploy --project wayglobe-prod",
    "deploy:functions": "firebase deploy --only functions",
    "deploy:hosting": "firebase deploy --only hosting",
    "deploy:firestore": "firebase deploy --only firestore"
  }
}
```

### 3. CI/CD Pipeline

#### GitHub Actions (`.github/workflows/deploy.yml`)
```yaml
name: Deploy to Firebase

on:
  push:
    branches:
      - main
      - develop

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        npm ci
        cd web && npm ci
        cd ../functions && npm ci
        cd ../admin && npm ci
    
    - name: Run tests
      run: npm run test
    
    - name: Build applications
      run: npm run build
    
    - name: Deploy to Firebase
      uses: FirebaseExtended/action-hosting-deploy@v0
      with:
        repoToken: '${{ secrets.GITHUB_TOKEN }}'
        firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
        projectId: wayglobe-prod
```

### 4. Deployment Checklist

#### Pre-deployment
- [ ] All tests passing
- [ ] Code review completed
- [ ] Environment variables updated
- [ ] Database migrations ready
- [ ] Security rules updated

#### Post-deployment
- [ ] Health checks passing
- [ ] Monitoring alerts configured
- [ ] Performance metrics baseline
- [ ] User acceptance testing
- [ ] Rollback plan ready

## Monitoring & Maintenance

### 1. Firebase Monitoring

#### Performance Monitoring
```javascript
// Add to web application
import { getPerformance } from 'firebase/performance';
const perf = getPerformance();
```

#### Error Reporting
```javascript
// Add to functions
import { Logging } from '@google-cloud/logging';
const logging = new Logging();
```

### 2. Health Checks

#### Function Health Check
```javascript
exports.healthCheck = functions.https.onRequest((req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.FUNCTION_VERSION
  });
});
```

#### Database Health Check
```javascript
const checkDatabaseHealth = async () => {
  try {
    await admin.firestore().collection('settings').limit(1).get();
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};
```

### 3. Backup Strategy

#### Firestore Backup
```bash
# Schedule daily backups
gcloud firestore export gs://wayglobe-backups/$(date +%Y-%m-%d)
```

#### Code Backup
```bash
# Automated Git backups
git push origin main
git tag -a v$(date +%Y.%m.%d) -m "Daily backup"
git push origin --tags
```

### 4. Performance Optimization

#### Function Optimization
- Use connection pooling
- Implement caching strategies
- Optimize cold starts
- Monitor memory usage

#### Frontend Optimization
- Code splitting
- Lazy loading
- Image optimization
- Bundle analysis

## Troubleshooting

### 1. Common Issues

#### Firebase Connection Issues
```bash
# Check Firebase status
firebase status

# Re-authenticate
firebase logout
firebase login

# Check project configuration
firebase projects:list
```

#### Function Deployment Issues
```bash
# Check function logs
firebase functions:log

# Deploy specific function
firebase deploy --only functions:functionName

# Check function configuration
firebase functions:config:get
```

#### Build Issues
```bash
# Clear node modules
rm -rf node_modules package-lock.json
npm install

# Clear build cache
npm run clean
npm run build
```

### 2. Debug Commands

#### Firebase Emulator Debug
```bash
# Start with debug mode
firebase emulators:start --debug

# Check emulator status
firebase emulators:exec "curl http://localhost:4000"
```

#### Function Debug
```bash
# Local function debugging
cd functions
npm run serve -- --inspect

# Remote function debugging
firebase functions:log --only functionName
```

### 3. Performance Issues

#### Slow Queries
```javascript
// Add query performance monitoring
const startTime = Date.now();
const result = await query.get();
const duration = Date.now() - startTime;
console.log(`Query took ${duration}ms`);
```

#### Memory Issues
```bash
# Monitor function memory usage
firebase functions:log --only functionName | grep "Memory"
```

### 4. Security Issues

#### Audit Dependencies
```bash
npm audit
npm audit fix
```

#### Check Security Rules
```bash
# Test security rules
firebase emulators:start --only firestore
# Run security rule tests
```

### 5. Data Issues

#### Data Validation
```javascript
// Validate data integrity
const validateUserData = async (uid) => {
  const user = await admin.firestore().collection('users').doc(uid).get();
  // Add validation logic
};
```

#### Data Recovery
```bash
# Restore from backup
gsutil cp gs://wayglobe-backups/2024-01-01/* ./restore/
```

## Support & Documentation

### 1. Internal Documentation
- API documentation: `/docs/api.md`
- Data model: `/docs/data-model.md`
- Business logic: `/docs/business-logic.md`
- Security rules: `/docs/security-rules.md`

### 2. External Resources
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### 3. Team Contacts
- **Tech Lead**: [email@domain.com]
- **DevOps**: [devops@domain.com]
- **Security**: [security@domain.com]
- **Product**: [product@domain.com]

### 4. Emergency Procedures
- **Production Issues**: Contact tech lead immediately
- **Security Incidents**: Follow security incident response plan
- **Data Loss**: Initiate data recovery procedures
- **Service Outage**: Activate incident response team