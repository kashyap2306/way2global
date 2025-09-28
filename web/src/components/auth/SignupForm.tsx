import React, { useState } from 'react';

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    contact: '',
    password: '',
    confirmPassword: '',
    walletAddress: '',
    sponsorId: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const validateForm = async (): Promise<boolean> => {
    const newErrors: { [key: string]: string } = {};

    // Name validation
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Full name is required';
    }

    // Email validation (must be Gmail)
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!formData.email.endsWith('@gmail.com')) {
      newErrors.email = 'Only Gmail addresses are allowed';
    }

    // Contact validation
    if (!formData.contact) {
      newErrors.contact = 'Contact number is required';
    } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(formData.contact)) {
      newErrors.contact = 'Please enter a valid contact number';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Wallet address validation
    if (!formData.walletAddress) {
      newErrors.walletAddress = 'Wallet address is required';
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(formData.walletAddress)) {
      newErrors.walletAddress = 'Please enter a valid wallet address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (await validateForm()) {
        // Use the Firebase callable function for signup
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions();
        const signupFunction = httpsCallable(functions, 'signup');
        
        const result = await signupFunction({
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName,
          contact: formData.contact,
          walletAddress: formData.walletAddress,
          sponsorId: formData.sponsorId || null
        });

        console.log('User created successfully:', result.data);
        
        // The callable function handles both Firebase Auth and Firestore user creation
        // No need to call createMLMUser separately
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setErrors({ general: error.message || 'Failed to create account. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-white">
            Join Way2Globe Wave
          </h2>
          <p className="mt-2 text-center text-sm text-slate-300">
            Create your MLM account
          </p>
        </div>
        <form className="mt-8 space-y-6 bg-gradient-to-br from-slate-800 via-slate-900 to-blue-900 p-6 sm:p-8 rounded-xl shadow-2xl backdrop-blur-sm border border-slate-700/50" onSubmit={handleSubmit}>
          {errors.general && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg backdrop-blur-sm">
              {errors.general}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-white">
                Full Name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-slate-600 placeholder-slate-400 text-white rounded-lg bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm backdrop-blur-sm"
                placeholder="Enter your full name"
                value={formData.displayName}
                onChange={handleInputChange}
              />
              {errors.displayName && <p className="mt-1 text-sm text-red-400">{errors.displayName}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white">
                Gmail Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-slate-600 placeholder-slate-400 text-white rounded-lg bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm backdrop-blur-sm"
                placeholder="your.email@gmail.com"
                value={formData.email}
                onChange={handleInputChange}
              />
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="contact" className="block text-sm font-medium text-white">
                Contact Number
              </label>
              <input
                id="contact"
                name="contact"
                type="tel"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-slate-600 placeholder-slate-400 text-white rounded-lg bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm backdrop-blur-sm"
                placeholder="+91-9876543210"
                value={formData.contact}
                onChange={handleInputChange}
              />
              {errors.contact && <p className="mt-1 text-sm text-red-400">{errors.contact}</p>}
            </div>

            <div>
              <label htmlFor="walletAddress" className="block text-sm font-medium text-white">
                Wallet Address (USDT BEP20)
              </label>
              <input
                id="walletAddress"
                name="walletAddress"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-slate-600 placeholder-slate-400 text-white rounded-lg bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm backdrop-blur-sm"
                placeholder="0xABCDEF123456..."
                value={formData.walletAddress}
                onChange={handleInputChange}
              />
              {errors.walletAddress && <p className="mt-1 text-sm text-red-400">{errors.walletAddress}</p>}
            </div>

            <div>
              <label htmlFor="sponsorId" className="block text-sm font-medium text-white">
                Sponsor ID (Optional)
              </label>
              <input
                id="sponsorId"
                name="sponsorId"
                type="text"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-slate-600 placeholder-slate-400 text-white rounded-lg bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm backdrop-blur-sm"
                placeholder="Enter sponsor's user ID"
                value={formData.sponsorId}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-slate-600 placeholder-slate-400 text-white rounded-lg bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm backdrop-blur-sm"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
              />
              {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-slate-600 placeholder-slate-400 text-white rounded-lg bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm backdrop-blur-sm"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
              />
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors duration-300"
            >
              Already have an account? Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupForm;