import { useState, useEffect, useRef } from 'react';
import { queryAPI } from '../../utils/api';
import { wsClient } from '../../utils/websocket';
import { t } from '../../i18n/strings';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Load chat history from localStorage or use dummy data
    const history = localStorage.getItem('chat_history');
    if (history) {
      try {
        const parsed = JSON.parse(history);
        if (parsed.messages && parsed.messages.length > 0) {
          setMessages(parsed.messages);
          return;
        }
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
    }
    
    // Initialize with dummy chat messages if no history exists
    const dummyMessages = [
      {
        role: 'user',
        text: 'What is a superconductor?',
        time: new Date(Date.now() - 10 * 60000).toISOString(),
      },
      {
        role: 'assistant',
        text: 'A superconductor is a material that can conduct electricity with zero electrical resistance when cooled below a certain critical temperature. This phenomenon was first discovered in 1911 by Heike Kamerlingh Onnes. Superconductors also exhibit the Meissner effect, where they expel magnetic fields from their interior.\n\nKey characteristics:\n• Zero electrical resistance below critical temperature\n• Expulsion of magnetic fields (Meissner effect)\n• Used in applications like MRI machines, particle accelerators, and quantum computing\n• Two main types: Type I (elemental) and Type II (alloys and compounds)\n\nThe most common high-temperature superconductor is YBCO (Yttrium Barium Copper Oxide), which becomes superconducting at around -181°C.',
        provenance: 'MainHub',
        capsule_id: 'cap_superconductor_001',
        confidence: 0.92,
        time: new Date(Date.now() - 10 * 60000 + 2000).toISOString(),
      },
      {
        role: 'user',
        text: 'How does ARC-AI handle offline queries?',
        time: new Date(Date.now() - 5 * 60000).toISOString(),
      },
      {
        role: 'assistant',
        text: 'ARC-AI handles offline queries through a multi-tier mesh architecture:\n\n1. **Local Cache**: First checks local knowledge capsules stored on the Mini Hub\n2. **Mini Hub Network**: Queries nearby Mini Hubs if local cache misses\n3. **Main Hub Sync**: Periodically syncs with regional Main Hub for authoritative answers\n4. **Fallback Mechanism**: If no capsule matches, generates a provisional answer with lower confidence\n\nWhen offline, the system uses cached knowledge capsules that were previously synced. Each capsule is signed and verified, ensuring data integrity even without internet connectivity.',
        provenance: 'LocalCache',
        capsule_id: 'cap_arc_offline_001',
        confidence: 0.78,
        time: new Date(Date.now() - 5 * 60000 + 3000).toISOString(),
      },
    ];
    setMessages(dummyMessages);

    // Set up WebSocket listener for streaming
    const handleMessage = (data) => {
      if (data.type === 'chat_stream') {
        const { chunk, final, provenance, capsule_id, confidence } =
          data.payload;
        
        if (final) {
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.text += chunk;
              lastMsg.provenance = provenance;
              lastMsg.capsule_id = capsule_id;
              lastMsg.confidence = confidence;
            }
            return updated;
          });
          setStreaming(false);
          setLoading(false);
        } else {
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.text += chunk;
            } else {
              updated.push({
                role: 'assistant',
                text: chunk,
                time: new Date().toISOString(),
              });
            }
            return updated;
          });
        }
      }
    };

    wsClient.on('message', handleMessage);

    return () => {
      wsClient.off('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Save chat history to localStorage
    if (messages.length > 0) {
      localStorage.setItem(
        'chat_history',
        JSON.stringify({ messages, updated: new Date().toISOString() })
      );
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      text: input,
      time: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setStreaming(true);

    try {
      const response = await queryAPI.query({
        question: input,
        user_id: 'user_02',
      });

      if (response.status === 202) {
        // Queued response
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: response.data.msg,
            time: new Date().toISOString(),
            queued: true,
          },
        ]);
        setLoading(false);
        setStreaming(false);
      } else {
        // Immediate response
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: response.data.answer,
            provenance: response.data.provenance,
            capsule_id: response.data.capsule_id,
            confidence: response.data.confidence,
            time: new Date().toISOString(),
          },
        ]);
        setLoading(false);
        setStreaming(false);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Error: ${error.message}`,
          time: new Date().toISOString(),
          error: true,
        },
      ]);
      setLoading(false);
      setStreaming(false);
    }
  };

  const getProvenanceLabel = (provenance) => {
    const map = {
      LocalCache: t('chatbot.provenance.localCache'),
      MiniHub: t('chatbot.provenance.miniHub'),
      MainHub: t('chatbot.provenance.mainHub'),
    };
    return map[provenance] || provenance;
  };

  return (
    <div className="card bg-steel-blue h-[600px] flex flex-col">
      <h2 className="text-2xl font-bold mb-4 text-white">{t('chatbot.title')}</h2>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <p className="text-gray-200 text-center py-8">
            Start a conversation by asking a question
          </p>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl p-4 ${
                msg.role === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-white/20 text-white border border-white/30'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
              {msg.provenance && (
                <div className="mt-2 pt-2 border-t border-white/30 text-xs text-gray-200">
                  <p>
                    <strong className="text-white">Provenance:</strong> {getProvenanceLabel(msg.provenance)}
                  </p>
                  {msg.confidence !== undefined && (
                    <p>
                      <strong className="text-white">{t('chatbot.confidence')}:</strong>{' '}
                      {(msg.confidence * 100).toFixed(0)}%
                    </p>
                  )}
                  {msg.provenance === 'LocalCache' && (
                    <div className="mt-2 p-2 bg-yellow-500/30 rounded border border-yellow-400/50">
                      <p className="text-xs text-yellow-200">
                        {t('chatbot.provisional')}
                      </p>
                      <button className="text-xs text-yellow-300 hover:text-yellow-200 mt-1">
                        {t('chatbot.escalate')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/20 border border-white/30 rounded-2xl p-4">
              <p className="text-gray-200">Thinking...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('chatbot.placeholder')}
          className="input flex-1 bg-white text-gray-900 placeholder-gray-500"
          disabled={loading}
          aria-label="Chat input"
        />
        <button
          type="button"
          className="btn-secondary"
          disabled
          aria-label={t('chatbot.mic')}
          title="Voice input coming soon"
        >
          🎤
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !input.trim()}
        >
          {loading ? 'Sending...' : t('chatbot.send')}
        </button>
      </form>
    </div>
  );
};

export default Chatbot;


