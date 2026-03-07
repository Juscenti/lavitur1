import { Link } from 'react-router-dom';

export default function VideoHero() {
  return (
    <section className="video-hero">
      <video autoPlay muted loop playsInline>
        <source src="/videos/background vid.mp4" type="video/mp4" />
      </video>
      <div className="video-overlay">
        <h2>Our Story</h2>
        <p>Discover the roots of Lavitúr: Home of Luxury Streetwear where tradition meets the streets.</p>
        <Link to="/about" className="btn">Learn More</Link>
      </div>
    </section>
  );
}
