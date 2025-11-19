import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QueryForm from '../components/QueryForm.jsx';
import Timeline from '../components/Timeline.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  fetchProfile,
  fetchRecentPackets,
  sendPacket,
} from '../services/api.js';
import StatsGrid from '../components/dashboard/StatsGrid.jsx';
import RecentPackets from '../components/dashboard/RecentPackets.jsx';

const Dashboard = () => {
  const {
    username, token, logout, stats, setStats,
  } = useAuth();
  const [activeTimeline, setActiveTimeline] = useState([]);
  const [activeReply, setActiveReply] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyTimeline, setHistoryTimeline] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const generatePacketId = () =>
    (window.crypto?.randomUUID?.() ?? `pkt-${Date.now()}`);

  const loadProfile = async () => {
    try {
      const profile = await fetchProfile(token);
      setStats(profile.stats);
    } catch (err) {
      console.error('Failed to refresh profile', err);
      logout();
      navigate('/auth', { replace: true });
    }
  };

  const loadHistory = async () => {
    try {
      setIsHistoryLoading(true);
      const { packets } = await fetchRecentPackets(token, 10);
      setHistory(packets);
      if (packets.length) {
        setHistoryTimeline(packets[0].timeline || []);
      } else {
        setHistoryTimeline([]);
      }
    } catch (err) {
      console.error('Failed to load packet history', err);
      setError(err.message);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/auth', { replace: true });
      return;
    }
    loadProfile();
    loadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSend = async (message) => {
    const pktId = generatePacketId();
    const timestamp = new Date().toISOString();
    const packet = {
      pkt_id: pktId,
      dst: 'person_b',
      timestamp,
      payload: message,
    };

    const clientTimeline = [
      `web_ui: ${username} prepared pkt_id=${pktId}`,
      `web_ui: sent pkt_id=${pktId} to mini_hub at ${timestamp}`,
    ];

    setActiveTimeline(clientTimeline);
    setActiveReply(null);
    setError(null);
    setIsSending(true);

    try {
      const response = await sendPacket(token, packet, clientTimeline);
      const resultingTimeline = Array.isArray(response.timeline)
        ? response.timeline
        : clientTimeline;
      setActiveTimeline(resultingTimeline);
      setActiveReply(response.reply);
      await loadProfile();
      await loadHistory();
    } catch (err) {
      const errorMessage = `web_ui: error for pkt_id=${pktId} (${err.message})`;
      setError(err.message);
      setActiveTimeline((current) => [...current, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectHistory = (pktId) => {
    const packet = history.find((item) => item.pkt_id === pktId);
    if (packet) {
      setHistoryTimeline(packet.timeline || []);
    }
  };

  const statsSnapshot = useMemo(
    () => stats || {
      total: 0,
      delivered: 0,
      pending: 0,
      failed: 0,
    },
    [stats],
  );

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <h2>Mission Control</h2>
          <p>
            Logged in as
            {' '}
            <strong>{username}</strong>
            . Dispatch packets and monitor the relay lifecycle.
          </p>
        </div>
        <button type="button" onClick={logout} className="button danger">
          Logout
        </button>
      </header>

      <StatsGrid stats={statsSnapshot} />

      <section className="dashboard-main">
        <div className="panel query-panel">
          <div className="panel-header">
            <div>
              <h3>Compose Packet</h3>
              <p>Create a message for Person B. Every hop is captured.</p>
            </div>
          </div>
          <QueryForm onSend={handleSend} isSending={isSending} />
          {activeReply && (
            <div className="reply-box">
              <h4>Latest Reply</h4>
              <p>{activeReply}</p>
            </div>
          )}
          {error && (
            <div className="error-box">
              <strong>Error:</strong>
              {' '}
              {error}
            </div>
          )}
        </div>

        <div className="panel timeline-panel">
          <div className="panel-header">
            <div>
              <h3>Active Timeline</h3>
              <p>Observe the most recent packet and every relay event.</p>
            </div>
          </div>
          <Timeline items={activeTimeline} />
        </div>
      </section>

      <section className="panel history-panel">
        <div className="panel-header">
          <div>
            <h3>Recent Activity</h3>
            <p>Review historical packets routed through the hubs.</p>
          </div>
          <button
            type="button"
            className="button ghost"
            onClick={loadHistory}
            disabled={isHistoryLoading}
          >
            {isHistoryLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        <RecentPackets
          packets={history}
          onSelect={handleSelectHistory}
        />
        <div className="history-timeline">
          <h4>Selected Packet Timeline</h4>
          <Timeline items={historyTimeline} />
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
