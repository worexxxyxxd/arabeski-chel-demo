function setupNavigation() {
  const menu = document.querySelector('#site-menu');
  const toggle = document.querySelector('[data-show-menu]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  toggle.addEventListener('click', () => {
    toggle.setAttribute('aria-expanded', 'true');
    menu.showModal();
  });
  menu.addEventListener('close', () => {
    toggle.setAttribute('aria-expanded', 'false');
    delete menu.dataset.closing;
  });
  async function closeMenu(event) {
    event.preventDefault();
    if ('closing' in menu.dataset) return;
    const layout = menu.querySelector('.menu-layout');
    if (typeof layout.animate === 'function') {
      menu.dataset.closing = '';
      const frames = motion.matches
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(14px) scale(.99)' }];
      const exit = layout.animate(frames, {
        duration: motion.matches ? 130 : 220,
        easing: 'ease-in',
        fill: 'forwards',
      });
      await exit.finished.catch(() => {});
      if (menu.open) menu.close();
      exit.cancel();
    } else {
      menu.close();
    }
  }
  menu.querySelector('form').addEventListener('submit', closeMenu);
  menu.addEventListener('cancel', closeMenu);
  const image = menu.querySelector('img');
  const imageSources = menu.querySelectorAll('[data-menu-image]');
  for (const link of imageSources) {
    const preview = () => {
      image.src = link.dataset.menuImage;
      image.alt = link.dataset.imageAlt;
    };
    link.addEventListener('pointerenter', preview);
    link.addEventListener('focus', preview);
    link.addEventListener('click', () => menu.close());
  }
}

function setupChapters() {
  const carousel = document.querySelector('[data-chapters]');
  if (!carousel) return;
  const track = carousel.querySelector('[data-track]');
  const shell = carousel.querySelector('.chapter-shell');
  const chapters = [...track.children];
  const meter = carousel.querySelector('[data-chapter-status]');
  const buttons = [...carousel.querySelectorAll('[data-chapter-turn]')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width:1000px) and (min-height:680px) and (prefers-reduced-motion:no-preference)');
  let current = 0;
  let syncFrame = 0;

  function update() {
    const left = track.scrollLeft;
    current = chapters.reduce((nearest, chapter, index) => {
      return Math.abs(chapter.offsetLeft - left) < Math.abs(chapters[nearest].offsetLeft - left) ? index : nearest;
    }, 0);
    meter.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(chapters.length).padStart(2, '0');
    buttons[0].disabled = current === 0;
    buttons[1].disabled = current === chapters.length - 1;
  }
  track.addEventListener('scroll', update, { passive: true });

  function geometry() {
    return {
      start: window.scrollY + carousel.getBoundingClientRect().top - 72,
      travel: Math.max(1, carousel.offsetHeight - shell.offsetHeight),
      width: track.scrollWidth - track.clientWidth,
    };
  }
  function syncScroll() {
    syncFrame = 0;
    if (!desktop.matches || !track.clientWidth) return;
    const { start, travel, width } = geometry();
    const progress = Math.max(0, Math.min(1, (window.scrollY - start) / travel));
    track.scrollLeft = width * progress;
  }
  function scheduleScroll() {
    if (!syncFrame) syncFrame = requestAnimationFrame(syncScroll);
  }
  function setMode() {
    carousel.toggleAttribute('data-scroll-chapters', desktop.matches);
    update();
    scheduleScroll();
  }
  function goToChapter(index) {
    const offset = chapters[index].offsetLeft;
    const behavior = motion.matches ? 'instant' : 'smooth';
    if (desktop.matches) {
      const { start, travel, width } = geometry();
      if (width) window.scrollTo({ top: start + travel * offset / width, behavior });
    } else {
      track.scrollTo({ left: offset, behavior });
    }
  }

  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', setMode);
  desktop.addEventListener('change', setMode);
  track.addEventListener('focusin', (event) => {
    const index = chapters.indexOf(event.target.closest('article'));
    if (desktop.matches && index >= 0 && index !== current) goToChapter(index);
  });
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const next = Math.max(0, Math.min(chapters.length - 1, current + Number(button.dataset.chapterTurn)));
      goToChapter(next);
    });
  }
  setMode();
}

setupNavigation();
setupChapters();

const reviewPanel = document.querySelector('[data-reviews]');
if (reviewPanel) {
  const filters = [...reviewPanel.querySelectorAll('[data-review-filter]')];
  const cards = [...reviewPanel.querySelectorAll('[data-review-category]')];
  const count = reviewPanel.querySelector('[data-review-count]');
  for (const filter of filters) {
    filter.addEventListener('click', () => {
      const group = filter.dataset.reviewFilter;
      filters.forEach(item => item.setAttribute('aria-pressed', String(item === filter)));
      let visible = 0;
      for (const card of cards) {
        card.hidden = group !== 'all' && card.dataset.reviewCategory !== group;
        if (!card.hidden) visible++;
      }
      count.textContent = 'Показано: ' + visible;
    });
  }
}

const headline = document.querySelector('.poster h1');
if (headline && matchMedia('(hover:hover) and (prefers-reduced-motion:no-preference)').matches) {
  const poster = headline.closest('.poster');
  poster.addEventListener('pointermove', (event) => {
    const rect = poster.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    headline.style.setProperty('--poster-x', (37 + x * 26) + '%');
  });
}
