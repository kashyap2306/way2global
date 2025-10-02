/**
 * API endpoint for rank activation
 * Creates income pools and processes user-centric income system
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp();
import { createLogger, LogCategory } from '../utils/logger';
import { collections, mlmConfig } from '../config';
import { IncomePool, User, Transaction } from '../types';
import { newIncomeEngine } from '../services/newIncomeEngine';
import { AutopoolService } from '../services/autopoolService';

const logger = createLogger('ActivateRank');
const autopoolService = new AutopoolService();

interface ActivateRankRequest {
  rank: string;
  activateAllRanks?: boolean;
  transactionHash?: string;
  paymentMethod: 'wallet' | 'external';
}

interface ActivateRankResponse {
  success: boolean;
  message: string;
  activatedRanks: string[];
  totalCost: number;
  poolIds: string[];
}

/**
 * Helper function to process a single rank activation
 * Handles autopool assignment, income pool creation, and rank activation
 */
async function _processRankActivationInternal(
  userUID: string,
  rankKey: string,
  cost: number,
  transactionHash: string | undefined,
  paymentMethod: 'wallet' | 'external',
  transaction: FirebaseFirestore.Transaction,
  userData: User
): Promise<{ poolId: string }> {
  const db = admin.firestore();

  // Assign user to the next position in the autopool for this rank
  await autopoolService.assignToNextPosition(userUID, rankKey);

  // Create income pool with pending income logic
  const poolRef = db.collection(collections.INCOME_POOLS).doc();
  const poolData: IncomePool = {
    id: poolRef.id,
    userUID,
    rank: rankKey,
    poolIncome: 0,
    maxPoolIncome: cost * 100, // 100x activation amount
    isLocked: true,
    canClaim: false,
    directReferralsCount: userData.directReferralsCount || 0,
    requiredDirectReferrals: 2, // Income credited only after 2 direct referrals
    activatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
    lastIncomeAt: null,
    claimedAt: null,
    metadata: {
      activationAmount: cost,
      transactionId: transactionHash || null
    }
  };

  transaction.set(poolRef, poolData);

  // Update user's rank activation status
  transaction.update(db.collection(collections.USERS).doc(userUID), {
    [`rankActivations.${rankKey}`]: {
      isActive: true,
      activatedAt: admin.firestore.FieldValue.serverTimestamp(),
      poolId: poolRef.id
    }
  });

  return { poolId: poolRef.id };
}

