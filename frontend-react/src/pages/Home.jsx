import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import Collections from '../components/Collections';
import VideoHero from '../components/VideoHero';
import TopPicks from '../components/TopPicks';
import '../styles/home.css';

export default function Home() {
  return (
    <div className="index-page">
      <Hero />
      <Collections />

      <section className="index-editorial">
        <div className="index-editorial-inner">
          <h3>Timeless Craft. Modern Edge.</h3>
          <p>
            Lavitúr fuses heritage tailoring with contemporary streetwear. Each piece is designed for those who embrace
            both refinement and authenticity.
          </p>
        </div>
      </section>

      <VideoHero />

      <section className="index-split">
        <Link to="/shop?category=womenswear" className="index-split-tile">
          <img src="/images/examples/streetwear girl.jpeg" alt="Women's wear" />
          <span className="index-split-label">Women</span>
        </Link>
        <Link to="/shop?category=menswear" className="index-split-tile">
          <img src="/images/examples/streetwear men.jpeg" alt="Men's wear" />
          <span className="index-split-label">Men</span>
        </Link>
      </section>

      <TopPicks />

      <section className="index-newsletter">
        <div className="index-newsletter-inner">
          <h3>Join the House</h3>
          <p>Subscribe for exclusive launches, early access and style inspiration.</p>
          <NewsletterForm />
        </div>
      </section>
    </div>
  );
}

function NewsletterForm() {
  const handleSubmit = (e) => {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get('email');
    if (email) {
      alert('Thank you for subscribing. Welcome to Lavitúr.');
    }
  };

  return (
    <form className="index-newsletter-form" id="newsletter-form" onSubmit={handleSubmit} noValidate>
      <input type="email" name="email" placeholder="Your email" required />
      <button type="submit">Subscribe</button>
    </form>
  );
}
