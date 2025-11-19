'use client';

import { useEffect, useState } from 'react';
import { useChat } from '@/hooks/useChat';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import LoadingIndicator from '@/components/LoadingIndicator';
import ConnectionStatus from '@/components/ConnectionStatus';

export default function Home() {
  const [miniHubUrl, setMiniHubUrl] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { messages, isLoading, error, connectionStatus, sendMessage, clearChat } =
    useChat(miniHubUrl);

  // Load Mini Hub URL from environment or localStorage
  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_MINI_HUB_URL;
    const storedUrl = localStorage.getItem('mini-hub-url');

    console.log('🔧 Loading Mini Hub URL...');
    console.log('Environment URL:', envUrl);
    console.log('Stored URL:', storedUrl);

    if (envUrl) {
      console.log('✅ Using environment URL:', envUrl);
      setMiniHubUrl(envUrl);
    } else if (storedUrl) {
      console.log('✅ Using stored URL:', storedUrl);
      setMiniHubUrl(storedUrl);
    } else {
      console.log('❌ No URL configured, opening settings');
      // Prompt user for URL if not configured
      setIsSettingsOpen(true);
    }
  }, []);

  // Save URL to localStorage when it changes
  useEffect(() => {
    if (miniHubUrl) {
      localStorage.setItem('mini-hub-url', miniHubUrl);
    }
  }, [miniHubUrl]);

  const handleSaveSettings = (url: string) => {
    setMiniHubUrl(url.trim());
    setIsSettingsOpen(false);
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            ARC AI Chat
          </h1>
          <div className="flex items-center gap-3">
            {/* Debug info */}
            <div className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              Status: {connectionStatus} | URL: {miniHubUrl || 'none'}
            </div>
            <ConnectionStatus status={connectionStatus} miniHubUrl={miniHubUrl} />
            <button
              onClick={() => {
                console.log('🔧 Manual connection test triggered');
                console.log('Current miniHubUrl:', miniHubUrl);
                // Force a connection check
                window.location.reload();
              }}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
              aria-label="Test Connection"
            >
              🔄
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
              aria-label="Settings"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Clear chat"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Settings
            </h2>
            <div className="mb-4">
              <label
                htmlFor="mini-hub-url"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Mini Hub URL
              </label>
              <input
                type="text"
                id="mini-hub-url"
                value={miniHubUrl}
                onChange={(e) => setMiniHubUrl(e.target.value)}
                placeholder="http://192.168.1.10:8080"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Enter the URL of your Mini Hub web server (e.g., http://192.168.1.10:8080)
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleSaveSettings(miniHubUrl)}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                Save
              </button>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-4">
        <div className="max-w-4xl mx-auto px-4 pt-6">
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to ARC AI Chat
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Start a conversation by typing a message below
              </p>
              {!miniHubUrl && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Please configure Mini Hub URL in settings
                </p>
              )}
            </div>
          )}

          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {isLoading && <LoadingIndicator />}

          {error && connectionStatus === 'error' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>
      </main>

      {/* Chat Input */}
      <ChatInput
        onSendMessage={sendMessage}
        isLoading={isLoading}
        disabled={!miniHubUrl || connectionStatus === 'disconnected'}
      />
    </div>
  );
}

