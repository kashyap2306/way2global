# Data Model Documentation

## Firestore Collections Structure

### 1. Users Collection (`users`)
Primary user data with MLM-specific fields.

```typescript
interface MLMUser {
  uid: string;                    // Firebase Auth UID
  email: string;                  // Gmail address (unique)
  fullName: string;               // User's full name
  contactNumber: string;          // Phone number (unique)
  walletAddress: string;          // USDT BEP20 wallet address
  sponsorUID?: string;            // Sponsor's UID (optional)
  currentRank: string;            // Current MLM rank
  totalEarnings: number;          // Total earnings across all income types
  availableBalance: number;       // Available balance for withdrawal
  directReferrals: string[];      // Array of direct referral UIDs
  isActive: boolean;              // Account activation status
  joinDate: Timestamp;            // Registration timestamp
  lastActiveDate: Timestamp;      // Last activity timestamp
  profilePicture?: string;        // Profile image URL
  kycStatus: 'pending' | 'approved' | 'rejected'; // KYC verification status
  bankDetails?: {                 // Optional bank details for withdrawals
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    accountHolderName: string;
  };
}
```

### 2. Transactions Collection (`transactions`)
All financial transactions in the system.

```typescript
interface Transaction {
  id: string;                     // Auto-generated transaction ID
  uid: string;                    // User's UID
  type: 'activation' | 'topup' | 'withdrawal' | 'income' | 'deduction';
  amount: number;                 // Transaction amount in USDT
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;            // Transaction description
  fromRank?: string;              // Previous rank (for upgrades)
  toRank?: string;                // New rank (for upgrades)
  referenceId?: string;           // External reference ID
  walletAddress?: string;         // Wallet address involved
  timestamp: Timestamp;           // Transaction timestamp
  processedAt?: Timestamp;        // Processing completion timestamp
  metadata?: {                    // Additional transaction data
    [key: string]: any;
  };
}
```

### 3. Incomes Collection (`incomes`)
All income records for users.

```typescript
interface Income {
  id: string;                     // Auto-generated income ID
  uid: string;                    // Recipient's UID
  fromUID: string;                // Source user's UID (who generated this income)
  type: 'referral' | 'level' | 'global' | 'retopup' | 'bonus';
  amount: number;                 // Income amount in USDT
  level?: number;                 // Level number (for level income)
  rank: string;                   // Recipient's rank when income was generated
  status: 'pending' | 'credited' | 'processed';
  description: string;            // Income description
  transactionId: string;          // Related transaction ID
  timestamp: Timestamp;           // Income generation timestamp
  creditedAt?: Timestamp;         // When income was credited
  cycleId?: string;               // Global cycle ID (for global income)
  metadata?: {                    // Additional income data
    sourceRank?: string;          // Source user's rank
    percentage?: number;          // Income percentage
    [key: string]: any;
  };
}
```

### 4. Ranks Collection (`ranks`)
MLM rank definitions and requirements.

```typescript
interface Rank {
  id: string;                     // Rank identifier (e.g., 'azurite', 'pearl')
  name: string;                   // Display name
  activationAmount: number;       // Amount required to activate this rank
  level: number;                  // Rank level (1-10)
  benefits: {                     // Rank-specific benefits
    referralPercentage: number;   // Referral income percentage
    levelIncomePercentages: number[]; // Level income percentages [L1, L2, L3, L4, L5, L6]
    globalIncomeEligible: boolean; // Eligible for global income
    maxWithdrawal?: number;       // Maximum withdrawal limit
    specialBonuses?: string[];    // Special bonuses available
  };
  requirements: {                 // Rank upgrade requirements
    directReferrals?: number;     // Minimum direct referrals
    teamSize?: number;            // Minimum team size
    totalBusiness?: number;       // Minimum total business volume
  };
  color: string;                  // UI color code
  icon?: string;                  // Rank icon URL
  description: string;            // Rank description
  isActive: boolean;              // Whether rank is currently available
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 5. Income Transactions Collection (`incomeTransactions`)
Detailed income transaction logs.

```typescript
interface IncomeTransaction {
  id: string;                     // Auto-generated ID
  incomeId: string;               // Reference to income record
  uid: string;                    // Recipient's UID
  fromUID: string;                // Source user's UID
  amount: number;                 // Transaction amount
  type: 'referral' | 'level' | 'global' | 'retopup' | 'bonus';
  level?: number;                 // Level number (for level income)
  status: 'pending' | 'processed' | 'failed';
  processingFee?: number;         // Any processing fees deducted
  netAmount: number;              // Net amount after fees
  timestamp: Timestamp;           // Transaction timestamp
  processedAt?: Timestamp;        // Processing completion timestamp
  batchId?: string;               // Batch processing ID
  metadata?: {
    [key: string]: any;
  };
}
```

### 6. Withdrawals Collection (`withdrawals`)
Withdrawal requests and processing.

```typescript
interface Withdrawal {
  id: string;                     // Auto-generated withdrawal ID
  uid: string;                    // User's UID
  amount: number;                 // Requested withdrawal amount
  deductionAmount: number;        // Deduction amount (15%)
  netAmount: number;              // Net amount after deductions
  method: 'bank' | 'usdt' | 'p2p'; // Withdrawal method
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';
  requestedAt: Timestamp;         // Request timestamp
  processedAt?: Timestamp;        // Processing completion timestamp
  rejectionReason?: string;       // Reason for rejection
  bankDetails?: {                 // Bank details (if method is 'bank')
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    accountHolderName: string;
  };
  walletAddress?: string;         // USDT wallet address
  transactionHash?: string;       // Blockchain transaction hash
  adminNotes?: string;            // Admin processing notes
  metadata?: {
    [key: string]: any;
  };
}
```

### 7. RE-IDs Collection (`reids`)
RE-ID (Re-Entry ID) system for infinite cycles.

```typescript
interface REID {
  id: string;                     // Auto-generated RE-ID
  originalUID: string;            // Original user's UID
  reidNumber: number;             // RE-ID sequence number
  rank: string;                   // Rank of this RE-ID
  sponsorREID?: string;           // Sponsor's RE-ID
  isActive: boolean;              // RE-ID activation status
  activationAmount: number;       // Amount used for activation
  totalEarnings: number;          // Total earnings from this RE-ID
  directReferrals: string[];      // Direct referral RE-IDs
  createdAt: Timestamp;           // RE-ID creation timestamp
  activatedAt?: Timestamp;        // RE-ID activation timestamp
  cycleCompletions: number;       // Number of completed cycles
  metadata?: {
    parentCycleId?: string;       // Parent cycle that generated this RE-ID
    [key: string]: any;
  };
}
```

### 8. Settings Collection (`settings`)
Global platform settings and configurations.

```typescript
interface Settings {
  id: string;                     // Setting identifier
  category: 'withdrawal' | 'income' | 'ranks' | 'general' | 'fees';
  key: string;                    // Setting key
  value: any;                     // Setting value
  description: string;            // Setting description
  isActive: boolean;              // Whether setting is active
  updatedBy: string;              // Admin UID who updated
  updatedAt: Timestamp;           // Last update timestamp
  metadata?: {
    [key: string]: any;
  };
}

