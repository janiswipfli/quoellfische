(function () {
  const S = window.ShotStore;
  const $ = id => document.getElementById(id);
  const tiles = $('tiles');
  let sortMode = 'az';
  let query = '';
  let toastTimer = null;

  /* ---------- Gruppe erfassen ---------- */
  $('add-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('add-name');
    const res = S.addGroup(input.value);
    const msg = $('add-msg');
    if (res.error) {
      msg.textContent = res.error;
      msg.className = 'a-msg is-error';
      input.focus();
      return;
    }
    msg.textContent = `„${res.group.name}“ ist auf der Rangliste.`;
    msg.className = 'a-msg is-ok';
    input.value = '';
    input.focus();
    render();
  });

  /* ---------- Suche & Sortierung ---------- */
  $('search').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); render(); });
  document.querySelectorAll('.seg button').forEach(b => {
    b.addEventListener('click', () => {
      sortMode = b.dataset.sort;
      document.querySelectorAll('.seg button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      render();
    });
  });

  /* ---------- Kacheln ---------- */
  function render() {
    const data = S.load();
    const ranked = S.ranked(data);
    const rankOf = {};
    ranked.forEach(g => { rankOf[g.id] = g.rank; });

    let list = sortMode === 'rank'
      ? ranked
      : [...data.groups].sort((a, b) => a.name.localeCompare(b.name, 'de'));
    if (query) list = list.filter(g => g.name.toLowerCase().includes(query));

    $('total').textContent = data.groups.reduce((s, g) => s + g.score, 0);
    $('tiles-empty').hidden = data.groups.length > 0;
    if (document.activeElement !== $('event-name')) $('event-name').value = data.event === 'Shot-Rangliste' ? '' : data.event;

    const existing = {};
    tiles.querySelectorAll('.tile').forEach(t => { existing[t.dataset.id] = t; });
    const frag = document.createDocumentFragment();

    list.forEach(g => {
      let t = existing[g.id];
      if (!t) {
        t = document.createElement('article');
        t.className = 'tile';
        t.dataset.id = g.id;
        t.innerHTML =
          '<div class="tile-head"><h3 class="tile-name"></h3><span class="tile-rank"></span></div>' +
          '<div class="tile-score"><span class="tile-num"></span><span class="tile-unit"></span></div>' +
          '<div class="tile-actions">' +
            '<button type="button" class="shot-btn" data-act="shot">+1 Shot</button>' +
            '<button type="button" class="minus-btn" data-act="minus" aria-label="Einen Shot abziehen">−1</button>' +
          '</div>' +
          '<div class="tile-more">' +
            '<button type="button" class="link-btn" data-act="rename">Umbenennen</button>' +
            '<button type="button" class="link-btn danger" data-act="delete">Löschen</button>' +
          '</div>';
      }
      delete existing[g.id];
      const r = rankOf[g.id];
      t.dataset.rank = g.score > 0 ? r : '';
      t.querySelector('.tile-name').textContent = g.name;
      t.querySelector('.tile-rank').textContent = 'Platz ' + r;
      t.querySelector('.tile-num').textContent = g.score;
      t.querySelector('.tile-unit').textContent = g.score === 1 ? 'Shot' : 'Shots';
      t.querySelector('.minus-btn').disabled = g.score <= 0;
      t.querySelector('.shot-btn').setAttribute('aria-label', '+1 Shot für ' + g.name);
      frag.appendChild(t);
    });
    Object.values(existing).forEach(t => t.remove());
    tiles.appendChild(frag);
  }

  tiles.addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const tile = btn.closest('.tile');
    const id = tile.dataset.id;
    const act = btn.dataset.act;

    if (act === 'shot') {
      const g = S.shot(id, 1);
      if (!g) return;
      if (navigator.vibrate) navigator.vibrate(18);
      tile.classList.remove('pulse'); void tile.offsetWidth; tile.classList.add('pulse');
      toast(`+1 für ${g.name} (jetzt ${g.score})`);
      render();
    }
    if (act === 'minus') {
      const g = S.unshot(id);
      if (g) toast(`−1 für ${g.name} (jetzt ${g.score})`, false);
      render();
    }
    if (act === 'rename') openRename(id);
    if (act === 'delete') {
      const g = S.load().groups.find(x => x.id === id);
      if (g && confirm(`„${g.name}“ mit ${g.score} Shots endgültig löschen?`)) { S.remove(id); render(); }
    }
  });

  /* ---------- Toast mit Rückgängig ---------- */
  function toast(text, undoable = true) {
    $('toast-text').textContent = text;
    $('toast-undo').hidden = !undoable;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3500);
  }
  $('toast-undo').addEventListener('click', () => {
    const g = S.undoLast();
    render();
    if (g) toast(`Zurückgenommen: ${g.name} hat jetzt ${g.score}`, false);
  });

  /* ---------- Umbenennen ---------- */
  const dlg = $('dlg');
  let renameId = null;
  function openRename(id) {
    const g = S.load().groups.find(x => x.id === id);
    if (!g) return;
    renameId = id;
    $('dlg-input').value = g.name;
    $('dlg-msg').textContent = '';
    if (dlg.showModal) dlg.showModal();
    else { const n = prompt('Neuer Name', g.name); if (n !== null) { S.rename(id, n); render(); } return; }
    $('dlg-input').select();
  }
  dlg.addEventListener('close', () => {
    if (dlg.returnValue !== 'ok' || !renameId) return;
    const res = S.rename(renameId, $('dlg-input').value);
    if (res.error) { alert(res.error); }
    renameId = null;
    render();
  });

  /* ---------- Einstellungen ---------- */
  $('event-form').addEventListener('submit', e => {
    e.preventDefault();
    S.setEvent($('event-name').value);
    $('event-name').blur();
    toast('Titel gespeichert', false);
    render();
  });

  $('export').addEventListener('click', () => {
    const blob = new Blob([S.exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    a.href = URL.createObjectURL(blob);
    a.download = `quoellfische-shots-${stamp}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  $('import').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (!confirm('Backup laden? Der aktuelle Stand wird ersetzt.')) return;
        const d = S.importData(reader.result);
        toast(`Backup geladen: ${d.groups.length} Gruppen`, false);
        render();
      } catch (err) {
        alert('Diese Datei ist kein gültiges Backup.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  $('reset-scores').addEventListener('click', () => {
    if (confirm('Alle Shots auf 0 setzen? Die Gruppen bleiben erhalten.')) { S.resetScores(); render(); }
  });
  $('reset-all').addEventListener('click', () => {
    if (confirm('Alle Gruppen und Shots löschen? Lade vorher ein Backup herunter, falls du den Stand behalten willst.')) { S.resetAll(); render(); }
  });

  /* ---------- Start ---------- */
  render();
  S.subscribe(render);
})();
