/* Estado do app, persistência e cálculos de metas. */
(function () {
  const KEY = 'uncrowned-v1';
  const N = window.UCNative;
  const DEF = () => ({
    v: 1,
    profile: null,
    goals: null,
    eq: [],
    lim: [],
    level: 1,
    settings: {
      voice: true, handsFree: false, cupMl: 250, bottleMl: 500,
      reminders: {
        intrusive: true, nagMin: 10, nagMax: 3,
        water: { on: true, every: 60, start: '08:00', end: '22:30' },
        meals: { on: true, times: [['Café da manhã', '07:30'], ['Almoço', '12:30'], ['Lanche', '16:00'], ['Jantar', '20:00']] },
        workout: { on: true, time: '18:30' },
        sleep: { on: true, time: '23:00' },
        mewing: { on: true, every: 120, start: '09:00', end: '21:00' },
        weigh: { on: false, time: '07:00' }
      },
      ebike: false,
      swear: true // lembretes de água sem filtro (palavrão); desliga em Perfil > Lembretes
    },
    days: {},
    custom: {},
    fav: [],
    recent: [],
    weights: [],
    tests: {},
    p28: { done: {} },
    aranha: { level: 1, done: {} },
    jaw: { week: 1, log: {} },
    cal: { week: 1, done: {} },
    hal: { week: 1, done: {} },
    calis: false,
    history: [],
    rides: []
  });
  let S;
  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) {}
    if (!raw && N && N.loadState) { try { raw = N.loadState(); } catch (e) {} }
    try { S = raw ? Object.assign(DEF(), JSON.parse(raw)) : DEF(); } catch (e) { S = DEF(); }
    const d = DEF();
    S.settings = Object.assign(d.settings, S.settings || {});
    S.settings.reminders = Object.assign(d.settings.reminders, S.settings.reminders || {});
  }
  let timer = null;
  function save() {
    clearTimeout(timer);
    timer = setTimeout(flush, 250);
  }
  function flush() {
    const raw = JSON.stringify(S);
    try { localStorage.setItem(KEY, raw); } catch (e) {}
    if (N && N.saveState) { try { N.saveState(raw); } catch (e) {} }
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function dkey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function day(k) { k = k || dkey(); if (!S.days[k]) S.days[k] = { water: 0, waterLog: [], sleep: null, meals: [], workouts: [], kcalOut: 0, jaw: false }; return S.days[k]; }
  function age(birth) { if (!birth) return 30; const b = new Date(birth + 'T12:00:00'); const n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--; return a; }
  const ACT = { sed: [1.2, 'Sedentário, trabalho sentado'], leve: [1.375, 'Leve, treino 1 a 3 vezes por semana'], mod: [1.55, 'Moderado, treino 3 a 5 vezes'], alto: [1.725, 'Alto, treino 6 a 7 vezes'], atleta: [1.9, 'Muito alto, treino pesado diário'] };
  // Mifflin-St Jeor (1990) para gasto basal; fator de atividade; metas
  function calcGoals(p) {
    const a = age(p.birth), w = +p.weight, h = +p.height;
    const bmr = 10 * w + 6.25 * h - 5 * a + (p.sex === 'f' ? -161 : 5);
    const tdee = bmr * (ACT[p.activity] || ACT.leve)[0];
    const pace = { perder: { lento: -0.15, normal: -0.2, rapido: -0.25 }, manter: { lento: 0, normal: 0, rapido: 0 }, ganhar: { lento: 0.05, normal: 0.1, rapido: 0.15 } }[p.goal || 'manter'][p.pace || 'normal'];
    let kcal = Math.round((tdee * (1 + pace)) / 10) * 10;
    const floor = p.sex === 'f' ? 1200 : 1500;
    kcal = Math.max(kcal, floor);
    // proteína 1,6 a 2,2 g/kg (ISSN); usa 2,0 para perder e ganhar, 1,6 para manter. Em sobrepeso, calcula sobre o peso-alvo aproximado (IMC 25)
    const bmi = w / Math.pow(h / 100, 2);
    const refW = bmi > 27 ? 25 * Math.pow(h / 100, 2) : w;
    const protPerKg = p.goal === 'manter' ? 1.6 : 2.0;
    const prot = Math.round(refW * protPerKg);
    const fat = Math.round(Math.max(0.6 * w, kcal * 0.25 / 9));
    const carb = Math.max(50, Math.round((kcal - prot * 4 - fat * 9) / 4));
    const water = Math.round(w * 35 / 50) * 50; // 35 ml por kg
    return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, prot, fat, carb, water, fiber: p.sex === 'f' ? 25 : 30, bmi: Math.round(bmi * 10) / 10 };
  }
  function goals() { if (!S.goals && S.profile) S.goals = calcGoals(S.profile); return S.goals || { kcal: 2000, prot: 120, fat: 60, carb: 230, water: 2500, fiber: 30, tdee: 2000 }; }
  function totals(k) {
    const d = day(k); const t = { kcal: 0, p: 0, c: 0, g: 0, f: 0 };
    d.meals.forEach(e => { t.kcal += e.kcal || 0; t.p += e.p || 0; t.c += e.c || 0; t.g += e.g || 0; t.f += e.f || 0; });
    return t;
  }
  function weightNow() { return S.weights.length ? S.weights[S.weights.length - 1].kg : (S.profile ? +S.profile.weight : 80); }
  function logWeight(kg, k) {
    k = k || dkey(); kg = Math.round(kg * 10) / 10;
    const ex = S.weights.find(w => w.d === k); if (ex) ex.kg = kg; else S.weights.push({ d: k, kg });
    S.weights.sort((a, b) => a.d < b.d ? -1 : 1);
    if (S.profile) { S.profile.weight = kg; if (!S.goalsManual) S.goals = calcGoals(S.profile); }
    save();
  }
  function addWater(ml, k) { const d = day(k); d.water = Math.max(0, d.water + ml); d.waterLog.push([Date.now(), ml]); save(); return d.water; }
  function streak(test) { let n = 0; const d = new Date(); if (!test(dkey(d))) d.setDate(d.getDate() - 1); while (test(dkey(d))) { n++; d.setDate(d.getDate() - 1); } return n; }

  load();
  window.Store = { get S() { return S; }, save, flush, dkey, day, age, calcGoals, goals, totals, weightNow, logWeight, addWater, streak, ACT, reset() { S = DEF(); flush(); }, replace(obj) { S = Object.assign(DEF(), obj); flush(); } };
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
})();
