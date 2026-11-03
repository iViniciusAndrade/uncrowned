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
- IA para anotar comida: `js/ai.js` chama a API da Anthropic (Messages) pelo `Bridge.httpPost` nativo. A chave da pessoa fica em SharedPreferences `uc_secret` (`setSecret/getSecret`), fora do state.json e do backup. Modelos: Sonnet 5.5 para foto, Haiku 5.5 para texto (Perfil > IA > Modelo). A IA devolve JSON (itens com gramas e valores por 100 g); `AI.resolveItem` troca pelo valor da TACO quando é alimento natural e as calorias batem (±30%), senão cria "Estimativa da IA". Foto da tabela usa a IA quando ligada e cai no ML Kit sem ela. A IA só diz o que e quanto: o valor vem da TACO, da base de marcas ou da USDA FoodData Central (`AI.fdc`, chave grátis em Perfil > IA, cache em localStorage); "Estimativa da IA" só se nenhuma tabela conferir (±30% nas kcal). Esforço `output_config.effort`: low no texto, medium na foto.
- Água: o JS manda `setWater(dia, ml, meta)` a cada render; o ReminderReceiver não avisa mais quando a meta do dia foi batida e o "Bebi X ml" da notificação soma no nativo.
- Mapas: `.map` tem `isolation:isolate` para as camadas do Leaflet não vazarem por cima das janelas.
