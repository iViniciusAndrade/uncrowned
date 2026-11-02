package com.uncrownedlabs.uncrowned;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends Activity {
    WebView web;
    Bridge bridge;
    static MainActivity current;

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        current = this;
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        bridge = new Bridge(this);
        web.addJavascriptInterface(bridge, "UCNative");
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage m) { android.util.Log.d("Uncrowned", m.message() + " @" + m.lineNumber()); return true; }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if ("file".equals(u.getScheme())) return false;
                openExternal(u.toString());
                return true;
            }
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if ("tile.openstreetmap.org".equals(u.getHost())) return tile(u);
                return null;
            }
        });
        setContentView(web);
        web.loadUrl("file:///android_asset/www/index.html");
        handleIntent(getIntent());
    }

    // Tiles do OpenStreetMap com User-Agent próprio e cache em disco (mapa funciona offline onde já passou)
    WebResourceResponse tile(Uri u) {
        try {
            String path = u.getPath();
            if (path == null) return null;
            File f = new File(getCacheDir(), "tiles" + path);
            if (!f.exists() || System.currentTimeMillis() - f.lastModified() > 14L * 86400000L) {
                HttpURLConnection c = (HttpURLConnection) new URL(u.toString()).openConnection();
                c.setRequestProperty("User-Agent", "Uncrowned/" + Bridge.version(this) + " (Android; UncrownedLabs)");
                c.setConnectTimeout(8000);
                c.setReadTimeout(10000);
                if (c.getResponseCode() == 200) {
                    File dir = f.getParentFile();
                    if (dir != null) dir.mkdirs();
                    try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(f)) {
                        byte[] b = new byte[8192]; int n;
                        while ((n = in.read(b)) > 0) out.write(b, 0, n);
                    }
                }
                c.disconnect();
            }
            if (!f.exists()) return null;
            return new WebResourceResponse("image/png", null, new FileInputStream(f));
        } catch (Exception e) {
            return null;
        }
    }

    void openExternal(String url) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception ignored) { }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    void handleIntent(Intent intent) {
        if (intent == null) return;
        String tab = intent.getStringExtra("tab");
        if (tab != null) {
            final String js;
            try { js = new JSONObject().put("tab", tab).toString(); } catch (Exception e) { return; }
            web.postDelayed(() -> emit("intent", js), 600);
        }
    }

    void emit(String ev, String json) {
        if (web == null) return;
        final String code = "window.UCBridge&&UCBridge._emit(" + JSONObject.quote(ev) + "," + JSONObject.quote(json) + ")";
        runOnUiThread(() -> web.evaluateJavascript(code, null));
    }

    void resolve(String id, String json) {
        if (web == null) return;
        final String code = "window.UCBridge&&UCBridge._resolve(" + JSONObject.quote(id) + "," + JSONObject.quote(json) + ")";
        runOnUiThread(() -> web.evaluateJavascript(code, null));
    }

    void keepAwake(boolean on) {
        runOnUiThread(() -> {
            if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        });
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.App&&App.back()", v -> {
            if (!"true".equals(v)) moveTaskToBack(true);
        });
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        boolean ok = res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED;
        if (code == Bridge.REQ_MIC && ok) bridge.startListening();
        if (code == Bridge.REQ_MIC && !ok) emit("voice", "{\"type\":\"error\",\"text\":\"Sem permissão do microfone. Libere em Perfil, Permissões.\"}");
        if (code == Bridge.REQ_LOC && ok && bridge.wantTracking) bridge.startTrackingNow();
        if (code == Bridge.REQ_LOC && !ok) emit("locerr", "{\"text\":\"Sem permissão de localização\"}");
        if (code == Bridge.REQ_NOTIF) Reminders.scheduleAll(this);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.evaluateJavascript("window.UCBridge&&UCBridge._emit('intent','{}')", null);
    }

    @Override
    protected void onDestroy() {
        if (current == this) current = null;
        if (bridge != null) bridge.destroy();
        super.onDestroy();
    }

    boolean has(String perm) {
        return checkSelfPermission(perm) == PackageManager.PERMISSION_GRANTED;
    }

    boolean needsNotifPermission() {
        return Build.VERSION.SDK_INT >= 33 && !has(Manifest.permission.POST_NOTIFICATIONS);
    }
}
