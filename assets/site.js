/* Progressive enhancement only: every page is complete server-rendered HTML. */
document.documentElement.classList.add('js');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
document.addEventListener('keydown', () => document.documentElement.classList.add('keyboard-input'));
document.addEventListener('pointerdown', () => document.documentElement.classList.remove('keyboard-input'), {passive:true});

// Detail content ships expanded. Native disclosure remains operable without JS.
document.querySelectorAll('.issue, .rec-item').forEach(detail => { detail.open = false; });
document.querySelectorAll('.issue, .rec-item, .life-guide').forEach(detail => {
  detail.addEventListener('toggle', () => {
    if (!detail.open || motionPreference.matches || document.documentElement.classList.contains('keyboard-input')) return;
    const content = detail.querySelector('.issue-detail') || detail.querySelector(':scope > div');
    content?.getAnimations().forEach(animation => animation.cancel());
    content?.animate([{opacity:0,transform:'translateY(-4px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'cubic-bezier(.23,1,.32,1)'});
  });
});

// One explanatory reveal: draw the links, then bring the overlapping laws together.
const connectionStories = document.querySelector('.connection-stories');
if (connectionStories && !motionPreference.matches && 'IntersectionObserver' in window) {
  connectionStories.classList.add('motion-enabled');
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      connectionStories.classList.add('is-visible');
      observer.disconnect();
    }
  },{threshold:.18});
  observer.observe(connectionStories);
}

const menus = [...document.querySelectorAll('.site-header details')];
menus.forEach(menu => menu.addEventListener('toggle', () => {
  if (menu.open) menus.forEach(other => { if (other !== menu) other.open = false; });
}));
document.addEventListener('click', event => {
  menus.forEach(menu => { if (!menu.contains(event.target)) menu.open = false; });
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    const open = menus.find(menu => menu.open);
    if (open) { open.open = false; open.querySelector('summary').focus(); }
  }
});

const gray = document.querySelector('[data-grayscale]');
gray?.addEventListener('click', () => {
  const active = gray.getAttribute('aria-pressed') !== 'true';
  gray.setAttribute('aria-pressed', String(active));
  document.querySelector('.risk-section').classList.toggle('grayscale', active);
});

const search = document.querySelector('#glossary-search');
if (search) {
  const entries = [...document.querySelectorAll('.glossary-entry')];
  const filter = () => {
    const query = search.value.trim().toLocaleLowerCase();
    let count = 0;
    entries.forEach(entry => {
      entry.hidden = !entry.textContent.toLocaleLowerCase().includes(query);
      if (!entry.hidden) count++;
    });
    document.querySelector('#search-count').textContent = `${count} ${count === 1 ? 'term' : 'terms'}${query ? ' found' : ''}`;
    document.querySelector('#search-empty').hidden = count > 0;
  };
  search.addEventListener('input', filter);
  document.querySelector('#clear-search').addEventListener('click', () => {
    search.value = ''; filter(); search.focus();
  });
}

const sections = [...document.querySelectorAll('.law-layer')];
if (sections.length && 'IntersectionObserver' in window) {
  const railLinks = [...document.querySelectorAll('.reading-rail a[href^="#"]')];
  const update = () => {
    const current = [...sections].reverse().find(section => section.getBoundingClientRect().top < 230) || sections[0];
    railLinks.forEach(link => {
      if (link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  let queued = false;
  window.addEventListener('scroll', () => {
    if (!queued) { queued = true; requestAnimationFrame(() => { update(); queued = false; }); }
  }, { passive: true });
  update();
}

// Video is optional. A build-time manifest prevents requests for absent files.
const video = document.querySelector('video[data-video]');
if (video && video.dataset.sources) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true;
  const sync = () => {
    if (reduced.matches || !visible || document.hidden) video.pause();
    else video.play().catch(() => {});
  };
  JSON.parse(video.dataset.sources).forEach(path => {
    const source = document.createElement('source');
    source.src = path; source.type = path.endsWith('.webm') ? 'video/webm' : 'video/mp4';
    video.append(source);
  });
  if (!reduced.matches) video.autoplay = true;
  video.load();
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(video);
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  sync();
}
