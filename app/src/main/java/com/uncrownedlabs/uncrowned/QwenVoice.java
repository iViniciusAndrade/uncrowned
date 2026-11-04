package com.uncrownedlabs.uncrowned;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.MediaPlayer;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Comparator;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Voz da treinadora feita pelo Qwen-TTS (Alibaba Model Studio, região internacional).
 * Cada frase vira um arquivo em files/voice (nome = hash de voz + texto), então só é paga/gasta uma vez.
 * Se a frase ainda não existe e não chega a tempo, quem fala é o TTS do Android, e o arquivo fica pronto para a próxima.
 */
class QwenVoice {
    static final String URL_TTS = "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
    static final String MODEL = "qwen3-tts-flash";
    static final long MAX_CACHE = 150L * 1024 * 1024;

    interface Fallback { void speak(String text); }

    final Context c;
    final File dir;
    final ExecutorService pool = Executors.newFixedThreadPool(3);
    final ExecutorService one = Executors.newSingleThreadExecutor();
    final ConcurrentHashMap<String, Future<File>> running = new ConcurrentHashMap<>();
    final AtomicInteger seq = new AtomicInteger();
    MediaPlayer mp;
    volatile String lastError = "";

    QwenVoice(Context c) {
        this.c = c.getApplicationContext();
        dir = new File(this.c.getFilesDir(), "voice");
        dir.mkdirs();
    }

    String key() { return c.getSharedPreferences("uc_secret", Context.MODE_PRIVATE).getString("qwen_key", "").trim(); }

