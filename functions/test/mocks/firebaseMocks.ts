/**
 * Firebase Service Mocks for Unit Testing
 */

import { jest } from '@jest/globals';

/**
 * Mock Firestore Document Reference
 */
export class MockDocumentReference {
  private data: any = null;
  private exists: boolean = false;

  constructor(data?: any) {
    if (data) {
      this.data = data;
      this.exists = true;
    }
  }

  async get(): Promise<MockDocumentSnapshot> {
    return new MockDocumentSnapshot(this.data, this.exists);
  }

  async set(data: any): Promise<void> {
    this.data = { ...data };
    this.exists = true;
  }

  async update(data: any): Promise<void> {
    if (!this.exists) {
      throw new Error('Document does not exist');
    }
    this.data = { ...this.data, ...data };
  }

  async delete(): Promise<void> {
    this.data = null;
    this.exists = false;
  }

  collection(path: string): MockCollectionReference {
    return new MockCollectionReference();
  }
}

/**
 * Mock Firestore Document Snapshot
 */
export class MockDocumentSnapshot {
  constructor(
    private _data: any,
    public exists: boolean
  ) {}

  data(): any {
    return this.exists ? this._data : undefined;
  }

  get(field: string): any {
    return this.exists ? this._data?.[field] : undefined;
  }

  get id(): string {
    return 'mock-doc-id';
  }
}

/**
 * Mock Firestore Collection Reference
 */
export class MockCollectionReference {
  private documents: Map<string, MockDocumentReference> = new Map();

  doc(id?: string): MockDocumentReference {
    const docId = id || `mock-doc-${Date.now()}`;
    if (!this.documents.has(docId)) {
      this.documents.set(docId, new MockDocumentReference());
    }
    return this.documents.get(docId)!;
  }

  async add(data: any): Promise<MockDocumentReference> {
    const docRef = this.doc();
    await docRef.set(data);
    return docRef;
  }

  where(field: string, operator: string, value: any): MockQuery {
    return new MockQuery(this.documents, { field, operator, value });
  }

  orderBy(field: string, direction?: 'asc' | 'desc'): MockQuery {
    return new MockQuery(this.documents, null, { field, direction });
  }

  limit(limit: number): MockQuery {
    return new MockQuery(this.documents, null, null, limit);
  }

  async get(): Promise<MockQuerySnapshot> {
    const docs = Array.from(this.documents.values())
      .map(doc => new MockDocumentSnapshot(doc, true));
    return new MockQuerySnapshot(docs);
  }
}

/**
 * Mock Firestore Query
 */
export class MockQuery {
  constructor(
    private documents: Map<string, MockDocumentReference>,
    private whereClause?: { field: string; operator: string; value: any } | null,
    private orderClause?: { field: string; direction?: 'asc' | 'desc' } | null,
    private limitValue?: number
  ) {}

  where(field: string, operator: string, value: any): MockQuery {
    return new MockQuery(this.documents, { field, operator, value }, this.orderClause, this.limitValue);
  }

  orderBy(field: string, direction?: 'asc' | 'desc'): MockQuery {
    return new MockQuery(this.documents, this.whereClause, { field, direction }, this.limitValue);
  }

  limit(limit: number): MockQuery {
    return new MockQuery(this.documents, this.whereClause, this.orderClause, limit);
  }

  async get(): Promise<MockQuerySnapshot> {
    let docs = Array.from(this.documents.values());

    // Apply where clause
    if (this.whereClause) {
      docs = docs.filter(doc => {
        const data = doc.data ? doc.data() : null;
        if (!data) return false;

        const fieldValue = data[this.whereClause!.field];
        switch (this.whereClause!.operator) {
          case '==':
            return fieldValue === this.whereClause!.value;
          case '!=':
            return fieldValue !== this.whereClause!.value;
          case '>':
            return fieldValue > this.whereClause!.value;
          case '>=':
            return fieldValue >= this.whereClause!.value;
          case '<':
            return fieldValue < this.whereClause!.value;
          case '<=':
            return fieldValue <= this.whereClause!.value;
          case 'in':
            return Array.isArray(this.whereClause!.value) && 
                   this.whereClause!.value.includes(fieldValue);
          case 'array-contains':
            return Array.isArray(fieldValue) && 
                   fieldValue.includes(this.whereClause!.value);
          default:
            return false;
        }
      });
    }

    // Apply ordering
    if (this.orderClause) {
      docs.sort((a, b) => {
        const aData = a.data ? a.data() : {};
        const bData = b.data ? b.data() : {};
        const aValue = aData[this.orderClause!.field];
        const bValue = bData[this.orderClause!.field];

        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;

        return this.orderClause!.direction === 'desc' ? -comparison : comparison;
      });
    }

    // Apply limit
    if (this.limitValue) {
      docs = docs.slice(0, this.limitValue);
    }

    const snapshots = docs.map(doc => new MockDocumentSnapshot(doc, true));
    return new MockQuerySnapshot(snapshots);
  }
}

/**
 * Mock Firestore Query Snapshot
 */
export class MockQuerySnapshot {
  constructor(public docs: MockDocumentSnapshot[]) {}

