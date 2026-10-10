'use client';
import { useEffect, useRef } from 'react';

export default function StickyFooter() {
  const colsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cols = colsRef.current?.querySelectorAll<HTMLElement>('[data-anim]');
    if (!cols) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = parseInt((entry.target as HTMLElement).dataset.delay ?? '0');
            setTimeout(() => (entry.target as HTMLElement).classList.add('footer-col-visible'), delay);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05 }
    );
    cols.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <footer className="sticky-footer-outer">
      <div className="sticky-footer-fixed">
        <div className="sticky-footer-inner" ref={colsRef}>
          {/* Ambient orbs */}
          <div className="footer-orb footer-orb-1" />
          <div className="footer-orb footer-orb-2" />

          <div className="footer-content">
            {/* Top grid */}
            <div className="footer-top">

              {/* Brand */}
              <div className="footer-brand-col footer-anim-col" data-anim data-delay="0">
                <div className="footer-logo">
                  Aavarana
                </div>
                <p className="footer-tagline">
                  A home for ideas that deserve more than a scroll. Long-form writing, rigorously edited.
                </p>
                <div className="footer-socials">
                  {/* Twitter/X */}
                  <a href="#" className="footer-social-btn" aria-label="Twitter">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                  {/* Instagram */}
                  <a href="#" className="footer-social-btn" aria-label="Instagram">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                  {/* LinkedIn */}
                  <a href="#" className="footer-social-btn" aria-label="LinkedIn">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                  {/* YouTube */}
                  <a href="#" className="footer-social-btn" aria-label="YouTube">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Explore */}
              <div className="footer-link-col footer-anim-col" data-anim data-delay="80">
                <div className="footer-col-heading">Explore</div>
                <ul>
                  <li><a href="/articles">Latest Articles</a></li>
                  <li><a href="#">Featured</a></li>
                  <li><a href="#">Categories</a></li>
                  <li><a href="#">Editor's Picks</a></li>
                  <li><a href="#">Series</a></li>
                </ul>
              </div>

              {/* Authors */}
              <div className="footer-link-col footer-anim-col" data-anim data-delay="160">
                <div className="footer-col-heading">Authors</div>
                <ul>
                  <li><a href="/dashboard/author">Write for Us</a></li>
                  <li><a href="#">Author Guidelines</a></li>
                  <li><a href="/dashboard/author">Dashboard</a></li>
                  <li><a href="#">Community</a></li>
                  <li><a href="#">Editorial Process</a></li>
                </ul>
              </div>

              {/* Company */}
              <div className="footer-link-col footer-anim-col" data-anim data-delay="240">
                <div className="footer-col-heading">Company</div>
                <ul>
                  <li><a href="#">About Aavarana</a></li>
                  <li><a href="#">Our Team</a></li>
                  <li><a href="#">Newsroom</a></li>
                  <li><a href="#">Careers</a></li>
                  <li><a href="#">Contact</a></li>
                </ul>
              </div>

              {/* Support */}
              <div className="footer-link-col footer-anim-col" data-anim data-delay="320">
                <div className="footer-col-heading">Support</div>
                <ul>
                  <li><a href="#">Help Centre</a></li>
                  <li><a href="#">FAQ</a></li>
                  <li><a href="#">Report an Issue</a></li>
                  <li><a href="#">Accessibility</a></li>
                </ul>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="footer-bottom footer-anim-col" data-anim data-delay="400">
              <p className="footer-copyright">© 2026 Aavarana. All rights reserved.</p>
              <ul className="footer-legal">
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Service</a></li>
                <li><a href="#">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
