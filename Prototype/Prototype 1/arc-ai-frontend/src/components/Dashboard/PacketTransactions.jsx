import { useState, useEffect } from 'react';
import { packetAPI } from '../../utils/api';
import { t } from '../../i18n/strings';

const PacketTransactions = () => {
  const [packets, setPackets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    dateRange: '',
  });

  useEffect(() => {
    loadPackets();
  }, [filters]);

  const loadPackets = async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (filters.status) {
        params.status = filters.status;
      }
      const response = await packetAPI.list(params);
      setPackets(response.data);
    } catch (error) {
      console.error('Failed to load packets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (pktId) => {
    try {
      await packetAPI.retry(pktId);
      loadPackets();
    } catch (error) {
      console.error('Failed to retry packet:', error);
    }
  };

  const handleViewDetails = async (pktId) => {
    try {
      const response = await packetAPI.get(pktId);
      setSelectedPacket(response.data);
    } catch (error) {
      console.error('Failed to load packet details:', error);
    }
  };

  const exportCSV = () => {
    const headers = [
      'pkt_id',
      'timestamp',
      'src',
      'dst',
      'type',
      'size_bytes',
      'status',
      'q_hash',
      'signature_verified',
    ];
    const rows = packets.map((p) => [
      p.pkt_id,
      p.timestamp,
      p.src,
      p.dst,
      p.type,
      p.size_bytes,
      p.status,
      p.q_hash,
      p.signature_verified,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `packets_${new Date().toISOString()}.csv`;
    a.click();
  };

  const getStatusColor = (status) => {
    const colors = {
      SENT: 'bg-blue-100 text-blue-800',
      ACKED: 'bg-success text-white',
      QUEUED: 'bg-warning text-warning',
      FAILED: 'bg-danger text-white',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="card bg-steel-blue">
        <div className="flex flex-wrap gap-4 items-center justify-between text-white">
          <div className="flex gap-4">
            <button onClick={loadPackets} className="btn-secondary">
              Refresh
            </button>
            <button onClick={exportCSV} className="btn-secondary">
              {t('packets.exportLogs')}
            </button>
            <button className="btn-secondary">
              {t('packets.forceSync')}
            </button>
            <button className="btn-secondary">
              {t('packets.requestManifest')}
            </button>
          </div>
          <div className="flex gap-4">
            <select
              className="input"
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="">All Status</option>
              <option value="SENT">SENT</option>
              <option value="ACKED">ACKED</option>
              <option value="QUEUED">QUEUED</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Packet Table */}
      <div className="card bg-steel-blue overflow-x-auto">
        <h2 className="text-2xl font-bold mb-4 text-white">{t('packets.title')}</h2>
        {loading ? (
          <p className="text-gray-200">Loading packets...</p>
        ) : (
          <table className="w-full text-sm text-white" role="table">
            <thead>
              <tr className="border-b border-white/30">
                <th className="text-left p-2 text-white">{t('packets.timestamp')}</th>
                <th className="text-left p-2 text-white">{t('packets.packetId')}</th>
                <th className="text-left p-2 text-white">{t('packets.source')}</th>
                <th className="text-left p-2 text-white">{t('packets.destination')}</th>
                <th className="text-left p-2 text-white">{t('packets.type')}</th>
                <th className="text-left p-2 text-white">{t('packets.size')}</th>
                <th className="text-left p-2 text-white">{t('packets.status')}</th>
                <th className="text-left p-2 text-white">{t('packets.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {packets.map((packet) => (
                <tr key={packet.pkt_id} className="border-b border-white/30 hover:bg-white/10">
                  <td className="p-2 text-white">
                    {new Date(packet.timestamp).toLocaleString()}
                  </td>
                  <td className="p-2 font-mono text-xs text-white">{packet.pkt_id}</td>
                  <td className="p-2 text-white">{packet.src}</td>
                  <td className="p-2 text-white">{packet.dst}</td>
                  <td className="p-2 text-white">{packet.type}</td>
                  <td className="p-2 text-white">{packet.size_bytes} B</td>
                  <td className="p-2 text-white">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        packet.status
                      )}`}
                    >
                      {packet.status}
                    </span>
                  </td>
                  <td className="p-2 text-white">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetails(packet.pkt_id)}
                        className="text-white hover:text-gray-200 hover:underline text-xs"
                      >
                        {t('packets.viewDetails')}
                      </button>
                      {packet.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetry(packet.pkt_id)}
                          className="text-yellow-300 hover:text-yellow-200 hover:underline text-xs"
                        >
                          {t('packets.retry')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Packet Detail Modal */}
      {selectedPacket && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedPacket(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Packet Details</h3>
              <button
                onClick={() => setSelectedPacket(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <strong>ID:</strong> {selectedPacket.pkt_id}
              </p>
              <p>
                <strong>Status:</strong> {selectedPacket.status}
              </p>
              <p>
                <strong>Payload:</strong> {selectedPacket.payload_preview}
              </p>
              <p>
                <strong>Hash:</strong> {selectedPacket.q_hash}
              </p>
              <p>
                <strong>Signature Verified:</strong>{' '}
                {selectedPacket.signature_verified ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PacketTransactions;


