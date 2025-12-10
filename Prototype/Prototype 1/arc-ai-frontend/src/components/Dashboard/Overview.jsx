import { useEffect, useState } from 'react';
import { useCluster } from '../../contexts/ClusterContext';
import { statusAPI } from '../../utils/api';

const Overview = () => {
  const { clusterStatus } = useCluster();
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const response = await statusAPI.getCluster();
      setMetrics({
        cache_hit_rate: response.data.cache_hit_rate,
        queued_packets: response.data.queued_packets,
        active_mini_hubs: response.data.active_mini_hubs,
        last_sync: response.data.last_sync,
        total_packets: 24,
        delivered_packets: 18,
        active_experiments: 3,
      });
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  if (!metrics) {
    return (
      <div className="card bg-steel-blue">
        <p className="text-gray-200">Loading metrics...</p>
      </div>
    );
  }

  const metricCards = [
    {
      label: 'Total Packets',
      value: metrics.total_packets,
      icon: '📦',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Delivered Packets',
      value: metrics.delivered_packets,
      icon: '✓',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Queued Packets',
      value: metrics.queued_packets,
      icon: '⏳',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      label: 'Active Mini Hubs',
      value: metrics.active_mini_hubs,
      icon: '📡',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Key Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metricCards.map((metric, index) => (
            <div
              key={index}
              className="card bg-steel-blue"
              role="article"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">{metric.icon}</span>
                </div>
              </div>
              <p className="text-sm text-gray-200 mb-1">{metric.label}</p>
              <p className="text-3xl font-bold text-white">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card bg-steel-blue">
          <h3 className="text-xl font-semibold mb-4 text-gray-200">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { name: 'Packet Query - Soil Analysis', status: 'Completed', time: '2 hours ago' },
              { name: 'Knowledge Capsule Sync', status: 'Completed', time: '5 hours ago' },
              { name: 'Main Hub Manifest Update', status: 'Processing', time: '1 hour ago' },
            ].map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white/10 rounded-lg"
              >
                <div>
                  <p className="font-medium text-white">{activity.name}</p>
                  <p className="text-sm text-gray-300">{activity.time}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    activity.status === 'Completed'
                      ? 'bg-green-500/30 text-green-100'
                      : 'bg-blue-400/30 text-blue-100'
                  }`}
                >
                  {activity.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="card bg-steel-blue">
          <h3 className="text-xl font-semibold mb-4 text-gray-200">System Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Cache Hit Rate</span>
              <span className="font-semibold text-white">
                {(metrics.cache_hit_rate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Last Sync</span>
              <span className="font-semibold text-white">
                {new Date(metrics.last_sync).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Active Experiments</span>
              <span className="font-semibold text-white">
                {metrics.active_experiments}
              </span>
            </div>
            {clusterStatus && (
              <div className="mt-4 pt-4 border-t border-white/30">
                <p className="text-sm text-gray-200 mb-2">Cluster Status</p>
                <p className="text-sm font-medium text-white">
                  {clusterStatus.cluster_name}
                </p>
                {clusterStatus.notes && (
                  <p className="text-xs text-gray-300 mt-1">{clusterStatus.notes}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
