/**
 * Collection Initializer Service
 * Handles initialization of all required Firestore collections
 */
/**
 * Initialize global collections that should exist once in the system
 */
export declare function initializeGlobalCollections(): Promise<void>;
/**
 * Initialize user-specific collections for a new user
 */
export declare function initializeUserCollections(uid: string): Promise<void>;
//# sourceMappingURL=collectionInitializer.d.ts.map