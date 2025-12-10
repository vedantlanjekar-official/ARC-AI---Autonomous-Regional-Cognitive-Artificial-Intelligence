import { createContext, useContext, useState, useEffect } from 'react';
import { statusAPI } from '../utils/api';
import { wsClient } from '../utils/websocket';

const ClusterContext = createContext(null);

export const ClusterProvider = ({ children }) => {
  const [clusterStatus, setClusterStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    loadClusterStatus();
    
    // Set up WebSocket listener for status updates
    const handleMessage = (data) => {
      if (data.type === 'packet_update' || data.type === 'capsule_manifest') {
        loadClusterStatus();
      }
    };

    wsClient.on('message', handleMessage);

    // Poll for status updates every 30 seconds
    const interval = setInterval(loadClusterStatus, 30000);

    return () => {
      wsClient.off('message', handleMessage);
      clearInterval(interval);
    };
  }, []);

  const loadClusterStatus = async () => {
    try {
      const response = await statusAPI.getCluster();
      setClusterStatus(response.data);
      setOffline(response.data.node_status === 'OFFLINE');
    } catch (error) {
      console.error('Failed to load cluster status:', error);
      // Set default offline status if API fails
      setOffline(true);
      setClusterStatus({
        cluster_name: 'ARC-AI-Local',
        node_status: 'OFFLINE',
        cache_hit_rate: 0,
        queued_packets: 0,
        active_mini_hubs: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const value = {
    clusterStatus,
    loading,
    offline,
    refresh: loadClusterStatus,
  };

  return <ClusterContext.Provider value={value}>{children}</ClusterContext.Provider>;
};

export const useCluster = () => {
  const context = useContext(ClusterContext);
  if (!context) {
    throw new Error('useCluster must be used within ClusterProvider');
  }
  return context;
};

