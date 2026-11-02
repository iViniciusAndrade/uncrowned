/* Uncrowned — boneco 3D procedural que demonstra cada exercício.
   Ângulos em graus. Convenções:
   rx  inclinação do corpo inteiro para frente (90 = deitado de bruços, -90 = de barriga para cima)
   ry  giro, rz  rolagem lateral, lift  sobe o corpo (saltos), sp  flexão da coluna, nk  pescoço
   sf  flexão do ombro (braço para frente/cima), sa  abdução (braço para o lado), e  flexão do cotovelo,
   ez  dobra do antebraço no plano lateral (para desenvolvimento/barra)
   hf  flexão do quadril, ha  abdução do quadril, k  flexão do joelho
   Sem prefixo l/r vale para os dois lados. */
(function () {
  const D = Math.PI / 180;
  const KEYS = ['rx','ry','rz','lift','sp','sy','nk','lsf','rsf','lsa','rsa','le','re','lez','rez','lhf','rhf','lha','rha','lk','rk'];
  const BASE = { lsa: 7, rsa: 7, le: 8, re: 8 };

  function expand(p) {
    const o = Object.assign({}, BASE);
    const sym = { sf: ['lsf','rsf'], sa: ['lsa','rsa'], e: ['le','re'], ez: ['lez','rez'], hf: ['lhf','rhf'], ha: ['lha','rha'], k: ['lk','rk'] };
    for (const k in p) {
      if (sym[k]) { sym[k].forEach(s => { if (!(s in p)) o[s] = p[k]; }); }
      else o[k] = p[k];
    }
    return o;
  }
  const P = (o) => o; // marcador legível

  // ---------- poses de apoio ----------
  const plankTop = { rx: 68, sf: 68, e: 0 };
  const quad = { rx: 90, hf: 90, k: 90, sf: 90, e: 0 };

  // ---------- biblioteca de animações ----------
  // dur = segundos por ciclo; snap = 'floor' | 'feet' | 'bar'; props: box (sob as mãos), wall, dumbbells, bar, pbars, table
  const ANIM = {
    stand: { dur: 3, frames: [P({}), P({ nk: 4 })] },
    squat: { dur: 2.6, frames: [P({ sf: 10 }), P({ hf: 100, k: 125, sp: 38, sf: 125, e: 0 })] },
    squat_box: { dur: 2.8, props: { seat: true }, frames: [P({ sf: 10 }), P({ hf: 92, k: 105, sp: 35, sf: 120, e: 0 })] },
    squat_pause: { dur: 3.6, frames: [P({ sf: 10 }), P({ hf: 100, k: 125, sp: 38, sf: 125, e: 0 }), P({ hf: 100, k: 125, sp: 38, sf: 125, e: 0 })] },
    goblet: { dur: 2.8, props: { dumbbells: true }, frames: [P({ sf: 30, e: 130 }), P({ hf: 100, k: 125, sp: 32, sf: 55, e: 130 })] },
    sumo: { dur: 2.8, frames: [P({ ha: 28, sf: 40, e: 120 }), P({ ha: 34, hf: 85, k: 100, sp: 12, sf: 55, e: 120 })] },
    jumpsquat: { dur: 1.7, frames: [P({ hf: 95, k: 120, sp: 35, sf: -25 }), P({ lift: 0.28, hf: 4, k: 6, sf: 170, e: 0 }), P({ hf: 40, k: 50, sp: 10, sf: 40 })] },
    lunge: { dur: 3.2, frames: [P({}), P({ lhf: 82, lk: 92, rhf: -14, rk: 102, sp: 4, sa: 12 }), P({}), P({ rhf: 82, rk: 92, lhf: -14, lk: 102, sp: 4, sa: 12 })] },
    split: { dur: 2.6, props: { benchBack: true }, frames: [P({ lhf: 30, lk: 25, rhf: -40, rk: 95 }), P({ lhf: 88, lk: 95, rhf: -5, rk: 125, sp: 12 })] },
    bridge: { dur: 2.6, frames: [P({ rx: -90, hf: 55, k: 110, sf: 0, sa: 15 }), P({ rx: -118, hf: -10, k: 107, sf: -25, sa: 15 })] },
    bridge1: { dur: 2.8, frames: [P({ rx: -90, rhf: 55, rk: 110, lhf: 40, lk: 0, sa: 15 }), P({ rx: -118, rhf: -10, rk: 107, lhf: -10, lk: 0, sf: -25, sa: 15 })] },
    calf: { dur: 1.6, frames: [P({}), P({ lift: 0.07 })] },
    wallsit: { dur: 4, props: { wall: 'back' }, frames: [P({ hf: 88, k: 88, sa: 12 }), P({ hf: 88, k: 88, sa: 12, nk: 4 })] },
    rdl: { dur: 3, props: { dumbbells: true }, frames: [P({ sf: 0 }), P({ rx: 72, hf: 82, k: 18, sf: 72 })] },
    goodmorning: { dur: 3, frames: [P({ sa: 120, e: 140 }), P({ rx: 65, hf: 72, k: 14, sa: 120, e: 140 })] },
    pushup: { dur: 2.2, frames: [P(plankTop), P({ rx: 84, sf: 14, e: 70 })] },
    pushup_knee: { dur: 2.2, frames: [P({ rx: 55, sf: 55, e: 0, k: 95 }), P({ rx: 74, sf: 4, e: 70, k: 95 })] },
    pushup_incline: { dur: 2.2, props: { box: 0.5 }, frames: [P({ rx: 42, sf: 42, e: 0 }), P({ rx: 57, sf: -13, e: 70 })] },
    pushup_wall: { dur: 2.2, props: { wall: 'front' }, frames: [P({ rx: 15, sf: 105, e: 0 }), P({ rx: 30, sf: 50, e: 70 })] },
    pike: { dur: 2.4, frames: [P({ rx: 115, sf: 115, e: 0, hf: 82 }), P({ rx: 128, sf: 68, e: 60, hf: 92 })] },
    dip_chair: { dur: 2.4, snap: 'feet', props: { box: 'hands' }, frames: [P({ hf: 62, k: 62, sf: -38, e: 0, sa: 10 }), P({ hf: 82, k: 92, sf: -68, e: 85, sa: 10 })] },
    dip: { dur: 2.4, snap: 'bar', barY: 1.3, props: { pbars: true }, frames: [P({ sf: 0, e: 0, sa: 6, k: 70, hf: 15 }), P({ rx: 14, sf: -55, e: 95, sa: 6, k: 70, hf: 30 })] },
    press: { dur: 2.4, props: { dumbbells: true }, frames: [P({ sa: 85, ez: 95 }), P({ sa: 168, ez: 8 })] },
    curl: { dur: 2.2, props: { dumbbells: true }, frames: [P({ sf: 0, e: 6 }), P({ sf: 10, e: 135 })] },
    lateral: { dur: 2.2, props: { dumbbells: true }, frames: [P({ sa: 10, e: 12 }), P({ sa: 85, e: 12 })] },
    thruster: { dur: 2.4, props: { dumbbells: true }, frames: [P({ hf: 100, k: 125, sp: 32, sa: 80, ez: 100 }), P({ sa: 172, ez: 6 })] },
    thruster_bw: { dur: 2.4, frames: [P({ hf: 100, k: 125, sp: 32, sa: 80, ez: 100 }), P({ sa: 172, ez: 6 })] },
    row: { dur: 2.2, props: { dumbbells: true }, frames: [P({ rx: 48, hf: 58, k: 22, sf: 48, e: 0 }), P({ rx: 48, hf: 58, k: 22, sf: 8, e: 95 })] },
    renegade: { dur: 3, props: { dumbbells: true }, frames: [P(plankTop), P(Object.assign({}, plankTop, { lsf: 25, le: 100 })), P(plankTop), P(Object.assign({}, plankTop, { rsf: 25, re: 100 }))] },
    shouldertap: { dur: 2.4, frames: [P(plankTop), P(Object.assign({}, plankTop, { lsf: 70, lsa: -30, le: 115 })), P(plankTop), P(Object.assign({}, plankTop, { rsf: 70, rsa: -30, re: 115 }))] },
    pullup: { dur: 2.6, snap: 'bar', barY: 2.15, props: { bar: true }, frames: [P({ sa: 172, e: 0, k: 25 }), P({ sa: 112, lez: 70, rez: 70, k: 25, hf: 10 })] },
    invrow: { dur: 2.4, snap: 'feet', props: { table: true }, frames: [P({ rx: -68, sf: 68, e: 0 }), P({ rx: -55, sf: 15, e: 95 })] },
    superman: { dur: 2.6, frames: [P({ rx: 90, sf: 178 }), P({ rx: 90, sp: -14, nk: -10, sf: 196, hf: -16 })] },
    ytw: { dur: 4.5, frames: [P({ rx: 90, sp: -10, sf: 196, sa: 28 }), P({ rx: 90, sp: -10, sa: 90, sf: -12 }), P({ rx: 90, sp: -10, sa: 60, sf: -10, lez: -70, rez: -70 })] },
    plank: { dur: 4, frames: [P({ rx: 80, sf: 80, e: 90 }), P({ rx: 80, sf: 80, e: 90, nk: 4 })] },
    plank_knee: { dur: 4, frames: [P({ rx: 64, sf: 64, e: 90, k: 95 }), P({ rx: 64, sf: 64, e: 90, k: 95, nk: 4 })] },
    sideplank: { dur: 4, frames: [P({ rz: 72, rsa: 88, re: 90, lsa: 15 }), P({ rz: 74, rsa: 88, re: 90, lsa: 15 })] },
    deadbug: { dur: 3.2, frames: [P({ rx: -90, sf: 90, hf: 90, k: 90, e: 0 }), P({ rx: -90, lsf: 170, rsf: 90, rhf: 15, rk: 0, lhf: 90, lk: 90, e: 0 }), P({ rx: -90, sf: 90, hf: 90, k: 90, e: 0 }), P({ rx: -90, rsf: 170, lsf: 90, lhf: 15, lk: 0, rhf: 90, rk: 90, e: 0 })] },
    crunch: { dur: 2.2, frames: [P({ rx: -90, hf: 55, k: 110, sf: 30 }), P({ rx: -90, sp: 32, nk: 10, hf: 55, k: 110, sf: 45 })] },
    situp: { dur: 2.8, frames: [P({ rx: -90, hf: 55, k: 110, sf: 150 }), P({ rx: -90, sp: 80, hf: 55, k: 110, sf: 100 })] },
    legraise: { dur: 2.8, frames: [P({ rx: -90, hf: 8, sa: 15 }), P({ rx: -90, hf: 88, sa: 15 })] },
    kneeraise: { dur: 2.4, snap: 'bar', barY: 2.15, props: { bar: true }, frames: [P({ sa: 172, e: 0, k: 10 }), P({ sa: 172, e: 0, hf: 100, k: 95 })] },
    bearhold: { dur: 4, frames: [P(Object.assign({}, quad, { k: 95 })), P(Object.assign({}, quad, { k: 95, nk: 4 }))] },
    bearcrawl: { dur: 1.8, frames: [P(Object.assign({}, quad, { lsf: 110, rsf: 75, lhf: 75, rhf: 105, k: 95 })), P(Object.assign({}, quad, { rsf: 110, lsf: 75, rhf: 75, lhf: 105, k: 95 }))] },
    quadruped: { dur: 4, frames: [P(Object.assign({}, quad, { k: 90 })), P(Object.assign({}, quad, { k: 90, nk: 5 }))] },
    catcow: { dur: 4, frames: [P(Object.assign({}, quad, { sp: 16, nk: 22 })), P(Object.assign({}, quad, { sp: -14, nk: -20 }))] },
    child: { dur: 5, frames: [P({ rx: 85, sp: 15, hf: 123, k: 128, sf: 190, e: 0 }), P({ rx: 86, sp: 17, hf: 124, k: 128, sf: 190, e: 0 })] },
    stepjack: { dur: 2, frames: [P({ sa: 8 }), P({ lha: 22, sa: 165, e: 0 }), P({ sa: 8 }), P({ rha: 22, sa: 165, e: 0 })] },
    jack: { dur: 1.1, frames: [P({ sa: 8 }), P({ ha: 20, sa: 165, e: 0, lift: 0.07 })] },
    march: { dur: 1.6, frames: [P({ lhf: 80, lk: 85, rsf: 40, lsf: -25, e: 80 }), P({ rhf: 80, rk: 85, lsf: 40, rsf: -25, e: 80 })] },
    highknees: { dur: 0.8, frames: [P({ lhf: 92, lk: 95, rsf: 50, lsf: -35, e: 85, lift: 0.04 }), P({ rhf: 92, rk: 95, lsf: 50, rsf: -35, e: 85, lift: 0.04 })] },
    climber: { dur: 1, frames: [P(Object.assign({}, plankTop, { lhf: 98, lk: 105 })), P(Object.assign({}, plankTop, { rhf: 98, rk: 105 }))] },
    climber_slow: { dur: 2, frames: [P(Object.assign({}, plankTop, { lhf: 98, lk: 105 })), P(plankTop), P(Object.assign({}, plankTop, { rhf: 98, rk: 105 })), P(plankTop)] },
    burpee: { dur: 3, frames: [P({}), P({ hf: 120, k: 135, sp: 55, sf: 100, e: 0 }), P(plankTop), P({ hf: 120, k: 135, sp: 55, sf: 100, e: 0 }), P({ lift: 0.22, sa: 165, e: 0 })] },
    burpee_step: { dur: 4, frames: [P({}), P({ hf: 120, k: 135, sp: 55, sf: 100, e: 0 }), P(Object.assign({}, plankTop, { lhf: 98, lk: 105 })), P(plankTop), P(Object.assign({}, plankTop, { lhf: 98, lk: 105 })), P({ hf: 120, k: 135, sp: 55, sf: 100, e: 0 })] },
    skater: { dur: 2, frames: [P({ lhf: 45, lk: 55, rhf: -10, rha: -22, rk: 35, sp: 28, ry: 18, lsf: -30, rsf: 50 }), P({ rhf: 45, rk: 55, lhf: -10, lha: -22, lk: 35, sp: 28, ry: -18, rsf: -30, lsf: 50 })] },
    armcircle: { dur: 2, frames: [P({ sa: 90, sf: 15 }), P({ sa: 100, sf: 0 }), P({ sa: 90, sf: -15 }), P({ sa: 80, sf: 0 })] },
    hipcircle: { dur: 3, frames: [P({ rz: 6, sp: -4, sa: 35, e: 90 }), P({ rx: 6, sp: -8, sa: 35, e: 90 }), P({ rz: -6, sp: -4, sa: 35, e: 90 }), P({ rx: -6, sp: 2, sa: 35, e: 90 })] },
    quadstretch: { dur: 5, frames: [P({ lk: 150, lhf: -8, lsf: -35, le: 40, rsa: 30 }), P({ lk: 150, lhf: -8, lsf: -35, le: 40, rsa: 30, nk: 4 })] },
    hamstretch: { dur: 5, frames: [P({ rx: 68, hf: 68, sp: 28, sf: 96, e: 0 }), P({ rx: 72, hf: 72, sp: 30, sf: 102, e: 0 })] },
    chintuck: { dur: 3, frames: [P({ nk: -6, sa: 10 }), P({ nk: 14, sa: 10 }), P({ nk: 14, sa: 10 })] },
    neckiso: { dur: 4, frames: [P({ lsf: 150, le: 125, lsa: 20, nk: 2 }), P({ lsf: 150, le: 125, lsa: 20, nk: 3 })] },
    chew: { dur: 1, frames: [P({ nk: 0, sa: 10 }), P({ nk: 3, sa: 10 })] },
    chest: { dur: 5, props: { wall: 'right' }, frames: [P({ rsa: 90, rsf: -15, re: 0, ry: 18 }), P({ rsa: 90, rsf: -18, re: 0, ry: 22 })] }
  };

  // ---------- montagem do boneco ----------
  function build(T) {
    const mat = new T.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.55, metalness: 0.05 });
    const joint = new T.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.5 });
    const dark = new T.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.7 });
    const cap = (r, len, m) => { const g = new T.CapsuleGeometry(r, len, 6, 14); const mesh = new T.Mesh(g, m || mat); mesh.position.y = -len / 2; return mesh; };
    const ball = (r, m) => new T.Mesh(new T.SphereGeometry(r, 16, 12), m || joint);
    const marker = (parent, x, y, z) => { const o = new T.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };
    const G = {}; const contacts = [];

    const root = new T.Group(); G.root = root;
    const pelvis = new T.Mesh(new T.CapsuleGeometry(0.115, 0.12, 6, 14), mat); pelvis.rotation.z = Math.PI / 2; root.add(pelvis);
    contacts.push(marker(root, 0, -0.02, -0.12), marker(root, 0, -0.02, 0.12));
    const spine = new T.Group(); spine.position.y = 0.06; root.add(spine); G.spine = spine;
    const torso = new T.Mesh(new T.CapsuleGeometry(0.135, 0.3, 6, 16), mat); torso.position.y = 0.24; torso.scale.set(1.25, 1, 0.8); spine.add(torso);
    contacts.push(marker(spine, 0, 0.36, -0.12), marker(spine, 0, 0.36, 0.12), marker(spine, 0, 0.18, -0.12));
    const neck = new T.Group(); neck.position.y = 0.48; spine.add(neck); G.neck = neck;
    const head = new T.Mesh(new T.SphereGeometry(0.105, 20, 16), mat); head.position.y = 0.12; head.scale.set(0.92, 1.08, 1); neck.add(head);
    const visor = new T.Mesh(new T.BoxGeometry(0.12, 0.03, 0.02), dark); visor.position.set(0, 0.14, 0.098); neck.add(visor);
    contacts.push(marker(neck, 0, 0.23, 0), marker(neck, 0, 0.12, 0.1), marker(neck, 0, 0.12, -0.1));

    G.arm = {}; G.leg = {}; G.hand = {}; G.foot = {}; G.knee = {};
    ['l', 'r'].forEach(s => {
      const sx = s === 'l' ? 1 : -1;
      const sh = new T.Group(); sh.position.set(0.2 * sx, 0.44, 0); spine.add(sh); sh.add(ball(0.06));
      sh.add(cap(0.05, 0.24));
      const el = new T.Group(); el.position.y = -0.29; sh.add(el); el.add(ball(0.045));
      el.add(cap(0.042, 0.22));
      const hand = marker(el, 0, -0.3, 0); hand.add(ball(0.045, mat));
      contacts.push(hand, marker(el, 0, 0, 0));
      G.arm[s] = { sh, el }; G.hand[s] = hand;

      const hp = new T.Group(); hp.position.set(0.1 * sx, -0.04, 0); root.add(hp); hp.add(ball(0.07));
      hp.add(cap(0.07, 0.34));
      const kn = new T.Group(); kn.position.y = -0.44; hp.add(kn); kn.add(ball(0.06));
      kn.add(cap(0.055, 0.34));
      const ft = new T.Group(); ft.position.y = -0.43; kn.add(ft);
      const foot = new T.Mesh(new T.BoxGeometry(0.09, 0.06, 0.24), mat); foot.position.set(0, -0.03, 0.07); ft.add(foot);
      contacts.push(marker(ft, 0, -0.06, 0.19), marker(ft, 0, -0.06, -0.05), marker(kn, 0, 0, 0.06), marker(kn, 0, 0, -0.06));
      G.leg[s] = { hp, kn }; G.foot[s] = [marker(ft, 0, -0.06, 0.19), marker(ft, 0, -0.06, -0.05)]; G.knee[s] = kn;
    });

    // halteres nas mãos
    G.dumb = [];
    ['l', 'r'].forEach(s => {
      const d = new T.Group();
      const bar = new T.Mesh(new T.CylinderGeometry(0.015, 0.015, 0.2, 8), dark); bar.rotation.z = Math.PI / 2; d.add(bar);
      [-0.09, 0.09].forEach(x => { const w = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.05, 14), dark); w.rotation.z = Math.PI / 2; w.position.x = x; d.add(w); });
      d.visible = false; G.hand[s].add(d); G.dumb.push(d);
    });
    return { root, G, contacts };
  }

  function setPose(G, p) {
    const r = G.root;
    r.rotation.order = 'YXZ';
    r.rotation.set((p.rx || 0) * D, (p.ry || 0) * D, (p.rz || 0) * D);
    G.spine.rotation.set((p.sp || 0) * D, (p.sy || 0) * D, 0);
    G.neck.rotation.set((p.nk || 0) * D, 0, 0);
    ['l', 'r'].forEach(s => {
      const sx = s === 'l' ? 1 : -1;
      const a = G.arm[s];
      a.sh.rotation.order = 'XYZ';
      a.sh.rotation.set(-(p[s + 'sf'] || 0) * D, 0, sx * (p[s + 'sa'] || 0) * D);
      a.el.rotation.set(-(p[s + 'e'] || 0) * D, 0, sx * (p[s + 'ez'] || 0) * D);
      const l = G.leg[s];
      l.hp.rotation.order = 'XYZ';
      l.hp.rotation.set(-(p[s + 'hf'] || 0) * D, 0, sx * (p[s + 'ha'] || 0) * D);
      l.kn.rotation.set((p[s + 'k'] || 0) * D, 0, 0);
    });
  }

  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  function lerpPose(a, b, t) { const o = {}; KEYS.forEach(k => { const x = a[k] || 0, y = b[k] || 0; o[k] = x + (y - x) * t; }); return o; }

  class Viewer {
    constructor(T) {
      this.T = T;
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'mq-canvas';
      try {
        this.renderer = new T.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
      } catch (e) { this.renderer = null; return; }
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.outputEncoding = T.sRGBEncoding;
      this.scene = new T.Scene();
      this.camera = new T.PerspectiveCamera(32, 1, 0.1, 50);
      this.scene.add(new T.HemisphereLight(0xffffff, 0x202020, 0.7));
      const key = new T.DirectionalLight(0xffffff, 0.9); key.position.set(3, 5, 4); this.scene.add(key);
      const rim = new T.DirectionalLight(0xffffff, 0.6); rim.position.set(-3, 3, -4); this.scene.add(rim);
      const floor = new T.Mesh(new T.CircleGeometry(2.2, 64), new T.MeshStandardMaterial({ color: 0x141414, roughness: 1 }));
      floor.rotation.x = -Math.PI / 2; this.scene.add(floor);
      const ring = new T.Mesh(new T.RingGeometry(2.18, 2.2, 64), new T.MeshBasicMaterial({ color: 0x2c2c2c }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.001; this.scene.add(ring);
      const b = build(T); this.fig = b; this.scene.add(b.root);
      const pm = new T.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.8 });
      this.props = {
        box: new T.Mesh(new T.BoxGeometry(0.7, 1, 0.45), pm),
        wall: new T.Mesh(new T.BoxGeometry(1.6, 2.2, 0.06), pm),
        bar: new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 1.2, 10), pm),
        pbars: new T.Group(),
        table: new T.Mesh(new T.BoxGeometry(0.9, 0.04, 0.8), pm),
        seat: new T.Mesh(new T.BoxGeometry(0.45, 0.45, 0.42), pm)
      };
      [-0.24, 0.24].forEach(x => { const c = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.9, 10), pm); c.rotation.x = Math.PI / 2; c.position.x = x; this.props.pbars.add(c); });
      this.props.bar.rotation.z = Math.PI / 2;
      Object.values(this.props).forEach(o => { o.visible = false; this.scene.add(o); });
      this.tmp = new T.Vector3();
      this.anim = ANIM.stand; this.name = 'stand'; this.t0 = performance.now(); this.running = false;
      this.reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    mount(el) {
      if (!this.renderer) { el.innerHTML = '<div class="mq-fallback">Demonstração 3D indisponível neste aparelho</div>'; return; }
      el.appendChild(this.canvas); this.el = el; this.resize(); this.start();
      if (!this.ro && window.ResizeObserver) { this.ro = new ResizeObserver(() => this.resize()); }
      if (this.ro) { this.ro.disconnect(); this.ro.observe(el); }
    }
    resize() {
      if (!this.el || !this.renderer) return;
      const w = this.el.clientWidth || 300, h = this.el.clientHeight || 300;
      this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    }
    play(name) {
      const a = ANIM[name] || ANIM.stand; this.anim = a; this.name = name; this.t0 = performance.now();
      const pr = a.props || {};
      this.fig.G.dumb.forEach(d => d.visible = !!pr.dumbbells);
      const horizontal = a.frames.some(f => Math.abs(f.rx || 0) > 40 || Math.abs(f.rz || 0) > 40) || a.snap === 'bar';
      const tall = a.frames.some(f => (f.lift || 0) > 0.1 || (f.sa || 0) > 150 || (f.lsa || 0) > 150 || (f.sf || 0) > 150 && !(Math.abs(f.rx || 0) > 40));
      const dist = a.snap === 'bar' ? 6 : horizontal ? 4.6 : tall ? 6.2 : 4.9;
      const ty = a.snap === 'bar' ? 1.4 : horizontal ? 0.35 : tall ? 1.15 : 0.9;
      const side = pr.wall === 'front';
      if (side) this.camera.position.set(dist * 0.98, ty + 0.6, -dist * 0.2);
      else this.camera.position.set(dist * 0.72, ty + 0.7, dist * 0.7);
      this.camera.lookAt(0, ty, horizontal ? 0.2 : 0);
    }
    pose(time) {
      const a = this.anim, n = a.frames.length;
      let ph = ((time / 1000) % a.dur) / a.dur;
      if (this.reduced) ph = 0.5 / n;
      const seg = ph * n, i = Math.floor(seg) % n, j = (i + 1) % n;
      const p = lerpPose(expand(a.frames[i]), expand(a.frames[j]), ease(seg - Math.floor(seg)));
      return p;
    }
    applyAt(time) {
      const T = this.T, f = this.fig, a = this.anim, p = this.pose(time);
      setPose(f.G, p);
      f.root.position.set(0, 1, 0);
      f.root.updateMatrixWorld(true);
      const v = this.tmp;
      if (a.snap === 'bar') {
        let hy = -1e9; ['l', 'r'].forEach(s => { f.G.hand[s].getWorldPosition(v); hy = Math.max(hy, v.y); });
        f.root.position.y += (a.barY || 2.1) - hy;
      } else {
        const list = a.snap === 'feet' ? [].concat(f.G.foot.l, f.G.foot.r) : f.contacts;
        let my = 1e9; list.forEach(m => { m.getWorldPosition(v); if (v.y < my) my = v.y; });
        f.root.position.y += -my;
      }
      f.root.position.y += p.lift || 0;
      // mantém o corpo centrado no chão
      f.root.updateMatrixWorld(true);
      let cz = 0, cnt = 0; f.contacts.forEach(m => { m.getWorldPosition(v); cz += v.z; cnt++; });
      f.root.position.z -= cz / cnt;
      f.root.updateMatrixWorld(true);
      // acessórios
      const pr = a.props || {}; const P = this.props;
      Object.values(P).forEach(o => o.visible = false);
      const hands = ['l', 'r'].map(s => f.G.hand[s].getWorldPosition(new T.Vector3()));
      const hmid = hands[0].clone().add(hands[1]).multiplyScalar(0.5);
      if (pr.box) {
        const top = Math.max(0.05, Math.min(hands[0].y, hands[1].y) - 0.04);
        P.box.visible = true; P.box.scale.y = top; P.box.position.set(0, top / 2, hmid.z);
      }
      if (pr.wall) {
        P.wall.visible = true;
        if (pr.wall === 'front') P.wall.position.set(0, 1.1, Math.max(hands[0].z, hands[1].z) + 0.08);
        else if (pr.wall === 'back') { let mz = 1e9; f.contacts.forEach(m => { m.getWorldPosition(v); if (v.y > 0.6) mz = Math.min(mz, v.z); }); P.wall.position.set(0, 1.1, mz - 0.05); P.wall.rotation.y = 0; }
        else { P.wall.position.set(hands[1].x - 0.06, 1.1, 0); P.wall.rotation.y = Math.PI / 2; }
      } else P.wall.rotation.y = 0;
      if (pr.bar) { P.bar.visible = true; P.bar.position.set(0, (a.barY || 2.1) + 0.02, hmid.z); }
      if (pr.pbars) { P.pbars.visible = true; P.pbars.position.set(0, (a.barY || 1.3) - 0.03, hmid.z); }
      if (pr.table) { P.table.visible = true; P.table.position.set(0, Math.max(hands[0].y, hands[1].y) + 0.03, hmid.z); }
      if (pr.seat) { let bz = 0; f.contacts.slice(0, 2).forEach(m => { m.getWorldPosition(v); bz += v.z / 2; }); P.seat.visible = true; P.seat.position.set(0, 0.225, -0.32); }
    }
    frame(now) {
      if (!this.running) return;
      if (!document.hidden && this.el && this.el.isConnected) {
        this.applyAt(now - this.t0);
        this.renderer.render(this.scene, this.camera);
      }
      requestAnimationFrame(t => this.frame(t));
    }
    start() { if (this.running) return; this.running = true; requestAnimationFrame(t => this.frame(t)); }
    stop() { this.running = false; }
    snapshot(name, t) { this.play(name); this.applyAt(t || 0); this.renderer.render(this.scene, this.camera); return this.canvas.toDataURL('image/png'); }
  }

  let shared = null;
  window.Mannequin = {
    ANIM,
    names: Object.keys(ANIM),
    available: () => !!window.THREE,
    viewer() { if (!shared && window.THREE) shared = new Viewer(window.THREE); return shared; },
    show(el, anim) { const v = this.viewer(); if (!v) { el.innerHTML = '<div class="mq-fallback">3D indisponível</div>'; return null; } v.mount(el); v.play(anim); return v; },
    stop() { if (shared) shared.stop(); }
  };
})();
