/* Uncrowned · UncrownedLabs · por Vinicius Andrade */
(function () {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmt = (n, d) => (n == null || isNaN(n) ? '–' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: 0 }));
  const S = () => Store.S;
  const MEALS = [['cafe', 'Café da manhã'], ['almoco', 'Almoço'], ['lanche', 'Lanche'], ['jantar', 'Jantar'], ['ceia', 'Ceia']];
  const MEAL_NAME = Object.fromEntries(MEALS);
  const WEEKD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const App = { tab: 'hoje', sub: { treino: 'programas' }, foodDate: null };
  window.App = App;

  // ---------- utilitários de interface ----------
  App.toast = (t, ms) => { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(App._tt); App._tt = setTimeout(() => el.classList.remove('show'), ms || 2200); };
  // Janelas de baixo (sheets). App.sheet abre do zero; App.pushSheet abre por cima e o "Voltar" retorna à anterior.
  App._sheetStack = [];
  App.sheet = html => { App._sheetStack = []; showSheet(html); };
  App.pushSheet = (html, restore) => { const s = $('#sheet'); if (s.classList.contains('open')) App._sheetStack.push({ html: $('#sheet-content').innerHTML, restore, top: $('#sheet .sheet-body').scrollTop }); showSheet(html); };
  function showSheet(html) { $('#sheet-content').innerHTML = html; const s = $('#sheet'); s.classList.add('open'); s.setAttribute('aria-hidden', 'false'); $('#sheet .sheet-body').scrollTop = 0; }
  App.closeSheet = () => { App._sheetStack = []; const s = $('#sheet'); s.classList.remove('open'); s.setAttribute('aria-hidden', 'true'); $('#sheet-content').innerHTML = ''; if (App._sheetClose) { const f = App._sheetClose; App._sheetClose = null; f(); } };
  App.sheetBack = () => {
    const prev = App._sheetStack.pop();
    if (!prev) return App.closeSheet();
    $('#sheet-content').innerHTML = prev.html; $('#sheet .sheet-body').scrollTop = prev.top || 0;
    if (prev.restore) prev.restore(); else thumbs();
  };
  function ring(val, max, size, label, sub) {
    const r = (size - 14) / 2, c = 2 * Math.PI * r, pct = max ? Math.min(1, val / max) : 0, over = max && val > max;
    return `<div class="ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="#1d1d1d" stroke-width="10" fill="none"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" style="stroke:${over ? 'var(--bad)' : 'var(--green)'}" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="${c * pct} ${c}" ${pct ? '' : 'opacity="0"'}/></svg><div class="c"><b class="num" style="font-size:${size > 120 ? 1.7 : 1.1}rem;letter-spacing:-.02em">${label}</b><span class="tiny mute">${sub || ''}</span></div></div>`;
  }
  function bar(v, max) { const p = max ? Math.min(100, v / max * 100) : 0; return `<div class="bar${max && v > max * 1.05 ? ' over' : ''}"><i style="width:${p}%"></i></div>`; }
  const dateLabel = k => { const d = new Date(k + 'T12:00:00'); const t = Store.dkey(); const y = new Date(); y.setDate(y.getDate() - 1); if (k === t) return 'Hoje'; if (k === Store.dkey(y)) return 'Ontem'; return WEEKD[d.getDay()] + ', ' + d.getDate() + '/' + String(d.getMonth() + 1).padStart(2, '0'); };
  const shift = (k, n) => { const d = new Date(k + 'T12:00:00'); d.setDate(d.getDate() + n); return Store.dkey(d); };
  const greet = () => { const h = new Date().getHours(); return h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };

  // ---------- tema de cor (fundo sempre preto; padrão = branco e cinza) ----------
  const THEMES = [['padrao', 'Padrão', '#f4f4f4'], ['lilas', 'Lilás', '#c4a3ff'], ['rosa', 'Rosa', '#ff8fc8'], ['verde', 'Verde', '#4ef08a'], ['azul', 'Azul', '#7cc6ff'], ['vermelho', 'Vermelho', '#ff5f5f'], ['dourado', 'Dourado', '#f2c45a']];
  App.applyTheme = () => { const t = (S().settings && S().settings.theme) || 'padrao'; if (t === 'padrao') delete document.body.dataset.theme; else document.body.dataset.theme = t; };
  App.accent = () => getComputedStyle(document.body).getPropertyValue('--green').trim() || '#4ef08a';

  // ---------- navegação ----------
  App.hist = [];
  const snap = () => ({ tab: App.tab, sub: App.sub.treino, prog: App.progOpen || null, y: $('#view').scrollTop });
  App.remember = () => { const c = snap(), l = App.hist[App.hist.length - 1]; if (!l || l.tab !== c.tab || l.sub !== c.sub || l.prog !== c.prog) App.hist.push(c); if (App.hist.length > 12) App.hist.shift(); };
  App.go = (tab, sub) => { if (tab !== App.tab || (sub && sub !== App.sub[tab])) App.remember(); App.tab = tab; if (sub) App.sub[tab] = sub; if (tab === 'treino' && sub) App.progOpen = null; App.render(); $('#view').scrollTop = 0; };
  App.goBack = () => {
    const h = App.hist.pop(); if (!h) return false;
    App.tab = h.tab; App.sub.treino = h.sub; App.progOpen = h.prog; App.render(); $('#view').scrollTop = h.y || 0; return true;
  };
  App.render = () => {
    $$('#tabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === App.tab));
    $('#btn-back').hidden = !App.hist.length;
    if (Bike.R.map && App.tab !== 'bike') { try { Bike.R.map.remove(); } catch (e) {} Bike.R.map = null; Bike.R.dot = null; Bike.R.line = null; }
    const v = $('#view');
    document.body.classList.toggle('onb', !S().profile);
    if (!S().profile) { v.innerHTML = onboarding(); bindOnboarding(); return; }
    const views = { hoje: vHoje, treino: vTreino, comida: vComida, bike: vBike, perfil: vPerfil };
    v.innerHTML = (views[App.tab] || vHoje)();
    after();
  };
  App.refresh = () => { if (!$('#sheet').classList.contains('open')) App.render(); };
  function after() {
    if (App.tab === 'bike') { const m = $('#bk-map'); if (m) Bike.attachLive(m); Bike.updateStats(); }
    if ($$('#view [data-thumb]').length) thumbs();
    if (App.tab === 'treino' && App.sub.treino === 'progresso') { /* gráfico já é SVG */ }
  }

  // ---------- onboarding ----------
  // 0 boas-vindas · 1 sobre você · 2 objetivo · 3 rotina e equipamento · 4 revisão e confirmação
  const OB0 = () => ({ step: 0, d: { sex: 'm', activity: 'leve', goal: 'perder', pace: 'normal', eq: [], level: 1 }, err: {} });
  let ob = OB0();
  const OB_STEPS = 4;
  function obAge(b) { if (!b) return null; const a = Store.age(b); return isNaN(a) ? null : a; }
  function obValidate() {
    const d = ob.d, e = {};
    if (!d.name || d.name.trim().length < 2) e.name = 'Digite seu nome';
    const a = obAge(d.birth);
    if (!d.birth) e.birth = 'Informe a data de nascimento'; else if (a < 14 || a > 90) e.birth = 'Confira a data: deu ' + a + ' anos';
    if (!(d.height >= 120 && d.height <= 230)) e.height = 'Altura em centímetros, ex.: 174';
    if (!(d.weight >= 35 && d.weight <= 300)) e.weight = 'Peso em quilos, ex.: 90';
    ob.err = e; return !Object.keys(e).length;
  }
  function obRead() {
    const v = id => { const el = $(id); return el ? el.value : null; };
    if ($('#ob-name')) { const d = ob.d; d.name = v('#ob-name').trim(); d.birth = v('#ob-birth'); d.height = parseFloat(String(v('#ob-h')).replace(',', '.')); d.weight = parseFloat(String(v('#ob-w')).replace(',', '.')); }
  }
  const obErr = k => ob.err[k] ? `<span class="ferr">${esc(ob.err[k])}</span>` : '';
  const obSeg = (id, key, opts) => `<div class="seg" id="${id}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" class="${String(ob.d[key]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  function onboarding() {
    const d = ob.d, st = ob.step;
    if (st === 0) return `<div class="ob ob-welcome"><div class="ob-hero"><img src="img/logo.png" alt="" width="96" height="113"><span class="lbl">UncrownedLabs</span><h1>Uncrowned Train</h1><p class="ink2">Treino, comida, água, sono, rosto e bike num lugar só. Leva uns 2 minutos para configurar.</p></div>
      <ul class="ob-list"><li><b>Metas calculadas para você</b><span>Calorias, proteína e água a partir do seu corpo e objetivo</span></li><li><b>Fale em vez de digitar</b><span>“Comi 2 ovos e dormi 7 horas” e está anotado</span></li><li><b>Treinos que se adaptam</b><span>Com ou sem equipamento, no seu nível</span></li></ul>
      <div class="ob-bar"><button class="btn pri block" type="button" id="ob-next">Começar</button></div></div>`;
    const head = `<div class="ob-head"><button class="icon-btn" type="button" id="ob-back" aria-label="Voltar"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><span class="tiny mute num">Passo ${st} de ${OB_STEPS}</span><span style="width:40px"></span></div><div class="steps">${[1, 2, 3, 4].map(i => `<i class="${i <= st ? 'on' : ''}"></i>`).join('')}</div>`;
    let body = '', cta = 'Continuar';
    if (st === 1) body = `<h1>Sobre você</h1><p class="mute">Usado só para calcular suas metas. Fica salvo neste celular.</p>
      <div class="field"><label for="ob-name">Nome</label><input class="input ${ob.err.name ? 'bad' : ''}" id="ob-name" value="${esc(d.name || '')}" autocomplete="given-name" enterkeyhint="next">${obErr('name')}</div>
      <div class="field"><label>Sexo biológico</label>${obSeg('ob-sex', 'sex', [['m', 'Masculino'], ['f', 'Feminino']])}<span class="tiny mute">A fórmula de gasto calórico muda conforme o sexo.</span></div>
      <div class="field"><label for="ob-birth">Data de nascimento</label><input class="input ${ob.err.birth ? 'bad' : ''}" id="ob-birth" type="date" max="${Store.dkey()}" value="${esc(d.birth || '')}">${obErr('birth')}</div>
      <div class="grid2"><div class="field"><label for="ob-h">Altura (cm)</label><input class="input ${ob.err.height ? 'bad' : ''}" id="ob-h" inputmode="numeric" placeholder="174" value="${esc(d.height || '')}">${obErr('height')}</div><div class="field"><label for="ob-w">Peso (kg)</label><input class="input ${ob.err.weight ? 'bad' : ''}" id="ob-w" inputmode="decimal" placeholder="90" value="${esc(d.weight || '')}">${obErr('weight')}</div></div>
      <button class="btn ghost block" type="button" data-act="mic-ask" data-arg="Diga sua idade, altura, peso e objetivo. Ex.: tenho 27 anos, 1,74, 90 quilos e quero perder peso"><svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>Preencher falando</button>`;
    else if (st === 2) body = `<h1>Seu objetivo</h1><p class="mute">Dá para mudar depois em Perfil.</p>
      <div class="stack" id="ob-goal">${[['perder', 'Perder gordura', 'Déficit calórico com proteína alta'], ['manter', 'Manter o peso', 'Comer no seu gasto e melhorar o corpo'], ['ganhar', 'Ganhar massa', 'Pequeno superávit para crescer']].map(([v, l, s]) => `<button type="button" class="opt ${d.goal === v ? 'on' : ''}" data-v="${v}"><b>${l}</b><span>${s}</span></button>`).join('')}</div>
      ${d.goal !== 'manter' ? `<div class="field"><label>Ritmo</label>${obSeg('ob-pace', 'pace', [['lento', 'Tranquilo'], ['normal', 'Normal'], ['rapido', 'Agressivo']])}</div>` : ''}`;
    else if (st === 3) body = `<h1>Sua rotina</h1><div class="field"><label>Quanto você se mexe hoje</label><div class="stack" id="ob-act">${Object.entries(Store.ACT).map(([k, v]) => `<button type="button" class="opt ${d.activity === k ? 'on' : ''}" data-v="${k}"><b>${v[1].split(',')[0]}</b><span>${esc(v[1].split(',').slice(1).join(',').trim())}</span></button>`).join('')}</div></div>
      <div class="field"><label>Nível de treino</label>${obSeg('ob-lvl', 'level', [[1, 'Iniciante'], [2, 'Intermediário'], [3, 'Avançado']])}</div>
      <div class="field"><label>Equipamento que você tem (opcional)</label><div class="chips" id="ob-eq">${Object.entries(EXDB.EQ_LABEL).map(([k, l]) => `<button type="button" class="chip ${d.eq.includes(k) ? 'on' : ''}" data-v="${k}">${l}</button>`).join('')}</div><span class="tiny mute">Sem nada marcado, os treinos usam só o peso do corpo.</span></div>`;
    else {
      const g = Store.calcGoals({ sex: d.sex, birth: d.birth, height: d.height, weight: d.weight, activity: d.activity, goal: d.goal, pace: d.pace });
      const row = (l, v, step) => `<div class="li"><div class="grow"><div class="s">${l}</div><div class="t">${v}</div></div><button class="btn sm ghost" type="button" data-ob-edit="${step}">Editar</button></div>`;
      body = `<h1>Confira seus dados</h1><p class="mute">Se estiver tudo certo, confirme para salvar.</p>
        <div class="card tight"><div class="list">${row('Nome', esc(d.name), 1)}${row('Idade, altura e peso', obAge(d.birth) + ' anos · ' + fmt(d.height) + ' cm · ' + fmt(d.weight, 1) + ' kg', 1)}${row('Objetivo', { perder: 'Perder gordura', manter: 'Manter o peso', ganhar: 'Ganhar massa' }[d.goal] + (d.goal !== 'manter' ? ' · ritmo ' + { lento: 'tranquilo', normal: 'normal', rapido: 'agressivo' }[d.pace] : ''), 2)}${row('Rotina', Store.ACT[d.activity][1].split(',')[0] + ' · ' + ['', 'iniciante', 'intermediário', 'avançado'][d.level], 3)}${row('Equipamento', d.eq.length ? d.eq.map(x => EXDB.EQ_LABEL[x]).join(', ') : 'Só o peso do corpo', 3)}</div></div>
        <span class="lbl">Suas metas por dia</span><div class="grid2"><div class="tile"><span class="lbl">Calorias</span><span class="v">${fmt(g.kcal)}</span><span class="tiny mute">gasto estimado ${fmt(g.tdee)}</span></div><div class="tile"><span class="lbl">Proteína</span><span class="v">${g.prot} g</span></div><div class="tile"><span class="lbl">Água</span><span class="v">${fmt(g.water)} ml</span></div><div class="tile"><span class="lbl">IMC</span><span class="v">${fmt(g.bmi, 1)}</span></div></div>`;
      cta = 'Confirmar e salvar';
    }
    return `<div class="ob">${head}${body}<div class="ob-bar"><button class="btn pri block" type="button" id="ob-next">${cta}</button></div></div>`;
  }
  function bindOnboarding() {
    const d = ob.d;
    const pick = (id, key, num) => { const el = $(id); if (!el) return; el.onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; obRead(); d[key] = num ? +b.dataset.v : b.dataset.v; App.render(); }; };
    pick('#ob-sex', 'sex'); pick('#ob-goal', 'goal'); pick('#ob-pace', 'pace'); pick('#ob-act', 'activity'); pick('#ob-lvl', 'level', true);
    const eq = $('#ob-eq'); if (eq) eq.onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; const v = b.dataset.v; d.eq = d.eq.includes(v) ? d.eq.filter(x => x !== v) : d.eq.concat(v); b.classList.toggle('on'); };
    $$('[data-ob-edit]').forEach(b => b.onclick = () => { ob.step = +b.dataset.obEdit; ob.fromReview = true; App.render(); });
    ['#ob-name', '#ob-birth', '#ob-h', '#ob-w'].forEach(id => { const el = $(id); if (el) el.addEventListener('input', () => { if (Object.keys(ob.err).length) { obRead(); const before = JSON.stringify(ob.err); obValidate(); if (JSON.stringify(ob.err) !== before) { ['name', 'birth', 'height', 'weight'].forEach(k => { const f = $({ name: '#ob-name', birth: '#ob-birth', height: '#ob-h', weight: '#ob-w' }[k]); if (!f) return; f.classList.toggle('bad', !!ob.err[k]); const sp = f.parentElement.querySelector('.ferr'); if (sp && !ob.err[k]) sp.remove(); }); } } }); });
    const bk = $('#ob-back'); if (bk) bk.onclick = () => { obRead(); ob.step = ob.fromReview ? 4 : ob.step - 1; ob.fromReview = false; ob.err = {}; App.render(); };
    const nx = $('#ob-next'); if (nx) nx.onclick = () => {
      obRead();
      if (ob.step === 1 && !obValidate()) { App.render(); const f = $('.input.bad'); if (f) { f.focus(); f.scrollIntoView({ block: 'center' }); } UCBridge.vibrate(60); return; }
      if (ob.step < 4) { ob.step = ob.fromReview ? 4 : ob.step + 1; ob.fromReview = false; App.render(); $('#view').scrollTop = 0; return; }
      if (!obValidate()) { ob.step = 1; App.render(); return; }
      const s = S(); s.profile = { name: d.name, sex: d.sex, birth: d.birth, height: d.height, weight: d.weight, activity: d.activity, goal: d.goal, pace: d.pace };
      s.eq = d.eq; s.level = d.level || 1; s.aranha.level = Math.min(3, s.level); s.goalsManual = false; s.goals = Store.calcGoals(s.profile); Store.logWeight(d.weight); Store.flush(); syncReminders();
      App.welcome = true; ob = OB0(); App.go('hoje');
      App.toast('Perfil salvo');
    };
  }

  const playBtn = (kind, arg, label) => `<button class="play-btn" type="button" data-act="play" data-kind="${kind}" data-arg="${esc(arg)}" aria-label="Começar ${esc(label)} com a treinadora"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg></button>`;
  App.playBtn = playBtn;
  // estimativa de gasto da sessão (Compêndio 2024), com cache por sessão
  const estC = {};
  const est = sess => { if (!sess) return null; const key = sess.name + '|' + JSON.stringify(sess.blocks).length + '|' + Math.round(Energy.rest() * 100) + '|' + (S().calis ? 1 : 0) + (S().eq || []).join(); return estC[key] || (estC[key] = Player.estimate(sess)); };
  const estTxt = sess => { const e = est(sess); return e ? '~' + e.mins + ' min · ~' + e.kcal + ' kcal' : ''; };
  App.estTxt = estTxt;

  // ---------- HOJE ----------
  function nextP28() { for (let d = 1; d <= 28; d++) if (!S().p28.done[d]) return d; return null; }
  function todayAranha() { const wd = new Date().getDay(); const map = [6, 0, 1, 2, 3, 4, 5]; return EXDB.ARANHA.week[map[wd]]; }
  function vHoje() {
    const s = S(), g = Store.goals(), k = Store.dkey(), d = Store.day(k), t = Store.totals(k);
    const bud = Store.budget(k), left = bud.kcal - t.kcal;
    const p28 = nextP28(), ar = todayAranha();
    const arSess = EXDB.ARANHA.sessions[ar[1]](s.aranha.level);
    const jawToday = !!s.jaw.log[k];
    const jawStreak = Store.streak(x => !!s.jaw.log[x]);
    const name = s.profile.name ? ', ' + esc(s.profile.name.split(' ')[0]) : '';
    const wel = App.welcome ? `<div class="card"><span class="lbl">Tudo pronto</span><h2>Suas metas estão salvas</h2><p class="small ink2">${fmt(g.kcal)} kcal, ${g.prot} g de proteína e ${fmt(g.water)} ml de água por dia. Para começar, registre um copo de água ou toque no microfone e conte o que comeu hoje.</p><button class="btn sm" type="button" data-act="welcome-ok">Entendi</button></div>` : '';
    return wel + `<div class="hero"><span class="lbl">${dateLabel(k)} · ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</span><h1>${greet()}${name}</h1></div>
    <div class="card click" data-act="go" data-arg="comida"><div class="row" style="gap:16px">${ring(t.kcal, g.kcal, 132, fmt(Math.max(0, left)), left >= 0 ? 'kcal restantes' : 'kcal acima')}<div class="stack" style="flex:1;gap:10px">
      <div><div class="row between small"><span>Proteína</span><span class="num mute">${fmt(t.p)} / ${g.prot} g</span></div>${bar(t.p, g.prot)}</div>
      <div><div class="row between small"><span>Carboidrato</span><span class="num mute">${fmt(t.c)} / ${g.carb} g</span></div>${bar(t.c, g.carb)}</div>
      <div><div class="row between small"><span>Gordura</span><span class="num mute">${fmt(t.g)} / ${g.fat} g</span></div>${bar(t.g, g.fat)}</div>
      <span class="tiny mute num">${fmt(t.kcal)} comidas · meta ${fmt(bud.kcal)}${bud.out ? ' · treino ' + fmt(bud.out) + ' kcal' + (bud.counted ? ' (+' + fmt(bud.bonus) + ' liberadas)' : ' (já previsto na meta)') : ''}</span></div></div></div>
    <div class="card"><div class="row between"><span class="lbl">Água</span><span class="tiny mute num">meta ${fmt(g.water)} ml</span></div>
      <div class="row between"><span class="big">${fmt(d.water)}<span class="mute" style="font-size:1rem"> ml</span></span><span class="mute num">${Math.min(100, Math.round(d.water / g.water * 100))}%</span></div>${bar(d.water, g.water)}
      <div class="grid3"><button class="btn sm" type="button" data-act="water" data-arg="${s.settings.cupMl}">+ copo</button><button class="btn sm" type="button" data-act="water" data-arg="${s.settings.bottleMl}">+ garrafa</button><button class="btn sm" type="button" data-act="water-custom">Outro</button></div>
      ${d.waterLog.length ? '<button class="btn ghost sm" type="button" data-act="water-undo">Desfazer último</button>' : ''}</div>
    <div class="grid2">
      <button class="tile" type="button" data-act="sleep"><span class="lbl">Sono</span><span class="v">${d.sleep != null ? fmt(d.sleep, 2).replace(',5', ',5') + ' h' : '–'}</span><span class="tiny mute">${d.sleep == null ? 'Toque para anotar' : d.sleep < 7 ? 'Abaixo de 7 h' : 'Boa noite de sono'}</span></button>
      <button class="tile" type="button" data-act="weight"><span class="lbl">Peso</span><span class="v">${fmt(Store.weightNow(), 1)} kg</span><span class="tiny mute">IMC ${fmt(g.bmi, 1)}</span></button>
    </div>
    <div class="card"><span class="lbl">Treino de hoje</span>
      ${p28 ? `<div class="li click" data-act="p28" data-arg="${p28}"><div class="grow"><div class="t">28 Dias em Casa · dia ${p28}</div><div class="s">${esc(EXDB.day28(p28).short)} · ${estTxt(EXDB.day28(p28))}</div></div>${playBtn('p28', p28, '28 Dias, dia ' + p28)}</div>` : ''}
      ${arSess ? `<div class="li click" data-act="aranha" data-arg="${ar[1]}"><div class="grow"><div class="t">Protocolo Aranha · ${esc(arSess.name)}</div><div class="s">${ar[0]} · nível ${s.aranha.level} · ${estTxt(arSess)}</div></div>${playBtn('aranha', ar[1], arSess.name)}</div>` : `<div class="li"><div class="grow"><div class="t">Protocolo Aranha</div><div class="s">Hoje é descanso no plano semanal</div></div></div>`}
      <div class="li click" data-act="go" data-arg="treino" data-sub="montar"><div class="grow"><div class="t">Montar um treino agora</div><div class="s">Escolha tempo, foco e equipamento, ou fale</div></div><span class="pill">Montar</span></div></div>
    <div class="card click" data-act="go" data-arg="treino" data-sub="rosto"><div class="row between"><span class="lbl">Rosto e mandíbula</span>${jawToday ? '<span class="pill solid">Feito hoje</span>' : '<span class="pill">Pendente</span>'}</div><p class="small ink2">${jawStreak ? jawStreak + (jawStreak > 1 ? ' dias seguidos' : ' dia') : 'Postura, mordedor e pescoço em 8 minutos'}</p></div>
    <div class="card"><span class="lbl">Fale com o app</span><p class="small ink2">Toque no microfone e diga, por exemplo:</p><ul class="small mute" style="margin:0;padding-left:18px"><li>“Dormi 6 horas e meia e tomei dois copos de água”</li><li>“No almoço comi arroz, feijão e 150 gramas de frango”</li><li>“Monta um treino de 20 minutos sem peso para perna”</li><li>“Quero o treino do Homem-Aranha”</li></ul></div>`;
  }

  // ---------- TREINO ----------
  function vTreino() {
    const sub = App.sub.treino || 'programas';
    const tabs = [['programas', 'Programas'], ['montar', 'Montar'], ['rosto', 'Rosto'], ['exercicios', 'Exercícios'], ['progresso', 'Progresso']];
    const seg = `<div class="seg">${tabs.map(([k, l]) => `<button type="button" class="${sub === k ? 'on' : ''}" data-act="sub" data-arg="${k}">${l}</button>`).join('')}</div>`;
    const body = { programas: tProgramas, montar: tMontar, rosto: tRosto, exercicios: tExercicios, progresso: tProgresso }[sub]();
    return `<div class="hero"><h1>Treino</h1></div>${seg}${body}`;
  }
  const userEq = () => S().calis ? [] : S().eq;
  App.userEq = userEq;
  function tProgramas() {
    if (App.progOpen) return progDetail(App.progOpen);
    const s = S(), f = App.progFilter || 'todos';
    const list = EXDB.PROGRAMS.filter(p => f === 'todos' || p.tag === f || p.tag === 'misto');
    const prog = id => id === 'p28' ? Object.keys(s.p28.done).length + '/28 dias' : id === 'calis' ? 'semana ' + s.cal.week : id === 'halteres' ? 'semana ' + s.hal.week : id === 'aranha' ? 'nível ' + s.aranha.level : (Store.streak(x => !!s.jaw.log[x]) + ' dias seguidos');
    const tagL = { sem: 'Sem aparelhos', com: 'Com aparelhos', misto: 'Com ou sem aparelhos' };
    return `<div class="seg">${[['todos', 'Todos'], ['sem', 'Sem aparelhos'], ['com', 'Com aparelhos']].map(([k, l]) => `<button type="button" class="${f === k ? 'on' : ''}" data-act="prog-filter" data-arg="${k}">${l}</button>`).join('')}</div>
      <div class="card tight"><div class="row between"><div class="grow"><div class="t" style="font-weight:700">Calistenia pura</div><div class="tiny mute">Troca qualquer exercício que precise de aparelho, cadeira ou barra por um só com o peso do corpo, em todos os programas.</div></div><input type="checkbox" class="switch" data-act="calis-toggle" ${s.calis ? 'checked' : ''} aria-label="Calistenia pura"></div></div>
      ${list.map(p => `<div class="card click" data-act="prog-open" data-arg="${p.id}"><div class="row between"><span class="lbl">${tagL[p.tag]}</span><span class="pill num">${esc(prog(p.id))}</span></div><h2>${esc(p.name)}</h2><p class="small ink2">${esc(p.desc)}</p><div class="row between"><span class="tiny mute">${esc(p.freq)} · ${esc(p.len)}</span><span class="pill solid">Ver programa</span></div></div>`).join('')}`;
  }
  function progDetail(id) {
    const s = S();
    const back = `<button class="btn sm ghost" type="button" data-act="prog-back" style="align-self:flex-start"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>Todos os programas</button>`;
    if (id === 'rosto') return back + tRosto();
    if (id === 'calis' || id === 'halteres') {
      const isC = id === 'calis', st = isC ? s.cal : s.hal, days = isC ? EXDB.CAL_DAYS : EXDB.HAL_DAYS, p = EXDB.PROGRAMS.find(x => x.id === id);
      const plan = isC ? ['A', 'B', 'C'] : ['A', 'B', 'A'];
      return back + `<div class="card"><span class="lbl">Programa</span><h2>${esc(p.name)}</h2><p class="small ink2">${esc(p.desc)}</p>
        <div class="field"><label>Semana</label><div class="seg">${[1, 2, 3, 4].map(w => `<button type="button" class="${st.week === w ? 'on' : ''}" data-act="${isC ? 'cal' : 'hal'}-week" data-arg="${w}">${w}</button>`).join('')}</div></div>
        <div class="list">${plan.map((d, i) => { const ss = isC ? EXDB.calSession(d, st.week) : EXDB.halSession(d, st.week); return `<div class="li click" data-act="${isC ? 'cal' : 'hal'}" data-arg="${d}"><span class="pill" style="min-width:58px;text-align:center">Treino ${i + 1}</span><div class="grow"><div class="t">${esc(days[d].name)}</div><div class="s">${esc(ss.short)}</div><div class="s">${estTxt(ss)}</div></div>${playBtn(isC ? 'cal' : 'hal', d, days[d].name)}</div>`; }).join('')}</div>
        <p class="tiny mute">Faça os treinos em dias alternados. Passe para a semana seguinte quando completar todas as séries com boa técnica.</p>
        ${!isC && !s.eq.includes('halteres') && !s.calis ? '<div class="note">Você não marcou halteres no seu perfil. O app troca os exercícios por versões sem peso até você marcar.</div>' : ''}</div>`;
    }
    return back + legacyProg(id);
  }
  function legacyProg(which) {
    const s = S(), A = EXDB.ARANHA, nx = nextP28();
    const grid = [1, 2, 3, 4].map(w => `<div class="row between"><span class="tiny lbl">Semana ${w} · ${EXDB.W28[w - 1].name}</span></div><div class="days">${[1, 2, 3, 4, 5, 6, 7].map(i => { const d = (w - 1) * 7 + i; const t = EXDB.PATTERN[(d - 1) % 7]; const tt = d === 28 ? 'T' : t; return `<button type="button" class="day ${tt === 'R' ? 'rest' : ''} ${s.p28.done[d] ? 'done' : ''} ${d === nx ? 'next' : ''}" data-act="p28" data-arg="${d}"><span>${d}</span><small>${{ A: 'A', B: 'B', C: 'C', R: 'LEVE', T: 'TESTE' }[tt]}</small></button>`; }).join('')}</div>`).join('');
    const done28 = Object.keys(s.p28.done).length;
    const c28 = `<div class="card prog-card"><span class="pill tag num">${done28}/28</span><span class="lbl">Programa</span><h2>28 Dias em Casa</h2><p class="small ink2">Só peso do corpo, 20 a 30 minutos, com progressão semana a semana. A pernas e peito, B core e cardio, C costas e postura.</p>${bar(done28, 28)}${nx ? `<div class="li"><div class="grow"><div class="t">Próximo: dia ${nx}</div><div class="s">${esc(EXDB.day28(nx).short)} · ${estTxt(EXDB.day28(nx))}</div></div>${playBtn('p28', nx, 'dia ' + nx)}</div>` : ''}${grid}</div>`;
    const car = `<div class="card"><span class="lbl">Programa</span><h2>${A.name}</h2><p class="small ink2">${esc(A.sub)}</p>
      <div class="field"><label>Nível</label><div class="seg">${[1, 2, 3].map(l => `<button type="button" class="${s.aranha.level === l ? 'on' : ''}" data-act="ar-level" data-arg="${l}">${['', 'Iniciante', 'Intermediário', 'Completo'][l]}</button>`).join('')}</div></div>
      <div class="list">${A.week.map(([wd, k]) => { const ss = A.sessions[k](s.aranha.level); return `<div class="li ${ss ? 'click' : ''}" ${ss ? `data-act="aranha" data-arg="${k}"` : ''}><span class="pill" style="min-width:48px;text-align:center">${wd}</span><div class="grow"><div class="t">${ss ? esc(ss.name) : 'Descanso'}</div><div class="s">${ss ? esc(ss.short) + ' · ' + estTxt(ss) : 'Recuperação total'}</div></div>${ss ? playBtn('aranha', k, ss.name) : ''}</div>`; }).join('')}</div>
      <details><summary class="small">O que se sabe do treino dele</summary><div class="stack small ink2" style="margin-top:8px">${A.about.map(p => `<p>${esc(p)}</p>`).join('')}<p class="lbl" style="margin-top:6px">Fontes</p>${A.sources.map(([t, u]) => `<a class="small" href="#" data-act="url" data-arg="${esc(u)}">${esc(t)}</a>`).join('')}</div></details></div>`;
    return which === 'p28' ? c28 : car;
  }
  let gen = null;
  function tMontar() {
    const s = S(); const o = App.genOpts = App.genOpts || { minutes: 20, focus: 'corpo', eq: userEq().slice(), level: s.level, noImpact: false, lim: s.lim.slice(), format: 'circuito' };
    const chip = (key, v, l, multi) => { const on = multi ? (o[key] || []).includes(v) : o[key] == v; return `<button type="button" class="chip ${on ? 'on' : ''}" data-act="gen-opt" data-key="${key}" data-arg="${v}" data-multi="${multi ? 1 : ''}">${l}</button>`; };
    return `<div class="card"><button class="btn block" type="button" data-act="mic-ask" data-arg="Diga o treino que você quer. Ex.: 30 minutos com halteres para braço, nível pesado"><svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>Falar o treino que eu quero</button>
      <div class="field"><label>Tempo</label><div class="chips">${[10, 15, 20, 30, 45, 60].map(m => chip('minutes', m, m + ' min')).join('')}</div></div>
      <div class="field"><label>Foco</label><div class="chips">${[['corpo', 'Corpo todo'], ['superior', 'Parte de cima'], ['inferior', 'Pernas'], ['core', 'Abdômen'], ['pernas_core', 'Pernas e abdômen'], ['cardio', 'Cardio']].map(([v, l]) => chip('focus', v, l)).join('')}</div></div>
      <div class="field"><label>Equipamento disponível (nenhum marcado = sem peso)</label><div class="chips">${Object.entries(EXDB.EQ_LABEL).map(([v, l]) => chip('eq', v, l, true)).join('')}</div></div>
      <div class="field"><label>Nível</label><div class="chips">${[[1, 'Iniciante'], [2, 'Intermediário'], [3, 'Avançado']].map(([v, l]) => chip('level', v, l)).join('')}</div></div>
      <div class="field"><label>Formato</label><div class="chips">${chip('format', 'circuito', 'Circuito por tempo')}${chip('format', 'series', 'Séries e repetições')}</div></div>
      <div class="field"><label>Cuidados</label><div class="chips">${`<button type="button" class="chip ${o.noImpact ? 'on' : ''}" data-act="gen-opt" data-key="noImpact" data-arg="1">Sem salto</button>`}${[['joelho', 'Joelho'], ['ombro', 'Ombro'], ['lombar', 'Lombar'], ['punho', 'Punho']].map(([v, l]) => chip('lim', v, 'Dor no ' + l.toLowerCase(), true)).join('')}</div></div>
      <button class="btn pri block" type="button" data-act="gen">Gerar treino</button></div>
      ${gen ? sessionCard(gen, 'gen') : ''}`;
  }
  function sessionCard(sess, kind, arg) {
    const rows = sess.blocks.map(b => {
      let items, head;
      if (b.kind === 'list') { head = b.label + ' · ' + b.secs + ' s cada'; items = b.items.map(id => [id, b.secs + ' s']); }
      else if (b.kind === 'timed') { head = b.label + ' · ' + b.rounds + (b.rounds > 1 ? ' voltas · ' : ' volta · ') + b.work + ' s / ' + b.rest + ' s'; items = b.items.map(id => [id, b.work + ' s']); }
      else if (b.kind === 'circuit') { head = b.label + ' · ' + b.rounds + ' voltas · ' + b.rr + ' s entre voltas'; items = b.items; }
      else if (b.kind === 'sets') { head = b.label; items = b.items.map(([id, s, r]) => [id, s + ' × ' + r]); }
      else if (b.kind === 'amrap') { head = b.label + ' · ' + b.mins + ' min'; items = b.items; }
      else if (b.kind === 'ladder') { head = b.label + ' · 1 até ' + b.top + ' e volta'; items = b.items.map(([id, m]) => [id, m + '× o degrau']); }
      return `<div class="block"><div class="row between" style="border-bottom:1px solid var(--line);padding-bottom:4px"><b class="small">${esc(head)}</b></div>${items.map(([id, r]) => { const ex = EXDB.resolve(id, userEq(), { lim: S().lim }) || EXDB.X[id]; return `<div class="exrow" data-act="ex" data-arg="${ex.id}"><div class="thumb" data-thumb="${ex.anim}"></div><div><div class="t" style="font-weight:650">${esc(ex.n)}</div><div class="tiny mute">${esc(ex.g)}${ex.id !== id ? ' · no lugar de ' + esc(EXDB.X[id].n) : ''}</div></div><span class="small num mute">${esc(r)}</span></div>`; }).join('')}</div>`;
    }).join('');
    return `<div class="card"><div class="row between" style="align-items:flex-start"><div class="grow"><span class="lbl">${kind === 'gen' ? 'Seu treino' : 'Sessão'}</span><h2>${esc(sess.name)}</h2><span class="tiny mute num">${(() => { const e = est(sess); return e ? 'Cerca de ' + e.mins + ' min · ~' + e.kcal + ' kcal (' + e.net + ' acima do repouso)' : ''; })()}</span></div>${playBtn(kind, arg || '', sess.name)}</div>${sess.short ? `<p class="small mute">${esc(sess.short)}</p>` : ''}${sess.note ? `<div class="note">${esc(sess.note)}</div>` : ''}${rows}
      <div class="grid2">${kind === 'gen' ? '<button class="btn" type="button" data-act="gen">Gerar outro</button>' : '<span></span>'}<button class="btn pri" type="button" data-act="play" data-kind="${kind}" data-arg="${esc(arg || '')}">Começar guiado</button></div></div>`;
  }
  function tRosto() {
    const s = S(), I = EXDB.JAW_INFO, k = Store.dkey();
    const last14 = []; for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); last14.push(Store.dkey(d)); }
    const doneWeek = last14.slice(-7).filter(x => s.jaw.log[x]).length;
    const sess = EXDB.jawSession(s.jaw.week);
    const yesterday = s.jaw.log[shift(k, -1)];
    return `<div class="card"><span class="lbl">Rosto</span><h2>Mandíbula e postura</h2><p class="small ink2">O que funciona, o que é mito e um protocolo seguro para o mordedor.</p>
      <div class="days">${last14.slice(-7).map(x => `<div class="day ${s.jaw.log[x] ? 'done' : ''}"><span>${new Date(x + 'T12:00:00').getDate()}</span><small>${WEEKD[new Date(x + 'T12:00:00').getDay()].toUpperCase()}</small></div>`).join('')}</div>
      <p class="tiny mute num">${doneWeek} de no máximo 4 sessões de mordedor nos últimos 7 dias</p>
      ${doneWeek >= 4 ? '<div class="note warn">Você já fez 4 sessões nesta semana. Hoje fique só no mewing e no pescoço.</div>' : yesterday ? '<div class="note">Ontem teve mordedor. O ideal é dia sim, dia não: hoje faça só a postura e o pescoço.</div>' : ''}</div>
    ${sessionCard(sess, 'jaw')}
    <div class="card"><div class="field"><label>Semana do protocolo</label><div class="seg">${[1, 2, 3, 4].map(w => `<button type="button" class="${Math.min(4, s.jaw.week) === w ? 'on' : ''}" data-act="jaw-week" data-arg="${w}">${w}${w === 4 ? '+' : ''}</button>`).join('')}</div></div><p class="tiny mute">Suba de semana só se não teve nenhuma dor na anterior.</p></div>
    <div class="card"><span class="lbl">O que a pesquisa diz</span>${I.facts.map(([t, p]) => `<div><h3>${esc(t)}</h3><p class="small ink2" style="margin-top:4px">${esc(p)}</p></div>`).join('<div class="hr"></div>')}</div>
    <div class="card"><span class="lbl">Regras do mordedor</span><ul class="small ink2" style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px">${I.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
      <div class="row between"><span class="small">Lembretes de mewing</span><input type="checkbox" class="switch" data-act="rem-toggle" data-arg="mewing" ${s.settings.reminders.mewing.on ? 'checked' : ''} aria-label="Lembretes de mewing"></div></div>
    <div class="card src"><span class="lbl">Fontes</span>${I.sources.map(([t, u]) => `<a class="small" href="#" data-act="url" data-arg="${esc(u)}">${esc(t)}</a>`).join('')}</div>`;
  }
  App.exFilter = { q: '', g: '' };
  function tExercicios() {
    const f = App.exFilter, groups = Array.from(new Set(Object.values(EXDB.X).map(e => e.g)));
    const n = Food.norm(f.q);
    const list = Object.values(EXDB.X).filter(e => (!f.g || e.g === f.g) && (!n || Food.norm(e.n).includes(n)));
    return `<input class="input" id="ex-q" placeholder="Buscar exercício" value="${esc(f.q)}" aria-label="Buscar exercício">
      <div class="chips"><button type="button" class="chip ${!f.g ? 'on' : ''}" data-act="ex-g" data-arg="">Todos</button>${groups.map(g => `<button type="button" class="chip ${f.g === g ? 'on' : ''}" data-act="ex-g" data-arg="${esc(g)}">${esc(g)}</button>`).join('')}</div>
      <div class="card tight"><div class="list">${list.map(e => `<div class="exrow" data-act="ex" data-arg="${e.id}"><div class="thumb" data-thumb="${e.anim}"></div><div><div class="t" style="font-weight:650">${esc(e.n)}</div><div class="tiny mute">${esc(e.g)} · ${e.eq.length ? e.eq.map(x => EXDB.EQ_LABEL[x]).join(', ') : 'sem equipamento'}${e.imp ? ' · com salto' : ''}</div></div><span class="pill">${['', 'Fácil', 'Médio', 'Difícil'][e.lvl]}</span></div>`).join('') || '<p class="empty">Nada encontrado.</p>'}</div></div>`;
  }
  const thumbCache = {};
  function thumbs() {
    const els = $$('[data-thumb]'); if (!els.length || !Mannequin.available()) return;
    const v = Mannequin.viewer(); if (!v || !v.renderer) return;
    const todo = els.filter(el => { const k = el.dataset.thumb; if (thumbCache[k]) { el.innerHTML = `<img alt="" src="${thumbCache[k]}">`; return false; } return true; });
    if (!todo.length) return;
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-9999px;top:0;width:160px;height:160px';
    document.body.appendChild(host);
    const wasRunning = v.running; v.stop(); v.mount(host); v.stop(); v.resize();
    let i = 0;
    const work = () => {
      const t0 = performance.now();
      while (i < todo.length && performance.now() - t0 < 30) {
        const el = todo[i++], k = el.dataset.thumb;
        if (!thumbCache[k]) { const a = Mannequin.ANIM[k] || Mannequin.ANIM.stand; thumbCache[k] = v.snapshot(k, a.dur * 1000 * (a.frames.length > 1 ? 1 / a.frames.length : 0) + 5); }
        if (el.isConnected) el.innerHTML = `<img alt="" src="${thumbCache[k]}">`;
      }
      if (i < todo.length) requestAnimationFrame(work); else { host.remove(); if (wasRunning) v.start(); }
    };
    requestAnimationFrame(work);
  }
  function tProgresso() {
    const s = S(), w = s.weights.slice(-30);
    let chart = '<p class="empty">Registre o peso para ver a curva.</p>';
    if (w.length >= 2) {
      const W = 320, H = 140, pad = 24, min = Math.min(...w.map(x => x.kg)) - 1, max = Math.max(...w.map(x => x.kg)) + 1;
      const X = i => pad + i * (W - 2 * pad) / (w.length - 1), Y = v => H - pad - (v - min) / (max - min) * (H - 2 * pad);
      const path = w.map((x, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(x.kg).toFixed(1)).join(' ');
      chart = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="Peso nos últimos registros"><line x1="${pad}" x2="${W - pad}" y1="${Y(max - 1)}" y2="${Y(max - 1)}" stroke="#232323"/><line x1="${pad}" x2="${W - pad}" y1="${Y(min + 1)}" y2="${Y(min + 1)}" stroke="#232323"/><path d="${path} L${X(w.length - 1)} ${H - pad} L${X(0)} ${H - pad}Z" fill="rgba(255,255,255,.06)"/> <path d="${path}" style="stroke:var(--green)" stroke-width="2.2" fill="none"/><circle cx="${X(w.length - 1)}" cy="${Y(w[w.length - 1].kg)}" r="4.5" fill="#f4f4f4"/><text x="${pad}" y="${Y(max - 1) - 6}" fill="#7c7c7c" font-size="10">${fmt(max - 1, 1)} kg</text><text x="${pad}" y="${Y(min + 1) + 14}" fill="#7c7c7c" font-size="10">${fmt(min + 1, 1)} kg</text><text x="${W - pad}" y="${Y(w[w.length - 1].kg) - 10}" fill="#f4f4f4" font-size="12" text-anchor="end" font-weight="700">${fmt(w[w.length - 1].kg, 1)}</text></svg>`;
    }
    const T = [['flex', 'Flexões (máximo)', 'rep'], ['agach', 'Agachamentos em 1 min', 'rep'], ['prancha', 'Prancha', 's']];
    const wk = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); wk.push(Store.dkey(d)); }
    const wkMins = wk.reduce((a, k) => a + (s.days[k] ? s.days[k].workouts.reduce((x, y) => x + (y.mins || 0), 0) : 0), 0);
    const wkKcal = wk.reduce((a, k) => a + (s.days[k] ? s.days[k].kcalOut || 0 : 0), 0);
    return `<div class="grid2"><div class="tile"><span class="lbl">7 dias</span><span class="v">${wkMins} min</span><span class="tiny mute">de treino</span></div><div class="tile"><span class="lbl">7 dias</span><span class="v">${fmt(wkKcal)}</span><span class="tiny mute">kcal gastas</span></div></div>
    <div class="card"><div class="row between"><span class="lbl">Peso</span><button class="btn sm" type="button" data-act="weight">Registrar</button></div>${chart}</div>
    <div class="card"><span class="lbl">Teste de evolução · 28 dias</span><p class="tiny mute">Dia 1 e dia 28, sempre com o mesmo tipo de flexão.</p>
      <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:8px;align-items:center"><span class="tiny lbl">Teste</span><span class="tiny lbl">Dia 1</span><span class="tiny lbl">Dia 28</span>${T.map(([k, l, u]) => `<span class="small">${l} <span class="mute">(${u})</span></span><input class="input" inputmode="numeric" data-test="ini_${k}" value="${esc(s.tests['ini_' + k] || '')}" aria-label="${l} dia 1"><input class="input" inputmode="numeric" data-test="fim_${k}" value="${esc(s.tests['fim_' + k] || '')}" aria-label="${l} dia 28">`).join('')}</div></div>
    <div class="card"><span class="lbl">Histórico</span><div class="list">${s.history.slice(0, 40).map(h => `<div class="li"><div class="grow"><div class="t">${esc(h.name)}</div><div class="s">${dateLabel(h.d)} · ${h.mins} min${h.rounds ? ' · ' + h.rounds + ' voltas' : ''}</div></div><span class="kcal">${fmt(h.kcal)} kcal</span></div>`).join('') || '<p class="empty">Nenhum treino ainda.</p>'}</div></div>`;
  }
  function exSheet(id) {
    const e = EXDB.X[id]; if (!e) return;
    const stacked = $('#sheet').classList.contains('open');
    (stacked ? App.pushSheet : App.sheet)(`<div class="mq" id="ex-mq"></div><h2>${esc(e.n)}</h2><div class="chips"><span class="pill">${esc(e.g)}</span><span class="pill">${['', 'Iniciante', 'Intermediário', 'Avançado'][e.lvl]}</span><span class="pill">${e.eq.length ? e.eq.map(x => EXDB.EQ_LABEL[x]).join(', ') : 'Sem equipamento'}</span>${e.imp ? '<span class="pill">Com salto</span>' : ''}</div>
      <p class="ink2">${esc(e.how)}</p>${e.easy ? `<div class="grid2"><div class="tile"><span class="lbl">Mais fácil</span><span class="small">${esc(e.easy)}</span></div><div class="tile"><span class="lbl">Mais difícil</span><span class="small">${esc(e.hard)}</span></div></div>` : ''}
      ${e.lim.length ? `<p class="tiny mute">Cuidado se tiver dor em: ${e.lim.join(', ')}.</p>` : ''}
      <button class="btn block" type="button" data-act="url" data-arg="https://www.youtube.com/results?search_query=${encodeURIComponent('como fazer ' + e.n)}">Ver vídeos no YouTube</button><button class="btn ghost block" type="button" data-close>${stacked ? 'Voltar ao treino' : 'Fechar'}</button>`);
    Mannequin.show($('#ex-mq'), e.anim);
  }

  // ---------- COMIDA ----------
  function vComida() {
    const k = App.foodDate || Store.dkey(), d = Store.day(k), t = Store.totals(k), g = Store.goals();
    const sections = MEALS.map(([m, l]) => {
      const es = d.meals.filter(e => e.meal === m);
      const kc = es.reduce((a, e) => a + e.kcal, 0);
      if (m === 'ceia' && !es.length) return '';
      return `<div class="card tight"><div class="row between"><h3>${l}</h3><div class="row"><span class="small mute num">${fmt(kc)} kcal</span><button class="icon-btn" type="button" data-act="food-add" data-arg="${m}" aria-label="Adicionar em ${l}"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button></div></div>
        ${es.length ? `<div class="list">${es.map(e => `<div class="li click" data-act="entry" data-arg="${e.id}"><div class="grow"><div class="t">${esc(e.name)}</div><div class="s num">${Food.brandy(Food.get(e.ref)) ? 'média genérica · ' : ''}${e.label ? esc(e.label) + ' · ' : ''}${fmt(e.grams)} g · P ${fmt(e.p, 1)} · C ${fmt(e.c, 1)} · G ${fmt(e.g, 1)}</div></div><span class="kcal">${fmt(e.kcal)}</span></div>`).join('')}</div>` : ''}</div>`;
    }).join('');
    return `<div class="row between"><button class="icon-btn" type="button" data-act="food-day" data-arg="-1" aria-label="Dia anterior"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><h2>${dateLabel(k)}</h2><button class="icon-btn" type="button" data-act="food-day" data-arg="1" aria-label="Próximo dia" ${k >= Store.dkey() ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></div>
    <div class="card"><div class="row" style="gap:14px">${(() => { const b = Store.budget(k); return ring(t.kcal, b.kcal, 112, fmt(t.kcal), 'de ' + fmt(b.kcal)); })()}<div class="stack" style="flex:1;gap:8px">
      ${[['Proteína', t.p, g.prot], ['Carboidrato', t.c, g.carb], ['Gordura', t.g, g.fat], ['Fibra', t.f, g.fiber]].map(([l, v, m]) => `<div><div class="row between tiny"><span>${l}</span><span class="num mute">${fmt(v)} / ${m} g</span></div>${bar(v, m)}</div>`).join('')}</div></div>
      <div class="grid2"><button class="btn sm" type="button" data-act="food-add" data-arg="">Buscar</button><button class="btn sm" type="button" data-act="scan">Código de barras</button><button class="btn sm" type="button" data-act="photo-label">Foto da tabela</button><button class="btn sm" type="button" data-act="mic-ask" data-arg="Diga o que comeu. Ex.: no almoço comi arroz, feijão e um bife">Falar</button></div></div>
    ${sections}
    <div class="row wrap"><button class="btn sm ghost" type="button" data-act="custom-new">Criar alimento</button><button class="btn sm ghost" type="button" data-act="my-foods">Meus alimentos e favoritos</button></div>
    <p class="tiny mute">Valores de alimentos naturais: TACO 4ª ed. (NEPA/UNICAMP). Pratos genéricos sem marca: IBGE, POF 2008-2009. Medidas caseiras: IBGE, POF 2008-2009. Produtos de marca: Open Food Facts (openfoodfacts.org, licença ODbL), embutido no app e atualizado a cada versão, e o rótulo informado por você.</p>`;
  }
  let fs = { meal: '', q: '', remote: [], loading: false, timer: null, seq: 0, err: false };
  function foodSearch(meal, q) {
    fs = { meal: meal || mealNow(), q: q || '', remote: [], loading: false, timer: null, seq: 0 };
    App.sheet(`<div class="row between"><h2>Adicionar</h2><select class="input" id="fs-meal" style="width:auto;min-height:40px;padding:6px 10px" aria-label="Refeição">${MEALS.map(([m, l]) => `<option value="${m}" ${fs.meal === m ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <input class="input" id="fs-q" placeholder="Ex.: peito de frango, sassami Swift" autocomplete="off" value="${esc(fs.q)}" aria-label="Buscar alimento">
      <div class="row wrap"><button class="btn sm" type="button" data-act="scan">Código de barras</button><button class="btn sm" type="button" data-act="photo-label">Foto da tabela</button><button class="btn sm ghost" type="button" data-act="custom-new">Criar alimento</button></div>
      <div id="fs-res"></div>`);
    const inp = $('#fs-q'); inp.focus();
    inp.oninput = () => { fs.q = inp.value; fs.remote = []; fs.err = false; fs.seq++; fs.loading = Food.norm(fs.q).length >= 3; renderFS(); clearTimeout(fs.timer); if (fs.loading) fs.timer = setTimeout(online, 650); };
    $('#fs-meal').onchange = e => fs.meal = e.target.value;
    renderFS(); if (Food.norm(fs.q).length >= 3) online();
    Food.loadBrands(() => renderFS());
  }
  async function online() {
    const my = ++fs.seq, q = fs.q; fs.loading = true; renderFS();
    try { const r = await Food.searchOnline(q); if (my !== fs.seq) return; fs.remote = r; fs.err = false; }
    catch (e) { if (my === fs.seq) { fs.remote = []; fs.err = true; } }
    if (my === fs.seq) { fs.loading = false; renderFS(); }
  }
  function foodRow(f) { return `<div class="li click" data-act="pick" data-arg="${esc(f.ref)}"><div class="grow"><div class="t">${esc(f.name)}</div><div class="s">${f.brand ? '<b class="ink2">' + esc(f.brand) + '</b> · ' : ''}${esc(f.src === 'TACO' ? 'Natural · ' + (f.vsrc || 'TACO') : f.src === 'IBGE' ? 'Genérico · ' + (f.vsrc || 'IBGE') : f.src)} · ${fmt(f.kcal)} kcal/100 g · P ${fmt(f.p, 1)} g</div></div>${Food.brandy(f) ? '<span class="pill">Varia por marca</span>' : S().fav.includes(f.ref) ? '<span class="pill">Favorito</span>' : ''}</div>`; }
  function renderFS() {
    const el = $('#fs-res'); if (!el) return;
    const s = S();
    if (!Food.norm(fs.q)) {
      const rec = s.recent.map(Food.get).filter(Boolean).slice(0, 15), fav = s.fav.map(Food.get).filter(Boolean);
      el.innerHTML = (fav.length ? `<span class="lbl">Favoritos</span><div class="list">${fav.map(foodRow).join('')}</div>` : '') + (rec.length ? `<span class="lbl">Recentes</span><div class="list">${rec.map(foodRow).join('')}</div>` : '') + (!fav.length && !rec.length ? '<p class="empty">Comece a digitar. Os naturais aparecem primeiro, depois os de marca.</p>' : '');
      return;
    }
    const local = Food.search(fs.q, 30);
    const gen = local.filter(f => f.src === 'TACO' || f.src === 'IBGE'), nat = gen.filter(f => !Food.brandy(f)), avg = gen.filter(f => Food.brandy(f)), mine = local.filter(f => f.src !== 'TACO' && f.src !== 'IBGE');
    // industrializado (açaí, chocolate, miojo...): marca primeiro; a média genérica fica por último, com aviso
    const typedBrand = Food.brandIn(Food.norm(fs.q)) && mine.length; // digitou a marca ("sassami swift"): marcas no topo
    const brandFirst = typedBrand || (avg.length && avg.length >= nat.length);
    const shown = {}; mine.forEach(f => shown[f.ref] = 1);
    const rem = fs.remote.filter(f => !shown[f.ref]);
    const avgHtml = avg.length ? `<span class="lbl">Média genérica (cada marca é diferente)</span><p class="tiny mute">Para o valor certo, use o código de barras, a foto da tabela ou escolha a marca.</p><div class="list">${avg.slice(0, 6).map(foodRow).join('')}</div>` : '';
    const natHtml = nat.length ? `<span class="lbl">Naturais e genéricos (sem marca)</span><div class="list">${nat.slice(0, 14).map(foodRow).join('')}</div>` : '';
    const brandHtml = `<span class="lbl">Marcas</span><div class="list">${mine.slice(0, 20).map(foodRow).join('')}${rem.map(f => { App._remote = App._remote || {}; App._remote[f.ref] = f; return foodRow(f); }).join('')}</div>`;
    el.innerHTML = (brandFirst && !typedBrand ? `<div class="grid2"><button class="btn sm" type="button" data-act="scan">Código de barras</button><button class="btn sm" type="button" data-act="photo-label">Foto da tabela</button></div>` : '') +
      (typedBrand ? brandHtml + natHtml : natHtml + brandHtml) +
      (fs.loading && !mine.length ? '<p class="empty">Buscando marcas na internet…</p>' : fs.loading ? '' : (!mine.length && !fs.remote.length ? (fs.err ? '<p class="empty">A busca de marcas (Open Food Facts) não respondeu agora. <a href="#" data-act="fs-retry">Tentar de novo</a>, ou use o código de barras ou a foto da tabela.</p>' : '<p class="empty">Nenhuma marca encontrada com esse nome. Tente o código de barras ou a foto da tabela.</p>') : '')) +
      avgHtml +
      (!gen.length && !mine.length && !fs.remote.length && !fs.loading ? `<button class="btn block" type="button" data-act="custom-new" data-arg="${esc(fs.q)}">Criar “${esc(fs.q)}” manualmente</button>` : '');
  }
  function mealNow() { const h = new Date().getHours() + new Date().getMinutes() / 60; return h < 10.5 ? 'cafe' : h < 15 ? 'almoco' : h < 18.5 ? 'lanche' : h < 22.5 ? 'jantar' : 'ceia'; }
  function portion(ref, meal, existing) {
    let f = Food.get(ref) || (App._remote && App._remote[ref]);
    if (!f) return App.toast('Alimento não encontrado');
    if (f.remote || f.bundled) f = Food.saveRemote(f);
    const meas = Food.measures(f);
    let grams = existing ? existing.grams : (meas.find(m => m.label === 'unidade') || meas[0] || { g: 100 }).g;
    let label = existing ? existing.label : '';
    const fav = S().fav.includes(f.ref), un = f.unit === 'ml' ? 'ml' : 'g', branded = f.src !== 'TACO' && f.src !== 'IBGE';
    App.sheet(`<span class="lbl">${esc(f.src === 'TACO' ? 'Natural · ' + (f.vsrc || 'TACO') : f.src === 'IBGE' ? (f.vsrc ? 'Genérico sem marca · ' + f.vsrc : 'Genérico sem marca · IBGE POF 2008-2009') : f.src)}${f.brand ? ' · ' + esc(f.brand) : ''}</span><h2>${esc(f.name)}</h2>
      <div class="chips">${meas.map((m, i) => `<button type="button" class="chip" data-m="${i}">${esc(m.label)} · ${fmt(m.g)} g</button>`).join('')}<button type="button" class="chip" data-g="100">100 ${un}</button></div>
      <div class="grid2"><div class="field"><label for="pt-q">Quantidade</label><input class="input" id="pt-q" inputmode="decimal" value="1"></div><div class="field"><label for="pt-g">${un === 'ml' ? 'Mililitros' : 'Gramas'}</label><input class="input" id="pt-g" inputmode="decimal" value="${fmt(grams, 1).replace('.', '')}"></div></div>
      <div class="card tight"><div class="row between"><span class="big" id="pt-kcal">0</span><span class="mute">kcal</span></div><div class="macros small" id="pt-mac"></div></div>
      <div class="field"><label for="pt-meal">Refeição</label><select class="input" id="pt-meal">${MEALS.map(([m, l]) => `<option value="${m}" ${(existing ? existing.meal : meal) === m ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="grid2"><button class="btn" type="button" id="pt-fav">${fav ? 'Tirar dos favoritos' : 'Favoritar'}</button><button class="btn pri" type="button" id="pt-ok">${existing ? 'Salvar' : 'Adicionar'}</button></div>
      ${existing ? '<button class="btn danger block" type="button" id="pt-del">Remover</button>' : ''}<p class="tiny mute">Por 100 ${un}: ${fmt(f.kcal)} kcal · P ${fmt(f.p, 1)} · C ${fmt(f.c, 1)} · G ${fmt(f.g, 1)}${f.f != null ? ' · fibra ' + fmt(f.f, 1) : ''}${f.na != null ? ' · sódio ' + fmt(f.na) + ' mg' : ''}</p>
      ${Food.brandy(f) ? `<div class="note warn">Isto é uma média genérica. ${esc(f.name.split(',')[0])} muda muito de uma marca para outra (açúcar, xarope, recheio). Para anotar certo, use o código de barras ou a foto da tabela da embalagem.</div><div class="grid3"><button class="btn sm" type="button" data-act="scan">Código</button><button class="btn sm" type="button" data-act="photo-label">Foto</button><button class="btn sm" type="button" id="pt-brand">Marcas</button></div>` : ''}
      ${Food.alcohol(f) ? '<p class="tiny mute">Bebida alcoólica: as calorias entram no seu total do dia. Elas vêm do álcool (7 kcal por grama), por isso não aparecem em proteína, carboidrato ou gordura.</p>' : ''}
      ${branded && Food.sanity(f, un, true).length ? `<div class="note warn">Os números deste produto parecem errados: ${esc(Food.sanity(f, un, true)[0])}</div>` : ''}
      ${branded ? `<div class="card tight"><span class="lbl">${f.src === 'Open Food Facts' ? 'Dados da internet podem ter erro' : 'Valores do rótulo'}</span><p class="tiny mute">${f.src === 'Open Food Facts' ? 'Esses números vêm do Open Food Facts, preenchido por voluntários. Confira com a tabela da embalagem.' : 'Se algum número estiver diferente da embalagem, corrija aqui.'}</p><div class="grid2"><button class="btn sm" type="button" id="pt-photo">Conferir com foto</button><button class="btn sm ghost" type="button" id="pt-edit">Editar valores</button></div></div>` : ''}`);
    let unitG = null;
    const upd = () => { const c = Food.calc(f, grams); $('#pt-kcal').textContent = fmt(c.kcal); $('#pt-mac').innerHTML = `<div class="macro"><span class="mute tiny">Proteína</span><div class="v">${fmt(c.p, 1)} g</div></div><div class="macro"><span class="mute tiny">Carbo</span><div class="v">${fmt(c.c, 1)} g</div></div><div class="macro"><span class="mute tiny">Gordura</span><div class="v">${fmt(c.g, 1)} g</div></div>`; };
    const num = v => parseFloat(String(v).replace(',', '.')) || 0;
    $('#sheet-content').querySelectorAll('[data-m],[data-g]').forEach(b => b.onclick = () => { $$('#sheet-content .chip').forEach(x => x.classList.remove('on')); b.classList.add('on'); if (b.dataset.m != null) { const m = meas[+b.dataset.m]; unitG = m.g; label = '1 ' + m.label; } else { unitG = 100; label = ''; } $('#pt-q').value = '1'; grams = unitG; $('#pt-g').value = fmt(grams, 1).replace('.', ''); upd(); });
    $('#pt-q').oninput = () => { if (unitG == null) unitG = grams; const q = num($('#pt-q').value); grams = unitG * q; if (label) label = label.replace(/^[\d.,]+/, fmt(q, 2)); $('#pt-g').value = fmt(grams, 1).replace('.', ''); upd(); };
    $('#pt-g').oninput = () => { grams = num($('#pt-g').value); unitG = null; label = ''; $('#pt-q').value = '1'; upd(); };
    $('#pt-fav').onclick = () => { const s = S(); s.fav = s.fav.includes(f.ref) ? s.fav.filter(x => x !== f.ref) : [f.ref].concat(s.fav); Store.save(); $('#pt-fav').textContent = s.fav.includes(f.ref) ? 'Tirar dos favoritos' : 'Favoritar'; };
    $('#pt-ok').onclick = () => {
      if (!(grams > 0)) return App.toast('Informe a quantidade');
      const day = Store.day(App.foodDate || Store.dkey()), m = $('#pt-meal').value;
      if (existing) { const e = Food.entry(f, grams, m, label); e.id = existing.id; e.t = existing.t; const i = day.meals.findIndex(x => x.id === existing.id); day.meals[i] = e; }
      else day.meals.push(Food.entry(f, grams, m, label));
      Food.touchRecent(f.ref); Store.save(); App.closeSheet(); App.render(); App.toast((existing ? 'Atualizado: ' : 'Adicionado: ') + f.name.split(',')[0]);
    };
    const pre = () => ({ ref: f.ref, name: f.name, brand: f.brand, barcode: f.barcode, unit: f.unit, vals: { kcal: f.kcal, p: f.p, c: f.c, g: f.g, f: f.f, na: f.na }, measures: f.measures, meal: $('#pt-meal').value, fix: true });
    const pb = $('#pt-brand'); if (pb) pb.onclick = () => foodSearch($('#pt-meal').value, f.name.split(',')[0]);
    const ph = $('#pt-photo'); if (ph) ph.onclick = () => photoLabel(pre());
    const ed = $('#pt-edit'); if (ed) ed.onclick = () => customForm(pre());
    const del = $('#pt-del'); if (del) del.onclick = () => { const day = Store.day(App.foodDate || Store.dkey()); day.meals = day.meals.filter(x => x.id !== existing.id); Store.save(); App.closeSheet(); App.render(); };
    upd();
  }
  // formulário do alimento. o: { name, brand, barcode, ref, unit, vals, portion, measures, warn, missing, fix, meal, fromPhoto }
  function customForm(o, barcode) {
    if (typeof o !== 'object' || !o) o = { name: o || '', barcode: barcode || '' };
    const v = o.vals || {}, miss = o.missing || [], un = o.unit === 'ml' ? 'ml' : 'g';
    const val = k => v[k] == null ? '' : String(v[k]).replace('.', ',');
    const fld = (id, k, l) => `<div class="field"><label for="cf-${id}">${l}</label><input class="input ${miss.includes(k) ? 'bad' : ''}" id="cf-${id}" inputmode="decimal" value="${esc(val(k))}" placeholder="${miss.includes(k) ? 'confira' : ''}"></div>`;
    App.sheet(`<h2>${o.fix ? 'Corrigir com o rótulo' : o.fromPhoto ? 'Confira a tabela' : 'Criar alimento'}</h2>
      <p class="small mute">${o.fromPhoto ? 'Li a foto e preenchi abaixo. Compare com a embalagem e corrija o que estiver diferente.' : 'Copie do rótulo. Os valores podem ser por 100 g ou por porção.'}</p>
      ${(o.warn || []).map(w => `<div class="note">${esc(w)}</div>`).join('')}
      <div class="field"><label for="cf-n">Nome</label><input class="input ${o.fromPhoto && !o.name ? 'bad' : ''}" id="cf-n" value="${esc(o.name || '')}" placeholder="${o.fromPhoto ? 'Ex.: Suco Yaí maçã verde zero' : ''}"></div>
      <div class="grid2"><div class="field"><label for="cf-b">Marca</label><input class="input" id="cf-b" value="${esc(o.brand || '')}"></div><div class="field"><label for="cf-code">Código de barras</label><input class="input" id="cf-code" inputmode="numeric" value="${esc(o.barcode || '')}"></div></div>
      <div class="field"><label>Unidade</label><div class="seg" id="cf-unit"><button type="button" class="${un === 'g' ? 'on' : ''}" data-v="g">Sólido (g)</button><button type="button" class="${un === 'ml' ? 'on' : ''}" data-v="ml">Líquido (ml)</button></div></div>
      <div class="field"><label>Valores informados por</label><div class="seg" id="cf-base"><button type="button" class="on" data-v="100">100 <span class="cf-u">${un}</span></button><button type="button" data-v="porcao">Porção</button></div></div>
      <div class="field" id="cf-pg-w"><label for="cf-pg">Porção do rótulo (<span class="cf-u">${un}</span>)</label><input class="input" id="cf-pg" inputmode="decimal" value="${esc(o.portion ? String(o.portion).replace('.', ',') : '')}" placeholder="opcional"></div>
      <div class="grid2">${fld('k', 'kcal', 'Calorias (kcal)')}${fld('p', 'p', 'Proteína (g)')}${fld('c', 'c', 'Carboidrato (g)')}${fld('g', 'g', 'Gordura (g)')}${fld('f', 'f', 'Fibra (g)')}${fld('na', 'na', 'Sódio (mg)')}</div>
      ${UCBridge.native ? `<div class="grid2"><button class="btn sm ghost" type="button" id="cf-again">${o.fromPhoto ? 'Tirar outra foto' : 'Preencher com foto'}</button><span></span></div>` : ''}
      <button class="btn pri block" type="button" id="cf-ok">${o.fix ? 'Salvar correção' : 'Salvar e informar quanto comi'}</button>`);
    let base = '100', unit = un;
    $('#cf-base').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; base = b.dataset.v; $$('#cf-base button').forEach(x => x.classList.toggle('on', x === b)); $('#cf-pg').placeholder = base === '100' ? 'opcional' : 'obrigatório'; };
    $('#cf-unit').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; unit = b.dataset.v; $$('#cf-unit button').forEach(x => x.classList.toggle('on', x === b)); $$('#sheet-content .cf-u').forEach(x => x.textContent = unit); };
    const ag = $('#cf-again'); if (ag) ag.onclick = () => photoLabel(Object.assign({}, o, { name: $('#cf-n').value.trim(), brand: $('#cf-b').value.trim(), barcode: $('#cf-code').value.trim() }));
    $$('#sheet-content .input.bad').forEach(x => x.addEventListener('input', () => x.classList.remove('bad'), { once: true }));
    $('#cf-ok').onclick = () => {
      const g = id => { const x = parseFloat(($(id).value || '').replace(',', '.')); return isNaN(x) ? null : x; };
      const n = $('#cf-n').value.trim(); if (!n) { $('#cf-n').classList.add('bad'); $('#cf-n').focus(); return App.toast('Dê um nome ao alimento'); }
      if (g('#cf-k') == null) return App.toast('Informe as calorias');
      const pg = g('#cf-pg');
      let k = 1;
      if (base === 'porcao') { if (!pg) return App.toast('Informe o tamanho da porção'); k = 100 / pg; }
      // conferência dos números (por 100 g): avisa uma vez; tocar de novo salva assim mesmo
      const per = { kcal: g('#cf-k') * k, p: (g('#cf-p') || 0) * k, c: (g('#cf-c') || 0) * k, g: (g('#cf-g') || 0) * k, f: (g('#cf-f') || 0) * k, na: g('#cf-na') != null ? g('#cf-na') * k : null };
      const sig = JSON.stringify(per), warns = Food.sanity(per, unit, false, $('#cf-n').value + ' ' + $('#cf-b').value);
      if (warns.length && App._cfWarned !== sig) {
        App._cfWarned = sig; const box = $('#cf-warn') || Object.assign(document.createElement('div'), { id: 'cf-warn' });
        box.innerHTML = warns.map(w => `<div class="note warn">${esc(w)}</div>`).join('') + '<p class="tiny mute">Se está igual à embalagem, toque em salvar de novo.</p>';
        $('#cf-ok').before(box); box.scrollIntoView({ block: 'center', behavior: 'smooth' }); UCBridge.vibrate(60); return;
      }
      App._cfWarned = null;
      const meas = (o.measures || []).filter(m => !/^porção/.test(m.label));
      if (pg) meas.unshift({ label: 'porção do rótulo (' + fmt(pg, 1) + ' ' + unit + ')', g: pg });
      const f = Food.addCustom({ ref: o.ref, name: n, brand: $('#cf-b').value.trim(), barcode: $('#cf-code').value.trim() || null, kcal: Math.round(g('#cf-k') * k * 10) / 10, p: (g('#cf-p') || 0) * k, c: (g('#cf-c') || 0) * k, g: (g('#cf-g') || 0) * k, f: g('#cf-f') != null ? g('#cf-f') * k : null, na: g('#cf-na') != null ? Math.round(g('#cf-na') * k) : null, measures: meas, src: o.fromPhoto || o.fix ? 'Rótulo' : 'Manual', cat: 'Industrializados' });
      f.unit = unit; Store.save();
      const upd = o.ref ? Food.recalcEntries(f) : 0;
      App.toast(o.fix ? 'Corrigido com o rótulo' + (upd ? ' · ' + upd + (upd > 1 ? ' registros recalculados' : ' registro recalculado') : '') : 'Alimento salvo', 2800);
      if (o.fix) { App.closeSheet(); App.render(); return; }
      portion(f.ref, o.meal || fs.meal || mealNow());
    };
  }
  // foto da tabela nutricional → leitura no celular → formulário já preenchido
  function photoLabel(pre) {
    pre = pre || {};
    if (!UCBridge.native) return App.toast('A foto da tabela só funciona no app Android');
    App.sheet(`<h2>Foto da tabela nutricional</h2><p class="small ink2">Enquadre só a tabela, o mais reta possível e com boa luz. Depois você confere os números e diz quanto comeu.</p>
      <div class="grid2"><button class="btn pri" type="button" id="pl-cam">Tirar foto</button><button class="btn" type="button" id="pl-gal">Da galeria</button></div><div id="pl-st"></div>`);
    const go = async src => {
      $('#pl-st').innerHTML = '<p class="empty">Lendo a tabela…</p>';
      try {
        const ocr = await UCBridge.readLabel(src);
        const r = Label.parse(ocr);
        if (!r || !r.ok) { $('#pl-st').innerHTML = '<div class="note warn">Não consegui ler a tabela nessa foto. Tente mais perto, reta e sem reflexo, ou preencha na mão.</div><button class="btn ghost block" type="button" id="pl-man">Preencher na mão</button>'; $('#pl-man').onclick = () => customForm(Object.assign({}, pre, { fromPhoto: true })); return; }
        const vals = Object.assign({}, pre.vals || {}, r.per100), keys = ['kcal', 'p', 'c', 'g', 'f', 'na'];
        const missing = keys.filter(k => r.per100[k] == null);
        const diff = pre.vals ? keys.filter(k => r.per100[k] != null && pre.vals[k] != null && Math.abs(r.per100[k] - pre.vals[k]) > Math.max(0.5, Math.abs(pre.vals[k]) * 0.1)) : [];
        const L = { kcal: 'calorias', p: 'proteína', c: 'carboidrato', g: 'gordura', f: 'fibra', na: 'sódio' };
        const warn = r.warn.slice();
        if (diff.length) warn.unshift('A foto mostra valores diferentes dos que estavam salvos em: ' + diff.map(k => L[k] + ' (' + fmt(pre.vals[k], 1) + ' → ' + fmt(r.per100[k], 1) + ')').join(', ') + '.');
        Food.sanity(vals, r.unit || pre.unit || 'g', false, (pre.name || '') + ' ' + (pre.brand || '')).forEach(w => warn.push(w));
        if (missing.length) warn.push('Não li: ' + missing.map(k => L[k]).join(', ') + '. Preencha ou deixe vazio se a tabela não tiver.');
        customForm(Object.assign({}, pre, { vals, missing, portion: r.portion || pre.portion, unit: r.unit || pre.unit, warn, fromPhoto: true }));
      } catch (e) {
        const m = String(e.message || e);
        $('#pl-st').innerHTML = m === 'cancelado' ? '' : `<div class="note warn">${esc(m)}</div>`;
      }
    };
    $('#pl-cam').onclick = () => go('camera'); $('#pl-gal').onclick = () => go('gallery');
  }
  async function scan() {
    try {
      const r = await UCBridge.scanBarcode();
      const code = r && (r.code || r);
      if (!code) return;
      App.toast('Procurando ' + code + '…');
      const res = await Food.lookupBarcode(String(code));
      if (res.food) { App.toast(res.from === 'local' ? 'Já estava salvo' : 'Encontrado no Open Food Facts'); portion(res.food.ref, fs.meal || mealNow()); }
      else { App.toast(res.from === 'incomplete' ? 'Produto sem tabela nutricional. Preencha com o rótulo.' : 'Não achei esse código. Cadastre pelo rótulo.', 3200); customForm(res.name || '', String(code)); }
    } catch (e) {
      if (!UCBridge.native) { const code = prompt ? null : null; App.sheet(`<h2>Código de barras</h2><p class="small mute">A câmera só funciona no app Android. Digite os números do código:</p><input class="input" id="bc" inputmode="numeric"><button class="btn pri block" type="button" id="bc-ok">Buscar</button>`); $('#bc-ok').onclick = async () => { const c = $('#bc').value.trim(); if (!c) return; try { const res = await Food.lookupBarcode(c); if (res.food) portion(res.food.ref, mealNow()); else customForm(res.name || '', c); } catch (er) { App.toast('Sem internet para buscar'); customForm('', c); } }; void code; }
      else App.toast(String(e.message || e) === 'cancelado' ? 'Leitura cancelada' : 'Não deu para ler: ' + (e.message || e));
    }
  }
  function myFoods() {
    const s = S(), list = Object.values(s.custom);
    App.sheet(`<h2>Meus alimentos</h2><div class="list">${list.map(f => `<div class="li click" data-act="pick" data-arg="${esc(f.ref)}"><div class="grow"><div class="t">${esc(f.name)}</div><div class="s">${f.brand ? esc(f.brand) + ' · ' : ''}${esc(f.src)} · ${fmt(f.kcal)} kcal/100 g</div></div>${s.fav.includes(f.ref) ? '<span class="pill">Favorito</span>' : ''}</div>`).join('') || '<p class="empty">Você ainda não criou nem escaneou nenhum alimento.</p>'}</div><button class="btn block" type="button" data-act="custom-new">Criar alimento</button>`);
  }

  // ---------- BIKE ----------
  function vBike() {
    const R = Bike.R, s = S();
    const mode = R.on ? R.mode : (App.bikeMode || (s.settings.ebike ? 'ebike' : 'bike'));
    return `<div class="hero"><h1>Ar livre</h1></div>
    ${!R.on && mode === 'ebike' ? `<div class="field"><label>Assistência do motor (muda o gasto)</label><div class="seg">${[['alta', 'Muita'], ['baixa', 'Pouca'], ['sem', 'Desligado']].map(([v, l]) => `<button type="button" class="${(s.settings.ebikeAssist || 'alta') === v ? 'on' : ''}" data-act="ebike-assist" data-arg="${v}">${l}</button>`).join('')}</div></div>` : ''}
    ${R.on ? '' : `<div class="chips">${Object.entries(Bike.MODES).map(([k, l]) => `<button type="button" class="chip ${mode === k ? 'on' : ''}" data-act="bike-mode" data-arg="${k}">${l}</button>`).join('')}</div>`}
    <div class="card"><div class="row between"><span class="lbl">${R.on ? (R.paused ? 'Pausado' : 'Gravando · ' + Bike.MODES[R.mode]) : 'Velocidade atual'}</span>${R.on ? '<span class="pill" id="bk-gps">Procurando GPS…</span>' : ''}</div>
      <div class="speed-wrap"><span class="huge" id="bk-speed">0</span><span class="mute" style="padding-bottom:10px">km/h</span></div>
      <div class="grid3"><div><span class="lbl">Distância</span><div class="num" style="font-size:1.3rem;font-weight:800"><span id="bk-dist">0,00</span> <span class="tiny mute">km</span></div></div><div><span class="lbl">Tempo</span><div class="num" style="font-size:1.3rem;font-weight:800" id="bk-time">0:00</div></div><div><span class="lbl">Média</span><div class="num" style="font-size:1.3rem;font-weight:800"><span id="bk-avg">0,0</span> <span class="tiny mute">km/h</span></div></div><div><span class="lbl">Máxima</span><div class="num" style="font-size:1.3rem;font-weight:800"><span id="bk-max">0,0</span></div></div><div><span class="lbl">Subida</span><div class="num" style="font-size:1.3rem;font-weight:800"><span id="bk-gain">0</span> <span class="tiny mute">m</span></div></div><div><span class="lbl">Gasto</span><div class="num" style="font-size:1.3rem;font-weight:800"><span id="bk-kcal">0</span> <span class="tiny mute">kcal</span></div></div></div>
      <div class="map" id="bk-map"></div>
      ${R.on ? `<div class="grid2"><button class="btn" type="button" data-act="bike-pause">${R.paused ? 'Continuar' : 'Pausar'}</button><button class="btn pri" type="button" data-act="bike-stop">Finalizar e salvar</button></div>` : `<button class="btn pri block" type="button" data-act="bike-start" data-arg="${mode}">Começar ${Bike.MODES[mode].toLowerCase()}</button>`}
      <p class="tiny mute">O GPS continua gravando com a tela desligada (aparece uma notificação fixa). O mapa precisa de internet; a gravação não.</p></div>
    <div class="card"><span class="lbl">Navegar</span><input class="input" id="nav-q" placeholder="Para onde? Endereço ou lugar" aria-label="Destino"><div class="grid2"><button class="btn" type="button" data-act="nav" data-arg="gmaps">Google Maps</button><button class="btn" type="button" data-act="nav" data-arg="waze">Waze</button></div><p class="tiny mute">Abre a rota de bike no Google Maps ou a navegação no Waze, com trânsito e alertas em tempo real.</p></div>
    <div class="card"><span class="lbl">Percursos salvos</span><div class="list">${s.rides.map(r => `<div class="li click" data-act="ride" data-arg="${r.id}"><div class="grow"><div class="t">${Bike.MODES[r.mode]} · ${fmt(r.dist / 1000, 2)} km</div><div class="s">${dateLabel(r.d)} · ${Bike.fmtT(r.secs)} · média ${fmt(r.moving ? r.dist / r.moving * 3.6 : 0, 1)} km/h</div></div><span class="kcal">${fmt(r.kcal)} kcal</span></div>`).join('') || '<p class="empty">Nenhum percurso ainda.</p>'}</div></div>`;
  }
  App.openRide = id => {
    const r = S().rides.find(x => x.id === id); if (!r) return;
    App.sheet(`<span class="lbl">${dateLabel(r.d)} · ${new Date(r.t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span><h2>${Bike.MODES[r.mode]} · ${fmt(r.dist / 1000, 2)} km</h2><div class="map" id="ride-map"></div>
      <div class="grid3"><div class="tile"><span class="lbl">Tempo</span><span class="v">${Bike.fmtT(r.secs)}</span></div><div class="tile"><span class="lbl">Média</span><span class="v">${fmt(r.moving ? r.dist / r.moving * 3.6 : 0, 1)}</span><span class="tiny mute">km/h em movimento</span></div><div class="tile"><span class="lbl">Máxima</span><span class="v">${fmt(r.max, 1)}</span><span class="tiny mute">km/h</span></div><div class="tile"><span class="lbl">Subida</span><span class="v">${fmt(r.gain)} m</span></div><div class="tile"><span class="lbl">Gasto</span><span class="v">${fmt(r.kcal)}</span><span class="tiny mute">kcal</span></div><div class="tile"><span class="lbl">Parado</span><span class="v">${Bike.fmtT(Math.max(0, r.secs - r.moving))}</span></div></div>
      <div class="grid2"><button class="btn" type="button" data-act="ride-maps" data-arg="${r.id}">Abrir no Google Maps</button><button class="btn" type="button" data-act="ride-gpx" data-arg="${r.id}">Compartilhar GPX</button></div><button class="btn danger block" type="button" data-act="ride-del" data-arg="${r.id}">Apagar percurso</button>`);
    const m = Bike.mountMap($('#ride-map'), r.pts, false); App._sheetClose = () => { if (m) try { m.map.remove(); } catch (e) {} };
  };

  // ---------- PERFIL ----------
  function vPerfil() {
    const s = S(), p = s.profile, g = Store.goals(), R = s.settings.reminders, perm = UCBridge.permissions();
    const rem = (key, label, extra) => `<div class="li"><div class="grow"><div class="t">${label}</div><div class="s">${extra || ''}</div></div><input type="checkbox" class="switch" data-act="rem-toggle" data-arg="${key}" ${R[key].on ? 'checked' : ''} aria-label="${label}"></div>`;
    const pst = v => v === 'granted' ? 'Liberado' : v === 'web' ? 'Só no app' : 'Pendente';
    return `<div class="hero"><span class="lbl">Perfil</span><h1>${esc(p.name || 'Você')}</h1></div>
    <div class="card"><span class="lbl">Dados</span>
      <div class="grid2"><div class="field"><label for="pf-name">Nome</label><input class="input" id="pf-name" data-pf="name" value="${esc(p.name)}"></div><div class="field"><label for="pf-birth">Nascimento</label><input class="input" id="pf-birth" type="date" data-pf="birth" value="${esc(p.birth)}"></div><div class="field"><label for="pf-h">Altura (cm)</label><input class="input" id="pf-h" inputmode="numeric" data-pf="height" value="${esc(p.height)}"></div><div class="field"><label for="pf-w">Peso (kg)</label><input class="input" id="pf-w" inputmode="decimal" data-pf="weight" value="${esc(Store.weightNow())}"></div></div>
      <div class="field"><label>Objetivo</label><div class="seg">${[['perder', 'Perder gordura'], ['manter', 'Manter'], ['ganhar', 'Ganhar massa']].map(([v, l]) => `<button type="button" class="${p.goal === v ? 'on' : ''}" data-act="pf-set" data-key="goal" data-arg="${v}">${l}</button>`).join('')}</div></div>
      <div class="field"><label>Ritmo</label><div class="seg">${[['lento', 'Tranquilo'], ['normal', 'Normal'], ['rapido', 'Agressivo']].map(([v, l]) => `<button type="button" class="${p.pace === v ? 'on' : ''}" data-act="pf-set" data-key="pace" data-arg="${v}">${l}</button>`).join('')}</div></div>
      <div class="field"><label for="pf-act">Atividade</label><select class="input" id="pf-act" data-pf="activity">${Object.entries(Store.ACT).map(([k, v]) => `<option value="${k}" ${p.activity === k ? 'selected' : ''}>${v[1]}</option>`).join('')}</select></div></div>
    <div class="card"><span class="lbl">Metas diárias</span><div class="grid2"><div class="tile"><span class="lbl">Calorias</span><span class="v">${fmt(g.kcal)}</span><span class="tiny mute">gasto estimado ${fmt(g.tdee)}</span></div><div class="tile"><span class="lbl">Proteína</span><span class="v">${g.prot} g</span></div><div class="tile"><span class="lbl">Carboidrato</span><span class="v">${g.carb} g</span></div><div class="tile"><span class="lbl">Gordura</span><span class="v">${g.fat} g</span></div><div class="tile"><span class="lbl">Água</span><span class="v">${fmt(g.water)} ml</span></div><div class="tile"><span class="lbl">Basal</span><span class="v">${fmt(g.bmr)}</span><span class="tiny mute">kcal em repouso</span></div></div>
      <p class="tiny mute">Gasto basal pela fórmula de Mifflin-St Jeor, multiplicado pelo nível de atividade. Proteína de 1,6 a 2,0 g por kg (com sobrepeso, sobre o peso de IMC 25). Água: 35 ml por kg. Para perder, o app tira 15 a 25% do gasto e nunca desce de 1.500 kcal (1.200 para mulheres). O gasto dos treinos já entra pelo nível de atividade, então não volta como caloria extra (só no perfil sedentário, que libera o gasto líquido do treino).</p>
      <button class="btn sm" type="button" data-act="goals-edit">Ajustar metas na mão</button></div>
    <div class="card"><span class="lbl">Equipamento que eu tenho</span><div class="chips">${Object.entries(EXDB.EQ_LABEL).map(([k, l]) => `<button type="button" class="chip ${s.eq.includes(k) ? 'on' : ''}" data-act="eq" data-arg="${k}">${l}</button>`).join('')}</div>
      <span class="lbl">Evitar exercícios que forcem</span><div class="chips">${[['joelho', 'Joelho'], ['ombro', 'Ombro'], ['lombar', 'Lombar'], ['punho', 'Punho']].map(([k, l]) => `<button type="button" class="chip ${s.lim.includes(k) ? 'on' : ''}" data-act="lim" data-arg="${k}">${l}</button>`).join('')}</div></div>
    <div class="card"><span class="lbl">Lembretes</span>
      <div class="li"><div class="grow"><div class="t">Modo insistente</div><div class="s">Repete a cada ${R.nagMin} min até você confirmar (até ${R.nagMax} vezes)</div></div><input type="checkbox" class="switch" data-act="rem-intrusive" ${R.intrusive ? 'checked' : ''} aria-label="Modo insistente"></div>
      ${rem('water', 'Beber água', 'A cada ' + R.water.every + ' min, das ' + R.water.start + ' às ' + R.water.end)}
      <div class="li"><div class="grow"><div class="t">Água sem filtro</div><div class="s">${s.settings.swear !== false ? 'Ligado: os avisos de água vêm com palavrão' : 'Desligado: avisos de água educados'}</div></div><input type="checkbox" class="switch" data-act="swear" ${s.settings.swear !== false ? 'checked' : ''} aria-label="Avisos de água com palavrão"></div>
      <div class="chips">${[30, 45, 60, 90, 120].map(m => `<button type="button" class="chip ${R.water.every === m ? 'on' : ''}" data-act="water-every" data-arg="${m}">${m} min</button>`).join('')}</div>
      <div class="grid2"><div class="field"><label for="rw-s">Acordo</label><input class="input" type="time" id="rw-s" data-rem="water.start" value="${R.water.start}"></div><div class="field"><label for="rw-e">Durmo</label><input class="input" type="time" id="rw-e" data-rem="water.end" value="${R.water.end}"></div></div>
      ${rem('meals', 'Refeições', R.meals.times.map(x => x[1]).join(' · '))}
      <div class="grid2">${R.meals.times.map((m, i) => `<div class="field"><label for="rm-${i}">${m[0]}</label><input class="input" type="time" id="rm-${i}" data-rem="meal.${i}" value="${m[1]}"></div>`).join('')}</div>
      ${rem('workout', 'Treino', 'Todo dia às ' + R.workout.time)}<input class="input" type="time" data-rem="workout.time" value="${R.workout.time}" aria-label="Horário do treino">
      ${rem('sleep', 'Hora de dormir', 'Às ' + R.sleep.time + ', para fechar o dia e largar o celular')}<input class="input" type="time" data-rem="sleep.time" value="${R.sleep.time}" aria-label="Horário de dormir">
      ${rem('mewing', 'Postura da língua (mewing)', 'A cada ' + R.mewing.every + ' min')}
      ${rem('weigh', 'Pesar de manhã', 'Às ' + R.weigh.time)}
      <button class="btn sm" type="button" data-act="rem-test">Testar notificação</button></div>
    <div class="card"><span class="lbl">Permissões do Android</span>
      <div class="li"><div class="grow"><div class="t">Notificações</div><div class="s">${pst(perm.notifications)}</div></div><button class="btn sm" type="button" data-act="perm" data-arg="notifications">Liberar</button></div>
      <div class="li"><div class="grow"><div class="t">Alarmes no horário exato</div><div class="s">${pst(perm.exactAlarms)}</div></div><button class="btn sm" type="button" data-act="perm" data-arg="exactAlarms">Liberar</button></div>
      <div class="li"><div class="grow"><div class="t">Sem limite de bateria</div><div class="s">${pst(perm.battery)}. No Poco/HyperOS, ative também o “Início automático” do app.</div></div><button class="btn sm" type="button" data-act="perm" data-arg="battery">Abrir</button></div>
      <div class="li"><div class="grow"><div class="t">Microfone</div><div class="s">${pst(perm.mic)}</div></div><button class="btn sm" type="button" data-act="perm" data-arg="mic">Liberar</button></div>
      <div class="li"><div class="grow"><div class="t">Localização (bike)</div><div class="s">${pst(perm.location)}</div></div><button class="btn sm" type="button" data-act="perm" data-arg="location">Liberar</button></div></div>
    <div class="card"><span class="lbl">Aparência</span><p class="tiny mute">Cor de destaque do app. O fundo continua preto.</p>
      <div class="swatches">${THEMES.map(([k, l, c]) => `<button type="button" class="swatch ${(s.settings.theme || 'padrao') === k ? 'on' : ''}" data-act="theme" data-arg="${k}" aria-label="Tema ${l}"><i style="background:${c}"></i>${l}</button>`).join('')}</div></div>
    <div class="card"><span class="lbl">Voz</span>
      <div class="li"><div class="grow"><div class="t">Treinador fala durante o treino</div></div><input type="checkbox" class="switch" data-act="set-bool" data-arg="voice" ${s.settings.voice ? 'checked' : ''} aria-label="Treinador fala"></div>
      <div class="li"><div class="grow"><div class="t">Mãos livres no treino</div><div class="s">Fica ouvindo “pausa”, “próximo”, “feito”, “volta”</div></div><input type="checkbox" class="switch" data-act="set-bool" data-arg="handsFree" ${s.settings.handsFree ? 'checked' : ''} aria-label="Mãos livres"></div>
      <div class="field"><label>Voz da treinadora</label><div class="list" id="voice-list">${voiceList()}</div><div class="grid2"><div class="field"><label for="v-rate">Velocidade</label><input type="range" id="v-rate" min="0.7" max="1.3" step="0.02" value="${s.settings.vRate || 0.98}"></div><div class="field"><label for="v-pitch">Tom</label><input type="range" id="v-pitch" min="0.8" max="1.4" step="0.02" value="${s.settings.vPitch || 1.06}"></div></div><div class="grid2"><button class="btn sm" type="button" data-act="voice-test">Ouvir</button><button class="btn sm ghost" type="button" data-act="voice-more">Baixar mais vozes</button></div><p class="tiny mute">As vozes vêm do motor de voz do Google no celular. Se aparecerem poucas, toque em “Baixar mais vozes” e instale o pacote de português (Brasil).</p></div>
      <div class="grid2"><div class="field"><label for="cup">Meu copo (ml)</label><input class="input" id="cup" inputmode="numeric" data-set="cupMl" value="${s.settings.cupMl}"></div><div class="field"><label for="bot">Minha garrafa (ml)</label><input class="input" id="bot" inputmode="numeric" data-set="bottleMl" value="${s.settings.bottleMl}"></div></div></div>
    <div class="card"><span class="lbl">Dados</span><p class="tiny mute">Tudo fica salvo só neste celular. Faça um backup de vez em quando.</p><div class="grid2"><button class="btn" type="button" data-act="backup">Exportar backup</button><button class="btn" type="button" data-act="restore">Importar backup</button></div><button class="btn danger block" type="button" data-act="wipe">Apagar tudo</button></div>
    <div class="card"><span class="lbl">Sobre</span><p class="small"><b>Uncrowned Train</b> · UncrownedLabs<br><span class="mute">por Vinicius Andrade · versão ${esc(UCBridge.appVersion())}</span></p><p class="tiny mute">Alimentos: TACO 4ª ed., NEPA/UNICAMP, 2011. Medidas caseiras: IBGE, POF 2008-2009 (mapeamento do projeto taco-br-mcp). Produtos de marca: Open Food Facts (ODbL). Gasto calórico: 2024 Adult Compendium of Physical Activities (Herrmann et al., J Sport Health Sci 2024), com o MET corrigido pelo gasto basal (Mifflin-St Jeor). Mapas: OpenStreetMap. Este app não substitui orientação de médico, nutricionista ou educador físico.</p></div>`;
  }
  function voiceList() {
    const vs = UCBridge.voices(), cur = S().settings.voiceName;
    if (!vs.length) return '<p class="empty">Nenhuma voz em português encontrada.</p>';
    return vs.map((v, i) => { const on = cur ? cur === v.name : v.current; const label = 'Voz ' + (i + 1) + (/female|afs|pte|ptf/i.test(v.name) ? ' · feminina' : /male|ptd|ptc/i.test(v.name) ? ' · masculina' : '') + (v.net ? ' · precisa de internet' : ''); return `<div class="li click" data-act="voice-pick" data-arg="${esc(v.name)}"><div class="grow"><div class="t">${label}</div><div class="s">${esc(v.name)}</div></div>${on ? '<span class="pill solid">Em uso</span>' : ''}</div>`; }).join('');
  }
  function recalc() { const s = S(); if (!s.goalsManual) s.goals = Store.calcGoals(s.profile); Store.save(); }

  // ---------- lembretes nativos ----------
  function syncReminders() {
    const s = S(), R = s.settings.reminders, g = Store.goals(); const items = [];
    if (R.water.on) {
      const meta = 'Meta de hoje: ' + fmt(g.water) + ' ml.', cup = s.settings.cupMl;
      // o Android sorteia uma destas a cada aviso (inclusive nas repetições do modo insistente)
      const variants = s.settings.swear !== false ? [
        ['Bebe água nessa porra, krl', 'Um copo de ' + cup + ' ml agora. ' + meta],
        ['Hora de tomar água, seu filho da puta', 'Levanta e enche esse copo. ' + meta],
        ['Quer ter pedra no rim, caralho?', 'Bebe água nessa porra. ' + meta],
        ['Cadê a água, porra?', 'Tá enrolando desde a última vez. Um copo agora. ' + meta],
        ['Tá seco igual uva passa, caralho', 'Bebe ' + cup + ' ml agora e para de frescura. ' + meta],
        ['Teu rim mandou avisar: bebe água, porra', 'Ele tá trabalhando dobrado por tua causa. ' + meta],
        ['Larga esse celular e bebe água, krl', 'Só um copo. Não vai morrer. ' + meta],
        ['Ô desgraça, a água!', 'Shape não sai com o corpo desidratado, caralho. ' + meta]
      ] : [
        ['Hora da água', 'Bebe um copo agora. ' + meta],
        ['Um copo de água agora', 'Hidratado rende mais no treino. ' + meta],
        ['Pausa para a água', 'Levanta, enche o copo e volta. ' + meta],
        ['Seus rins agradecem', 'Bebe ' + cup + ' ml agora. ' + meta]
      ];
      items.push({ id: 1, kind: 'interval', every: R.water.every, start: R.water.start, end: R.water.end, title: variants[0][0], text: variants[0][1], variants, icon: 'water', action: 'water', ml: cup });
    }
    if (R.mewing.on) items.push({ id: 2, kind: 'interval', every: R.mewing.every, start: R.mewing.start, end: R.mewing.end, title: 'Língua no céu da boca', text: 'Lábios fechados, dentes encostando de leve, respira pelo nariz. Queixo para trás.', action: 'ack', nag: false });
    if (R.meals.on) R.meals.times.forEach((m, i) => items.push({ id: 10 + i, kind: 'daily', time: m[1], title: m[0], text: 'Hora de comer. Depois, fala para o app o que você comeu.', action: 'open' }));
    if (R.workout.on) items.push({ id: 20, kind: 'daily', time: R.workout.time, title: 'Treino do dia', text: 'O treino de hoje já está montado. Bora?', action: 'open' });
    if (R.sleep.on) items.push({ id: 21, kind: 'daily', time: R.sleep.time, title: 'Hora de desligar', text: 'Larga o celular e vai dormir. Sono ruim trava o shape.', action: 'ack' });
    if (R.weigh.on) items.push({ id: 22, kind: 'daily', time: R.weigh.time, title: 'Pesagem', text: 'Pese em jejum, depois do banheiro, e fala o número para o app.', action: 'open' });
    UCBridge.setReminders({ intrusive: R.intrusive, nagMin: R.nagMin, nagMax: R.nagMax, items });
  }
  App.syncReminders = syncReminders;
  function applyPending() {
    const p = UCBridge.takePending(); let n = 0;
    p.forEach(a => { if (a.type === 'water') { const k = Store.dkey(new Date(a.t || Date.now())); Store.addWater(a.ml || S().settings.cupMl, k); n += a.ml || 0; } });
    if (n) App.toast('+' + n + ' ml de água pelas notificações');
  }

  // ---------- voz ----------
  const V = { open: false, text: '', actions: null };
  function voiceOpen(prompt) {
    V.open = true; V.text = ''; V.actions = null; V.prompt = prompt || 'Pode falar…';
    const el = $('#voice'); el.classList.add('open'); el.setAttribute('aria-hidden', 'false'); renderVoice();
    const ok = UCBridge.listen(); if (ok) $('#mic').classList.add('listening');
  }
  function voiceClose() { V.open = false; UCBridge.stopListen(); $('#mic').classList.remove('listening'); const el = $('#voice'); el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); el.innerHTML = ''; }
  function renderVoice() {
    const el = $('#voice');
    const acts = V.actions ? V.actions.map((a, i) => actionHtml(a, i)).join('') : '';
    el.innerHTML = `<div class="stack" style="gap:14px"><button class="btn sm ghost" type="button" id="v-x" style="align-self:flex-end">Fechar</button>
      <span class="lbl">${V.actions ? 'Entendi assim' : esc(V.prompt)}</span><div class="heard ${V.final ? '' : 'partial'}">${esc(V.text || '…')}</div>
      ${!V.actions ? '<div class="wave"><i></i><i></i><i></i><i></i><i></i></div>' : ''}
      ${acts}
      ${V.actions && V.actions.some(a => a.type !== 'unknown') ? '<button class="btn pri block" type="button" id="v-ok">Confirmar tudo</button>' : ''}
      <div class="row"><input class="input" id="v-type" placeholder="Ou digite aqui" aria-label="Digite o comando"><button class="btn" type="button" id="v-send">Enviar</button></div>
      ${V.actions ? '<button class="btn ghost block" type="button" id="v-again">Falar de novo</button>' : ''}</div>`;
    $('#v-x').onclick = voiceClose;
    $('#v-send').onclick = () => { const t = $('#v-type').value.trim(); if (t) handleHeard(t); };
    $('#v-type').onkeydown = e => { if (e.key === 'Enter') { const t = e.target.value.trim(); if (t) handleHeard(t); } };
    const ok = $('#v-ok'); if (ok) ok.onclick = confirmActions;
    const ag = $('#v-again'); if (ag) ag.onclick = () => { V.actions = null; V.text = ''; V.final = false; renderVoice(); UCBridge.listen(); $('#mic').classList.add('listening'); };
    el.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const [i, j] = b.dataset.rm.split('.').map(Number); if (j >= 0) V.actions[i].items.splice(j, 1); else V.actions.splice(i, 1); renderVoice(); });
  }
  function actionHtml(a, i) {
    const box = (ico, title, body) => `<div class="action"><span class="ico">${ico}</span><div class="grow" style="flex:1"><b>${title}</b>${body ? '<div class="small ink2">' + body + '</div>' : ''}</div><button class="btn sm ghost" type="button" data-rm="${i}.-1" aria-label="Remover">×</button></div>`;
    if (a.type === 'water') return box('A', '+ ' + fmt(a.ml) + ' ml de água', a.guessed ? 'Não ouvi a quantidade, usei 1 copo.' : '');
    if (a.type === 'sleep') return box('S', 'Dormiu ' + fmt(a.hours, 2) + ' h', 'Fica registrado em hoje.');
    if (a.type === 'weight') return box('P', 'Peso ' + fmt(a.kg, 1) + ' kg', 'As metas são recalculadas.');
    if (a.type === 'food') { const tot = a.items.reduce((s, it) => s + Food.calc(Food.get(it.ref), it.grams).kcal, 0); return `<div class="action"><span class="ico">C</span><div style="flex:1"><b>${MEAL_NAME[a.meal]} · ${fmt(tot)} kcal</b>${a.items.map((it, j) => `<div class="row between small" style="margin-top:6px"><span>${esc(it.name.split(',').slice(0, 3).join(','))}<br><span class="mute num">${it.label ? esc(it.label) + ' · ' : ''}${fmt(it.grams)} g${it.check ? ' · confira a quantidade' : ''}${it.brand ? ' · média genérica, varia por marca' : ''}</span></span><button class="btn sm ghost" type="button" data-rm="${i}.${j}" aria-label="Remover item">×</button></div>`).join('')}${a.miss.length ? `<div class="small" style="margin-top:6px;color:var(--bad)">Não achei: ${a.miss.map(esc).join(', ')}. Busque depois na aba Comida.</div>` : ''}</div></div>`; }
    if (a.type === 'workout') { const o = a.params; return box('T', 'Montar treino de ' + o.minutes + ' min', ({ corpo: 'corpo todo', superior: 'parte de cima', inferior: 'pernas', core: 'abdômen', cardio: 'cardio', pernas_core: 'pernas e abdômen' })[o.focus] + (o.eq ? (o.eq.length ? ' · ' + o.eq.map(x => EXDB.EQ_LABEL[x]).join(', ') : ' · sem peso') : '') + (o.noImpact ? ' · sem salto' : '')); }
    if (a.type === 'program') return box('T', a.id === 'aranha' ? 'Protocolo Aranha' : a.id === 'jaw' ? 'Treino de mandíbula' : '28 Dias em Casa', 'Abrir o treino');
    if (a.type === 'profile') return box('P', 'Atualizar perfil', Object.entries(a.data).map(([k, v]) => ({ age: 'idade', height: 'altura', weight: 'peso', goal: 'objetivo', sex: 'sexo', activity: 'atividade' })[k] + ': ' + esc(v)).join(' · '));
    if (a.type === 'nav') return box('→', 'Abrir ' + a.tab, '');
    if (a.type === 'bike') return box('B', a.cmd === 'start' ? 'Começar a gravar o percurso' : 'Finalizar o percurso', '');
    if (a.type === 'jawdone') return box('R', 'Marcar mandíbula como feita hoje', '');
    if (a.type === 'control') return box('▶', 'Comando: ' + a.cmd, '');
    return `<div class="action"><span class="ico">?</span><div><b>Não entendi</b><div class="small ink2">Tente: “tomei 500 ml de água”, “comi 2 ovos”, “dormi 7 horas”, “treino de 20 minutos sem peso”.</div></div></div>`;
  }
  function handleHeard(text) {
    V.text = text; V.final = true;
    const acts = Voice.parse(text, { cupMl: S().settings.cupMl, bottleMl: S().settings.bottleMl });
    if (acts.length === 1 && acts[0].type === 'control' && Player.isOpen()) { Player.command(acts[0].cmd); voiceClose(); return; }
    if (acts.length === 1 && ['nav', 'program', 'workout', 'bike', 'control'].includes(acts[0].type)) { V.actions = acts; confirmActions(); return; }
    V.actions = acts; renderVoice();
  }
  function confirmActions() {
    const s = S(), done = []; let openAfter = null;
    (V.actions || []).forEach(a => {
      if (a.type === 'water') { Store.addWater(a.ml); done.push('+' + a.ml + ' ml'); }
      else if (a.type === 'sleep') { Store.day().sleep = a.hours; Store.save(); done.push('sono ' + fmt(a.hours, 2) + ' h'); }
      else if (a.type === 'weight') { Store.logWeight(a.kg); done.push(fmt(a.kg, 1) + ' kg'); }
      else if (a.type === 'food') { const d = Store.day(); a.items.forEach(it => { const f = Food.get(it.ref); d.meals.push(Food.entry(f, it.grams, a.meal, it.label)); Food.touchRecent(f.ref); }); Store.save(); if (a.items.length) done.push(a.items.length + (a.items.length > 1 ? ' alimentos' : ' alimento')); }
      else if (a.type === 'profile') { const p = s.profile || {}; const d = a.data; if (d.age) { const y = new Date().getFullYear() - d.age; p.birth = p.birth && +p.birth.slice(0, 4) === y ? p.birth : y + '-01-01'; } ['height', 'weight', 'goal', 'sex', 'activity'].forEach(k => { if (d[k] != null) p[k] = d[k]; }); if (!s.profile) { ob.d = Object.assign(ob.d, p); if (ob.step < 1) ob.step = 1; } else { s.profile = p; if (d.weight) Store.logWeight(d.weight); recalc(); } done.push('perfil'); }
      else if (a.type === 'workout') { const o = a.params; App.genOpts = Object.assign({ minutes: 20, focus: 'corpo', eq: s.eq.slice(), level: s.level, noImpact: false, lim: s.lim.slice(), format: 'circuito' }, Object.fromEntries(Object.entries(o).filter(([k, v]) => v != null))); gen = EXDB.generate(Object.assign({}, App.genOpts, { seed: Date.now() })); openAfter = () => App.go('treino', 'montar'); }
      else if (a.type === 'program') { openAfter = () => { if (a.id === 'aranha') { if (a.session) previewAranha(a.session); else App.go('treino', 'programas'); } else if (a.id === 'jaw') App.go('treino', 'rosto'); else { App.go('treino', 'programas'); const n = nextP28(); if (n) previewP28(n); } }; }
      else if (a.type === 'nav') openAfter = () => App.go(a.tab, a.sub);
      else if (a.type === 'bike') openAfter = () => { App.go('bike'); if (a.cmd === 'start') Bike.start(App.bikeMode || (s.settings.ebike ? 'ebike' : 'bike')); else Bike.stop(); };
      else if (a.type === 'jawdone') { s.jaw.log[Store.dkey()] = true; Store.day().jaw = true; Store.save(); done.push('mandíbula'); }
      else if (a.type === 'control') Player.command(a.cmd);
    });
    voiceClose();
    if (done.length) App.toast('Anotado: ' + done.join(', '));
    if (openAfter) openAfter(); else App.render();
  }
  UCBridge.on('voice', ev => {
    if (!V.open) return;
    if (ev.type === 'partial') { V.text = ev.text; V.final = false; const h = $('#voice .heard'); if (h) { h.textContent = ev.text; h.classList.add('partial'); } }
    else if (ev.type === 'final') { $('#mic').classList.remove('listening'); handleHeard(ev.text); }
    else if (ev.type === 'error') { $('#mic').classList.remove('listening'); if (!V.actions) { V.prompt = ev.text && ev.text.length > 3 ? ev.text : 'Não ouvi nada. Toque em “Falar de novo” ou digite.'; V.actions = []; renderVoice(); } }
    else if (ev.type === 'end') $('#mic').classList.remove('listening');
  });

  // ---------- prévias de sessão ----------
  function previewP28(d) { const sess = EXDB.day28(d); App.sheet(sessionCard(sess, 'p28', d) + (S().p28.done[d] ? '<button class="btn ghost block" type="button" data-act="p28-undo" data-arg="' + d + '">Desmarcar dia ' + d + '</button>' : '<button class="btn ghost block" type="button" data-act="p28-mark" data-arg="' + d + '">Marcar como feito sem o player</button>')); thumbs(); }
  function previewAranha(k) { const sess = EXDB.ARANHA.sessions[k](S().aranha.level); if (!sess) return; App.sheet(sessionCard(sess, 'aranha', k)); thumbs(); }

  // ---------- cliques ----------
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-act],[data-close]'); if (!t) return;
    if (t.hasAttribute('data-close')) { App.sheetBack(); return; }
    const act = t.dataset.act, arg = t.dataset.arg, s = S();
    switch (act) {
      case 'go': App.go(arg, t.dataset.sub); break;
      case 'prog-filter': App.progFilter = arg; App.render(); break;
      case 'prog-open': App.remember(); App.progOpen = arg; App.render(); $('#view').scrollTop = 0; break;
      case 'prog-back': if (!App.goBack()) { App.progOpen = null; App.render(); } break;
      case 'calis-toggle': s.calis = t.checked; Store.save(); App.toast(t.checked ? 'Calistenia pura ligada: só peso do corpo' : 'Usando seus equipamentos'); break;
      case 'cal': { const ss = EXDB.calSession(arg, s.cal.week); App.sheet(sessionCard(ss, 'cal', arg)); thumbs(); break; }
      case 'hal': { const ss = EXDB.halSession(arg, s.hal.week); App.sheet(sessionCard(ss, 'hal', arg)); thumbs(); break; }
      case 'cal-week': s.cal.week = +arg; Store.save(); App.render(); break;
      case 'hal-week': s.hal.week = +arg; Store.save(); App.render(); break;
      case 'voice-pick': s.settings.voiceName = arg; Store.save(); UCBridge.setVoice(arg, +(s.settings.vRate || 0.98), +(s.settings.vPitch || 1.06)); setTimeout(() => UCBridge.speak('Oi, eu sou a sua treinadora. Bora treinar?'), 300); App.render(); break;
      case 'voice-test': UCBridge.setVoice(s.settings.voiceName || '', +(s.settings.vRate || 0.98), +(s.settings.vPitch || 1.06)); setTimeout(() => UCBridge.speak('Agachamento. Dez repetições. Comigo: um, dois, três. Isso, continua assim.'), 250); break;
      case 'voice-more': if (!UCBridge.openTtsSettings()) App.toast('Só no app Android'); break;
      case 'welcome-ok': App.welcome = false; App.render(); break;
      case 'sub': App.remember(); App.sub.treino = arg; App.progOpen = null; App.render(); break;
      case 'water': Store.addWater(+arg); UCBridge.vibrate(30); App.render(); App.toast('+' + arg + ' ml'); break;
      case 'water-undo': { const d = Store.day(); const l = d.waterLog.pop(); if (l) { d.water = Math.max(0, d.water - l[1]); Store.save(); App.render(); } break; }
      case 'water-custom': App.sheet(`<h2>Quanto de água?</h2><div class="chips">${[100, 150, 200, 300, 400, 600, 750, 1000].map(m => `<button type="button" class="chip" data-act="water-pick" data-arg="${m}">${m} ml</button>`).join('')}</div><input class="input" id="wc" inputmode="numeric" placeholder="ml"><button class="btn pri block" type="button" data-act="water-pick" data-arg="input">Adicionar</button>`); break;
      case 'water-pick': { const ml = arg === 'input' ? parseInt($('#wc').value, 10) : +arg; if (ml > 0) { Store.addWater(ml); App.closeSheet(); App.render(); App.toast('+' + ml + ' ml'); } break; }
      case 'sleep': App.sheet(`<h2>Quanto você dormiu?</h2><div class="chips">${[4, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9].map(h => `<button type="button" class="chip" data-act="sleep-pick" data-arg="${h}">${fmt(h, 1)} h</button>`).join('')}</div><input class="input" id="sl" inputmode="decimal" placeholder="Horas, ex.: 6,5"><button class="btn pri block" type="button" data-act="sleep-pick" data-arg="input">Salvar</button>`); break;
      case 'sleep-pick': { const h = arg === 'input' ? parseFloat($('#sl').value.replace(',', '.')) : +arg; if (h > 0 && h < 24) { Store.day().sleep = h; Store.save(); App.closeSheet(); App.render(); } break; }
      case 'weight': App.sheet(`<h2>Peso de hoje</h2><input class="input" id="wg" inputmode="decimal" value="${fmt(Store.weightNow(), 1)}"><button class="btn pri block" type="button" data-act="weight-ok">Salvar</button><p class="tiny mute">De manhã, em jejum, depois do banheiro. As metas são recalculadas.</p>`); setTimeout(() => $('#wg') && $('#wg').select(), 50); break;
      case 'weight-ok': { const v = parseFloat($('#wg').value.replace(',', '.')); if (v > 30 && v < 300) { Store.logWeight(v); App.closeSheet(); App.render(); App.toast('Peso salvo'); } break; }
      case 'p28': previewP28(+arg); break;
      case 'p28-mark': s.p28.done[arg] = Store.dkey(); Store.save(); App.closeSheet(); App.render(); break;
      case 'p28-undo': delete s.p28.done[arg]; Store.save(); App.closeSheet(); App.render(); break;
      case 'aranha': previewAranha(arg); break;
      case 'ar-level': s.aranha.level = +arg; Store.save(); App.render(); break;
      case 'start': case 'play': {
        const kind = t.dataset.kind; let sess, meta = {};
        if (kind === 'gen') sess = gen; else if (kind === 'p28') { sess = EXDB.day28(+arg); meta.p28 = +arg; } else if (kind === 'aranha') { sess = EXDB.ARANHA.sessions[arg](s.aranha.level); meta.aranha = arg; } else if (kind === 'jaw') { sess = EXDB.jawSession(s.jaw.week); meta.jaw = true; } else if (kind === 'cal') { sess = EXDB.calSession(arg, s.cal.week); meta.cal = arg; } else if (kind === 'hal') { sess = EXDB.halSession(arg, s.hal.week); meta.hal = arg; }
        if (!sess) { App.toast('Esse treino não está disponível'); break; }
        App.closeSheet(); Player.open(sess, meta, { auto: act === 'play' }); break;
      }
      case 'gen-opt': { const o = App.genOpts, k = t.dataset.key; if (k === 'noImpact') o.noImpact = !o.noImpact; else if (t.dataset.multi) { o[k] = o[k] || []; o[k] = o[k].includes(arg) ? o[k].filter(x => x !== arg) : o[k].concat(arg); } else o[k] = isNaN(+arg) ? arg : +arg; App.render(); break; }
      case 'gen': gen = EXDB.generate(Object.assign({}, App.genOpts, { seed: Date.now() })); App.render(); setTimeout(() => { const c = $$('#view .card'); if (c.length) c[c.length - 1].scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); break;
      case 'ex': exSheet(arg); break;
      case 'ex-g': App.exFilter.g = arg; App.render(); break;
      case 'jaw-week': s.jaw.week = +arg; Store.save(); App.render(); break;
      case 'url': e.preventDefault(); UCBridge.openUrl(arg); break;
      case 'food-day': App.foodDate = shift(App.foodDate || Store.dkey(), +arg); if (App.foodDate > Store.dkey()) App.foodDate = Store.dkey(); App.render(); break;
      case 'food-add': foodSearch(arg); break;
      case 'pick': portion(arg, fs.meal || mealNow()); break;
      case 'entry': {
        const d = Store.day(App.foodDate || Store.dkey()); const en = d.meals.find(x => x.id === arg); if (!en) break;
        // alimento que não existe mais (ex.: alimento criado e depois apagado): monta um a partir do próprio registro
        if (!Food.get(en.ref) && !(App._remote && App._remote[en.ref])) { const r = en.grams ? 100 / en.grams : 0; Store.S.custom[en.ref] = { ref: en.ref, name: en.name, kcal: Math.round(en.kcal * r * 10) / 10, p: en.p * r, c: en.c * r, g: en.g * r, f: en.f != null ? en.f * r : null, src: 'Registro antigo', measures: [], key: Food.norm(en.name), brand: '' }; Store.save(); }
        portion(en.ref, en.meal, en); break;
      }
      case 'scan': scan(); break;
      case 'photo-label': photoLabel({ meal: fs.meal || mealNow() }); break;
      case 'fs-retry': e.preventDefault(); fs.err = false; online(); break;
      case 'custom-new': customForm(arg || ''); break;
      case 'my-foods': myFoods(); break;
      case 'mic-ask': voiceOpen(arg); break;
      case 'bike-mode': App.bikeMode = arg; s.settings.ebike = arg === 'ebike'; Store.save(); App.render(); break;
      case 'theme': s.settings.theme = arg; Store.save(); App.applyTheme(); App.render(); break;
      case 'ebike-assist': s.settings.ebikeAssist = arg; Store.save(); App.render(); break;
      case 'bike-start': Bike.start(arg); break;
      case 'bike-pause': Bike.pause(); break;
      case 'bike-stop': Bike.stop(); break;
      case 'nav': { const q = ($('#nav-q').value || '').trim(); if (!q) return App.toast('Digite o destino'); UCBridge.openUrl(arg === 'waze' ? 'https://waze.com/ul?q=' + encodeURIComponent(q) + '&navigate=yes' : 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(q) + '&travelmode=bicycling'); break; }
      case 'ride': App.openRide(arg); break;
      case 'ride-maps': { const r = s.rides.find(x => x.id === arg); const u = r && Bike.gmapsRide(r); if (u) UCBridge.openUrl(u); break; }
      case 'ride-gpx': { const r = s.rides.find(x => x.id === arg); if (r) { if (!UCBridge.share('Percurso ' + r.d + '.gpx', Bike.gpx(r))) App.toast('GPX copiado'); } break; }
      case 'ride-del': s.rides = s.rides.filter(x => x.id !== arg); Store.save(); App.closeSheet(); App.render(); break;
      case 'pf-set': s.profile[t.dataset.key] = arg; recalc(); App.render(); break;
      case 'goals-edit': { const g = Store.goals(); App.sheet(`<h2>Metas na mão</h2><div class="grid2">${[['kcal', 'Calorias'], ['prot', 'Proteína (g)'], ['carb', 'Carboidrato (g)'], ['fat', 'Gordura (g)'], ['water', 'Água (ml)'], ['fiber', 'Fibra (g)']].map(([k, l]) => `<div class="field"><label for="g-${k}">${l}</label><input class="input" id="g-${k}" inputmode="numeric" value="${g[k]}"></div>`).join('')}</div><button class="btn pri block" type="button" data-act="goals-save">Salvar</button><button class="btn ghost block" type="button" data-act="goals-auto">Voltar ao cálculo automático</button>`); break; }
      case 'goals-save': { const g = Object.assign({}, Store.goals()); ['kcal', 'prot', 'carb', 'fat', 'water', 'fiber'].forEach(k => { const v = parseInt($('#g-' + k).value, 10); if (v > 0) g[k] = v; }); s.goals = g; s.goalsManual = true; Store.save(); App.closeSheet(); App.render(); syncReminders(); break; }
      case 'goals-auto': s.goalsManual = false; recalc(); App.closeSheet(); App.render(); syncReminders(); break;
      case 'eq': s.eq = s.eq.includes(arg) ? s.eq.filter(x => x !== arg) : s.eq.concat(arg); Store.save(); App.render(); break;
      case 'lim': s.lim = s.lim.includes(arg) ? s.lim.filter(x => x !== arg) : s.lim.concat(arg); Store.save(); App.render(); break;
      case 'rem-toggle': s.settings.reminders[arg].on = t.checked; Store.save(); syncReminders(); break;
      case 'swear': s.settings.swear = t.checked; Store.save(); syncReminders(); App.render(); App.toast(t.checked ? 'Avisos de água sem filtro' : 'Avisos de água sem palavrão'); break;
      case 'rem-intrusive': s.settings.reminders.intrusive = t.checked; Store.save(); syncReminders(); break;
      case 'water-every': s.settings.reminders.water.every = +arg; Store.save(); syncReminders(); App.render(); break;
      case 'rem-test': if (!UCBridge.testReminder('Teste do Uncrowned', 'Se você viu isso, os lembretes estão funcionando.')) App.toast('Notificações só funcionam no app Android'); break;
      case 'perm': if (!UCBridge.requestPermission(arg)) App.toast('Só no app Android'); setTimeout(() => App.render(), 1500); break;
      case 'set-bool': s.settings[arg] = t.checked; Store.save(); break;
      case 'backup': { const raw = JSON.stringify(s); if (!UCBridge.share('uncrowned-backup-' + Store.dkey() + '.json', raw)) App.toast('Backup copiado'); break; }
      case 'restore': App.sheet(`<h2>Importar backup</h2><p class="small mute">Cole aqui o conteúdo do backup. Isso substitui tudo o que está no app.</p><textarea class="input" id="rs"></textarea><button class="btn pri block" type="button" data-act="restore-ok">Importar</button>`); break;
      case 'restore-ok': try { const o = JSON.parse($('#rs').value); if (!o || typeof o !== 'object' || !('days' in o)) throw 0; Store.replace(o); App.closeSheet(); App.applyTheme(); App.render(); syncReminders(); App.toast('Backup importado'); } catch (er) { App.toast('Esse texto não é um backup válido'); } break;
      case 'wipe': App.sheet(`<h2>Apagar tudo?</h2><p class="mute">Perfil, comidas, treinos e percursos somem deste celular. Não dá para desfazer.</p><button class="btn danger block" type="button" data-act="wipe-ok">Apagar tudo</button><button class="btn ghost block" type="button" data-close>Cancelar</button>`); break;
      case 'wipe-ok': Store.reset(); ob = OB0(); App.closeSheet(); App.applyTheme(); App.go('hoje'); break;
    }
  });
  document.addEventListener('input', e => {
    const t = e.target, s = S();
    if (t.id === 'ex-q') { App.exFilter.q = t.value; clearTimeout(App._exq); App._exq = setTimeout(() => { App.render(); const q = $('#ex-q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 250); }
    if (t.dataset.test) { s.tests[t.dataset.test] = t.value; Store.save(); }
  });
  document.addEventListener('change', e => {
    const t = e.target, s = S();
    if (t.dataset.pf) { const k = t.dataset.pf; let v = t.value; if (k === 'height') v = parseFloat(v.replace(',', '.')); if (k === 'weight') { const w = parseFloat(v.replace(',', '.')); if (w > 30 && w < 300) Store.logWeight(w); } else { s.profile[k] = v; recalc(); } syncReminders(); }
    if (t.id === 'v-rate' || t.id === 'v-pitch') { s.settings[t.id === 'v-rate' ? 'vRate' : 'vPitch'] = +t.value; Store.save(); UCBridge.setVoice(s.settings.voiceName || '', +(s.settings.vRate || 0.98), +(s.settings.vPitch || 1.06)); }
    if (t.dataset.set) { const v = parseInt(t.value, 10); if (v > 0) { s.settings[t.dataset.set] = v; Store.save(); syncReminders(); } }
    if (t.dataset.rem) { const R = s.settings.reminders, [a, b] = t.dataset.rem.split('.'); if (a === 'meal') R.meals.times[+b][1] = t.value; else R[a][b] = t.value; Store.save(); syncReminders(); }
  });
  $$('#tabs [data-tab]').forEach(b => b.onclick = () => App.go(b.dataset.tab));
  $('#btn-profile').onclick = () => App.go('perfil');
  $('#btn-back').onclick = () => App.back();
  $('#mic').onclick = () => { if (Player.isOpen()) return; if (V.open) return voiceClose(); voiceOpen(); };
  // intenções vindas de notificações (ex.: abrir aba)
  UCBridge.on('intent', a => { if (a && a.tab) App.go(a.tab); applyPending(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { applyPending(); if (!Player.isOpen()) App.refresh(); } });
  window.addEventListener('popstate', () => {});
  App.back = () => { // botão voltar do Android
    if ($('#sheet').classList.contains('open')) { App.sheetBack(); return true; }
    if (V.open) { voiceClose(); return true; }
    if (Player.isOpen()) { Player.back(); return true; }
    if (App.goBack()) return true;
    if (App.tab !== 'hoje') { App.tab = 'hoje'; App.render(); return true; }
    return false;
  };

  App.applyTheme(); App.render(); applyPending(); if (S().profile) syncReminders();
  setTimeout(() => Food.loadBrands(), 2500); // base de marcas em segundo plano (busca por voz e por nome sem internet)
})();
