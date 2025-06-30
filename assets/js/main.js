document.addEventListener('DOMContentLoaded', function () {
  // Footer still needs to be loaded
  loadComponent('footer-placeholder', '/components/footer.html');

  // Other initializations
  initHeaderScroll();
  initAnimations();

  // Initialize testimonial slider if present
  if (document.querySelector('.testimonial-slider')) {
    initTestimonialSlider();
  }

  // Initialize FAQ accordions if present
  if (document.querySelector('.faq-item')) {
    initFaqAccordions();
  }
});

// Load footer (header is handled in index.html)
function loadComponent(placeholderId, componentPath) {
  const placeholder = document.getElementById(placeholderId);
  if (!placeholder) return;

  fetch(componentPath)
    .then((response) => response.text())
    .then((data) => {
      placeholder.outerHTML = data;
    })
    .catch((error) => console.error(`Error loading component ${componentPath}:`, error));
}

// Header scroll effect
function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const scrollThreshold = 50;

  function updateHeaderOnScroll() {
    if (window.scrollY > scrollThreshold) {
      header.style.backgroundColor = 'rgba(255, 255, 255, 0.98)';
      header.style.boxShadow = 'var(--shadow-md)';
    } else {
      header.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
      header.style.boxShadow = 'var(--shadow-sm)';
    }
  }

  window.addEventListener('scroll', updateHeaderOnScroll);
  updateHeaderOnScroll(); // Initial call
}

// ✅ Mobile menu toggle logic, now exposed globally
function initMobileMenu() {
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  if (!mobileMenuToggle) return;

  const mainNav = document.querySelector('.main-nav');

  mobileMenuToggle.addEventListener('click', function () {
    mainNav.classList.toggle('active');

    const bars = this.querySelectorAll('.toggle-bar');
    if (mainNav.classList.contains('active')) {
      bars[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      bars[1].style.opacity = '0';
      bars[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      bars[0].style.transform = 'none';
      bars[1].style.opacity = '1';
      bars[2].style.transform = 'none';
    }
  });

  // Close menu when clicking outside
  document.addEventListener('click', function (event) {
    if (
      mainNav.classList.contains('active') &&
      !event.target.closest('.main-nav') &&
      !event.target.closest('.mobile-menu-toggle')
    ) {
      mainNav.classList.remove('active');
      const bars = mobileMenuToggle.querySelectorAll('.toggle-bar');
      bars[0].style.transform = 'none';
      bars[1].style.opacity = '1';
      bars[2].style.transform = 'none';
    }
  });

  // Mobile dropdown toggles
  const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
  dropdownToggles.forEach((toggle) => {
    toggle.addEventListener('click', function (event) {
      if (window.innerWidth <= 768) {
        event.preventDefault();
        const dropdownMenu = this.nextElementSibling;
        dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
      }
    });
  });
}
window.initMobileMenu = initMobileMenu; // ✅ expose to global scope

// Other functions stay the same...
function initTestimonialSlider() {
  const slides = document.querySelectorAll('.testimonial-slide');
  const dots = document.querySelectorAll('.dot');
  let currentSlide = 0;
  let autoSlideInterval;

  function showSlide(index) {
    slides.forEach((slide) => slide.classList.remove('active'));
    dots.forEach((dot) => dot.classList.remove('active'));

    slides[index].classList.add('active');
    dots[index].classList.add('active');
    currentSlide = index;
  }

  function nextSlide() {
    let newIndex = (currentSlide + 1) % slides.length;
    showSlide(newIndex);
  }

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      showSlide(index);
      resetAutoSlide();
    });
  });

  function startAutoSlide() {
    autoSlideInterval = setInterval(nextSlide, 5000);
  }

  function resetAutoSlide() {
    clearInterval(autoSlideInterval);
    startAutoSlide();
  }

  startAutoSlide();
}

function initFaqAccordions() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach((item) => {
    const question = item.querySelector('.faq-question');

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      faqItems.forEach((faq) => faq.classList.remove('active'));
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

function initAnimations() {
  const fadeElements = document.querySelectorAll('.fade-in');

  function checkVisibility() {
    fadeElements.forEach((element) => {
      const elementTop = element.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;

      if (elementTop < windowHeight - 100) {
        element.classList.add('visible');
      }
    });
  }

  checkVisibility();
  window.addEventListener('scroll', checkVisibility);
}
