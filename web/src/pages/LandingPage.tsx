import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  UserPlusIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon, 
  GlobeAltIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  StarIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface SignupFormData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  walletAddress: string;
  sponsorId: string;
}

const LandingPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<SignupFormData>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    walletAddress: '',
    sponsorId: ''
  });

  // Smooth scroll function
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle form input changes (UI only)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission (UI only - no actual submission)
  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // UI only - redirect to signup page for actual functionality
    window.location.href = '/signup';
  };

  // Get password strength (UI only)
  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return 'weak';
    if (password.length < 10) return 'medium';
    return 'strong';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Way2Globel
              </h1>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => scrollToSection('how-it-works')}
                className="text-slate-300 hover:text-white transition-colors"
              >
                How It Works
              </button>
              <button 
                onClick={() => scrollToSection('plans')}
                className="text-slate-300 hover:text-white transition-colors"
              >
                Plans
              </button>
              <button 
                onClick={() => scrollToSection('income-types')}
                className="text-slate-300 hover:text-white transition-colors"
              >
                Income Types
              </button>
              <button 
                onClick={() => scrollToSection('terms')}
                className="text-slate-300 hover:text-white transition-colors"
              >
                Terms
              </button>
              <button 
                onClick={() => scrollToSection('join-now')}
                className="text-slate-300 hover:text-white transition-colors"
              >
                Join Now
              </button>
            </nav>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-slate-300 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-pink-900/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
            Wave of <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Opportunities</span>,
            <br />At Your Fingertips
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto">
            Join Way2Globel's revolutionary MLM platform and unlock the power of cryptocurrency earnings. 
            Build your network, earn passive income, and achieve financial freedom.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => scrollToSection('join-now')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              Join Now <ArrowRightIcon className="w-5 h-5" />
            </button>
            <Link
              to="/login"
              className="bg-slate-800/50 hover:bg-slate-700/50 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 border border-slate-600/50 hover:border-slate-500/50"
            >
              Login
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Discover the powerful features that make Way2Globel your gateway to financial success
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <CurrencyDollarIcon className="w-12 h-12" />,
                title: "Wallet",
                description: "Store and manage your funds securely with our advanced crypto wallet system"
              },
              {
                icon: <ArrowRightIcon className="w-12 h-12" />,
                title: "Withdrawal",
                description: "Withdraw funds via crypto with ease using our streamlined withdrawal process"
              },
              {
                icon: <ChartBarIcon className="w-12 h-12" />,
                title: "Topup",
                description: "Activate or upgrade plans by topping up with USDT to unlock higher earning potential"
              },
              {
                icon: <UserPlusIcon className="w-12 h-12" />,
                title: "Referral",
                description: "Invite users and earn 50% referral income instantly from their activation"
              },
              {
                icon: <CheckCircleIcon className="w-12 h-12" />,
                title: "Level Income",
                description: "Earn from 6 levels with decreasing percentages: 5%, 4%, 3%, 1%, 1%, 1%"
              },
              {
                icon: <GlobeAltIcon className="w-12 h-12" />,
                title: "Global Income",
                description: "Earn from global reverse matrix based on your rank and network performance"
              }
            ].map((feature, index) => (
              <div key={index} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300 transform hover:scale-105">
                <div className="text-purple-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans/Packages Section */}
      <section id="plans" className="py-20 bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Choose Your Plan
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Select from our 10 rank levels and start earning with our reverse global matrix system
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { rank: 'Azurite', topUp: '$5', totalIncome: '$511.50', color: 'from-blue-500 to-blue-600', popular: false },
              { rank: 'Benitoite', topUp: '$10', totalIncome: '$1023', color: 'from-indigo-500 to-indigo-600', popular: false },
              { rank: 'Crystals', topUp: '$20', totalIncome: '$2046', color: 'from-cyan-500 to-cyan-600', popular: true },
              { rank: 'Diamond', topUp: '$40', totalIncome: '$4092', color: 'from-purple-500 to-purple-600', popular: false },
              { rank: 'Emerald', topUp: '$80', totalIncome: '$8184', color: 'from-green-500 to-green-600', popular: false },
              { rank: 'Feldspar', topUp: '$160', totalIncome: '$16368', color: 'from-orange-500 to-orange-600', popular: false },
              { rank: 'Garnet', topUp: '$320', totalIncome: '$32736', color: 'from-red-500 to-red-600', popular: false },
              { rank: 'Hackmanite', topUp: '$640', totalIncome: '$65472', color: 'from-pink-500 to-pink-600', popular: false },
              { rank: 'Iolite', topUp: '$1280', totalIncome: '$130944', color: 'from-violet-500 to-violet-600', popular: false },
              { rank: 'Jeremejevite', topUp: '$2560', totalIncome: '$261888', color: 'from-yellow-500 to-yellow-600', popular: false }
            ].map((plan, index) => (
              <div key={index} className={`relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300 transform hover:scale-105 ${plan.popular ? 'ring-2 ring-purple-500/50' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${plan.color} flex items-center justify-center`}>
                  <CurrencyDollarIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white text-center mb-2">
                  {plan.rank}
                </h3>
                <div className="text-center mb-4">
                  <p className="text-3xl font-bold text-white">{plan.topUp}</p>
                  <p className="text-slate-400 text-sm">Top-up Amount</p>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Total Income Potential</span>
                    <span className="text-green-400 font-semibold">{plan.totalIncome}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">10 Levels</span>
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Global Matrix</span>
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Referral Income</span>
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                  </div>
                </div>
                <button className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90 text-white py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105`}>
                  Choose Plan
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Income Types Section */}
      <section id="income-types" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Multiple Income Streams
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Maximize your earnings with our diverse income opportunities
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: "Level Income",
                description: "Earn from direct referrals and their activities. Get instant rewards when your team members top up their accounts.",
                percentage: "10-20%",
                color: "from-green-500 to-emerald-600"
              },
              {
                title: "Re-Level Income",
                description: "Additional earnings from spillover and team expansion. Benefit from the growth of your entire network.",
                percentage: "5-15%",
                color: "from-blue-500 to-cyan-600"
              },
              {
                title: "Global Income",
                description: "Share in the platform's overall success. Earn from the global pool based on your rank and activity.",
                percentage: "2-8%",
                color: "from-purple-500 to-violet-600"
              },
              {
                title: "Referral Income",
                description: "Direct commissions from personal referrals. Immediate rewards for bringing new members to the platform.",
                percentage: "15-25%",
                color: "from-pink-500 to-rose-600"
              }
            ].map((income, index) => (
              <div key={index} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300 transform hover:scale-105">
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold text-white bg-gradient-to-r ${income.color} mb-4`}>
                  {income.percentage}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {income.title}
                </h3>
                <p className="text-slate-300 mb-4">
                  {income.description}
                </p>
                <button className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                  Learn More →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Embedded Signup Form Section */}
      <section id="join-now" className="py-20 bg-slate-800/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Start Your Journey Today
            </h2>
            <p className="text-xl text-slate-300">
              Join thousands of successful members and start earning immediately
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 border border-slate-700/50">
            <form onSubmit={handleSignupSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email (Gmail) *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                    placeholder="your.email@gmail.com"
                    required
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                    placeholder="1234567890"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 pr-12 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                      placeholder="Create a strong password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-600 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              getPasswordStrength(formData.password) === 'weak' ? 'w-1/3 bg-red-500' :
                              getPasswordStrength(formData.password) === 'medium' ? 'w-2/3 bg-yellow-500' :
                              'w-full bg-green-500'
                            }`}
                          ></div>
                        </div>
                        <span className={`text-sm font-medium ${
                          getPasswordStrength(formData.password) === 'weak' ? 'text-red-400' :
                          getPasswordStrength(formData.password) === 'medium' ? 'text-yellow-400' :
                          'text-green-400'
                        }`}>
                          {getPasswordStrength(formData.password)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 pr-12 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                      placeholder="Confirm your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Wallet Address */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    USDT BEP20 Wallet Address *
                  </label>
                  <input
                    type="text"
                    name="walletAddress"
                    value={formData.walletAddress}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                    placeholder="0x..."
                    required
                  />
                </div>
              </div>

              {/* Sponsor ID */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Sponsor ID (Optional)
                </label>
                <input
                  type="text"
                  name="sponsorId"
                  value={formData.sponsorId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                  placeholder="Enter sponsor's user code (e.g., WG123456)"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                Create Account
                <ArrowRightIcon className="w-5 h-5" />
              </button>

              {/* Login Link */}
              <div className="text-center">
                <p className="text-slate-400">
                  Already have an account?{' '}
                  <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                    Sign in here
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Terms & Conditions Section */}
      <section id="terms" className="py-20 bg-slate-800/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Terms & Conditions
            </h2>
            <p className="text-xl text-slate-300">
              Please read our terms carefully before joining our platform
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 shadow-xl border border-slate-700/50">
            <div className="max-h-96 overflow-y-auto pr-4 space-y-4 text-slate-300 leading-relaxed">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p><strong className="text-white">Registration free.</strong> No charges for creating your account on our platform.</p>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p><strong className="text-white">One Gmail & Contact = 1 ID only.</strong> Each email address and phone number can only be used for one account.</p>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p><strong className="text-white">Activation amount $5 only.</strong> Minimum top-up required to activate your account and start earning.</p>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p><strong className="text-white">Activation via Crypto only.</strong> All account activations must be done using cryptocurrency payments.</p>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p><strong className="text-white">Withdrawal via Crypto only.</strong> All withdrawals are processed through cryptocurrency transactions.</p>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p><strong className="text-white">All package Topup Income 50%.</strong> You earn 50% commission on all package top-ups from your referrals.</p>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p><strong className="text-white">Minimum withdrawal $10.</strong> The minimum amount you can withdraw from your account is $10.</p>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p><strong className="text-white">Withdrawal deduction 15%.</strong> A 15% processing fee is deducted from all withdrawal transactions.</p>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p><strong className="text-white">Fund convert deduction 10%.</strong> A 10% fee applies when converting between different fund types.</p>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p><strong className="text-white">P2P Fund Transfer free.</strong> Peer-to-peer fund transfers between users are completely free of charge.</p>
              </div>
              
              <div className="mt-8 p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg border border-purple-500/30">
                <p className="text-center text-white font-semibold">
                  <CheckCircleIcon className="w-5 h-5 text-green-400 inline mr-2" />
                  Thank you — 100% Safe & Secure
                </p>
                <p className="text-center text-slate-300 text-sm mt-2">
                  Your funds and personal information are protected with industry-leading security measures.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Success Stories
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              See what our community members are saying about their journey
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Johnson",
                rank: "Diamond",
                earnings: "$15,000",
                testimonial: "Way2Globel changed my life! I've built an amazing network and achieved financial freedom I never thought possible.",
                rating: 5
              },
              {
                name: "Michael Chen",
                rank: "Emerald",
                earnings: "$8,500",
                testimonial: "The multiple income streams make this platform incredible. I'm earning from levels, referrals, and global income daily.",
                rating: 5
              },
              {
                name: "Emma Rodriguez",
                rank: "Ruby",
                earnings: "$5,200",
                testimonial: "Started just 6 months ago and already seeing consistent returns. The community support is outstanding!",
                rating: 5
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl border border-slate-700/50">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-300 mb-6 italic">
                  "{testimonial.testimonial}"
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-semibold">{testimonial.name}</h4>
                    <p className="text-purple-400 text-sm">{testimonial.rank} Rank</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold">{testimonial.earnings}</p>
                    <p className="text-slate-400 text-sm">Monthly Earnings</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-700/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                Way2Globel
              </h3>
              <p className="text-slate-400 mb-6 max-w-md">
                Empowering individuals worldwide through innovative MLM solutions and cryptocurrency opportunities. 
                Join our global community and unlock your financial potential.
              </p>
              <div className="flex space-x-4">
                <button className="text-slate-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </button>
                <button className="text-slate-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                  </svg>
                </button>
                <button className="text-slate-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection('how-it-works')} className="text-slate-400 hover:text-white transition-colors">How It Works</button></li>
                <li><button onClick={() => scrollToSection('plans')} className="text-slate-400 hover:text-white transition-colors">Plans</button></li>
                <li><button onClick={() => scrollToSection('terms')} className="text-slate-400 hover:text-white transition-colors">Terms & Conditions</button></li>
                <li><Link to="/signup" className="text-slate-400 hover:text-white transition-colors">Join Now</Link></li>
                <li><Link to="/login" className="text-slate-400 hover:text-white transition-colors">Login</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection('terms')} className="text-slate-400 hover:text-white transition-colors">Terms & Conditions</button></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Contact Support</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-700/50 mt-12 pt-8 text-center">
            <p className="text-slate-400">
              © 2024 Way2Globel. All rights reserved. | Empowering Global Financial Freedom
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;