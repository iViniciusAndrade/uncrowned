# Contexto para o Claude

App "Uncrowned Train" (pacote com.uncrownedlabs.uncrowned), marca UncrownedLabs, do Vinicius Andrade. Irmão do app de música Uncrowned Music.

- Interface em `app/src/main/assets/www` (JS puro, sem build). Nativo em Java simples, sem AndroidX; única dependência: play-services-code-scanner.
- A ponte JS→Java é `window.UCNative` (Bridge.java). Chamadas com retorno usam `UCBridge` (bridge.js): o Java responde com `UCBridge._resolve(id, json)` e emite eventos com `UCBridge._emit(nome, json)` ('voice', 'loc', 'locerr', 'intent').
- Estado salvo em localStorage e espelhado em `files/state.json` (saveState/loadState).
- Lembretes: o JS manda a config inteira (`setReminders`), o Java agenda com AlarmManager. Itens 'interval' (água, mewing) e 'daily' (refeições, treino, dormir, pesar). Modo insistente repete a cada nagMin até nagMax. Ação "Bebi X ml" grava pendência que o JS aplica ao voltar (`takePending`).
- Visual: preto total, branco e cinza. Sem emoji na interface. Textos em português do Brasil.
- Testes: `node` com o parser (Voice.parse) e Playwright abrindo `index.html` com um `UCNative` simulado.
- Build: GitHub Actions → Releases `build-N`. Não dá para compilar no container do Claude (sem acesso ao Google Maven).
- Ícone: a caveira coroada do Uncrowned Music (`art/skull-original.png`, desenho do Vinicius) com halter à esquerda e seringa de líquido verde à direita, brilho vermelho escuro. Fonte em `art/icon2.html` (renderizar com Playwright para `art/icon-512.png` e gerar os mipmaps).
- Alimentos: TACO (`data/foods.js`), genéricos (`data/generic.js`) e base de marcas do Brasil do Open Food Facts (`data/off_br.js`, ODbL). No repositório `off_br.js` é vazio; o build do Actions baixa o CSV do OFF, filtra com `tools/off_br.py` e embute (cache semanal). O JS carrega a base sob demanda (`Food.loadBrands`); só entra na busca a partir de 3 letras; marca digitada ("sassami swift") põe o produto da marca no topo.
