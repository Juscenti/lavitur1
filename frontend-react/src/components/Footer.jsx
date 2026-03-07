import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <nav className="footer-links">
          <Link to="/shop">Shop</Link>
          <Link to="/about">Our Story</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/wishlist">Wishlist</Link>
        </nav>
        <p>&copy; 2025 Lavitúr. All rights reserved.</p>
      </div>
    </footer>
  );
}
