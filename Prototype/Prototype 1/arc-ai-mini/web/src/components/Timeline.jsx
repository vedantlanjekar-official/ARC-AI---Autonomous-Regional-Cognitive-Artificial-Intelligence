const Timeline = ({ items }) => {
  if (!items.length) {
    return <p className="timeline-empty">No events yet. Send a message to see the flow.</p>;
  }

  return (
    <ol className="timeline-list">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="timeline-item">
          <span className="timeline-step">{index + 1}.</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
};

export default Timeline;

