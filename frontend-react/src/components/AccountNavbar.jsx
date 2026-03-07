import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/account-navbar.css';

export default function AccountNavbar() {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isSettings = location.pathname.includes('settings');

  const handleSignOut = async (e) => {
    e.preventDefault();
    setDropdownOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <nav className="account-navbar">
      <div className="account-nav-container">
        {/* Left: Home + tab links */}
        <div className="account-nav-left">
          <Link to="/" className="account-nav-home" aria-label="Back to Home">
            <i className="fas fa-arrow-left" />
            <span>Home</span>
          </Link>
          <span className="account-nav-divider" aria-hidden="true">|</span>
          <Link
            to="/profile"
            className={`account-nav-tab${!isSettings ? ' active' : ''}`}
            id="account-tab-profile"
          >
            My Profile
          </Link>
          <Link
            to="/settings"
            className={`account-nav-tab${isSettings ? ' active' : ''}`}
            id="account-tab-settings"
          >
            Settings
          </Link>
        </div>

        {/* Center: brand title */}
        <div className="account-nav-center">
          <span className="account-nav-title">Lavitúr</span>
        </div>

        {/* Right: icons */}
        <div className="account-nav-right">
          <Link to="/wishlist" className="account-nav-icon" aria-label="Wishlist" title="Wishlist">
            <i className="fas fa-heart" />
          </Link>

          <div className="account-nav-menu">
            <button
              type="button"
              className="account-nav-icon account-menu-toggle"
              aria-label="Account"
              title="Account"
              onClick={() => setDropdownOpen((o) => !o)}
            >
              <i className="fas fa-user" />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="acct-nav-backdrop"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="acct-nav-dropdown show">
                  <a href="#" onClick={handleSignOut}>Sign Out</a>
                </div>
              </>
            )}
          </div>

          <Link to="/cart" className="account-nav-icon" aria-label="Cart" title="Cart">
            <i className="fas fa-shopping-bag" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
