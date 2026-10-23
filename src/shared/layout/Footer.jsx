import { Link } from 'react-router-dom'
import './Footer.css'

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-content">
        <p className="site-footer-copyright">© {new Date().getFullYear()} Offward</p>
        <nav className="site-footer-links" aria-label="Footer navigation">
          <Link to="/about">About</Link>
          <span aria-hidden="true">·</span>
          <Link to="/contact">Contact</Link>
        </nav>
        <div className="site-footer-socials" aria-label="Social media">
          <a
            className="site-footer-social"
            href="https://www.youtube.com/@Offward"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Offward on YouTube"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path className="site-footer-youtube-frame" d="M22 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.5a2.5 2.5 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.5a2.5 2.5 0 0 0 1.8-1.8C22 15.2 22 12 22 12Z" />
              <path className="site-footer-youtube-play" d="m10 15 5-3-5-3v6Z" />
            </svg>
          </a>
          <a
            className="site-footer-social"
            href="https://www.instagram.com/offward.eu/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Offward on Instagram"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle className="site-footer-social-dot" cx="17.5" cy="6.5" r="1" />
            </svg>
          </a>
          <a
            className="site-footer-social"
            href="https://www.facebook.com/profile.php?id=61595385827716"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Offward on Facebook"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path className="site-footer-facebook-mark" d="M14 21v-8h3l.5-4H14V7c0-1.2.4-2 2-2h1.7V1.4C17 1.2 16 1 14.5 1 11.5 1 9.5 2.8 9.5 6.2V9H6v4h3.5v8H14Z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
