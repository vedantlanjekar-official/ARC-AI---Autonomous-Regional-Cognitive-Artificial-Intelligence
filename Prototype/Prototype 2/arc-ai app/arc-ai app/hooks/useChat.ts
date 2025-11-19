'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { askQuestion, checkConnection } from '@/lib/api';
import { saveMessages, loadMessages, clearMessages as clearStorage } from '@/lib/storage';
import { Message, ConnectionStatus } from '@/lib/types';

export function useChat(miniHubUrl: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const messagesRef = useRef<Message[]>([]);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keep messagesRef in sync with messages
  useEffect(() => {
    messagesRef.current = messages;
    saveMessages(messages);
  }, [messages]);

  // Load messages from localStorage on mount
  useEffect(() => {
    const loadedMessages = loadMessages();
    if (loadedMessages.length > 0) {
      setMessages(loadedMessages);
      messagesRef.current = loadedMessages;
    }
  }, []);

  // Check connection status constantly
  useEffect(() => {
    console.log('🔧 useChat: miniHubUrl changed to:', miniHubUrl);
    
    if (!miniHubUrl) {
      console.log('❌ useChat: No miniHubUrl provided');
      setConnectionStatus('error');
      return;
    }

    if (miniHubUrl.trim() === '') {
      console.log('❌ useChat: Empty miniHubUrl');
      setConnectionStatus('error');
      return;
    }

    const checkConnectionStatus = async () => {
      console.log('🔄 useChat: Starting connection check for:', miniHubUrl);
      console.log('🔄 useChat: Setting status to connecting...');
      setConnectionStatus('connecting');
      
      const isConnected = await checkConnection(miniHubUrl);
      console.log(`🔄 useChat: Connection result for ${miniHubUrl}:`, isConnected);
      
      const newStatus = isConnected ? 'connected' : 'disconnected';
      console.log(`🔄 useChat: Setting connection status to:`, newStatus);
      setConnectionStatus(newStatus);
      
      // Verify the status was set correctly
      console.log('🔄 useChat: Status should now be:', newStatus);
    };

    // Check immediately
    checkConnectionStatus();

    // Check every 5 seconds for constant connectivity
    checkIntervalRef.current = setInterval(checkConnectionStatus, 5000);

    return () => {
      if (checkIntervalRef.current) {
        console.log('🧹 useChat: Cleaning up connection check interval');
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [miniHubUrl]);

  const sendMessage = useCallback(
    async (question: string) => {
      if (!question.trim() || isLoading) return;
      if (!miniHubUrl) {
        setError('Mini Hub URL is not configured');
        return;
      }

      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: question.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);
      setConnectionStatus('connecting');

      const maxRetries = 3;
      let attempt = 0;

      while (attempt < maxRetries) {
        try {
          console.log(`💬 Sending message (attempt ${attempt + 1}/${maxRetries})`);
          const response = await askQuestion(question.trim(), miniHubUrl);

          if (response.status === 'ok' && response.answer) {
            const aiMessage: Message = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: response.answer,
              timestamp: new Date(),
              tokens: response.tokens,
            };

            setMessages((prev) => [...prev, aiMessage]);
            setConnectionStatus('connected');
            setIsLoading(false);
            return; // Success - exit retry loop
          } else {
            const errorMessage = response.error || 'Unknown error occurred';
            console.log(`⚠️ Response error: ${errorMessage}`);
            
            if (attempt === maxRetries - 1) {
              // Last attempt failed
              setError(errorMessage);
              setConnectionStatus('error');

              const errorMsg: Message = {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: `❌ Error: ${errorMessage}`,
                timestamp: new Date(),
              };

              setMessages((prev) => [...prev, errorMsg]);
            }
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to get response from Mini Hub';
          console.log(`❌ Request failed (attempt ${attempt + 1}): ${errorMessage}`);

          if (attempt === maxRetries - 1) {
            // Last attempt failed
            setError(errorMessage);
            setConnectionStatus('disconnected');

            const errorMsg: Message = {
              id: `error-${Date.now()}`,
              role: 'assistant',
              content: `❌ Connection Error: ${errorMessage}. Retrying connection...`,
              timestamp: new Date(),
            };

            setMessages((prev) => [...prev, errorMsg]);
          }
        }

        attempt++;
        if (attempt < maxRetries) {
          console.log(`🔄 Retrying in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        }
      }

      setIsLoading(false);
    },
    [miniHubUrl, isLoading]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    clearStorage();
    messagesRef.current = [];
  }, []);

  return {
    messages,
    isLoading,
    error,
    connectionStatus,
    sendMessage,
    clearChat,
  };
}

