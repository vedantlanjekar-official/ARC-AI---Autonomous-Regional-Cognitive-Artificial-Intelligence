'use client';

import { ConnectionStatus as ConnectionStatusType } from '@/lib/types';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  miniHubUrl?: string;
}

export default function ConnectionStatus({
  status,
  miniHubUrl,
}: ConnectionStatusProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  if (!miniHubUrl) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-full">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="text-xs font-medium text-red-700 dark:text-red-300">
          Mini Hub URL not configured
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
      <div className={`w-2 h-2 ${getStatusColor()} rounded-full animate-pulse`}></div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {getStatusText()}
      </span>
      {status === 'connected' && (
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
          {miniHubUrl}
        </span>
      )}
    </div>
  );
}

