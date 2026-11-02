/* Uncrowned — biblioteca de exercícios e programas.
   eq: equipamentos necessários ('cadeira' = cadeira firme, sofá ou mesa; 'halteres'; 'barra' = barra fixa; 'paralela'; 'elastico'; 'academia')
   pat: padrão de movimento usado pelo gerador; lvl: 1 iniciante, 2 intermediário, 3 avançado
   imp: tem impacto/salto; lim: evitar com dor em ('joelho','ombro','lombar','punho'); alt: substituto quando falta equipamento
   met: gasto energético aproximado (MET, Compêndio de Atividades Físicas) */
(function () {
  const X = {};
  const add = (id, o) => { X[id] = Object.assign({ id, eq: [], lvl: 1, imp: false, lim: [], met: 5 }, o); };

  // Pernas
  add('agach_cadeira', { n: 'Agachamento na cadeira', g: 'Pernas', pat: 'squat', anim: 'squat_box', eq: ['cadeira'], alt: 'agach', met: 4, how: 'De costas para uma cadeira, pés na largura dos ombros. Desça levando o quadril para trás até encostar de leve no assento e suba sem usar as mãos.', easy: 'Apoie as mãos nas coxas para subir', hard: 'Agachamento livre' });
  add('agach', { n: 'Agachamento livre', g: 'Pernas', pat: 'squat', anim: 'squat', met: 5, how: 'Pés na largura dos ombros, pontas um pouco para fora. Desça como se fosse sentar, peito aberto e joelhos na direção dos pés, até a coxa ficar paralela ao chão.', easy: 'Agachamento na cadeira', hard: 'Agachamento com pausa', lim: [] });
  add('agach_pausa', { n: 'Agachamento com pausa', g: 'Pernas', pat: 'squat', anim: 'squat_pause', lvl: 2, met: 5, how: 'Agachamento livre parando 2 segundos embaixo antes de subir.', easy: 'Agachamento livre', hard: 'Agachamento com salto' });
  add('agach_salto', { n: 'Agachamento com salto', g: 'Pernas', pat: 'squat', anim: 'jumpsquat', lvl: 3, imp: true, lim: ['joelho'], met: 8, how: 'Agache e suba num salto. Aterrisse macio, com os joelhos alinhados, já descendo para o próximo.', easy: 'Agachamento com pausa', hard: 'Salto mais alto' });
  add('agach_sumo', { n: 'Agachamento sumô', g: 'Pernas', pat: 'squat', anim: 'sumo', met: 5, how: 'Pés bem afastados e pontas para fora. Desça com o tronco reto, empurrando os joelhos para fora.', easy: 'Desça menos', hard: 'Segure 2 segundos embaixo' });
  add('goblet', { n: 'Agachamento goblet', g: 'Pernas', pat: 'squat', anim: 'goblet', eq: ['halteres'], lvl: 2, alt: 'agach', met: 6, how: 'Segure um halter junto ao peito com as duas mãos e agache mantendo o tronco ereto e os cotovelos entre os joelhos.', easy: 'Halter mais leve', hard: 'Pausa embaixo' });
  add('avanco', { n: 'Avanço para trás', g: 'Pernas', pat: 'lunge', anim: 'lunge', lim: ['joelho'], met: 5, how: 'Dê um passo grande para trás e desça até os dois joelhos ficarem em 90 graus. Volte e troque de perna.', easy: 'Segure numa parede ou cadeira', hard: 'Avanço com halteres' });
  add('avanco_halter', { n: 'Avanço com halteres', g: 'Pernas', pat: 'lunge', anim: 'lunge', eq: ['halteres'], lvl: 2, alt: 'avanco', lim: ['joelho'], met: 6, how: 'Avanço para trás segurando um halter em cada mão, braços estendidos ao lado do corpo.', easy: 'Sem peso', hard: 'Halteres mais pesados' });
  add('bulgaro', { n: 'Agachamento búlgaro', g: 'Pernas', pat: 'lunge', anim: 'split', eq: ['cadeira'], lvl: 2, alt: 'avanco', lim: ['joelho'], met: 6, how: 'Peito do pé de trás apoiado numa cadeira. Desça com a perna da frente até a coxa ficar paralela ao chão.', easy: 'Avanço para trás', hard: 'Com halteres' });
  add('ponte', { n: 'Ponte de glúteo', g: 'Pernas', pat: 'hinge', anim: 'bridge', met: 3.5, how: 'Barriga para cima, joelhos dobrados e pés no chão. Suba o quadril apertando o glúteo até alinhar ombro, quadril e joelho. Desça devagar.', easy: 'Suba menos', hard: 'Ponte com uma perna' });
  add('ponte_uni', { n: 'Ponte com uma perna', g: 'Pernas', pat: 'hinge', anim: 'bridge1', lvl: 2, met: 4, how: 'A mesma ponte com uma perna esticada no ar. Troque de perna na metade do tempo.', easy: 'Ponte normal', hard: 'Pausa de 2 segundos em cima' });
  add('stiff', { n: 'Stiff com halteres', g: 'Pernas', pat: 'hinge', anim: 'rdl', eq: ['halteres'], lvl: 2, alt: 'bom_dia', lim: ['lombar'], met: 5, how: 'Joelhos levemente dobrados, leve o quadril para trás descendo os halteres rente às pernas com a coluna reta. Suba apertando o glúteo.', easy: 'Peso menor', hard: 'Uma perna' });
  add('panturrilha', { n: 'Elevação de panturrilha', g: 'Pernas', pat: 'calf', anim: 'calf', met: 3, how: 'Em pé, suba na ponta dos pés o máximo que puder e desça devagar. Pode apoiar a mão na parede.', easy: 'Com apoio', hard: 'Uma perna de cada vez' });
  add('cadeirinha', { n: 'Cadeirinha na parede', g: 'Pernas', pat: 'squat', anim: 'wallsit', met: 4, lim: ['joelho'], how: 'Costas apoiadas na parede, desça até as coxas ficarem quase paralelas ao chão e segure.', easy: 'Desça menos', hard: 'Coxas em 90 graus' });

  // Empurrar
  add('flex_parede', { n: 'Flexão na parede', g: 'Peito e braços', pat: 'push', anim: 'pushup_wall', met: 3, how: 'Mãos na parede na altura do peito, corpo reto. Dobre os cotovelos levando o peito até a parede e empurre de volta.', easy: 'Fique mais perto da parede', hard: 'Flexão inclinada' });
  add('flex_incl', { n: 'Flexão inclinada', g: 'Peito e braços', pat: 'push', anim: 'pushup_incline', eq: ['cadeira'], alt: 'flex_joelho', met: 4, how: 'Mãos na borda de uma mesa firme, sofá ou bancada, corpo reto da cabeça ao calcanhar. Desça o peito até a borda e empurre.', easy: 'Flexão na parede', hard: 'Flexão com joelhos' });
  add('flex_joelho', { n: 'Flexão com joelhos', g: 'Peito e braços', pat: 'push', anim: 'pushup_knee', met: 4, lim: ['punho'], how: 'Mãos no chão um pouco mais abertas que os ombros, joelhos apoiados, corpo reto dos joelhos à cabeça. Desça o peito perto do chão e empurre.', easy: 'Flexão inclinada', hard: 'Flexão completa' });
  add('flex', { n: 'Flexão', g: 'Peito e braços', pat: 'push', anim: 'pushup', lvl: 2, met: 5, lim: ['punho', 'ombro'], how: 'Corpo reto apoiado nas mãos e nas pontas dos pés. Desça até o peito quase tocar o chão, cotovelos a uns 45 graus do corpo.', easy: 'Complete com os joelhos no chão', hard: 'Pausa de 2 segundos embaixo' });
  add('triceps_cad', { n: 'Tríceps na cadeira', g: 'Peito e braços', pat: 'push', anim: 'dip_chair', eq: ['cadeira'], alt: 'flex_joelho', lim: ['ombro'], met: 4, how: 'Mãos na borda de uma cadeira firme encostada na parede, pernas dobradas à frente. Dobre os cotovelos descendo o quadril e empurre de volta.', easy: 'Desça menos', hard: 'Pernas esticadas' });
  add('mergulho', { n: 'Mergulho nas paralelas', g: 'Peito e braços', pat: 'push', anim: 'dip', eq: ['paralela'], lvl: 2, alt: 'triceps_cad', lim: ['ombro'], met: 6, how: 'Apoiado nas paralelas com os braços esticados, desça dobrando os cotovelos até uns 90 graus, tronco levemente à frente, e empurre de volta.', easy: 'Tríceps na cadeira', hard: 'Com peso' });
  add('pike', { n: 'Flexão pike', g: 'Ombros', pat: 'push', anim: 'pike', lvl: 2, lim: ['ombro', 'punho'], met: 5, how: 'Quadril alto formando um V de cabeça para baixo. Dobre os cotovelos levando a cabeça em direção ao chão, entre as mãos, e empurre.', easy: 'Só segure a posição em V', hard: 'Pés num degrau' });
  add('desenvolvimento', { n: 'Desenvolvimento com halteres', g: 'Ombros', pat: 'push', anim: 'press', eq: ['halteres'], lvl: 1, alt: 'pike', lim: ['ombro'], met: 5, how: 'Halteres na altura dos ombros, empurre para cima até esticar os braços sem arquear a lombar. Desça devagar.', easy: 'Sentado', hard: 'Mais peso' });
  add('elevacao_lateral', { n: 'Elevação lateral', g: 'Ombros', pat: 'push', anim: 'lateral', eq: ['halteres'], alt: 'rot_bracos', lim: ['ombro'], met: 4, how: 'Com halteres leves, erga os braços pelas laterais até a altura dos ombros, cotovelos levemente dobrados.', easy: 'Halteres mais leves', hard: 'Pausa em cima' });
  add('rosca', { n: 'Rosca direta', g: 'Peito e braços', pat: 'pull', anim: 'curl', eq: ['halteres'], alt: 'remada_mesa', met: 4, how: 'Cotovelos colados ao corpo, suba os halteres dobrando os cotovelos e desça devagar.', easy: 'Alternada', hard: 'Mais peso' });

  // Puxar e costas
  add('superman', { n: 'Superman', g: 'Costas', pat: 'pull', anim: 'superman', met: 3.5, how: 'De barriga para baixo com os braços esticados à frente, erga braços, peito e pernas juntos, segure 2 segundos e desça.', easy: 'Erga só os braços ou só as pernas', hard: 'Segure 5 segundos em cima' });
  add('ytw', { n: 'Y-T-W deitado', g: 'Costas', pat: 'pull', anim: 'ytw', met: 3, how: 'De barriga para baixo, tire os braços do chão formando um Y, depois um T, depois um W, apertando as escápulas.', easy: 'Só o T', hard: 'Segure 3 segundos em cada letra' });
  add('remada_mesa', { n: 'Remada na mesa', g: 'Costas', pat: 'pull', anim: 'invrow', eq: ['cadeira'], alt: 'superman', lvl: 2, met: 5, how: 'Deite embaixo de uma mesa bem firme, segure a borda e puxe o peito até ela com o corpo reto. Teste a firmeza da mesa antes.', easy: 'Joelhos dobrados', hard: 'Pés elevados' });
  add('barra', { n: 'Barra fixa', g: 'Costas', pat: 'pull', anim: 'pullup', eq: ['barra'], lvl: 2, alt: 'remada_mesa', lim: ['ombro'], met: 8, how: 'Pendure-se com as mãos um pouco além dos ombros e puxe até o queixo passar a barra. Desça controlando até esticar os braços.', easy: 'Negativa: suba com um pulo e desça em 3 segundos', hard: 'Com colete de peso' });
  add('remada_halter', { n: 'Remada curvada com halteres', g: 'Costas', pat: 'pull', anim: 'row', eq: ['halteres'], alt: 'remada_mesa', lim: ['lombar'], met: 5, how: 'Tronco inclinado à frente com a coluna reta, puxe os halteres em direção ao quadril apertando as escápulas.', easy: 'Um braço apoiado na cadeira', hard: 'Mais peso' });
  add('remada_elastico', { n: 'Remada com elástico', g: 'Costas', pat: 'pull', anim: 'row', eq: ['elastico'], alt: 'superman', met: 4, how: 'Elástico preso na altura do peito, puxe os cotovelos para trás apertando as escápulas.', easy: 'Elástico mais leve', hard: 'Elástico mais forte' });
  add('renegada', { n: 'Remada renegada', g: 'Costas', pat: 'pull', anim: 'renegade', eq: ['halteres'], lvl: 3, alt: 'toque_ombro', lim: ['punho', 'lombar'], met: 7, how: 'Em posição de flexão apoiado nos halteres, puxe um halter até a costela sem girar o quadril, desça e troque de lado.', easy: 'Joelhos no chão', hard: 'Uma flexão entre as remadas' });

  // Core
  add('prancha_joelho', { n: 'Prancha com joelhos', g: 'Core', pat: 'core', anim: 'plank_knee', met: 3, how: 'Antebraços no chão com os cotovelos abaixo dos ombros, joelhos apoiados. Corpo reto e barriga contraída.', easy: 'Pausas curtas', hard: 'Prancha' });
  add('prancha', { n: 'Prancha', g: 'Core', pat: 'core', anim: 'plank', met: 3.5, how: 'Antebraços e pontas dos pés no chão, corpo reto. Contraia barriga e glúteo sem deixar o quadril cair.', easy: 'Prancha com joelhos', hard: 'Prancha com toque no ombro' });
  add('toque_ombro', { n: 'Prancha com toque no ombro', g: 'Core', pat: 'core', anim: 'shouldertap', lvl: 2, lim: ['punho'], met: 4, how: 'Na posição de flexão, com os braços esticados, toque a mão no ombro oposto alternando, sem balançar o quadril.', easy: 'Pés mais afastados', hard: 'Mais lento' });
  add('prancha_lat', { n: 'Prancha lateral', g: 'Core', pat: 'core', anim: 'sideplank', met: 3.5, lim: ['ombro'], how: 'Deitado de lado, apoie o antebraço e erga o quadril formando uma linha reta. Troque de lado na metade do tempo.', easy: 'Joelhos apoiados', hard: 'Erga a perna de cima' });
  add('dead_bug', { n: 'Dead bug', g: 'Core', pat: 'core', anim: 'deadbug', met: 3, how: 'Barriga para cima, braços apontando para o teto e joelhos dobrados no ar. Estique braço e perna opostos devagar sem tirar a lombar do chão e alterne.', easy: 'Mexa só as pernas', hard: 'Mais lento' });
  add('abd_curto', { n: 'Abdominal curto', g: 'Core', pat: 'core', anim: 'crunch', met: 3, how: 'Barriga para cima, joelhos dobrados. Tire só os ombros do chão contraindo a barriga, sem puxar o pescoço.', easy: 'Suba menos', hard: 'Pausa de 2 segundos em cima' });
  add('abd', { n: 'Abdominal completo', g: 'Core', pat: 'core', anim: 'situp', lvl: 2, lim: ['lombar'], met: 4, how: 'Barriga para cima, joelhos dobrados e pés no chão. Suba o tronco inteiro até sentar e desça devagar.', easy: 'Abdominal curto', hard: 'Braços esticados acima da cabeça' });
  add('elev_pernas', { n: 'Elevação de pernas', g: 'Core', pat: 'core', anim: 'legraise', lvl: 2, lim: ['lombar'], met: 3.5, how: 'Deitado de barriga para cima, mãos ao lado do corpo, suba as pernas esticadas até 90 graus e desça sem encostar no chão.', easy: 'Joelhos dobrados', hard: 'Mais lento' });
  add('elev_joelhos_barra', { n: 'Elevação de joelhos na barra', g: 'Core', pat: 'core', anim: 'kneeraise', eq: ['barra'], lvl: 2, alt: 'elev_pernas', met: 5, how: 'Pendurado na barra, suba os joelhos até a altura do quadril sem balançar e desça controlando.', easy: 'Elevação de pernas no chão', hard: 'Pernas esticadas' });
  add('urso', { n: 'Urso parado', g: 'Core', pat: 'core', anim: 'bearhold', met: 4, lim: ['punho'], how: 'De quatro, mãos abaixo dos ombros e joelhos abaixo do quadril. Tire os joelhos uns 3 cm do chão e segure com as costas retas.', easy: 'Encoste os joelhos a cada 10 segundos', hard: 'Toque no ombro alternando' });
  add('bear_crawl', { n: 'Bear crawl', g: 'Core', pat: 'cardio', anim: 'bearcrawl', lvl: 2, lim: ['punho'], met: 8, how: 'Na posição do urso, com os joelhos a 3 cm do chão, ande para frente e para trás movendo mão e pé opostos juntos.', easy: 'Urso parado', hard: 'Mais rápido e mais longe' });

  // Cardio
  add('polichinelo_ss', { n: 'Polichinelo sem salto', g: 'Cardio', pat: 'cardio', anim: 'stepjack', met: 4, how: 'Abra uma perna para o lado erguendo os braços acima da cabeça, volte e troque de lado. Ritmo constante.', easy: 'Mais devagar', hard: 'Polichinelo' });
  add('polichinelo', { n: 'Polichinelo', g: 'Cardio', pat: 'cardio', anim: 'jack', imp: true, lim: ['joelho'], met: 8, how: 'Salte abrindo pernas e braços ao mesmo tempo e volte. Aterrisse na ponta dos pés.', easy: 'Polichinelo sem salto', hard: 'Mais rápido' });
  add('marcha', { n: 'Marcha com joelho alto', g: 'Cardio', pat: 'cardio', anim: 'march', met: 4, how: 'Marche no lugar subindo cada joelho até a altura do quadril, com os braços acompanhando.', easy: 'Joelho mais baixo', hard: 'Corrida no lugar' });
  add('corrida_lugar', { n: 'Corrida no lugar', g: 'Cardio', pat: 'cardio', anim: 'highknees', lvl: 2, imp: true, lim: ['joelho'], met: 8, how: 'Corra no lugar subindo bem os joelhos e mexendo os braços, na ponta dos pés.', easy: 'Marcha com joelho alto', hard: 'Sprint: o mais rápido possível' });
  add('escalador_lento', { n: 'Escalador lento', g: 'Cardio', pat: 'cardio', anim: 'climber_slow', met: 5, lim: ['punho'], how: 'Na posição de flexão, leve um joelho em direção ao peito e volte, alternando com controle.', easy: 'Mãos no sofá ou numa cadeira', hard: 'Escalador' });
  add('escalador', { n: 'Escalador', g: 'Cardio', pat: 'cardio', anim: 'climber', lvl: 2, met: 8, lim: ['punho'], how: 'Na posição de flexão, alterne os joelhos em direção ao peito em ritmo rápido, com o quadril baixo.', easy: 'Escalador lento', hard: 'Mais rápido' });
  add('burpee_ss', { n: 'Burpee sem salto', g: 'Cardio', pat: 'cardio', anim: 'burpee_step', lvl: 1, met: 6, lim: ['punho'], how: 'Agache e ponha as mãos no chão. Leve um pé de cada vez para trás até a prancha, volte um pé de cada vez e fique em pé.', easy: 'Mãos numa cadeira', hard: 'Burpee' });
  add('burpee', { n: 'Burpee', g: 'Cardio', pat: 'cardio', anim: 'burpee', lvl: 3, imp: true, lim: ['joelho', 'punho'], met: 10, how: 'Agache, jogue os pés para trás até a prancha, volte com um salto e salte no alto batendo palmas acima da cabeça.', easy: 'Burpee sem salto', hard: 'Com flexão' });
  add('patinador', { n: 'Patinador', g: 'Cardio', pat: 'cardio', anim: 'skater', lvl: 2, met: 6, lim: ['joelho'], how: 'Dê um passo largo na diagonal para trás cruzando a perna, como um patinador, e troque de lado.', easy: 'Passo menor', hard: 'Com salto lateral' });
  add('thruster', { n: 'Thruster com halteres', g: 'Corpo todo', pat: 'squat', anim: 'thruster', eq: ['halteres'], lvl: 2, alt: 'thruster_sp', lim: ['ombro'], met: 8, how: 'Halteres nos ombros, agache fundo e, ao subir, use o impulso para empurrar os halteres acima da cabeça. Volte aos ombros e repita.', easy: 'Halteres leves', hard: 'Mais peso' });
  add('thruster_sp', { n: 'Thruster sem peso', g: 'Corpo todo', pat: 'squat', anim: 'thruster_bw', met: 6, how: 'Mãos na altura dos ombros, agache e ao subir estique os braços para cima com força. Dá para usar garrafas de água ou uma mochila.', easy: 'Agachamento livre', hard: 'Thruster com halteres' });
  add('salto_caixa', { n: 'Salto na caixa', g: 'Pernas', pat: 'squat', anim: 'jumpsquat', eq: ['academia'], lvl: 3, imp: true, alt: 'agach_salto', lim: ['joelho'], met: 8, how: 'Salte com os dois pés para cima de uma caixa firme, aterrisse macio, fique em pé e desça um pé de cada vez.', easy: 'Agachamento com salto', hard: 'Caixa mais alta' });

  // Aquecimento e mobilidade
  add('rot_bracos', { n: 'Rotação de braços', g: 'Mobilidade', pat: 'mob', anim: 'armcircle', met: 2.5, how: 'Braços abertos, faça círculos grandes para frente e depois para trás.' });
  add('rot_quadril', { n: 'Rotação de quadril', g: 'Mobilidade', pat: 'mob', anim: 'hipcircle', met: 2.5, how: 'Mãos na cintura, faça círculos grandes com o quadril, trocando o sentido na metade.' });
  add('agach_lento', { n: 'Agachamento lento', g: 'Mobilidade', pat: 'mob', anim: 'squat', met: 3, how: 'Agachamentos bem devagar, só para acordar as pernas.' });
  add('bom_dia', { n: 'Bom dia', g: 'Mobilidade', pat: 'hinge', anim: 'goodmorning', met: 3, how: 'Mãos na nuca, joelhos levemente dobrados. Incline o tronco à frente levando o quadril para trás e volte.' });
  add('gato_vaca', { n: 'Gato e vaca', g: 'Mobilidade', pat: 'mob', anim: 'catcow', met: 2.3, how: 'De quatro, arredonde as costas olhando para o umbigo e depois afunde as costas olhando para frente, devagar.' });
  add('crianca', { n: 'Postura da criança', g: 'Mobilidade', pat: 'mob', anim: 'child', met: 2, how: 'Ajoelhado, sente nos calcanhares e leve o tronco à frente com os braços esticados no chão. Respire fundo.' });
  add('along_quad', { n: 'Alongamento da coxa', g: 'Mobilidade', pat: 'mob', anim: 'quadstretch', met: 2, how: 'Em pé, segure o pé atrás puxando o calcanhar para o glúteo. Troque de perna na metade.' });
  add('along_post', { n: 'Alongamento posterior', g: 'Mobilidade', pat: 'mob', anim: 'hamstretch', met: 2, how: 'Pernas esticadas, incline o tronco à frente tentando alcançar os pés, sem forçar.' });
  add('along_peito', { n: 'Alongamento de peito', g: 'Mobilidade', pat: 'mob', anim: 'chest', met: 2, how: 'Apoie o braço no batente da porta e gire o tronco para o lado oposto. Troque de lado na metade.' });

  // Mandíbula e postura (aba Rosto)
  add('mewing', { n: 'Postura de língua (mewing)', g: 'Rosto', pat: 'face', anim: 'chew', met: 1.3, how: 'Lábios fechados e dentes encostando de leve. Encoste a língua inteira no céu da boca, inclusive a parte de trás, e respire só pelo nariz. Segure sem forçar.', easy: 'Só a ponta e o meio da língua', hard: 'Engula mantendo a língua em cima' });
  add('chin_tuck', { n: 'Retração do queixo', g: 'Rosto', pat: 'face', anim: 'chintuck', met: 1.5, how: 'Em pé ou sentado, olhe para frente e leve o queixo reto para trás, como se fizesse papada, sem baixar a cabeça. Segure 3 segundos e solte.', easy: 'Deitado de barriga para cima', hard: 'Segure 5 segundos' });
  add('pescoco_iso', { n: 'Isometria de pescoço', g: 'Rosto', pat: 'face', anim: 'neckiso', met: 1.8, how: 'Mão na testa, empurre a cabeça contra a mão sem mexer, 10 segundos. Repita com a mão atrás da cabeça e de cada lado.', easy: 'Força leve', hard: 'Força moderada, 15 segundos' });
  add('mordedor_esq', { n: 'Mordedor · lado esquerdo', g: 'Rosto', pat: 'face', anim: 'chew', met: 1.5, how: 'Mordedor nos dentes de trás do lado esquerdo. Morda e solte em ritmo controlado, cerca de 1 por segundo, sem chegar à dor. Nunca use os dentes da frente.', easy: 'Ritmo mais lento', hard: 'Segure 2 segundos em cada mordida' });
  add('mordedor_dir', { n: 'Mordedor · lado direito', g: 'Rosto', pat: 'face', anim: 'chew', met: 1.5, how: 'Mesma coisa do lado direito, nos dentes de trás. Os dois lados recebem o mesmo tempo para não ficar assimétrico.', easy: 'Ritmo mais lento', hard: 'Segure 2 segundos em cada mordida' });
  add('abertura', { n: 'Abertura controlada', g: 'Rosto', pat: 'face', anim: 'chew', met: 1.2, how: 'Ponta da língua no céu da boca, abra a boca devagar até onde a língua deixar, sem desviar o queixo para os lados, e feche. É o exercício usado para relaxar a articulação.', easy: 'Abra menos', hard: 'Mais lento' });

  const WARM = ['rot_bracos', 'rot_quadril', 'marcha', 'agach_lento', 'polichinelo_ss', 'bom_dia'];
  const COOL = ['along_quad', 'along_post', 'along_peito', 'crianca'];
  const MOB = ['rot_quadril', 'gato_vaca', 'crianca', 'along_quad', 'along_post', 'along_peito'];

  // ---------- Programa 28 dias em casa ----------
  const W28 = [
    { name: 'Adaptação', work: 30, rest: 30, rounds: 3, rr: 60 },
    { name: 'Base', work: 40, rest: 20, rounds: 3, rr: 60 },
    { name: 'Intensidade', work: 40, rest: 20, rounds: 4, rr: 60 },
    { name: 'Pico', work: 45, rest: 15, rounds: 4, rr: 45 }
  ];
  const P28 = [
    { A: ['agach_cadeira', 'flex_parede', 'ponte', 'prancha_joelho', 'marcha'], B: ['polichinelo_ss', 'escalador_lento', 'dead_bug', 'panturrilha', 'abd_curto'], C: ['superman', 'ytw', 'agach_sumo', 'prancha_lat', 'cadeirinha'] },
    { A: ['agach', 'flex_incl', 'ponte', 'prancha', 'marcha'], B: ['polichinelo_ss', 'escalador_lento', 'dead_bug', 'avanco', 'urso'], C: ['superman', 'ytw', 'avanco', 'triceps_cad', 'prancha_lat'] },
    { A: ['agach_pausa', 'flex_joelho', 'ponte_uni', 'toque_ombro', 'burpee_ss'], B: ['patinador', 'escalador', 'dead_bug', 'avanco', 'abd_curto'], C: ['superman', 'ytw', 'agach_sumo', 'pike', 'prancha_lat'] },
    { A: ['agach_salto', 'flex', 'ponte_uni', 'toque_ombro', 'burpee_ss'], B: ['polichinelo', 'escalador', 'urso', 'avanco', 'burpee_ss'], C: ['superman', 'ytw', 'cadeirinha', 'pike', 'triceps_cad'] }
  ];
  const TYPE28 = { A: 'Pernas e peito', B: 'Core e cardio', C: 'Costas e postura', R: 'Descanso ativo', T: 'Teste final' };
  const PATTERN = ['A', 'B', 'C', 'R', 'A', 'B', 'R'];
  function day28(d) {
    const w = Math.ceil(d / 7); let t = PATTERN[(d - 1) % 7]; if (d === 28) t = 'T';
    const wk = W28[w - 1];
    if (t === 'R' || t === 'T') return { id: 'p28-' + d, name: 'Dia ' + d + ' · ' + TYPE28[t], short: TYPE28[t], blocks: [{ kind: 'list', label: 'Mobilidade', secs: 45, items: MOB }], note: t === 'T' ? 'Refaça os testes do dia 1 (flexões, agachamentos em 1 minuto, prancha) e compare na aba Progresso.' : 'Caminhada leve de 20 a 30 minutos, se der, e a mobilidade guiada.' };
    return { id: 'p28-' + d, name: 'Dia ' + d + ' · ' + TYPE28[t], short: TYPE28[t], week: w, blocks: [{ kind: 'list', label: 'Aquecimento', secs: 30, items: WARM }, { kind: 'timed', label: 'Circuito', work: wk.work, rest: wk.rest, rounds: wk.rounds, rr: wk.rr, items: P28[w - 1][t] }, { kind: 'list', label: 'Alongamento', secs: 30, items: COOL }], note: d === 1 ? 'Antes do treino, faça o teste inicial na aba Progresso: flexões máximas, agachamentos em 1 minuto e prancha.' : '' };
  }

  // ---------- Protocolo Aranha (inspirado no treino do Tom Holland) ----------
  const LV = (b, i, a) => ({ 1: b, 2: i, 3: a });
  const ARANHA = {
    name: 'Protocolo Aranha',
    sub: 'Inspirado no treino que o Tom Holland contou e que os treinadores dele descreveram, até Spider-Man: Brand New Day (2026)',
    about: [
      'O objetivo dele para o filme foi ganhar uns 4 kg de músculo sem perder agilidade, para o traje dispensar enchimento. A base é peso do corpo, às vezes com colete de peso, mais circuitos intensos.',
      'Ele diz que o resultado é uns 80% alimentação e 20% treino, e que precisa planejar 3 refeições por dia para comer o suficiente. Também fala que dorme 9 a 10 horas quando pode.',
      'Aqui as sessões foram adaptadas em 3 níveis. Sem barra fixa, o app troca a barra por remada na mesa ou superman; sem halteres, o thruster vira thruster sem peso.'
    ],
    sources: [
      ['Men’s Health Australia, via BOXROX (mai/2026): escada e circuito', 'https://www.boxrox.com/?p=244252'],
      ['Men’s Fitness UK: treino de 1.500 repetições e sessão explosiva', 'https://mensfitness.co.uk/features/tom-hollands-spider-man-physique/'],
      ['Insider/Yahoo: circuito de 5 passos do treinador George Ashwell', 'https://www.yahoo.com/news/tom-holland-followed-5-step-183602648.html']
    ],
    week: [['Seg', 'ashwell'], ['Ter', 'cindy'], ['Qua', 'mob'], ['Qui', 'explosivo'], ['Sex', 'escada'], ['Sáb', 'cardio'], ['Dom', 'off']],
    sessions: {
      ashwell: lv => ({ id: 'ar-ashwell', name: 'Circuito Ashwell', short: 'Circuito de 5 passos sem descanso entre os exercícios, 60 s entre as voltas', blocks: [
        { kind: 'list', label: 'Aquecimento', secs: 30, items: WARM },
        { kind: 'circuit', label: 'Circuito', rounds: LV(3, 4, 5)[lv], rr: 60, items: [['bear_crawl', LV('40 s', '60 s', '60 s')[lv]], ['toque_ombro', LV('10 por lado', '20 por lado', '20 por lado')[lv]], ['thruster', LV('12', '20', '20')[lv]], ['renegada', LV('8 por lado', '15 por lado', '20 por lado')[lv]], ['flex', LV('10', '20', '25')[lv]]] },
        { kind: 'list', label: 'Alongamento', secs: 30, items: COOL }] }),
      cindy: lv => ({ id: 'ar-cindy', name: 'Cindy', short: 'O máximo de voltas no tempo. O recorde dele é 27 voltas em 20 minutos', blocks: [
        { kind: 'list', label: 'Aquecimento', secs: 30, items: WARM },
        { kind: 'amrap', label: 'Máximo de voltas', mins: LV(12, 15, 20)[lv], items: [['barra', LV('3', '5', '5')[lv]], ['flex', LV('6', '10', '10')[lv]], ['agach', LV('9', '15', '15')[lv]]] },
        { kind: 'list', label: 'Alongamento', secs: 30, items: COOL }] }),
      escada: lv => ({ id: 'ar-escada', name: 'Escada 1 → ' + LV(3, 5, 10)[lv], short: lv === 3 ? 'A versão completa: 100 barras, 200 mergulhos, 300 flexões, 400 abdominais e 500 agachamentos' : 'Sobe e desce a escada. Na volta N você faz N barras, 2N mergulhos, 3N flexões, 4N abdominais e 5N agachamentos', blocks: [
        { kind: 'list', label: 'Aquecimento', secs: 30, items: WARM },
        { kind: 'ladder', label: 'Escada', top: LV(3, 5, 10)[lv], items: [['barra', 1], ['mergulho', 2], ['flex', 3], ['abd', 4], ['agach', 5]] },
        { kind: 'list', label: 'Alongamento', secs: 30, items: COOL }] }),
      explosivo: lv => ({ id: 'ar-explosivo', name: 'Sessão explosiva', short: 'Força e potência em pares de exercícios, com finalizador de condicionamento', blocks: [
        { kind: 'list', label: 'Aquecimento', secs: 30, items: WARM },
        { kind: 'sets', label: 'Força e potência', items: [['barra', LV(3, 4, 4)[lv], 'máx', 75], ['mergulho', LV(3, 4, 4)[lv], LV('8', '12', '15')[lv], 75], ['thruster', LV(3, 4, 4)[lv], '10', 75], ['salto_caixa', LV(3, 4, 4)[lv], LV('6', '10', '10')[lv], 75], ['flex', 3, LV('10', '20', '20')[lv], 60], ['elev_joelhos_barra', 3, LV('10', '15', '15')[lv], 60]] },
        { kind: 'circuit', label: 'Finalizador', rounds: LV(3, 4, 5)[lv], rr: 60, items: [['escalador', '20'], [lv === 1 ? 'burpee_ss' : 'burpee', '10'], ['corrida_lugar', '30 s']] },
        { kind: 'list', label: 'Alongamento', secs: 30, items: COOL }] }),
      mob: () => ({ id: 'ar-mob', name: 'Mobilidade', short: 'Recuperação ativa', blocks: [{ kind: 'list', label: 'Mobilidade', secs: 45, items: MOB }] }),
      cardio: () => ({ id: 'ar-cardio', name: 'Cardio leve', short: '30 minutos de caminhada rápida, bike ou corrida leve. Use o timer livre.', blocks: [{ kind: 'timed', label: 'Cardio intervalado leve', work: 60, rest: 30, rounds: 1, rr: 0, items: ['marcha', 'polichinelo_ss', 'marcha', 'patinador', 'marcha', 'polichinelo_ss', 'marcha', 'patinador'] }] }),
      off: () => null
    }
  };

  // ---------- Rosto: mandíbula e postura ----------
  const JAW_WEEKS = [[3, 30, 30], [4, 40, 30], [4, 45, 30], [5, 45, 30]];
  function jawSession(week) {
    const [sets, work, rest] = JAW_WEEKS[Math.min(JAW_WEEKS.length, Math.max(1, week)) - 1];
    const chew = []; for (let i = 0; i < sets; i++) chew.push('mordedor_esq', 'mordedor_dir');
    return { id: 'jaw', name: 'Mandíbula · semana ' + Math.min(week, 4) + (week > 4 ? '+' : ''), short: sets + ' séries de ' + work + ' s por lado no mordedor, mais postura e pescoço', blocks: [
      { kind: 'list', label: 'Postura', secs: 40, items: ['abertura', 'chin_tuck', 'mewing'] },
      { kind: 'timed', label: 'Mordedor', work, rest, rounds: 1, rr: 0, items: chew },
      { kind: 'list', label: 'Pescoço', secs: 40, items: ['pescoco_iso', 'chin_tuck', 'mewing'] }] };
  }
  const JAW_INFO = {
    facts: [
      ['O que mais muda o contorno do rosto', 'Baixar a gordura corporal. Em adulto, é isso que mais deixa a mandíbula marcada. A meta de calorias do app já trabalha nisso.'],
      ['Mewing (postura de língua)', 'Não existe estudo controlado mostrando que muda o osso em adulto. O que ele melhora de verdade é a postura de cabeça e pescoço e o hábito de respirar pelo nariz, e isso muda como o rosto aparece de perfil e nas fotos.'],
      ['Mordedor de borracha', 'Aumenta a força de mordida e pode engrossar o masseter, o músculo do canto da mandíbula. Isso deixa o rosto mais largo embaixo, não muda o osso, e o ganho some se você parar. Exagero pode causar dor na articulação (ATM), estalos e dor de cabeça.'],
      ['Postura do pescoço', 'Cabeça projetada para frente cria papada visual. Retração do queixo e isometria de pescoço corrigem isso sem risco e fazem diferença imediata no perfil.']
    ],
    rules: ['Mordedor em dias alternados, no máximo 4 vezes por semana, começando com 3 séries de 30 segundos por lado.', 'Use só os dentes de trás e os dois lados por igual.', 'Pare na hora e espere uns dias se aparecer dor, estalo, travamento ou dor de cabeça. Se continuar, procure um dentista.', 'Mewing é o dia todo, no automático. O app manda lembretes para você checar a língua.'],
    sources: [['Acibadem: o que ortodontistas dizem sobre mewing', 'https://acibademinternational.com/blog/mewing-what-orthodontists-say-about-tongue-posture-jawlines-and-the-evidence/'], ['Medical News Today: mordedores tipo Jawzrsize', 'https://www.medicalnewstoday.com/articles/jawzrsize-review'], ['Acibadem: o que exercícios de mandíbula mudam', 'https://acibademinternational.com/blog/jaw-exercises-what-they-can-and-cannot-change-jawline-tmj-and-bruxism/']]
  };

  // ---------- Calistenia Pura (sem nenhum aparelho) ----------
  const CAL_W = [[3, '8', 75], [3, '10', 75], [4, '10', 60], [4, '12', 60]];
  const CAL_DAYS = {
    A: { name: 'Empurrar e pernas', items: [['flex', 1], ['agach', 1.5], ['pike', 1], ['avanco', 1], ['ponte_uni', 1], ['prancha', 'tempo']] },
    B: { name: 'Costas e core', items: [['superman', 1.2], ['ytw', 1], ['bear_crawl', 'tempo'], ['dead_bug', 1.2], ['prancha_lat', 'tempo'], ['elev_pernas', 1]] },
    C: { name: 'Pernas e potência', items: [['agach_pausa', 1], ['agach_salto', 0.8], ['patinador', 1.5], ['burpee', 0.8], ['panturrilha', 2], ['escalador', 2]] }
  };
  function calSession(day, week) {
    const [sets, reps, rest] = CAL_W[Math.min(4, Math.max(1, week)) - 1], d = CAL_DAYS[day];
    return { id: 'cal-' + day, name: 'Calistenia · ' + d.name, short: 'Semana ' + week + ' · ' + sets + ' séries · só o peso do corpo', blocks: [
      { kind: 'list', label: 'Aquecimento', secs: 30, items: WARM },
      { kind: 'sets', label: 'Séries', items: d.items.map(([id, m]) => [id, sets, m === 'tempo' ? (20 + week * 5) + ' s' : String(Math.round(+reps * m)), rest]) },
      { kind: 'list', label: 'Alongamento', secs: 30, items: COOL }] };
  }
  // ---------- Halteres em Casa ----------
  const HAL_DAYS = {
    A: { name: 'Corpo todo A', items: ['goblet', 'desenvolvimento', 'remada_halter', 'stiff', 'rosca', 'prancha'] },
    B: { name: 'Corpo todo B', items: ['avanco_halter', 'thruster', 'renegada', 'elevacao_lateral', 'flex', 'dead_bug'] }
  };
  function halSession(day, week) {
    const [sets, reps] = [[3, '12'], [3, '10'], [4, '10'], [4, '8']][Math.min(4, Math.max(1, week)) - 1], d = HAL_DAYS[day];
    return { id: 'hal-' + day, name: 'Halteres · ' + d.name, short: 'Semana ' + week + ' · ' + sets + ' × ' + reps + ' · aumente o peso quando sobrar 2 repetições', blocks: [
      { kind: 'list', label: 'Aquecimento', secs: 30, items: WARM },
      { kind: 'sets', label: 'Séries', items: d.items.map(id => [id, sets, /prancha|dead_bug/.test(id) ? '30 s' : reps, 75]) },
      { kind: 'list', label: 'Alongamento', secs: 30, items: COOL }] };
  }
  const PROGRAMS = [
    { id: 'p28', name: '28 Dias em Casa', tag: 'sem', freq: '5 dias por semana', len: '4 semanas', desc: 'Circuitos por tempo de 20 a 30 minutos, do iniciante ao pico. O programa mais simples para começar.' },
    { id: 'calis', name: 'Calistenia Pura', tag: 'sem', freq: '3 dias por semana', len: '4 semanas', desc: 'Só o peso do corpo, sem cadeira, mesa ou barra. Séries e repetições que aumentam toda semana.' },
    { id: 'aranha', name: 'Protocolo Aranha', tag: 'misto', freq: '5 dias por semana', len: 'Contínuo', desc: 'Inspirado no treino do Tom Holland: Cindy, escada de 1.500 repetições, circuito Ashwell e sessão explosiva. Adapta se você não tiver barra ou halteres.' },
    { id: 'halteres', name: 'Halteres em Casa', tag: 'com', freq: '3 dias por semana', len: '4 semanas', desc: 'Corpo todo com um par de halteres. Para ganhar força e massa sem academia.' },
    { id: 'rosto', name: 'Mandíbula e postura', tag: 'sem', freq: 'Dia sim, dia não', len: 'Contínuo', desc: 'Mordedor, postura de língua e pescoço, com as regras para não machucar a articulação.' }
  ];

  // ---------- gerador de treino ----------
  const TEMPL = {
    corpo: ['squat', 'push', 'pull', 'hinge', 'core', 'cardio', 'lunge', 'core'],
    superior: ['push', 'pull', 'push', 'pull', 'core', 'push'],
    inferior: ['squat', 'lunge', 'hinge', 'squat', 'calf', 'core'],
    core: ['core', 'core', 'cardio', 'core', 'core', 'hinge'],
    cardio: ['cardio', 'squat', 'cardio', 'core', 'cardio', 'lunge'],
    pernas_core: ['squat', 'core', 'lunge', 'core', 'hinge', 'cardio']
  };
  function hasEq(ex, eqs) { return ex.eq.every(e => eqs.includes(e)); }
  function resolve(id, eqs, opts) {
    let ex = X[id], guard = 0;
    while (ex && guard++ < 6) {
      const bad = !hasEq(ex, eqs) || (opts && opts.noImpact && ex.imp) || (opts && opts.lim && ex.lim.some(l => opts.lim.includes(l)));
      if (!bad) return ex;
      const alt = ex.alt || (ex.imp ? ({ squat: 'agach_pausa', cardio: 'marcha', lunge: 'avanco' })[ex.pat] : null);
      if (!alt || alt === ex.id) break;
      ex = X[alt];
    }
    return ex;
  }
  function generate(o) {
    const eqs = o.eq || [];
    const lvl = o.level || 1;
    const tpl = (TEMPL[o.focus] || TEMPL.corpo).slice(0, o.focus === 'corpo' ? (o.minutes >= 30 ? 8 : 6) : 6);
    const rnd = mulberry(o.seed || Date.now());
    const used = new Set();
    const items = tpl.map(pat => {
      let pool = Object.values(X).filter(e => e.pat !== 'face' && e.pat === pat && hasEq(e, eqs) && e.lvl <= lvl && !used.has(e.id) && !(o.noImpact && e.imp) && !(o.lim || []).some(l => e.lim.includes(l)));
      if (!pool.length) pool = Object.values(X).filter(e => e.pat === pat && hasEq(e, eqs) && !used.has(e.id));
      if (!pool.length) pool = Object.values(X).filter(e => e.pat === 'core' && hasEq(e, eqs) && !used.has(e.id));
      // prefere exercícios do nível do usuário e com equipamento escolhido
      pool.sort((a, b) => score(b) - score(a) + (rnd() - 0.5) * 2.2);
      function score(e) { return (e.lvl === lvl ? 1.2 : 0) + (e.eq.length ? 1 : 0) * (eqs.length ? 0.8 : 0); }
      const pick = pool[0]; used.add(pick.id); return pick.id;
    });
    const wr = { 1: [30, 30], 2: [40, 20], 3: [45, 15] }[lvl];
    const total = (o.minutes || 20) * 60, warm = WARM.length * 30, cool = COOL.length * 30;
    const per = items.length * (wr[0] + wr[1]) - wr[1];
    const rounds = Math.max(1, Math.min(6, Math.round((total - warm - cool + 60) / (per + 60))));
    const fl = { corpo: 'corpo todo', superior: 'parte de cima', inferior: 'pernas', core: 'abdômen e core', cardio: 'cardio', pernas_core: 'pernas e abdômen' }[o.focus] || 'corpo todo';
    const eqName = eqs.length ? eqs.map(e => EQ_LABEL[e]).join(', ') : 'sem equipamento';
    if (o.format === 'series') {
      const sets = lvl === 1 ? 3 : 4, reps = lvl === 1 ? '10' : lvl === 2 ? '12' : '15';
      return { id: 'gen', name: 'Treino de ' + fl, short: (o.minutes || 20) + ' min · ' + eqName + ' · séries', generated: o, blocks: [{ kind: 'list', label: 'Aquecimento', secs: 30, items: WARM }, { kind: 'sets', label: 'Séries', items: items.slice(0, Math.max(3, Math.round(((o.minutes || 20) - 5) / 4))).map(id => [id, sets, X[id].pat === 'core' && /prancha|urso|cadeirinha/.test(id) ? '30 s' : reps, lvl === 3 ? 60 : 75]) }, { kind: 'list', label: 'Alongamento', secs: 30, items: COOL }] };
    }
    return { id: 'gen', name: 'Treino de ' + fl, short: (o.minutes || 20) + ' min · ' + eqName, generated: o, blocks: [{ kind: 'list', label: 'Aquecimento', secs: 30, items: WARM }, { kind: 'timed', label: 'Circuito', work: wr[0], rest: wr[1], rounds, rr: 60, items }, { kind: 'list', label: 'Alongamento', secs: 30, items: COOL }] };
  }
  function mulberry(a) { a = a >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  const EQ_LABEL = { cadeira: 'cadeira ou mesa', halteres: 'halteres', barra: 'barra fixa', paralela: 'paralelas', elastico: 'elástico', academia: 'academia' };

  window.EXDB = { X, WARM, COOL, MOB, W28, day28, ARANHA, jawSession, JAW_INFO, calSession, halSession, CAL_DAYS, HAL_DAYS, PROGRAMS, generate, resolve, hasEq, EQ_LABEL, TYPE28, PATTERN };
})();
