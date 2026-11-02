/* Bike e treino ao ar livre: GPS, velocidade, distância, percurso, mapas. */
(function () {
  const R = { on: false, paused: false, pts: [], start: 0, pausedMs: 0, pauseAt: 0, dist: 0, moving: 0, max: 0, gain: 0, speed: 0, lastAlt: null, map: null, line: null, dot: null, mode: 'bike' };
  const rad = x => x * Math.PI / 180;
  function hav(a, b) { const R0 = 6371000, dLa = rad(b.lat - a.lat), dLo = rad(b.lon - a.lon); const h = Math.sin(dLa / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLo / 2) ** 2; return 2 * R0 * Math.asin(Math.sqrt(h)); }
  const MODES = { bike: 'Bike', ebike: 'Bike elétrica', corrida: 'Corrida', caminhada: 'Caminhada' };
  // MET do Compêndio de Atividades Físicas (2011/2024) por velocidade média
  function met(mode, kmh) {
    if (mode === 'caminhada') return kmh < 4 ? 2.8 : kmh < 5.6 ? 3.5 : kmh < 6.4 ? 4.3 : 5;
    if (mode === 'corrida') return kmh < 8 ? 8 : kmh < 9.7 ? 9.8 : kmh < 11.3 ? 11 : 11.8;
    if (mode === 'ebike') { const a = (window.Store && Store.S.settings.ebikeAssist) || 'alta'; return a === 'sem' ? 6.8 : a === 'baixa' ? 6.0 : 4.0; } // 2024: 01088 / 01084 / 01080
    return kmh < 16 ? 4 : kmh < 19.3 ? 6.8 : kmh < 22.5 ? 8 : kmh < 25.7 ? 10 : 12;
  }
  // Filtro anti-tremedeira do GPS: parado na cadeira não pode virar distância, subida nem caloria
  function minSpeed(mode) { return mode === 'caminhada' || mode === 'corrida' ? 0.7 : 1.3; } // m/s
  function onLoc(p) {
    if (!R.on || R.paused || !p || p.lat == null) return;
    const acc = p.acc != null ? p.acc : 15;
    R.lastAcc = acc; R.lastFix = Date.now();
    const pt = { lat: p.lat, lon: p.lon, t: p.t || Date.now(), alt: p.alt, spd: p.speed };
    if (R.dot && R.map) { try { R.dot.setLatLng([pt.lat, pt.lon]); } catch (e) {} }
    if (acc > 20) return; // leitura imprecisa demais
    const A = R.anchor;
    if (!A) { R.anchor = pt; R.pts.push(pt); draw(); return; }
    if (pt.t <= A.t) return;
    const d = hav(A, pt), dt = (pt.t - A.t) / 1000;
    const vCalc = d / dt, vGps = p.speed != null && p.speed >= 0 ? p.speed : null;
    const v = vGps != null ? vGps : vCalc;
    if (v > 33 || vCalc > 40) return; // salto de GPS
    const moving = v >= minSpeed(R.mode) && d >= Math.max(4, acc * 0.6);
    if (!moving) {
      R.speed = vGps != null && vGps >= minSpeed(R.mode) ? vGps * 3.6 : 0;
      if (window.App && App.tab === 'bike') updateStats();
      return;
    }
    R.dist += d;
    // buraco no GPS (túnel, tela desligada): conta o tempo pela velocidade, senão a média sobe sozinha
    R.moving += dt <= 10 ? dt : Math.min(dt, d / Math.max(v, minSpeed(R.mode)));
    R.speed = v * 3.6;
    R.sm = R.sm ? R.sm * 0.6 + R.speed * 0.4 : R.speed;
    if (R.sm > R.max && acc <= 15) R.max = R.sm;
    // altitude suavizada com histerese de 3 m; só conta subida quando está se movendo
    if (pt.alt != null && (p.vacc == null || p.vacc <= 12)) {
      R.altS = R.altS == null ? pt.alt : R.altS * 0.8 + pt.alt * 0.2;
      if (R.altBase == null) R.altBase = R.altS;
      if (R.altS - R.altBase >= 3) { R.gain += R.altS - R.altBase; R.altBase = R.altS; }
      else if (R.altS < R.altBase) R.altBase = R.altS;
    }
    R.anchor = pt; R.pts.push(pt);
    draw(); if (window.App && App.tab === 'bike') updateStats();
  }
  UCBridge.on('loc', onLoc);
  UCBridge.on('locerr', e => App.toast('GPS: ' + (e && e.text || 'sem sinal')));
  function elapsed() { if (!R.start) return 0; const now = R.paused ? R.pauseAt : Date.now(); return Math.max(0, (now - R.start - R.pausedMs) / 1000); }
  function kcalBoth() { if (R.dist < 20) return { gross: 0, net: 0 }; const avg = R.moving ? R.dist / R.moving * 3.6 : 0; return Energy.kcal(met(R.mode, avg), R.moving / 60); }
  function kcal() { return Math.round(kcalBoth().gross); }
  function start(mode) {
    if (R.on) return;
    Object.assign(R, { on: true, paused: false, pts: [], start: Date.now(), pausedMs: 0, dist: 0, moving: 0, max: 0, gain: 0, speed: 0, anchor: null, sm: 0, altS: null, altBase: null, lastAcc: null, mode: mode || R.mode });
    const ok = UCBridge.startTracking();
    if (!ok) { R.on = false; App.toast('Não deu para ligar o GPS'); return; }
    UCBridge.keepAwake(true);
    if (Store.S.settings.voice) UCBridge.speak('Gravando ' + MODES[R.mode].toLowerCase());
    clearInterval(R.iv); R.iv = setInterval(() => { if (App.tab === 'bike') updateStats(); }, 1000);
    App.render();
  }
  function pause() { if (!R.on) return; if (R.paused) { R.pausedMs += Date.now() - R.pauseAt; R.paused = false; } else { R.paused = true; R.pauseAt = Date.now(); R.speed = 0; } App.render(); }
  function stop() {
    if (!R.on) return;
    const buf = UCBridge.trackBuffer(); if (buf && buf.length > R.pts.length + 5) rebuild(buf);
    UCBridge.stopTracking(); UCBridge.keepAwake(false); clearInterval(R.iv);
    const secs = Math.round(elapsed());
    R.on = false;
    const clear = () => Object.assign(R, { pts: [], start: 0, pausedMs: 0, dist: 0, moving: 0, max: 0, gain: 0, speed: 0, anchor: null, sm: 0, lastAcc: null, paused: false });
    if (R.dist < 50 || secs < 20) { App.toast(R.dist < 50 ? 'Nenhum deslocamento detectado, o percurso não foi salvo' : 'Percurso muito curto, não foi salvo'); clear(); App.render(); return; }
    const ride = { id: 'r' + Date.now().toString(36), t: R.start, d: Store.dkey(new Date(R.start)), mode: R.mode, secs, moving: Math.round(R.moving), dist: Math.round(R.dist), max: Math.round(R.max * 10) / 10, gain: Math.round(R.gain), kcal: kcal(), net: Math.round(kcalBoth().net), pts: simplify(R.pts.map(p => [Math.round(p.lat * 1e6) / 1e6, Math.round(p.lon * 1e6) / 1e6]), 6) };
    const S = Store.S; S.rides.unshift(ride);
    const d = Store.day(ride.d); d.workouts.push({ t: ride.t, d: ride.d, id: 'ride', name: MODES[ride.mode] + ' · ' + (ride.dist / 1000).toFixed(1) + ' km', mins: Math.round(secs / 60), kcal: ride.kcal }); d.kcalOut = (d.kcalOut || 0) + ride.kcal; d.kcalNet = (d.kcalNet || 0) + ride.net;
    S.history.unshift({ t: ride.t, d: ride.d, id: 'ride', name: MODES[ride.mode], mins: Math.round(secs / 60), kcal: ride.kcal });
    Store.save();
    if (S.settings.voice) UCBridge.speak('Percurso salvo. ' + (ride.dist / 1000).toFixed(1).replace('.', ',') + ' quilômetros.');
    clear(); App.render(); App.openRide(ride.id);
  }
  function rebuild(buf) { const keep = R.on; R.pts = []; R.dist = 0; R.moving = 0; R.max = 0; R.gain = 0; R.anchor = null; R.sm = 0; R.altS = null; R.altBase = null; const on = R.on; R.on = true; const pz = R.paused; R.paused = false; buf.forEach(onLoc); R.on = on; R.paused = pz; return keep; }
  function resync() { if (!R.on) return; const buf = UCBridge.trackBuffer(); if (buf && buf.length > R.pts.length) rebuild(buf); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) resync(); });

  // Douglas-Peucker simples para guardar o percurso leve (tolerância em metros)
  function simplify(pts, tol) {
    if (pts.length < 3) return pts;
    const toXY = p => [p[1] * 111320 * Math.cos(rad(pts[0][0])), p[0] * 110540];
    const xy = pts.map(toXY); const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) { const [a, b] = stack.pop(); let md = 0, mi = -1; const [x1, y1] = xy[a], [x2, y2] = xy[b]; const L = Math.hypot(x2 - x1, y2 - y1) || 1; for (let i = a + 1; i < b; i++) { const d = Math.abs((y2 - y1) * xy[i][0] - (x2 - x1) * xy[i][1] + x2 * y1 - y2 * x1) / L; if (d > md) { md = d; mi = i; } } if (md > tol) { keep[mi] = 1; stack.push([a, mi], [mi, b]); } }
    return pts.filter((p, i) => keep[i]);
  }

  function mountMap(el, pts, live) {
    if (!window.L) { el.innerHTML = '<div class="mq-fallback">Mapa indisponível</div>'; return null; }
    const map = L.map(el, { zoomControl: false, attributionControl: true }).setView(pts.length ? pts[pts.length - 1] : [-23.6, -46.78], pts.length ? 15 : 11);
    let errs = 0;
    const tl = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    tl.on('tileerror', () => { if (++errs === 6) { const n = document.createElement('div'); n.className = 'map-off'; n.textContent = 'Sem internet para carregar o mapa. O percurso continua sendo gravado.'; el.appendChild(n); } });
    tl.on('tileload', () => { errs = 0; const n = el.querySelector('.map-off'); if (n) n.remove(); });
    const acc = window.App && App.accent ? App.accent() : '#1fbf5a';
    const line = L.polyline(pts, { color: acc, weight: 6, opacity: 0.95 }).addTo(map);
    if (pts.length > 1 && !live) { map.fitBounds(line.getBounds(), { padding: [24, 24] }); L.circleMarker(pts[0], { radius: 6, color: '#fff', fillColor: '#000', fillOpacity: 1, weight: 3 }).addTo(map); L.circleMarker(pts[pts.length - 1], { radius: 7, color: '#000', fillColor: '#fff', fillOpacity: 1, weight: 3 }).addTo(map); }
    setTimeout(() => { try { if (map._loaded && map.getContainer().isConnected) map.invalidateSize(); } catch (e) {} }, 120);
    return { map, line };
  }
  function attachLive(el) {
    if (R.map) { try { R.map.remove(); } catch (e) {} R.map = null; R.dot = null; R.line = null; }
    const pts = R.pts.map(p => [p.lat, p.lon]);
    const m = mountMap(el, pts, true); if (!m) return;
    R.map = m.map; R.line = m.line;
    R.dot = L.circleMarker(pts.length ? pts[pts.length - 1] : [-23.6, -46.78], { radius: 8, color: '#fff', fillColor: (window.App && App.accent ? App.accent() : '#1fbf5a'), fillOpacity: 1, weight: 3 }).addTo(R.map);
  }
  function draw() {
    if (!R.map || !R.pts.length) return;
    const ll = [R.pts[R.pts.length - 1].lat, R.pts[R.pts.length - 1].lon];
    try { R.line.addLatLng(ll); R.dot.setLatLng(ll); if (R.map._loaded && R.map.getContainer().isConnected) R.map.panTo(ll, { animate: false }); } catch (e) {}
  }
  function updateStats() {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    const el = elapsed(), avg = R.moving > 3 ? R.dist / R.moving * 3.6 : 0;
    set('bk-speed', R.on ? (R.paused ? '0' : R.speed.toFixed(R.speed < 10 ? 1 : 0).replace('.', ',')) : '0');
    set('bk-dist', (R.dist / 1000).toFixed(2).replace('.', ','));
    set('bk-time', fmtT(el)); set('bk-avg', avg.toFixed(1).replace('.', ',')); set('bk-max', R.max.toFixed(1).replace('.', ','));
    set('bk-kcal', kcal()); set('bk-gain', Math.round(R.gain));
    set('bk-gps', !R.on ? '' : R.lastAcc == null ? 'Procurando GPS…' : R.lastAcc > 20 ? 'Sinal fraco (' + Math.round(R.lastAcc) + ' m)' : 'GPS ±' + Math.round(R.lastAcc) + ' m');
  }
  function fmtT(s) { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); }
  function gmapsRide(r) {
    const p = r.pts; if (p.length < 2) return null;
    const step = Math.max(1, Math.floor((p.length - 2) / 8)); const wp = []; for (let i = step; i < p.length - 1 && wp.length < 8; i += step) wp.push(p[i].join(','));
    return 'https://www.google.com/maps/dir/?api=1&origin=' + p[0].join(',') + '&destination=' + p[p.length - 1].join(',') + (wp.length ? '&waypoints=' + encodeURIComponent(wp.join('|')) : '') + '&travelmode=' + (r.mode === 'caminhada' || r.mode === 'corrida' ? 'walking' : 'bicycling');
  }
  function gpx(r) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Uncrowned · UncrownedLabs" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>' + MODES[r.mode] + ' ' + r.d + '</name><trkseg>' + r.pts.map(p => '<trkpt lat="' + p[0] + '" lon="' + p[1] + '"/>').join('') + '</trkseg></trk></gpx>';
  }
  window.Bike = { R, MODES, start, pause, stop, attachLive, mountMap, updateStats, fmtT, gmapsRide, gpx, elapsed, kcal, hav, simplify, met };
})();
