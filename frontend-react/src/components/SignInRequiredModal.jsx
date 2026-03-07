import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/sign-in-required-modal.css';

export default function SignInRequiredModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="sign-in-required-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sign-in-required-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="sign-in-required-modal">
        <p id="sign-in-required-title" className="sign-in-required-message">
          You need to sign in to do that.
        </p>
        <p className="sign-in-required-sub">
          Sign in or create an account to add items to your cart or wishlist.
        </p>
        <div className="sign-in-required-actions">
          <Link to="/login" className="sign-in-required-btn" onClick={onClose}>
            Sign in
          </Link>
          <Link to="/register" className="sign-in-required-link" onClick={onClose}>
            Don&apos;t have an account? Sign up here
          </Link>
        </div>
        <button
          type="button"
          className="sign-in-required-close"
          aria-label="Close"
          onClick={onClose}
        >
          <i className="fas fa-times" />
        </button>
      </div>
    </div>
  );
}