  get size(): number {
    return this.docs.length;
  }

  get empty(): boolean {
    return this.docs.length === 0;
  }

  forEach(callback: (doc: MockDocumentSnapshot) => void): void {
    this.docs.forEach(callback);
  }
}

/**
 * Mock Firestore Batch
 */
export class MockBatch {
  private operations: Array<{ type: string; ref: MockDocumentReference; data?: any }> = [];

  set(ref: MockDocumentReference, data: any): MockBatch {
    this.operations.push({ type: 'set', ref, data });
    return this;
  }

  update(ref: MockDocumentReference, data: any): MockBatch {
    this.operations.push({ type: 'update', ref, data });
    return this;
  }

  delete(ref: MockDocumentReference): MockBatch {
    this.operations.push({ type: 'delete', ref });
    return this;
  }

  async commit(): Promise<void> {
    for (const op of this.operations) {
      switch (op.type) {
        case 'set':
          await op.ref.set(op.data);
          break;
        case 'update':
          await op.ref.update(op.data);
          break;
        case 'delete':
          await op.ref.delete();
          break;
      }
    }
    this.operations = [];
  }
}

/**
 * Mock Firestore Transaction
 */
export class MockTransaction {
  private operations: Array<{ type: string; ref: MockDocumentReference; data?: any }> = [];

  async get(ref: MockDocumentReference): Promise<MockDocumentSnapshot> {
    return ref.get();
  }

  set(ref: MockDocumentReference, data: any): MockTransaction {
    this.operations.push({ type: 'set', ref, data });
    return this;
  }

  update(ref: MockDocumentReference, data: any): MockTransaction {
    this.operations.push({ type: 'update', ref, data });
    return this;
  }

  delete(ref: MockDocumentReference): MockTransaction {
    this.operations.push({ type: 'delete', ref });
    return this;
  }

  async commit(): Promise<void> {
    for (const op of this.operations) {
      switch (op.type) {
        case 'set':
          await op.ref.set(op.data);
          break;
        case 'update':
          await op.ref.update(op.data);
          break;
        case 'delete':
          await op.ref.delete();
          break;
      }
    }
    this.operations = [];
  }
}

/**
 * Mock Firestore Timestamp
 */
export class MockTimestamp {
  constructor(
    public seconds: number,
    public nanoseconds: number = 0
  ) {}

  static now(): MockTimestamp {
    const now = Date.now();
    return new MockTimestamp(Math.floor(now / 1000), (now % 1000) * 1000000);
  }

  static fromDate(date: Date): MockTimestamp {
    const ms = date.getTime();
    return new MockTimestamp(Math.floor(ms / 1000), (ms % 1000) * 1000000);
  }

  toDate(): Date {
    return new Date(this.seconds * 1000 + this.nanoseconds / 1000000);
  }

  toMillis(): number {
    return this.seconds * 1000 + this.nanoseconds / 1000000;
  }
}

/**
 * Mock Firestore
 */
export class MockFirestore {
  private collections: Map<string, MockCollectionReference> = new Map();

  collection(path: string): MockCollectionReference {
    if (!this.collections.has(path)) {
      this.collections.set(path, new MockCollectionReference());
    }
    return this.collections.get(path)!;
  }

  doc(path: string): MockDocumentReference {
    const pathParts = path.split('/');
    if (pathParts.length % 2 !== 0) {
      throw new Error('Document path must have even number of segments');
    }

    let current: any = this;
    for (let i = 0; i < pathParts.length; i += 2) {
      const collectionId = pathParts[i];
      const docId = pathParts[i + 1];
      current = current.collection(collectionId).doc(docId);
    }

    return current;
  }

  batch(): MockBatch {
    return new MockBatch();
  }

  async runTransaction<T>(updateFunction: (transaction: MockTransaction) => Promise<T>): Promise<T> {
    const transaction = new MockTransaction();
    const result = await updateFunction(transaction);
    await transaction.commit();
    return result;
  }

  static get Timestamp() {
    return MockTimestamp;
  }
}

/**
 * Mock Firebase Auth User Record
 */
export class MockUserRecord {
  constructor(
    public uid: string,
    public email?: string,
    public displayName?: string,
    public customClaims?: any
  ) {}

  toJSON(): any {
    return {
      uid: this.uid,
      email: this.email,
      displayName: this.displayName,
      customClaims: this.customClaims,
    };
  }
}

/**
 * Mock Firebase Auth
 */
export class MockAuth {
  private users: Map<string, MockUserRecord> = new Map();
  private customTokens: Map<string, string> = new Map();

  async createUser(properties: {
    uid?: string;
    email?: string;
    password?: string;
    displayName?: string;
  }): Promise<MockUserRecord> {
    const uid = properties.uid || `mock-uid-${Date.now()}`;
    const user = new MockUserRecord(uid, properties.email, properties.displayName);
    this.users.set(uid, user);
    return user;
  }

