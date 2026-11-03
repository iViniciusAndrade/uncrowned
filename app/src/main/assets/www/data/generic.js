/* Alimentos genéricos, sem marca, por 100 g.
   Fonte: IBGE, POF 2008-2009, Tabelas de Composição Nutricional dos Alimentos Consumidos no Brasil
   (valores consultados no espelho tabelatacoonline.com.br, seção IBGE). Medidas marcadas "aprox." são estimativas de porção.
   Formato: [id, nome, kcal, proteína, carboidrato, gordura, fibra, sódio, medidas[[rótulo, g]], fonte (opcional, quando não é o IBGE)] */
window.GENERICOS = [
  ['g1', 'Pizza de calabresa', 285, 13.7, 29.5, 12.2, null, null, [['fatia média (aprox.)', 100], ['pedaço pequeno (aprox.)', 60]]],
  ['g2', 'Pizza de muçarela', 281, 14.6, 29.8, 11.3, null, null, [['fatia média (aprox.)', 100], ['pedaço pequeno (aprox.)', 60]]],
  ['g3', 'Pizza portuguesa', 247, 11.8, 22.4, 12.2, null, null, [['fatia média (aprox.)', 100]]],
  ['g4', 'Pizza (sabor não especificado)', 281, 14.6, 29.8, 11.3, null, null, [['fatia média (aprox.)', 100]]],
  ['g5', 'Cachorro-quente', 272, 8.7, 24.8, 15.2, null, null, [['unidade (aprox.)', 150]]],
  ['g6', 'Hambúrguer (sanduíche)', 267, 13.1, 32.4, 9.2, null, null, [['unidade (aprox.)', 140]]],
  ['g7', 'Pão de hambúrguer', 279, 9.5, 49.5, 4.3, null, null, [['unidade (aprox.)', 50]]],
  ['g8', 'Esfirra de carne', 346, 11.9, 26.2, 21.4, null, null, [['unidade (aprox.)', 60]]],
  ['g9', 'Nuggets de frango empanados', 273, 16.2, 15.9, 15.6, 0.6, 704, [['unidade (aprox.)', 20]]],
  ['g10', 'Sassami (filezinho de frango) grelhado ou temperado, já pronto', 173, 30.9, 0, 4.5, null, null, [['filezinho pronto (aprox.)', 30], ['porção de 100 g', 100]]],
  ['g11', 'Macarrão cozido', 158, 5.8, 30.9, 0.9, null, null, [['pegador (aprox.)', 110], ['prato raso (aprox.)', 220]]],
  ['g12', 'Brigadeiro', 334, 7.5, 54.9, 10.1, null, null, [['unidade (aprox.)', 20]]],
  ['g13', 'Sorvete industrializado (qualquer sabor)', 206, 3.6, 25.1, 11, null, null, [['bola (aprox.)', 60]]],
  ['g14', 'Açaí com granola', 110, 0.7, 21.5, 3.7, null, null, [['tigela de 300 ml (aprox.)', 300], ['copo de 500 ml (aprox.)', 500]]],
  // valores do peito de frango sem pele cru da TACO (o sassami é o filezinho do peito); peso do pedaço cru como vem no pacote
  ['g15', 'Sassami (filezinho de frango) cru', 119, 21.5, 0, 3, null, 56, [['filezinho cru (aprox.)', 40], ['porção de 100 g', 100]], 'TACO']
];
