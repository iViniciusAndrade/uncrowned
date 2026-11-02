package com.uncrownedlabs.uncrowned;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/** Grava o GPS em primeiro plano, inclusive com a tela desligada. */
public class TrackService extends Service implements LocationListener {
    interface L { void on(String json); }
    static final List<String> points = new ArrayList<>();
    static volatile L listener;
    static final String CH = "gps_v1";
    LocationManager lm;
    PowerManager.WakeLock wl;

    @Override public IBinder onBind(Intent i) { return null; }

    @SuppressLint("MissingPermission")
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm.getNotificationChannel(CH) == null) nm.createNotificationChannel(new NotificationChannel(CH, "Gravação de percurso", NotificationManager.IMPORTANCE_LOW));
        PendingIntent open = PendingIntent.getActivity(this, 1, new Intent(this, MainActivity.class).putExtra("tab", "bike").addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(this, CH)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentTitle("Uncrowned está gravando o percurso")
                .setContentText("Toque para ver a velocidade e o mapa")
                .setContentIntent(open)
                .setOngoing(true)
                .build();
        if (Build.VERSION.SDK_INT >= 29) startForeground(42, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        else startForeground(42, n);
        synchronized (points) { points.clear(); }
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "uncrowned:gps");
        wl.acquire(6 * 3600000L);
        lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        try {
            lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000L, 0f, this, Looper.getMainLooper());
        } catch (Exception e) {
            try { lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 2000L, 0f, this, Looper.getMainLooper()); } catch (Exception ignored) { }
        }
        return START_STICKY;
    }

    @Override
    public void onLocationChanged(Location l) {
        try {
            JSONObject o = new JSONObject();
            o.put("lat", l.getLatitude()).put("lon", l.getLongitude()).put("t", l.getTime());
            if (l.hasAccuracy()) o.put("acc", l.getAccuracy());
            if (l.hasSpeed()) o.put("speed", l.getSpeed());
            if (l.hasAltitude()) o.put("alt", l.getAltitude());
            String s = o.toString();
            synchronized (points) { points.add(s); }
            L cb = listener;
            if (cb != null) cb.on(s);
        } catch (Exception ignored) { }
    }

    @Override public void onStatusChanged(String p, int s, Bundle b) { }
    @Override public void onProviderEnabled(String p) { }
    @Override public void onProviderDisabled(String p) { }

    @Override
    public void onDestroy() {
        if (lm != null) lm.removeUpdates(this);
        if (wl != null && wl.isHeld()) wl.release();
        stopForeground(STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }
}
