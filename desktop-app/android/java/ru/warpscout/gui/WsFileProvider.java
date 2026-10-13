/* ═══════════════════════════════════════════════════════════════
   WARPSCOUT GUI — мини-FileProvider (без androidx).
   Схема URI: content://ru.warpscout.gui.files/root/<абсолютный путь>
   Служит только для отдачи файлов/папок системным просмотрщикам
   (os.open из GUI). Экспорт наружу запрещён (exported=false).

   v2.6.0 (аудит SEC-4, defense-in-depth):
     • fileFor отдаёт ТОЛЬКО файлы внутри корней приложения
       (filesDir / externalFilesDir / cacheDir) — URI «/root/<любой
       абсолютный путь>» больше не читает чужие файлы (в т.ч. аккаунт
       в общем хранилище), даже если будущая функция share выдаст грант;
     • openFile — только MODE_READ_ONLY: запись через провайдер не
       используется ни одной кодовой веткой (запись — MediaStore/fs).
   ═══════════════════════════════════════════════════════════════ */
package ru.warpscout.gui;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;
import java.util.ArrayList;
import java.util.List;

public class WsFileProvider extends ContentProvider {

    private static final String AUTHORITY = "ru.warpscout.gui.files";
    private static final String PREFIX = "/root/";

    /* разрешённые корни: только каталоги самого приложения (SEC-4) */
    private List<File> allowedRoots() {
        List<File> roots = new ArrayList<>();
        try { roots.add(getContext().getFilesDir().getCanonicalFile()); } catch (Throwable ignored) {}
        try {
            File ext = getContext().getExternalFilesDir(null);
            if (ext != null) roots.add(ext.getCanonicalFile());
        } catch (Throwable ignored) {}
        try { roots.add(getContext().getCacheDir().getCanonicalFile()); } catch (Throwable ignored) {}
        return roots;
    }

    private File fileFor(Uri uri) throws FileNotFoundException {
        String path = uri.getEncodedPath();
        if (path == null || !path.startsWith(PREFIX))
            throw new FileNotFoundException("bad path");
        path = Uri.decode(path.substring(PREFIX.length()));
        File f;
        try { f = new File(path).getCanonicalFile(); } catch (Throwable e) { throw new FileNotFoundException(path); }
        if (!f.exists()) throw new FileNotFoundException(path);
        // SEC-4: canonical-путь обязан лежать СТРОГО внутри корней приложения;
        // «..»-обходы и чужие пути отсекаются сравнением префиксов canonical-строк
        for (File root : allowedRoots()) {
            if (f.equals(root) || f.getPath().startsWith(root.getPath() + File.separator)) return f;
        }
        throw new FileNotFoundException("outside app roots: " + f.getName());
    }

    @Override
    public boolean onCreate() { return true; }

    @Override
    public Cursor query(Uri uri, String[] projection, String sel, String[] args, String sort) {
        File f;
        try { f = fileFor(uri); } catch (FileNotFoundException e) { return null; }
        if (projection == null || projection.length == 0)
            projection = new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE};
        MatrixCursor c = new MatrixCursor(projection);
        Object[] row = new Object[projection.length];
        for (int i = 0; i < projection.length; i++) {
            if (OpenableColumns.DISPLAY_NAME.equals(projection[i])) row[i] = f.getName();
            else if (OpenableColumns.SIZE.equals(projection[i])) row[i] = f.length();
            else row[i] = null;
        }
        c.addRow(row);
        return c;
    }

    @Override
    public String getType(Uri uri) {
        String n;
        try { n = fileFor(uri).getName().toLowerCase(); }
        catch (FileNotFoundException e) { return "application/octet-stream"; }
        if (n.endsWith(".json")) return "application/json";
        if (n.endsWith(".txt") || n.endsWith(".log") || n.endsWith(".conf")) return "text/plain";
        if (n.endsWith(".png")) return "image/png";
        if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
        if (n.endsWith(".svg")) return "image/svg+xml";
        if (n.endsWith(".csv")) return "text/csv";
        if (n.endsWith(".html")) return "text/html";
        return "application/octet-stream";
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        // SEC-4: только чтение — записывающих веток у провайдера нет
        // (проверим запрос честно: любые w/wt/rw-режимы отклоняются)
        if ("r".equals(mode) || "rt".equals(mode) || mode == null || mode.isEmpty()) {
            return ParcelFileDescriptor.open(fileFor(uri), ParcelFileDescriptor.MODE_READ_ONLY);
        }
        throw new FileNotFoundException("write mode is not supported by this provider");
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) { return null; }

    @Override
    public int delete(Uri uri, String sel, String[] args) { return 0; }

    @Override
    public int update(Uri uri, ContentValues values, String sel, String[] args) { return 0; }
}
