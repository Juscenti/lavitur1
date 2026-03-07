import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/simple-navbar.css';

const PAGE_TITLES = {
  '/shop':     'Shop',
  '/about':    'Our Story',
  '/contact':  'Contact',
  '/cart':     'Cart',
  '/wishlist': 'Wishlist',
  '/login':    'Login',
  '/register': 'Register',
};

export default function SimpleNavbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const rawTitle = PAGE_TITLES[location.pathname] ?? 'Lavitúr';
  const isProductPage = location.pathname.startsWith('/shop/') && location.pathname !== '/shop';

  const handleSignOut = async (e) => {
    e.preventDefault();
    setDropdownOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <nav className="simple-navbar">
      <div className="simple-nav-container">
        {isProductPage ? (
          <Link to="/shop" className="simple-nav-home" aria-label="Return to shop">
            <i className="fas fa-arrow-left" />
            <span>Return to shop</span>
          </Link>
        ) : (
          <Link to="/" className="simple-nav-home" aria-label="Back to Home">
            <i className="fas fa-arrow-left" />
            <span>Home</span>
          </Link>
        )}

        <div className="simple-nav-center">
          {isProductPage ? (
            <Link to="/" className="simple-nav-title simple-nav-title-link">Lavitúr</Link>
          ) : (
            <span className="simple-nav-title">{rawTitle}</span>
          )}
        </div>

        <div className="simple-nav-icons">
          <Link to={user ? "/wishlist" : "/login"} className="simple-nav-icon" aria-label="Wishlist" title="Wishlist">
            <i className="fas fa-heart" />
          </Link>

          <div className="simple-account-menu">
            <button
              type="button"
              className="simple-nav-icon simple-account-toggle"
              aria-label="Account"
              title="Account"
              onClick={() => setDropdownOpen((o) => !o)}
            >
              <i className="fas fa-user" />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="simple-dropdown-backdrop"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="simple-dropdown-menu show">
                  {user ? (
                    <>
                      <Link to="/profile"   onClick={() => setDropdownOpen(false)}>My Profile</Link>
                      <Link to="/settings"  onClick={() => setDropdownOpen(false)}>Settings</Link>
                      <a href="#" onClick={handleSignOut}>Sign Out</a>
                    </>
                  ) : (
                    <Link to="/login" onClick={() => setDropdownOpen(false)}>Login / Register</Link>
                  )}
                </div>
              </>
            )}
          </div>

          <Link to={user ? "/cart" : "/login"} className="simple-nav-icon" aria-label="Cart" title="Cart">
            <i className="fas fa-shopping-bag" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