    static String hash(String s) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-1").digest(s.getBytes(StandardCharsets.UTF_8));
            StringBuilder b = new StringBuilder();
            for (byte x : d) b.append(String.format("%02x", x));
            return b.toString();
        } catch (Exception e) { return Integer.toHexString(s.hashCode()); }
    }
    File fileFor(String text, String voice) { return new File(dir, hash(voice + "|" + text.trim()) + ".wav"); }

    /** Garante a frase em disco, rodando nesta thread; se outra thread já está baixando, espera por ela. */
    File ensure(String text, String voice) throws Exception {
        final File f = fileFor(text, voice);
        if (f.length() > 0) return f;
        final String k = f.getName();
        java.util.concurrent.FutureTask<File> mine = new java.util.concurrent.FutureTask<>(() -> synth(text, voice, f));
        Future<File> cur = running.putIfAbsent(k, mine);
        if (cur != null) return cur.get(30, TimeUnit.SECONDS);
        try { mine.run(); return mine.get(); }
        finally { running.remove(k); }
    }
    Future<File> fetch(String text, String voice) {
        if (fileFor(text, voice).length() > 0) return null;
        return pool.submit(() -> ensure(text, voice));
    }

    File synth(String text, String voice, File out) throws Exception {
        String key = key();
        if (key.isEmpty()) throw new Exception("sem chave do Qwen");
        JSONObject input = new JSONObject().put("text", text).put("voice", voice).put("language_type", "Portuguese");
        JSONObject body = new JSONObject().put("model", MODEL).put("input", input);
        HttpURLConnection h = (HttpURLConnection) new URL(URL_TTS).openConnection();
        h.setConnectTimeout(8000); h.setReadTimeout(20000);
        h.setRequestMethod("POST"); h.setDoOutput(true);
        h.setRequestProperty("Authorization", "Bearer " + key);
        h.setRequestProperty("Content-Type", "application/json");
        try (OutputStream o = h.getOutputStream()) { o.write(body.toString().getBytes(StandardCharsets.UTF_8)); }
        int st = h.getResponseCode();
        String resp = read(st >= 400 ? h.getErrorStream() : h.getInputStream());
        if (st >= 400) {
            String msg = resp;
            try { JSONObject j = new JSONObject(resp); msg = j.optString("code") + " " + j.optString("message"); } catch (Exception ignored) { }
            lastError = "Erro " + st + ": " + msg;
            throw new Exception(lastError);
        }
        JSONObject audio = new JSONObject(resp).getJSONObject("output").getJSONObject("audio");
        File tmp = new File(dir, out.getName() + ".part");
        String data = audio.optString("data", "");
        if (!data.isEmpty()) {
            try (FileOutputStream fo = new FileOutputStream(tmp)) { fo.write(android.util.Base64.decode(data, android.util.Base64.DEFAULT)); }
        } else {
            String u = audio.getString("url").replaceFirst("^http://", "https://");
            HttpURLConnection g = (HttpURLConnection) new URL(u).openConnection();
            g.setConnectTimeout(8000); g.setReadTimeout(20000);
            if (g.getResponseCode() >= 400) throw new Exception("download do áudio falhou");
            try (InputStream in = g.getInputStream(); FileOutputStream fo = new FileOutputStream(tmp)) {
                byte[] buf = new byte[16384]; int n;
                while ((n = in.read(buf)) > 0) fo.write(buf, 0, n);
            }
        }
        if (tmp.length() < 100 || !tmp.renameTo(out)) { tmp.delete(); throw new Exception("áudio vazio"); }
        lastError = "";
        trim();
        return out;
    }

    static String read(InputStream in) throws Exception {
        if (in == null) return "";
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        byte[] buf = new byte[8192]; int n;
        while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
        in.close();
        return b.toString("UTF-8");
    }

    /** Mantém o cache abaixo do limite apagando as frases mais antigas. */
    void trim() {
        File[] fs = dir.listFiles((d, n) -> n.endsWith(".wav"));
        if (fs == null) return;
        long tot = 0; for (File f : fs) tot += f.length();
        if (tot <= MAX_CACHE) return;
        Arrays.sort(fs, Comparator.comparingLong(File::lastModified));
        for (File f : fs) { if (tot <= MAX_CACHE * 0.8) break; tot -= f.length(); f.delete(); }
    }

    /** Fala a frase. waitMs: quanto esperar pela síntese antes de cair no TTS do Android. */
    void speak(String text, String voice, int waitMs, Fallback fb) {
        final int my = seq.incrementAndGet();
        stopPlayer();
        one.submit(() -> {
            File f = fileFor(text, voice);
            if (f.length() == 0) {
                Future<File> fu = fetch(text, voice);
                if (fu != null) {
                    try { fu.get(waitMs, TimeUnit.MILLISECONDS); } catch (Exception ignored) { }
                }
            }
            if (my != seq.get()) return;
            if (f.length() > 0) { play(f, my, text, fb); }
            else fb.speak(text);
        });
    }

    synchronized void play(File f, int my, String text, Fallback fb) {
        if (my != seq.get()) return;
        try {
            stopPlayerLocked();
            MediaPlayer p = new MediaPlayer();
            p.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
            p.setDataSource(f.getAbsolutePath());
            p.setOnCompletionListener(MediaPlayer::release);
            p.prepare();
            p.start();
            mp = p;
            f.setLastModified(System.currentTimeMillis());
        } catch (Exception e) {
            f.delete();
            fb.speak(text);
        }
    }

    synchronized void stopPlayerLocked() {
        if (mp != null) { try { mp.stop(); mp.release(); } catch (Exception ignored) { } mp = null; }
    }
    void stopPlayer() { stopPlayerLocked(); }
    void stop() { seq.incrementAndGet(); stopPlayer(); }

    /** Prepara as frases do treino em segundo plano. Devolve quantas já estavam prontas; avisa o progresso por onProgress. */
    interface Progress { void on(int done, int total, String err); }
    int prefetch(String json, String voice, Progress pr) {
        JSONArray arr;
        try { arr = new JSONArray(json); } catch (Exception e) { return 0; }
        final int total = arr.length();
        final AtomicInteger done = new AtomicInteger();
        int ready = 0;
        for (int i = 0; i < total; i++) {
            String t = arr.optString(i, "").trim();
            if (t.isEmpty() || fileFor(t, voice).length() > 0) { ready++; done.incrementAndGet(); continue; }
            pool.submit(() -> {
                try { ensure(t, voice); } catch (Exception ignored) { }
                pr.on(done.incrementAndGet(), total, lastError);
            });
        }
        if (ready == total) pr.on(total, total, "");
        return ready;
    }

    long cacheBytes() { long t = 0; File[] fs = dir.listFiles(); if (fs != null) for (File f : fs) t += f.length(); return t; }
    void clear() { File[] fs = dir.listFiles(); if (fs != null) for (File f : fs) f.delete(); }
}
