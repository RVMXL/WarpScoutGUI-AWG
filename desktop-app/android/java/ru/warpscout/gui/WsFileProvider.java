/* ═══════════════════════════════════════════════════════════════
   WARPSCOUT GUI — мини-FileProvider (без androidx).
   Схема URI: content://ru.warpscout.gui.files/root/<абсолютный путь>
   Служит только для отдачи файлов/папок системным просмотрщикам
   (os.open из GUI). Экспорт наружу запрещён (exported=false).
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

public class WsFileProvider extends ContentProvider {

    private static final String AUTHORITY = "ru.warpscout.gui.files";
    private static final String PREFIX = "/root/";

    private File fileFor(Uri uri) throws FileNotFoundException {
        String path = uri.getEncodedPath();
        if (path == null || !path.startsWith(PREFIX))
            throw new FileNotFoundException("bad path");
        path = Uri.decode(path.substring(PREFIX.length()));
        File f = new File(path);
        if (!f.exists()) throw new FileNotFoundException(path);
        return f;
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
        File f = fileFor(uri);
        int m = ParcelFileDescriptor.MODE_READ_ONLY;
        if ("w".equals(mode) || "wt".equals(mode)) m = ParcelFileDescriptor.MODE_WRITE_ONLY
                | ParcelFileDescriptor.MODE_TRUNCATE | ParcelFileDescriptor.MODE_CREATE;
        return ParcelFileDescriptor.open(f, m);
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) { return null; }

    @Override
    public int delete(Uri uri, String sel, String[] args) { return 0; }

    @Override
    public int update(Uri uri, ContentValues values, String sel, String[] args) { return 0; }
}
