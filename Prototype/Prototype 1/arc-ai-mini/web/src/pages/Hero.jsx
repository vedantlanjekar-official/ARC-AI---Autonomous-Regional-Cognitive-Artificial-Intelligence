import { Link } from 'react-router-dom';
import heroIllustration from '../assets/react.svg';

const featureList = [
  {
    title: 'Secure Relay',
    description:
      'End-to-end authenticated channel from User A through both hubs to Person B and back.',
  },
  {
    title: 'Instant Insights',
    description:
      'Live packet timeline with precise hop-by-hop visibility and persistent audit trail.',
  },
  {
    title: 'Operational Metrics',
    description:
      'Dashboard stats show deliveries, pending items, and failures in real time.',
  },
];

const steps = [
  'Sign in or create a workspace identity.',
  'Compose a packet and dispatch via the mini hub.',
  'Track every hand-off as it routes to Person B and back.',
];

const Hero = () => (
  <main className="hero-shell">
    <section className="hero-header">
      <div className="hero-copy">
        <span className="badge">ARC Relay Prototype</span>
        <h1>
          Observe Every Packet
          {' '}
          <span className="gradient-text">End-to-End</span>
        </h1>
        <p>
          Demonstrate resilient packet routing between distributed hubs.
          Authenticate users, launch messages, and review live telemetry
          without leaving your browser.
        </p>
        <div className="hero-actions">
          <Link to="/auth" className="button primary">
            Sign In
          </Link>
          <a
            href="#features"
            className="button secondary"
          >
            Explore Features
          </a>
        </div>
      </div>

      <div className="hero-visual">
        <img src={heroIllustration} alt="Packet flow illustration" />
      </div>
    </section>

    <section id="features" className="feature-grid">
      {featureList.map((feature) => (
        <article key={feature.title} className="feature-card">
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
        </article>
      ))}
    </section>

    <section className="process-section">
      <h2>How It Works</h2>
      <ol className="process-steps">
        {steps.map((step, index) => (
          <li key={step}>
            <span className="step-index">{index + 1}</span>
            <p>{step}</p>
          </li>
        ))}
      </ol>
    </section>
  </main>
);

export default Hero;

