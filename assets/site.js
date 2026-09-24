/* Progressive enhancement only: every page is complete server-rendered HTML. */
const root = document.documentElement;
root.classList.add('js');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const EASE = 'cubic-bezier(.23,1,.32,1)';
document.addEventListener('keydown', () => root.classList.add('keyboard-input'));
document.addEventListener('pointerdown', () => root.classList.remove('keyboard-input'), {passive:true});
const find = hash => { try { return hash ? document.querySelector(hash) : null; } catch { return null; } };
const inHash = element => { const target = find(location.hash); return !!target && (element.contains(target) || target.contains(element)); };

// Disclosures ship open, so readers without JavaScript see everything.
// Closing happens before the first transition is allowed, so nothing collapses on screen.
// A law guide keeps its first layer open and folds the rest; the four proposals all fold to their headers.
// Either stays open when the address points inside it.
document.querySelectorAll('.rec-item, .situation-more').forEach(detail => { if (!inHash(detail)) detail.open = false; });
const folds = [...document.querySelectorAll('.layer-fold, .proposal-fold')];
const firstLayer = document.querySelector('.layer-fold');
folds.forEach(fold => { if (fold !== firstLayer && !inHash(fold)) fold.open = false; });
// Any link to something inside a folded layer opens that layer first, at once, so the jump lands.
const openTo = hash => {
  const target = find(hash);
  if (!target) return;
  const closed = folds.filter(fold => !fold.open && (fold.contains(target) || target.contains(fold)));
  closed.forEach(fold => {
    fold.classList.add('instant'); fold.open = true;
    requestAnimationFrame(() => requestAnimationFrame(() => fold.classList.remove('instant')));
  });
  // The browser does not scroll to a target that was hidden when the jump began, so finish the jump here.
  if (closed.length) setTimeout(() => target.scrollIntoView({block:'start'}));
};
if (folds.length) {
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href*="#"]');
    if (link && link.pathname === location.pathname) openTo(link.hash);
  });
  addEventListener('hashchange', () => openTo(location.hash));
  addEventListener('beforeprint', () => folds.forEach(fold => { fold.open = true; }));
}
requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
document.querySelectorAll('.rec-item, .situation-more').forEach(detail => {
  detail.addEventListener('toggle', () => {
    if (!detail.open || motionPreference.matches || root.classList.contains('keyboard-input')) return;
    const content = detail.querySelector(':scope > div');
    content?.getAnimations().forEach(animation => animation.cancel());
    content?.animate([{opacity:0,transform:'translateY(-6px)'},{opacity:1,transform:'none'}],{duration:260,easing:EASE});
  });
});

// Sections arrive in reading order: each group rises into place once, the first time it is seen.
const revealable = [...document.querySelectorAll('.paradox-card, .failure-group, .strand, .laws-section tbody.rated tr, .connection-story')];
if (revealable.length && !motionPreference.matches && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const element = entry.target;
    element.classList.add('revealed'); io.unobserve(element);
    // Once risen, hand the element back to its own hover transitions.
    const done = event => { if (event.target !== element) return; element.classList.remove('will-reveal', 'revealed'); element.removeEventListener('transitionend', done); };
    element.addEventListener('transitionend', done);
  }), {rootMargin:'0px 0px -6% 0px', threshold:.08});
  revealable.forEach(element => {
    const index = [...element.parentElement.children].indexOf(element);
    element.style.setProperty('--i', Math.min(index, 8));
    const box = element.getBoundingClientRect();
    if (box.top < innerHeight && box.bottom > 0) return; // already on screen: never hide what is being read
    element.classList.add('will-reveal'); io.observe(element);
  });
}

// One explanatory reveal: draw the relationships when the connections come into view.
const connectionStories = document.querySelector('.connection-stories');
if (connectionStories && !motionPreference.matches && 'IntersectionObserver' in window) {
  connectionStories.classList.add('motion-enabled');
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { connectionStories.classList.add('is-visible'); observer.disconnect(); }
  },{threshold:.18});
  observer.observe(connectionStories);
}

