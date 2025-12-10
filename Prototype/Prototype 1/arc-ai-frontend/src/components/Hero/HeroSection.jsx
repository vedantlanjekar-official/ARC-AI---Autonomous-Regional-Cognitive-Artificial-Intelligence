import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../utils/api';
import ThemeToggle from '../ThemeToggle';

const HeroSection = () => {
  const { isAuthenticated, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      // Wait a bit for MSW to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await authAPI.login('demo@arc-ai.example', 'password');
      
      if (response && response.data && response.data.user && response.data.token) {
        login(response.data.user, response.data.token);
        navigate('/dashboard');
        return;
      }
      
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Demo login failed:', error);
      
      // Fallback: directly set demo user if API fails
      if (error.code === 'ERR_NETWORK' || !error.response) {
        const demoUser = {
          id: 'demo_user',
          name: 'Demo User',
          email: 'demo@arc-ai.example',
          role: 'admin',
        };
        login(demoUser, 'demo-token-' + Date.now());
        navigate('/dashboard');
        return;
      }
      
      // If demo login fails, navigate to login page
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">ARC-AI</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={handleSignIn}
              className="btn-primary px-8 py-2.5 shadow-md hover:shadow-lg transition-all"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="mb-6">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight leading-tight">
              ARC-AI
            </h1>
            <div className="w-24 h-1 bg-primary mx-auto mb-4"></div>
          </div>
          <h2 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-200 mb-6 font-normal leading-relaxed">
            Offline AI Mesh for Resilient Intelligence
          </h2>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed font-normal">
            ARC-AI is a self-learning, encrypted AI mesh platform that works without the Internet. 
            It delivers resilient, private AI via a distributed network of Mini Hubs and regional Main Hubs, 
            ensuring continuous access to intelligence even in remote or critical infrastructure sites.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4">
            <button
              onClick={handleSignIn}
              className="btn-primary text-base px-8 py-3 font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
            >
              SIGN IN
            </button>
            <button
              onClick={handleDemoLogin}
              disabled={loading}
              className="bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-base px-8 py-3 font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all border-2 border-gray-300 dark:border-gray-600 disabled:opacity-50 transform hover:-translate-y-0.5"
            >
              {loading ? 'Loading...' : '🚀 TRY DEMO'}
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center italic">
            Demo account provides instant access to all features
          </p>
        </div>
      </section>
    </>
  );
};

export default HeroSection;
