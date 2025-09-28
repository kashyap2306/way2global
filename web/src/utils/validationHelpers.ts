/**
 * Validation Helper Functions
 * Utility functions for form validation and data validation
 */

/**
 * Email validation
 */
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true };
};

/**
 * Gmail specific validation
 */
export const validateGmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: 'Gmail is required' };
  }

  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!gmailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid Gmail address' };
  }

  return { isValid: true };
};

/**
 * Phone number validation
 */
export const validatePhone = (phone: string): { isValid: boolean; error?: string } => {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove all non-digit characters for validation
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length < 10) {
    return { isValid: false, error: 'Phone number must be at least 10 digits' };
  }

  if (cleanPhone.length > 15) {
    return { isValid: false, error: 'Phone number cannot exceed 15 digits' };
  }

  // Check for valid phone pattern (supports international format)
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  if (!phoneRegex.test(phone)) {
    return { isValid: false, error: 'Please enter a valid phone number' };
  }

  return { isValid: true };
};

/**
 * Password validation with strength checking
 */
export const validatePassword = (password: string): { 
  isValid: boolean; 
  error?: string; 
  strength: 'weak' | 'medium' | 'strong' 
} => {
  if (!password) {
    return { isValid: false, error: 'Password is required', strength: 'weak' };
  }

  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters', strength: 'weak' };
  }

  // Calculate password strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  let score = 0;

  // Length check
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1; // lowercase
  if (/[A-Z]/.test(password)) score += 1; // uppercase
  if (/[0-9]/.test(password)) score += 1; // numbers
  if (/[^a-zA-Z0-9]/.test(password)) score += 1; // special characters

  if (score >= 5) strength = 'strong';
  else if (score >= 3) strength = 'medium';

  return { isValid: true, strength };
};

/**
 * Confirm password validation
 */
export const validateConfirmPassword = (
  password: string, 
  confirmPassword: string
): { isValid: boolean; error?: string } => {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password' };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }

  return { isValid: true };
};

/**
 * USDT BEP20 wallet address validation
 */
export const validateWalletAddress = (address: string): { isValid: boolean; error?: string } => {
  if (!address) {
    return { isValid: false, error: 'Wallet address is required' };
  }

  // BEP20 addresses are Ethereum-compatible (42 characters, starts with 0x)
  const bep20Regex = /^0x[a-fA-F0-9]{40}$/;
  if (!bep20Regex.test(address)) {
    return { isValid: false, error: 'Please enter a valid BEP20 wallet address' };
  }

  return { isValid: true };
};

/**
 * Full name validation
 */
export const validateFullName = (name: string): { isValid: boolean; error?: string } => {
  if (!name) {
    return { isValid: false, error: 'Full name is required' };
  }

  if (name.trim().length < 2) {
    return { isValid: false, error: 'Full name must be at least 2 characters' };
  }

  if (name.trim().length > 50) {
    return { isValid: false, error: 'Full name cannot exceed 50 characters' };
  }

  // Check for valid name pattern (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(name)) {
    return { isValid: false, error: 'Full name can only contain letters, spaces, hyphens, and apostrophes' };
  }

  return { isValid: true };
};

/**
 * Sponsor ID validation (optional field)
 */
export const validateSponsorId = (sponsorId: string): { isValid: boolean; error?: string } => {
  if (!sponsorId || sponsorId.trim() === '') {
    return { isValid: true }; // Optional field
  }

  // Sponsor ID should be in format WG123456
  const sponsorIdRegex = /^WG\d{6}$/;
  if (!sponsorIdRegex.test(sponsorId)) {
    return { isValid: false, error: 'Sponsor ID must be in format WG123456' };
  }

  return { isValid: true };
};

/**
 * Amount validation for topup/withdrawal
 */
export const validateAmount = (
  amount: string | number, 
  min: number = 0, 
  max?: number
): { isValid: boolean; error?: string } => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Please enter a valid amount' };
  }

  if (numAmount <= min) {
    return { isValid: false, error: `Amount must be greater than $${min}` };
  }

  if (max && numAmount > max) {
    return { isValid: false, error: `Amount cannot exceed $${max}` };
  }

  // Check for reasonable decimal places (max 2)
  const decimalPlaces = (numAmount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return { isValid: false, error: 'Amount can have maximum 2 decimal places' };
  }

  return { isValid: true };
};

/**
 * Transaction hash validation
 */
export const validateTransactionHash = (hash: string): { isValid: boolean; error?: string } => {
  if (!hash) {
    return { isValid: false, error: 'Transaction hash is required' };
  }

  // Transaction hash should be 64 characters hex string (with or without 0x prefix)
  const hashRegex = /^(0x)?[a-fA-F0-9]{64}$/;
  if (!hashRegex.test(hash)) {
    return { isValid: false, error: 'Please enter a valid transaction hash' };
  }

  return { isValid: true };
};

/**
 * Generate user code (WG + 6 digits)
 * Note: This is a client-side helper. Server-side generation should ensure uniqueness
 */
export const generateUserCode = (): string => {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `WG${randomNum}`;
};

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format based on length
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone; // Return original if can't format
};

/**
 * Check if email or phone number
 */
export const isEmailOrPhone = (input: string): 'email' | 'phone' | 'unknown' => {
  if (input.includes('@')) {
    return 'email';
  }
  
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  if (phoneRegex.test(input)) {
    return 'phone';
  }
  
  return 'unknown';
};

/**
 * Sanitize input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate form data object
 */
export const validateFormData = (
  data: Record<string, any>, 
  rules: Record<string, (value: any) => { isValid: boolean; error?: string }>
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  for (const [field, validator] of Object.entries(rules)) {
    const result = validator(data[field]);
    if (!result.isValid && result.error) {
      errors[field] = result.error;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};