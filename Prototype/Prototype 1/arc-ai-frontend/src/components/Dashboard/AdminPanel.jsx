import { useState, useEffect } from 'react';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [systemSettings, setSystemSettings] = useState({
    maxRetries: 3,
    syncInterval: 300,
    cacheTimeout: 3600,
    enableAutoSync: true,
  });

  useEffect(() => {
    // Dummy user data
    const dummyUsers = [
      {
        id: 'user_01',
        name: 'Anita Sharma',
        email: 'anita@org.example',
        org: 'MeshHealth',
        role: 'admin',
        status: 'active',
        lastLogin: new Date(Date.now() - 2 * 3600000).toISOString(),
      },
      {
        id: 'user_02',
        name: 'Ravi Kumar',
        email: 'ravi@org.example',
        org: 'AgriMesh',
        role: 'operator',
        status: 'active',
        lastLogin: new Date(Date.now() - 5 * 3600000).toISOString(),
      },
      {
        id: 'user_03',
        name: 'Local User',
        email: 'local@device',
        org: 'EdgeNode',
        role: 'user',
        status: 'active',
        lastLogin: new Date(Date.now() - 24 * 3600000).toISOString(),
      },
      {
        id: 'user_04',
        name: 'Sarah Chen',
        email: 'sarah@research.edu',
        org: 'Research Institute',
        role: 'researcher',
        status: 'active',
        lastLogin: new Date(Date.now() - 12 * 3600000).toISOString(),
      },
      {
        id: 'user_05',
        name: 'John Doe',
        email: 'john@test.com',
        org: 'TestOrg',
        role: 'user',
        status: 'inactive',
        lastLogin: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
      },
    ];
    setUsers(dummyUsers);
  }, []);

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/30 text-red-200';
      case 'operator':
        return 'bg-blue-500/30 text-blue-200';
      case 'researcher':
        return 'bg-purple-500/30 text-purple-200';
      default:
        return 'bg-gray-500/30 text-gray-200';
    }
  };

  const getStatusColor = (status) => {
    return status === 'active'
      ? 'bg-green-500/30 text-green-200'
      : 'bg-gray-500/30 text-gray-200';
  };

  const handleSettingChange = (key, value) => {
    setSystemSettings({ ...systemSettings, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* System Settings */}
      <div className="card bg-steel-blue">
        <h2 className="text-2xl font-bold mb-4 text-white">System Settings</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-white mb-2 font-medium">
              Max Retry Attempts
            </label>
            <input
              type="number"
              value={systemSettings.maxRetries}
              onChange={(e) =>
                handleSettingChange('maxRetries', parseInt(e.target.value))
              }
              className="w-full px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:border-white/50 focus:outline-none"
              min="1"
              max="10"
            />
          </div>
          <div>
            <label className="block text-white mb-2 font-medium">
              Sync Interval (seconds)
            </label>
            <input
              type="number"
              value={systemSettings.syncInterval}
              onChange={(e) =>
                handleSettingChange('syncInterval', parseInt(e.target.value))
              }
              className="w-full px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:border-white/50 focus:outline-none"
              min="60"
            />
          </div>
          <div>
            <label className="block text-white mb-2 font-medium">
              Cache Timeout (seconds)
            </label>
            <input
              type="number"
              value={systemSettings.cacheTimeout}
              onChange={(e) =>
                handleSettingChange('cacheTimeout', parseInt(e.target.value))
              }
              className="w-full px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:border-white/50 focus:outline-none"
              min="300"
            />
          </div>
          <div>
            <label className="block text-white mb-2 font-medium">
              Auto Sync
            </label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={systemSettings.enableAutoSync}
                onChange={(e) =>
                  handleSettingChange('enableAutoSync', e.target.checked)
                }
                className="w-5 h-5 rounded"
              />
              <span className="text-white">
                {systemSettings.enableAutoSync ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-6 flex gap-4">
          <button className="btn-primary">Save Settings</button>
          <button className="btn-secondary bg-white/20 text-white hover:bg-white/30">
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* User Management */}
      <div className="card bg-steel-blue">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <button className="btn-primary">Add New User</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/30">
                <th className="text-left p-3 text-white">Name</th>
                <th className="text-left p-3 text-white">Email</th>
                <th className="text-left p-3 text-white">Organization</th>
                <th className="text-left p-3 text-white">Role</th>
                <th className="text-left p-3 text-white">Status</th>
                <th className="text-left p-3 text-white">Last Login</th>
                <th className="text-left p-3 text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-white/20 hover:bg-white/10"
                >
                  <td className="p-3 text-white">{user.name}</td>
                  <td className="p-3 text-gray-200">{user.email}</td>
                  <td className="p-3 text-gray-200">{user.org}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                        user.status
                      )}`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-300 text-xs">
                    {new Date(user.lastLogin).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button className="text-blue-300 hover:text-blue-200 text-xs">
                        Edit
                      </button>
                      <button className="text-red-300 hover:text-red-200 text-xs">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Statistics */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card bg-steel-blue">
          <h3 className="text-lg font-semibold mb-2 text-white">
            Total Users
          </h3>
          <p className="text-3xl font-bold text-white">{users.length}</p>
          <p className="text-sm text-gray-300 mt-1">
            {users.filter((u) => u.status === 'active').length} active
          </p>
        </div>
        <div className="card bg-steel-blue">
          <h3 className="text-lg font-semibold mb-2 text-white">
            System Uptime
          </h3>
          <p className="text-3xl font-bold text-white">99.8%</p>
          <p className="text-sm text-gray-300 mt-1">Last 30 days</p>
        </div>
        <div className="card bg-steel-blue">
          <h3 className="text-lg font-semibold mb-2 text-white">
            Storage Used
          </h3>
          <p className="text-3xl font-bold text-white">68%</p>
          <p className="text-sm text-gray-300 mt-1">2.1 TB / 3.0 TB</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;

