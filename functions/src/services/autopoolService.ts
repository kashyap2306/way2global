import * as admin from 'firebase-admin';
import { User, AutopoolEntry, PlatformSettings } from '../types';

const db = admin.firestore();

// Interfaces for the new Firestore collections/documents
export interface GlobalAutopoolPosition {
  position: number;
  userId: string;
  rank: string;
  status: 'filled' | 'vacant' | 'completed';
  joinedAt: admin.firestore.FieldValue;
  lastDistributedAt?: admin.firestore.FieldValue;
}

export interface AutopoolMeta {
  lastFilledPosition: number;
  nextDistributionPosition: number;
  lastResetAt?: admin.firestore.FieldValue;
}

export class AutopoolService {
  private globalAutopoolCollection = db.collection('globalAutopool');
  private autopoolMetaDoc = db.collection('autopoolMeta').doc('meta');

  constructor() {}

  /**
   * Assigns a user to the next available global autopool position.
   * Ensures a user is assigned only once per rank.
   * @param userId The ID of the user to assign.
   * @param rank The rank of the user.
   * @returns The assigned position number.
   */
  public async assignToNextPosition(userId: string, rank: string): Promise<number> {
    return db.runTransaction(async (transaction) => {
      const autopoolMetaSnap = await transaction.get(this.autopoolMetaDoc);
      const autopoolMeta = (autopoolMetaSnap.data() || { lastFilledPosition: 0, nextDistributionPosition: 1 }) as AutopoolMeta;

      const newPosition = autopoolMeta.lastFilledPosition + 1;

      // Check if user already has a position for this rank (to prevent duplicates on re-activation)
      const existingPositionSnap = await this.globalAutopoolCollection
        .where('userId', '==', userId)
        .where('rank', '==', rank)
        .limit(1)
        .get();

      if (!existingPositionSnap.empty) {
        const existingPosition = existingPositionSnap.docs[0].data() as GlobalAutopoolPosition;
        console.log(`User ${userId} already has autopool position ${existingPosition.position} for rank ${rank}. Skipping assignment.`);
        return existingPosition.position;
      }

      const newAutopoolPosition: GlobalAutopoolPosition = {
        position: newPosition,
        userId: userId,
        rank: rank,
        status: 'filled',
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      transaction.set(this.globalAutopoolCollection.doc(String(newPosition)), newAutopoolPosition);
      transaction.update(this.autopoolMetaDoc, { lastFilledPosition: newPosition });

      // Update user's globalPosition map
      const userRef = db.collection('users').doc(userId);
      transaction.update(userRef, {
        [`globalPositions.${rank}`]: newPosition,
      });

      console.log(`User ${userId} assigned to global autopool position ${newPosition} for rank ${rank}.`);
      return newPosition;
    });
  }

  /**
   * Finds the next eligible position for income distribution.
   * @returns The next eligible position or null if none found.
   */
  public async getNextDistributionPosition(): Promise<GlobalAutopoolPosition | null> {
    const autopoolMetaSnap = await this.autopoolMetaDoc.get();
    const autopoolMeta = (autopoolMetaSnap.data() || { lastFilledPosition: 0, nextDistributionPosition: 1 }) as AutopoolMeta;

    let currentPosition = autopoolMeta.nextDistributionPosition;
    const lastFilledPosition = autopoolMeta.lastFilledPosition;

    // Cycle through positions from nextDistributionPosition up to lastFilledPosition
    // If we reach the end, cycle back to 1
    while (currentPosition <= lastFilledPosition || (currentPosition > lastFilledPosition && autopoolMeta.lastFilledPosition > 0)) {
      const positionDoc = await this.globalAutopoolCollection.doc(String(currentPosition)).get();

      if (positionDoc.exists) {
        const positionData = positionDoc.data() as GlobalAutopoolPosition;
        // For now, we just return the position if it's filled.
        // Eligibility checks (direct referrals, active rank) will be done in the income generator.
        if (positionData.status === 'filled') {
          return positionData;
        }
      }

      currentPosition++;
      if (currentPosition > lastFilledPosition && lastFilledPosition > 0) {
        // Cycle back to the beginning if we've reached the end of filled positions
        currentPosition = 1;
      }
      // Prevent infinite loop if no filled positions or only skipped positions
      if (currentPosition === autopoolMeta.nextDistributionPosition && autopoolMeta.lastFilledPosition > 0) {
        break; // All positions checked, no eligible found in this cycle
      }
      if (autopoolMeta.lastFilledPosition === 0) {
        break; // No positions filled yet
      }
    }
    return null;
  }

  /**
   * Updates the nextDistributionPosition pointer in autopoolMeta.
   * @param newPosition The position to set as the next distribution position.
   */
  public async updateNextDistributionPosition(newPosition: number): Promise<void> {
    await this.autopoolMetaDoc.update({ nextDistributionPosition: newPosition });
  }

  /**
   * Marks a position as distributed and updates its lastDistributedAt timestamp.
   * @param positionNumber The position number to mark.
   */
  public async markPositionAsDistributed(positionNumber: number): Promise<void> {
    await this.globalAutopoolCollection.doc(String(positionNumber)).update({
      lastDistributedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Fetches a user's autopool position for a specific rank.
   * @param userId The ID of the user.
   * @param rank The rank to check.
   * @returns The autopool position or null if not found.
   */
  public async getUserAutopoolPosition(userId: string, rank: string): Promise<GlobalAutopoolPosition | null> {
    const snapshot = await this.globalAutopoolCollection
      .where('userId', '==', userId)
      .where('rank', '==', rank)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      return snapshot.docs[0].data() as GlobalAutopoolPosition;
    }
    return null;
  }
}