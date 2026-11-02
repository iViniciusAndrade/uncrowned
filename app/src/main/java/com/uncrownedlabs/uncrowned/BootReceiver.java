package com.uncrownedlabs.uncrowned;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Reagenda os lembretes depois de reiniciar o celular, atualizar o app ou mudar o horário. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        Reminders.scheduleAll(c);
    }
}
