/* Player guiado: timer, repetições, AMRAP, escada, voz e boneco 3D. */
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const PREP = 10;
  const P = { steps: [], i: 0, end: 0, left: 0, paused: false, iv: null, session: null, meta: null, start: 0, kcal: 0, rounds: 0, lastSec: null, active: 0, stepStart: 0 };

  function exOf(id) { const S = Store.S; return EXDB.resolve(id, S.calis ? [] : (S.eq || []), { lim: S.lim || [] }) || EXDB.X[id]; }
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

  // ---------- frases da treinadora ----------
  const CHEER = ['Isso, continua assim.', 'Respira e mantém o ritmo.', 'Boa, você está indo bem.', 'Firme, sem perder a postura.', 'Só mais um pouco.', 'Capricha na técnica.', 'Tá ficando bonito, continua.'];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const WARM = ['Isso, solta o corpo. Continua.', 'Vai esquentando, sem pressa.', 'Boa, mantém o movimento.', 'Respira fundo e continua.'];
  const COOL = ['Respira devagar e solta.', 'Sem forçar, só sente alongar.', 'Relaxa os ombros. Isso.'];
  const NUMS = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove', 'vinte'];
  // fala e devolve quanto tempo (ms) a frase deve levar, para a contagem não atropelar a explicação
  const say = t => { if (Store.S.settings.voice) UCBridge.speak(t); return Store.S.settings.voice ? Math.round(String(t).length / 13.5 * 1000 / (+(Store.S.settings.vRate || 1))) : 0; };
  const sayNum = n => n <= 20 ? NUMS[n] : String(n);
  function tempo(ex) { if (!ex) return 2.5; if (ex.pat === 'cardio') return 1.3; if (ex.pat === 'mob' || ex.pat === 'face') return 2.5; if (ex.pat === 'core') return 2.4; return 2.7; }
  function repTarget(reps) { if (!reps) return null; const m = String(reps).match(/^(\d+)(\s*por lado)?/); if (!m) return null; return { n: +m[1] * (m[2] ? 2 : 1), sides: !!m[2], per: +m[1] }; }
  // duração prevista de cada etapa (s): tempo da etapa, ou repetições × ritmo da treinadora
  function stepSecs(x) { return x.secs || (x.reps ? (repTarget(x.reps) ? repTarget(x.reps).n * tempo(x.ex) + 3 : 40) : 0); }
  function stepMet(x) { return x.ph === 'rest' || x.ph === 'prep' ? Energy.REST : x.ph === 'amrap' ? Energy.CIRCUIT : Energy.met(x.ex); }
  // estimativa antes de treinar: soma etapa por etapa (Compêndio 2024, MET corrigido pelo seu gasto basal)
  function estimate(session) {
    const steps = build(session); let secs = 0, gross = 0, net = 0;
    steps.forEach(x => { const t = stepSecs(x); secs += t; const k = Energy.kcal(stepMet(x), t / 60); gross += k.gross; net += k.net; });
    return { mins: Math.max(1, Math.round(secs / 60)), kcal: Math.round(gross), net: Math.round(net) };
  }
  function sessionMinutes(steps) { let t = 0; steps.forEach(x => { t += x.secs || (x.reps ? (repTarget(x.reps) ? repTarget(x.reps).n * tempo(x.ex) : 45) : 0); }); return Math.max(1, Math.round(t / 60)); }

  // ---------- abertura: apresenta o treino e espera o play ----------
  function open(session, meta, opts) {
    if (!session) return;
    opts = opts || {};
    P.session = session; P.meta = meta || {}; P.steps = build(session); P.i = -1; P.paused = false; P.done = false; P.kcal = 0; P.net = 0; P.rounds = 0; P.active = 0; P.started = false; P.auto = !!opts.auto; P.told = {};
    const el = $('#player'); el.classList.add('open'); el.setAttribute('aria-hidden', 'false');
    if (P.auto) { UCBridge.keepAwake(true); startRun(); if (Store.S.settings.handsFree) setTimeout(listenLoop, 4000); return; }
    const blocks = session.blocks.map(b => {
      const items = (b.items || []).map(x => Array.isArray(x) ? x : [x]);
      let info = b.kind === 'list' ? b.secs + ' s cada' : b.kind === 'timed' ? (b.rounds + (b.rounds > 1 ? ' voltas' : ' volta') + ' · ' + b.work + ' s cada') : b.kind === 'circuit' ? b.rounds + ' voltas' : b.kind === 'amrap' ? b.mins + ' minutos, o máximo de voltas' : b.kind === 'ladder' ? 'de 1 até ' + b.top + ' e volta' : 'séries';
      const rows = items.map(([id, a, c]) => { const ex = exOf(id); const r = b.kind === 'sets' ? a + ' × ' + c : b.kind === 'circuit' || b.kind === 'amrap' ? a : b.kind === 'ladder' ? a + '× o degrau' : ''; return `<div class="row between small" style="padding:6px 0;border-bottom:1px solid var(--line)"><span>${esc(ex.n)}</span><span class="mute num">${esc(r)}</span></div>`; }).join('');
      return `<div class="stack" style="gap:2px"><div class="row between"><b class="small">${esc(b.label)}</b><span class="tiny mute">${esc(info)}</span></div>${rows}</div>`;
    }).join('');
    const mins = sessionMinutes(P.steps), n = new Set(P.steps.filter(x => x.ex).map(x => x.ex.id)).size, est = estimate(session);
    el.className = 'player open';
    el.innerHTML = `<div class="ph-top"><button class="btn sm ghost" id="pl-exit" type="button"><svg viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M15 6l-6 6 6 6"/></svg>Voltar</button><span class="tiny mute">Treino guiado</span><button class="btn sm ghost" id="pl-voice" type="button">${Store.S.settings.voice ? 'Voz ligada' : 'Voz desligada'}</button></div>
      <div class="intro"><div class="mq" id="pl-mq" style="max-height:26vh;width:min(100%,26vh);align-self:center"></div><span class="lbl">Hoje</span><h1>${esc(session.name)}</h1>${session.short ? `<p class="small ink2">${esc(session.short)}</p>` : ''}
        <div class="grid3"><div class="tile"><span class="lbl">Tempo</span><span class="v">~${mins} min</span></div><div class="tile"><span class="lbl">Exercícios</span><span class="v">${n}</span></div><div class="tile"><span class="lbl">Gasto</span><span class="v">~${est.kcal}</span><span class="tiny mute">kcal</span></div></div>
        <div class="card tight">${blocks}</div>
        <p class="tiny mute">A treinadora fala cada exercício, conta as repetições e avisa o tempo. Diga “pausa”, “continua”, “próximo” ou “feito” a qualquer momento.</p></div>
      <div class="ctrl intro-ctrl"><button class="btn pri play" id="pl-play" type="button" aria-label="Começar o treino"><svg viewBox="0 0 24 24" style="width:30px;height:30px"><path d="M8 5l11 7-11 7z" fill="currentColor"/></svg><span>Começar</span></button></div>`;
    $('#pl-exit').onclick = close;
    $('#pl-voice').onclick = () => { const st = Store.S.settings; st.voice = !st.voice; Store.save(); $('#pl-voice').textContent = st.voice ? 'Voz ligada' : 'Voz desligada'; if (!st.voice) UCBridge.stopSpeak(); };
    $('#pl-play').onclick = startRun;
    const first = P.steps.find(x => x.ex);
    Mannequin.show($('#pl-mq'), first ? first.ex.anim : 'stand');
    UCBridge.keepAwake(true);
    const list = Array.from(new Set(P.steps.filter(x => x.ph === 'work' || x.ph === 'amrap').map(x => x.ex.n))).slice(0, 6);
    say('Oi! Hoje é ' + session.name + '. Cerca de ' + mins + ' minutos' + (list.length ? ', com ' + list.join(', ') : '') + '. Quando estiver pronto, aperta o play que eu vou te guiando.');
    if (Store.S.settings.handsFree) setTimeout(listenLoop, 2500);
  }
  function startRun() {
    if (P.started) return;
    P.started = true; P.start = Date.now();
    const el = $('#player');
    el.innerHTML = `<div class="ph-top"><button class="btn sm ghost" id="pl-exit" type="button"><svg viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M15 6l-6 6 6 6"/></svg>Sair</button><span class="tiny mute num" id="pl-step"></span><button class="btn sm ghost" id="pl-hands" type="button">Mãos livres: ${Store.S.settings.handsFree ? 'sim' : 'não'}</button></div>
      <div class="ph-bar"><i id="pl-bar"></i></div>
      <div class="ph-main"><div class="mq" id="pl-mq"></div><span class="phase" id="pl-phase"></span><div class="ex-name" id="pl-name"></div><div class="ex-reps" id="pl-reps"></div><div class="clock" id="pl-clock"></div><div class="info" id="pl-info"></div><div class="tip" id="pl-tip"></div><div class="info" id="pl-next"></div></div>
      <div class="ctrl"><button class="btn" id="pl-prev" type="button">Voltar</button><button class="btn pri" id="pl-main" type="button">Pausar</button><button class="btn" id="pl-skip" type="button">Pular</button></div>`;
    $('#pl-exit').onclick = () => confirmExit();
    $('#pl-prev').onclick = () => go(P.i - 1);
    $('#pl-skip').onclick = () => next();
    $('#pl-main').onclick = () => mainBtn();
    $('#pl-hands').onclick = () => { const st = Store.S.settings; st.handsFree = !st.handsFree; Store.save(); $('#pl-hands').textContent = 'Mãos livres: ' + (st.handsFree ? 'sim' : 'não'); if (st.handsFree) listenLoop(); else UCBridge.stopListen(); };
    Mannequin.show($('#pl-mq'), 'stand');
    go(0);
    clearInterval(P.iv); P.iv = setInterval(tick, 150);
  }
  function step() { return P.steps[P.i]; }
  function go(i) {
    if (i < 0) i = 0;
    if (i >= P.steps.length) return finish();
    accrue();
    P.i = i; const s = step(); P.paused = false; P.lastSec = null; P.stepStart = Date.now(); P.cues = {};
    P.left = (s.secs || 0) * 1000; P.end = Date.now() + P.left;
    const rt = s.manual ? repTarget(s.reps) : null;
    P.count = rt ? { target: rt.n, sides: rt.sides, per: rt.per, done: 0, tempo: tempo(s.ex), nextAt: Date.now() + 3200 } : null;
    const v = Mannequin.viewer(); const ex = s.ex || s.next; if (v && ex) v.play(ex.anim);
    const how = s.ex && !P.told[s.ex.id] && s.ex.how ? ' ' + s.ex.how : ''; if (s.ex) P.told[s.ex.id] = 1;
    if (i === 0 && s.ph === 'prep' && P.auto) say('Vamos começar! Se prepara: em ' + s.secs + ' segundos, ' + (/aquec/i.test(s.name) ? 'vamos pelo aquecimento' : 'vamos para ' + s.name.toLowerCase()) + '. Primeiro, ' + (s.next ? s.next.n : '') + '.');
    else if (s.ph === 'warm') say((P.steps[i - 1] && P.steps[i - 1].ph === 'warm' ? 'Agora, ' : 'Bora, aquecendo. ') + s.name + ', ' + s.secs + ' segundos.' + how);
    else if (s.ph === 'cool') say((P.steps[i - 1] && P.steps[i - 1].ph === 'cool' ? 'Agora, ' : 'Hora de alongar. ') + s.name + ', ' + s.secs + ' segundos.' + how);
    else if (s.ph === 'work' && rt) { const ms = say(s.name + '. ' + (rt.sides ? rt.per + ' de cada lado' : rt.n + ' repetições') + '.' + how + ' Comigo, no meu ritmo. Já!'); P.count.nextAt = Date.now() + Math.max(3200, ms + 500); }
    else if (s.ph === 'work' && s.manual) say(s.name + ', ' + (s.reps === 'o máximo' ? 'o máximo que conseguir com boa técnica. Aperta feito quando terminar.' : s.reps + '. Aperta feito quando terminar.'));
    else if (s.ph === 'work') say('Vamos lá. ' + s.name + ', ' + s.secs + ' segundos.' + how);
    else if (s.ph === 'rest') say('Descanso de ' + s.secs + ' segundos. Respira. Depois vem ' + (s.next ? s.next.n : 'o fim') + '.');
    else if (s.ph === 'prep') say(s.name + '. Prepara aí, ' + s.secs + ' segundos. Primeiro, ' + (s.next ? s.next.n : '') + '.');
    else if (s.ph === 'amrap') say('Valendo! ' + Math.round(s.secs / 60) + ' minutos. ' + s.list.map(x => x[1] + ' ' + x[0].n).join(', ') + '. A cada volta, aperta mais uma volta.');
    else say(s.name + ', ' + s.secs + ' segundos.');
    UCBridge.vibrate(s.ph === 'work' || s.ph === 'amrap' ? 220 : 90);
    render();
  }
  function accrue() {
    const s = step(); if (!s || !P.stepStart || P.paused) return;
    const secs = (Date.now() - P.stepStart) / 1000; if (secs <= 0) return;
    const k = Energy.kcal(stepMet(s), secs / 60);
    P.kcal += k.gross; P.net = (P.net || 0) + k.net;
    if (s.ph !== 'rest' && s.ph !== 'prep') P.active += secs;
    P.stepStart = Date.now();
  }
  function tick() {
    const s = step(); if (!s || P.paused || !P.started || P.done) return;
    const now = Date.now();
    if (s.manual) {
      const el = $('#pl-clock');
      if (P.count) {
        const c = P.count;
        if (now >= c.nextAt && c.done < c.target) {
          c.done++; c.nextAt = now + c.tempo * 1000;
          if (c.sides && c.done === c.per + 1) say('Troca de lado. ' + sayNum(1));
          else if (c.done === c.target) say(sayNum(c.done) + '. Boa!');
          else say(sayNum(c.sides && c.done > c.per ? c.done - c.per : c.done));
          UCBridge.vibrate(25); render();
          if (c.done === c.target) setTimeout(() => { if (step() === s && !P.paused) next(); }, 1400);
        }
        if (el) el.textContent = c.done + '/' + c.target;
      } else if (el) el.textContent = fmt(Math.round((now - P.stepStart) / 1000));
      return;
    }
    const rem = P.end - now, sec = Math.ceil(rem / 1000), total = s.secs || 0;
    if (sec !== P.lastSec) {
      P.lastSec = sec;
      const el = $('#pl-clock'); if (el) el.textContent = total >= 100 ? fmt(Math.max(sec, 0)) : Math.max(sec, 0);
      if (s.ph === 'work' || s.ph === 'amrap') {
        if (total >= 30 && sec === Math.round(total / 2) && !P.cues.half) { P.cues.half = 1; say(s.ph === 'amrap' ? 'Metade do tempo. ' + P.rounds + ' voltas até agora.' : 'Metade. ' + pick(CHEER)); }
        else if (total >= 20 && sec === 10 && !P.cues.ten) { P.cues.ten = 1; say('Faltam dez segundos.'); }
        else if (s.ph === 'amrap' && sec === 60 && total > 120 && !P.cues.min) { P.cues.min = 1; say('Último minuto, acelera!'); }
        else if (sec === 3 && !P.cues.three) { P.cues.three = 1; say('Três, dois, um.'); }
      } else if (s.ph === 'warm' || s.ph === 'cool') {
        if (total >= 20 && sec === Math.round(total / 2) && !P.cues.half) { P.cues.half = 1; say(pick(s.ph === 'warm' ? WARM : COOL)); }
        else if (sec === 3 && !P.cues.three && P.steps[P.i + 1] && P.steps[P.i + 1].ph === s.ph) { P.cues.three = 1; say('Três, dois, um, troca.'); }
      } else if ((s.ph === 'rest' || s.ph === 'prep') && sec === 3 && !P.cues.three) { P.cues.three = 1; say(s.ph === 'prep' ? 'Três, dois, um, já!' : 'Prepara. Três, dois, um.'); }
      if (sec > 0 && sec <= 3) UCBridge.vibrate(40);
    }
    if (rem <= 0) next();
  }
  function fmt(t) { const m = Math.floor(t / 60), s = t % 60; return m + ':' + String(s).padStart(2, '0'); }
  function next() { go(P.i + 1); }
  function mainBtn() {
    const s = step();
    if (P.done) return close();
    if (s.manual) { if (P.count && P.paused) return togglePause(); return next(); }
    if (s.ph === 'amrap' && !P.paused) { P.rounds++; UCBridge.vibrate(60); render(); say(P.rounds + (P.rounds > 1 ? ' voltas.' : ' volta.') + ' ' + pick(CHEER)); return; }
    togglePause();
  }
  function togglePause() {
    const s = step();
    if (P.paused) { P.paused = false; P.end = Date.now() + P.left; P.stepStart = Date.now(); if (P.count) P.count.nextAt = Date.now() + 1500; say('Continuando.'); }
    else { accrue(); P.paused = true; P.left = Math.max(0, P.end - Date.now()); UCBridge.stopSpeak(); say('Pausado.'); }
    render();
  }
  function render() {
    const s = step(); if (!s || !$('#pl-phase')) return;
    const pl = $('#player'); pl.className = 'player open ' + (s.ph === 'work' || s.ph === 'amrap' ? 'work' : s.ph === 'rest' ? 'rest' : '');
    const L = { prep: 'Prepare-se', warm: 'Aquecimento', work: 'Exercício', rest: 'Descanso', cool: 'Alongamento', amrap: 'Valendo' };
    $('#pl-phase').textContent = P.paused ? 'Pausado' : L[s.ph];
    $('#pl-name').textContent = s.ph === 'rest' || s.ph === 'prep' ? (s.next ? s.next.n : s.name) : s.name;
    $('#pl-reps').textContent = P.count ? (P.count.sides ? P.count.per + ' de cada lado' : P.count.target + ' repetições') : s.reps ? s.reps + (/^\d+$/.test(s.reps) ? ' repetições' : '') : (s.ph === 'rest' || s.ph === 'prep' ? 'a seguir' : '');
    $('#pl-clock').textContent = P.count ? P.count.done + '/' + P.count.target : s.manual ? fmt(0) : (s.secs >= 100 ? fmt(Math.ceil(P.left / 1000)) : Math.ceil(P.left / 1000));
    $('#pl-info').innerHTML = esc(s.info || '') + (s.ph === 'amrap' ? ' · <b class="num">' + P.rounds + '</b> voltas' : '');
    $('#pl-tip').innerHTML = s.ph === 'amrap' ? '<div class="amrap-list">' + s.list.map(x => '<span>' + esc(x[1]) + ' · ' + esc(x[0].n) + '</span>').join('') + '</div>' : esc(s.ex && (s.ph === 'work' || s.ph === 'warm' || s.ph === 'cool') ? s.ex.how : '');
    $('#pl-next').textContent = s.ph === 'work' && s.next ? 'Depois: ' + s.next.n : '';
    $('#pl-step').textContent = (P.i + 1) + ' / ' + P.steps.length;
    $('#pl-bar').style.width = (P.i / P.steps.length * 100) + '%';
    $('#pl-main').textContent = P.paused ? 'Continuar' : s.manual ? (P.count ? 'Terminei' : 'Feito') : s.ph === 'amrap' ? '+1 volta' : 'Pausar';
    $('#pl-skip').textContent = s.ph === 'amrap' ? 'Encerrar' : 'Pular';
  }
  function finish() {
    accrue(); clearInterval(P.iv); P.done = true;
    const mins = Math.max(1, Math.round((Date.now() - (P.start || Date.now())) / 60000));
    const kcal = Math.round(P.kcal), net = Math.round(P.net || 0);
    const S = Store.S, d = Store.day(), k = Store.dkey();
    const rec = { t: Date.now(), d: k, id: P.session.id, name: P.session.name, mins, kcal, net, rounds: P.rounds || null };
    S.history.unshift(rec); S.history = S.history.slice(0, 400);
    d.workouts.push(rec); d.kcalOut = (d.kcalOut || 0) + kcal; d.kcalNet = (d.kcalNet || 0) + net;
    if (P.meta.p28) S.p28.done[P.meta.p28] = k;
    if (P.meta.aranha) S.aranha.done[k] = P.session.id;
    if (P.meta.jaw) { S.jaw.log[k] = true; d.jaw = true; }
    if (P.meta.cal) S.cal.done[k] = P.meta.cal;
    if (P.meta.hal) S.hal.done[k] = P.meta.hal;
    Store.save();
    UCBridge.stopListen();
    say('Acabou! Mandou muito bem. Foram ' + mins + ' minutos e cerca de ' + kcal + ' calorias. Agora bebe uma água.');
    const pl = $('#player'); pl.className = 'player open';
    const main = pl.querySelector('.ph-main') || pl;
    main.innerHTML = `<span class="phase">Concluído</span><div class="ex-name">${esc(P.session.name)}</div><div class="grid3" style="width:100%;max-width:420px"><div class="tile"><span class="lbl">Tempo</span><span class="v">${mins} min</span></div><div class="tile"><span class="lbl">Gasto</span><span class="v">${kcal} kcal</span></div><div class="tile"><span class="lbl">${P.rounds ? 'Voltas' : 'Etapas'}</span><span class="v">${P.rounds || P.steps.length}</span></div></div><p class="tiny mute">${net} kcal acima do que você gastaria parado. Estimativa pelo Compêndio de Atividades Físicas 2024, com o MET corrigido pelo seu gasto basal.</p>`;
    const ctrl = pl.querySelector('.ctrl'); if (ctrl) ctrl.innerHTML = '<span></span><button class="btn pri" id="pl-close" type="button">Fechar</button><span></span>';
    $('#pl-close').onclick = close;
    if (window.App) App.refresh();
  }
  function confirmExit() {
    if (P.done || !P.started || P.i < 2) return close();
    App.sheet(`<h2>Sair do treino?</h2><p class="mute">Você está na etapa ${P.i + 1} de ${P.steps.length}.</p><div class="grid2"><button class="btn" type="button" id="x-save">Salvar e sair</button><button class="btn danger" type="button" id="x-drop">Descartar</button></div><button class="btn ghost block" type="button" data-close>Continuar treinando</button>`);
    $('#x-save').onclick = () => { App.closeSheet(); finish(); };
    $('#x-drop').onclick = () => { App.closeSheet(); close(); };
  }
  function close() {
    clearInterval(P.iv); P.done = false; P.started = false; UCBridge.stopListen(); UCBridge.stopSpeak(); UCBridge.keepAwake(false);
    const el = $('#player'); el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); el.innerHTML = '';
    if (window.App) App.refresh();
  }
  function isOpen() { return $('#player').classList.contains('open'); }
  function back() { if (!P.started || P.done) return close(); if (!P.paused) togglePause(); confirmExit(); }
  function command(cmd) {
    if (!isOpen() || P.done) return false;
    if (!P.started) { if (cmd === 'start' || cmd === 'resume' || cmd === 'next') startRun(); else if (cmd === 'stop') close(); return true; }
    const s = step();
    if (cmd === 'pause') { if (!P.paused) togglePause(); }
    else if (cmd === 'resume' || cmd === 'start') { if (P.paused) togglePause(); }
    else if (cmd === 'next' || cmd === 'done') next();
    else if (cmd === 'prev') go(P.i - 1);
    else if (cmd === 'round') { if (s.ph === 'amrap') mainBtn(); else next(); }
    else if (cmd === 'stop') finish();
    return true;
  }
  function listenLoop() {
    if (!isOpen() || !Store.S.settings.handsFree || P.done) return;
    UCBridge.listen();
  }
  UCBridge.on('voice', ev => {
    if (!isOpen()) return;
    if (ev.type === 'final') { const a = Voice.parse(ev.text)[0]; if (a && a.type === 'control') { command(a.cmd); App.toast('“' + ev.text + '”'); } else if (/\b(play|comecar|começar|bora|vamos)\b/i.test(ev.text) && !P.started) startRun(); }
    if ((ev.type === 'end' || ev.type === 'error') && Store.S.settings.handsFree) setTimeout(listenLoop, 900);
  });
  window.Player = { open, close, command, isOpen, build, startRun, back, estimate };
})();
