package com.uncrownedlabs.uncrowned;

import android.Manifest;
import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Locale;

/** Métodos chamados pela interface (window.UCNative). Tudo que mexe com UI vai para a thread principal. */
public class Bridge {
    static final int REQ_MIC = 11, REQ_LOC = 12, REQ_NOTIF = 13;
    final MainActivity a;
    final Handler ui = new Handler(Looper.getMainLooper());
    TextToSpeech tts;
    boolean ttsReady;
    SpeechRecognizer sr;
    boolean wantTracking;

    Bridge(MainActivity a) {
        this.a = a;
        tts = new TextToSpeech(a.getApplicationContext(), status -> {
            if (status == TextToSpeech.SUCCESS) {
                int r = tts.setLanguage(new Locale("pt", "BR"));
                ttsReady = r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED;
                if (!ttsReady) ttsReady = tts.setLanguage(Locale.getDefault()) >= 0;
                tts.setSpeechRate(prefs(a).getFloat("rate", 0.98f));
                tts.setPitch(prefs(a).getFloat("pitch", 1.06f));
                applyVoice(prefs(a).getString("voice", ""));
            }
        });
    }

    static String version(Context c) {
        try { PackageInfo p = c.getPackageManager().getPackageInfo(c.getPackageName(), 0); return p.versionName; }
        catch (Exception e) { return "1.0"; }
    }

    @JavascriptInterface public String appVersion() { return version(a); }

    // ---------- voz da treinadora ----------
    /** Escolhe a voz salva; se não houver, prefere uma voz feminina em português do Brasil. */
    void applyVoice(String name) {
        try {
            java.util.Set<android.speech.tts.Voice> all = tts.getVoices();
            if (all == null) return;
            android.speech.tts.Voice best = null; int bestScore = -1;
            for (android.speech.tts.Voice v : all) {
                if (!name.isEmpty() && v.getName().equals(name)) { tts.setVoice(v); return; }
                Locale l = v.getLocale();
                if (l == null || !"pt".equals(l.getLanguage()) || !"BR".equalsIgnoreCase(l.getCountry())) continue;
                String n = v.getName().toLowerCase(Locale.ROOT);
                int sc = 0;
                if (n.contains("female") || n.contains("feminina")) sc += 50;
                if (n.contains("-afs") || n.contains("-pte") || n.contains("-ptf")) sc += 30;
                if (n.contains("male") && !n.contains("female")) sc -= 40;
                if (n.contains("-ptd") || n.contains("-ptc")) sc -= 20;
                if (!v.isNetworkConnectionRequired()) sc += 10;
                sc += v.getQuality() / 100;
                if (sc > bestScore) { bestScore = sc; best = v; }
            }
            if (best != null) tts.setVoice(best);
        } catch (Exception ignored) { }
    }
    @JavascriptInterface public String voices() {
        JSONArray arr = new JSONArray();
        try {
            String cur = tts.getVoice() != null ? tts.getVoice().getName() : "";
            for (android.speech.tts.Voice v : tts.getVoices()) {
                Locale l = v.getLocale();
                if (l == null || !"pt".equals(l.getLanguage())) continue;
                arr.put(new JSONObject().put("name", v.getName()).put("locale", l.toString()).put("net", v.isNetworkConnectionRequired()).put("quality", v.getQuality()).put("current", v.getName().equals(cur)));
            }
        } catch (Exception ignored) { }
        return arr.toString();
    }
    @JavascriptInterface public void setVoice(String name, float rate, float pitch) {
        prefs(a).edit().putString("voice", name).putFloat("rate", rate).putFloat("pitch", pitch).apply();
        if (tts == null) return;
        tts.setSpeechRate(rate); tts.setPitch(pitch);
        applyVoice(name);
    }
    @JavascriptInterface public void openTtsSettings() {
        ui.post(() -> open(new Intent("com.android.settings.TTS_SETTINGS")));
    }

