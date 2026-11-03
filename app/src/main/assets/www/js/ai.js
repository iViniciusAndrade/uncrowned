/* IA para anotar comida (Claude, API da Anthropic). A pessoa usa a própria chave, guardada só no aparelho.
   A IA entende o que foi comido (texto, voz, foto do prato ou da tabela) e o app confere:
   alimento natural usa a TACO quando o número bate; industrializado usa rótulo; tudo passa pelo conferidor. */
(function () {
  const URL = 'https://api.anthropic.com/v1/messages';
  const MODELS = { foto: 'claude-sonnet-5-5', texto: 'claude-haiku-5-5', barato: 'claude-haiku-5-5' };
  const key = () => (UCBridge.getSecret('anthropic_key') || '').trim();
  const has = () => /^sk-ant-/.test(key());
  const model = kind => { const m = (Store.S.settings.aiModel || 'auto'); return m === 'barato' ? MODELS.barato : m === 'melhor' ? MODELS.foto : MODELS[kind]; };

  // pega o primeiro objeto JSON da resposta, mesmo se vier com texto em volta ou cercado de ```
  function extractJSON(t) {
    t = String(t || '').replace(/```(?:json)?/g, '');
    const i = t.indexOf('{'); if (i < 0) throw new Error('A IA não devolveu dados');
    let depth = 0, inStr = false, esc = false;
    for (let j = i; j < t.length; j++) {
      const ch = t[j];
      if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
      if (ch === '"') inStr = true; else if (ch === '{') depth++; else if (ch === '}') { depth--; if (!depth) return JSON.parse(t.slice(i, j + 1)); }
    }
    throw new Error('Resposta da IA incompleta');
  }

  async function ask({ system, content, kind, max }) {
    if (!has()) throw new Error('sem-chave');
    const body = { model: model(kind || 'texto'), max_tokens: max || 4000, system, messages: [{ role: 'user', content }] };
    const r = await UCBridge.httpPost(URL, { 'x-api-key': key(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body);
    let j = null; try { j = JSON.parse(r.body); } catch (e) {}
    if (r.status === 401) throw new Error('Chave da IA inválida. Confira em Perfil > IA.');
    if (r.status === 402 || (j && j.error && /credit|billing|balance/i.test(j.error.message || ''))) throw new Error('Sua conta da API está sem crédito. Coloque crédito em console.anthropic.com.');
    if (r.status === 429) throw new Error('Muitos pedidos seguidos. Espere alguns segundos.');
    if (r.status >= 500 || r.status === 529) throw new Error('A IA está sobrecarregada agora. Tente de novo em um minuto.');
    if (!j || r.status >= 400) throw new Error((j && j.error && j.error.message) || 'Erro ' + r.status + ' na IA');
    const text = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    return extractJSON(text);
  }

  const SYS_MEAL = `Você é o nutricionista do app Uncrowned Train, no Brasil. Sua função é transformar o que a pessoa comeu em itens com peso em gramas e valores nutricionais por 100 g.
Regras:
- Use medidas caseiras brasileiras reais (escumadeira de arroz ~85 g, concha de feijão ~140 g, pão francês 50 g, ovo 45-50 g, filé de sassami cru ~40 g por pedaço, fatia de pão de forma 25 g, colher de sopa de arroz 25 g, copo americano 150 ml, lata 350 ml).
- Peso SEMPRE do jeito que foi comido (cozido se a pessoa comeu cozido). Se a pessoa disser que pesou cru, use o peso cru e os valores do alimento cru.
- Valores por 100 g baseados na TACO (UNICAMP) e na TBCA (USP) para alimentos brasileiros. Para produto de marca use o rótulo brasileiro típico daquela marca. Nunca invente marca.
- "busca": nome curto para procurar na TACO, no estilo dela (ex.: "arroz tipo 1 cozido", "frango peito sem pele grelhado", "feijao carioca cozido", "ovo galinha inteiro cozido").
- "tipo": natural (in natura ou preparo simples: arroz, feijão, carne, ovo, fruta, legume), preparado (receita caseira ou de restaurante: lasanha, strogonoff, pizza), industrializado (produto de pacote ou marca: biscoito, refrigerante, whey, albumina, chocolate) ou bebida.
- Se a quantidade não foi dita, use uma porção típica de um adulto e marque confianca "baixa".
- Água pura não é comida: ignore (o app conta água em outro lugar). Refrigerante zero, café sem açúcar e chá têm ~0 kcal, mas registre.
- Bebida alcoólica: kcal inclui o álcool (7 kcal/g); macros podem não fechar.
- Em foto de prato: identifique cada alimento visível e estime o peso pelo tamanho do prato e da porção; confianca no máximo "media".
- refeicao: cafe, almoco, lanche, jantar ou ceia, só se a pessoa disser ou estiver óbvio; senão null.
Responda SÓ com um objeto JSON, sem texto fora dele, neste formato:
{"refeicao":null,"itens":[{"nome":"Arroz branco cozido","busca":"arroz tipo 1 cozido","tipo":"natural","marca":null,"quantidade":"2 escumadeiras","gramas":170,"unidade":"g","por100":{"kcal":128,"p":2.5,"c":28.1,"g":0.2,"f":1.6,"na":1},"confianca":"alta"}],"duvida":null}
"duvida": uma pergunta curta se algo essencial ficou ambíguo (ex.: "O frango era grelhado ou frito?"), senão null.`;

  const SYS_LABEL = `Você lê tabelas de informação nutricional de embalagens brasileiras (RDC 429/2020 e modelo antigo).
- Leia exatamente os números impressos; não estime. Vírgula é decimal.
- Se houver coluna "100 g" ou "100 ml", use ela. Se só houver a coluna da porção, converta para 100 (valor × 100 / porção).
- "Não contém quantidades significativas de X" = 0 para X.
- Carboidratos: o número de "Carboidratos" da tabela (não some açúcares). Fibra e sódio se houver (sódio em mg).
- Leia nome do produto e marca se aparecerem na foto; senão null.
- unidade: "ml" se a tabela for por mL, senão "g". porcao: tamanho da porção em g ou ml.
- legivel: false se a foto não permitir ler a tabela com segurança.
Responda SÓ com JSON:
{"legivel":true,"nome":null,"marca":null,"unidade":"g","porcao":30,"porcao_texto":"30 g (2 colheres de sopa)","por100":{"kcal":0,"p":0,"c":0,"g":0,"f":0,"na":0},"observacao":null}`;

  // ---- refeição: texto e/ou foto ----
  async function meal({ text, image, previous, correction }) {
    const content = [];
    if (image) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } });
    let t = '';
    if (text) t += 'O que a pessoa disse/escreveu: "' + text + '"\n';
    if (image && !text) t += 'Foto do que a pessoa comeu.\n';
    if (previous) t += 'Sua resposta anterior foi: ' + JSON.stringify(previous) + '\nCorreção da pessoa: "' + correction + '". Refaça a lista inteira aplicando a correção.\n';
    content.push({ type: 'text', text: t || 'Analise.' });
    return ask({ system: SYS_MEAL, content, kind: image ? 'foto' : 'texto', max: 4000 });
  }
  async function label(image) {
    return ask({ system: SYS_LABEL, content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } }, { type: 'text', text: 'Leia a tabela nutricional desta foto.' }], kind: 'foto', max: 2000 });
  }

  // ---- confere a IA com a base do app ----
  const num = v => (v == null || v === '' || isNaN(+v)) ? null : +v;
  function resolveItem(it) {
    const p = it.por100 || {}, ai = { kcal: num(p.kcal), p: num(p.p), c: num(p.c), g: num(p.g), f: num(p.f), na: num(p.na) };
    const grams = Math.max(1, Math.round(num(it.gramas) || 100));
    const nat = it.tipo === 'natural' || it.tipo === 'preparado';
    let food = null, src = 'ia', note = '';
    if (nat && it.busca) {
      // prefere a TACO/IBGE se o valor bater com o que a IA esperava (mesmo alimento, mesmo preparo)
      const cands = Food.search(it.busca, 10).filter(f => (f.src === 'TACO' || f.src === 'IBGE') && f.kcal != null && !Food.brandy(f));
      const ok = cands.find(f => ai.kcal == null || Math.abs(f.kcal - ai.kcal) <= Math.max(25, ai.kcal * 0.3));
      if (ok) { food = ok; src = 'tabela'; }
    }
    if (!food && it.marca) {
      // produto que a pessoa já cadastrou/escaneou ou da base de marcas
      const q = (it.busca || it.nome) + ' ' + it.marca;
      const m = Food.search(q, 8).find(f => f.src !== 'TACO' && f.src !== 'IBGE' && f.brand && Food.norm(f.brand).includes(Food.norm(it.marca).split(' ')[0]));
      if (m) { food = m; src = 'marca'; }
    }
    if (!food) {
      // vira um alimento "estimativa da IA", reaproveitando se já existir igual
      const name = (it.nome || 'Alimento').trim() + (it.marca ? ' · ' + it.marca : '');
      const ex = Object.values(Store.S.custom).find(f => f.src === 'Estimativa da IA' && Food.norm(f.name) === Food.norm(name) && Math.abs((f.kcal || 0) - (ai.kcal || 0)) < 1);
      food = ex || Food.addCustom({ name, brand: it.marca || '', kcal: ai.kcal || 0, p: ai.p || 0, c: ai.c || 0, g: ai.g || 0, f: ai.f, na: ai.na, src: 'Estimativa da IA', cat: it.tipo === 'industrializado' ? 'Industrializados' : 'IA' });
      if (it.unidade === 'ml') food.unit = 'ml';
      if (it.tipo === 'industrializado') note = 'varia por marca: escaneie o código para o valor exato';
    }
    const warn = Food.sanity(food, food.unit || 'g', true, food.name);
    return { food, grams, src, note, warn: warn[0] || '', conf: it.confianca || 'media', qty: it.quantidade || '', heard: it.nome };
  }

  window.AI = { has, key, setKey: k => UCBridge.setSecret('anthropic_key', (k || '').trim()), meal, label, resolveItem, extractJSON, MODELS };
})();
