/* Lê a tabela nutricional a partir do texto da foto (linhas com os 4 cantos, vindas do ML Kit).
   Endireita a foto torta, acha cada linha da tabela (energia, carboidratos...) e pega o número da
   coluna "100 g / 100 ml". Se a tabela só tiver a coluna da porção, converte para 100 g. */
(function () {
  const plain = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const squash = s => plain(s).replace(/[^a-z0-9.,%<]/g, '');
  const ROWS = [
    ['kcal', /valorenerget|energia|valorcalor|caloria/],
    ['c', /carboidrat|carbohidrat|hidratosdecarbono/],
    ['p', /proteina/],
    ['g', /gordurastota|gordurastot|gorduratota|lipidiostota|gordurastotais|^gorduras\(g\)|^gordura\(g\)|^lipideos/],
    ['f', /fibra/],
    ['na', /sodio/]
  ];
  const SKIP = /naocontem|significativ|percentual|valoresdiarios|saturad|trans|acucar|adicionad/;

  function num(tok) {
    let t = squash(tok).replace(/(kcal|kj|mg|ml|g|%)$/, '');
    if (/^<\d/.test(t)) return { v: 0, dec: true, lt: true };
    if (!/^\d{1,4}([.,]\d{1,2})?$/.test(t)) return null;
    return { v: parseFloat(t.replace(',', '.')), dec: /[.,]/.test(t) };
  }

  function parse(ocr) {
    const lines = (ocr && ocr.lines || []).filter(l => l && l.t && l.p && l.p.length >= 4);
    if (!lines.length) return null;
    // 1) ângulo da foto: mediana da inclinação das linhas compridas
    const angs = [];
    lines.forEach(l => { const [a, b, , d] = l.p; const w = Math.hypot(b[0] - a[0], b[1] - a[1]), h = Math.hypot(d[0] - a[0], d[1] - a[1]); if (w > h * 2.5) angs.push(Math.atan2(b[1] - a[1], b[0] - a[0])); });
    angs.sort((x, y) => x - y);
    const th = angs.length ? angs[Math.floor(angs.length / 2)] : 0, cs = Math.cos(th), sn = Math.sin(th);
    const rot = ([x, y]) => [x * cs + y * sn, -x * sn + y * cs];
    // 2) cada linha endireitada, quebrada em palavras com posição x aproximada
    const L = lines.map(l => {
      const P = l.p.map(rot), x0 = Math.min(P[0][0], P[3][0]), x1 = Math.max(P[1][0], P[2][0]);
      const y0 = (P[0][1] + P[1][1]) / 2, y1 = (P[3][1] + P[2][1]) / 2;
      const text = String(l.t), words = [];
      const re = /\S+/g; let m;
      while ((m = re.exec(text))) words.push({ t: m[0], x: x0 + (x1 - x0) * (m.index + m[0].length / 2) / Math.max(1, text.length), xe: x0 + (x1 - x0) * (m.index + m[0].length) / Math.max(1, text.length) });
      return { t: text, s: squash(text), x0, x1, cy: (y0 + y1) / 2, h: Math.max(8, y1 - y0), words };
    });
    const full = squash(lines.map(l => l.t).join(' '));
    const out = { values: {}, found: {}, base: '100', portion: null, unit: 'g', warn: [] };

    // 3) porção e unidade
    const pm = full.match(/porcao(?:de)?:?(\d+(?:[.,]\d+)?)(g|ml)/);
    if (pm) { out.portion = parseFloat(pm[1].replace(',', '.')); out.unit = pm[2]; }
    else if (/100ml/.test(full)) out.unit = 'ml';
    // 4) colunas do cabeçalho
    let col100 = null, colP = null;
    L.forEach(l => l.words.forEach(w => {
      const s = squash(w.t);
      if (/^100(g|ml)$/.test(s) || (s === '100' && /^(g|ml)/.test(squash(l.t).slice(squash(l.t).indexOf('100') + 3)))) col100 = col100 || { x: w.x, y: l.cy };
      else if (out.portion && new RegExp('^' + String(out.portion).replace('.', '[.,]') + '(g|ml)$').test(s)) colP = colP || { x: w.x, y: l.cy };
    }));
    const header = col100 || colP;
    // 5) para cada nutriente, a linha do rótulo e os números na mesma altura, à direita
    ROWS.forEach(([k, re]) => {
      let best = null;
      L.forEach(l => {
        if (SKIP.test(l.s) && !(k === 'c' && /^carboidrat/.test(l.s))) return;
        const mm = l.s.match(re); if (!mm) return;
        if (k === 'g' && /saturad|trans/.test(l.s)) return;
        if (header && l.cy < header.y - l.h) return; // acima do cabeçalho (título, porção)
        if (!best) best = l;
      });
      if (!best) return;
      // fim do nome do nutriente dentro da linha (os números podem vir na mesma linha)
      let endX = best.x0; for (const w of best.words) { if (num(w.t)) break; endX = w.xe; }
      const band = best.h * 0.62, cands = [];
      L.forEach(l => {
        if (Math.abs(l.cy - best.cy) > Math.max(band, l.h * 0.62)) return;
        l.words.forEach((w, i) => {
          const n = num(w.t); if (!n || w.x <= endX || /%$/.test(w.t)) return;
          const nx = squash((l.words[i + 1] || {}).t || '');
          if (/^kj/.test(nx) || /kj$/.test(squash(w.t)) || /^%/.test(nx)) return; // kJ e %VD não interessam
          cands.push(Object.assign({ x: w.x }, n));
        });
      });
      if (!cands.length) return;
      cands.sort((a, b) => a.x - b.x);
      let pick = cands[0];
      if (col100) pick = cands.reduce((a, b) => Math.abs(b.x - col100.x) < Math.abs(a.x - col100.x) ? b : a);
      else if (colP) pick = cands.reduce((a, b) => Math.abs(b.x - colP.x) < Math.abs(a.x - colP.x) ? b : a);
      out.values[k] = pick.v; out.found[k] = pick;
    });
    if (!col100 && colP && out.portion) out.base = 'porcao';
    else if (!col100 && out.portion && !/100(g|ml)/.test(full)) { out.base = 'porcao'; out.warn.push('Não achei a coluna de 100 g; usei a da porção'); }
    // 6) "não contém quantidades significativas de ..." vira zero
    const nz = full.match(/naocontem(?:quantidades)?significativas?de(.*)/);
    if (nz) { const t = nz[1]; [['p', /protein/], ['g', /gordurastota|gordurastot|gordurasto/], ['f', /fibra/], ['na', /sodio/], ['c', /carboidrat/]].forEach(([k, r]) => { if (out.values[k] == null && r.test(t)) out.values[k] = 0; }); }
    // 7) conferência: energia tem que bater com os macros (corrige vírgula que a câmera não leu)
    const v = out.values;
    if (v.kcal != null && (v.c != null || v.p != null || v.g != null)) {
      const est = 4 * (v.c || 0) + 4 * (v.p || 0) + 9 * (v.g || 0);
      if (est > 0 && !out.found.kcal?.dec && v.kcal >= 10 && v.kcal > est * 3 && Math.abs(v.kcal / 10 - est) <= Math.max(2, est * 0.5)) { v.kcal = v.kcal / 10; out.warn.push('A câmera não pegou a vírgula das calorias; ajustei pelos macros'); }
      if (est > 0 && Math.abs(v.kcal - est) > Math.max(8, est * 0.35)) out.warn.push('As calorias não batem com os macros; confira');
    }
    const keys = ['kcal', 'c', 'p', 'g'];
    out.ok = keys.filter(k => v[k] != null).length;
    // 8) converte a coluna da porção para 100 g
    out.per100 = {};
    const fac = out.base === 'porcao' && out.portion ? 100 / out.portion : 1;
    Object.keys(v).forEach(k => { out.per100[k] = Math.round(v[k] * fac * 10) / 10; });
    return out;
  }
  window.Label = { parse };
})();
