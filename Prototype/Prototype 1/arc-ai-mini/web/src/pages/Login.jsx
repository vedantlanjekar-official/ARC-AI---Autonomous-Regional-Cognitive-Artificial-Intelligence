import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { loginUser, registerUser } from '../services/api.js';

const initialForm = {
  username: '',
  password: '',
  confirm: '',
};

const Login = () => {
  const [activeTab, setActiveTab] = useState('signin');
  const [formValues, setFormValues] = useState(initialForm);
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const updateField = (field, value) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSignIn = async (event) => {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);
    try {
      const response = await loginUser(
        formValues.username.trim(),
        formValues.password,
      );
      login(response.token, response.username, response.stats);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (event) => {
    event.preventDefault();
    setFeedback(null);

    if (formValues.password !== formValues.confirm) {
      setFeedback({ type: 'error', message: 'Passwords do not match' });
      return;
    }

    setIsSubmitting(true);
    try {
      await registerUser(formValues.username.trim(), formValues.password);
      const response = await loginUser(
        formValues.username.trim(),
        formValues.password,
      );
      login(response.token, response.username, response.stats);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFeedback = () =>
    feedback ? (
      <div className={`auth-feedback ${feedback.type}`}>
        {feedback.message}
      </div>
    ) : null;

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-header">
          <div>
            <h1>Welcome Back</h1>
            <p>Authenticate to orchestrate packets and view live telemetry.</p>
          </div>
          <Link to="/" className="ghost-link">
            ← Back to overview
          </Link>
        </div>

        <div className="tab-row">
          <button
            type="button"
            className={`tab-button ${activeTab === 'signin' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('signin');
              setFeedback(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`tab-button ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('signup');
              setFeedback(null);
            }}
          >
            Create Account
          </button>
        </div>

        {activeTab === 'signin' ? (
          <form className="auth-form" onSubmit={handleSignIn}>
            <label htmlFor="signin-username">Username</label>
            <input
              id="signin-username"
              name="username"
              autoComplete="username"
              value={formValues.username}
              onChange={(event) => updateField('username', event.target.value)}
              placeholder="operator_a"
              required
            />

            <label htmlFor="signin-password">Password</label>
            <input
              id="signin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={formValues.password}
              onChange={(event) => updateField('password', event.target.value)}
              placeholder="••••••••"
              required
            />

            {renderFeedback()}

            <button type="submit" className="button primary block" disabled={isSubmitting}>
              {isSubmitting ? 'Signing In…' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleSignUp}>
            <label htmlFor="signup-username">Username</label>
            <input
              id="signup-username"
              name="username"
              autoComplete="username"
              value={formValues.username}
              onChange={(event) => updateField('username', event.target.value)}
              placeholder="operator_a"
              required
            />

            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={formValues.password}
              onChange={(event) => updateField('password', event.target.value)}
              placeholder="At least 6 characters"
              required
            />

            <label htmlFor="signup-confirm">Confirm Password</label>
            <input
              id="signup-confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              value={formValues.confirm}
              onChange={(event) => updateField('confirm', event.target.value)}
              placeholder="Re-enter password"
              required
            />

            {renderFeedback()}

            <button type="submit" className="button primary block" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Account…' : 'Create Account'}
            </button>
          </form>
        )}

        <footer className="auth-footer">
          <p>
            Need help? Contact the ARC relay team or review the setup guide in the dashboard.
          </p>
        </footer>
      </section>
    </main>
  );
};

export default Login;
