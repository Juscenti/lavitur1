import { Link } from 'react-router-dom';

const collections = [
  { slug: 'womenswear', label: "Women's wear", img: '/images/slideshow/Womenswear.png' },
  { slug: 'menswear', label: "Men's wear", img: '/images/slideshow/Menswear.png' },
  { slug: 'niche', label: 'Niche Line', img: '/images/slideshow/Niche.png' },
];

export default function Collections() {
  return (
    <section id="collections" className="collections">
      <h2>Featured Collections</h2>
      <div className="grid" id="collection-grid">
        {collections.map((c) => (
          <Link key={c.slug} to={`/shop?category=${c.slug}`} className="collection-box" data-category={c.slug}>
            <img src={c.img} alt={c.label} />
            <span className="collection-label">{c.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
