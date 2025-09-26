# Security Rules Documentation

## Firebase Authentication Rules

### User Registration Rules
- **Email Validation**: Only Gmail addresses (@gmail.com) allowed
- **Password Requirements**: Minimum 6 characters, recommended 8+
- **Contact Validation**: Phone number must be unique across platform
- **Wallet Validation**: USDT BEP20 address format validation

### Authentication Flow
```javascript
// Custom claims for user roles
{
  "admin": false,
  "verified": false,
  "kycStatus": "pending",
  "rank": "azurite",
  "isActive": true
}
```

## Firestore Security Rules

### Complete Rules File (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(uid) {
      return request.auth.uid == uid;
    }
    
    function isAdmin() {
      return request.auth.token.admin == true;
    }
    
    function isVerified() {
      return request.auth.token.verified == true;
    }
    
    function isActive() {
      return request.auth.token.isActive == true;
    }
    
    function isValidEmail(email) {
      return email.matches('.*@gmail\\.com$');
    }
    
    function isValidWalletAddress(address) {
      return address.matches('^0x[a-fA-F0-9]{40}$');
    }
    
    function isValidContactNumber(contact) {
      return contact.matches('^\\+?[1-9]\\d{1,14}$');
    }
    
    // Users Collection
    match /users/{userId} {
      // Read: User can read own data, admins can read all
      allow read: if isAuthenticated() && (isOwner(userId) || isAdmin());
      
      // Create: Only during registration with valid data
      allow create: if isAuthenticated() 
        && isOwner(userId)
        && isValidEmail(resource.data.email)
        && isValidContactNumber(resource.data.contactNumber)
        && isValidWalletAddress(resource.data.walletAddress)
        && resource.data.uid == userId
        && resource.data.currentRank == 'azurite'
        && resource.data.totalEarnings == 0
        && resource.data.availableBalance == 0
        && resource.data.isActive == false;
      
      // Update: User can update own profile, admins can update any
      allow update: if isAuthenticated() 
        && (isOwner(userId) || isAdmin())
        && (
          // Users can only update specific fields
          (isOwner(userId) && onlyUpdating(['fullName', 'profilePicture', 'bankDetails']))
          ||
          // Admins can update any field
          isAdmin()
        );
      
      // Delete: Only admins can delete users
      allow delete: if isAdmin();
    }
    
    // Transactions Collection
    match /transactions/{transactionId} {
      // Read: User can read own transactions, admins can read all
      allow read: if isAuthenticated() 
        && (resource.data.uid == request.auth.uid || isAdmin());
      
      // Create: Only system (Cloud Functions) can create transactions
      allow create: if false;
      
      // Update: Only system can update transactions
      allow update: if false;
      
      // Delete: Only admins can delete transactions
      allow delete: if isAdmin();
    }
    
    // Incomes Collection
    match /incomes/{incomeId} {
      // Read: User can read own incomes, admins can read all
      allow read: if isAuthenticated() 
        && (resource.data.uid == request.auth.uid || isAdmin());
      
      // Create: Only system can create income records
      allow create: if false;
      
      // Update: Only system can update income records
      allow update: if false;
      
      // Delete: Only admins can delete income records
      allow delete: if isAdmin();
    }
    
    // Ranks Collection
    match /ranks/{rankId} {
      // Read: All authenticated users can read ranks
      allow read: if isAuthenticated();
      
      // Create: Only admins can create ranks
      allow create: if isAdmin();
      
      // Update: Only admins can update ranks
      allow update: if isAdmin();
      
      // Delete: Only admins can delete ranks
      allow delete: if isAdmin();
    }
    
    // Income Transactions Collection
    match /incomeTransactions/{transactionId} {
      // Read: User can read own income transactions, admins can read all
      allow read: if isAuthenticated() 
        && (resource.data.uid == request.auth.uid || isAdmin());
      
      // Create: Only system can create income transactions
      allow create: if false;
      
      // Update: Only system can update income transactions
      allow update: if false;
      
      // Delete: Only admins can delete income transactions
      allow delete: if isAdmin();
    }
    
    // Withdrawals Collection
    match /withdrawals/{withdrawalId} {
      // Read: User can read own withdrawals, admins can read all
      allow read: if isAuthenticated() 
        && (resource.data.uid == request.auth.uid || isAdmin());
      
      // Create: Users can create withdrawal requests with validation
      allow create: if isAuthenticated() 
        && isActive()
        && resource.data.uid == request.auth.uid
        && resource.data.amount >= 10
        && resource.data.status == 'pending'
        && (
          // Bank withdrawal validation
          (resource.data.method == 'bank' && resource.data.bankDetails != null)
          ||
          // USDT withdrawal validation
          (resource.data.method == 'usdt' && isValidWalletAddress(resource.data.walletAddress))
          ||
          // P2P withdrawal validation
          (resource.data.method == 'p2p' && resource.data.recipientUID != null)
        );
      
      // Update: Only admins can update withdrawals (approve/reject)
      allow update: if isAdmin();
      
      // Delete: Only admins can delete withdrawals
      allow delete: if isAdmin();
    }
    
    // RE-IDs Collection
    match /reids/{reidId} {
      // Read: User can read own RE-IDs, admins can read all
      allow read: if isAuthenticated() 
        && (resource.data.originalUID == request.auth.uid || isAdmin());
      
      // Create: Only system can create RE-IDs
      allow create: if false;
      
      // Update: Only system can update RE-IDs
      allow update: if false;
      
      // Delete: Only admins can delete RE-IDs
      allow delete: if isAdmin();
    }
    
    // Settings Collection
    match /settings/{settingId} {
      // Read: All authenticated users can read settings
      allow read: if isAuthenticated();
      
      // Create: Only admins can create settings
      allow create: if isAdmin();
      
      // Update: Only admins can update settings
      allow update: if isAdmin();
      
      // Delete: Only admins can delete settings
      allow delete: if isAdmin();
    }
    
    // Payout Queue Collection
    match /payoutQueue/{payoutId} {
      // Read: User can read own payouts, admins can read all
      allow read: if isAuthenticated() 
        && (resource.data.uid == request.auth.uid || isAdmin());
      
      // Create: Only system can create payout queue entries
      allow create: if false;
      
      // Update: Only system can update payout queue entries
      allow update: if false;
      
      // Delete: Only admins can delete payout queue entries
      allow delete: if isAdmin();
    }
    
    // Helper function to check if only specific fields are being updated
    function onlyUpdating(fields) {
      return request.resource.data.diff(resource.data).affectedKeys().hasOnly(fields);
    }
  }
}
```

## Cloud Functions Security

### Function-Level Security

#### Authentication Middleware
```javascript
// Verify Firebase ID token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

