import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../utils/api';

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

const AuthModal = ({ onClose }) => {
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
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setErrors({});
    try {
      // Wait a bit for MSW to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use demo account credentials
      const response = await authAPI.login('demo@arc-ai.example', 'password');
      
      if (response && response.data && response.data.user && response.data.token) {
        login(response.data.user, response.data.token);
        onClose();
        navigate('/dashboard');
        return;
      }
      
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Demo login error details:', {
        error,
        response: error.response,
        message: error.message,
      });
      
      // Fallback: directly set demo user if API fails
      if (error.code === 'ERR_NETWORK' || !error.response) {
        const demoUser = {
          id: 'demo_user',
          name: 'Demo User',
          email: 'demo@arc-ai.example',
          role: 'admin',
        };
        login(demoUser, 'demo-token-' + Date.now());
        onClose();
        navigate('/dashboard');
        return;
      }
      
      const errorMessage = error.response?.data?.error || error.message || 'Demo login failed. Please try again.';
      setErrors({ general: errorMessage });
      setLoading(false);
    }
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
      // Wait a bit for MSW to be ready
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const response = await authAPI.login(formData.email, formData.password);
      
      if (response && response.data && response.data.user && response.data.token) {
        login(response.data.user, response.data.token);
        onClose();
        navigate('/dashboard');
        return;
      }
      
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Login error:', error);
      
      // Extract error message
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response) {
        // Server responded with error status
        if (error.response.status === 404) {
          // MSW not ready - try fallback
          const foundUser = users.find(u => u.email === formData.email);
          if (foundUser && formData.password === 'password') {
            login({
              id: foundUser.id,
              name: foundUser.name,
              email: foundUser.email,
              role: foundUser.role,
            }, 'demo-token-' + Date.now());
            onClose();
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
        // Network error or no response - try fallback
        const foundUser = users.find(u => u.email === formData.email);
        if (foundUser && formData.password === 'password') {
          login({
            id: foundUser.id,
            name: foundUser.name,
            email: foundUser.email,
            role: foundUser.role,
          }, 'demo-token-' + Date.now());
          onClose();
          navigate('/dashboard');
          return;
        }
        errorMessage = 'Network error. Please check your connection or try the demo account.';
      } else if (error.message) {
        // Use error message if available
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

    // Validate required fields
    if (!formData.firstName || !formData.firstName.trim()) {
      setErrors({ firstName: 'First name is required' });
      return;
    }

    if (!formData.lastName || !formData.lastName.trim()) {
      setErrors({ lastName: 'Last name is required' });
      return;
    }

    if (!validateEmail(formData.email)) {
      setErrors({ email: 'Invalid email format' });
      return;
    }

    if (!formData.role) {
      setErrors({ role: 'Please select a role' });
      return;
    }

    if (!validatePassword(formData.password)) {
      setErrors({ password: 'Password must be at least 6 characters' });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
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
      onClose();
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
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white w-full max-w-6xl min-h-screen md:min-h-0 md:rounded-none flex"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side - Form */}
        <div className="w-full md:w-1/3 bg-white p-8 md:p-12 flex flex-col">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">ARC-AI</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 border-b">
            <button
              onClick={() => {
                setActiveTab('signin');
                setErrors({});
              }}
              className={`pb-4 px-4 font-medium transition-colors ${
                activeTab === 'signin'
                  ? 'text-gray-900 border-b-2 border-primary'
                  : 'text-gray-500'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab('signup');
                setErrors({});
              }}
              className={`pb-4 px-4 font-medium transition-colors ${
                activeTab === 'signup'
                  ? 'text-gray-900 border-b-2 border-primary'
                  : 'text-gray-500'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form Title */}
          <h2 className="text-3xl font-bold mb-2 text-gray-900">
            {activeTab === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-600 mb-8">
            {activeTab === 'signin'
              ? 'Sign in to access your ARC-AI dashboard'
              : 'Join the ARC-AI research community'}
          </p>

          {errors.general && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              <div className="flex items-start gap-2">
                <span className="text-red-600">⚠️</span>
                <div>
                  <strong>Error:</strong> {errors.general}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4 flex-1">
              <div>
                <label htmlFor="signin-email" className="block mb-2 font-medium text-gray-700">
                  Email address *
                </label>
                <input
                  id="signin-email"
                  type="email"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  placeholder="your.email@example.com"
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <label htmlFor="signin-password" className="block mb-2 font-medium text-gray-700">
                  Password *
                </label>
                <input
                  id="signin-password"
                  type="password"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                className="w-full btn-primary py-3 text-lg font-semibold"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              
              {/* Demo Account Button */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or</span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 text-lg font-semibold rounded-lg transition-colors border-2 border-gray-300"
                disabled={loading}
              >
                {loading ? 'Logging in...' : '🚀 Try Demo Account'}
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                Demo account has full access to all features
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="signup-firstname" className="block mb-2 font-medium text-gray-700">
                    First Name *
                  </label>
                  <input
                    id="signup-firstname"
                    type="text"
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.firstName ? 'border-red-500' : 'border-gray-300'
                    } focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none`}
                    value={formData.firstName}
                    onChange={(e) => {
                      setFormData({ ...formData, firstName: e.target.value });
                      if (errors.firstName) setErrors({ ...errors, firstName: null });
                    }}
                    required
                  />
                  {errors.firstName && (
                    <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="signup-lastname" className="block mb-2 font-medium text-gray-700">
                    Last Name *
                  </label>
                  <input
                    id="signup-lastname"
                    type="text"
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.lastName ? 'border-red-500' : 'border-gray-300'
                    } focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none`}
                    value={formData.lastName}
                    onChange={(e) => {
                      setFormData({ ...formData, lastName: e.target.value });
                      if (errors.lastName) setErrors({ ...errors, lastName: null });
                    }}
                    required
                  />
                  {errors.lastName && (
                    <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="signup-email" className="block mb-2 font-medium text-gray-700">
                  Email address *
                </label>
                <input
                  id="signup-email"
                  type="email"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  placeholder="your.email@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Prefer institutional email for research accounts
                </p>
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <label htmlFor="signup-phone" className="block mb-2 font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  id="signup-phone"
                  type="tel"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="E.164 format (e.g., +1234567890)"
                />
              </div>
              <div>
                <label htmlFor="signup-role" className="block mb-2 font-medium text-gray-700">
                  Role *
                </label>
                <select
                  id="signup-role"
                  className={`w-full px-4 py-3 rounded-lg border ${
                    errors.role ? 'border-red-500' : 'border-gray-300'
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
                  <p className="text-red-600 text-sm mt-1">{errors.role}</p>
                )}
              </div>
              <div>
                <label htmlFor="signup-password" className="block mb-2 font-medium text-gray-700">
                  Password *
                </label>
                <input
                  id="signup-password"
                  type="password"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
                {errors.password && (
                  <p className="text-red-600 text-sm mt-1">{errors.password}</p>
                )}
              </div>
              <div>
                <label htmlFor="signup-confirm" className="block mb-2 font-medium text-gray-700">
                  Confirm Password *
                </label>
                <input
                  id="signup-confirm"
                  type="password"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  required
                />
                {errors.confirmPassword && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  required
                />
                <span className="text-sm text-gray-600">
                  I agree to ARC-AI{' '}
                  <a href="#" className="text-primary hover:underline">
                    Terms & Privacy Policy
                  </a>
                </span>
              </label>
              <button
                type="submit"
                className="w-full btn-primary py-3 text-lg font-semibold"
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
              <p className="text-xs text-gray-500 text-center">
                Your data remains private and used only for research & system improvements per our policy.
              </p>
            </form>
          )}
        </div>

        {/* Right Side - Promotional Panel */}
        <div className="hidden md:flex md:w-2/3 bg-primary flex-col items-center justify-center p-12 text-white">
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-white font-bold text-5xl">A</span>
            </div>
            <h3 className="text-5xl font-bold mb-4">ARC-AI</h3>
            <p className="text-xl text-white/90 mb-8">
              Offline AI Mesh • Knowledge Capsules • Encrypted Intelligence
            </p>
          </div>
          <div className="space-y-4 text-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✓</span>
              <span>AI-Powered Offline Query Processing</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">✓</span>
              <span>Knowledge Capsule Generation & Distribution</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">✓</span>
              <span>Real-Time Mesh Network Monitoring</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
