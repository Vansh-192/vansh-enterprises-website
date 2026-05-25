/**
 * script.js — Vansh Enterprises frontend logic
 * Handles: scroll animations, FAQ accordion, smooth scroll, contact form
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    initFadeIn();
    initSmoothScroll();
    initFaq();
    initContactForm();
  }

  // ── Fade-in on scroll ────────────────────────────────────────────────────
  function initFadeIn() {
    const els = document.querySelectorAll('.fade-in');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('visible'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => io.observe(el));
  }

  // ── Smooth scroll for anchor links ──────────────────────────────────────
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', function (e) {
        const id = this.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        const header = document.querySelector('.site-header');
        const offset = (header ? header.offsetHeight : 0) + 12;
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
      });
    });
  }

  // ── FAQ accordion ────────────────────────────────────────────────────────
  function initFaq() {
    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', function () {
        const item   = this.closest('.faq-item');
        const answer = item.querySelector('.faq-answer');
        const isOpen = this.getAttribute('aria-expanded') === 'true';

        // Close all others
        document.querySelectorAll('.faq-question[aria-expanded="true"]').forEach(other => {
          if (other !== this) {
            other.setAttribute('aria-expanded', 'false');
            other.closest('.faq-item').querySelector('.faq-answer').classList.remove('open');
          }
        });

        this.setAttribute('aria-expanded', String(!isOpen));
        answer.classList.toggle('open', !isOpen);
      });
    });
  }

  // ── Contact / RFQ form ───────────────────────────────────────────────────
  function initContactForm() {
    const form      = document.getElementById('rfq-form');
    const statusBox = document.getElementById('form-status');
    if (!form) return;

    let submitted = false; // prevent duplicate

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (submitted) return;

      clearStatus();

      const data = {
        fullName:        v('fullName'),
        company:         v('company'),
        email:           v('email'),
        phone:           v('phone'),
        location:        v('location'),
        category:        v('category'),
        requirementType: v('requirementType'),
        orderQuantity:   v('orderQuantity'),
        targetDelivery:  v('targetDelivery'),
        message:         v('message'),
        consent:         form.querySelector('[name="consent"]')?.checked || false,
        website:         v('website') // honeypot
      };

      // Client-side validation
      const errs = [];
      if (!data.fullName)  errs.push('Full name is required.');
      if (!data.company)   errs.push('Company name is required.');
      if (!data.email)     errs.push('Email address is required.');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errs.push('Please enter a valid email.');
      if (!data.consent)   errs.push('Please confirm consent to be contacted.');

      if (errs.length) { showStatus('error', errs[0]); return; }

      // Loading state
      const btn = form.querySelector('[type="submit"]');
      const origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span aria-hidden="true">Sending…</span>';

      try {
        const res  = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const json = await res.json();

        if (json.success) {
          submitted = true;

          // GA4 lead event
          if (typeof gtag === 'function') {
            gtag('event', 'generate_lead', {
              event_category: 'RFQ',
              event_label:    data.category || data.requirementType || 'General',
              value:          1
            });
          }

          window.location.href = '/thank-you';
        } else {
          showStatus('error', json.error || 'Something went wrong. Please try again.');
          btn.disabled = false;
          btn.innerHTML = origText;
        }
      } catch (_) {
        showStatus('error', 'Unable to send. Please email us directly at enquiries@vanshenterprises.net');
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    });

    function v(name) {
      const el = form.querySelector(`[name="${name}"]`);
      return el ? el.value.trim() : '';
    }

    function showStatus(type, text) {
      if (!statusBox) return;
      statusBox.textContent = text;
      statusBox.className = `form-status ${type} visible`;
      statusBox.setAttribute('role', 'alert');
      statusBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function clearStatus() {
      if (!statusBox) return;
      statusBox.textContent = '';
      statusBox.className = 'form-status';
      statusBox.removeAttribute('role');
    }
  }

})();
