import { Link } from 'react-router-dom';
import '../styles/about.css';

export default function About() {
  return (
    <>
      <section className="about-hero">
        <h1>Our Story</h1>
        <p>Where elegance meets edge — redefining luxury for a new generation</p>
      </section>

      <div className="about-main">
        <section className="about-section alt">
          <div>
            <h2>Our Philosophy</h2>
            <p>At Lavitúr, we believe luxury shouldn't be stiff or pretentious. It's about embracing contradictions — combining <span className="section-highlight">refined elegance with raw street energy</span>.</p>
            <p>Every piece we create tells a story of bold silhouettes, luxurious fabrics, and uncompromising craftsmanship. "Grace in Grit" isn't just a slogan—it's the DNA of everything we do.</p>
          </div>
          <div className="about-section-img about-section-img--warm" />
        </section>

        <section className="about-section alt">
          <div className="about-section-img about-section-img--dark" />
          <div>
            <h2>The Brand</h2>
            <p>Lavitúr is not a clothing brand—it's a <span className="section-highlight">lifestyle movement</span>. We design for the individual who refuses to be boxed in by traditional luxury rules.</p>
            <p>From runway-inspired pieces to streetwear essentials, our collections bridge the gap between haute couture and authentic self-expression. We're here to celebrate the modern luxury customer who demands quality, style, and substance.</p>
          </div>
        </section>

        <section className="about-section">
          <h2>Our Core Values</h2>
          <div className="values-grid">
            <div className="value-card">
              <i className="fas fa-gem" />
              <h3>Craftsmanship</h3>
              <p>Every stitch, every seam, and every detail is executed with precision and care. Quality is non-negotiable.</p>
            </div>
            <div className="value-card">
              <i className="fas fa-leaf" />
              <h3>Sustainability</h3>
              <p>We're committed to ethical sourcing, responsible production, and minimal environmental impact.</p>
            </div>
            <div className="value-card">
              <i className="fas fa-star" />
              <h3>Innovation</h3>
              <p>Pushing boundaries and reimagining what luxury means. We evolve, we inspire, we lead.</p>
            </div>
          </div>
        </section>

        <section className="story-section">
          <h2>From Vision to Reality</h2>
          <div className="story-content">
            <p>Lavitúr was born from a simple observation: the fashion world had become too divided. High-end luxury felt exclusive and disconnected, while streetwear lacked refinement. We saw an opportunity to bridge this gap and create something that spoke to the modern, multifaceted consumer.</p>
            <p>What started as sketches and dreams has evolved into a global movement. Every collection since our debut has challenged conventions, celebrated individuality, and pushed the boundaries of what luxury fashion can be. Today, Lavitúr stands as a testament to the power of bold vision, meticulous craftsmanship, and an unwavering commitment to our community.</p>
            <p>Our journey is far from over. With every season, we're writing the next chapter of modern luxury—one that celebrates grace, grit, and the beauty of being unapologetically yourself.</p>
          </div>
        </section>

        <section className="about-cta">
          <h2>Experience Lavitúr</h2>
          <p>Discover our latest collections and join a community that celebrates the extraordinary</p>
          <Link to="/shop" className="cta-button">Shop Now</Link>
        </section>
      </div>
    </>
  );
}
