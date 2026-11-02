/* Entende frases faladas em português e transforma em ações.
   Ex.: "hoje dormi 6 horas e meia, tomei dois copos de água e comi 2 ovos e 4 colheres de arroz" */
(function () {
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s,.:;/-]/g, ' ').replace(/\s+/g, ' ').trim();
  const UN = { zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300, quatrocentos: 400, quinhentos: 500, quinhentas: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900, mil: 1000, meia: 0.5, meio: 0.5 };
  // troca números por extenso por dígitos ("duzentos e cinquenta" -> 250, "um e meio" -> 1.5)
  function words2num(s) {
    const toks = s.split(' '); const out = [];
    for (let i = 0; i < toks.length; i++) {
      const w = toks[i];
      if (UN[w] != null && !(w === 'meia' || w === 'meio') || (/^\d+([.,]\d+)?$/.test(w))) {
        let total = 0, cur = /^\d/.test(w) ? parseFloat(w.replace(',', '.')) : UN[w], j = i;
        while (j + 2 < toks.length && toks[j + 1] === 'e' && (UN[toks[j + 2]] != null)) {
          const nx = UN[toks[j + 2]];
          if (nx === 0.5) { cur += 0.5; j += 2; break; }
          if (nx < cur || cur >= 100) { cur += nx; j += 2; } else break;
        }
        if (toks[j + 1] === 'mil') { cur *= 1000; j++; }
        total += cur; out.push(String(total)); i = j;
      } else if ((w === 'meia' || w === 'meio') && !(out.length && /^\d/.test(out[out.length - 1]))) { out.push('0.5'); }
      else out.push(w);
    }
    return out.join(' ');
  }
  const num = s => parseFloat(String(s).replace(',', '.'));
  const NUMRE = '(\\d+(?:[.,]\\d+)?)';

  function splitClauses(t) {
    return t.split(/;|\.(?!\d)|,(?!\d)\s*|\s+e\s+(?=(?:tambem\s+)?(?:tomei|bebi|dormi|comi|almocei|jantei|lanchei|pesei|treinei|fiz|acordei|to com|estou com|meu peso|no almoco|no jantar|no cafe|no lanche|de lanche|de manha|a noite))/).map(x => x && x.trim()).filter(Boolean);
  }

  function water(c, cfg) {
    if (!/(agua|h2o)/.test(c) && !/\b(tomei|bebi)\b/.test(c)) return null;
    if (!/agua/.test(c) && /(leite|cafe|suco|refri|cerveja|whey|cha|iogurte|vitamina)/.test(c)) return null;
    if (/agua de coco|agua tonica|agua com gas e/.test(c)) return null; // é bebida com caloria, vai para comida
    if (!/agua/.test(c)) { // "bebi uma garrafa de coca": se sobrar o nome de um alimento, não é água
      const rest = c.replace(/\b(tomei|bebi|hoje|agora|eu|um|uma|uns|umas|de|do|da)\b/g, ' ').replace(/\d+(\.\d+)?|\b(copos?|copao|garrafas?|garrafinhas?|latas?|ml|mililitros?|litros?|l)\b/g, ' ').replace(/\s+/g, ' ').trim();
      if (rest.length >= 3 && Food.guess(rest)) return null;
    }
    let m;
    if ((m = c.match(new RegExp(NUMRE + '\\s*(ml|mililitros?)')))) return { type: 'water', ml: Math.round(num(m[1])) };
    if ((m = c.match(new RegExp(NUMRE + '\\s*(l|litros?)\\b')))) return { type: 'water', ml: Math.round(num(m[1]) * 1000) };
    if (/\b(um|1) litro\b/.test(c) || /\blitro\b/.test(c)) return { type: 'water', ml: 1000 };
    if ((m = c.match(new RegExp(NUMRE + '\\s*(copos?|copao)')))) return { type: 'water', ml: Math.round(num(m[1]) * cfg.cupMl) };
    if ((m = c.match(new RegExp(NUMRE + '\\s*(garrafas?|garrafinhas?)')))) return { type: 'water', ml: Math.round(num(m[1]) * cfg.bottleMl) };
    if (/\bcopo\b/.test(c)) return { type: 'water', ml: cfg.cupMl };
    if (/garrafa/.test(c)) return { type: 'water', ml: cfg.bottleMl };
    if (/agua/.test(c)) return { type: 'water', ml: cfg.cupMl, guessed: true };
    return null;
  }
  function sleep(c) {
    if (!/\b(dormi|sono|dormindo)\b/.test(c)) return null;
    let m;
    if ((m = c.match(/das?\s+(\d{1,2})(?:[:h](\d{2}))?\s*(?:horas?)?\s*(?:ate|as|a)\s+(?:as\s+)?(\d{1,2})(?:[:h](\d{2}))?/))) {
      const a = +m[1] + (+m[2] || 0) / 60, b = +m[3] + (+m[4] || 0) / 60; let h = b - a; if (h <= 0) h += 24; return { type: 'sleep', hours: Math.round(h * 4) / 4 };
    }
    if ((m = c.match(new RegExp(NUMRE + '\\s*h(?:oras?)?(?:\\s*e\\s*' + NUMRE + '\\s*(?:min|minutos))?')))) { let h = num(m[1]); if (m[2]) h += num(m[2]) / 60; if (/\be (meia|0\.5)\b/.test(c.slice(c.indexOf(m[0])))) h += 0.5; return { type: 'sleep', hours: Math.round(h * 4) / 4 }; }
    return null;
  }
  function weight(c) {
    if (!/(pesei|peso|to com|estou com|balanca)/.test(c)) return null;
    const m = c.match(new RegExp(NUMRE + '\\s*(kg|quilos?|kilos?)?'));
    if (!m) return null; const v = num(m[1]); if (v < 30 || v > 300) return null;
    if (!m[2] && !/(pesei|peso|balanca)/.test(c)) return null;
    return { type: 'weight', kg: v };
  }
  const UNITS = [
    [/^(g|gr|gramas?)\b/, 'g'], [/^(kg|quilos?)\b/, 'kg'], [/^(ml|mililitros?)\b/, 'ml'], [/^(l|litros?)\b/, 'litro'],
    [/^colher(?:es)? de servir|^colher(?:es)? de arroz(?= \S)/, 'colher de arroz (de servir)'], [/^colher(?:es)? de sopa|^colher(?:es)?(?! de (?:cha|sobremesa))/, 'colher de sopa'], [/^colher(?:es)? de sobremesa/, 'colher de sobremesa'], [/^colher(?:es)? de cha/, 'colher de chá'],
    [/^conchas?/, 'concha'], [/^escumadeiras?/, 'escumadeira'], [/^fatias?\b/, 'fatia'], [/^pedacos?\b/, 'pedaço'], [/^copos? americanos?/, 'copo americano'], [/^copos?/, 'copo médio'], [/^xicaras? de cafe|^cafezinhos?/, 'xícara de café'], [/^xicaras?( de cha)?/, 'xícara de chá'],
    [/^unidades?|^un\b/, 'unidade'], [/^bifes?\b/, 'bife'], [/^files?\b/, 'filé'], [/^pratos?/, 'prato'], [/^porc(?:ao|oes)/, 'porção'], [/^latas?/, 'lata'], [/^(garrafas?|garrafinhas?)/, 'garrafa'], [/^potes?/, 'pote']
  ];
  const DEFAULT_G_EXTRA = { garrafa: 600 };
  const DEFAULT_G = { ...DEFAULT_G_EXTRA, 'copo médio': 240, 'copo americano': 150, 'xícara de chá': 200, 'xícara de café': 50, 'colher de sopa': 15, 'colher de sobremesa': 10, 'colher de chá': 5, 'concha': 120, 'fatia': 25, 'pedaço': 60, 'prato': 300, 'lata': 350, 'pote': 170, 'bife': 100, 'filé': 100, 'porção': 100, 'colher de arroz (de servir)': 45, 'escumadeira': 80 };
  const PL = { 'fatia': 'fatias', 'unidade': 'unidades', 'colher de sopa': 'colheres de sopa', 'colher de sobremesa': 'colheres de sobremesa', 'colher de chá': 'colheres de chá', 'colher de arroz (de servir)': 'colheres de arroz (de servir)', 'copo médio': 'copos médios', 'copo americano': 'copos americanos', 'concha': 'conchas', 'escumadeira': 'escumadeiras', 'bife': 'bifes', 'filé': 'filés', 'pedaço': 'pedaços', 'prato': 'pratos', 'lata': 'latas', 'pote': 'potes', 'xícara de chá': 'xícaras de chá', 'xícara de café': 'xícaras de café', 'porção': 'porções' };
  function niceLabel(l) {
    const m = String(l || '').match(/^(\d+(?:\.\d+)?) (.+)$/); if (!m) return l;
    const q = num(m[1]), u = m[2];
    return (q === 0.5 ? 'meia' : String(q).replace('.', ',')) + ' ' + (q > 1 && PL[u] ? PL[u] : u);
  }
  function foodItem(s) {
    s = s.replace(/^(de|do|da|uns|umas|um|uma|o|a|os|as)\s+/, '').trim();
    if (!s) return null;
    let qty = null, unit = null, m;
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*/))) { qty = num(m[1]); s = s.slice(m[0].length); }
    let tailUnit = null;
    if ((qty == null || qty === 1) && (m = s.match(/\s+(?:de\s+)?(\d+(?:\.\d+)?)\s*(ml|mililitros?|g|gr|gramas?|kg|quilos?)\b/))) { qty = num(m[1]); tailUnit = /^m/.test(m[2]) ? 'ml' : /^(kg|q)/.test(m[2]) ? 'kg' : 'g'; s = (s.slice(0, m.index) + s.slice(m.index + m[0].length)).trim(); } // "açaí de 500 ml\"
    const beforeUnit = s;
    if (tailUnit) unit = tailUnit;
    else for (const [re, u] of UNITS) { const mm = s.match(re); if (mm) { unit = u; s = s.slice(mm[0].length).replace(/^\s*(de|do|da)\s+/, '').trim(); break; } }
    if (!s && unit) { if (unit === 'xícara de café') s = 'cafe'; else { s = beforeUnit; unit = null; } }
    // "bife grelhado": se depois da medida sobrou só o preparo, a medida também é o alimento
    if (unit && /^(frit[oa]s?|cozid[oa]s?|grelhad[oa]s?|assad[oa]s?|acebolad[oa]s?|empanad[oa]s?|a milanesa|mal passad[oa]|ao ponto|bem passad[oa])$/.test(s)) s = beforeUnit;
    s = s.replace(/\b(cozid[oa]s?|grelhad[oa]s?)\b/g, m2 => m2).trim();
    if (!s || s.length < 2) return null;
    let f = Food.guess(s); if (!f) return { miss: s };
    // "3 fatias de pão": pão francês não tem fatia; procura um parecido que tenha a medida falada (pão de forma)
    if (unit && !/^(g|kg|ml|litro)$/.test(unit) && !Food.measures(f).some(x => x.label.startsWith(unit))) {
      const head = (f.key || '').split(/[ ,]/)[0];
      const alt = Food.search(s, 25).find(x => (x.key || '').split(/[ ,]/)[0] === head && Food.measures(x).some(y => y.label.startsWith(unit)) && !/\bcru[a]?\b/.test(x.key || ''));
      if (alt) f = alt;
    }
    let grams = 100, label = '', guessed = false;
    const meas = Food.measures(f);
    const findM = lbl => meas.find(x => x.label === lbl) || meas.find(x => x.label.startsWith(lbl));
    if (unit === 'g') grams = qty || 100;
    else if (unit === 'kg') grams = (qty || 1) * 1000;
    else if (unit === 'ml') grams = qty || 200;
    else if (unit === 'litro') { grams = (qty || 1) * 1000; label = niceLabel((qty || 1) + ' ' + ((qty || 1) > 1 ? 'litros' : 'litro')).replace(/^meia litro/, 'meio litro'); }
    else if (unit) {
      const mm = findM(unit) || (unit === 'fatia' || unit === 'pedaço' ? meas.find(x => x.label.startsWith(unit)) || meas[0] : null);
      // medida de volume (copo, xícara) num alimento seco sem essa medida na tabela: flocos e farinhas pesam ~0,4 g por ml
      const dry = /flocos|farinha|farelo|granola|cereal|\bpo\b|aveia|acucar|arroz, .*cru|feijao, .*cru/.test(f.key || '');
      const vol = /copo|xícara|caneca/.test(unit);
      const g = mm ? mm.g : (DEFAULT_G[unit] || 100) * (vol && dry ? 0.4 : 1);
      grams = g * (qty || 1); label = (qty || 1) + ' ' + unit; if (!mm) guessed = true;
    }
    else if (qty != null && qty > 20) grams = qty; // "100 de feijão": ninguém come 100 conchas, são gramas
    else { const u = (/^alface/.test(f.key || '') ? findM('prato raso') : null) || (f.kcal >= 600 ? findM('colher de chá') : null) || (/requeij|geleia|doce, de leite|maionese|catchup|ketchup|mostarda|creme de leite|leite, condensado/.test(f.key || '') ? findM('colher de sopa') : null) || findM('unidade') || findM('fatia') || findM('bife') || findM('filé') || (/^feijao/.test(f.key || '') ? findM('concha') : null) || findM('porção') || findM('copo') || findM('colher de sopa') || meas.slice().sort((a, b) => Math.abs(a.g - 60) - Math.abs(b.g - 60))[0] || null; if (qty != null && u) { grams = u.g * qty; label = qty + ' ' + (u.label === 'unidade' ? (qty > 1 ? 'unidades' : 'unidade') : u.label); } else if (qty != null && qty > 20) grams = qty; else if (u) { grams = u.g * (qty || 1); label = (qty || 1) + ' ' + u.label; } else { grams = 100 * (qty || 1); label = ''; } }
    return { ref: f.ref, name: f.name, grams: Math.round(grams), label: niceLabel(label), heard: s, unit, brand: Food.brandy(f), check: guessed || (!unit && !findM('unidade')) || grams > 1500 };
  }
  // "arroz feijao frango" sem separador vira três itens
  function splitBySyn(part) {
    if (/\d/.test(part)) return [part];
    const keys = Food.SYNR.map(s => s[0]);
    const w = part.split(' '); const segs = []; let i = 0, hits = 0, cur = [];
    while (i < w.length) {
      let found = 0;
      for (let k = Math.min(3, w.length - i); k >= 1; k--) { const ph = w.slice(i, i + k).join(' '); if (keys.includes(ph)) { found = k; break; } }
      if (found) { if (cur.length) { segs.push(cur.join(' ')); cur = []; } segs.push(w.slice(i, i + found).join(' ')); i += found; hits++; }
      else { if (segs.length && !cur.length && /^(de|do|da|integral|frito|frita|cozido|cozida|grelhado|grelhada|preto|carioca|doce|moida|frances|branco|desnatado|natural)$/.test(w[i])) { segs[segs.length - 1] += ' ' + w[i]; } else cur.push(w[i]); i++; }
    }
    if (cur.length) segs.push(cur.join(' '));
    return hits >= 2 ? segs : [part];
  }
  function food(c, hour) {
    const verb = c.match(/\b(comi|almocei|jantei|lanchei|belisquei|tomei cafe da manha|cafe da manha|no almoco|no jantar|de lanche|comendo|vou comer|adiciona|anota|registra|tomei|bebi)\b/);
    let body = c;
    if (verb) body = c.slice(c.indexOf(verb[0]) + verb[0].length);
    else if (!/^\d/.test(c)) return null;
    for (let i = 0; i < 4; i++) body = body.replace(/^\s*(hoje|agora|eu|de manha|a tarde|a noite|no cafe|no almoco|no jantar|de lanche|comi|almocei|jantei|lanchei|tomei|bebi|:)\b\s*:?/, '').trim();
    let meal = /cafe da manha|manha/.test(c) ? 'cafe' : /almo/.test(c) ? 'almoco' : /janta|jantei|noite/.test(c) ? 'jantar' : /lanch|beliscou|belisquei|tarde/.test(c) ? 'lanche' : null;
    const explicit = !!meal;
    if (!meal) meal = hour < 10.5 ? 'cafe' : hour < 15 ? 'almoco' : hour < 18.5 ? 'lanche' : 'jantar';
    const parts = [];
    body.split(/\s*(?:,|\s+e\s+|\s+com\s+|\s+mais\s+)\s*/).filter(Boolean).forEach(p => splitBySyn(p).forEach(x => parts.push(x)));
    const items = [], miss = [];
    let prevHead = null, prevUnit = null;
    parts.forEach(p => {
      p = p.trim();
      // "um ovo cozido e dois fritos": o segundo pedaço só tem o preparo, herda o alimento anterior
      const mm = p.match(/^((?:\d+(?:\.\d+)?\s+)?)(frit[oa]s?|cozid[oa]s?|grelhad[oa]s?|assad[oa]s?|crus?|cruas?|mexid[oa]s?)$/);
      if (mm && prevHead) p = mm[1] + prevHead + ' ' + mm[2];
      // "4 colheres de arroz e 2 de feijão": o 2 herda a medida anterior
      const m2 = p.match(/^(\d+(?:\.\d+)?)\s+de\s+(.+)$/);
      const UW = { 'copo médio': 'copo', 'xícara de chá': 'xicara', 'xícara de café': 'xicara de cafe', 'colher de arroz (de servir)': 'colher de servir', 'colher de chá': 'colher de cha', 'pedaço': 'pedaco', 'porção': 'porcao', 'filé': 'file', 'litro': 'litros' };
      if (m2 && prevUnit) p = m2[1] + ' ' + (UW[prevUnit] || prevUnit) + ' de ' + m2[2];
      const it = foodItem(p); if (!it) return;
      if (it.miss) miss.push(it.miss); else { items.push(it); prevHead = (it.heard || '').split(' ')[0]; prevUnit = it.unit || null; }
    });
    if (!items.length && !miss.length) return null;
    return { type: 'food', meal, items, miss, explicit };
  }
  function workout(c) {
    if (!/(treino|treinar|exercicio|malhar|circuito)/.test(c) || !/(monta|monte|cria|crie|gera|gere|quero|faz|faca|me da|preciso|bora|vamos)/.test(c)) return null;
    if (/(aranha|homem aranha|spider|tom holland)/.test(c)) { const k = /cindy/.test(c) ? 'cindy' : /escada/.test(c) ? 'escada' : /explosiv/.test(c) ? 'explosivo' : /ashwell|circuito/.test(c) ? 'ashwell' : null; return { type: 'program', id: 'aranha', session: k }; }
    if (/(mewing|mandibula|maxilar|rosto|queixo)/.test(c)) return { type: 'program', id: 'jaw' };
    if (/28 dias|desafio/.test(c)) return { type: 'program', id: 'p28' };
    const o = { minutes: 20, focus: 'corpo', eq: null, level: null, noImpact: false, lim: [], format: 'circuito' };
    let m; if ((m = c.match(/(\d+)\s*(min|minutos)/))) o.minutes = Math.min(90, Math.max(8, +m[1])); if (/meia hora/.test(c)) o.minutes = 30; if (/uma hora/.test(c)) o.minutes = 60;
    const perna = /(perna|gluteo|coxa|inferior|bunda)/.test(c), abd = /(abdomen|abdominal|barriga|core|abs)/.test(c);
    if (perna && abd) o.focus = 'pernas_core'; else if (perna) o.focus = 'inferior'; else if (abd) o.focus = 'core';
    else if (/(braco|peito|costas|ombro|superior|biceps|triceps)/.test(c)) o.focus = 'superior'; else if (/(cardio|queimar|suar|aerobico|fôlego|folego|hiit)/.test(c)) o.focus = 'cardio';
    if (/(sem peso|sem equipamento|sem nada|so o corpo|peso do corpo|em casa)/.test(c)) o.eq = [];
    const eq = []; if (/(halter|com peso|anilha)/.test(c)) eq.push('halteres'); if (/barra/.test(c)) eq.push('barra'); if (/elastico/.test(c)) eq.push('elastico'); if (/(cadeira|sofa|mesa)/.test(c)) eq.push('cadeira'); if (/academia/.test(c)) eq.push('halteres', 'barra', 'paralela', 'academia', 'cadeira', 'elastico');
    if (eq.length) o.eq = eq;
    if (/(iniciante|facil|leve|comecando|tranquilo)/.test(c)) o.level = 1; else if (/(medio|intermediario|moderado)/.test(c)) o.level = 2; else if (/(pesado|avancado|dificil|insano|brabo|monstro|puxado|forte)/.test(c)) o.level = 3;
    if (/(sem pular|sem salto|sem impacto|silencioso|vizinho)/.test(c)) o.noImpact = true;
    if (/joelho/.test(c)) { o.lim.push('joelho'); o.noImpact = true; } if (/ombro/.test(c) && /dor|machuc|lesao/.test(c)) o.lim.push('ombro'); if (/(lombar|coluna|costas doendo)/.test(c) && /dor|machuc|lesao|doendo/.test(c)) o.lim.push('lombar'); if (/punho/.test(c)) o.lim.push('punho');
    if (/(series|repeticoes|musculacao)/.test(c)) o.format = 'series';
    return { type: 'workout', params: o };
  }
  function control(c) {
    const map = [[/^(comecar|comeca|iniciar|inicia|start|bora|vai|valendo)\b/, 'start'], [/^(pausa|pausar|pare um pouco|espera|para um pouco)\b/, 'pause'], [/^(continua|continuar|volta a contar|segue|seguir)\b/, 'resume'], [/^(proximo|pula|pular|passa|avanca)\b/, 'next'], [/^(volta|voltar|anterior)\b/, 'prev'], [/^(feito|terminei|acabei|pronto|fiz)\b/, 'done'], [/^(mais uma volta|volta completa|uma volta|\+1)\b/, 'round'], [/^(parar treino|encerra|encerrar|sair do treino|finalizar)\b/, 'stop']];
    for (const [re, cmd] of map) if (re.test(c)) return { type: 'control', cmd };
    return null;
  }
  function nav(c) {
    if (/(abre|abrir|mostra|ir para|vai para)/.test(c)) {
      if (/bike|bicicleta|pedal/.test(c)) return { type: 'nav', tab: 'bike' };
      if (/comida|caloria|dieta|refeic/.test(c)) return { type: 'nav', tab: 'comida' };
      if (/perfil|ajuste|configura/.test(c)) return { type: 'nav', tab: 'perfil' };
      if (/mandibula|rosto|mewing/.test(c)) return { type: 'nav', tab: 'treino', sub: 'rosto' };
      if (/treino/.test(c)) return { type: 'nav', tab: 'treino' };
    }
    if (/(comeca|inicia|iniciar|começar).*(pedal|bike|bicicleta|corrida|caminhada)/.test(c)) return { type: 'bike', cmd: 'start' };
    if (/(para|parar|encerra|finaliza).*(pedal|bike|bicicleta|corrida|caminhada)/.test(c)) return { type: 'bike', cmd: 'stop' };
    if (/(mewing|mandibula|mordedor).*(fiz|feito|treinei)|(fiz|feito|treinei).*(mewing|mandibula|mordedor)/.test(c)) return { type: 'jawdone' };
    return null;
  }
  function profile(c) {
    const o = {}; let m;
    if ((m = c.match(/(\d{2})\s*anos/))) o.age = +m[1];
    if ((m = c.match(/(1[.,]\d{2})\s*(m|metro|de altura)?/)) || (m = c.match(/(1\d{2})\s*(cm|centimetros)/))) o.height = num(m[1]) < 3 ? Math.round(num(m[1]) * 100) : num(m[1]);
    if ((m = c.match(/(\d{2,3}(?:[.,]\d)?)\s*(kg|quilos?|kilos?)/))) o.weight = num(m[1]);
    if (/(perder|emagrecer|secar|definir)/.test(c)) o.goal = 'perder'; else if (/(ganhar|crescer|hipertrofia|massa|bulk)/.test(c)) o.goal = 'ganhar'; else if (/manter/.test(c)) o.goal = 'manter';
    if (/\b(mulher|feminino)\b/.test(c)) o.sex = 'f'; else if (/\b(homem|masculino)\b/.test(c)) o.sex = 'm';
    if (/sedentari|parado/.test(c)) o.activity = 'sed';
    return Object.keys(o).length >= 2 ? { type: 'profile', data: o } : null;
  }

  function parse(text, opts) {
    opts = opts || {};
    const cfg = { cupMl: (opts.cupMl || 250), bottleMl: (opts.bottleMl || 500) };
    const hour = opts.hour != null ? opts.hour : new Date().getHours() + new Date().getMinutes() / 60;
    let t = words2num(norm(text).replace(/\bpra\b/g, 'para').replace(/\bto\b/g, 'to'));
    t = t.replace(/(\d+(?:\.\d+)?)\s*(litros?|l)\s+e\s+0\.5/g, (a, n) => (num(n) + 0.5) + ' litros').replace(/(\d+(?:\.\d+)?)\s*(horas?|h)\s+e\s+0\.5/g, (a, n) => (num(n) + 0.5) + ' horas');
    t = t.replace(/(\d+)\s*e\s*meio\s*(litros?|l)\b/g, (a, n) => (num(n) + 0.5) + ' litros').replace(/(\d+)\s*e\s*meia\s*(horas?|h)\b/g, (a, n) => (num(n) + 0.5) + ' horas').replace(/(\d+)\s*horas?\s*e\s*meia/g, (a, n) => (num(n) + 0.5) + ' horas').replace(/\bmeio litro\b/g, '500 ml');
    const nv = nav(t); if (nv) return [nv];
    const c0 = control(t); if (c0 && t.split(' ').length <= 4) return [c0];
    const wk = workout(t); if (wk) return [wk];
    const pf = /(anos|altura|metro|centimetro)/.test(t) ? profile(t) : null; if (pf) return [pf];
    const out = [];
    let prev = null;
    const clauses = [];
    splitClauses(t).forEach(c => { if (/agua/.test(c) && /\s+e\s+/.test(c) && !/agua de coco/.test(c)) c.split(/\s+e\s+/).forEach(x => x.trim() && clauses.push(x.trim())); else clauses.push(c); });
    clauses.forEach(c => {
      let a = sleep(c) || weight(c) || water(c, cfg) || food(c, hour);
      // "comi arroz, feijão e frango": o que vem depois da vírgula continua sendo comida
      if (!a && prev && (prev.type === 'food' || prev.type === 'water')) { a = food('comi ' + c, hour); if (a && prev.type === 'food') a.meal = prev.meal; }
      else if (a && a.type === 'food' && !a.explicit && prev && prev.type === 'food') a.meal = prev.meal; // "...e tomei café" continua no café da manhã
      if (a) { out.push(a); prev = a; }
    });
    // junta comidas da mesma refeição
    const merged = []; out.forEach(a => { const last = merged[merged.length - 1]; if (a.type === 'food' && last && last.type === 'food' && last.meal === a.meal) { last.items = last.items.concat(a.items); last.miss = last.miss.concat(a.miss); } else merged.push(a); });
    return merged.length ? merged : [{ type: 'unknown', text }];
  }
  window.Voice = { parse, words2num, norm };
})();
