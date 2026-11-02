# Uncrowned Train

App Android de treino, comida, água, sono, rosto e bike. UncrownedLabs · por Vinicius Andrade.

## Como sai o APK
Todo push na branch `main` roda o GitHub Actions (`.github/workflows/build.yml`), que compila e publica o APK em **Releases** com a tag `build-N`. Baixe o `Uncrowned-build-N.apk` no celular e instale.

## Estrutura
- `app/src/main/assets/www/` interface (HTML, CSS, JS puro). Abre direto no navegador para testar; sem o Android, voz, lembretes, GPS nativo e leitor de código caem em versões web ou simuladas.
  - `js/store.js` estado e metas (Mifflin-St Jeor, proteína, água)
  - `js/food.js` busca de alimentos (TACO primeiro, depois marcas) e Open Food Facts
  - `js/voice.js` entende frases em português e vira ações
  - `js/exercises.js` exercícios, 28 Dias, Protocolo Aranha, Rosto e gerador de treino
  - `js/mannequin.js` boneco 3D (three.js) com uma animação por exercício
  - `js/player.js` player guiado (tempo, repetições, AMRAP, escada)
  - `js/bike.js` GPS, velocidade, percurso, Google Maps e Waze
  - `data/foods.js` TACO 4ª ed. (NEPA/UNICAMP) + medidas caseiras IBGE POF 2008-2009
- `app/src/main/java/com/uncrownedlabs/uncrowned/` casca nativa: WebView, ponte `UCNative`, voz (SpeechRecognizer/TextToSpeech), lembretes (AlarmManager + modo insistente), GPS em primeiro plano, leitor de código de barras do Google Play Services, cache de mapas.
- Assinatura: a chave **não** fica no repositório. O workflow lê os segredos `ANDROID_KEYSTORE_B64` (arquivo .jks em base64) e `ANDROID_KEYSTORE_PASSWORD` em Settings → Secrets and variables → Actions. Sem eles, cada build sai com uma chave temporária e é preciso desinstalar o app antes de instalar o próximo.

## Fontes de dados
TACO 4ª ed. (NEPA/UNICAMP, 2011) · IBGE POF 2008-2009 (medidas, mapeamento do projeto taco-br-mcp) · Open Food Facts (ODbL) · Compêndio de Atividades Físicas (MET) · OpenStreetMap.
