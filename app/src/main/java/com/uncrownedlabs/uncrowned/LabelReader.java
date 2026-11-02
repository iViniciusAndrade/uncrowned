package com.uncrownedlabs.uncrowned;

import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.graphics.Point;
import android.media.ExifInterface;
import android.net.Uri;
import android.provider.MediaStore;

import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.InputStream;

/**
 * Foto da tabela nutricional: abre a câmera (ou a galeria), lê o texto no próprio celular com o ML Kit
 * e devolve as linhas com a posição de cada uma. Quem entende a tabela é o JS (food.js, parseLabel).
 */
final class LabelReader {
    static final int REQ_CAMERA = 31, REQ_GALLERY = 32;
    static String pendingId;

    static void start(MainActivity a, String id, String source) {
        pendingId = id;
        try {
            Intent i;
            if ("gallery".equals(source)) {
                i = new Intent(Intent.ACTION_GET_CONTENT);
                i.setType("image/*");
                i.addCategory(Intent.CATEGORY_OPENABLE);
                a.startActivityForResult(Intent.createChooser(i, "Foto da tabela"), REQ_GALLERY);
            } else {
                File f = PhotoProvider.file(a);
                if (f.exists()) f.delete();
                Uri out = PhotoProvider.uri();
                i = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                i.putExtra(MediaStore.EXTRA_OUTPUT, out);
                i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                i.setClipData(android.content.ClipData.newRawUri("foto", out));
                a.startActivityForResult(i, REQ_CAMERA);
            }
        } catch (Exception e) {
            fail(a, "Não achei um app de câmera");
        }
    }

    static boolean onResult(MainActivity a, int req, int res, Intent data) {
        if (req != REQ_CAMERA && req != REQ_GALLERY) return false;
        if (res != android.app.Activity.RESULT_OK) { fail(a, "cancelado"); return true; }
        final Uri src = req == REQ_CAMERA ? Uri.fromFile(PhotoProvider.file(a)) : (data != null ? data.getData() : null);
        if (src == null) { fail(a, "Foto não recebida"); return true; }
        new Thread(() -> {
            try {
                Bitmap bmp = load(a, src);
                if (bmp == null) { fail(a, "Não deu para abrir a foto"); return; }
                TextRecognizer rec = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
                final int w = bmp.getWidth(), h = bmp.getHeight();
                rec.process(InputImage.fromBitmap(bmp, 0))
                        .addOnSuccessListener(t -> { try { ok(a, toJson(t, w, h)); } catch (Exception e) { fail(a, "Falha ao ler o texto"); } rec.close(); })
                        .addOnFailureListener(e -> { fail(a, e.getMessage() != null ? e.getMessage() : "Falha ao ler o texto"); rec.close(); });
            } catch (Throwable e) {
                fail(a, "Leitura de texto indisponível neste aparelho");
            }
        }).start();
        return true;
    }

    // abre a foto reduzida (até ~2200 px) e já desvira conforme o EXIF
    static Bitmap load(MainActivity a, Uri u) throws Exception {
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        try (InputStream in = a.getContentResolver().openInputStream(u)) { BitmapFactory.decodeStream(in, null, o); }
        int s = 1; while (Math.max(o.outWidth, o.outHeight) / (s * 2) >= 1600) s *= 2;
        BitmapFactory.Options o2 = new BitmapFactory.Options(); o2.inSampleSize = s;
        Bitmap b;
        try (InputStream in = a.getContentResolver().openInputStream(u)) { b = BitmapFactory.decodeStream(in, null, o2); }
        if (b == null) return null;
        int rot = 0;
        try (InputStream in = a.getContentResolver().openInputStream(u)) {
            int ori = new ExifInterface(in).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
            rot = ori == ExifInterface.ORIENTATION_ROTATE_90 ? 90 : ori == ExifInterface.ORIENTATION_ROTATE_180 ? 180 : ori == ExifInterface.ORIENTATION_ROTATE_270 ? 270 : 0;
        } catch (Exception ignored) { }
        if (rot != 0) { Matrix m = new Matrix(); m.postRotate(rot); b = Bitmap.createBitmap(b, 0, 0, b.getWidth(), b.getHeight(), m, true); }
        return b;
    }

    static String toJson(Text t, int w, int h) throws Exception {
        JSONArray lines = new JSONArray();
        for (Text.TextBlock b : t.getTextBlocks()) for (Text.Line l : b.getLines()) {
            Point[] p = l.getCornerPoints();
            if (p == null || p.length < 4) continue;
            JSONArray pts = new JSONArray();
            for (Point q : p) pts.put(new JSONArray().put(q.x).put(q.y));
            lines.put(new JSONObject().put("t", l.getText()).put("p", pts));
        }
        return new JSONObject().put("w", w).put("h", h).put("lines", lines).toString();
    }

    static void ok(MainActivity a, String json) { String id = pendingId; pendingId = null; if (id != null) a.resolve(id, json); }
    static void fail(MainActivity a, String msg) { String id = pendingId; pendingId = null; if (id != null) a.resolve(id, Bridge.json("error", msg)); }

    private LabelReader() { }
}
