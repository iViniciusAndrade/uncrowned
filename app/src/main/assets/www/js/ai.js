/* IA para anotar comida (Claude, API da Anthropic). A pessoa usa a própria chave, guardada só no aparelho.
   A IA entende o que foi comido (texto, voz, foto do prato ou da tabela) e o app confere:
   alimento natural usa a TACO quando o número bate; industrializado usa rótulo; tudo passa pelo conferidor. */
(function () {
  const URL = 'https://api.anthropic.com/v1/messages';
  const MODELS = { foto: 'claude-sonnet-5-5', texto: 'claude-haiku-5-5', barato: 'claude-haiku-5-5' };
  // dois provedores: Gemini (Google, plano grátis) e Claude (Anthropic, pago). O que tiver chave e estiver escolhido é usado.
  const GEMINI = { normal: 'gemini-3.8-flash', reserva: ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'] };
  const akey = () => (UCBridge.getSecret('anthropic_key') || '').trim();
  const gkey = () => (UCBridge.getSecret('gemini_key') || '').trim();
  const qkey = () => (UCBridge.getSecret('qwen_key') || '').trim();
  const HAS = { claude: () => /^sk-ant-/.test(akey()), gemini: () => gkey().length > 20, qwen: () => /^sk-/.test(qkey()) && qkey().length > 20 };
  const provider = () => { const p = Store.S.settings.aiProvider; if (p && HAS[p] && HAS[p]()) return p; return ['gemini', 'qwen', 'claude'].find(x => HAS[x]()) || null; };
  const key = () => ({ gemini: gkey, qwen: qkey, claude: akey })[provider()]();
  const has = () => !!provider();
  // conferir no FatSecret: a IA pesquisa na web (só no FatSecret) antes de responder. Padrão: ligado.
  const fsOn = () => Store.S.settings.aiFatsecret !== false;
  const FS_RE = /fatsecret\./i;
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

  // Gemini: mesma entrada (texto + imagem em base64), resposta já em JSON
  let gModel = null;
  async function askGemini({ system, content, kind, web }) {
    const parts = content.map(c => c.type === 'image' ? { inline_data: { mime_type: c.source.media_type, data: c.source.data } } : { text: c.text });
    const body = { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: kind === 'foto' ? 'medium' : 'low' } } };
    if (web) body.tools = [{ google_search: {} }];
    const models = [gModel || GEMINI.normal].concat(GEMINI.reserva.filter(m => m !== (gModel || GEMINI.normal)));
    let lastErr = null;
    for (const m of models) {
      let r = await UCBridge.httpPost('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent', { 'x-goog-api-key': gkey() }, body);
      let j = null; try { j = JSON.parse(r.body); } catch (e) {}
      const msg = (j && j.error && j.error.message) || '';
      if (r.status === 400 && /thinking/i.test(msg)) { delete body.generationConfig.thinkingConfig; r = await UCBridge.httpPost('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent', { 'x-goog-api-key': gkey() }, body); j = null; try { j = JSON.parse(r.body); } catch (e) {} }
      // modelo antigo que não junta busca com resposta em JSON: pede sem o modo JSON (o app extrai o JSON do texto)
      if (r.status === 400 && body.tools && /tool|search|mime|json/i.test(msg) && !/api key/i.test(msg)) { delete body.generationConfig.responseMimeType; r = await UCBridge.httpPost('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent', { 'x-goog-api-key': gkey() }, body); j = null; try { j = JSON.parse(r.body); } catch (e) {} if (r.status === 400) { delete body.tools; r = await UCBridge.httpPost('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent', { 'x-goog-api-key': gkey() }, body); j = null; try { j = JSON.parse(r.body); } catch (e) {} } }
      if (r.status === 404 || (r.status === 400 && /not found|not supported|unknown model/i.test(msg))) { lastErr = new Error('Modelo ' + m + ' indisponível'); continue; } // modelo trocado pelo Google: tenta o próximo
      if (r.status === 400 && /api key/i.test(msg) || r.status === 401 || r.status === 403) throw new Error('Chave do Gemini inválida. Confira em Perfil > IA.');
      if (r.status === 429) throw new Error('Limite grátis do Gemini atingido por agora. Espere um minuto (ou até amanhã, se for o limite do dia).');
      if (r.status >= 500) throw new Error('O Gemini está instável agora. Tente de novo em um minuto.');
      if (!j || r.status >= 400) throw new Error(msg || 'Erro ' + r.status + ' no Gemini');
      gModel = m;
      const cand = (j.candidates || [])[0];
      if (!cand || !cand.content) throw new Error(cand && cand.finishReason === 'SAFETY' ? 'O Gemini recusou essa foto. Tente outra.' : 'O Gemini não respondeu nada.');
      const out = extractJSON((cand.content.parts || []).filter(p => p.text && !p.thought).map(p => p.text).join('\n'));
      const gm = cand.groundingMetadata || {};
      out._web = (gm.groundingChunks || []).map(c => c.web ? (c.web.title || '') + ' ' + (c.web.uri || '') : '').filter(Boolean);
      return out;
    }
    throw lastErr || new Error('Nenhum modelo do Gemini disponível');
  }

  // Qwen (Alibaba Model Studio, região internacional, API compatível com OpenAI).
  // Qwen3.7-Plus: o mais inteligente que ainda responde rápido e enxerga foto; pensamento longo desligado.
  const QWEN = ['qwen3.7-plus', 'qwen3.6-plus', 'qwen3.5-plus', 'qwen-plus'];
  const QURL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
  let qModel = null;
  async function askQwen({ system, content, kind, web }) {
    const parts = content.map(c => c.type === 'image' ? { type: 'image_url', image_url: { url: 'data:' + c.source.media_type + ';base64,' + c.source.data } } : { type: 'text', text: c.text });
    const models = [qModel || QWEN[0]].concat(QWEN.filter(m => m !== (qModel || QWEN[0])));
    let lastErr = null;
    for (const m of models) {
      const body = { model: m, messages: [{ role: 'system', content: system }, { role: 'user', content: parts }], temperature: 0.2, response_format: { type: 'json_object' }, enable_thinking: false };
      if (web) { body.enable_search = true; body.search_options = { forced_search: true, enable_source: true, search_strategy: 'turbo' }; }
      let r = await UCBridge.httpPost(QURL, { Authorization: 'Bearer ' + qkey() }, body);
      let j = null; try { j = JSON.parse(r.body); } catch (e) {}
      const err = (j && j.error) || {}, msg = err.message || (j && j.message) || '', code = err.code || (j && j.code) || '';
      if (r.status === 400 && /enable_thinking|response_format|search/i.test(msg)) { delete body.enable_thinking; if (/response_format/i.test(msg)) delete body.response_format; if (/search/i.test(msg)) { delete body.enable_search; delete body.search_options; } r = await UCBridge.httpPost(QURL, { Authorization: 'Bearer ' + qkey() }, body); j = null; try { j = JSON.parse(r.body); } catch (e) {} }
      if (r.status === 404 || /model_not_found|ModelNotFound|does not exist|not support image|InvalidParameter.*model/i.test(code + ' ' + msg)) { lastErr = new Error('Modelo ' + m + ' indisponível'); continue; }
      if (r.status === 401 || /InvalidApiKey|invalid api.?key/i.test(code + msg)) throw new Error('Chave do Qwen inválida. Confira em Perfil > IA (precisa ser da região internacional, Singapura).');
      if (/FreeTierOnly|AllocationQuota|quota/i.test(code + ' ' + msg)) throw new Error('A cota grátis do Qwen acabou. Ative outro provedor (Gemini é grátis) ou coloque crédito no Alibaba Cloud.');
      if (r.status === 429) throw new Error('Muitos pedidos seguidos ao Qwen. Espere alguns segundos.');
      if (r.status >= 500) throw new Error('O Qwen está instável agora. Tente de novo em um minuto.');
      if (!j || r.status >= 400) throw new Error(msg || 'Erro ' + r.status + ' no Qwen');
      qModel = m;
      const t = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      const out = extractJSON(Array.isArray(t) ? t.map(x => x.text || '').join('') : t);
      const si = j.search_info || (j.output && j.output.search_info) || {};
      out._web = (si.search_results || []).map(x => (x.site_name || x.title || '') + ' ' + (x.url || ''));
      return out;
    }
    throw lastErr || new Error('Nenhum modelo do Qwen disponível');
  }

  async function ask({ system, content, kind, max, web }) {
    if (!has()) throw new Error('sem-chave');
    if (provider() === 'gemini') return askGemini({ system, content, kind, web });
    if (provider() === 'qwen') return askQwen({ system, content, kind, web });
    // esforço baixo no texto (resposta rápida) e médio na foto (precisa olhar com mais cuidado)
    const body = { model: model(kind || 'texto'), max_tokens: max || 2500, system, messages: [{ role: 'user', content }], output_config: { effort: kind === 'foto' ? 'medium' : 'low' } };
    if (web) body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4, allowed_domains: ['fatsecret.com.br', 'fatsecret.com'] }];
    const H = { 'x-api-key': key(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
    let r = await UCBridge.httpPost(URL, H, body);
    let j = null; try { j = JSON.parse(r.body); } catch (e) {}
    if (r.status === 400 && j && j.error && /web_search|tool/i.test(j.error.message || '')) { delete body.tools; r = await UCBridge.httpPost(URL, H, body); j = null; try { j = JSON.parse(r.body); } catch (e) {} }
    if (r.status === 400 && j && j.error && /output_config|effort/i.test(j.error.message || '')) { delete body.output_config; r = await UCBridge.httpPost(URL, H, body); j = null; try { j = JSON.parse(r.body); } catch (e) {} }
    if (r.status === 401) throw new Error('Chave da IA inválida. Confira em Perfil > IA.');
    if (r.status === 402 || (j && j.error && /credit|billing|balance/i.test(j.error.message || ''))) throw new Error('Sua conta da API está sem crédito. Coloque crédito em console.anthropic.com.');
    if (r.status === 429) throw new Error('Muitos pedidos seguidos. Espere alguns segundos.');
    if (r.status >= 500 || r.status === 529) throw new Error('A IA está sobrecarregada agora. Tente de novo em um minuto.');
    if (!j || r.status >= 400) throw new Error((j && j.error && j.error.message) || 'Erro ' + r.status + ' na IA');
    const text = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    const out = extractJSON(text);
    out._web = []; (j.content || []).forEach(b => { if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) b.content.forEach(x => out._web.push((x.title || '') + ' ' + (x.url || ''))); });
    return out;
  }

  const SYS_MEAL = `Você é o nutricionista do app Uncrowned Train, no Brasil. Sua função é transformar o que a pessoa comeu em itens com peso em gramas e valores nutricionais por 100 g.
Regras:
- Use medidas caseiras brasileiras reais (escumadeira de arroz ~85 g, concha de feijão ~140 g, pão francês 50 g, ovo 45-50 g, filé de sassami cru ~40 g por pedaço, fatia de pão de forma 25 g, colher de sopa de arroz 25 g, copo americano 150 ml, lata 350 ml).
- Peso SEMPRE do jeito que foi comido (cozido se a pessoa comeu cozido). Se a pessoa disser que pesou cru, use o peso cru e os valores do alimento cru.
- Valores por 100 g baseados na TACO (UNICAMP) e na TBCA (USP) para alimentos brasileiros. Para produto de marca use o rótulo brasileiro típico daquela marca. Nunca invente marca.
- "busca": nome curto para procurar na TACO, no estilo dela (ex.: "arroz tipo 1 cozido", "frango peito sem pele grelhado", "feijao carioca cozido", "ovo galinha inteiro cozido").
- "busca_en": o mesmo alimento no estilo da USDA FoodData Central, em inglês (ex.: "Rice, white, long-grain, regular, cooked", "Chicken, broiler, breast, meat only, raw", "Egg white, dried"). Para produto de marca, nome do produto em inglês genérico.
- O app vai buscar os valores oficiais na TACO, na base de marcas e na USDA com "busca"/"busca_en" e comparar com o seu "por100": capriche nesses três campos. Seja rápido e direto: não explique nada.
- "tipo": natural (in natura ou preparo simples: arroz, feijão, carne, ovo, fruta, legume), preparado (receita caseira ou de restaurante: lasanha, strogonoff, pizza), industrializado (produto de pacote ou marca: biscoito, refrigerante, whey, albumina, chocolate) ou bebida.
- Se a quantidade não foi dita, use uma porção típica de um adulto e marque confianca "baixa".
- Água pura não é comida: ignore (o app conta água em outro lugar). Refrigerante zero, café sem açúcar e chá têm ~0 kcal, mas registre.
- Bebida alcoólica: kcal inclui o álcool (7 kcal/g); macros podem não fechar.
- Em foto de prato: identifique cada alimento visível e estime o peso pelo tamanho do prato e da porção; confianca no máximo "media".
- refeicao: cafe, almoco, lanche, jantar ou ceia, só se a pessoa disser ou estiver óbvio; senão null.
Responda SÓ com um objeto JSON, sem texto fora dele, neste formato:
{"refeicao":null,"itens":[{"nome":"Arroz branco cozido","fatsecret":null,"busca":"arroz tipo 1 cozido","busca_en":"Rice, white, long-grain, regular, cooked","tipo":"natural","marca":null,"quantidade":"2 escumadeiras","gramas":170,"unidade":"g","por100":{"kcal":128,"p":2.5,"c":28.1,"g":0.2,"f":1.6,"na":1},"confianca":"alta"}],"duvida":null}
"duvida": uma pergunta curta se algo essencial ficou ambíguo (ex.: "O frango era grelhado ou frito?"), senão null.`;

  // acrescentado ao pedido quando a busca no FatSecret está ligada
  const SYS_FS = `
FATSECRET: antes de responder, pesquise cada alimento no FatSecret Brasil (site fatsecret.com.br; para marca, a página do produto daquela marca) usando a busca na web.
- Em cada item, preencha "fatsecret" com o que a PÁGINA do FatSecret mostra, convertido para 100 g (ou 100 ml): {"url":"https://www.fatsecret.com.br/...","nome":"nome como está no FatSecret","por100":{"kcal":0,"p":0,"c":0,"g":0,"f":0,"na":0}}.
- Só preencha se a página apareceu de verdade na sua busca. Se não achou, "fatsecret": null. Nunca invente número nem link do FatSecret.
- Use o "por100" do FatSecret também no seu "por100", a não ser que esteja claramente errado.`;

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
    const web = fsOn();
    return ask({ system: SYS_MEAL + (web ? SYS_FS : ''), content, kind: image ? 'foto' : 'texto', max: 4000, web });
  }
  async function label(image) {
    return ask({ system: SYS_LABEL, content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } }, { type: 'text', text: 'Leia a tabela nutricional desta foto.' }], kind: 'foto', max: 2000 });
  }

  // ---- USDA FoodData Central (grátis). Chave própria em Perfil > IA; sem ela usa a DEMO_KEY (limite baixo) ----
  const fdcKey = () => (UCBridge.getSecret('fdc_key') || '').trim() || 'DEMO_KEY';
  let fdcCache = {}; try { fdcCache = JSON.parse(localStorage.getItem('uc_fdc_cache') || '{}'); } catch (e) {}
  const saveCache = () => { try { const k = Object.keys(fdcCache); if (k.length > 300) k.slice(0, k.length - 300).forEach(x => delete fdcCache[x]); localStorage.setItem('uc_fdc_cache', JSON.stringify(fdcCache)); } catch (e) {} };
  const nutr = (f, nums, names) => { const n = (f.foodNutrients || []).find(x => nums.includes(String(x.nutrientNumber)) || names.some(r => r.test(x.nutrientName || ''))); return n ? +n.value : null; };
  function fdcToPer100(f) {
    const p = nutr(f, ['203'], [/^Protein$/]), c = nutr(f, ['205'], [/^Carbohydrate, by difference/]), g = nutr(f, ['204'], [/^Total lipid/]);
    let kcal = nutr(f, ['208'], [/^Energy$/]); if (kcal == null) kcal = nutr(f, ['958', '957'], [/Energy \(Atwater/]);
    const unitKcal = (f.foodNutrients || []).find(x => String(x.nutrientNumber) === '208' && /kj/i.test(x.unitName || '')); if (unitKcal) kcal = kcal / 4.184;
    if (kcal == null && p != null) kcal = 4 * (p || 0) + 4 * (c || 0) + 9 * (g || 0);
    return { kcal: kcal == null ? null : Math.round(kcal * 10) / 10, p, c, g, f: nutr(f, ['291'], [/^Fiber, total dietary/]), na: nutr(f, ['307'], [/^Sodium, Na/]) };
  }
  async function fdc(query, branded) {
    if (!query) return [];
    const ck = (branded ? 'b:' : 'g:') + query.toLowerCase(); if (fdcCache[ck]) return fdcCache[ck];
    const body = { query, pageSize: 5, dataType: branded ? ['Branded'] : ['Foundation', 'SR Legacy'] };
    const call = UCBridge.httpPost('https://api.nal.usda.gov/fdc/v1/foods/search?api_key=' + encodeURIComponent(fdcKey()), {}, body);
    const r = await Promise.race([call, new Promise(res => setTimeout(() => res(null), 7000))]); // não deixa a USDA travar a resposta
    if (!r || r.status !== 200) return [];
    let j = null; try { j = JSON.parse(r.body); } catch (e) { return []; }
    const out = (j.foods || []).map(f => Object.assign({ id: f.fdcId, name: f.description, brand: f.brandName || f.brandOwner || '', type: f.dataType }, fdcToPer100(f))).filter(x => x.kcal != null);
    fdcCache[ck] = out; saveCache(); return out;
  }

  // ---- confere a IA com as tabelas: o valor vem da tabela; a IA só diz o que e quanto ----
  const num = v => (v == null || v === '' || isNaN(+v)) ? null : +v;
  const near = (a, b) => a == null || b == null || Math.abs(a - b) <= Math.max(25, b * 0.3);
  async function resolveItem(it) {
    const p = it.por100 || {}, ai = { kcal: num(p.kcal), p: num(p.p), c: num(p.c), g: num(p.g), f: num(p.f), na: num(p.na) };
    const grams = Math.max(1, Math.round(num(it.gramas) || 100));
    const nat = it.tipo === 'natural' || it.tipo === 'preparado';
    let food = null, src = 'ia', note = '', check = '';
    // 0) FatSecret: só se a busca da IA trouxe mesmo uma página do FatSecret e os números fecham (kcal ≈ 4P + 4C + 9G)
    const fs = it.fatsecret && it.fatsecret.por100 ? it.fatsecret : null;
    if (fs && it._fsSeen && FS_RE.test(fs.url || 'fatsecret.')) {
      const v = { kcal: num(fs.por100.kcal), p: num(fs.por100.p) || 0, c: num(fs.por100.c) || 0, g: num(fs.por100.g) || 0, f: num(fs.por100.f), na: num(fs.por100.na) };
      const atw = 4 * v.p + 4 * v.c + 9 * v.g, alc = it.tipo === 'bebida' && /cerveja|vinho|cacha|vodka|whisk|gin|rum|drink|caipi|licor|saqu|espumante|chopp/i.test(it.nome || '');
      if (v.kcal != null && v.kcal >= 0 && v.kcal <= 900 && (alc || v.kcal < 5 && atw < 8 || Math.abs(atw - v.kcal) <= Math.max(15, v.kcal * 0.25))) {
        const name = (fs.nome || it.nome || 'Alimento').trim(), ref = 'fs:' + Food.norm(name + '|' + (it.marca || '')).slice(0, 60);
        const prev = Store.S.custom[ref];
        food = prev && Math.abs((prev.kcal || 0) - v.kcal) < 1 ? prev : Food.addCustom({ ref, name, brand: it.marca || '', kcal: v.kcal, p: v.p, c: v.c, g: v.g, f: v.f, na: v.na, src: 'FatSecret', cat: 'FatSecret', url: fs.url || '' });
        src = 'fatsecret'; check = fs.url || '';
      }
    }
    // 1) TACO / IBGE (Brasil, medido em laboratório) para alimento natural
    if (!food && nat && it.busca) {
      const cands = Food.search(it.busca, 10).filter(f => (f.src === 'TACO' || f.src === 'IBGE') && f.kcal != null && !Food.brandy(f));
      const ok = cands.find(f => near(f.kcal, ai.kcal));
      if (ok) { food = ok; src = 'tabela'; }
    }
    // 2) marca: o que a pessoa já cadastrou/escaneou ou a base de marcas do Brasil embutida
    if (!food && it.marca) {
      const q = (it.busca || it.nome) + ' ' + it.marca;
      const m = Food.search(q, 12).find(f => f.src !== 'TACO' && f.src !== 'IBGE' && f.brand && Food.norm(f.brand).includes(Food.norm(it.marca).split(' ')[0]) && near(f.kcal, ai.kcal));
      if (m) { food = m; src = 'marca'; }
    }
    // 3) USDA FoodData Central (Foundation/SR Legacy para natural; Branded para produto)
    if (!food && (it.busca_en || it.nome)) {
      let list = [];
      try { list = await fdc(it.busca_en || it.nome, !nat && !!it.marca); if (!list.length && !nat) list = await fdc(it.busca_en || it.nome, false); } catch (e) {}
      const best = list.find(x => near(x.kcal, ai.kcal));
      if (best) {
        const ref = 'u:' + best.id;
        food = Store.S.custom[ref] || Food.addCustom({ ref, name: (it.nome || best.name) + ' (USDA)', brand: best.brand || '', kcal: best.kcal, p: best.p || 0, c: best.c || 0, g: best.g || 0, f: best.f, na: best.na, src: 'USDA FoodData Central', cat: 'USDA' });
        src = 'usda'; check = best.name;
      }
    }
    // 4) sem tabela que confira: estimativa da própria IA
    if (!food) {
      const name = (it.nome || 'Alimento').trim() + (it.marca ? ' · ' + it.marca : '');
      const ex = Object.values(Store.S.custom).find(f => f.src === 'Estimativa da IA' && Food.norm(f.name) === Food.norm(name) && Math.abs((f.kcal || 0) - (ai.kcal || 0)) < 1);
      food = ex || Food.addCustom({ name, brand: it.marca || '', kcal: ai.kcal || 0, p: ai.p || 0, c: ai.c || 0, g: ai.g || 0, f: ai.f, na: ai.na, src: 'Estimativa da IA', cat: it.tipo === 'industrializado' ? 'Industrializados' : 'IA' });
      if (it.tipo === 'industrializado') note = 'varia por marca: escaneie o código para o valor exato';
    }
    if (it.unidade === 'ml' && !food.unit && food.src !== 'TACO') food.unit = 'ml';
    const warn = Food.sanity(food, food.unit || 'g', true, food.name);
    return { food, grams, src, note: note || (check ? (src === 'fatsecret' ? 'FatSecret' : 'USDA: ' + check) : ''), warn: warn[0] || '', conf: it.confianca || 'media', qty: it.quantidade || '', heard: it.nome };
  }
  // todos os itens em paralelo (a USDA é a única parte com rede)
  // web: o que a busca da IA trouxe; o valor do FatSecret só vale se apareceu página do FatSecret
  const resolveAll = (itens, web) => { const seen = (web || []).some(w => FS_RE.test(w)); return Promise.all((itens || []).map(it => resolveItem(Object.assign({}, it, { _fsSeen: seen })))); };

  window.AI = { fsOn, has, key, provider, setGemini: k => UCBridge.setSecret('gemini_key', (k || '').trim()), setQwen: k => UCBridge.setSecret('qwen_key', (k || '').trim()), qkey, setKey: k => UCBridge.setSecret('anthropic_key', (k || '').trim()), setFdcKey: k => UCBridge.setSecret('fdc_key', (k || '').trim()), fdcKey, fdc, meal, label, resolveItem, resolveAll, extractJSON, MODELS };
})();
