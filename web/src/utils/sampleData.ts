import { initializeSampleData, createMLMUser } from '../services/firestoreService';

export const initializeMLMPlatform = async (): Promise<void> => {
  try {
    // Initialize sample ranks and settings
    await initializeSampleData();
    
    // Create sample test user
    await createMLMUser({
      uid: 'uid_test_user',
      email: 'testuser@gmail.com',
      contact: '+91-9876543210',
      displayName: 'Test User',
      walletAddress: '0xABCDEF123456789012345678901234567890ABCD',
      sponsorId: null
    });

    console.log('Sample MLM data initialized successfully');
  } catch (error) {
    console.error('Error initializing sample data:', error);
  }
};

// Sample ranks data for reference
export const sampleRanks = [
  {
    name: 'Azurite',
    order: 1,
    activationAmount: 5,
    investment: 5,
    globalReceivedIncome: 70,
    color: '#3B82F6'
  },
  {
    name: 'Benitoite',
    order: 2,
    activationAmount: 10,
    investment: 10,
    globalReceivedIncome: 140,
    color: '#10B981'
  },
  {
    name: 'Crystals',
    order: 3,
    activationAmount: 25,
    investment: 25,
    globalReceivedIncome: 350,
    color: '#F59E0B'
  },
  {
    name: 'Diamond',
    order: 4,
    activationAmount: 50,
    investment: 50,
    globalReceivedIncome: 700,
    color: '#EF4444'
  },
  {
    name: 'Emerald',
    order: 5,
    activationAmount: 100,
    investment: 100,
    globalReceivedIncome: 1400,
    color: '#8B5CF6'
  },
  {
    name: 'Fluorite',
    order: 6,
    activationAmount: 250,
    investment: 250,
    globalReceivedIncome: 3500,
    color: '#EC4899'
  },
  {
    name: 'Garnet',
    order: 7,
    activationAmount: 500,
    investment: 500,
    globalReceivedIncome: 7000,
    color: '#14B8A6'
  },
  {
    name: 'Hematite',
    order: 8,
    activationAmount: 1000,
    investment: 1000,
    globalReceivedIncome: 14000,
    color: '#F97316'
  },
  {
    name: 'Iolite',
    order: 9,
    activationAmount: 2500,
    investment: 2500,
    globalReceivedIncome: 35000,
    color: '#6366F1'
  },
  {
    name: 'Jeremejevite',
    order: 10,
    activationAmount: 5000,
    investment: 5000,
    globalReceivedIncome: 70000,
    color: '#DC2626'
  }
];

export const mlmFeatures = [
  'Referral Commission (50%)',
  'Level Income (L1: 5%, L2: 4%, L3: 3%, L4-L6: 1%)',
  'Global Income Distribution',
  'Auto Top-Up System',
  'Rank Upgrades',
  'RE-ID Generation',
  'Withdrawal System (15% fee)',
  'P2P Transfers',
  'Fund Conversion'
];