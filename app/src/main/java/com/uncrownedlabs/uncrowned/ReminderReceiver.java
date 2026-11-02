package com.uncrownedlabs.uncrowned;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;

import org.json.JSONObject;

/** Mostra o lembrete, agenda o próximo e, no modo insistente, repete até a pessoa confirmar. */
public class ReminderReceiver extends BroadcastReceiver {
    static final String CH = "lembretes_v1";

    @Override
    public void onReceive(Context c, Intent i) {
        String act = i.getAction() == null ? "" : i.getAction();
        int id = i.getIntExtra("id", 0);
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (act.startsWith("uc.ack")) {
            Reminders.cancelNags(c, id);
            nm.cancel(id);
            int ml = i.getIntExtra("ml", 0);
            if (ml > 0) { try { Reminders.addPending(c, new JSONObject().put("type", "water").put("ml", ml).put("t", System.currentTimeMillis())); } catch (Exception ignored) { } }
            return;
        }
        if (act.startsWith("uc.snooze")) {
            nm.cancel(id);
            Reminders.cancelNags(c, id);
            Reminders.set(c, id, 1, System.currentTimeMillis() + 10 * 60000L);
            return;
        }
        JSONObject cfg = Reminders.config(c);
        JSONObject o = Reminders.item(c, id);
        if (o == null) return;
        int nag = i.getIntExtra("nag", 0);
        if (nag == 0) {
            long t = Reminders.next(o, System.currentTimeMillis() + 60000L);
            if (t > 0) Reminders.set(c, id, 0, t);
        }
        boolean intrusive = cfg.optBoolean("intrusive", true) && o.optBoolean("nag", true);
        int nagMax = cfg.optInt("nagMax", 3), nagMin = cfg.optInt("nagMin", 10);
        String title = o.optString("title", "Uncrowned");
        String text = o.optString("text", "");
        if (nag > 0) title = title + " (de novo)";
        show(c, id, title, text, o.optString("action", "open"), o.optInt("ml", 250), intrusive);
        if (intrusive && nag < nagMax) Reminders.set(c, id, nag + 1, System.currentTimeMillis() + nagMin * 60000L);
    }

    static void channel(Context c) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm.getNotificationChannel(CH) != null) return;
        NotificationChannel ch = new NotificationChannel(CH, "Lembretes", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Água, refeições, treino, sono e postura");
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[]{0, 400, 200, 400, 200, 700});
        ch.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        ch.setBypassDnd(false);
        nm.createNotificationChannel(ch);
    }

    static void show(Context c, int id, String title, String text, String action, int ml, boolean intrusive) {
        channel(c);
        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra("tab", "water".equals(action) ? "hoje" : id >= 10 && id < 20 ? "comida" : id == 20 ? "treino" : "hoje");
        PendingIntent pOpen = PendingIntent.getActivity(c, id, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent ack = new Intent(c, ReminderReceiver.class).setAction("uc.ack." + id).putExtra("id", id).putExtra("ml", "water".equals(action) ? ml : 0);
        PendingIntent pAck = PendingIntent.getBroadcast(c, 5000 + id, ack, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent sn = new Intent(c, ReminderReceiver.class).setAction("uc.snooze." + id).putExtra("id", id);
        PendingIntent pSn = PendingIntent.getBroadcast(c, 6000 + id, sn, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = new Notification.Builder(c, CH)
                .setSmallIcon(android.R.drawable.ic_popup_reminder)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setContentIntent(pOpen)
                .setAutoCancel(true)
                .setCategory(Notification.CATEGORY_REMINDER)
                .setColor(0xFFFFFFFF)
                .addAction(new Notification.Action.Builder(null, "water".equals(action) ? "Bebi " + ml + " ml" : "Feito", pAck).build())
                .addAction(new Notification.Action.Builder(null, "Adiar 10 min", pSn).build());
        if (intrusive) b.setOnlyAlertOnce(false);
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        try { nm.notify(id, b.build()); } catch (SecurityException ignored) { }
    }
}
