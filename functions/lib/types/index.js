"use strict";
/**
 * TypeScript Interfaces and Types for MLM Platform
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogCategory = exports.GlobalCycleStatus = exports.PayoutStatus = exports.WithdrawalStatus = exports.IncomeType = exports.PaymentMethod = exports.TransactionStatus = exports.TransactionType = exports.UserStatus = void 0;
// ============================================================================
// ENUMS
// ============================================================================
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "active";
    UserStatus["INACTIVE"] = "inactive";
    UserStatus["SUSPENDED"] = "suspended";
    UserStatus["BLOCKED"] = "blocked";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["ACTIVATION"] = "activation";
    TransactionType["AUTO_TOPUP"] = "auto_topup";
    TransactionType["WITHDRAWAL"] = "withdrawal";
    TransactionType["DEPOSIT"] = "deposit";
    TransactionType["TRANSFER"] = "transfer";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "pending";
    TransactionStatus["PROCESSING"] = "processing";
    TransactionStatus["COMPLETED"] = "completed";
    TransactionStatus["FAILED"] = "failed";
    TransactionStatus["CANCELLED"] = "cancelled";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["USDT_BEP20"] = "usdt_bep20";
    PaymentMethod["FUND_CONVERSION"] = "fund_conversion";
    PaymentMethod["P2P"] = "p2p";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var IncomeType;
(function (IncomeType) {
    IncomeType["REFERRAL"] = "referral";
    IncomeType["LEVEL"] = "level";
    IncomeType["GLOBAL"] = "global";
    IncomeType["RE_TOPUP"] = "re_topup";
})(IncomeType || (exports.IncomeType = IncomeType = {}));
var WithdrawalStatus;
(function (WithdrawalStatus) {
    WithdrawalStatus["PENDING"] = "pending";
    WithdrawalStatus["APPROVED"] = "approved";
    WithdrawalStatus["PROCESSING"] = "processing";
    WithdrawalStatus["COMPLETED"] = "completed";
    WithdrawalStatus["REJECTED"] = "rejected";
})(WithdrawalStatus || (exports.WithdrawalStatus = WithdrawalStatus = {}));
var PayoutStatus;
(function (PayoutStatus) {
    PayoutStatus["PENDING"] = "pending";
    PayoutStatus["CLAIMED"] = "claimed";
    PayoutStatus["EXPIRED"] = "expired";
})(PayoutStatus || (exports.PayoutStatus = PayoutStatus = {}));
var GlobalCycleStatus;
(function (GlobalCycleStatus) {
    GlobalCycleStatus["ACTIVE"] = "active";
    GlobalCycleStatus["COMPLETED"] = "completed";
})(GlobalCycleStatus || (exports.GlobalCycleStatus = GlobalCycleStatus = {}));
var LogCategory;
(function (LogCategory) {
    LogCategory["AUTH"] = "auth";
    LogCategory["TRANSACTION"] = "transaction";
    LogCategory["INCOME"] = "income";
    LogCategory["WITHDRAWAL"] = "withdrawal";
    LogCategory["SYSTEM"] = "system";
    LogCategory["ERROR"] = "error";
})(LogCategory || (exports.LogCategory = LogCategory = {}));
// ============================================================================
// EXPORT ALL TYPES
// ============================================================================
__exportStar(require("./index"), exports);
//# sourceMappingURL=index.js.map