export const activateRank = functions.https.onCall(
  async (data: ActivateRankRequest, context): Promise<ActivateRankResponse> => {
    try {
      // Verify authentication
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated to activate ranks'
        );
      }

      const userUID = context.auth.uid;
      const { rank, activateAllRanks = false, transactionHash, paymentMethod } = data;

      if (!rank) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Rank is required'
        );
      }

      const db = admin.firestore();

      // Get user data
      const userDoc = await db.collection(collections.USERS).doc(userUID).get();
      
      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'User not found'
        );
      }

      const userData = userDoc.data() as User;

      // Determine which ranks to activate
      const ranksToActivate: string[] = [];
      const rankKeys = Object.keys(mlmConfig.ranks) as Array<keyof typeof mlmConfig.ranks>;
      
      if (activateAllRanks) {
        // Activate all ranks from the specified rank onwards
        const startIndex = rankKeys.indexOf(rank as keyof typeof mlmConfig.ranks);
        if (startIndex === -1) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Invalid rank specified'
          );
        }
        ranksToActivate.push(...rankKeys.slice(startIndex));
      } else {
        // Activate only the specified rank
        if (!mlmConfig.ranks[rank as keyof typeof mlmConfig.ranks]) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Invalid rank specified'
          );
        }
        ranksToActivate.push(rank);
      }

      // Calculate total cost
      let totalCost = 0;
      const activationDetails: Array<{rank: string, cost: number}> = [];

      for (const rankKey of ranksToActivate) {
        const rankConfig = mlmConfig.ranks[rankKey as keyof typeof mlmConfig.ranks];
        
        // Check if rank is already activated
        const isAlreadyActive = userData.rankActivations?.[rankKey]?.isActive;
        if (!isAlreadyActive) {
          totalCost += rankConfig.activationAmount;
          activationDetails.push({
            rank: rankKey,
            cost: rankConfig.activationAmount
          });
        }
      }

      if (totalCost === 0) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'All specified ranks are already activated'
        );
      }

      // Verify user has sufficient balance if paying from wallet
      if (paymentMethod === 'wallet') {
        const availableBalance = userData.availableBalance || 0;
        if (availableBalance < totalCost) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            JSON.stringify({
              error: 'insufficient_balance',
              message: 'Insufficient balance for rank activation',
              details: {
                required: totalCost,
                available: availableBalance,
                shortfall: totalCost - availableBalance
              }
            })
          );
        }
      }

      const poolIds: string[] = [];
      const activatedRanks: string[] = [];

      // Process activations in a transaction
      await db.runTransaction(async (transaction) => {
        // Re-check balance atomically within transaction
        if (paymentMethod === 'wallet') {
          const userDocSnapshot = await transaction.get(userDoc.ref);
          const currentUserData = userDocSnapshot.data() as User;
          const currentAvailableBalance = currentUserData.availableBalance || 0;
          
          if (currentAvailableBalance < totalCost) {
            throw new functions.https.HttpsError(
              'failed-precondition',
              JSON.stringify({
                error: 'insufficient_balance',
                message: 'Insufficient balance for rank activation (atomic check)',
                details: {
                  required: totalCost,
                  available: currentAvailableBalance,
                  shortfall: totalCost - currentAvailableBalance
                }
              })
            );
          }
          
          // Deduct from wallet
          transaction.update(userDoc.ref, {
            availableBalance: admin.firestore.FieldValue.increment(-totalCost)
          });
        }

        // Create activation transaction record
        const activationTransactionRef = db.collection(collections.TRANSACTIONS).doc();
        transaction.set(activationTransactionRef, {
          uid: userUID,
          type: 'rank_activation',
          amount: totalCost,
          status: 'completed',
          description: `Rank activation: ${ranksToActivate.join(', ')}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          metadata: {
            ranks: ranksToActivate,
            paymentMethod,
            transactionHash: transactionHash || null,
            activationDetails
          }
        });

        // Process each rank activation
        for (const detail of activationDetails) {
          const { rank: rankKey, cost } = detail;
          const { poolId } = await _processRankActivationInternal(
            userUID,
            rankKey,
            cost,
            activationTransactionRef.id,
            paymentMethod,
            transaction,
            userData
          );
          poolIds.push(poolId);
          activatedRanks.push(rankKey);
        }
      });

      // Process instant direct referral commission and level income distribution
      if (userData.sponsorUID) {
        try {
          // 1. Instant Direct Referral Commission (25% of activation amount)
          const directReferralPercentage = mlmConfig.incomes.direct.percentage || 0.25; // Default to 25%
          const directReferralCommission = totalCost * directReferralPercentage;

          const sponsorDocRef = db.collection(collections.USERS).doc(userData.sponsorUID);
          const sponsorDoc = await transaction.get(sponsorDocRef);
          const sponsorData = sponsorDoc.data() as User;

          if (sponsorData) {
            // Update sponsor's available balance
            transaction.update(sponsorDocRef, {
              availableBalance: admin.firestore.FieldValue.increment(directReferralCommission)
            });

            // Create income transaction for sponsor
            const sponsorIncomeTxRef = db.collection(collections.INCOME_TRANSACTIONS).doc();
            transaction.set(sponsorIncomeTxRef, {
              userId: userData.sponsorUID,
              type: 'direct_referral_commission',
              amount: directReferralCommission,
              status: 'completed',
              description: `Instant direct referral commission for ${userData.displayName || userUID}'s rank activation`,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              metadata: {
                referrerId: userUID,
                activatedRankCost: totalCost,
                percentage: directReferralPercentage
              }
            });

            logger.info( // Removed await
              LogCategory.MLM,
              'Instant direct referral commission processed',
              userData.sponsorUID,
              {
                referrerId: userUID,
                commission: directReferralCommission,
                activatedRankCost: totalCost
              }
            );
          }

          // 2. Level Income Distribution (up to 6 levels)
          newIncomeEngine.distributeLevelIncome(userUID, totalCost, transaction);

        } catch (error) {
          logger.error(
            LogCategory.MLM,
            'Failed to process instant direct referral commission or level income',
            userUID,
            {
              sponsorUID: userData.sponsorUID,
              error: error instanceof Error ? error.message : String(error),
              totalCost
            }
          );
        }
      }

      // Update direct referral counts for all users
      try {
        await newIncomeEngine.updateDirectReferralCount(userUID);
        if (userData.sponsorUID) {
          await newIncomeEngine.updateDirectReferralCount(userData.sponsorUID);
        }
      } catch (error) {
        logger.warn(
          LogCategory.MLM,
          'Failed to update direct referral counts',
          userUID,
          { error: error instanceof Error ? error.message : String(error) }
        );
      }

      logger.info(
        LogCategory.MLM,
        `Rank activation successful: ${activatedRanks.join(', ')} for user ${userUID}`,
        userUID,
        {
          activatedRanks,
          totalCost,
          poolIds,
          paymentMethod,
          transactionHash
        }
      );

      return {
        success: true,
        message: `Successfully activated ${activatedRanks.length} rank(s): ${activatedRanks.join(', ')}`,
        activatedRanks,
        totalCost,
        poolIds
      };

    } catch (error) {
      logger.error(
        LogCategory.MLM,
        'Failed to activate rank',
        context.auth?.uid || '',
        {
          error: error instanceof Error ? error.message : String(error),
          rank: data.rank,
          activateAllRanks: data.activateAllRanks,
          stack: error instanceof Error ? error.stack : undefined
        }
      );

      // Re-throw HttpsError as-is, wrap others
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        'Failed to activate rank. Please try again later.'
      );
    }
  }
);

/**
 * HTTP endpoint version for web requests
 */
export const activateRankHttp = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Verify authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Create context object similar to callable function
    const context = {
      auth: {
        uid: decodedToken.uid,
        token: decodedToken
      }
    };

    // Call the main function
    const result = await activateRank(req.body, context);
    
    res.status(200).json(result);

  } catch (error) {
    console.error('HTTP endpoint error:', error);
    
    if (error instanceof functions.https.HttpsError) {
      // Try to parse structured error message
      try {
        const errorData = JSON.parse(error.message);
        res.status(400).json({
          success: false,
          ...errorData
        });
      } catch {
        // Fallback to original error format
        res.status(400).json({
          success: false,
          message: error.message,
          code: error.code
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
});