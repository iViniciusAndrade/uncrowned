package com.uncrownedlabs.uncrowned;

import android.app.Activity;

import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanner;
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning;

/** Leitor de código de barras do Google Play Services: abre a câmera do próprio Google, sem permissão extra. */
final class Scanner {
    interface Cb { void on(String s); }

    static void scan(Activity a, Cb ok, Cb err) {
        try {
            GmsBarcodeScannerOptions opts = new GmsBarcodeScannerOptions.Builder()
                    .setBarcodeFormats(Barcode.FORMAT_EAN_13, Barcode.FORMAT_EAN_8, Barcode.FORMAT_UPC_A, Barcode.FORMAT_UPC_E, Barcode.FORMAT_CODE_128)
                    .enableAutoZoom()
                    .build();
            GmsBarcodeScanner sc = GmsBarcodeScanning.getClient(a, opts);
            sc.startScan()
                    .addOnSuccessListener(b -> { String v = b.getRawValue(); if (v != null) ok.on(v); else err.on("vazio"); })
                    .addOnCanceledListener(() -> err.on("cancelado"))
                    .addOnFailureListener(e -> err.on(e.getMessage() != null ? e.getMessage() : "falhou"));
        } catch (Throwable t) {
            err.on("Leitor indisponível neste aparelho");
        }
    }

    private Scanner() { }
}
