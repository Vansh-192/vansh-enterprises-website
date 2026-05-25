/**
 * components.js — Shared nav and footer for Vansh Enterprises
 * Injects site-wide header and footer so they are maintained in one place.
 */
(function () {
  'use strict';

  // ── Navigation HTML ──────────────────────────────────────────────────────
  const NAV_HTML = `
<header class="site-header" id="site-header" role="banner">
  <div class="container nav-container">
    <a href="/" class="nav-logo" aria-label="Vansh Enterprises — Home">
      <img src="/logo.svg" alt="Vansh Enterprises" width="160" height="44" loading="eager">
    </a>

    <button class="nav-toggle" id="nav-toggle" aria-label="Open navigation menu" aria-expanded="false" aria-controls="nav-menu">
      <span class="bar"></span>
      <span class="bar"></span>
      <span class="bar"></span>
    </button>

    <nav class="nav-menu" id="nav-menu" aria-label="Main navigation">
      <ul class="nav-list" role="list">
        <li class="nav-item">
          <a href="/" class="nav-link" data-match="/">Home</a>
        </li>

        <li class="nav-item nav-dropdown-wrap">
          <button class="nav-link nav-dropdown-btn" aria-expanded="false" aria-haspopup="true" id="services-btn">
            Services
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none">
              <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <ul class="nav-dropdown" id="services-dropdown" role="menu" aria-labelledby="services-btn">
            <li role="none"><a href="/apparel-manufacturer-noida" class="nav-dropdown-item" role="menuitem">Apparel Manufacturing in Noida</a></li>
            <li role="none"><a href="/private-label-clothing" class="nav-dropdown-item" role="menuitem">Private Label Clothing</a></li>
            <li role="none"><a href="/garment-exporter-india" class="nav-dropdown-item" role="menuitem">Garment Exporter India</a></li>
            <li role="none"><a href="/menswear-manufacturing" class="nav-dropdown-item" role="menuitem">Menswear Manufacturing</a></li>
            <li role="none"><a href="/womenswear-manufacturing" class="nav-dropdown-item" role="menuitem">Womenswear Manufacturing</a></li>
            <li role="none"><a href="/kidswear-manufacturing" class="nav-dropdown-item" role="menuitem">Kidswear Manufacturing</a></li>
            <li role="none"><a href="/sampling-bulk-production" class="nav-dropdown-item" role="menuitem">Sampling &amp; Bulk Production</a></li>
          </ul>
        </li>

        <li class="nav-item">
          <a href="/about" class="nav-link" data-match="/about">About</a>
        </li>
        <li class="nav-item">
          <a href="/quality-control" class="nav-link" data-match="/quality-control">Quality</a>
        </li>
        <li class="nav-item">
          <a href="/clients" class="nav-link" data-match="/clients">Clients</a>
        </li>
        <li class="nav-item">
          <a href="/faq" class="nav-link" data-match="/faq">FAQ</a>
        </li>
      </ul>

      <a href="/contact" class="btn btn-primary nav-cta">Request a Quote</a>
    </nav>
  </div>
</header>`;

  // ── Footer HTML ──────────────────────────────────────────────────────────
  const FOOTER_HTML = `
<footer class="site-footer" role="contentinfo">
  <div class="container">
    <div class="footer-grid">

      <div class="footer-col footer-brand">
        <a href="/" class="footer-logo" aria-label="Vansh Enterprises — Home">
          <img src="/logo-white.svg" alt="Vansh Enterprises" width="160" height="44" loading="lazy"
               onerror="this.src='/logo.svg';this.style.filter='brightness(0) invert(1)'">
        </a>
        <p class="mt-4">End-to-end apparel manufacturing for Indian fashion brands, D2C labels, and international buyers. Based in Noida, Delhi NCR.</p>
        <div class="footer-contact">
          <a href="mailto:enquiries@vanshenterprises.net">enquiries@vanshenterprises.net</a>
          <a href="https://wa.me/919015475588">+91 90154 75588</a>
          <span>Mon–Sat, 10 am–7 pm IST</span>
        </div>
      </div>

      <div class="footer-col">
        <h3 class="footer-heading">Services</h3>
        <ul role="list">
          <li><a href="/apparel-manufacturer-noida">Apparel Manufacturing</a></li>
          <li><a href="/private-label-clothing">Private Label Clothing</a></li>
          <li><a href="/garment-exporter-india">Garment Export</a></li>
          <li><a href="/menswear-manufacturing">Menswear</a></li>
          <li><a href="/womenswear-manufacturing">Womenswear</a></li>
          <li><a href="/kidswear-manufacturing">Kidswear</a></li>
          <li><a href="/sampling-bulk-production">Sampling &amp; Bulk</a></li>
        </ul>
      </div>

      <div class="footer-col">
        <h3 class="footer-heading">Company</h3>
        <ul role="list">
          <li><a href="/about">About Vansh</a></li>
          <li><a href="/quality-control">Quality Control</a></li>
          <li><a href="/sustainability">Sustainability</a></li>
          <li><a href="/clients">Clients &amp; Case Studies</a></li>
          <li><a href="/faq">FAQ</a></li>
          <li><a href="/contact">Contact Us</a></li>
        </ul>
      </div>

      <div class="footer-col">
        <h3 class="footer-heading">Get in Touch</h3>
        <address>
          Noida, Uttar Pradesh<br>
          Delhi NCR, India<br><br>
          <a href="mailto:enquiries@vanshenterprises.net">enquiries@vanshenterprises.net</a><br>
          <a href="https://wa.me/919015475588">+91 90154 75588</a>
        </address>
        <a href="/contact" class="btn btn-outline-white btn-sm mt-6">Request a Quote</a>
      </div>

    </div>

    <hr class="footer-divider">

    <div class="footer-bottom">
      <span>&copy; <span class="js-year"></span> Vansh Enterprises. All rights reserved.</span>
      <span>Apparel Manufacturer in Noida, India</span>
    </div>
  </div>
</footer>`;

  // ── Inject ───────────────────────────────────────────────────────────────
  function inject() {
    const headerSlot = document.getElementById('header-slot');
    const footerSlot = document.getElementById('footer-slot');
    if (headerSlot) headerSlot.outerHTML = NAV_HTML;
    if (footerSlot)  footerSlot.outerHTML = FOOTER_HTML;

    // Year in footer
    document.querySelectorAll('.js-year').forEach(el => { el.textContent = new Date().getFullYear(); });

    setActiveNav();
    initHeader();
    initMobileMenu();
    initDropdowns();
  }

  // ── Active nav link ──────────────────────────────────────────────────────
  function setActiveNav() {
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    document.querySelectorAll('[data-match]').forEach(link => {
      const match = link.getAttribute('data-match');
      if (match === path || (match !== '/' && path.startsWith(match))) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });
    // Highlight dropdown parent when on a service page
    const servicePages = ['/apparel-manufacturer-noida','/private-label-clothing','/garment-exporter-india',
      '/menswear-manufacturing','/womenswear-manufacturing','/kidswear-manufacturing','/sampling-bulk-production'];
    if (servicePages.includes(path)) {
      const btn = document.querySelector('.nav-dropdown-btn');
      if (btn) btn.classList.add('active');
    }
  }

  // ── Sticky header scroll effect ──────────────────────────────────────────
  function initHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ── Mobile menu toggle ───────────────────────────────────────────────────
  function initMobileMenu() {
    const toggle = document.getElementById('nav-toggle');
    const menu   = document.getElementById('nav-menu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });

    // Close on link click (mobile)
    menu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        menu.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    // Close on overlay click (mobile)
    document.addEventListener('click', e => {
      if (menu.classList.contains('open') && !menu.contains(e.target) && !toggle.contains(e.target)) {
        menu.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  // ── Services dropdown (mobile accordion, desktop handled by CSS) ─────────
  function initDropdowns() {
    const btn      = document.getElementById('services-btn');
    const dropdown = document.getElementById('services-dropdown');
    if (!btn || !dropdown) return;

    // Mobile: click to toggle
    btn.addEventListener('click', () => {
      if (window.innerWidth < 1024) {
        const open = dropdown.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
        const svg = btn.querySelector('svg');
        if (svg) svg.style.transform = open ? 'rotate(180deg)' : '';
      }
    });
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
