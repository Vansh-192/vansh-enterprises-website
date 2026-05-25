/**
 * script.js — Vansh Enterprises frontend logic
 * ---------------------------------------------
 * 1. Mobile navigation toggle
 * 2. Sticky header shadow on scroll
 * 3. Smooth scrolling for all anchor links
 * 4. Fade-in animation on scroll (IntersectionObserver)
 * 5. Contact / RFQ form — validation + AJAX POST to /api/contact
 */

document.addEventListener('DOMContentLoaded', () => {

  // ─── 1. Mobile Navigation ─────────────────────────────────────────────────
  const hamburger = document.getElementById('hamburger');
  const navMenu   = document.getElementById('nav-menu');

  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('nav-open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
      hamburger.classList.toggle('hamburger--active', isOpen);
    });

    // Close nav when a link is clicked (useful on mobile)
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('nav-open');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.classList.remove('hamburger--active');
      });
    });
  }

  // ─── 2. Sticky header shadow ──────────────────────────────────────────────
  const header = document.getElementById('site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('header--scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ─── 3. Smooth scrolling ──────────────────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const id = this.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const offset = (header ? header.offsetHeight : 0) + 8;
      const top    = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // ─── 4. Fade-in on scroll ─────────────────────────────────────────────────
  const fadeEls = document.querySelectorAll('.fade-in');
  if ('IntersectionObserver' in window && fadeEls.length) {
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in--visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    fadeEls.forEach(el => io.observe(el));
  } else {
    fadeEls.forEach(el => el.classList.add('fade-in--visible'));
  }

  // ─── 5. Contact / RFQ Form ────────────────────────────────────────────────
  const form       = document.getElementById('rfq-form');
  const statusBox  = document.getElementById('form-status');

  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    clearStatus();

    // Collect values
    const data = {
      fullName:        form.fullName.value.trim(),
      company:         form.company.value.trim(),
      email:           form.email.value.trim(),
      phone:           form.phone.value.trim(),
      location:        form.location.value.trim(),
      category:        form.category.value,
      requirementType: form.requirementType.value,
      orderQuantity:   form.orderQuantity.value.trim(),
      message:         form.message.value.trim(),
      consent:         form.consent.checked
    };

    // Client-side validation
    const errors = [];
    if (!data.fullName)   errors.push('Full Name is required.');
    if (!data.company)    errors.push('Company name is required.');
    if (!data.email)      errors.push('Email address is required.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
                          errors.push('Please enter a valid email address.');
    if (!data.consent)    errors.push('Please confirm your consent to be contacted.');

    if (errors.length) {
      showStatus('error', errors.join(' '));
      return;
    }

    // Show loading state
    const btn         = form.querySelector('[type="submit"]');
    const origLabel   = btn.textContent;
    btn.disabled      = true;
    btn.textContent   = 'Sending…';

    try {
      const res  = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data)
      });
      const json = await res.json();

      if (json.success) {
        showStatus(
          'success',
          '✓ Thank you! Your enquiry has been received. Our team will be in touch within 1–2 business days.'
        );
        form.reset();
      } else {
        showStatus('error', json.error || 'Something went wrong. Please try again.');
      }
    } catch (_) {
      showStatus('error', 'Unable to send right now. Please email us directly or try again shortly.');
    } finally {
      btn.disabled    = false;
      btn.textContent = origLabel;
    }
  });

  function showStatus(type, text) {
    if (!statusBox) return;
    statusBox.textContent = text;
    statusBox.className   = `form-status form-status--${type}`;
    statusBox.removeAttribute('hidden');
    statusBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearStatus() {
    if (!statusBox) return;
    statusBox.textContent = '';
    statusBox.setAttribute('hidden', '');
  }

});
