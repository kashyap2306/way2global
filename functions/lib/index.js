"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsHandler = exports.healthCheck = exports.updatePlatformSettingsHttp = exports.getPlatformSettingsHttp = exports.updatePlatformSettings = exports.getPlatformSettings = exports.activateRankHttp = exports.activateRank = exports.claimLockedIncome = exports.manualPoolIncomeGeneration = exports.autoPoolIncomeGenerator = exports.onActivationTxCreated = exports.onUserCreated = exports.seedDatabase = exports.claimPayout = exports.requestWithdrawal = exports.createActivation = exports.getUserData = exports.login = exports.signup = exports.userHandlers = exports.adminHandlers = exports.authHandlers = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin SDK
admin.initializeApp();
// Export HTTP handlers
var authHandlers_1 = require("./handlers/authHandlers");
Object.defineProperty(exports, "authHandlers", { enumerable: true, get: function () { return authHandlers_1.authHandlers; } });
var adminHandlers_1 = require("./handlers/adminHandlers");
Object.defineProperty(exports, "adminHandlers", { enumerable: true, get: function () { return adminHandlers_1.adminHandlers; } });
var userHandlers_1 = require("./handlers/userHandlers");
Object.defineProperty(exports, "userHandlers", { enumerable: true, get: function () { return userHandlers_1.userHandlers; } });
// Callable Functions
var signup_1 = require("./callable/signup");
Object.defineProperty(exports, "signup", { enumerable: true, get: function () { return signup_1.signup; } });
var login_1 = require("./callable/login");
Object.defineProperty(exports, "login", { enumerable: true, get: function () { return login_1.login; } });
var getUserData_1 = require("./callable/getUserData");
Object.defineProperty(exports, "getUserData", { enumerable: true, get: function () { return getUserData_1.getUserData; } });
var createActivation_1 = require("./callable/createActivation");
Object.defineProperty(exports, "createActivation", { enumerable: true, get: function () { return createActivation_1.createActivation; } });
var requestWithdrawal_1 = require("./callable/requestWithdrawal");
Object.defineProperty(exports, "requestWithdrawal", { enumerable: true, get: function () { return requestWithdrawal_1.requestWithdrawal; } });
var claimPayout_1 = require("./callable/claimPayout");
Object.defineProperty(exports, "claimPayout", { enumerable: true, get: function () { return claimPayout_1.claimPayout; } });
var seedDatabase_1 = require("./callable/seedDatabase");
Object.defineProperty(exports, "seedDatabase", { enumerable: true, get: function () { return seedDatabase_1.seedDatabase; } });
// Export Firestore triggers
var onUserCreated_1 = require("./triggers/onUserCreated");
Object.defineProperty(exports, "onUserCreated", { enumerable: true, get: function () { return onUserCreated_1.onUserCreated; } });
var onActivationTxCreated_1 = require("./triggers/onActivationTxCreated");
Object.defineProperty(exports, "onActivationTxCreated", { enumerable: true, get: function () { return onActivationTxCreated_1.onActivationTxCreated; } });
// Export scheduled functions
// export { scheduledGlobalCycle } from './triggers/scheduledGlobalCycle';
var autoPoolIncomeGenerator_1 = require("./triggers/autoPoolIncomeGenerator");
Object.defineProperty(exports, "autoPoolIncomeGenerator", { enumerable: true, get: function () { return autoPoolIncomeGenerator_1.autoPoolIncomeGenerator; } });
Object.defineProperty(exports, "manualPoolIncomeGeneration", { enumerable: true, get: function () { return autoPoolIncomeGenerator_1.manualPoolIncomeGeneration; } });
// Export new API endpoints
var claimLockedIncome_1 = require("./api/claimLockedIncome");
Object.defineProperty(exports, "claimLockedIncome", { enumerable: true, get: function () { return claimLockedIncome_1.claimLockedIncome; } });
var activateRank_1 = require("./api/activateRank");
Object.defineProperty(exports, "activateRank", { enumerable: true, get: function () { return activateRank_1.activateRank; } });
Object.defineProperty(exports, "activateRankHttp", { enumerable: true, get: function () { return activateRank_1.activateRankHttp; } });
var platformSettings_1 = require("./api/platformSettings");
Object.defineProperty(exports, "getPlatformSettings", { enumerable: true, get: function () { return platformSettings_1.getPlatformSettings; } });
Object.defineProperty(exports, "updatePlatformSettings", { enumerable: true, get: function () { return platformSettings_1.updatePlatformSettings; } });
Object.defineProperty(exports, "getPlatformSettingsHttp", { enumerable: true, get: function () { return platformSettings_1.getPlatformSettingsHttp; } });
Object.defineProperty(exports, "updatePlatformSettingsHttp", { enumerable: true, get: function () { return platformSettings_1.updatePlatformSettingsHttp; } });
// Health check endpoint
exports.healthCheck = functions.https.onRequest((req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});
// CORS preflight handler
exports.corsHandler = functions.https.onRequest((req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
    }
    else {
        res.status(405).send('Method Not Allowed');
    }
});
//# sourceMappingURL=index.js.map