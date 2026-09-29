(function () {
  const S = window.ShotStore;
  const $ = id => document.getElementById(id);
  const els = {
    stage: $('stage'), podium: $('podium'), list: $('list'), rest: $('rest'),
    empty: $('empty'), total: $('total'), count: $('count'), event: $('event'),
    ticker: $('ticker'), takeover: $('takeover'), takeoverName: $('takeover-name')
  };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let prevScores = null;   // id -> score beim letzten Rendern
  let prevLeader = null;   // id der bisherigen Nummer 1
  let prevSlotIds = [null, null, null];
  let takeoverTimer = null;

  /* ---------- Podest einmalig aufbauen ---------- */
  const slots = [1, 2, 3].map(pos => {
    const el = document.createElement('article');
    el.className = 'slot';
    el.dataset.pos = pos;
    el.innerHTML =
      '<div class="slot-body">' +
        '<div class="slot-crown" aria-hidden="true"></div>' +
        '<h2 class="slot-name"></h2>' +
        '<div class="slot-score"><span class="slot-num">0</span><span class="slot-unit">Shots</span></div>' +
        '<div class="slot-meter"><i></i></div>' +
        '<p class="slot-gap"></p>' +
      '</div>' +
      '<div class="step"><span>' + pos + '</span></div>';
    els.podium.appendChild(el);
    return {
      el,
      name: el.querySelector('.slot-name'),
      num: el.querySelector('.slot-num'),
      meter: el.querySelector('.slot-meter i'),
      gap: el.querySelector('.slot-gap'),
      rank: el.querySelector('.step span'),
      score: el.querySelector('.slot-score')
    };
  });

  const shots = n => (n === 1 ? '1 Shot' : n + ' Shots');

  function gapText(list, i) {
    const g = list[i];
    if (i === 0) {
      const next = list[1];
      if (!next) return g.score > 0 ? 'Allein an der Spitze' : '';
      const lead = g.score - next.score;
      return lead > 0 ? '+' + lead + ' Vorsprung' : 'Gleichstand an der Spitze';
    }
    // Wie viele Shots fehlen, um die nächstbessere Gruppe zu überholen
    let j = i - 1;
    while (j >= 0 && list[j].score === g.score) j--;
    if (j < 0) return 'Gleichstand an der Spitze';
    const target = list[j];
    return shots(target.score - g.score + 1) + ' bis Platz ' + target.rank;
  }

  function flash(container, amount) {
    if (reduceMotion) return;
    container.classList.remove('bump');
    void container.offsetWidth;
    container.classList.add('bump');
    const p = document.createElement('span');
    p.className = 'plus';
    p.textContent = '+' + amount;
    (container.querySelector('.slot-score') || container).appendChild(p);
    setTimeout(() => p.remove(), 1200);
  }

  function glitch(el) {
    if (reduceMotion) return;
    el.classList.remove('glitch');
    void el.offsetWidth;
    el.classList.add('glitch');
  }

  /* ---------- Rendern ---------- */
  function render(data) {
    const list = S.ranked(data);
    const leaderScore = list.length ? Math.max(list[0].score, 1) : 1;
    const total = list.reduce((s, g) => s + g.score, 0);

    els.event.textContent = data.event || 'Shot-Rangliste';
    els.total.textContent = total;
    els.count.textContent = list.length;

    const isEmpty = list.length === 0;
    els.empty.hidden = !isEmpty;
    els.stage.classList.toggle('is-empty', isEmpty);
    els.stage.classList.toggle('only-podium', list.length > 0 && list.length <= 3);

    const firstRender = prevScores === null;
    const scores = {};
    list.forEach(g => { scores[g.id] = g.score; });

    // Podest
    slots.forEach((s, i) => {
      const g = list[i];
      s.el.classList.toggle('is-vacant', !g);
      if (!g) {
        s.name.textContent = 'Frei';
        s.num.textContent = '0';
        s.meter.style.width = '0%';
        s.gap.textContent = '';
        s.rank.textContent = i + 1;
        prevSlotIds[i] = null;
        return;
      }
      s.name.textContent = g.name;
      s.name.classList.toggle('is-long', g.name.length > 14);
      s.num.textContent = g.score;
      s.meter.style.width = (g.score / leaderScore * 100) + '%';
      s.gap.textContent = gapText(list, i);
      s.rank.textContent = g.rank;

      if (!firstRender) {
        if (prevSlotIds[i] !== g.id) glitch(s.el.querySelector('.slot-body'));
        const before = prevScores[g.id];
        if (before !== undefined && g.score > before) flash(s.el, g.score - before);
      }
      prevSlotIds[i] = g.id;
    });

    // Weitere Plätze mit FLIP-Animation
    const rest = list.slice(3);
    const oldRects = {};
    if (!reduceMotion) {
      els.list.querySelectorAll('.row').forEach(r => { oldRects[r.dataset.id] = r.getBoundingClientRect(); });
    }
    const existing = {};
    els.list.querySelectorAll('.row').forEach(r => { existing[r.dataset.id] = r; });

    const cols = rest.length > 18 ? 3 : rest.length > 4 ? 2 : 1;
    els.list.style.setProperty('--cols', cols);
    els.list.style.setProperty('--rows', Math.max(1, Math.ceil(rest.length / cols)));
    els.list.classList.toggle('dense', rest.length > 10);

    const frag = document.createDocumentFragment();
    rest.forEach((g, k) => {
      let row = existing[g.id];
      if (!row) {
        row = document.createElement('li');
        row.className = 'row';
        row.dataset.id = g.id;
        row.innerHTML =
          '<span class="r-rank"></span>' +
          '<span class="r-name"><span class="r-title"></span><span class="r-gap"></span></span>' +
          '<span class="r-track"><i></i></span>' +
          '<span class="r-score"></span>';
      }
      delete existing[g.id];
      row.querySelector('.r-rank').textContent = g.rank;
      row.querySelector('.r-title').textContent = g.name;
      row.querySelector('.r-gap').textContent = gapText(list, k + 3);
      row.querySelector('.r-track i').style.width = (g.score / leaderScore * 100) + '%';
      row.querySelector('.r-score').textContent = g.score;
      frag.appendChild(row);

      if (!firstRender) {
        const before = prevScores[g.id];
        if (before !== undefined && g.score > before) flash(row, g.score - before);
      }
    });
    Object.values(existing).forEach(r => r.remove());
    els.list.appendChild(frag);

    if (!reduceMotion) {
      els.list.querySelectorAll('.row').forEach(r => {
        const old = oldRects[r.dataset.id];
        if (!old) return;
        const now = r.getBoundingClientRect();
        const dx = old.left - now.left, dy = old.top - now.top;
        if (!dx && !dy) return;
        r.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
          { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)' });
      });
    }

    // Neue Nummer 1?
    const leader = list[0] && list[0].score > 0 ? list[0].id : null;
    if (!firstRender && leader && prevLeader && leader !== prevLeader) showTakeover(list[0].name);
    if (leader) prevLeader = leader;

    renderTicker(data);
    prevScores = scores;
    setupAutoScroll();
  }

  /* ---------- Ticker ---------- */
  function ago(t) {
    const s = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (s < 45) return 'gerade eben';
    const m = Math.round(s / 60);
    if (m < 60) return 'vor ' + m + ' Min.';
    return 'vor ' + Math.round(m / 60) + ' Std.';
  }

  function renderTicker(data) {
    const names = {};
    data.groups.forEach(g => { names[g.id] = g.name; });
    const recent = [];
    for (let i = data.log.length - 1; i >= 0 && recent.length < 10; i--) {
      const e = data.log[i];
      if (!names[e.gid]) continue;
      const last = recent[recent.length - 1];
      // aufeinanderfolgende Shots derselben Gruppe zusammenfassen
      if (last && last.gid === e.gid && last.t - e.t < 60000) { last.n++; continue; }
      recent.push({ gid: e.gid, t: e.t, n: 1 });
    }
    els.ticker.textContent = '';
    if (!recent.length) {
      const p = document.createElement('span');
      p.className = 'tick';
      p.textContent = 'Wer trinkt den ersten Shot?';
      els.ticker.appendChild(p);
      return;
    }
    recent.forEach(r => {
      const d = document.createElement('span');
      d.className = 'tick';
      const b = document.createElement('b'); b.textContent = '+' + r.n;
      const n = document.createElement('span'); n.textContent = names[r.gid];
      const tm = document.createElement('time'); tm.textContent = ago(r.t);
      d.append(b, n, tm);
      els.ticker.appendChild(d);
    });
  }

  /* ---------- Übernahme-Moment ---------- */
  function showTakeover(name) {
    els.takeoverName.textContent = name;
    els.takeover.hidden = false;
    clearTimeout(takeoverTimer);
    takeoverTimer = setTimeout(() => { els.takeover.hidden = true; }, 3600);
  }
  els.takeover.addEventListener('click', () => { els.takeover.hidden = true; });

  /* ---------- Autoscroll, falls die Liste nicht auf den Screen passt ---------- */
  let scrollRAF = null;
  function setupAutoScroll() {
    cancelAnimationFrame(scrollRAF);
    const box = els.rest;
    if (window.matchMedia('(max-aspect-ratio: 1/1)').matches) return;
    const max = box.scrollHeight - box.clientHeight;
    if (max <= 4) { box.scrollTop = 0; return; }
    let dir = 1, pauseUntil = performance.now() + 2500, pos = box.scrollTop;
    const speed = 0.035; // px pro ms
    let last = performance.now();
    const step = now => {
      const dt = now - last; last = now;
      if (now > pauseUntil) {
        pos += dir * speed * dt;
        if (pos >= max) { pos = max; dir = -1; pauseUntil = now + 2500; }
        if (pos <= 0) { pos = 0; dir = 1; pauseUntil = now + 2500; }
        box.scrollTop = pos;
      }
      scrollRAF = requestAnimationFrame(step);
    };
    scrollRAF = requestAnimationFrame(step);
  }

  /* ---------- Vollbild & Maus ausblenden ---------- */
  $('fs').addEventListener('click', toggleFs);
  function toggleFs() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    else document.exitFullscreen && document.exitFullscreen();
  }
  document.addEventListener('keydown', e => { if (e.key === 'f' || e.key === 'F') toggleFs(); });

  let idleTimer = null;
  function wake() {
    document.body.classList.remove('idle');
    document.body.classList.add('show-ui');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      document.body.classList.add('idle');
      document.body.classList.remove('show-ui');
    }, 2500);
  }
  document.addEventListener('mousemove', wake);
  document.addEventListener('touchstart', wake, { passive: true });

  /* ---------- Start ---------- */
  render(S.load());
  S.subscribe(render);
  // Fallback, falls ein Browser keine Sync-Events liefert
  setInterval(() => {
    const d = S.load();
    const sig = JSON.stringify([d.event, d.groups, d.log.length]);
    if (sig !== window.__qfSig) { window.__qfSig = sig; render(d); }
  }, 1500);
  setInterval(() => renderTicker(S.load()), 30000);
  window.addEventListener('resize', setupAutoScroll);
})();