#### Admin Authorization
```javascript
const requireAdmin = (req, res, next) => {
  if (!req.user.admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
```

#### Active User Check
```javascript
const requireActiveUser = async (req, res, next) => {
  const userDoc = await admin.firestore()
    .collection('users')
    .doc(req.user.uid)
    .get();
    
  if (!userDoc.exists || !userDoc.data().isActive) {
    return res.status(403).json({ error: 'Account not active' });
  }
  next();
};
```

### Input Validation

#### Email Validation
```javascript
const validateEmail = (email) => {
  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  return gmailRegex.test(email);
};
```

#### Wallet Address Validation
```javascript
const validateWalletAddress = (address) => {
  const bep20Regex = /^0x[a-fA-F0-9]{40}$/;
  return bep20Regex.test(address);
};
```

#### Contact Number Validation
```javascript
const validateContactNumber = (contact) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(contact);
};
```

#### Amount Validation
```javascript
const validateAmount = (amount) => {
  return typeof amount === 'number' 
    && amount > 0 
    && Number.isFinite(amount)
    && Math.round(amount * 100) / 100 === amount; // Max 2 decimal places
};
```

## Data Sanitization

### Input Sanitization
```javascript
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '');
  }
  return input;
};

const sanitizeUserData = (userData) => {
  return {
    fullName: sanitizeInput(userData.fullName),
    email: sanitizeInput(userData.email).toLowerCase(),
    contactNumber: sanitizeInput(userData.contactNumber),
    walletAddress: sanitizeInput(userData.walletAddress)
  };
};
```

