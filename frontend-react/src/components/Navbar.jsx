import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/navbar.css';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const isStaff = profile?.role === 'admin' || profile?.role === 'representative';
  const isIndex = location.pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile drawer when navigating
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile drawer on backdrop/escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Mirror vanilla's <body class="index-page"> so body:not(.index-page) .navbar CSS works exactly
  useEffect(() => {
    document.body.classList.toggle('index-page', isIndex);
    return () => document.body.classList.remove('index-page');
  }, [isIndex]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.classList.toggle('mobile-nav-open', mobileOpen);
    return () => document.body.classList.remove('mobile-nav-open');
  }, [mobileOpen]);

  const navClass = ['navbar', isIndex ? 'on-index' : '', scrolled ? 'scrolled' : ''].filter(Boolean).join(' ');

  const handleSignOut = (e) => {
    e.preventDefault();
    signOut();
  };

  return (
    <nav className={navClass} id="main-navbar">
      {/* Announcement Bar */}
      <div className="nav-announcement">
        <p>complimentary worldwide shipping on orders over €200 · free returns</p>
      </div>

      <div className="nav-container">
        {/* Logo: scroll to top on home, go home from other pages */}
        <Link
          to="/"
          className="brand-logo"
          aria-label="Lavitúr Home"
          onClick={(e) => {
            if (location.pathname === '/') {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        >
          <img src="/images/icons/LOGO2.png" alt="Lavitúr" />
        </Link>

        {/* Desktop Nav Links */}
        <ul className="nav-links">
          <li><Link to="/">Home</Link></li>

          {/* Shop with Mega Menu */}
          <li className="nav-dropdown nav-dropdown-shop">
            <Link to="/shop" className="nav-link-trigger">
              Shop <span className="nav-chevron">‹</span>
            </Link>
            <div className="mega-menu">
              <div className="mega-menu-inner">
                <div className="mega-col">
                  <Link to="/shop?category=womenswear" className="mega-img-link">
                    <img src="/images/examples/Formal Girl.jpeg" alt="Women's wear" />
                    <span>Women's wear</span>
                  </Link>
                </div>
                <div className="mega-col">
                  <Link to="/shop?category=menswear" className="mega-img-link">
                    <img src="/images/examples/formal men.jpeg" alt="Men's wear" />
                    <span>Men's wear</span>
                  </Link>
                </div>
                <div className="mega-col">
                  <Link to="/shop?category=niche" className="mega-img-link">
                    <img src="/images/slideshow/Niche.png" alt="Niche Line" />
                    <span>Niche Line</span>
                  </Link>
                </div>
              </div>
            </div>
          </li>

          <li><Link to="/about">Our Story</Link></li>
          <li><Link to="/contact">Contact</Link></li>
        </ul>

        {/* Nav Icons */}
        <div className="nav-icons">
          <Link to={user ? "/wishlist" : "/login"} className="nav-icon" aria-label="Wishlist">
            <i className="fas fa-heart" />
          </Link>

          <div className="account-dropdown">
            <a href="#" className="nav-icon" aria-label="Account">
              <i className="fas fa-user" />
            </a>
            <ul className="dropdown-menu">
              {user ? (
                <>
                  {isStaff && <li><a href="/admin-panel/index.html">Admin Dashboard</a></li>}
                  <li><Link to="/profile">Profile</Link></li>
                  <li><Link to="/settings">Settings</Link></li>
                  <li><a href="#" onClick={handleSignOut}>Log Out</a></li>
                </>
              ) : (
                <li><Link to="/login">Login / Register</Link></li>
              )}
            </ul>
          </div>

          <Link to={user ? "/cart" : "/login"} className="nav-icon nav-icon-bag" aria-label="Cart">
            <i className="fas fa-shopping-bag" />
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          type="button"
          className={`mobile-menu-toggle${mobileOpen ? ' active' : ''}`}
          aria-label="Toggle navigation"
          onClick={() => setMobileOpen((o) => !o)}
        >
          <span className="hamburger" />
        </button>
      </div>

      {/* Mobile Backdrop */}
      <div
        className={`mobile-drawer-backdrop${mobileOpen ? ' open' : ''}`}
        id="mobile-drawer-backdrop"
        aria-hidden="true"
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile Drawer */}
      <div className={`mobile-drawer${mobileOpen ? ' open' : ''}`}>
        <div className="mobile-drawer-inner">
          <button
            type="button"
            className="mobile-drawer-close"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          >
            <i className="fas fa-times" />
          </button>
          <ul className="mobile-nav-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/shop">Shop</Link></li>
            <li><Link to="/shop?category=womenswear">Women's wear</Link></li>
            <li><Link to="/shop?category=menswear">Men's wear</Link></li>
            <li><Link to="/shop?category=niche">Niche Line</Link></li>
            <li><Link to="/about">Our Story</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to={user ? "/wishlist" : "/login"}>Wishlist</Link></li>
            <li><Link to={user ? "/cart" : "/login"}>Cart</Link></li>
            {user ? (
              <>
                <li><Link to="/profile">Profile</Link></li>
                <li><Link to="/settings">Settings</Link></li>
                <li><a href="#" onClick={handleSignOut}>Log Out</a></li>
              </>
            ) : (
              <li><Link to="/login">Login / Register</Link></li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
