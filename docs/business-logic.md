# Business Logic Documentation

## MLM Plan Overview

WayGlobe operates on a **Binary MLM Plan** with **Level Income**, **Global Income**, and **RE-ID System** for infinite earning cycles.

## Rank System

### Available Ranks (10 Levels)

| Rank | Level | Activation Amount | Color Code |
|------|-------|------------------|------------|
| Azurite | 1 | $5 USDT | #007BFF (Blue) |
| Pearl | 2 | $10 USDT | #F8F9FA (White) |
| Topaz | 3 | $25 USDT | #FFC107 (Yellow) |
| Emerald | 4 | $50 USDT | #28A745 (Green) |
| Ruby | 5 | $100 USDT | #DC3545 (Red) |
| Sapphire | 6 | $250 USDT | #6F42C1 (Purple) |
| Diamond | 7 | $500 USDT | #17A2B8 (Cyan) |
| Platinum | 8 | $1000 USDT | #6C757D (Gray) |
| Titanium | 9 | $2500 USDT | #343A40 (Dark) |
| Crown | 10 | $5000 USDT | #FFD700 (Gold) |

### Rank Benefits

Each rank provides:
- **Referral Income**: 50% of direct referral activation
- **Level Income**: Percentage distribution across 6 levels
- **Global Income**: Eligibility for global cycle payouts
- **Auto Top-up**: Automatic rank upgrades from global income

## Income Types

### 1. Referral Income (Direct Income)
- **Rate**: 50% of direct referral's activation amount
- **Trigger**: When a direct referral activates any rank
- **Payment**: Instant credit to sponsor's balance
- **Example**: User A refers User B who activates Emerald ($50) → User A earns $25

### 2. Level Income (Indirect Income)
Distribution across 6 levels of upline:

| Level | Percentage | Description |
|-------|------------|-------------|
| L1 | 5% | Direct sponsor |
| L2 | 4% | Sponsor's sponsor |
| L3 | 3% | 3rd level up |
| L4 | 1% | 4th level up |
| L5 | 1% | 5th level up |
| L6 | 1% | 6th level up |

**Total**: 15% of activation amount distributed across upline

**Example**: User C activates Ruby ($100)
- L1 (Direct Sponsor): $5
- L2: $4
- L3: $3
- L4: $1
- L5: $1
- L6: $1

### 3. Global Income (Cycle Income)
**Reverse Global Income System** - Payouts flow from higher ranks to lower ranks.

#### Global Cycle Structure (10 Levels)
Each rank has its own global cycle with specific payout amounts:

| Rank | Cycle Payout | Positions | Total Pool |
|------|--------------|-----------|------------|
| Azurite | $2 | 1024 | $2,048 |
| Pearl | $4 | 1024 | $4,096 |
| Topaz | $10 | 1024 | $10,240 |
| Emerald | $20 | 1024 | $20,480 |
| Ruby | $40 | 1024 | $40,960 |
| Sapphire | $100 | 1024 | $102,400 |
| Diamond | $200 | 1024 | $204,800 |
| Platinum | $400 | 1024 | $409,600 |
| Titanium | $1000 | 1024 | $1,024,000 |
| Crown | $2000 | 1024 | $2,048,000 |

#### Cycle Completion Logic
1. **Entry**: Users enter global cycles when they activate a rank
2. **Filling**: Cycles fill from bottom (newest entries) to top
3. **Completion**: When a cycle reaches 1024 positions, it completes
4. **Payout**: All 1024 users receive the cycle payout amount
5. **Auto Top-up**: 50% of payout goes to next rank activation
6. **RE-ID Generation**: Remaining 50% creates new RE-ID for infinite cycles

### 4. Re-Top-up Income
- **Trigger**: When a user re-activates the same rank
- **Income**: Same as initial activation (Referral + Level income)
- **Purpose**: Allows multiple activations for increased earnings
- **Limit**: No limit on re-activations

## RE-ID System (Infinite Cycles)

### RE-ID Generation
When a user completes a global cycle:
1. **Payout Received**: User gets cycle payout amount
2. **Auto Top-up**: 50% goes to next rank activation (if available)
3. **RE-ID Creation**: Remaining 50% creates a new RE-ID
4. **New Cycle Entry**: RE-ID enters the same rank's global cycle again

### RE-ID Benefits
- **Infinite Earning**: Unlimited cycle completions
- **Compound Growth**: Each RE-ID can generate more RE-IDs
- **Passive Income**: RE-IDs work independently of original account

### RE-ID Example
User completes Emerald global cycle:
- **Payout**: $20
- **Auto Top-up**: $10 → Ruby rank activation
- **RE-ID**: $10 → New Emerald RE-ID created
- **Result**: User now has Ruby rank + Emerald RE-ID

