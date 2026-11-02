/* Player guiado: timer, repetições, AMRAP, escada, voz e boneco 3D. */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const PREP = 10;
  const P = { steps: [], i: 0, end: 0, left: 0, paused: false, iv: null, session: null, meta: null, start: 0, kcal: 0, rounds: 0, lastSec: null, active: 0, stepStart: 0 };

  function exOf(id) { const S = Store.S; return EXDB.resolve(id, S.eq || [], { lim: S.lim || [] }) || EXDB.X[id]; }
  function build(session) {
    const steps = [];
    session.blocks.forEach(b => {
      if (b.kind === 'list') {
        const ph = /along|mobil/i.test(b.label) ? 'cool' : 'warm';
        steps.push({ ph: 'prep', name: b.label, secs: PREP, next: exOf(b.items[0]) });
        b.items.forEach((id, k) => { const ex = exOf(id); steps.push({ ph, ex, name: ex.n, secs: b.secs, info: b.label + ' ' + (k + 1) + ' de ' + b.items.length, next: b.items[k + 1] ? exOf(b.items[k + 1]) : null }); });
      } else if (b.kind === 'timed') {
        const items = b.items.map(exOf);
        steps.push({ ph: 'prep', name: b.label, secs: PREP, info: b.rounds + (b.rounds > 1 ? ' voltas' : ' volta') + ' · ' + b.work + ' s por exercício', next: items[0] });
        for (let r = 1; r <= b.rounds; r++) items.forEach((ex, k) => {
          steps.push({ ph: 'work', ex, name: ex.n, secs: b.work, info: 'Volta ' + r + ' de ' + b.rounds + ' · ' + (k + 1) + ' de ' + items.length, next: items[k + 1] || (r < b.rounds ? items[0] : null) });
          const last = k === items.length - 1;
          if (!last && b.rest) steps.push({ ph: 'rest', name: 'Descanso', secs: b.rest, info: 'Volta ' + r + ' de ' + b.rounds, next: items[k + 1] });
          else if (last && r < b.rounds && b.rr) steps.push({ ph: 'rest', name: 'Descanso entre voltas', secs: b.rr, info: 'Fim da volta ' + r, next: items[0] });
        });
      } else if (b.kind === 'circuit') {
        const items = b.items.map(([id, reps]) => [exOf(id), reps]);
        steps.push({ ph: 'prep', name: b.label, secs: PREP, info: b.rounds + ' voltas, sem descanso entre os exercícios', next: items[0][0] });
        for (let r = 1; r <= b.rounds; r++) items.forEach(([ex, reps], k) => {
          const timed = /\bs$/.test(reps);
          steps.push({ ph: 'work', ex, name: ex.n, reps: timed ? null : reps, secs: timed ? parseInt(reps, 10) : null, manual: !timed, info: 'Volta ' + r + ' de ' + b.rounds + ' · ' + (k + 1) + ' de ' + items.length, next: items[k + 1] ? items[k + 1][0] : (r < b.rounds ? items[0][0] : null) });
          if (k === items.length - 1 && r < b.rounds) steps.push({ ph: 'rest', name: 'Descanso entre voltas', secs: b.rr || 60, info: 'Fim da volta ' + r, next: items[0][0] });
        });
      } else if (b.kind === 'sets') {
        b.items.forEach(([id, sets, reps, rest], k) => {
          const ex = exOf(id), timed = /\bs$/.test(reps);
          for (let s = 1; s <= sets; s++) {
            steps.push({ ph: 'work', ex, name: ex.n, reps: timed ? null : (reps === 'máx' ? 'o máximo' : reps), secs: timed ? parseInt(reps, 10) : null, manual: !timed, info: 'Série ' + s + ' de ' + sets + ' · exercício ' + (k + 1) + ' de ' + b.items.length, next: s < sets ? ex : (b.items[k + 1] ? exOf(b.items[k + 1][0]) : null) });
            if (!(s === sets && k === b.items.length - 1)) steps.push({ ph: 'rest', name: 'Descanso', secs: rest || 60, info: s < sets ? 'Próxima série' : 'Próximo exercício', next: s < sets ? ex : exOf(b.items[k + 1][0]) });
          }
        });
      } else if (b.kind === 'amrap') {
        const items = b.items.map(([id, reps]) => [exOf(id), reps]);
        steps.push({ ph: 'prep', name: b.label, secs: PREP, info: b.mins + ' minutos', next: items[0][0] });
        steps.push({ ph: 'amrap', ex: items[0][0], name: 'Máximo de voltas', secs: b.mins * 60, list: items, info: 'Toque em +1 volta ou diga "volta" a cada volta completa' });
      } else if (b.kind === 'ladder') {
        const items = b.items.map(([id, m]) => [exOf(id), m]);
        const rungs = []; for (let r = 1; r <= b.top; r++) rungs.push(r); for (let r = b.top - 1; r >= 1; r--) rungs.push(r);
        steps.push({ ph: 'prep', name: b.label, secs: PREP, info: rungs.length + ' degraus, subindo e descendo', next: items[0][0] });
        rungs.forEach((r, ri) => items.forEach(([ex, m], k) => steps.push({ ph: 'work', ex, name: ex.n, reps: String(r * m), manual: true, info: 'Degrau ' + r + ' (' + (ri + 1) + ' de ' + rungs.length + ')', next: items[k + 1] ? items[k + 1][0] : (rungs[ri + 1] ? items[0][0] : null) })));
      }
    });
    return steps;
  }

  function open(session, meta) {
    if (!session) return;
    P.session = session; P.meta = meta || {}; P.steps = build(session); P.i = 0; P.paused = false; P.start = Date.now(); P.kcal = 0; P.rounds = 0; P.active = 0;
    const el = $('#player'); el.classList.add('open'); el.setAttribute('aria-hidden', 'false');
    el.innerHTML = `<div class="ph-top"><button class="btn sm ghost" id="pl-exit" type="button">Sair</button><span class="tiny mute num" id="pl-step"></span><button class="btn sm ghost" id="pl-hands" type="button">Mãos livres: ${Store.S.settings.handsFree ? 'sim' : 'não'}</button></div>
      <div class="ph-bar"><i id="pl-bar"></i></div>
      <div class="ph-main"><div class="mq" id="pl-mq"></div><span class="phase" id="pl-phase"></span><div class="ex-name" id="pl-name"></div><div class="ex-reps" id="pl-reps"></div><div class="clock" id="pl-clock"></div><div class="info" id="pl-info"></div><div class="tip" id="pl-tip"></div><div class="info" id="pl-next"></div></div>
      <div class="ctrl"><button class="btn" id="pl-prev" type="button">Voltar</button><button class="btn pri" id="pl-main" type="button">Pausar</button><button class="btn" id="pl-skip" type="button">Pular</button></div>`;
    $('#pl-exit').onclick = () => confirmExit();
    $('#pl-prev').onclick = () => go(P.i - 1);
    $('#pl-skip').onclick = () => next();
    $('#pl-main').onclick = () => mainBtn();
    $('#pl-hands').onclick = () => { const s = Store.S.settings; s.handsFree = !s.handsFree; Store.save(); $('#pl-hands').textContent = 'Mãos livres: ' + (s.handsFree ? 'sim' : 'não'); if (s.handsFree) listenLoop(); else UCBridge.stopListen(); };
    Mannequin.show($('#pl-mq'), 'stand');
    UCBridge.keepAwake(true);
    go(0);
    clearInterval(P.iv); P.iv = setInterval(tick, 200);
    if (Store.S.settings.handsFree) setTimeout(listenLoop, 1500);
  }
  function step() { return P.steps[P.i]; }
  function go(i) {
    if (i < 0) i = 0;
    if (i >= P.steps.length) return finish();
    accrue();
    P.i = i; const s = step(); P.paused = false; P.lastSec = null; P.stepStart = Date.now();
    P.left = (s.secs || 0) * 1000; P.end = Date.now() + P.left;
    const v = Mannequin.viewer(); const ex = s.ex || s.next; if (v && ex) v.play(ex.anim);
    const sp = Store.S.settings.voice;
    if (sp) {
      if (s.ph === 'work') UCBridge.speak(s.reps ? s.reps + ' ' + s.name : s.name);
      else if (s.ph === 'rest') UCBridge.speak('Descanso. Depois, ' + (s.next ? s.next.n : 'fim'));
      else if (s.ph === 'prep') UCBridge.speak(s.name + '. Prepare-se.');
      else if (s.ph === 'amrap') UCBridge.speak('Valendo. ' + s.list.map(x => x[1] + ' ' + x[0].n).join(', '));
      else UCBridge.speak(s.name);
    }
    UCBridge.vibrate(s.ph === 'work' || s.ph === 'amrap' ? 220 : 90);
    render();
  }
  function accrue() {
    const s = step(); if (!s || !P.stepStart) return;
    const secs = (Date.now() - P.stepStart) / 1000; if (secs <= 0 || P.paused) return;
    const met = s.ph === 'rest' || s.ph === 'prep' ? 1.8 : (s.ex ? s.ex.met : 4) * (s.ph === 'work' || s.ph === 'amrap' ? 1 : 0.75);
    P.kcal += met * Store.weightNow() * secs / 3600;
    if (s.ph !== 'rest' && s.ph !== 'prep') P.active += secs;
  }
  function tick() {
    const s = step(); if (!s || P.paused) return;
    if (s.manual) { const el = $('#pl-clock'); if (el) el.textContent = fmt(Math.round((Date.now() - P.stepStart) / 1000)); return; }
    const rem = P.end - Date.now(), sec = Math.ceil(rem / 1000);
    if (sec !== P.lastSec) { P.lastSec = sec; const el = $('#pl-clock'); if (el) el.textContent = s.secs >= 100 ? fmt(Math.max(sec, 0)) : Math.max(sec, 0); if (sec > 0 && sec <= 3) UCBridge.vibrate(40); if (s.ph === 'amrap' && sec === 60 && Store.S.settings.voice) UCBridge.speak('Último minuto'); }
    if (rem <= 0) next();
  }
  function fmt(t) { const m = Math.floor(t / 60), s = t % 60; return m + ':' + String(s).padStart(2, '0'); }
  function next() { go(P.i + 1); }
  function mainBtn() {
    const s = step();
    if (P.done) return close();
    if (s.manual) return next();
    if (s.ph === 'amrap' && !P.paused) { P.rounds++; UCBridge.vibrate(60); render(); if (Store.S.settings.voice) UCBridge.speak(P.rounds + (P.rounds > 1 ? ' voltas' : ' volta')); return; }
    togglePause();
  }
  function togglePause() {
    const s = step(); if (s.manual) return;
    if (P.paused) { P.paused = false; P.end = Date.now() + P.left; P.stepStart = Date.now(); }
    else { accrue(); P.paused = true; P.left = Math.max(0, P.end - Date.now()); UCBridge.stopSpeak(); }
    render();
  }
  function render() {
    const s = step(); if (!s) return;
    const pl = $('#player'); pl.className = 'player open ' + (s.ph === 'work' || s.ph === 'amrap' ? 'work' : s.ph === 'rest' ? 'rest' : '');
    const L = { prep: 'Prepare-se', warm: 'Aquecimento', work: 'Exercício', rest: 'Descanso', cool: 'Alongamento', amrap: 'Valendo' };
    $('#pl-phase').textContent = P.paused ? 'Pausado' : L[s.ph];
    $('#pl-name').textContent = s.ph === 'rest' || s.ph === 'prep' ? (s.next ? s.next.n : s.name) : s.name;
    $('#pl-reps').textContent = s.reps ? s.reps + (/^\d+$/.test(s.reps) ? ' repetições' : '') : (s.ph === 'rest' || s.ph === 'prep' ? 'a seguir' : '');
    $('#pl-clock').textContent = s.manual ? fmt(0) : (s.secs >= 100 ? fmt(Math.ceil(P.left / 1000)) : Math.ceil(P.left / 1000));
    $('#pl-info').innerHTML = esc(s.info || '') + (s.ph === 'amrap' ? ' · <b class="num">' + P.rounds + '</b> voltas' : '');
    $('#pl-tip').innerHTML = s.ph === 'amrap' ? '<div class="amrap-list">' + s.list.map(x => '<span>' + esc(x[1]) + ' · ' + esc(x[0].n) + '</span>').join('') + '</div>' : esc(s.ex && (s.ph === 'work' || s.ph === 'warm' || s.ph === 'cool') ? s.ex.how : '');
    $('#pl-next').textContent = s.ph === 'work' && s.next ? 'Depois: ' + s.next.n : '';
    $('#pl-step').textContent = (P.i + 1) + ' / ' + P.steps.length;
    $('#pl-bar').style.width = (P.i / P.steps.length * 100) + '%';
    const mb = $('#pl-main');
    mb.textContent = s.manual ? 'Feito' : s.ph === 'amrap' && !P.paused ? '+1 volta' : P.paused ? 'Continuar' : 'Pausar';
    $('#pl-skip').textContent = s.ph === 'amrap' ? 'Encerrar' : 'Pular';
  }
  function finish() {
    accrue(); clearInterval(P.iv); P.done = true;
    const mins = Math.max(1, Math.round((Date.now() - P.start) / 60000));
    const kcal = Math.round(P.kcal);
    const S = Store.S, d = Store.day();
    const rec = { t: Date.now(), d: Store.dkey(), id: P.session.id, name: P.session.name, mins, kcal, rounds: P.rounds || null };
    S.history.unshift(rec); S.history = S.history.slice(0, 400);
    d.workouts.push(rec); d.kcalOut = (d.kcalOut || 0) + kcal;
    if (P.meta.p28) S.p28.done[P.meta.p28] = Store.dkey();
    if (P.meta.aranha) S.aranha.done[Store.dkey()] = P.session.id;
    if (P.meta.jaw) { S.jaw.log[Store.dkey()] = true; d.jaw = true; }
    Store.save();
    UCBridge.stopListen();
    if (S.settings.voice) UCBridge.speak('Treino concluído. ' + mins + ' minutos e cerca de ' + kcal + ' calorias.');
    const pl = $('#player'); pl.className = 'player open';
    pl.querySelector('.ph-main').innerHTML = `<span class="phase">Concluído</span><div class="ex-name">${esc(P.session.name)}</div><div class="grid3" style="width:100%;max-width:420px"><div class="tile"><span class="lbl">Tempo</span><span class="v">${mins} min</span></div><div class="tile"><span class="lbl">Gasto</span><span class="v">${kcal} kcal</span></div><div class="tile"><span class="lbl">${P.rounds ? 'Voltas' : 'Etapas'}</span><span class="v">${P.rounds || P.steps.length}</span></div></div><p class="tiny mute">Gasto estimado por MET (Compêndio de Atividades Físicas) e o seu peso.</p>`;
    pl.querySelector('.ctrl').innerHTML = '<span></span><button class="btn pri" id="pl-close" type="button">Fechar</button><span></span>';
    $('#pl-close').onclick = close;
    if (window.App) App.refresh();
  }
  function confirmExit() {
    if (P.done || P.i < 2) return close();
    App.sheet(`<h2>Sair do treino?</h2><p class="mute">Você está na etapa ${P.i + 1} de ${P.steps.length}.</p><div class="grid2"><button class="btn" type="button" id="x-save">Salvar e sair</button><button class="btn danger" type="button" id="x-drop">Descartar</button></div><button class="btn ghost block" type="button" data-close>Continuar treinando</button>`);
    $('#x-save').onclick = () => { App.closeSheet(); finish(); };
    $('#x-drop').onclick = () => { App.closeSheet(); close(); };
  }
  function close() {
    clearInterval(P.iv); P.done = false; UCBridge.stopListen(); UCBridge.stopSpeak(); UCBridge.keepAwake(false);
    const el = $('#player'); el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); el.innerHTML = '';
    if (window.App) App.refresh();
  }
  function isOpen() { return $('#player').classList.contains('open'); }
  function command(cmd) {
    if (!isOpen() || P.done) return false;
    const s = step();
    if (cmd === 'pause') { if (!P.paused && !s.manual) togglePause(); }
    else if (cmd === 'resume' || cmd === 'start') { if (P.paused) togglePause(); }
    else if (cmd === 'next' || cmd === 'done') next();
    else if (cmd === 'prev') go(P.i - 1);
    else if (cmd === 'round') { if (s.ph === 'amrap') mainBtn(); else next(); }
    else if (cmd === 'stop') finish();
    return true;
  }
  // escuta contínua enquanto o player estiver aberto
  function listenLoop() {
    if (!isOpen() || !Store.S.settings.handsFree || P.done) return;
    UCBridge.listen();
  }
  UCBridge.on('voice', ev => {
    if (!isOpen()) return;
    if (ev.type === 'final') { const a = Voice.parse(ev.text)[0]; if (a && a.type === 'control') { command(a.cmd); App.toast('“' + ev.text + '”'); } }
    if ((ev.type === 'end' || ev.type === 'error') && Store.S.settings.handsFree) setTimeout(listenLoop, 900);
  });
  window.Player = { open, close, command, isOpen, build };
})();
