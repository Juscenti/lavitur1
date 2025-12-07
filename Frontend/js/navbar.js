// js/navbar.js
document.addEventListener('DOMContentLoaded', () => {
  const initNavbarLogic = () => {
    const navbar = document.querySelector('.navbar');
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const mobileDrawer = document.querySelector('.mobile-drawer');
    const accountDropdown = document.querySelector('.account-dropdown');
    const accountDropdownMenu = accountDropdown?.querySelector('.dropdown-menu');

    if (!navbar || !accountDropdown || !accountDropdownMenu) return;

    // Scroll background toggle
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    // Mobile drawer toggle
    mobileToggle?.addEventListener('click', () => {
      mobileDrawer?.classList.toggle('open');
    });

    // Populate role-based account dropdown
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('authRole'); // 'guest' | 'customer' | 'admin'

    let menuItems = [];

    if (token) {
      if (role === 'admin') {
        menuItems = [
          { text: 'Admin Dashboard', href: '../../admin-panel/index.html' },
          { text: 'Admin Profile', href: 'profile.html' },
          { text: 'Admin Settings', href: 'settings.html' },
          { text: 'Log Out', href: '#', action: 'logout' }
        ];
      } else {
        menuItems = [
          { text: 'Profile', href: 'profile.html' },
          { text: 'Settings', href: 'settings.html' },
          { text: 'Log Out', href: '#', action: 'logout' }
        ];
      }
    } else {
      menuItems = [
        { text: 'Login / Register', href: 'login.html' }
      ];
    }

    accountDropdownMenu.innerHTML = menuItems
      .map(item =>
        `<li><a href="${item.href}" ${item.action ? `data-action="${item.action}"` : ''}>${item.text}</a></li>`
      )
      .join('');

    // Logout functionality
    accountDropdownMenu.addEventListener('click', e => {
      if (e.target.dataset.action === 'logout') {
        e.preventDefault();
        localStorage.removeItem('authToken');
        localStorage.removeItem('authRole');
        localStorage.removeItem('lavitur_user');
        window.location.href = 'index.html';
      }
    });

    // Hover-based dropdown
    
  };

  // If navbar is loaded dynamically, use MutationObserver
  const observer = new MutationObserver(() => {
    const navbarExists = document.querySelector('.navbar');
    if (navbarExists) {
      initNavbarLogic();
      observer.disconnect(); // Only initialize once
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Fallback if navbar is already in DOM
  if (document.querySelector('.navbar')) initNavbarLogic();
});
