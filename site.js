// site.js - shared script: nav toggle, theme toggle, and touch-enabled carousels
document.addEventListener('DOMContentLoaded', function () {
  // NAV TOGGLE
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // THEME TOGGLE - unify to id 'theme-toggle'
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;
  if (themeToggle) {
    if (localStorage.getItem('theme') === 'dark') body.classList.add('dark');
    themeToggle.addEventListener('click', () => {
      body.classList.toggle('dark');
      localStorage.setItem('theme', body.classList.contains('dark') ? 'dark' : 'light');
    });
  }

  // SIMPLE CAROUSEL LOGIC + TOUCH SWIPE
  function makeCarousel(carouselRoot) {
    const track = carouselRoot.querySelector('.carousel-track');
    if (!track) return;
    const slides = Array.from(track.children);
    let index = 0;
    const slideCount = slides.length;
    const prevBtn = carouselRoot.querySelector('.carousel-prev') || carouselRoot.closest('.artwork-carousel')?.querySelector('#prevBtn');
    const nextBtn = carouselRoot.querySelector('.carousel-next') || carouselRoot.closest('.artwork-carousel')?.querySelector('#nextBtn');

    function update() {
      track.style.transition = 'transform .45s ease';
      track.style.transform = `translateX(-${index * 100}%)`;
    }

    if (prevBtn) prevBtn.addEventListener('click', () => {
      index = Math.max(0, index - 1);
      update();
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
      index = Math.min(slideCount - 1, index + 1);
      update();
    });

    // TOUCH HANDLERS
    let startX = 0, startY = 0, currentX = 0, isDragging = false, width = 0;

    const onStart = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;
      currentX = startX;
      isDragging = false;
      width = carouselRoot.clientWidth;
      track.style.transition = 'none';
    };

    const onMove = (e) => {
      if (!((e.touches && e.touches.length) || e.clientX !== undefined)) return;
      const touch = e.touches ? e.touches[0] : e;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      // if horizontal move dominates, treat as carousel drag and prevent vertical page swipe
      if (!isDragging && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) {
        isDragging = true;
      }
      if (isDragging) {
        // prevent page from moving horizontally while user is dragging the carousel
        if (e.cancelable) e.preventDefault();
        const movePercent = (dx / width) * 100;
        track.style.transform = `translateX(-${index * 100 - movePercent}%)`;
      }
    };

    const onEnd = (e) => {
      if (!isDragging) return;
      const touch = (e.changedTouches && e.changedTouches[0]) || e;
      const dx = touch.clientX - startX;
      const threshold = Math.max(20, width * 0.15);
      if (Math.abs(dx) > threshold) {
        if (dx < 0) index = Math.min(slideCount - 1, index + 1);
        else index = Math.max(0, index - 1);
      }
      update();
      isDragging = false;
    };

    // Use non-passive listeners so we can call preventDefault()
    track.addEventListener('touchstart', onStart, { passive: true });
    track.addEventListener('touchmove', onMove, { passive: false });
    track.addEventListener('touchend', onEnd, { passive: true });
    // also support mouse dragging for desktop
    let mouseDown = false;
    track.addEventListener('mousedown', (e) => { mouseDown = true; onStart(e); });
    window.addEventListener('mousemove', (e) => { if (mouseDown) onMove(e); });
    window.addEventListener('mouseup', (e) => { if (mouseDown) { onEnd(e); mouseDown = false; } });

    // Ensure initial placement
    update();
  }

  // Artwork carousel (single) if present
  const artworkTrack = document.getElementById('carouselTrack');
  if (artworkTrack) {
    const artCarouselRoot = artworkTrack.closest('.carousel-window') || artworkTrack.parentElement;
    if (artCarouselRoot) makeCarousel(artCarouselRoot);
  }

  // Branch carousels (one or more)
  document.querySelectorAll('.branch-carousel .carousel-track, .branch-carousel').forEach((el) => {
    const root = el.closest('.branch-carousel') || el;
    makeCarousel(root);
  });

  // Prevent body horizontal overscroll (extra safety)
  document.documentElement.style.overflowX = 'hidden';
});