// Common settings:
// - minWithdrawalAmount: 10 (USDT)
// - withdrawalDeductionPercentage: 15
// - fundConversionPercentage: 10
// - referralIncomePercentage: 50
// - levelIncomePercentages: [5, 4, 3, 1, 1, 1]
// - globalCycleAmount: varies by rank
// - autoTopupEnabled: true/false
```

### 9. Payout Queue Collection (`payoutQueue`)
Queue system for processing payouts.

```typescript
interface PayoutQueue {
  id: string;                     // Auto-generated queue ID
  uid: string;                    // User's UID
  type: 'global' | 'level' | 'referral' | 'bonus';
  amount: number;                 // Payout amount
  rank: string;                   // User's rank
  priority: number;               // Processing priority (1-10)
  status: 'queued' | 'processing' | 'completed' | 'failed';
  scheduledAt: Timestamp;         // Scheduled processing time
  processedAt?: Timestamp;        // Actual processing time
  failureReason?: string;         // Failure reason if failed
  retryCount: number;             // Number of retry attempts
  maxRetries: number;             // Maximum retry attempts
  batchId?: string;               // Batch processing ID
  metadata?: {
    sourceTransactionId?: string; // Source transaction
    cycleId?: string;             // Related cycle ID
    [key: string]: any;
  };
}
```

## Collection Relationships

### User Hierarchy
- `users.sponsorUID` → `users.uid` (Many-to-One)
- `users.directReferrals[]` → `users.uid` (One-to-Many)

### Transaction Flow
- `transactions.uid` → `users.uid` (Many-to-One)
- `incomes.uid` → `users.uid` (Many-to-One)
- `incomes.fromUID` → `users.uid` (Many-to-One)
- `incomes.transactionId` → `transactions.id` (One-to-One)

### Income Processing
- `incomeTransactions.incomeId` → `incomes.id` (One-to-One)
- `payoutQueue.uid` → `users.uid` (Many-to-One)

### Withdrawal System
- `withdrawals.uid` → `users.uid` (Many-to-One)

### RE-ID System
- `reids.originalUID` → `users.uid` (Many-to-One)
- `reids.sponsorREID` → `reids.id` (Many-to-One)

## Indexes Required

### Composite Indexes
```javascript
// Users collection
users: [
  ['sponsorUID', 'isActive'],
  ['currentRank', 'isActive'],
  ['joinDate', 'isActive']
]

// Transactions collection
transactions: [
  ['uid', 'timestamp'],
  ['type', 'status', 'timestamp'],
  ['status', 'timestamp']
]

// Incomes collection
incomes: [
  ['uid', 'timestamp'],
  ['fromUID', 'timestamp'],
  ['type', 'status', 'timestamp'],
  ['status', 'timestamp']
]

// Withdrawals collection
withdrawals: [
  ['uid', 'requestedAt'],
  ['status', 'requestedAt']
]

// Payout Queue collection
payoutQueue: [
  ['status', 'priority', 'scheduledAt'],
  ['uid', 'status']
]
```

## Data Validation Rules

### Email Validation
- Must be Gmail address (@gmail.com)
- Unique across all users

### Contact Number Validation
- Must be valid phone number format
- Unique across all users

### Wallet Address Validation
- Must be valid USDT BEP20 address format
- Starts with '0x' and 42 characters total

### Amount Validation
- All amounts must be positive numbers
- Minimum withdrawal: $10 USDT
- Maximum precision: 2 decimal places

### Status Validation
- All status fields must use predefined enum values
- Status transitions must follow business logic rules