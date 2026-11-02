/* Ponte entre a interface e o Android (window.UCNative, injetado pelo app).
   Fora do Android (navegador/teste) tudo cai em alternativas web ou em simulação. */
(function () {
  const N = window.UCNative || null;
  const pending = {};
  let seq = 0;
  const listeners = {};
  function call(method, ...args) {
    return new Promise((resolve, reject) => {
      if (!N || typeof N[method] !== 'function') return reject(new Error('indisponível'));
      const id = 'c' + (++seq);
      pending[id] = { resolve, reject };
      try { N[method](id, ...args.map(a => typeof a === 'string' ? a : JSON.stringify(a))); }
      catch (e) { delete pending[id]; reject(e); }
    });
  }
  const B = {
    native: !!N,
    // chamado pelo Java
    _resolve(id, json) { const p = pending[id]; if (!p) return; delete pending[id]; let v = json; try { v = JSON.parse(json); } catch (e) {} if (v && v.error) p.reject(new Error(v.error)); else p.resolve(v); },
    _emit(ev, json) { let v = json; try { v = JSON.parse(json); } catch (e) {} (listeners[ev] || []).forEach(f => { try { f(v); } catch (e) { console.error(e); } }); },
    on(ev, f) { (listeners[ev] = listeners[ev] || []).push(f); },
    off(ev, f) { listeners[ev] = (listeners[ev] || []).filter(x => x !== f); },

    speak(text) {
      if (N && N.speak) { try { N.speak(String(text)); return; } catch (e) {} }
      try { if ('speechSynthesis' in window) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'pt-BR'; speechSynthesis.speak(u); } } catch (e) {}
    },
    stopSpeak() { if (N && N.stopSpeak) { try { N.stopSpeak(); } catch (e) {} } try { speechSynthesis.cancel(); } catch (e) {} },

    // reconhecimento de voz: emite 'voice' {type:'partial'|'final'|'error'|'end', text}
    listen() {
      if (N && N.listen) { try { N.listen(); return true; } catch (e) { return false; } }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { B._emit('voice', JSON.stringify({ type: 'error', text: 'Reconhecimento de voz indisponível aqui. Digite o comando.' })); return false; }
      try {
        const r = new SR(); r.lang = 'pt-BR'; r.interimResults = true; r.maxAlternatives = 1; B._sr = r;
        r.onresult = e => { const res = e.results[e.results.length - 1]; B._emit('voice', JSON.stringify({ type: res.isFinal ? 'final' : 'partial', text: res[0].transcript })); };
        r.onerror = e => B._emit('voice', JSON.stringify({ type: 'error', text: e.error }));
        r.onend = () => B._emit('voice', JSON.stringify({ type: 'end' }));
        r.start(); return true;
      } catch (e) { return false; }
    },
    stopListen() { if (N && N.stopListen) { try { N.stopListen(); } catch (e) {} } try { B._sr && B._sr.stop(); } catch (e) {} },

    // lembretes nativos
    setReminders(cfg) { if (N && N.setReminders) { try { N.setReminders(JSON.stringify(cfg)); return true; } catch (e) {} } return false; },
    testReminder(title, text) { if (N && N.testReminder) { try { N.testReminder(title, text); return true; } catch (e) {} } return false; },
    takePending() { if (N && N.takePending) { try { return JSON.parse(N.takePending() || '[]'); } catch (e) {} } return []; },
    permissions() { if (N && N.permissionState) { try { return JSON.parse(N.permissionState()); } catch (e) {} } return { notifications: 'web', exactAlarms: 'web', battery: 'web', mic: 'web', location: 'web' }; },
    requestPermission(kind) { if (N && N.requestPermission) { try { N.requestPermission(kind); return true; } catch (e) {} } return false; },

    scanBarcode() { return call('scanBarcode'); },
    httpGet(url) {
      if (N && N.httpGet) return call('httpGet', url);
      return fetch(url).then(r => r.text());
    },
    share(title, text) { if (N && N.share) { try { N.share(title, text); return true; } catch (e) {} } try { navigator.clipboard.writeText(text); } catch (e) {} return false; },
    openUrl(url) { if (N && N.openUrl) { try { N.openUrl(url); return; } catch (e) {} } window.open(url, '_blank'); },
    vibrate(ms) { if (N && N.vibrate) { try { N.vibrate(ms); return; } catch (e) {} } try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} },
    keepAwake(on) { if (N && N.keepAwake) { try { N.keepAwake(!!on); } catch (e) {} return; } try { if (on && navigator.wakeLock) navigator.wakeLock.request('screen').then(l => B._wl = l).catch(() => {}); else if (B._wl) B._wl.release(); } catch (e) {} },

    // GPS: emite 'loc' {lat,lon,acc,speed,alt,t}; nativo roda como serviço em primeiro plano
    startTracking() {
      if (N && N.startTracking) { try { N.startTracking(); return true; } catch (e) {} }
      if (!navigator.geolocation) return false;
      B._geo = navigator.geolocation.watchPosition(p => B._emit('loc', JSON.stringify({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, speed: p.coords.speed, alt: p.coords.altitude, t: p.timestamp })), e => B._emit('locerr', JSON.stringify({ text: e.message })), { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
      return true;
    },
    stopTracking() { if (N && N.stopTracking) { try { N.stopTracking(); } catch (e) {} } if (B._geo != null) { navigator.geolocation.clearWatch(B._geo); B._geo = null; } },
    trackBuffer() { if (N && N.trackBuffer) { try { return JSON.parse(N.trackBuffer() || '[]'); } catch (e) {} } return []; },
    voices() { if (N && N.voices) { try { return JSON.parse(N.voices() || '[]'); } catch (e) {} } try { return speechSynthesis.getVoices().filter(v => /^pt/.test(v.lang)).map(v => ({ name: v.name, locale: v.lang, net: !v.localService, current: false })); } catch (e) { return []; } },
    setVoice(name, rate, pitch) { if (N && N.setVoice) { try { N.setVoice(name, rate, pitch); } catch (e) {} } B._webVoice = name; },
    openTtsSettings() { if (N && N.openTtsSettings) { try { N.openTtsSettings(); return true; } catch (e) {} } return false; },
    appVersion() { if (N && N.appVersion) { try { return N.appVersion(); } catch (e) {} } return 'web'; }
  };
  window.UCBridge = B;
})();