### Output Sanitization
```javascript
const sanitizeUserOutput = (user) => {
  const { password, ...safeUser } = user;
  return safeUser;
};
```

## Rate Limiting

### Function-Level Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const createAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many account creation attempts'
});

const withdrawalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each user to 10 withdrawal requests per hour
  keyGenerator: (req) => req.user.uid
});
```

### IP-Based Rate Limiting
```javascript
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});
```

## Encryption & Hashing

### Sensitive Data Encryption
```javascript
const crypto = require('crypto');

const encryptSensitiveData = (data) => {
  const algorithm = 'aes-256-gcm';
  const key = process.env.ENCRYPTION_KEY;
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};
```

### Password Hashing (if needed)
```javascript
const bcrypt = require('bcrypt');

const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};
```

## Audit Logging

### Security Event Logging
```javascript
const logSecurityEvent = async (event, userId, details) => {
  await admin.firestore().collection('securityLogs').add({
    event,
    userId,
    details,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    ip: details.ip,
    userAgent: details.userAgent
  });
};

// Usage examples
await logSecurityEvent('LOGIN_SUCCESS', userId, { ip, userAgent });
await logSecurityEvent('WITHDRAWAL_REQUEST', userId, { amount, method });
await logSecurityEvent('ADMIN_ACCESS', userId, { action: 'USER_UPDATE' });
```

## Environment Security

### Environment Variables
```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=wayglobe-prod
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Encryption Keys
ENCRYPTION_KEY=...
JWT_SECRET=...

# API Keys
PAYMENT_GATEWAY_KEY=...
BLOCKCHAIN_API_KEY=...

# Database URLs
FIRESTORE_URL=...
```

### Secrets Management
- Use Firebase Functions config for sensitive data
- Rotate keys regularly (monthly)
- Use different keys for different environments
- Never commit secrets to version control

## CORS Configuration

### Allowed Origins
```javascript
const corsOptions = {
  origin: [
    'https://wayglobe.com',
    'https://www.wayglobe.com',
    'https://admin.wayglobe.com',
    // Development origins
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
```

## Security Headers

### HTTP Security Headers
```javascript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```

## Monitoring & Alerts

### Security Monitoring
```javascript
// Monitor failed login attempts
const monitorFailedLogins = async (userId) => {
  const recentFailures = await admin.firestore()
    .collection('securityLogs')
    .where('event', '==', 'LOGIN_FAILED')
    .where('userId', '==', userId)
    .where('timestamp', '>', new Date(Date.now() - 15 * 60 * 1000))
    .get();
    
  if (recentFailures.size >= 5) {
    // Lock account temporarily
    await lockUserAccount(userId, '15 minutes');
    // Send alert to admins
    await sendSecurityAlert('MULTIPLE_FAILED_LOGINS', userId);
  }
};
```

### Anomaly Detection
```javascript
// Monitor unusual withdrawal patterns
const monitorWithdrawals = async (userId, amount) => {
  const userDoc = await admin.firestore()
    .collection('users')
    .doc(userId)
    .get();
    
  const user = userDoc.data();
  const avgWithdrawal = user.totalWithdrawals / user.withdrawalCount;
  
  // Alert if withdrawal is 10x larger than average
  if (amount > avgWithdrawal * 10) {
    await sendSecurityAlert('LARGE_WITHDRAWAL', userId, { amount });
  }
};
```

## Compliance & Privacy

### GDPR Compliance
- User data deletion on request
- Data export functionality
- Consent management
- Privacy policy enforcement

### Data Retention
- Transaction data: 7 years
- User activity logs: 2 years
- Security logs: 1 year
- Temporary data: 30 days

### Data Minimization
- Collect only necessary data
- Regular data cleanup
- Anonymize historical data
- Secure data disposal