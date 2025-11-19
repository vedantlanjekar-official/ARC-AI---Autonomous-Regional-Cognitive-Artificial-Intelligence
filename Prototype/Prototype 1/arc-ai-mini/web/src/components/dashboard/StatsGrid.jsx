const metricDetails = [
  {
    key: 'total',
    label: 'Total Packets',
    accent: 'accent-blue',
    tooltip: 'Packets you have dispatched through the relay',
  },
  {
    key: 'delivered',
    label: 'Delivered',
    accent: 'accent-green',
    tooltip: 'Packets that completed a full round trip',
  },
  {
    key: 'pending',
    label: 'Pending',
    accent: 'accent-amber',
    tooltip: 'Packets waiting for a reply or retry',
  },
  {
    key: 'failed',
    label: 'Failed',
    accent: 'accent-rose',
    tooltip: 'Packets that exhausted retries without success',
  },
];

const StatsGrid = ({ stats }) => (
  <section className="stats-grid">
    {metricDetails.map((metric) => (
      <article key={metric.key} className={`stat-card ${metric.accent}`}>
        <header>
          <span>{metric.label}</span>
          <span className="tooltip">{metric.tooltip}</span>
        </header>
        <strong>{stats?.[metric.key] ?? 0}</strong>
      </article>
    ))}
  </section>
);

export default StatsGrid;