## Withdrawal System

### Withdrawal Rules
- **Minimum Amount**: $10 USDT
- **Deduction**: 15% platform fee
- **Fund Conversion**: 10% additional fee for fund conversion
- **P2P Transfers**: Free (no fees)
- **Processing Time**: 24-48 hours

### Withdrawal Methods
1. **Bank Transfer**: 15% + 10% = 25% total deduction
2. **USDT (BEP20)**: 15% deduction only
3. **P2P Transfer**: 0% deduction (user-to-user)

### Withdrawal Calculation
```
Requested Amount: $100
Platform Fee (15%): $15
Fund Conversion (10%): $10
Net Amount: $75 (for bank transfer)
Net Amount: $85 (for USDT)
Net Amount: $100 (for P2P)
```

## Business Flow Examples

### Example 1: New User Journey
1. **Registration**: User A joins with sponsor User B
2. **Activation**: User A activates Azurite ($5)
3. **Referral Income**: User B earns $2.50 (50% of $5)
4. **Level Income**: Distributed to User B's upline (15% of $5 = $0.75)
5. **Global Entry**: User A enters Azurite global cycle
6. **Cycle Completion**: When cycle completes, User A earns $2
7. **Auto Top-up**: $1 goes to Pearl activation
8. **RE-ID**: $1 creates new Azurite RE-ID

### Example 2: Rank Upgrade
1. **Current**: User has Azurite rank
2. **Upgrade**: User activates Pearl ($10)
3. **Benefits**: Now eligible for Pearl global cycles
4. **Income**: Sponsor earns $5 referral income
5. **Level Distribution**: $1.50 distributed across upline
6. **Global Entry**: User enters Pearl global cycle

### Example 3: Multiple RE-IDs
1. **Original Account**: User completes 5 Emerald cycles
2. **RE-IDs Created**: 5 Emerald RE-IDs generated
3. **Parallel Earning**: All 6 positions (1 original + 5 RE-IDs) work simultaneously
4. **Compound Effect**: Each RE-ID can complete cycles and create more RE-IDs

## Income Calculation Formulas

### Referral Income
```
Referral Income = Activation Amount × 50%
```

### Level Income
```
L1 Income = Activation Amount × 5%
L2 Income = Activation Amount × 4%
L3 Income = Activation Amount × 3%
L4 Income = Activation Amount × 1%
L5 Income = Activation Amount × 1%
L6 Income = Activation Amount × 1%
```

### Global Cycle Payout
```
Cycle Payout = Fixed amount per rank (see table above)
Auto Top-up = Cycle Payout × 50%
RE-ID Amount = Cycle Payout × 50%
```

### Withdrawal Net Amount
```
Bank Transfer: Net = Amount × (1 - 0.15 - 0.10) = Amount × 0.75
USDT Transfer: Net = Amount × (1 - 0.15) = Amount × 0.85
P2P Transfer: Net = Amount × 1.00
```

## Business Rules

### Activation Rules
1. Users must activate ranks in sequence (can't skip ranks)
2. Multiple activations of same rank allowed (re-top-up)
3. Activation requires sufficient wallet balance
4. Sponsor must be active to receive referral income

### Income Distribution Rules
1. Referral income paid instantly upon activation
2. Level income distributed within 24 hours
3. Global income paid upon cycle completion
4. All income subject to minimum payout thresholds

### Global Cycle Rules
1. Cycles fill in chronological order (FIFO)
2. Users can have multiple positions in same cycle (via RE-IDs)
3. Cycle completion triggers automatic payouts
4. Failed cycles (incomplete) carry forward to next cycle

### RE-ID Rules
1. RE-IDs generated automatically from global payouts
2. RE-IDs inherit original user's sponsor structure
3. RE-IDs can generate their own RE-IDs (infinite recursion)
4. RE-IDs are managed automatically by the system

### Withdrawal Rules
1. Minimum balance required for withdrawal
2. Daily withdrawal limits may apply
3. KYC verification required for large withdrawals
4. Withdrawal requests processed in order (FIFO)

## Performance Metrics

### Key Performance Indicators (KPIs)
- **Total Users**: Active user count
- **Total Volume**: Sum of all activations
- **Active Cycles**: Number of running global cycles
- **Completed Cycles**: Number of finished cycles
- **Total Payouts**: Sum of all income distributions
- **Average User Earnings**: Mean earnings per user
- **Retention Rate**: User activity over time

### Business Intelligence
- **Rank Distribution**: Users per rank level
- **Income Sources**: Breakdown by income type
- **Withdrawal Patterns**: Withdrawal frequency and amounts
- **Growth Metrics**: New user acquisition rates
- **Cycle Performance**: Cycle completion times and success rates