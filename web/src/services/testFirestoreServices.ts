import {
  createMLMUser,
  getMLMUser,
  checkEmailExists,
  checkContactExists,
  createTopUpTransaction,
  createReTopUpTransaction,
  createActivationTransaction,
  createReferralIncome,
  createLevelIncome,
  createGlobalIncome,
  createIncomeTransaction,
  createWithdrawal,
  updateWithdrawalStatus,
  getSettings,
  updateSettings,
  createPayoutQueue,
  updatePayoutQueueStatus,
  createAdmin,
  getAdmin,
  createAuditLog,
  createOrUpdateCycle,
  getCycle,
  initializeSampleData,
  processTopUp,
  processWithdrawal,
  type MLMUser
} from './firestoreService';

// Test configuration
const TEST_USER_ID = 'test_user_123';
const TEST_SPONSOR_ID = 'test_sponsor_456';
const TEST_ADMIN_ID = 'test_admin_789';

/**
 * Comprehensive test suite for all Firebase services
 */
export class FirestoreServiceTester {
  private testResults: { [key: string]: boolean } = {};
  private errors: { [key: string]: string } = {};

  /**
   * Run all tests
   */
  async runAllTests(): Promise<{ success: boolean; results: any; errors: any }> {
    console.log('🚀 Starting Firestore Services Test Suite...\n');

    try {
      // Initialize sample data first
      await this.testInitializeSampleData();
      
      // Test user services
      await this.testUserServices();
      
      // Test transaction services
      await this.testTransactionServices();
      
      // Test income services
      await this.testIncomeServices();
      
      // Test income transaction services
      await this.testIncomeTransactionServices();
      
      // Test withdrawal services
      await this.testWithdrawalServices();
      
      // Test settings services
      await this.testSettingsServices();
      
      // Test payout queue services
      await this.testPayoutQueueServices();
      
      // Test admin services
      await this.testAdminServices();
      
      // Test audit log services
      await this.testAuditLogServices();
      
      // Test cycle services
      await this.testCycleServices();
      
      // Test workflow functions
      await this.testWorkflowFunctions();
      
      // Print results
      this.printResults();
      
      const successCount = Object.values(this.testResults).filter(Boolean).length;
      const totalTests = Object.keys(this.testResults).length;
      
      return {
        success: successCount === totalTests,
        results: this.testResults,
        errors: this.errors
      };
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      return {
        success: false,
        results: this.testResults,
        errors: { ...this.errors, general: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async testInitializeSampleData(): Promise<void> {
    try {
      console.log('📊 Testing sample data initialization...');
      await initializeSampleData();
      this.testResults['initializeSampleData'] = true;
      console.log('✅ Sample data initialized successfully\n');
    } catch (error) {
      this.testResults['initializeSampleData'] = false;
      this.errors['initializeSampleData'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Sample data initialization failed\n');
    }
  }

  private async testUserServices(): Promise<void> {
    console.log('👤 Testing User Services...');
    
    // Test user creation
    try {
      const userData: Partial<MLMUser> = {
        uid: TEST_USER_ID,
        email: 'test@example.com',
        contact: '+1234567890',
        displayName: 'Test User',
        walletAddress: '0x123...abc',
        sponsorId: TEST_SPONSOR_ID
      };
      
      await createMLMUser(userData);
      this.testResults['createMLMUser'] = true;
      console.log('✅ User creation successful');
    } catch (error) {
      this.testResults['createMLMUser'] = false;
      this.errors['createMLMUser'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ User creation failed');
    }

    // Test user retrieval
    try {
      const user = await getMLMUser(TEST_USER_ID);
      this.testResults['getMLMUser'] = user !== null && user.uid === TEST_USER_ID;
      console.log('✅ User retrieval successful');
    } catch (error) {
      this.testResults['getMLMUser'] = false;
      this.errors['getMLMUser'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ User retrieval failed');
    }

    // Test email existence check
    try {
      const exists = await checkEmailExists('test@example.com');
      this.testResults['checkEmailExists'] = exists === true;
      console.log('✅ Email existence check successful');
    } catch (error) {
      this.testResults['checkEmailExists'] = false;
      this.errors['checkEmailExists'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Email existence check failed');
    }

    // Test contact existence check
    try {
      const exists = await checkContactExists('+1234567890');
      this.testResults['checkContactExists'] = exists === true;
      console.log('✅ Contact existence check successful\n');
    } catch (error) {
      this.testResults['checkContactExists'] = false;
      this.errors['checkContactExists'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Contact existence check failed\n');
    }
  }

  private async testTransactionServices(): Promise<void> {
    console.log('💰 Testing Transaction Services...');
    
    // Test TopUp transaction
    try {
      const txId = await createTopUpTransaction(TEST_USER_ID, 100);
      this.testResults['createTopUpTransaction'] = typeof txId === 'string' && txId.length > 0;
      console.log('✅ TopUp transaction creation successful');
    } catch (error) {
      this.testResults['createTopUpTransaction'] = false;
      this.errors['createTopUpTransaction'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ TopUp transaction creation failed');
    }

    // Test Re-TopUp transaction
    try {
      const txId = await createReTopUpTransaction(TEST_USER_ID, 50);
      this.testResults['createReTopUpTransaction'] = typeof txId === 'string' && txId.length > 0;
      console.log('✅ Re-TopUp transaction creation successful');
    } catch (error) {
      this.testResults['createReTopUpTransaction'] = false;
      this.errors['createReTopUpTransaction'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Re-TopUp transaction creation failed');
    }

    // Test Activation transaction
    try {
      const txId = await createActivationTransaction(TEST_USER_ID, 5);
      this.testResults['createActivationTransaction'] = typeof txId === 'string' && txId.length > 0;
      console.log('✅ Activation transaction creation successful\n');
    } catch (error) {
      this.testResults['createActivationTransaction'] = false;
      this.errors['createActivationTransaction'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Activation transaction creation failed\n');
    }
  }

  private async testIncomeServices(): Promise<void> {
    console.log('💵 Testing Income Services...');
    
    // Test Referral income
    try {
      const incomeId = await createReferralIncome(TEST_USER_ID, 25, 'Azurite', 1, TEST_SPONSOR_ID);
      this.testResults['createReferralIncome'] = typeof incomeId === 'string' && incomeId.length > 0;
      console.log('✅ Referral income creation successful');
    } catch (error) {
      this.testResults['createReferralIncome'] = false;
      this.errors['createReferralIncome'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Referral income creation failed');
    }

    // Test Level income
    try {
      const incomeId = await createLevelIncome(TEST_USER_ID, 15, 'Azurite', 1, 2, TEST_SPONSOR_ID);
      this.testResults['createLevelIncome'] = typeof incomeId === 'string' && incomeId.length > 0;
      console.log('✅ Level income creation successful');
    } catch (error) {
      this.testResults['createLevelIncome'] = false;
      this.errors['createLevelIncome'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Level income creation failed');
    }

    // Test Global income
    try {
      const incomeId = await createGlobalIncome(TEST_USER_ID, 10, 'Azurite', 1);
      this.testResults['createGlobalIncome'] = typeof incomeId === 'string' && incomeId.length > 0;
      console.log('✅ Global income creation successful\n');
    } catch (error) {
      this.testResults['createGlobalIncome'] = false;
      this.errors['createGlobalIncome'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Global income creation failed\n');
    }
  }

  private async testIncomeTransactionServices(): Promise<void> {
    console.log('📈 Testing Income Transaction Services...');
    
    try {
      const itxId = await createIncomeTransaction({
        itxId: `itx_test_${Date.now()}`,
        userId: TEST_USER_ID,
        type: 'referral',
        amount: 25,
        currency: 'USDT_BEP20',
        rank: 'Azurite',
        cycle: 1,
        sourceUserId: TEST_SPONSOR_ID,
        notes: 'Test referral commission',
        processedBy: 'system'
      });
      
      this.testResults['createIncomeTransaction'] = typeof itxId === 'string' && itxId.length > 0;
      console.log('✅ Income transaction creation successful\n');
    } catch (error) {
      this.testResults['createIncomeTransaction'] = false;
      this.errors['createIncomeTransaction'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Income transaction creation failed\n');
    }
  }

  private async testWithdrawalServices(): Promise<void> {
    console.log('💸 Testing Withdrawal Services...');
    
    // Test withdrawal creation
    try {
      const withdrawalId = await createWithdrawal({
        withdrawalId: `wd_test_${Date.now()}`,
        userId: TEST_USER_ID,
        amountRequested: 100,
        feePercent: 15,
        amountAfterFee: 85,
        currency: 'USDT_BEP20',
        status: 'pending'
      });
      
      this.testResults['createWithdrawal'] = typeof withdrawalId === 'string' && withdrawalId.length > 0;
      console.log('✅ Withdrawal creation successful');
      
      // Test withdrawal status update
      await updateWithdrawalStatus(withdrawalId, 'approved', 'admin_test', 'Approved for processing');
      this.testResults['updateWithdrawalStatus'] = true;
      console.log('✅ Withdrawal status update successful\n');
    } catch (error) {
      this.testResults['createWithdrawal'] = false;
      this.testResults['updateWithdrawalStatus'] = false;
      this.errors['withdrawalServices'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Withdrawal services failed\n');
    }
  }

  private async testSettingsServices(): Promise<void> {
    console.log('⚙️ Testing Settings Services...');
    
    // Test settings retrieval
    try {
      const settings = await getSettings();
      this.testResults['getSettings'] = settings !== null && typeof settings.minWithdrawal === 'number';
      console.log('✅ Settings retrieval successful');
    } catch (error) {
      this.testResults['getSettings'] = false;
      this.errors['getSettings'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Settings retrieval failed');
    }

    // Test settings update
    try {
      await updateSettings({
        minWithdrawal: 15,
        withdrawalFeePercent: 12
      });
      this.testResults['updateSettings'] = true;
      console.log('✅ Settings update successful\n');
    } catch (error) {
      this.testResults['updateSettings'] = false;
      this.errors['updateSettings'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Settings update failed\n');
    }
  }

  private async testPayoutQueueServices(): Promise<void> {
    console.log('🔄 Testing Payout Queue Services...');
    
    try {
      const queueId = await createPayoutQueue({
        queueId: `pq_test_${Date.now()}`,
        userId: TEST_USER_ID,
        amount: 85,
        currency: 'USDT_BEP20',
        status: 'queued',
        attempts: 0
      });
      
      this.testResults['createPayoutQueue'] = typeof queueId === 'string' && queueId.length > 0;
      console.log('✅ Payout queue creation successful');
      
      // Test payout queue status update
      await updatePayoutQueueStatus(queueId, 'processing');
      this.testResults['updatePayoutQueueStatus'] = true;
      console.log('✅ Payout queue status update successful\n');
    } catch (error) {
      this.testResults['createPayoutQueue'] = false;
      this.testResults['updatePayoutQueueStatus'] = false;
      this.errors['payoutQueueServices'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Payout queue services failed\n');
    }
  }

  private async testAdminServices(): Promise<void> {
    console.log('👨‍💼 Testing Admin Services...');
    
    // Test admin creation
    try {
      await createAdmin({
        adminId: TEST_ADMIN_ID,
        email: 'testadmin@example.com',
        name: 'Test Admin',
        role: 'admin',
        permissions: ['manageUsers', 'approveWithdrawals'],
        status: 'active'
      });
      this.testResults['createAdmin'] = true;
      console.log('✅ Admin creation successful');
    } catch (error) {
      this.testResults['createAdmin'] = false;
      this.errors['createAdmin'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Admin creation failed');
    }

    // Test admin retrieval
    try {
      const admin = await getAdmin(TEST_ADMIN_ID);
      this.testResults['getAdmin'] = admin !== null && admin.adminId === TEST_ADMIN_ID;
      console.log('✅ Admin retrieval successful\n');
    } catch (error) {
      this.testResults['getAdmin'] = false;
      this.errors['getAdmin'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Admin retrieval failed\n');
    }
  }

  private async testAuditLogServices(): Promise<void> {
    console.log('📝 Testing Audit Log Services...');
    
    try {
      const logId = await createAuditLog({
        logId: `log_test_${Date.now()}`,
        actorId: TEST_USER_ID,
        action: 'test_action',
        target: { type: 'user', id: TEST_USER_ID },
        details: 'Test audit log entry'
      });
      
      this.testResults['createAuditLog'] = typeof logId === 'string' && logId.length > 0;
      console.log('✅ Audit log creation successful\n');
    } catch (error) {
      this.testResults['createAuditLog'] = false;
      this.errors['createAuditLog'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Audit log creation failed\n');
    }
  }

  private async testCycleServices(): Promise<void> {
    console.log('🔄 Testing Cycle Services...');
    
    // Test cycle creation/update
    try {
      await createOrUpdateCycle('TestRank', {
        currentCycle: 1,
        completedCount: 0,
        perLevelCounts: [0, 0, 0, 0, 0, 0]
      });
      this.testResults['createOrUpdateCycle'] = true;
      console.log('✅ Cycle creation/update successful');
    } catch (error) {
      this.testResults['createOrUpdateCycle'] = false;
      this.errors['createOrUpdateCycle'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Cycle creation/update failed');
    }

    // Test cycle retrieval
    try {
      const cycle = await getCycle('TestRank');
      this.testResults['getCycle'] = cycle !== null && cycle.rank === 'TestRank';
      console.log('✅ Cycle retrieval successful\n');
    } catch (error) {
      this.testResults['getCycle'] = false;
      this.errors['getCycle'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ Cycle retrieval failed\n');
    }
  }

  private async testWorkflowFunctions(): Promise<void> {
    console.log('🔄 Testing Workflow Functions...');
    
    // Test processTopUp workflow
    try {
      const result = await processTopUp(TEST_USER_ID, 100);
      this.testResults['processTopUp'] = typeof result.transactionId === 'string' && result.transactionId.length > 0;
      console.log('✅ ProcessTopUp workflow successful');
    } catch (error) {
      this.testResults['processTopUp'] = false;
      this.errors['processTopUp'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ ProcessTopUp workflow failed');
    }

    // Test processWithdrawal workflow
    try {
      const result = await processWithdrawal(TEST_USER_ID, 50);
      this.testResults['processWithdrawal'] = typeof result.withdrawalId === 'string' && typeof result.payoutQueueId === 'string';
      console.log('✅ ProcessWithdrawal workflow successful\n');
    } catch (error) {
      this.testResults['processWithdrawal'] = false;
      this.errors['processWithdrawal'] = error instanceof Error ? error.message : 'Unknown error';
      console.log('❌ ProcessWithdrawal workflow failed\n');
    }
  }

  private printResults(): void {
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('========================\n');
    
    const passed = Object.entries(this.testResults).filter(([_, result]) => result);
    const failed = Object.entries(this.testResults).filter(([_, result]) => !result);
    
    console.log(`✅ Passed: ${passed.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`📈 Success Rate: ${((passed.length / Object.keys(this.testResults).length) * 100).toFixed(1)}%\n`);
    
    if (failed.length > 0) {
      console.log('❌ FAILED TESTS:');
      failed.forEach(([testName]) => {
        console.log(`  - ${testName}: ${this.errors[testName] || 'Unknown error'}`);
      });
      console.log();
    }
    
    console.log('✅ PASSED TESTS:');
    passed.forEach(([testName]) => {
      console.log(`  - ${testName}`);
    });
    console.log();
  }
}

// Export test runner function
export const runFirestoreTests = async (): Promise<{ success: boolean; results: any; errors: any }> => {
  const tester = new FirestoreServiceTester();
  return await tester.runAllTests();
};

// For direct execution
if (typeof window === 'undefined') {
  // Node.js environment - can be run directly
  console.log('Firestore Services Test Suite ready for execution');
  console.log('Import and call runFirestoreTests() to execute all tests');
}