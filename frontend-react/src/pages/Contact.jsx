import { useState } from 'react';
import '../styles/contact.css';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setForm({ name: '', email: '', subject: '', message: '' });
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <>
      <section className="contact-hero">
        <h1>Get in Touch</h1>
        <p>We'd love to hear from you. Have a question or need assistance? Reach out anytime.</p>
      </section>

      <div className="contact-main">
        <div className="contact-wrapper">
          <div className="contact-form">
            <h2>Send a Message</h2>
            <form id="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input type="text" id="name" name="name" required placeholder="Enter your full name" value={form.name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input type="email" id="email" name="email" required placeholder="your@email.com" value={form.email} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <input type="text" id="subject" name="subject" required placeholder="How can we help?" value={form.subject} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea id="message" name="message" required placeholder="Tell us more about your inquiry..." value={form.message} onChange={handleChange} />
              </div>
              <button type="submit" className="form-submit">Send Message</button>
              {submitted && <p className="form-success">Thank you for your message! We'll get back to you soon.</p>}
            </form>
          </div>

          <div className="contact-info">
            <div className="info-card">
              <i className="fas fa-map-marker-alt" />
              <h3>Visit Us</h3>
              <p>Lavitúr Creative Studio<br />Paris, France<br />By appointment only</p>
            </div>
            <div className="info-card">
              <i className="fas fa-envelope" />
              <h3>Email Us</h3>
              <p>
                <a href="mailto:support@lavitur.com">support@lavitur.com</a><br />
                <a href="mailto:hello@lavitur.com">hello@lavitur.com</a>
              </p>
            </div>
            <div className="info-card">
              <i className="fas fa-globe" />
              <h3>Follow Us</h3>
              <p>Connect with us on social media for the latest collections and inspiration.</p>
              <div className="social-links">
                <a href="#" title="Instagram"><i className="fab fa-instagram" /></a>
                <a href="#" title="Twitter"><i className="fab fa-twitter" /></a>
                <a href="#" title="Facebook"><i className="fab fa-facebook" /></a>
              </div>
            </div>
          </div>
        </div>

        <section className="faq-section">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>What's your shipping policy?</h4>
              <p>We offer complimentary worldwide shipping on orders over €200. Standard shipping typically takes 5-7 business days.</p>
            </div>
            <div className="faq-item">
              <h4>Do you offer returns?</h4>
              <p>Yes, we provide free returns within 30 days of purchase. All items must be unworn and in original condition.</p>
            </div>
            <div className="faq-item">
              <h4>How can I track my order?</h4>
              <p>You'll receive a tracking number via email once your order ships. Use it to monitor your delivery status.</p>
            </div>
            <div className="faq-item">
              <h4>Do you have physical stores?</h4>
              <p>Currently, we operate exclusively online. However, feel free to schedule a private shopping appointment.</p>
            </div>
            <div className="faq-item">
              <h4>How do I care for my Lavitúr pieces?</h4>
              <p>Each item includes detailed care instructions. Most pieces are dry-clean only to maintain the premium materials.</p>
            </div>
            <div className="faq-item">
              <h4>Can I request custom sizing?</h4>
              <p>Absolutely. Contact our team at support@lavitur.com to discuss custom sizing options and pricing.</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
