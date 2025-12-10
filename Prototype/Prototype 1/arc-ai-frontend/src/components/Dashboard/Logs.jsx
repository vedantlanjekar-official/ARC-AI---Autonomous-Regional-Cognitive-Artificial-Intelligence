import { useState, useEffect } from 'react';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Generate dummy log data
    const dummyLogs = [
      {
        id: 'log_001',
        timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
        level: 'INFO',
        service: 'MainHub',
        message: 'Manifest sync completed successfully',
        details: 'Synced 45 knowledge capsules from regional hubs',
      },
      {
        id: 'log_002',
        timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
        level: 'WARN',
        service: 'MiniHub-chi-01',
        message: 'Packet retry attempt exceeded max retries',
        details: 'Packet pkt_20251208_0001 failed after 3 retry attempts',
      },
      {
        id: 'log_003',
        timestamp: new Date(Date.now() - 18 * 60000).toISOString(),
        level: 'INFO',
        service: 'MiniHub-del-02',
        message: 'Knowledge capsule received and stored',
        details: 'Capsule cap_0a1b2c stored with signature verified',
      },
      {
        id: 'log_004',
        timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
        level: 'ERROR',
        service: 'MainHub',
        message: 'Connection timeout to MiniHub-chi-03',
        details: 'Failed to establish connection after 30s timeout',
      },
      {
        id: 'log_005',
        timestamp: new Date(Date.now() - 32 * 60000).toISOString(),
        level: 'INFO',
        service: 'MiniHub-chi-01',
        message: 'Query processed successfully',
        details: 'Query answered from LocalCache with 78% confidence',
      },
      {
        id: 'log_006',
        timestamp: new Date(Date.now() - 40 * 60000).toISOString(),
        level: 'INFO',
        service: 'MainHub',
        message: 'New user registered',
        details: 'User user_04 registered with role: operator',
      },
      {
        id: 'log_007',
        timestamp: new Date(Date.now() - 48 * 60000).toISOString(),
        level: 'WARN',
        service: 'MiniHub-chi-03',
        message: 'Low cache hit rate detected',
        details: 'Cache hit rate dropped to 45% - requesting manifest update',
      },
      {
        id: 'log_008',
        timestamp: new Date(Date.now() - 55 * 60000).toISOString(),
        level: 'INFO',
        service: 'MainHub',
        message: 'Manifest update broadcasted',
        details: 'Updated manifest with 12 new capsules sent to all mini hubs',
      },
      {
        id: 'log_009',
        timestamp: new Date(Date.now() - 62 * 60000).toISOString(),
        level: 'INFO',
        service: 'MiniHub-del-02',
        message: 'Packet queued for retry',
        details: 'Packet pkt_20251208_0015 queued with exponential backoff',
      },
      {
        id: 'log_010',
        timestamp: new Date(Date.now() - 70 * 60000).toISOString(),
        level: 'ERROR',
        service: 'MainHub',
        message: 'Signature verification failed',
        details: 'Capsule cap_9f8e7d signature verification failed - rejected',
      },
      {
        id: 'log_011',
        timestamp: new Date(Date.now() - 78 * 60000).toISOString(),
        level: 'INFO',
        service: 'MiniHub-chi-01',
        message: 'Fallback answer generated',
        details: 'Query answered using fallback mechanism with 65% confidence',
      },
      {
        id: 'log_012',
        timestamp: new Date(Date.now() - 85 * 60000).toISOString(),
        level: 'INFO',
        service: 'MainHub',
        message: 'System health check passed',
        details: 'All services operational, 5 active mini hubs, 0 critical issues',
      },
    ];
    setLogs(dummyLogs);
  }, []);

  const getLevelColor = (level) => {
    switch (level) {
      case 'ERROR':
        return 'text-red-400 bg-red-500/20';
      case 'WARN':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'INFO':
        return 'text-blue-400 bg-blue-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filter === 'all' || log.level === filter;
    const matchesSearch =
      searchTerm === '' ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="card bg-steel-blue">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-white text-steel-blue'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('ERROR')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'ERROR'
                  ? 'bg-red-500 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Errors
            </button>
            <button
              onClick={() => setFilter('WARN')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'WARN'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Warnings
            </button>
            <button
              onClick={() => setFilter('INFO')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'INFO'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Info
            </button>
          </div>
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white/20 text-white placeholder-gray-300 border border-white/30 focus:border-white/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Logs List */}
      <div className="card bg-steel-blue">
        <h2 className="text-2xl font-bold mb-4 text-white">System Logs</h2>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <p className="text-gray-200 text-center py-8">No logs found</p>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 bg-white/10 rounded-lg border border-white/20 hover:bg-white/15 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${getLevelColor(
                        log.level
                      )}`}
                    >
                      {log.level}
                    </span>
                    <span className="text-white font-medium">{log.service}</span>
                    <span className="text-gray-300 text-sm">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
                <p className="text-white font-medium mb-1">{log.message}</p>
                <p className="text-gray-300 text-sm">{log.details}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Logs;

