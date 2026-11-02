package com.uncrownedlabs.uncrowned;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

/** Agenda os lembretes. Cada item é 'interval' (a cada N min dentro de uma janela) ou 'daily' (horário fixo). */
final class Reminders {
    static final String KEY = "reminders", PENDING = "pending";

    static void save(Context c, String json) { Bridge.prefs(c).edit().putString(KEY, json).apply(); }

    static JSONObject config(Context c) {
        try { return new JSONObject(Bridge.prefs(c).getString(KEY, "{\"items\":[]}")); } catch (Exception e) { return new JSONObject(); }
    }

    static JSONObject item(Context c, int id) {
        JSONArray it = config(c).optJSONArray("items");
        if (it == null) return null;
        for (int i = 0; i < it.length(); i++) { JSONObject o = it.optJSONObject(i); if (o != null && o.optInt("id") == id) return o; }
        return null;
    }

    static void scheduleAll(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        SharedPreferences p = Bridge.prefs(c);
        // cancela o que existia
        String old = p.getString("scheduled", "");
        for (String s : old.split(",")) { if (s.isEmpty()) continue; try { am.cancel(pi(c, Integer.parseInt(s), 0)); } catch (Exception ignored) { } }
        StringBuilder ids = new StringBuilder();
        JSONArray it = config(c).optJSONArray("items");
        if (it != null) for (int i = 0; i < it.length(); i++) {
            JSONObject o = it.optJSONObject(i); if (o == null) continue;
            long t = next(o, System.currentTimeMillis());
            if (t > 0) { set(c, o.optInt("id"), 0, t); ids.append(o.optInt("id")).append(','); }
        }
        p.edit().putString("scheduled", ids.toString()).apply();
    }

    static int[] hm(String s) { try { String[] a = s.split(":"); return new int[]{Integer.parseInt(a[0]), Integer.parseInt(a[1])}; } catch (Exception e) { return new int[]{8, 0}; } }

    /** Próximo disparo depois de 'now'. */
    static long next(JSONObject o, long now) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(now);
        cal.set(Calendar.SECOND, 0); cal.set(Calendar.MILLISECOND, 0);
        if ("daily".equals(o.optString("kind"))) {
            int[] t = hm(o.optString("time", "08:00"));
            cal.set(Calendar.HOUR_OF_DAY, t[0]); cal.set(Calendar.MINUTE, t[1]);
            if (cal.getTimeInMillis() <= now + 5000) cal.add(Calendar.DAY_OF_YEAR, 1);
            return cal.getTimeInMillis();
        }
        int every = Math.max(15, o.optInt("every", 60));
        int[] st = hm(o.optString("start", "08:00")), en = hm(o.optString("end", "22:00"));
        for (int day = 0; day < 3; day++) {
            Calendar s = (Calendar) cal.clone(); s.add(Calendar.DAY_OF_YEAR, day); s.set(Calendar.HOUR_OF_DAY, st[0]); s.set(Calendar.MINUTE, st[1]);
            Calendar e = (Calendar) s.clone(); e.set(Calendar.HOUR_OF_DAY, en[0]); e.set(Calendar.MINUTE, en[1]);
            if (e.getTimeInMillis() <= s.getTimeInMillis()) e.add(Calendar.DAY_OF_YEAR, 1);
            long t = s.getTimeInMillis() + every * 60000L;
            while (t <= now + 5000) t += every * 60000L;
            if (t <= e.getTimeInMillis()) return t;
        }
        return -1;
    }

    static PendingIntent pi(Context c, int id, int nag) {
        Intent i = new Intent(c, ReminderReceiver.class).setAction("uc.fire." + id + "." + nag).putExtra("id", id).putExtra("nag", nag);
        return PendingIntent.getBroadcast(c, id * 10 + Math.min(nag, 9), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void set(Context c, int id, int nag, long at) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        PendingIntent p = pi(c, id, nag);
        try {
            if (Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p);
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p);
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p);
        }
    }

    static void cancelNags(Context c, int id) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        for (int n = 1; n <= 9; n++) am.cancel(pi(c, id, n));
    }

    static synchronized void addPending(Context c, JSONObject o) {
        try {
            JSONArray a = new JSONArray(Bridge.prefs(c).getString(PENDING, "[]"));
            a.put(o);
            Bridge.prefs(c).edit().putString(PENDING, a.toString()).apply();
        } catch (Exception ignored) { }
    }

    static synchronized String takePending(Context c) {
        String s = Bridge.prefs(c).getString(PENDING, "[]");
        Bridge.prefs(c).edit().putString(PENDING, "[]").apply();
        return s;
    }

    private Reminders() { }
}
