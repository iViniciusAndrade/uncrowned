/* Alimentos: TACO (UNICAMP) + alimentos do usuário + Open Food Facts por código de barras. */
(function () {
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ,/%-]/g, ' ').replace(/\s+/g, ' ').trim();
  const T = (window.TACO || []).map(r => ({ ref: 't:' + r[0], id: r[0], name: r[1], cat: r[2], kcal: r[3], p: r[4], c: r[5], g: r[6], f: r[7], na: r[8], src: 'TACO', key: norm(r[1]) }));
  (window.GENERICOS || []).forEach(r => T.push({ ref: 'g:' + r[0], id: r[0], name: r[1], cat: 'Genéricos', kcal: r[2], p: r[3], c: r[4], g: r[5], f: r[6], na: r[7], src: 'IBGE', measures: (r[8] || []).map(m => ({ label: m[0], g: m[1] })), key: norm(r[1]) }));
  const BY = {}; T.forEach(f => BY[f.ref] = f);
  const MED = window.TACO_MEDIDAS || {};

  // alimento padrão quando a pessoa fala só o nome popular (busca pelo início do nome da TACO)
  const SYN = [
    ['ovo frito', 'Ovo, de galinha, inteiro, frito'], ['ovo mexido', 'Ovo, de galinha, inteiro, frito'], ['ovos', 'Ovo, de galinha, inteiro, cozido'], ['ovo', 'Ovo, de galinha, inteiro, cozido'], ['clara', 'Ovo, de galinha, clara, cozida'],
    ['arroz integral', 'Arroz, integral, cozido'], ['arroz', 'Arroz, tipo 1, cozido'],
    ['feijao preto', 'Feijão, preto, cozido'], ['feijao', 'Feijão, carioca, cozido'],
    ['peito de frango', 'Frango, peito, sem pele, grelhado'], ['frango grelhado', 'Frango, peito, sem pele, grelhado'], ['frango', 'Frango, peito, sem pele, grelhado'], ['coxa de frango', 'Frango, coxa, sem pele, cozida'],
    ['pao frances', 'Pão, trigo, francês'], ['pao de forma', 'Pão, trigo, forma, integral'], ['pao integral', 'Pão, trigo, forma, integral'], ['pao', 'Pão, trigo, francês'],
    ['banana', 'Banana, prata, crua'], ['maca', 'Maçã, Fuji, com casca, crua'], ['laranja', 'Laranja, pêra, crua'], ['mamao', 'Mamão, Papaia, cru'], ['abacate', 'Abacate, cru'], ['manga', 'Manga, Tommy Atkins, crua'], ['melancia', 'Melancia, crua'], ['uva', 'Uva, Itália, crua'], ['morango', 'Morango, cru'], ['abacaxi', 'Abacaxi, cru'],
    ['cafe com leite', 'Café, infusão 10%'], ['cafe', 'Café, infusão 10%'], ['leite desnatado', 'Leite, de vaca, desnatado, UHT'], ['leite', 'Leite, de vaca, integral'],
    ['carne moida', 'Carne, bovina, acém, moído, cozido'], ['patinho', 'Carne, bovina, patinho, sem gordura, grelhado'], ['bife', 'Carne, bovina, contra-filé, sem gordura, grelhado'], ['carne', 'Carne, bovina, patinho, sem gordura, grelhado'], ['picanha', 'Carne, bovina, picanha, com gordura, grelhada'],
    ['batata doce', 'Batata, doce, cozida'], ['batata frita', 'Batata, frita, tipo chips, industrializada'], ['batata', 'Batata, inglesa, cozida'], ['mandioca', 'Mandioca, cozida'], ['aipim', 'Mandioca, cozida'], ['cuscuz', 'Cuscuz, de milho, cozido com sal'], ['tapioca', 'Tapioca, com manteiga'], ['aveia', 'Aveia, flocos, crua'],
    ['queijo minas', 'Queijo, minas, frescal'], ['mussarela', 'Queijo, mozarela'], ['queijo', 'Queijo, mozarela'], ['requeijao', 'Queijo, requeijão, cremoso'], ['presunto', 'Presunto, sem capa de gordura'], ['manteiga', 'Manteiga, com sal'], ['margarina', 'Margarina, com óleo hidrogenado, com sal (65% de lipídeos)'],
    ['iogurte', 'Iogurte, natural'], ['azeite', 'Azeite, de oliva, extra virgem'], ['oleo', 'Óleo, de soja'], ['acucar', 'Açúcar, cristal'], ['mel', 'Mel, de abelha'], ['salada', 'Alface, crespa, crua'], ['alface', 'Alface, crespa, crua'], ['tomate', 'Tomate, com semente, cru'], ['cenoura', 'Cenoura, crua'], ['brocolis', 'Brócolis, cozido'], ['sardinha', 'Sardinha, conserva em óleo'], ['atum', 'Atum, conserva em óleo'], ['linguica', 'Linguiça, porco, grelhada'], ['bacon', 'Toucinho, frito'],
    ['refrigerante', 'Refrigerante, tipo cola'], ['coca', 'Refrigerante, tipo cola'], ['suco de laranja', 'Laranja, pêra, suco'], ['cerveja', 'Cerveja, pilsen'], ['chocolate', 'Chocolate, ao leite'], ['pipoca', 'Pipoca, com óleo de soja, sem sal'], ['amendoim', 'Amendoim, torrado, salgado'], ['pasta de amendoim', 'Amendoim, torrado, salgado'],
    ['farofa', 'Mandioca, farofa, temperada'], ['farinha de mandioca', 'Farinha, de mandioca, torrada'], ['biscoito', 'Biscoito, salgado, cream cracker'], ['bolacha', 'Biscoito, salgado, cream cracker'], ['bolo', 'Bolo, pronto, chocolate'], ['coxinha', 'Coxinha de frango, frita'], ['pastel', 'Pastel, de carne, frito'], ['pao de queijo', 'Pão, de queijo, assado'], ['lasanha', 'Lasanha, massa fresca, cozida'], ['feijoada', 'Feijoada'], ['hamburguer', 'Hambúrguer, bovino, grelhado'], ['acai', 'Açaí, polpa, com xarope de guaraná e glucose']
  ];
  SYN.push(['pizza de calabresa', 'Pizza de calabresa'], ['pizza calabresa', 'Pizza de calabresa'], ['pizza de mussarela', 'Pizza de muçarela'], ['pizza mussarela', 'Pizza de muçarela'], ['pizza de muçarela', 'Pizza de muçarela'], ['pizza portuguesa', 'Pizza portuguesa'], ['pizza', 'Pizza (sabor não especificado)'],
    ['cachorro quente', 'Cachorro-quente'], ['hot dog', 'Cachorro-quente'], ['x burguer', 'Hambúrguer (sanduíche)'], ['xburguer', 'Hambúrguer (sanduíche)'], ['lanche', 'Hambúrguer (sanduíche)'], ['sanduiche', 'Hambúrguer (sanduíche)'], ['esfiha', 'Esfirra de carne'], ['esfirra', 'Esfirra de carne'],
    ['nuggets', 'Nuggets de frango empanados'], ['sassami', 'Filé de frango (sassami)'], ['filezinho', 'Filé de frango (sassami)'], ['macarrao', 'Macarrão cozido'], ['espaguete', 'Macarrão cozido'], ['miojo', 'Macarrão, instantâneo'], ['brigadeiro', 'Brigadeiro'], ['sorvete', 'Sorvete industrializado'], ['acai com granola', 'Açaí com granola'],
    ['strogonoff de carne', 'Estrogonofe de carne'], ['estrogonofe de carne', 'Estrogonofe de carne'], ['strogonoff', 'Estrogonofe de frango'], ['estrogonofe', 'Estrogonofe de frango'], ['macarrao a bolonhesa', 'Macarrão, molho bolognesa'], ['bolonhesa', 'Macarrão, molho bolognesa'], ['empada', 'Empada de frango']);
  const SYNR = [];
  SYN.forEach(([k, name]) => { if (!name) return; const n = norm(name); const f = T.find(x => x.key.startsWith(n)) || T.find(x => x.key.includes(n)); if (f) SYNR.push([norm(k), f.ref]); });
  SYNR.sort((a, b) => b[0].length - a[0].length);

  function all() { const S = Store.S; return T.concat(Object.values(S.custom)); }
  function get(ref) { return BY[ref] || Store.S.custom[ref] || null; }
  function search(q, limit) {
    const n = norm(q); if (!n) return [];
    const STOP = { de: 1, do: 1, da: 1, dos: 1, das: 1, e: 1, com: 1, o: 1, a: 1, um: 1, uma: 1, no: 1, na: 1 };
    const toks = n.split(' ').filter(t => t && !STOP[t]);
    if (!toks.length) return [];
    const out = [];
    // "frito" acha "frita", "ovos" acha "ovo": compara pelo radical
    const stem = t => t.length > 4 ? t.replace(/(oes|aes|ais|eis)$/, 'o').replace(/s$/, '').replace(/[aoe]$/, '') : t.length > 3 ? t.replace(/s$/, '') : t;
    const stoks = toks.map(stem);
    const synAll = SYNR.find(s => s[0] === n);
    const synPre = synAll || SYNR.find(s => n.startsWith(s[0] + ' ') || (s[0].startsWith(n) && n.length >= 3));
    all().forEach(f => {
      const key = f.key || norm(f.name);
      let sc = 0;
      for (let j = 0; j < toks.length; j++) { const t = toks[j]; let i = key.indexOf(t); let w = 1; if (i < 0) { i = key.indexOf(stoks[j]); w = 0.8; } if (i < 0) { sc = -1; break; } sc += (i === 0 ? 30 : (key[i - 1] === ' ' || key[i - 1] === ',') ? 18 : 6) * w; }
      if (sc < 0) return;
      if (synPre && synPre[1] === f.ref) sc += synAll ? 100 : 20;
      if (Store.S.fav.includes(f.ref)) sc += 25;
      if (Store.S.recent.includes(f.ref)) sc += 10;
      if (f.src === 'TACO' || f.src === 'IBGE') sc += 15; // natural e genérico primeiro
      sc -= key.length / 12;
      out.push([sc, f]);
    });
    out.sort((a, b) => b[0] - a[0]);
    const res = out.slice(0, limit || 40).map(x => x[1]);
    // sinônimo só entra na frente quando a pessoa digitou exatamente ele (ex.: "frango" → peito grelhado);
    // em "frango frito" ou "pizza de frango" ele só aparece se não houver nada melhor
    const syn = synAll || (!res.length && synPre);
    if (syn) { const sf = get(syn[1]); if (sf && !res.includes(sf)) res.unshift(sf); }
    return res.slice(0, limit || 40);
  }
  function guess(q) {
    const n = norm(q);
    for (const [k, ref] of SYNR) { if (n === k || n.includes(k)) { const exact = search(n, 1)[0]; if (exact && norm(exact.name).length < n.length + 18 && exact.ref !== ref && n.split(' ').length >= 2 && n !== k) return exact; return get(ref); } }
    return search(n, 1)[0] || null;
  }
  function measures(f) {
    if (!f) return [];
    if (f.src === 'TACO') return (MED[f.id] || []).map(m => ({ label: m[0], g: m[1] }));
    if (f.src === 'IBGE') return f.measures || [];
    return (f.measures || []);
  }
  function calc(f, grams) {
    const k = grams / 100, r = v => v == null ? 0 : Math.round(v * k * 10) / 10;
    return { kcal: Math.round((f.kcal || 0) * k), p: r(f.p), c: r(f.c), g: r(f.g), f: r(f.f) };
  }
  function entry(f, grams, meal, label) {
    return Object.assign({ id: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ref: f.ref, name: f.name, grams: Math.round(grams * 10) / 10, label: label || '', meal, t: Date.now() }, calc(f, grams));
  }
  function touchRecent(ref) { const S = Store.S; S.recent = [ref].concat(S.recent.filter(r => r !== ref)).slice(0, 40); }
  function addCustom(o) {
    const ref = o.ref || ('c:' + Date.now().toString(36));
    const f = { ref, name: o.name, cat: o.cat || 'Meus alimentos', kcal: +o.kcal || 0, p: +o.p || 0, c: +o.c || 0, g: +o.g || 0, f: o.f != null ? +o.f : null, na: o.na != null ? +o.na : null, src: o.src || 'Manual', barcode: o.barcode || null, measures: o.measures || [], key: norm(o.name + ' ' + (o.brand || '')) , brand: o.brand || '' };
    Store.S.custom[ref] = f; Store.save(); return f;
  }
  function byBarcode(code) { return Object.values(Store.S.custom).find(f => f.barcode === code) || null; }
  // Open Food Facts: valores por 100 g/ml declarados no rótulo
  async function lookupBarcode(code) {
    const local = byBarcode(code); if (local) return { food: local, from: 'local' };
    const url = 'https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(code) + '.json?fields=product_name,product_name_pt,brands,nutriments,serving_size,serving_quantity,quantity';
    const raw = await UCBridge.httpGet(url);
    const j = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!j || j.status !== 1 || !j.product) return { food: null, from: 'none' };
    const p = j.product, n = p.nutriments || {};
    let kcal = n['energy-kcal_100g']; if (kcal == null && n['energy_100g'] != null) kcal = n['energy_100g'] / 4.184;
    if (kcal == null) return { food: null, from: 'incomplete', name: p.product_name_pt || p.product_name, brand: p.brands };
    const meas = []; if (p.serving_quantity) meas.push({ label: 'porção do rótulo' + (p.serving_size ? ' (' + p.serving_size + ')' : ''), g: +p.serving_quantity });
    const f = addCustom({ ref: 'o:' + code, name: (p.product_name_pt || p.product_name || 'Produto ' + code).trim(), brand: (p.brands || '').split(',')[0], kcal: Math.round(kcal), p: round(n.proteins_100g), c: round(n.carbohydrates_100g), g: round(n.fat_100g), f: n.fiber_100g != null ? round(n.fiber_100g) : null, na: n.sodium_100g != null ? Math.round(n.sodium_100g * 1000) : null, src: 'Open Food Facts', barcode: code, measures: meas, cat: 'Industrializados' });
    return { food: f, from: 'off' };
  }
  const round = v => v == null || isNaN(v) ? 0 : Math.round(v * 10) / 10;
  // busca por nome no Open Food Facts (produtos de marca vendidos no Brasil)
  function offToFood(p) {
    const n = p.nutriments || {};
    let kcal = n['energy-kcal_100g']; if (kcal == null && n['energy_100g'] != null) kcal = n['energy_100g'] / 4.184;
    if (kcal == null || !(p.product_name_pt || p.product_name)) return null;
    return { ref: 'o:' + p.code, name: (p.product_name_pt || p.product_name).trim(), brand: (p.brands || '').split(',')[0].trim(), kcal: Math.round(kcal), p: round(n.proteins_100g), c: round(n.carbohydrates_100g), g: round(n.fat_100g), f: n.fiber_100g != null ? round(n.fiber_100g) : null, na: n.sodium_100g != null ? Math.round(n.sodium_100g * 1000) : null, src: 'Open Food Facts', barcode: p.code, measures: p.serving_quantity ? [{ label: 'porção do rótulo' + (p.serving_size ? ' (' + p.serving_size + ')' : ''), g: +p.serving_quantity }] : [], cat: 'Industrializados', remote: true };
  }
  const F = 'code,product_name,product_name_pt,brands,nutriments,serving_quantity,serving_size';
  const cacheQ = {};
  async function getJson(url) { const raw = await UCBridge.httpGet(url); const j = typeof raw === 'string' ? JSON.parse(raw) : raw; if (!j || typeof j !== 'object') throw new Error('resposta inválida'); return j; }
  const fix = p => Object.assign({}, p, { brands: Array.isArray(p.brands) ? p.brands.join(',') : p.brands, product_name: typeof p.product_name === 'object' && p.product_name ? (p.product_name.pt || p.product_name.main || Object.values(p.product_name)[0]) : p.product_name });
  // busca nova do Open Food Facts (search-a-licious); a antiga (cgi/search.pl) fica de reserva porque cai muito e tem limite de pedidos
  async function searchOnline(q) {
    const key = norm(q); if (cacheQ[key]) return cacheQ[key].filter(f => !Store.S.custom[f.ref]);
    const tries = [
      () => getJson('https://search.openfoodfacts.org/search?q=' + encodeURIComponent(q + ' countries_tags:"en:brazil"') + '&langs=pt&page_size=20&fields=' + F).then(j => j.hits),
      () => getJson('https://search.openfoodfacts.org/search?q=' + encodeURIComponent(q) + '&langs=pt&page_size=20&fields=' + F).then(j => j.hits),
      () => getJson('https://br.openfoodfacts.org/cgi/search.pl?search_terms=' + encodeURIComponent(q) + '&search_simple=1&action=process&json=1&page_size=20&fields=' + F).then(j => j.products)
    ];
    let lastErr = null;
    for (const t of tries) {
      try {
        const list = await t();
        if (!Array.isArray(list)) throw new Error('resposta inválida');
        const res = list.map(fix).map(offToFood).filter(Boolean);
        if (res.length) { cacheQ[key] = res; return res.filter(f => !Store.S.custom[f.ref]); }
      } catch (e) { lastErr = e; }
    }
    if (lastErr) throw lastErr;
    cacheQ[key] = []; return [];
  }
  function saveRemote(f) { if (Store.S.custom[f.ref]) return Store.S.custom[f.ref]; const o = Object.assign({}, f); delete o.remote; return addCustom(o); }
  // corrige (ou cria) um produto com os valores do rótulo. Mantém o mesmo ref/código para o scanner achar depois.
  function fromLabel(o) { return addCustom(Object.assign({ src: 'Rótulo', cat: 'Industrializados' }, o)); }
  window.Food = { fromLabel, norm, T, get, search, guess, measures, calc, entry, touchRecent, addCustom, lookupBarcode, byBarcode, SYNR, searchOnline, saveRemote };
})();
