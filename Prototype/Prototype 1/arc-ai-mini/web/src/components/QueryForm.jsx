import { useMemo, useState } from 'react';

const MAX_LENGTH = 500;

const QueryForm = ({ onSend, isSending }) => {
  const [message, setMessage] = useState('');

  const remaining = useMemo(
    () => Math.max(0, MAX_LENGTH - message.length),
    [message],
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }
    onSend(trimmed);
    setMessage('');
  };

  return (
    <form className="query-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label htmlFor="message">Packet Payload</label>
        <span className="char-remaining">
          {remaining}
          {' '}
          characters remaining
        </span>
      </div>
      <textarea
        id="message"
        name="message"
        rows={4}
        maxLength={MAX_LENGTH}
        placeholder="E.g., &quot;Hello, can you help with today&apos;s mission checklist?&quot;"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        disabled={isSending}
      />
      <button type="submit" className="button primary" disabled={isSending}>
        {isSending ? 'Dispatching…' : 'Send to Mini Hub'}
      </button>
    </form>
  );
};

export default QueryForm;
