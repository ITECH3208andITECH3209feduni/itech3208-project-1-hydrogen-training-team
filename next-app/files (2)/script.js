// ══════════════════════════════════════════
//  H2 Academy – script.js
// ══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. Animated number counters on stat cards ──
  const counters = document.querySelectorAll('.count[data-target]');

  counters.forEach(counter => {
    const target = parseInt(counter.dataset.target, 10);
    const duration = 1000; // ms
    const stepTime = 30;
    const steps = duration / stepTime;
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      counter.textContent = Math.floor(current);
    }, stepTime);
  });


  // ── 2. Animated progress bar ──
  const progressBar = document.getElementById('progressBar');
  const progressPct = document.getElementById('progressPct');

  if (progressBar && progressPct) {
    const targetWidth = parseInt(progressBar.dataset.width, 10); // e.g. 65
    let currentPct = 0;

    // Trigger CSS transition
    setTimeout(() => {
      progressBar.style.width = targetWidth + '%';
    }, 300);

    // Count up the percentage label
    const pctTimer = setInterval(() => {
      currentPct++;
      progressPct.textContent = currentPct + '%';
      if (currentPct >= targetWidth) clearInterval(pctTimer);
    }, 1200 / targetWidth);
  }


  // ── 3. Avatar dropdown toggle ──
  const avatarBtn      = document.getElementById('avatarBtn');
  const avatarDropdown = document.getElementById('avatarDropdown');

  if (avatarBtn && avatarDropdown) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      avatarDropdown.classList.toggle('open');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      avatarDropdown.classList.remove('open');
    });
  }


  // ── 4. Notification bell ──
  const notifBell  = document.getElementById('notifBell');
  const notifBadge = document.getElementById('notifBadge');

  if (notifBell) {
    notifBell.addEventListener('click', () => {
      // Hide the badge when bell is clicked (mark as read)
      if (notifBadge) {
        notifBadge.style.display = 'none';
      }
      alert('🔔 Notifications:\n\n• New module available: Hydrogen Storage\n• Quiz result ready: Safety Protocols\n• Certificate ready to download');
    });
  }


  // ── 5. Active nav link highlight ──
  const navLinks = document.querySelectorAll('.nav-links a');
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  navLinks.forEach(link => {
    const linkPage = link.getAttribute('href');
    if (linkPage === currentPage) {
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    }
  });


  // ── 6. Certificate button feedback ──
  const certBtn = document.getElementById('certBtn');

  if (certBtn) {
    certBtn.addEventListener('click', (e) => {
      e.preventDefault();
      certBtn.textContent = '⏳ Preparing...';
      certBtn.style.opacity = '0.7';

      setTimeout(() => {
        certBtn.textContent = '✅ Downloaded!';
        certBtn.style.opacity = '1';
        certBtn.style.background = 'linear-gradient(135deg, #00a86b, #00E5A0)';

        setTimeout(() => {
          certBtn.textContent = 'Download Certificate →';
          certBtn.style.background = '';
        }, 3000);
      }, 1500);
    });
  }


  // ── 7. Stat card hover sound effect (visual pulse) ──
  const statCards = document.querySelectorAll('.stat-card');

  statCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'all 0.25s';
    });
  });

});
