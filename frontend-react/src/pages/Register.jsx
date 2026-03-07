import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/register.css';

const usernameRegex = /^[a-zA-Z0-9._]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const pwdRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/;

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!usernameRegex.test(username)) {
      setError('Username: letters, numbers, dots, underscores only.');
      return;
    }
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email.');
      return;
    }
    if (!pwdRegex.test(password)) {
      setError('Password: ≥8 chars, include a number & special character.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await signUp({
        email,
        password,
        options: { data: { username, full_name: fullName } },
      });
      navigate('/login');
    } catch (err) {
      setError(err?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="register-section">
      <div className="form-wrapper">
        <h1>Create Your Lavitúr Account</h1>
        <form onSubmit={handleSubmit} id="register-form">
          <div className="form-group">
            <label htmlFor="fullname">Full Name</label>
            <input type="text" id="fullname" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <small>Minimum 8 characters, including 1 number & 1 special character</small>
          </div>
          <div className="form-group">
            <label htmlFor="confirm">Confirm Password</label>
            <input type="password" id="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          {error && <div className="error-message" style={{ display: 'block' }}>{error}</div>}
          <button type="submit" className="cta-button" disabled={loading}>{loading ? 'Creating…' : 'Register'}</button>
        </form>
        <p className="alt-link">Already have an account? <Link to="/login">Log in here</Link></p>
      </div>
    </section>
  );
}
