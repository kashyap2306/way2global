# API Documentation

## Firebase Cloud Functions

### Authentication Required
All API endpoints require Firebase Authentication token in the request header:
```
Authorization: Bearer <firebase-id-token>
```

## Callable Functions

### 1. User Registration & Authentication

#### `signup`
Creates a new user account with MLM data.

**Request:**
```typescript
interface SignupRequest {
  email: string;           // Gmail address
  password: string;        // Minimum 6 characters
  fullName: string;        // User's full name
  contactNumber: string;   // Phone number (unique)
  walletAddress: string;   // USDT BEP20 wallet address
  sponsorUID?: string;     // Optional sponsor UID
}
```

**Response:**
```typescript
interface SignupResponse {
  success: boolean;
  uid: string;
  message: string;
  user?: {
    uid: string;
    email: string;
    fullName: string;
    currentRank: string;
    isActive: boolean;
  };
}
```

**Example:**
```javascript
const signup = httpsCallable(functions, 'signup');
const result = await signup({
  email: 'user@gmail.com',
  password: 'password123',
  fullName: 'John Doe',
  contactNumber: '+1234567890',
  walletAddress: '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4',
  sponsorUID: 'sponsor-uid-123'
});
```

### 2. Rank Activation & Top-up

#### `createActivation`
Activates a rank or performs re-top-up.

**Request:**
```typescript
interface ActivationRequest {
  rank: string;            // Target rank to activate
  amount: number;          // Activation amount in USDT
  isRetopup?: boolean;     // Whether this is a re-top-up
}
```

**Response:**
```typescript
interface ActivationResponse {
  success: boolean;
  transactionId: string;
  message: string;
  newRank?: string;
  incomeGenerated?: {
    referralIncome: number;
    levelIncome: number;
    totalIncome: number;
  };
}
```

**Example:**
```javascript
const createActivation = httpsCallable(functions, 'createActivation');
const result = await createActivation({
  rank: 'emerald',
  amount: 50,
  isRetopup: false
});
```

### 3. Withdrawal Management

#### `requestWithdrawal`
Creates a withdrawal request.

**Request:**
```typescript
interface WithdrawalRequest {
  amount: number;          // Withdrawal amount
  method: 'bank' | 'usdt' | 'p2p';
  bankDetails?: {          // Required for bank method
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    accountHolderName: string;
  };
  walletAddress?: string;  // Required for USDT method
  recipientUID?: string;   // Required for P2P method
}
```

**Response:**
```typescript
interface WithdrawalResponse {
  success: boolean;
  withdrawalId: string;
  netAmount: number;       // Amount after deductions
  deductionAmount: number; // Total deductions
  estimatedProcessingTime: string;
  message: string;
}
```

**Example:**
```javascript
const requestWithdrawal = httpsCallable(functions, 'requestWithdrawal');
const result = await requestWithdrawal({
  amount: 100,
  method: 'usdt',
  walletAddress: '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4'
});
```

### 4. Payout Management

#### `claimPayout`
Claims available payouts from global cycles.

**Request:**
```typescript
interface ClaimPayoutRequest {
  payoutIds: string[];     // Array of payout IDs to claim
}
```

**Response:**
```typescript
interface ClaimPayoutResponse {
  success: boolean;
  totalAmount: number;
  claimedPayouts: string[];
  failedPayouts: string[];
  message: string;
}
```

### 5. User Data Queries

#### `getUserProfile`
Retrieves complete user profile with MLM data.

**Request:**
```typescript
interface GetUserProfileRequest {
  uid?: string;            // Optional, defaults to current user
}
```

**Response:**
```typescript
interface GetUserProfileResponse {
  success: boolean;
  user: {
    uid: string;
    email: string;
    fullName: string;
    currentRank: string;
    totalEarnings: number;
    availableBalance: number;
    directReferrals: number;
    isActive: boolean;
    joinDate: string;
    rankHistory: RankHistory[];
  };
}
```

#### `getReferralTree`
Gets user's referral tree structure.

**Request:**
```typescript
interface GetReferralTreeRequest {
  uid?: string;
  depth?: number;          // Tree depth (default: 6 levels)
}
```

**Response:**
```typescript
interface GetReferralTreeResponse {
  success: boolean;
  tree: {
    uid: string;
    fullName: string;
    rank: string;
    joinDate: string;
    children: ReferralNode[];
  };
  statistics: {
    totalReferrals: number;
    activeReferrals: number;
    totalBusiness: number;
  };
}
```

#### `getIncomeHistory`
Retrieves user's income history.

**Request:**
```typescript
interface GetIncomeHistoryRequest {
  uid?: string;
  type?: 'referral' | 'level' | 'global' | 'retopup';
  limit?: number;          // Default: 50
  startAfter?: string;     // For pagination
}
```

**Response:**
```typescript
interface GetIncomeHistoryResponse {
  success: boolean;
  incomes: Income[];
  totalIncome: number;
  hasMore: boolean;
  nextPageToken?: string;
}
```

#### `getTransactionHistory`
Retrieves user's transaction history.

**Request:**
```typescript
interface GetTransactionHistoryRequest {
  uid?: string;
  type?: 'activation' | 'topup' | 'withdrawal' | 'income';
  limit?: number;
  startAfter?: string;
}
```

**Response:**
```typescript
interface GetTransactionHistoryResponse {
  success: boolean;
  transactions: Transaction[];
  hasMore: boolean;
  nextPageToken?: string;
}
```

### 6. Global Cycle Information