  async getUser(uid: string): Promise<MockUserRecord> {
    const user = this.users.get(uid);
    if (!user) {
      throw new Error(`User not found: ${uid}`);
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<MockUserRecord> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    throw new Error(`User not found: ${email}`);
  }

  async updateUser(uid: string, properties: any): Promise<MockUserRecord> {
    const user = await this.getUser(uid);
    Object.assign(user, properties);
    return user;
  }

  async deleteUser(uid: string): Promise<void> {
    this.users.delete(uid);
  }

  async setCustomUserClaims(uid: string, customClaims: any): Promise<void> {
    const user = await this.getUser(uid);
    user.customClaims = customClaims;
  }

  async createCustomToken(uid: string, developerClaims?: any): Promise<string> {
    const token = `mock-token-${uid}-${Date.now()}`;
    this.customTokens.set(token, uid);
    return token;
  }

  async verifyIdToken(idToken: string): Promise<any> {
    const uid = this.customTokens.get(idToken);
    if (!uid) {
      throw new Error('Invalid token');
    }
    const user = await this.getUser(uid);
    return {
      uid: user.uid,
      email: user.email,
      ...user.customClaims,
    };
  }

  async listUsers(maxResults?: number): Promise<{ users: MockUserRecord[] }> {
    const users = Array.from(this.users.values());
    return {
      users: maxResults ? users.slice(0, maxResults) : users,
    };
  }
}

/**
 * Mock Firebase Admin
 */
export class MockFirebaseAdmin {
  private _firestore: MockFirestore;
  private _auth: MockAuth;

  constructor() {
    this._firestore = new MockFirestore();
    this._auth = new MockAuth();
  }

  firestore(): MockFirestore {
    return this._firestore;
  }

  auth(): MockAuth {
    return this._auth;
  }

  static get firestore() {
    return {
      Timestamp: MockTimestamp,
    };
  }
}

/**
 * Create mock Firebase functions for testing
 */
export function createMockFirebaseFunctions() {
  const mockFirebaseAdmin = new MockFirebaseAdmin();

  return {
    // Mock admin SDK
    admin: {
      firestore: () => mockFirebaseAdmin.firestore(),
      auth: () => mockFirebaseAdmin.auth(),
      firestore: {
        Timestamp: MockTimestamp,
      },
    },

    // Mock functions framework
    https: {
      onCall: jest.fn((handler) => handler),
      onRequest: jest.fn((handler) => handler),
    },

    // Mock logger
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },

    // Mock config
    config: jest.fn(() => ({
      project: {
        id: 'test-project',
      },
    })),
  };
}

/**
 * Setup Firebase mocks for Jest
 */
export function setupFirebaseMocks() {
  const mocks = createMockFirebaseFunctions();

  // Mock Firebase Admin
  jest.mock('firebase-admin', () => mocks.admin);

  // Mock Firebase Functions
  jest.mock('firebase-functions', () => ({
    https: mocks.https,
    logger: mocks.logger,
    config: mocks.config,
  }));

  return mocks;
}

/**
 * Reset all Firebase mocks
 */
export function resetFirebaseMocks() {
  jest.clearAllMocks();
}

/**
 * Mock data generators for testing
 */
export class MockDataGenerator {
  static createMockUser(overrides: any = {}): any {
    return {
      uid: `mock-uid-${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      walletBalance: 0,
      isActivated: false,
      status: 'pending',
      rank: null,
      sponsorId: null,
      placementId: null,
      createdAt: MockTimestamp.now(),
      updatedAt: MockTimestamp.now(),
      ...overrides,
    };
  }

  static createMockRank(overrides: any = {}): any {
    return {
      id: 'starter',
      name: 'Starter',
      level: 1,
      activationFee: 100,
      benefits: ['Basic benefits'],
      requirements: ['Activate with $100'],
      createdAt: MockTimestamp.now(),
      ...overrides,
    };
  }

  static createMockTransaction(overrides: any = {}): any {
    return {
      id: `mock-tx-${Date.now()}`,
      userId: `mock-uid-${Date.now()}`,
      type: 'activation',
      amount: 100,
      status: 'completed',
      createdAt: MockTimestamp.now(),
      updatedAt: MockTimestamp.now(),
      ...overrides,
    };
  }

  static createMockIncome(overrides: any = {}): any {
    return {
      id: `mock-income-${Date.now()}`,
      userId: `mock-uid-${Date.now()}`,
      fromUserId: `mock-uid-${Date.now()}`,
      type: 'referral',
      amount: 25,
      level: 1,
      createdAt: MockTimestamp.now(),
      ...overrides,
    };
  }

  static createMockWithdrawal(overrides: any = {}): any {
    return {
      id: `mock-withdrawal-${Date.now()}`,
      userId: `mock-uid-${Date.now()}`,
      amount: 100,
      method: 'bank_transfer',
      status: 'pending',
      requestedAt: MockTimestamp.now(),
      updatedAt: MockTimestamp.now(),
      ...overrides,
    };
  }
}

export default {
  MockFirestore,
  MockAuth,
  MockFirebaseAdmin,
  MockTimestamp,
  MockDocumentReference,
  MockCollectionReference,
  MockQuery,
  MockBatch,
  MockTransaction,
  createMockFirebaseFunctions,
  setupFirebaseMocks,
  resetFirebaseMocks,
  MockDataGenerator,
};