// Back to top: shown once the reader is most of a screen down. Its ring shows how far through the page they are.
const toTop = document.createElement('button');
toTop.type = 'button'; toTop.className = 'to-top'; toTop.setAttribute('aria-label', 'Back to top');
document.body.append(toTop);
let toTopQueued = false;
const placeToTop = () => {
  toTopQueued = false;
  const end = document.documentElement.scrollHeight - innerHeight;
  toTop.classList.toggle('is-shown', scrollY > innerHeight * .6);
  toTop.style.setProperty('--p', end > 0 ? Math.min(1, scrollY / end).toFixed(3) : 0);
};
addEventListener('scroll', () => { if (!toTopQueued) { toTopQueued = true; requestAnimationFrame(placeToTop); } }, {passive:true});
placeToTop();
toTop.addEventListener('click', () => {
  scrollTo({top:0, behavior: motionPreference.matches ? 'auto' : 'smooth'});
  // Keyboard readers continue from the top of the page, not from a button that is about to disappear.
  if (root.classList.contains('keyboard-input')) document.querySelector('.brand-name')?.focus({preventScroll:true});
});

const menus = [...document.querySelectorAll('.site-header details')];
document.addEventListener('click', event => {
  menus.forEach(menu => { if (!menu.contains(event.target)) menu.open = false; });
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const open = menus.find(menu => menu.open);
  if (open) { open.open = false; open.querySelector('summary').focus(); }
});

const gray = document.querySelector('[data-grayscale]');
gray?.addEventListener('click', () => {
  const active = gray.getAttribute('aria-pressed') !== 'true';
  gray.setAttribute('aria-pressed', String(active));
  gray.closest('section').classList.toggle('grayscale', active);
});

// The law map: select a right's column to sort the six rated laws by it, highest risk first.
const heat = document.querySelector('.laws-section .heatmap');
if (heat) {
  const body = heat.querySelector('tbody.rated');
  const status = document.querySelector('[data-lens-status]');
  const paperOrder = [...body.rows];
  const severity = {2:0, 1:1, 0:2, 3:3};
  const buttons = [], names = [];
  let lens = null;
  heat.querySelectorAll('thead th[data-right]').forEach(th => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'lens'; button.setAttribute('aria-pressed', 'false');
    button.append(...th.childNodes);
    button.insertAdjacentHTML('beforeend', '<span class="lens-sort" aria-hidden="true"></span>');
    th.append(button);
    names.push(button.textContent.trim()); buttons.push(button);
    button.addEventListener('click', () => apply(lens === +th.dataset.right ? null : +th.dataset.right));
  });
  const apply = right => {
    lens = right;
    const before = new Map(paperOrder.map(row => [row, row.getBoundingClientRect().top]));
    const risk = row => severity[row.cells[right + 1].querySelector('.rating').className.match(/risk-(\d)/)[1]];
    const rows = right === null ? paperOrder : [...paperOrder].sort((a, b) => risk(a) - risk(b) || paperOrder.indexOf(a) - paperOrder.indexOf(b));
    body.append(...rows);
    if (!motionPreference.matches) rows.forEach(row => {
      const dy = before.get(row) - row.getBoundingClientRect().top;
      if (dy) row.animate([{transform:`translateY(${dy}px)`}, {transform:'none'}], {duration:460, easing:EASE});
    });
    if (right === null) delete heat.dataset.lens; else heat.dataset.lens = right;
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === right)));
    status.textContent = right === null ? 'Laws shown in white-paper order.' : `Sorted by ${names[right]}, highest risk first.`;
  };
}

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
  document.querySelector('#clear-search').addEventListener('click', () => { search.value = ''; filter(); search.focus(); });
}

// The reading rail follows the layer in view.
const layers = [...document.querySelectorAll('.law-layer[id]')];
if (layers.length && 'IntersectionObserver' in window) {
  const railLinks = [...document.querySelectorAll('.reading-rail a[href^="#"]')];
  const seen = new Map();
  const mark = () => {
    const current = layers.filter(layer => seen.get(layer)).pop() || layers[0];
    railLinks.forEach(link => link.hash === `#${current.id}` ? link.setAttribute('aria-current', 'location') : link.removeAttribute('aria-current'));
  };
  const io = new IntersectionObserver(entries => { entries.forEach(e => seen.set(e.target, e.boundingClientRect.top < innerHeight * .4)); mark(); }, {rootMargin:'0px 0px -60% 0px', threshold:[0, 1]});
  layers.forEach(layer => io.observe(layer));
}

