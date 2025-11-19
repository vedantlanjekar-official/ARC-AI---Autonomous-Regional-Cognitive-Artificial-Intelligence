const statusLabels = {
  delivered: { label: 'Delivered', className: 'status delivered' },
  pending: { label: 'Pending', className: 'status pending' },
  failed: { label: 'Failed', className: 'status failed' },
  error: { label: 'Error', className: 'status failed' },
  reply_ready: { label: 'Reply Ready', className: 'status delivered' },
  in_transit: { label: 'In Transit', className: 'status pending' },
};

const formatDateTime = (isoString) => {
  if (!isoString) {
    return '–';
  }
  try {
    const date = new Date(isoString);
    return date.toLocaleString();
  } catch {
    return isoString;
  }
};

const RecentPackets = ({ packets = [], onSelect }) => {
  if (!packets.length) {
    return <p className="empty-state">No packets yet. Dispatch one to build a history.</p>;
  }

  return (
    <div className="packet-table-wrapper">
      <table className="packet-table">
        <thead>
          <tr>
            <th>Packet ID</th>
            <th>Destination</th>
            <th>Status</th>
            <th>Created At</th>
            <th>Updated</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {packets.map((packet) => {
            const status = statusLabels[packet.status] || statusLabels.pending;
            return (
              <tr key={packet.pkt_id}>
                <td>{packet.pkt_id}</td>
                <td>{packet.dst}</td>
                <td>
                  <span className={status.className}>{status.label}</span>
                </td>
                <td>{formatDateTime(packet.created_at)}</td>
                <td>{formatDateTime(packet.updated_at)}</td>
                <td>
                  <button
                    type="button"
                    className="button mini"
                    onClick={() => onSelect(packet.pkt_id)}
                  >
                    View timeline
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RecentPackets;

