/* Gasto calórico dos treinos — 2024 Adult Compendium of Physical Activities (Herrmann et al.,
   J Sport Health Sci 2024;13:6-12, pacompendium.com).
   O Compêndio não traz MET por exercício isolado: cada exercício entra na categoria oficial que o descreve.
   O MET é corrigido pelo gasto em repouso da própria pessoa (Mifflin-St Jeor) em vez do padrão de
   1 kcal/kg/h, que superestima o gasto de quem tem mais gordura corporal. */
(function () {
  // código do Compêndio: [MET, descrição]
  const C = {
    '02101': [2.3, 'Alongamento leve'],
    '02024': [2.8, 'Calistenia leve (abdominal, prancha)'],
    '02022': [3.8, 'Calistenia moderada (flexão, agachamento, avanço, barra)'],
    '02054': [3.5, 'Musculação, vários exercícios, 8 a 15 repetições'],
    '02052': [5.0, 'Musculação: agachamento e levantamento terra'],
    '02057': [6.5, 'Exercícios com o peso do corpo, alta intensidade'],
    '02020': [7.5, 'Calistenia vigorosa (burpee, polichinelo, saltos)'],
    '02032': [6.0, 'Circuito com o peso do corpo (sem descanso)'],
    '07040': [1.3, 'Em pé, parado (descanso entre séries) · código de 2011']
  };
  const MAP = {
    '02101': 'gato_vaca crianca along_quad along_post along_peito',
    '02024': 'rot_bracos rot_quadril agach_lento bom_dia panturrilha flex_parede ytw superman prancha_joelho prancha prancha_lat dead_bug abd_curto elev_pernas ponte cadeirinha urso',
    '02022': 'agach_cadeira agach agach_pausa agach_sumo avanco bulgaro ponte_uni flex_incl flex_joelho flex triceps_cad pike remada_mesa remada_elastico abd toque_ombro elev_joelhos_barra polichinelo_ss marcha escalador_lento barra',
    '02054': 'desenvolvimento elevacao_lateral rosca remada_halter renegada avanco_halter',
    '02052': 'goblet stiff thruster',
    '02057': 'mergulho burpee_ss thruster_sp',
    '02020': 'agach_salto polichinelo corrida_lugar escalador burpee patinador bear_crawl salto_caixa',
    '07040': 'mewing chin_tuck pescoco_iso mordedor_esq mordedor_dir abertura'
  };
  const CODE = {}; Object.entries(MAP).forEach(([c, ids]) => ids.split(' ').forEach(id => { CODE[id] = c; }));
  // exercício novo sem código: decide pelo padrão de movimento
  function codeOf(ex) {
    if (!ex) return '02022';
    if (CODE[ex.id]) return CODE[ex.id];
    if (ex.pat === 'face') return '07040';
    if (ex.pat === 'mob') return '02024';
    if (ex.pat === 'cardio') return ex.imp ? '02020' : '02022';
    if ((ex.eq || []).includes('halteres')) return '02054';
    return ex.pat === 'core' ? '02024' : '02022';
  }
  const met = ex => C[codeOf(ex)][0];
  // kcal por minuto em repouso (1 MET) da pessoa: gasto basal / 1440
  function rest() {
    const g = window.Store && Store.S.profile ? Store.goals() : null;
    if (g && g.bmr) return g.bmr / 1440;
    return (window.Store ? Store.weightNow() : 80) / 60; // sem perfil: padrão de 1 kcal/kg/h
  }
  // gasto bruto (o que o corpo gastou no período) e líquido (só o que o exercício somou acima do repouso)
  function kcal(m, minutes) { const r = rest(); return { gross: m * r * minutes, net: Math.max(0, m - 1) * r * minutes }; }
  window.Energy = { C, codeOf, met, rest, kcal, REST: 1.3, CIRCUIT: 6.0 };
})();