// The overlap network: the table is the source of truth and the text alternative.
// Subjects sit on the left, the eight laws on the right; selecting either lights its connections
// and shows what each law does there and the penalty it sets. On wide screens that detail sits
// beside the map; below 1100px it opens in a bottom sheet the reader can drag to resize or close.
// Closing the sheet keeps the selection lit until the reader taps empty space or another node.
const network = document.querySelector('[data-network]');
if (network) {
  const stage = network.querySelector('[data-net-stage]');
  const panel = network.querySelector('[data-net-panel]');
  const body = panel.querySelector('[data-net-body]');
  const grip = panel.querySelector('[data-sheet-grip]');
  const bar = panel.querySelector('.sheet-bar');
  const tab = network.querySelector('[data-sheet-tab]');
  const tabLabel = tab.querySelector('[data-sheet-tab-label]');
  const svg = stage.querySelector('.net-edges');
  const NS = 'http://www.w3.org/2000/svg';
  const sheetQuery = matchMedia('(max-width: 1099px)');
  const isSheet = () => sheetQuery.matches;
  const subjects = new Map(), laws = new Map(), edges = [];
  stage.querySelectorAll('.net-subject').forEach(node => subjects.set(node.dataset.subject, {kind:'subject', key:node.dataset.subject, node, label:node.querySelector('.net-label').textContent, edges:[]}));
  stage.querySelectorAll('.net-law').forEach(node => laws.set(node.dataset.law, {kind:'law', key:node.dataset.law, node, label:node.querySelector('.net-label').textContent.replace(/­/g, ''), edges:[]}));
  network.querySelectorAll('.overlap-table tbody tr[data-subject]').forEach(row => {
    const subject = subjects.get(row.dataset.subject);
    row.querySelectorAll('li.edge').forEach(li => {
      const law = laws.get(li.dataset.law);
      const link = li.querySelector('.edge-law a');
      law.name = link.textContent; law.href = link.getAttribute('href').split('#')[0];
      const edge = {subject, law, li, years: li.dataset.years};
      subject.edges.push(edge); law.edges.push(edge); edges.push(edge);
    });
  });
  let selected = null, sheet = 'closed';
  const draw = () => {
    svg.replaceChildren();
    const box = stage.getBoundingClientRect();
    edges.forEach(edge => {
      const a = edge.subject.node.getBoundingClientRect(), b = edge.law.node.getBoundingClientRect();
      const x1 = a.right - box.left, y1 = a.top + a.height / 2 - box.top, x2 = b.left - box.left, y2 = b.top + b.height / 2 - box.top, mid = (x1 + x2) / 2;
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', `M${x1} ${y1}C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`);
      path.setAttribute('class', 'net-edge');
      edge.path = path; svg.append(path);
    });
    paint(false);
  };
  const paint = animate => {
    const lit = new Set();
    if (selected) selected.edges.forEach(edge => { lit.add(edge.subject); lit.add(edge.law); });
    [...subjects.values(), ...laws.values()].forEach(item => {
      item.node.classList.toggle('is-dim', !!selected && !lit.has(item));
      item.node.classList.toggle('is-lit', !!selected && lit.has(item) && item !== selected);
      item.node.setAttribute('aria-pressed', String(item === selected));
    });
    edges.forEach(edge => {
      const on = !!selected && (edge.subject === selected || edge.law === selected);
      edge.path.classList.toggle('is-lit', on);
      edge.path.classList.toggle('is-dim', !!selected && !on);
      if (!on) return;
      svg.append(edge.path); // lit lines draw above the rest
      if (animate && !motionPreference.matches) {
        const length = edge.path.getTotalLength();
        edge.path.animate([{strokeDasharray:length, strokeDashoffset:length}, {strokeDasharray:length, strokeDashoffset:0}], {duration:560, easing:EASE});
      }
    });
  };
  const term = years => {
    if (!years) return '';
    const life = years === 'life';
    return `<div class="term" aria-hidden="true"><span class="term-bar${life ? ' life' : ''}" style="--w:${life ? 100 : Math.round(+years / 12 * 100)}%"></span><span class="term-label">${life ? 'Life' : years + ' years'}</span></div>`;
  };
  const scale = list => list.some(edge => edge.years) ? '<p class="net-scale">Bars compare the longest prison term each law sets here.</p>' : '';
  const render = () => {
    if (!selected) {
      body.innerHTML = `<p class="net-panel-count"><strong>${edges.length}</strong> connections</p><h3 tabindex="-1">Select a subject or a law</h3><p class="net-panel-note">Each line is one law reaching one subject. Select either end to compare what the laws do there.</p>`;
      return;
    }
    const n = selected.edges.length;
    if (selected.kind === 'subject') {
      body.innerHTML = `<p class="net-panel-count"><strong>${n}</strong> ${n === 1 ? 'law reaches' : 'laws reach'} this subject</p><h3 tabindex="-1">${selected.label}</h3>`
        + `<ol class="net-cards">${selected.edges.map(edge => `<li class="net-card">${edge.li.innerHTML}${term(edge.years)}</li>`).join('')}</ol>${scale(selected.edges)}`;
    } else {
      body.innerHTML = `<p class="net-panel-count"><strong>${n}</strong> ${n === 1 ? 'subject' : 'subjects'} reached by</p><h3 tabindex="-1">${selected.name}</h3>`
        + `<ol class="net-cards">${selected.edges.map(edge => `<li class="net-card"><p class="net-card-subject">${edge.subject.label}${edge.li.querySelector('.sec')?.outerHTML || ''}</p>`
        + `${edge.li.querySelector('.edge-does').outerHTML}${edge.li.querySelector('.edge-penalties')?.outerHTML || ''}${term(edge.years)}</li>`).join('')}</ol>${scale(selected.edges)}`
        + `<a class="text-link" href="${selected.href}">Open the ${selected.name} guide <span class="net-arrow" aria-hidden="true"></span></a>`;
    }
    body.scrollTop = 0;
    if (!motionPreference.matches) body.querySelectorAll('.net-card').forEach((card, i) =>
      card.animate([{opacity:0, transform:'translateY(8px)'}, {opacity:1, transform:'none'}], {duration:360, delay:i * 60, easing:EASE, fill:'backwards'}));
  };
  // The sheet: closed, peek (about half the screen) or full. The tab brings a closed sheet back.
  const setSheet = state => {
    sheet = isSheet() ? state : 'inline';
    panel.dataset.sheet = sheet;
    panel.inert = sheet === 'closed';
    panel.style.height = sheet === 'full' ? '88dvh' : sheet === 'peek' ? '56dvh' : '';
    grip.setAttribute('aria-label', sheet === 'full' ? 'Shrink details' : 'Expand details');
    tab.hidden = !(sheet === 'closed' && selected);
    if (selected) tabLabel.textContent = selected.kind === 'subject' ? selected.label : selected.name;
  };
  // Keep the chosen node in view above an opening sheet.
  const reveal = node => {
    const box = node.getBoundingClientRect(), room = innerHeight * .44;
    if (box.top > 80 && box.bottom < room) return;
    scrollBy({top: box.top - Math.max(90, room * .45), behavior: motionPreference.matches ? 'auto' : 'smooth'});
  };
  const select = (item, animate = true) => { selected = item; paint(animate); render(); };
  const choose = item => {
    if (isSheet() && item === selected) { setSheet(sheet === 'closed' ? 'peek' : 'closed'); return; }
    if (!isSheet() && item === selected) item = null;
    select(item);
    // A chosen subject is shareable. (Only after a click: writing the address during load would make
    // the browser expand the table and jump to that row.)
    history.replaceState(null, '', selected && selected.kind === 'subject' ? '#subject-' + selected.key : location.pathname);
    if (!isSheet()) return;
    setSheet(selected ? (sheet === 'full' ? 'full' : 'peek') : 'closed');
    if (selected) {
      reveal(selected.node);
      if (root.classList.contains('keyboard-input')) body.querySelector('h3')?.focus({preventScroll:true});
    }
  };
  [...subjects.values(), ...laws.values()].forEach(item => item.node.addEventListener('click', () => choose(item)));
  // Tapping the map's empty space clears the selection.
  stage.addEventListener('click', event => { if (!event.target.closest('.net-node') && selected) { select(null); history.replaceState(null, '', location.pathname); setSheet('closed'); } });
  const closeSheet = () => { setSheet('closed'); if (root.classList.contains('keyboard-input')) selected?.node.focus(); };
  panel.querySelector('[data-sheet-close]').addEventListener('click', closeSheet);
  tab.addEventListener('click', () => { setSheet('peek'); if (root.classList.contains('keyboard-input')) body.querySelector('h3')?.focus({preventScroll:true}); });
  let dragged = false;
  grip.addEventListener('click', () => { if (dragged) { dragged = false; return; } setSheet(sheet === 'full' ? 'peek' : 'full'); });
  // Drag the bar to resize; a quick flick or a short sheet closes it. Height follows the finger directly.
  bar.addEventListener('pointerdown', event => {
    if (!isSheet() || event.target.closest('[data-sheet-close]')) return;
    const startY = event.clientY, startH = panel.getBoundingClientRect().height, t0 = performance.now();
    let moved = false;
    bar.setPointerCapture(event.pointerId);
    panel.classList.add('dragging');
    const move = ev => {
      const dy = ev.clientY - startY;
      if (Math.abs(dy) > 4) moved = true;
      panel.style.height = Math.min(innerHeight * .92, Math.max(innerHeight * .12, startH - dy)) + 'px';
    };
    const up = ev => {
      bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); bar.removeEventListener('pointercancel', up);
      panel.classList.remove('dragging');
      if (!moved) return;
      dragged = true;
      const velocity = (ev.clientY - startY) / Math.max(1, performance.now() - t0), height = panel.getBoundingClientRect().height;
      if (velocity > .45 || height < innerHeight * .3) setSheet('closed');
      else if (velocity < -.45 || height > innerHeight * .72) setSheet('full');
      else setSheet('peek');
    };
    bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (isSheet() && sheet !== 'closed') closeSheet();
    else if (!isSheet() && selected) select(null);
  });
  sheetQuery.addEventListener('change', () => { setSheet('closed'); draw(); });
  stage.hidden = false; panel.hidden = false; network.classList.add('net-ready');
  const table = network.querySelector('.net-table');
  table.open = false;
  const fromHash = subjects.get((location.hash.match(/^#subject-([\w-]+)$/) || [])[1]);
  draw();
  // It opens on one subject so the idea is visible at once; on a phone the detail waits behind the tab.
  select(fromHash || subjects.get('speech'), false);
  setSheet('closed');
  // A link to a subject lands on the map, not the table the browser would otherwise expand.
  if (fromHash) addEventListener('load', () => { table.open = false; network.scrollIntoView({block:'start'}); }, {once:true});
  addEventListener('hashchange', () => {
    const target = subjects.get((location.hash.match(/^#subject-([\w-]+)$/) || [])[1]);
    if (!target) return;
    table.open = false; select(target); setSheet('closed'); network.scrollIntoView({block:'start'});
  });
  new ResizeObserver(() => draw()).observe(stage);
}

// Video is optional. A build-time manifest prevents requests for absent files.
const video = document.querySelector('video[data-video]');
if (video && video.dataset.sources) {
  let visible = true;
  const sync = () => { if (motionPreference.matches || !visible || document.hidden) video.pause(); else video.play().catch(() => {}); };
  JSON.parse(video.dataset.sources).forEach(path => {
    const source = document.createElement('source');
    source.src = path; source.type = path.endsWith('.webm') ? 'video/webm' : 'video/mp4';
    video.append(source);
  });
  if (!motionPreference.matches) video.autoplay = true;
  video.load();
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(video);
  motionPreference.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  sync();
}
