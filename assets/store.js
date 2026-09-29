/* Quöllfische Shotboard: Datenablage im Browser (localStorage).
   Rangliste und Steuerung synchronisieren sich live, solange beide
   im selben Browser auf demselben Gerät offen sind. */
(function () {
  const KEY = 'quoellfische-shotboard-v1';
  const DEFAULT_EVENT = 'Shot-Rangliste';
  const MAX_LOG = 5000;

  let bc = null;
  try { if ('BroadcastChannel' in window) bc = new BroadcastChannel(KEY); } catch (e) { bc = null; }

  function empty() { return { event: DEFAULT_EVENT, groups: [], log: [] }; }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return empty();
      return normalize(JSON.parse(raw));
    } catch (e) { return empty(); }
  }

  function normalize(d) {
    if (!d || !Array.isArray(d.groups)) return empty();
    return {
      event: typeof d.event === 'string' ? d.event : DEFAULT_EVENT,
      groups: d.groups
        .filter(g => g && typeof g.name === 'string' && g.id)
        .map(g => ({
          id: String(g.id),
          name: clean(g.name),
          score: Math.max(0, parseInt(g.score, 10) || 0),
          reachedAt: Number(g.reachedAt) || 0,
          createdAt: Number(g.createdAt) || 0
        })),
      log: Array.isArray(d.log) ? d.log.filter(e => e && e.gid) : []
    };
  }

  function save(d) {
    if (d.log.length > MAX_LOG) d.log = d.log.slice(-MAX_LOG);
    localStorage.setItem(KEY, JSON.stringify(d));
    if (bc) bc.postMessage('update');
  }

  function subscribe(fn) {
    window.addEventListener('storage', e => { if (e.key === KEY || e.key === null) fn(load()); });
    if (bc) bc.onmessage = () => fn(load());
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function clean(n) { return String(n || '').replace(/\s+/g, ' ').trim().slice(0, 32); }

  /* Sortierung: meiste Shots zuerst. Bei Gleichstand gewinnt,
     wer den Punktestand zuerst erreicht hat. */
  function ranked(d) {
    const list = d.groups.map(g => Object.assign({}, g));
    list.sort((a, b) =>
      b.score - a.score ||
      (a.reachedAt || 0) - (b.reachedAt || 0) ||
      a.name.localeCompare(b.name, 'de'));
    let rank = 0, prev = null;
    list.forEach((g, i) => { if (g.score !== prev) { rank = i + 1; prev = g.score; } g.rank = rank; });
    return list;
  }

  function find(d, id) { return d.groups.find(g => g.id === id); }

  const api = {
    KEY, load, save, subscribe, ranked, clean,

    addGroup(name) {
      const d = load();
      name = clean(name);
      if (!name) return { error: 'Gib zuerst einen Gruppennamen ein.' };
      if (d.groups.some(g => g.name.toLowerCase() === name.toLowerCase()))
        return { error: `Die Gruppe „${name}“ gibt es schon.` };
      const now = Date.now();
      const g = { id: uid(), name, score: 0, reachedAt: now, createdAt: now };
      d.groups.push(g);
      save(d);
      return { group: g };
    },

    shot(id, n = 1) {
      const d = load();
      const g = find(d, id);
      if (!g) return null;
      for (let i = 0; i < n; i++) {
        const now = Date.now() + i;
        d.log.push({ id: uid(), gid: id, t: now, prev: g.reachedAt });
        g.score += 1;
        g.reachedAt = now;
      }
      save(d);
      return g;
    },

    /* Nimmt den letzten Shot dieser Gruppe zurück */
    unshot(id) {
      const d = load();
      const g = find(d, id);
      if (!g || g.score <= 0) return null;
      for (let i = d.log.length - 1; i >= 0; i--) {
        if (d.log[i].gid === id) {
          g.reachedAt = d.log[i].prev || g.reachedAt;
          d.log.splice(i, 1);
          break;
        }
      }
      g.score -= 1;
      save(d);
      return g;
    },

    /* Letzten Shot insgesamt zurücknehmen */
    undoLast() {
      const d = load();
      const e = d.log.pop();
      if (!e) return null;
      const g = find(d, e.gid);
      if (g && g.score > 0) { g.score -= 1; g.reachedAt = e.prev || g.reachedAt; }
      save(d);
      return g || null;
    },

    rename(id, name) {
      const d = load();
      const g = find(d, id);
      name = clean(name);
      if (!g || !name) return { error: 'Der Name darf nicht leer sein.' };
      if (d.groups.some(x => x.id !== id && x.name.toLowerCase() === name.toLowerCase()))
        return { error: `Die Gruppe „${name}“ gibt es schon.` };
      g.name = name;
      save(d);
      return { group: g };
    },

    remove(id) {
      const d = load();
      d.groups = d.groups.filter(g => g.id !== id);
      d.log = d.log.filter(e => e.gid !== id);
      save(d);
    },

    setEvent(text) {
      const d = load();
      d.event = String(text || '').trim().slice(0, 48) || DEFAULT_EVENT;
      save(d);
    },

    resetScores() {
      const d = load();
      const now = Date.now();
      d.groups.forEach(g => { g.score = 0; g.reachedAt = now; });
      d.log = [];
      save(d);
    },

    resetAll() { save(empty()); },

    exportData() { return JSON.stringify(load(), null, 2); },

    importData(text) {
      const d = normalize(JSON.parse(text));
      save(d);
      return d;
    }
  };

  window.ShotStore = api;
})();