    // ---------- fala ----------
    @JavascriptInterface public void speak(String text) {
        if (tts != null && ttsReady) tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "uc");
    }
    @JavascriptInterface public void stopSpeak() { if (tts != null) tts.stop(); }

    // ---------- reconhecimento de voz ----------
    @JavascriptInterface public void listen() {
        ui.post(() -> {
            if (!a.has(Manifest.permission.RECORD_AUDIO)) { a.requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC); return; }
            startListening();
        });
    }
    void startListening() {
        if (!SpeechRecognizer.isRecognitionAvailable(a)) { a.emit("voice", ev("error", "Reconhecimento de voz indisponível. Instale ou ative o app Google.")); return; }
        if (tts != null) tts.stop();
        if (sr == null) {
            sr = SpeechRecognizer.createSpeechRecognizer(a);
            sr.setRecognitionListener(new RecognitionListener() {
                @Override public void onReadyForSpeech(Bundle b) { a.emit("voice", ev("ready", "")); }
                @Override public void onBeginningOfSpeech() { }
                @Override public void onRmsChanged(float v) { }
                @Override public void onBufferReceived(byte[] b) { }
                @Override public void onEndOfSpeech() { }
                @Override public void onError(int code) {
                    String msg = code == SpeechRecognizer.ERROR_NO_MATCH || code == SpeechRecognizer.ERROR_SPEECH_TIMEOUT ? "Não ouvi nada. Tente de novo." : code == SpeechRecognizer.ERROR_NETWORK || code == SpeechRecognizer.ERROR_NETWORK_TIMEOUT ? "Sem internet para reconhecer a voz. Baixe o pacote offline de português nas configurações de voz do Google." : code == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS ? "Sem permissão do microfone." : "Erro no reconhecimento (" + code + ").";
                    a.emit("voice", ev("error", msg));
                    a.emit("voice", ev("end", ""));
                }
                @Override public void onResults(Bundle b) {
                    ArrayList<String> r = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    a.emit("voice", ev("final", r != null && !r.isEmpty() ? r.get(0) : ""));
                    a.emit("voice", ev("end", ""));
                }
                @Override public void onPartialResults(Bundle b) {
                    ArrayList<String> r = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    if (r != null && !r.isEmpty() && r.get(0).length() > 0) a.emit("voice", ev("partial", r.get(0)));
                }
                @Override public void onEvent(int t, Bundle b) { }
            });
        }
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR");
        i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
        i.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1800L);
        try { sr.cancel(); sr.startListening(i); } catch (Exception e) { a.emit("voice", ev("error", "Não consegui abrir o microfone.")); }
    }
    @JavascriptInterface public void stopListen() { ui.post(() -> { if (sr != null) try { sr.cancel(); } catch (Exception ignored) { } }); }
    static String ev(String type, String text) {
        try { return new JSONObject().put("type", type).put("text", text).toString(); } catch (Exception e) { return "{}"; }
    }

    // ---------- lembretes ----------
    @JavascriptInterface public void setReminders(String json) {
        Reminders.save(a, json);
        Reminders.scheduleAll(a);
    }
    @JavascriptInterface public void testReminder(String title, String text) {
        ui.post(() -> {
            if (a.needsNotifPermission()) { a.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF); return; }
            ReminderReceiver.show(a, 999, title, text, "ack", 250, false);
        });
    }
    @JavascriptInterface public String takePending() { return Reminders.takePending(a); }

    @JavascriptInterface public String permissionState() {
        try {
            JSONObject o = new JSONObject();
            o.put("notifications", a.needsNotifPermission() ? "denied" : "granted");
            AlarmManager am = (AlarmManager) a.getSystemService(Context.ALARM_SERVICE);
            o.put("exactAlarms", Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms() ? "granted" : "denied");
            PowerManager pm = (PowerManager) a.getSystemService(Context.POWER_SERVICE);
            o.put("battery", pm.isIgnoringBatteryOptimizations(a.getPackageName()) ? "granted" : "denied");
            o.put("mic", a.has(Manifest.permission.RECORD_AUDIO) ? "granted" : "denied");
            o.put("location", a.has(Manifest.permission.ACCESS_FINE_LOCATION) ? "granted" : "denied");
            return o.toString();
        } catch (Exception e) { return "{}"; }
    }
    @JavascriptInterface public void requestPermission(String kind) {
        ui.post(() -> {
            try {
                switch (kind) {
                    case "notifications":
                        if (a.needsNotifPermission()) a.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF);
                        else open(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, a.getPackageName()));
                        break;
                    case "exactAlarms":
                        if (Build.VERSION.SDK_INT >= 31) open(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + a.getPackageName())));
                        break;
                    case "battery":
                        PowerManager pm = (PowerManager) a.getSystemService(Context.POWER_SERVICE);
                        if (!pm.isIgnoringBatteryOptimizations(a.getPackageName())) open(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + a.getPackageName())));
                        else open(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + a.getPackageName())));
                        break;
                    case "mic":
                        a.requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, 99);
                        break;
                    case "location":
                        a.requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, 98);
                        break;
                }
            } catch (Exception e) {
                open(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + a.getPackageName())));
            }
        });
    }
    void open(Intent i) { try { i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); a.startActivity(i); } catch (Exception ignored) { } }

    // ---------- código de barras (scanner do Google Play Services, sem pedir câmera) ----------
    @JavascriptInterface public void scanBarcode(String id) {
        ui.post(() -> Scanner.scan(a, code -> a.resolve(id, json("code", code)), err -> a.resolve(id, json("error", err))));
    }
    static String json(String k, String v) { try { return new JSONObject().put(k, v).toString(); } catch (Exception e) { return "{}"; } }

    // ---------- rede ----------
    @JavascriptInterface public void httpGet(String id, String url) {
        new Thread(() -> {
            HttpURLConnection c = null;
            try {
                c = (HttpURLConnection) new URL(url).openConnection();
                c.setRequestProperty("User-Agent", "Uncrowned/" + version(a) + " (Android; UncrownedLabs)");
                c.setConnectTimeout(10000);
                c.setReadTimeout(15000);
                int code = c.getResponseCode();
                InputStream in = code < 400 ? c.getInputStream() : c.getErrorStream();
                String body = in == null ? "" : read(in);
                if (code >= 400) a.resolve(id, json("error", "HTTP " + code));
                else a.resolve(id, body);
            } catch (Exception e) {
                a.resolve(id, json("error", "Sem conexão"));
            } finally { if (c != null) c.disconnect(); }
        }).start();
    }
    static String read(InputStream in) throws java.io.IOException {
        ByteArrayOutputStream bo = new ByteArrayOutputStream(); byte[] b = new byte[8192]; int n;
        while ((n = in.read(b)) > 0) bo.write(b, 0, n);
        in.close();
        return new String(bo.toByteArray(), StandardCharsets.UTF_8);
    }

    // ---------- utilidades ----------
    @JavascriptInterface public void share(String title, String text) {
        ui.post(() -> {
            Intent i = new Intent(Intent.ACTION_SEND);
            i.setType("text/plain");
            i.putExtra(Intent.EXTRA_SUBJECT, title);
            i.putExtra(Intent.EXTRA_TITLE, title);
            i.putExtra(Intent.EXTRA_TEXT, text);
            open(Intent.createChooser(i, title));
        });
    }
    @JavascriptInterface public void openUrl(String url) { ui.post(() -> a.openExternal(url)); }
    @JavascriptInterface public void vibrate(int ms) {
        Vibrator v = (Vibrator) a.getSystemService(Context.VIBRATOR_SERVICE);
        if (v != null && v.hasVibrator()) v.vibrate(VibrationEffect.createOneShot(Math.max(10, Math.min(ms, 2000)), VibrationEffect.DEFAULT_AMPLITUDE));
    }
    @JavascriptInterface public void keepAwake(boolean on) { a.keepAwake(on); }

    // ---------- estado (cópia de segurança fora do WebView) ----------
    @JavascriptInterface public void saveState(String json) {
        try {
            File tmp = new File(a.getFilesDir(), "state.tmp");
            try (FileOutputStream o = new FileOutputStream(tmp)) { o.write(json.getBytes(StandardCharsets.UTF_8)); }
            File f = new File(a.getFilesDir(), "state.json");
            if (!tmp.renameTo(f)) { f.delete(); tmp.renameTo(f); }
        } catch (Exception ignored) { }
    }
    @JavascriptInterface public String loadState() {
        try { File f = new File(a.getFilesDir(), "state.json"); if (!f.exists()) return ""; return read(new FileInputStream(f)); }
        catch (Exception e) { return ""; }
    }

    // ---------- GPS ----------
    @JavascriptInterface public void startTracking() {
        ui.post(() -> {
            wantTracking = true;
            if (!a.has(Manifest.permission.ACCESS_FINE_LOCATION)) { a.requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOC); return; }
            startTrackingNow();
        });
    }
    void startTrackingNow() {
        if (a.needsNotifPermission()) a.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 97);
        TrackService.listener = json -> a.emit("loc", json);
        Intent i = new Intent(a, TrackService.class);
        a.startForegroundService(i);
    }
    @JavascriptInterface public void stopTracking() {
        ui.post(() -> { wantTracking = false; a.stopService(new Intent(a, TrackService.class)); });
    }
    @JavascriptInterface public String trackBuffer() {
        JSONArray arr = new JSONArray();
        synchronized (TrackService.points) { for (String p : TrackService.points) { try { arr.put(new JSONObject(p)); } catch (Exception ignored) { } } }
        return arr.toString();
    }

    void destroy() {
        if (tts != null) tts.shutdown();
        if (sr != null) sr.destroy();
        TrackService.listener = null;
    }

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("uc", Context.MODE_PRIVATE); }
}
