import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/login.css';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError(err?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="account-container">
      <h1>Log In to Your Lavitúr Account</h1>
      <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
        <label htmlFor="username">Email</label>
        <input type="email" id="username" value={email} onChange={(e) => setEmail(e.target.value)} required aria-label="Email" />
        <label htmlFor="password">Password</label>
        <div className="password-wrapper">
          <input type={showPassword ? 'text' : 'password'} id="password" value={password} onChange={(e) => setPassword(e.target.value)} required aria-label="Password" />
          <i className={`fa ${showPassword ? 'fa-eye-slash' : 'fa-eye'} toggle-password`} onClick={() => setShowPassword(!showPassword)} role="button" tabIndex={0} aria-label="Toggle password" />
        </div>
        <div id="login-error" className="login-error" role="alert" style={{ display: error ? 'block' : 'none' }}>{error}</div>
        <button type="submit" id="login-button" disabled={loading}>{loading ? 'Signing in…' : 'Log In'}</button>
      </form>
      <p className="register-link">New to Lavitúr? <Link to="/register">Register here</Link></p>
    </main>
  );
}
