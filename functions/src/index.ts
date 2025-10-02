import * as functions from 'firebase-functions';

// Export HTTP handlers
export { authHandlers } from './handlers/authHandlers';
export { adminHandlers } from './handlers/adminHandlers';
export { userHandlers } from './handlers/userHandlers';

// Callable Functions
export { signup } from './callable/signup';
export { login } from './callable/login';
export { getUserData } from './callable/getUserData';
export { createActivation } from './callable/createActivation';
export { requestWithdrawal } from './callable/requestWithdrawal';
export { claimPayout } from './callable/claimPayout';
export { seedDatabase } from './callable/seedDatabase';
export { transferFunds } from './callable/transferFunds';
export { createFundRequest } from './callable/createFundRequest';
export { approveFundRequest } from './callable/approveFundRequest';
export { rejectFundRequest } from './callable/rejectFundRequest';
export * from './callable/initializeAutopool';

// Export Firestore triggers
export { onUserCreated } from './triggers/onUserCreated';
export { onActivationTxCreated } from './triggers/onActivationTxCreated';

// Export scheduled functions
// export { scheduledGlobalCycle } from './triggers/scheduledGlobalCycle';
export { autoPoolIncomeGenerator, manualPoolIncomeGeneration } from './triggers/autoPoolIncomeGenerator';

// Export new API endpoints
export { claimLockedIncome } from './api/claimLockedIncome';
export { activateRank, activateRankHttp } from './api/activateRank';
export { 
  getPlatformSettings, 
  updatePlatformSettings, 
  getPlatformSettingsHttp, 
  updatePlatformSettingsHttp 
} from './api/platformSettings';

// Health check endpoint
export const healthCheck = functions.https.onRequest((req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// CORS preflight handler
export const corsHandler = functions.https.onRequest((req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
  } else {
    res.status(405).send('Method Not Allowed');
  }
});