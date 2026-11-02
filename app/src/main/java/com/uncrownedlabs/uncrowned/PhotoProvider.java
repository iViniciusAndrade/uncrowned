package com.uncrownedlabs.uncrowned;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;

/** Provedor mínimo (sem AndroidX) para o app de câmera gravar a foto da tabela num arquivo do app. */
public class PhotoProvider extends ContentProvider {
    static final String AUTH = "com.uncrownedlabs.uncrowned.photos";

    static File file(Context c) { File d = new File(c.getCacheDir(), "label"); d.mkdirs(); return new File(d, "tabela.jpg"); }
    static Uri uri() { return Uri.parse("content://" + AUTH + "/tabela.jpg"); }

    @Override public boolean onCreate() { return true; }

    @Override public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        File f = file(getContext());
        int m = mode.contains("w") ? ParcelFileDescriptor.MODE_READ_WRITE | ParcelFileDescriptor.MODE_CREATE | (mode.contains("t") ? ParcelFileDescriptor.MODE_TRUNCATE : 0) : ParcelFileDescriptor.MODE_READ_ONLY;
        return ParcelFileDescriptor.open(f, m);
    }

    @Override public String getType(Uri uri) { return "image/jpeg"; }

    @Override public Cursor query(Uri uri, String[] proj, String sel, String[] args, String sort) {
        File f = file(getContext());
        MatrixCursor c = new MatrixCursor(new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE});
        c.addRow(new Object[]{f.getName(), f.length()});
        return c;
    }

    @Override public Uri insert(Uri uri, ContentValues v) { return null; }
    @Override public int delete(Uri uri, String s, String[] a) { return 0; }
    @Override public int update(Uri uri, ContentValues v, String s, String[] a) { return 0; }
}
