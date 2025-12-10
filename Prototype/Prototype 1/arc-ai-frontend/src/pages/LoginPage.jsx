import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../utils/api';
import ThemeToggle from '../components/ThemeToggle';

// Fallback user list for when MSW isn't ready
const users = [
  {
    id: 'user_01',
    name: 'Anita Sharma',
    email: 'anita@org.example',
    role: 'admin',
  },
  {
    id: 'user_02',
    name: 'Ravi Kumar',
    email: 'ravi@org.example',
    role: 'operator',
  },
  {
    id: 'user_03',
    name: 'Local User',
    email: 'local@device',
    role: 'user',
  },
  {
    id: 'demo_user',
    name: 'Demo User',
    email: 'demo@arc-ai.example',
    role: 'admin',
  },
];

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState('signin');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setErrors({});
    
    // Try API first, but always fallback to direct login for demo account
    try {
      // Wait a bit for MSW to be ready
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const response = await authAPI.login('demo@arc-ai.example', 'password');
      
      if (response && response.data && response.data.user && response.data.token) {
        login(response.data.user, response.data.token);
        navigate('/dashboard');
        return;
      }
    } catch (error) {
      // Silently fall through to fallback - demo account should always work
      console.log('API login failed, using fallback demo login:', error.message);
    }
    
    // Fallback: Directly login with demo user (always works)
    const demoUser = {
      id: 'demo_user',
      name: 'Demo User',
      email: 'demo@arc-ai.example',
      role: 'admin',
    };
    login(demoUser, 'demo-token-' + Date.now());
    navigate('/dashboard');
    setLoading(false);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrors({});
    
    if (!validateEmail(formData.email)) {
      setErrors({ email: 'Invalid email format' });
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const response = await authAPI.login(formData.email, formData.password);
      
      if (response && response.data && response.data.user && response.data.token) {
        login(response.data.user, response.data.token);
        navigate('/dashboard');
        return;
      }
      
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response) {
        if (error.response.status === 404) {
          const foundUser = users.find(u => u.email === formData.email);
          if (foundUser && formData.password === 'password') {
            login({
              id: foundUser.id,
              name: foundUser.name,
              email: foundUser.email,
              role: foundUser.role,
            }, 'demo-token-' + Date.now());
            navigate('/dashboard');
            return;
          }
          errorMessage = 'Service temporarily unavailable. Please try the demo account or try again in a moment.';
        } else if (error.response.status === 401) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.code === 'ERR_NETWORK' || !error.response) {
        const foundUser = users.find(u => u.email === formData.email);
        if (foundUser && formData.password === 'password') {
          login({
            id: foundUser.id,
            name: foundUser.name,
            email: foundUser.email,
            role: foundUser.role,
          }, 'demo-token-' + Date.now());
          navigate('/dashboard');
          return;
        }
        errorMessage = 'Network error. Please check your connection or try the demo account.';
      } else if (error.message) {
        errorMessage = error.message.includes('404') 
          ? 'Service temporarily unavailable. Please try the demo account.'
          : error.message;
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrors({});

    const validationErrors = {};
    if (!formData.firstName.trim()) {
      validationErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      validationErrors.lastName = 'Last name is required';
    }
    if (!validateEmail(formData.email)) {
      validationErrors.email = 'Invalid email format';
    }
    if (!formData.role) {
      validationErrors.role = 'Please select a role';
    }
    if (!validatePassword(formData.password)) {
      validationErrors.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      validationErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.register({
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        email: formData.email.trim(),
        password: formData.password,
        org: formData.organization || '',
        role: formData.role,
      });
      login(response.data.user, response.data.token);
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed. Please try again.';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Left Side - Form (30%) */}
      <div className="w-full md:w-[30%] bg-white dark:bg-gray-800 p-6 md:p-8 flex flex-col justify-center">
        {/* Logo and Theme Toggle */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">ARC-AI</span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b dark:border-gray-700">
          <button
            onClick={() => {
              setActiveTab('signin');
              setErrors({});
            }}
                className={`pb-3 px-3 text-sm font-medium transition-all ${
                  activeTab === 'signin'
                    ? 'text-gray-900 dark:text-white border-b-2 border-primary'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setActiveTab('signup');
              setErrors({});
            }}
                className={`pb-3 px-3 text-sm font-medium transition-all ${
                  activeTab === 'signup'
                    ? 'text-gray-900 dark:text-white border-b-2 border-primary'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form Title */}
        <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">
          {activeTab === 'signin' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {activeTab === 'signin'
            ? 'Sign in to access your ARC-AI dashboard'
            : 'Join the ARC-AI research community'}
        </p>

        {errors.general && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
            <div className="flex items-start gap-2">
              <span className="text-red-600">⚠️</span>
              <div>
                <strong>Error:</strong> {errors.general}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-3 flex-1">
            <div>
              <label htmlFor="signin-email" className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                Email address *
              </label>
              <input
                id="signin-email"
                type="email"
                className={`w-full px-3 py-2 text-sm rounded-lg border transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                } focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none`}
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: null });
                }}
                required
                placeholder="your.email@example.com"
              />
              {errors.email && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.email}</p>
              )}
            </div>
            <div>
              <label htmlFor="signin-password" className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                Password *
              </label>
              <input
                id="signin-password"
                type="password"
                className={`w-full px-3 py-2 text-sm rounded-lg border transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                } focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none`}
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) setErrors({ ...errors, password: null });
                }}
                required
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.password}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full btn-primary py-2 text-sm font-semibold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {/* Demo Account Button */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white py-2 text-sm font-semibold rounded-lg transition-all border-2 border-gray-300 dark:border-gray-600 hover:border-primary/50 transform hover:-translate-y-0.5 shadow-sm hover:shadow-md"
              disabled={loading}
            >
              {loading ? 'Logging in...' : '🚀 Try Demo Account'}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1.5">
              Demo account has full access to all features
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-3 flex-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="signup-firstname" className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  First Name *
                </label>
                <input
                  id="signup-firstname"
                  type="text"
                  className={`w-full px-3 py-2 text-sm rounded-lg border transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  } focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none`}
                  value={formData.firstName}
                  onChange={(e) => {
                    setFormData({ ...formData, firstName: e.target.value });
                    if (errors.firstName) setErrors({ ...errors, firstName: null });
                  }}
                  required
                />
                {errors.firstName && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.firstName}</p>
                )}
              </div>
              <div>
                <label htmlFor="signup-lastname" className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Last Name *
                </label>
                <input
                  id="signup-lastname"
                  type="text"
                  className={`w-full px-3 py-2 text-sm rounded-lg border transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.lastName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  } focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none`}
                  value={formData.lastName}
                  onChange={(e) => {
                    setFormData({ ...formData, lastName: e.target.value });
                    if (errors.lastName) setErrors({ ...errors, lastName: null });
                  }}
                  required
                />
                {errors.lastName && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="signup-email" className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                Email address *
              </label>
              <input
                id="signup-email"
                type="email"
                className={`w-full px-3 py-2 text-sm rounded-lg border transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                } focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none`}
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: null });
                }}
                required
                placeholder="your.email@example.com"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Prefer institutional email for research accounts
              </p>
              {errors.email && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.email}</p>
              )}
            </div>
            <div>
              <label htmlFor="signup-phone" className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                Phone Number
              </label>
              <input
                id="signup-phone"
                type="tel"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="E.164 format (e.g., +1234567890)"
              />
            </div>
            <div>
              <label htmlFor="signup-role" className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                Role *
              </label>
              <select
                id="signup-role"
                className={`w-full px-3 py-2 text-sm rounded-lg border transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.role ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                } focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none`}
                value={formData.role}
                onChange={(e) => {
                  setFormData({ ...formData, role: e.target.value });
                  if (errors.role) setErrors({ ...errors, role: null });
                }}
                required
              >
                <option value="">Select your role</option>
                <option value="admin">Administrator</option>
                <option value="operator">Operator</option>
                <option value="user">User</option>
                <option value="researcher">Researcher</option>
              </select>
              {errors.role && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.role}</p>
              )}
            </div>
            <div>
              <label htmlFor="signup-password" className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                Password *
              </label>
              <input
                id="signup-password"
                type="password"
                className={`w-full px-3 py-2 text-sm rounded-lg border transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                } focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none`}
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) setErrors({ ...errors, password: null });
                }}
                required
              />
              {errors.password && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">{errors.password}</p>
              )}
            </div>
            <div>
              <label htmlFor="signup-confirm" className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm Password *
              </label>
              <input
                id="signup-confirm"
                type="password"
                className={`w-full px-3 py-2 text-sm rounded-lg border transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                } focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none`}
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData({ ...formData, confirmPassword: e.target.value });
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                }}
                required
              />
              {errors.confirmPassword && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5"
                required
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                I agree to ARC-AI{' '}
                <a href="#" className="text-primary hover:underline">
                  Terms & Privacy Policy
                </a>
              </span>
            </label>
            <button
              type="submit"
              className="w-full btn-primary py-2 text-sm font-semibold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
            
            {/* Privacy Statement */}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
              Your data remains private and used only for research & system improvements per our policy.
            </p>
          </form>
        )}

        {/* Back to Home Link */}
        <div className="mt-6 text-center">
          <Link to="/" className="text-primary hover:text-primary/80 hover:underline text-xs transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* Right Side - Promotional (70%) */}
      <div className="hidden md:flex md:w-[70%] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white p-8 flex-col justify-center items-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 text-center max-w-xl">
          {/* Large Logo */}
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-xl transform hover:scale-110 transition-transform duration-300">
              <span className="text-white font-bold text-3xl">A</span>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold mb-3 tracking-tight">
            ARC-AI
          </h2>
          
          <p className="text-base opacity-95 mb-8 font-medium">
            Offline AI Mesh • Knowledge Capsules • Encrypted Intelligence
          </p>
          
          <ul className="space-y-4 text-left">
            <li className="flex items-start gap-3 group">
              <span className="text-2xl transform group-hover:scale-110 transition-transform">⚡</span>
              <div>
                <span className="text-sm font-semibold block mb-0.5">AI-Powered Offline Query Processing</span>
                <span className="text-xs opacity-90">Self-learning mesh network that works autonomously</span>
              </div>
            </li>
            <li className="flex items-start gap-3 group">
              <span className="text-2xl transform group-hover:scale-110 transition-transform">📦</span>
              <div>
                <span className="text-sm font-semibold block mb-0.5">Knowledge Capsule Generation & Distribution</span>
                <span className="text-xs opacity-90">Signed Q&A units ensure data integrity</span>
              </div>
            </li>
            <li className="flex items-start gap-3 group">
              <span className="text-2xl transform group-hover:scale-110 transition-transform">📡</span>
              <div>
                <span className="text-sm font-semibold block mb-0.5">Real-Time Mesh Network Monitoring</span>
                <span className="text-xs opacity-90">Interactive dashboard with live telemetry</span>
              </div>
            </li>
          </ul>
        </div>
        
        <p className="text-xs opacity-80 mt-8 relative z-10">
          &copy; 2025 ARC-AI. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

