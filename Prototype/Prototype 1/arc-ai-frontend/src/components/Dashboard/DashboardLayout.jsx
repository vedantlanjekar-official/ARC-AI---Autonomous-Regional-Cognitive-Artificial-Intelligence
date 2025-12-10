import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCluster } from '../../contexts/ClusterContext';
import ThemeToggle from '../ThemeToggle';
import Overview from './Overview';
import PacketTransactions from './PacketTransactions';
import Chatbot from './Chatbot';
import CapsuleManager from './CapsuleManager';
import Logs from './Logs';
import AdminPanel from './AdminPanel';

const DashboardLayout = () => {
  const [activeView, setActiveView] = useState('overview');
  const { user, logout } = useAuth();
  const { clusterStatus, offline } = useCluster();
  const navigate = useNavigate();

  const navItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'packets', label: 'Packet Transactions', icon: '📦' },
    { id: 'chatbot', label: 'Chatbot', icon: '💬' },
    { id: 'capsules', label: 'Capsules', icon: '📚' },
    { id: 'logs', label: 'Logs', icon: '📋' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin', icon: '⚙️' });
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getStatusBadge = () => {
    const status = clusterStatus?.node_status || 'OFFLINE';
    const statusMap = {
      ONLINE: { bg: 'bg-green-500', text: 'Online' },
      DEGRADED: { bg: 'bg-yellow-500', text: 'Degraded' },
      OFFLINE: { bg: 'bg-red-500', text: 'Offline' },
    };
    const statusInfo = statusMap[status] || statusMap.OFFLINE;
    
    return (
      <span className={`px-3 py-1 rounded-full text-white text-xs font-medium ${statusInfo.bg}`}>
        {statusInfo.text}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Left Sidebar */}
      <aside className="w-64 bg-gray-800 dark:bg-gray-950 text-white flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-700 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <span className="text-xl font-bold">ARC-AI</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeView === item.id
                  ? 'bg-primary text-white'
                  : 'text-gray-300 dark:text-gray-400 hover:bg-gray-700 dark:hover:bg-gray-800 hover:text-white'
              }`}
              aria-current={activeView === item.id ? 'page' : undefined}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-700 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{user?.role || 'user'}</p>
            </div>
          </div>
          <div className="flex gap-2 mb-2">
            <ThemeToggle className="flex-1" />
            <button
              onClick={handleLogout}
              className="flex-1 px-4 py-2 bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 rounded-lg text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {navItems.find((item) => item.id === activeView)?.label || 'Dashboard'}
              </h1>
              {clusterStatus && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {clusterStatus.cluster_name} • {getStatusBadge()}
                  {offline && (
                    <span className="ml-2 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded text-xs">
                      Offline Mode
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <span className="text-xl">🔔</span>
              </button>
              <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.name?.split(' ').map((n) => n[0]).join('') || 'U'}
              </span>
            </div>
                <span className="font-medium text-gray-700 dark:text-gray-300">{user?.name || 'User'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {activeView === 'overview' && <Overview />}
          {activeView === 'packets' && <PacketTransactions />}
          {activeView === 'chatbot' && <Chatbot />}
          {activeView === 'capsules' && <CapsuleManager />}
          {activeView === 'logs' && <Logs />}
          {activeView === 'admin' && user?.role === 'admin' && <AdminPanel />}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