#### `getGlobalCycleStatus`
Gets current global cycle information.

**Request:**
```typescript
interface GetGlobalCycleStatusRequest {
  rank?: string;           // Specific rank, or all ranks
}
```

**Response:**
```typescript
interface GetGlobalCycleStatusResponse {
  success: boolean;
  cycles: {
    rank: string;
    currentPositions: number;
    totalPositions: number;
    payoutAmount: number;
    estimatedCompletion: string;
    userPositions: number;   // Current user's positions in this cycle
  }[];
}
```

## HTTP Endpoints

### 1. Authentication Endpoints

#### `POST /auth/login`
User login endpoint.

**Request:**
```json
{
  "email": "user@gmail.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "firebase-id-token",
  "user": {
    "uid": "user-uid",
    "email": "user@gmail.com",
    "fullName": "John Doe"
  }
}
```

#### `POST /auth/refresh`
Refresh authentication token.

**Request:**
```json
{
  "refreshToken": "firebase-refresh-token"
}
```

### 2. Admin Endpoints

#### `GET /admin/users`
Get all users (Admin only).

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `rank`: Filter by rank
- `status`: Filter by status (active/inactive)

**Response:**
```json
{
  "success": true,
  "users": [...],
  "totalCount": 1000,
  "currentPage": 1,
  "totalPages": 20
}
```

#### `GET /admin/withdrawals`
Get withdrawal requests (Admin only).

**Query Parameters:**
- `status`: Filter by status
- `page`: Page number
- `limit`: Items per page

#### `POST /admin/withdrawals/:id/approve`
Approve withdrawal request (Admin only).

**Request:**
```json
{
  "transactionHash": "0x...",
  "adminNotes": "Processed successfully"
}
```

#### `POST /admin/withdrawals/:id/reject`
Reject withdrawal request (Admin only).

**Request:**
```json
{
  "reason": "Insufficient verification",
  "adminNotes": "KYC documents required"
}
```

#### `GET /admin/statistics`
Get platform statistics (Admin only).

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalUsers": 10000,
    "activeUsers": 8500,
    "totalVolume": 500000,
    "totalPayouts": 250000,
    "pendingWithdrawals": 15000,
    "completedCycles": 150,
    "activeCycles": 25
  }
}
```

## Webhook Endpoints

### 1. Payment Webhooks

#### `POST /webhooks/payment/confirmation`
Receives payment confirmations from external payment processors.

**Request:**
```json
{
  "transactionId": "tx-123",
  "amount": 50,
  "currency": "USDT",
  "status": "confirmed",
  "walletAddress": "0x...",
  "blockchainHash": "0x...",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### 2. Blockchain Webhooks

#### `POST /webhooks/blockchain/transaction`
Receives blockchain transaction notifications.

**Request:**
```json
{
  "hash": "0x...",
  "from": "0x...",
  "to": "0x...",
  "value": "50000000000000000000",
  "status": "confirmed",
  "blockNumber": 12345678
}
```

## Error Responses

All endpoints return standardized error responses:

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;           // Error code
    message: string;        // Human-readable message
    details?: any;          // Additional error details
  };
  timestamp: string;
}
```

### Common Error Codes

- `AUTH_REQUIRED`: Authentication required
- `AUTH_INVALID`: Invalid authentication token
- `PERMISSION_DENIED`: Insufficient permissions
- `INVALID_REQUEST`: Invalid request parameters
- `USER_NOT_FOUND`: User not found
- `INSUFFICIENT_BALANCE`: Insufficient wallet balance
- `RANK_NOT_AVAILABLE`: Rank not available for activation
- `WITHDRAWAL_LIMIT_EXCEEDED`: Withdrawal limit exceeded
- `DUPLICATE_EMAIL`: Email already exists
- `DUPLICATE_CONTACT`: Contact number already exists
- `INVALID_SPONSOR`: Invalid sponsor UID
- `CYCLE_NOT_AVAILABLE`: Global cycle not available
- `PAYOUT_NOT_AVAILABLE`: Payout not available for claiming

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Callable Functions**: 100 requests per minute per user
- **HTTP Endpoints**: 1000 requests per hour per IP
- **Admin Endpoints**: 500 requests per hour per admin
- **Webhook Endpoints**: 10,000 requests per hour per source

## SDK Usage Examples

### JavaScript/TypeScript
```javascript
import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);
const auth = getAuth(app);

// Login
const userCredential = await signInWithEmailAndPassword(auth, email, password);

// Call function
const createActivation = httpsCallable(functions, 'createActivation');
const result = await createActivation({
  rank: 'emerald',
  amount: 50
});
```

### React Hook Example
```javascript
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, functions } from './firebase';

function useMLMFunctions() {
  const [user] = useAuthState(auth);
  
  const activateRank = async (rank, amount) => {
    if (!user) throw new Error('User not authenticated');
    
    const createActivation = httpsCallable(functions, 'createActivation');
    return await createActivation({ rank, amount });
  };
  
  return { activateRank };
}
```

## Testing

### Test Environment
- **Base URL**: `https://us-central1-wayglobe-test.cloudfunctions.net`
- **Test Users**: Pre-created test accounts available
- **Test Payments**: Sandbox payment processing enabled
- **Test Cycles**: Accelerated cycle completion for testing

### Postman Collection
A complete Postman collection is available with all endpoints and example requests:
- Import URL: `https://api.wayglobe.com/postman/collection.json`
- Environment: `https://api.wayglobe.com/postman/environment.json`