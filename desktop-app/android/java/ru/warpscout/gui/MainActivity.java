/* ═══════════════════════════════════════════════════════════════
   WARPSCOUT GUI — Android-оболочка (v2.5.2)
   WebView + JS-мост AndroidNative, реализующий контракт Neutralino
   (см. js/neutralino-android.js): процессы (spawnProcess/execCommand),
   файлы (fs.*), хранилище (storage.*), диалоги (showSave/OpenDialog),
   пути (os.getPath), открытие папок (os.open).

   Ядро warpscout упаковано как lib/arm64-v8a/libwarpscout.so — Android
   распаковывает его в nativeLibraryDir, откуда оно исполняемо
   (data-каталоги смонтированы noexec).

   Обновление поверх: тот же package + тот же ключ подписи.
   ═══════════════════════════════════════════════════════════════ */
package ru.warpscout.gui;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.app.DownloadManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.DocumentsContract;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

public class MainActivity extends Activity {

    private WebView web;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private volatile boolean pageReady = false;
    private final List<String> pendingJs = new ArrayList<>();
    private final Object pendingLock = new Object();

    // ── реестр запущенных процессов (spawnProcess) ──
    private final Map<Integer, Process> procs = new HashMap<>();
    private final Object procsLock = new Object();
    private int procSeq = 1;

    // ── ожидающие диалогов (мост блокируется на latch) ──
    private static final int REQ_SAVE = 7001;
    private static final int REQ_OPEN = 7002;
    private CountDownLatch dialogLatch;
    private final AtomicReference<String> dialogResult = new AtomicReference<>("");
    private static final long DIALOG_TIMEOUT_SEC = 600;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        web.addJavascriptInterface(new Bridge(), "AndroidNative");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                String sch = u.getScheme() == null ? "" : u.getScheme();
                // внешние ссылки — только системный браузер
                if (!sch.equals("file")) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                    return true;
                }
                return false;
            }
            @Override
            public void onPageFinished(WebView v, String url) {
                pageReady = true;
                synchronized (pendingLock) {
                    for (String js : pendingJs) v.evaluateJavascript(js, null);
                    pendingJs.clear();
                }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onJsAlert(WebView v, String url, String msg, final android.webkit.JsResult r) {
                new AlertDialog.Builder(MainActivity.this)
                        .setMessage(msg)
                        .setPositiveButton("OK", (d, w) -> r.confirm())
                        .setOnCancelListener(d -> r.cancel())
                        .show();
                return true;
            }
            @Override
            public boolean onJsConfirm(WebView v, String url, String msg, final android.webkit.JsResult r) {
                new AlertDialog.Builder(MainActivity.this)
                        .setMessage(msg)
                        .setPositiveButton("OK", (d, w) -> r.confirm())
                        .setNegativeButton("Отмена", (d, w) -> r.cancel())
                        .setOnCancelListener(d -> r.cancel())
                        .show();
                return true;
            }
        });
        // v2.5.1 (fix): aapt2 -A кладёт содержимое www/ в КОРЕНЬ assets
        // (assets/index.html), подпуть www/ в APK не существует —
        // file:///android_asset/www/... давал net::ERR_FILE_NOT_FOUND (первый
        // баг с реального устройства, smoke-тест 2026-10-11).
        web.loadUrl("file:///android_asset/index.html");
    }

    /* ── доставка событий в JS (eval, буферизация до готовности страницы) ── */
    private void evalJs(final String js) {
        ui.post(() -> {
            if (pageReady) web.evaluateJavascript(js, null);
            else synchronized (pendingLock) { pendingJs.add(js); }
        });
    }

    private void emitProc(final int id, final int pid, final String action, final String data) {
        try {
            JSONObject o = new JSONObject();
            o.put("id", id);
            o.put("pid", pid);
            o.put("action", action);
            o.put("data", data);
            // JSON.parse(String) — надёжный транспорт (JSON-строка почти подмножество JS,
            // но U+2028/2029 внутри Go-вывода могли бы сломать литерал)
            evalJs("window.__nlEmit(JSON.parse(" + JSONObject.quote(o.toString()) + "));");
        } catch (Exception ignored) {}
    }

    /* ═════════════ JS-мост: все методы синхронные, вызываются с фонового
       треда WebView — блокирующие операции допустимы ═════════════ */
    private class Bridge {

        @JavascriptInterface
        public String deviceInfo() {
            try {
                JSONObject o = new JSONObject();
                o.put("nlPath", getFilesDir().getAbsolutePath());
                o.put("nlCwd", getFilesDir().getAbsolutePath());
                String libDir = getApplicationInfo().nativeLibraryDir;
                o.put("wsPath", new File(libDir, "libwarpscout.so").getAbsolutePath());
                o.put("appVersion", getPackageManager()
                        .getPackageInfo(getPackageName(), 0).versionName);
                o.put("os", "Android");
                o.put("abi", android.os.Build.SUPPORTED_ABIS.length > 0
                        ? android.os.Build.SUPPORTED_ABIS[0] : "unknown");
                return o.toString();
            } catch (Exception e) {
                return "{\"error\":" + JSONObject.quote(String.valueOf(e)) + "}";
            }
        }

        /* ── процессы ── */

        private Process startProc(String cmd) throws Exception {
            ProcessBuilder pb = new ProcessBuilder("sh", "-c", cmd);
            pb.directory(getFilesDir());
            pb.redirectErrorStream(false);
            return pb.start();
        }

        @JavascriptInterface
        public String execStream(String cmd) {
            final int id;
            final Process p;
            try {
                // "exec " — sh заменяет себя warpscout: destroy() убьёт сам бинарь,
                // а не shell-обёртку (иначе потомок остаётся жить)
                p = startProc("exec " + cmd);
                synchronized (procsLock) { id = procSeq++; procs.put(id, p); }
            } catch (Exception e) {
                return "{\"error\":" + JSONObject.quote(String.valueOf(e)) + "}";
            }
            final int pid = id; // реальный pid недоступен без reflection; id используем как pid-метку
            new Thread(() -> {
                try { pump(p.getInputStream(), id, pid, "stdout"); } catch (Exception ignored) {}
            }, "ws-out-" + id).start();
            new Thread(() -> {
                try { pump(p.getErrorStream(), id, pid, "stderr"); } catch (Exception ignored) {}
            }, "ws-err-" + id).start();
            new Thread(() -> {
                int code;
                try { code = p.waitFor(); } catch (Exception e) { code = -1; }
                synchronized (procsLock) { procs.remove(id); }
                emitProc(id, pid, "exit", String.valueOf(code));
            }, "ws-wait-" + id).start();
            try {
                JSONObject o = new JSONObject();
                o.put("id", id);
                o.put("pid", pid);
                return o.toString();
            } catch (Exception e) { return "{\"error\":\"json\"}"; }
        }

        private void pump(InputStream in, int id, int pid, String stream) throws Exception {
            ByteArrayOutputStream buf = new ByteArrayOutputStream(8192);
            byte[] chunk = new byte[8192];
            int n;
            while ((n = in.read(chunk)) > 0) {
                buf.write(chunk, 0, n);
                if (buf.size() >= 4096) {
                    flushBuf(buf, id, pid, stream);
                }
            }
            if (buf.size() > 0) flushBuf(buf, id, pid, stream);
        }

        private void flushBuf(ByteArrayOutputStream buf, int id, int pid, String stream) {
            byte[] b = buf.toByteArray();
            buf.reset();
            emitProc(id, pid, stream, new String(b, StandardCharsets.UTF_8));
        }

        @JavascriptInterface
        public String execSync(String cmd) {
            try {
                Process p = startProc(cmd);
                final ByteArrayOutputStream out = new ByteArrayOutputStream();
                final ByteArrayOutputStream err = new ByteArrayOutputStream();
                Thread t1 = new Thread(() -> { try { copy(p.getInputStream(), out); } catch (Exception ignored) {} });
                Thread t2 = new Thread(() -> { try { copy(p.getErrorStream(), err); } catch (Exception ignored) {} });
                t1.start(); t2.start();
                int code;
                try { code = p.waitFor(); } catch (Exception e) { code = -1; }
                t1.join(5000); t2.join(5000);
                JSONObject o = new JSONObject();
                o.put("id", -1);
                o.put("pid", 0);
                o.put("stdOut", new String(out.toByteArray(), StandardCharsets.UTF_8));
                o.put("stdErr", new String(err.toByteArray(), StandardCharsets.UTF_8));
                o.put("exitCode", code);
                o.put("output", new String(out.toByteArray(), StandardCharsets.UTF_8));
                return o.toString();
            } catch (Exception e) {
                return "{\"error\":" + JSONObject.quote(String.valueOf(e)) + "}";
            }
        }

        private void copy(InputStream in, OutputStream out) throws Exception {
            byte[] b = new byte[8192];
            int n;
            while ((n = in.read(b)) > 0) out.write(b, 0, n);
        }

        @JavascriptInterface
        public String procKill(int id) {
            Process p;
            synchronized (procsLock) { p = procs.get(id); }
            if (p == null) return "{\"ok\":false}";
            try { p.destroy(); } catch (Exception ignored) {}
            return "{\"ok\":true}";
        }

        @JavascriptInterface
        public String procList() {
            JSONArray a = new JSONArray();
            synchronized (procsLock) {
                for (Map.Entry<Integer, Process> e : procs.entrySet()) {
                    try {
                        JSONObject o = new JSONObject();
                        o.put("id", e.getKey());
                        o.put("pid", e.getKey());
                        a.put(o);
                    } catch (Exception ignored) {}
                }
            }
            return a.toString();
        }

        /* ── файлы: file-пути и content:// URI (диалоги SAF) ── */

        private InputStream openRead(String path) throws Exception {
            if (path.startsWith("content://")) {
                return getContentResolver().openInputStream(Uri.parse(path));
            }
            return new FileInputStream(path);
        }

        private OutputStream openWrite(String path) throws Exception {
            if (path.startsWith("content://")) {
                return getContentResolver().openOutputStream(Uri.parse(path), "wt");
            }
            File f = new File(path);
            File parent = f.getParentFile();
            if (parent != null && !parent.exists()) parent.mkdirs();
            return new FileOutputStream(f);
        }

        @JavascriptInterface
        public String fsRead(String path) {
            try (InputStream in = openRead(path)) {
                ByteArrayOutputStream o = new ByteArrayOutputStream();
                copy(in, o);
                JSONObject r = new JSONObject();
                r.put("ok", true);
                r.put("data", new String(o.toByteArray(), StandardCharsets.UTF_8));
                return r.toString();
            } catch (Exception e) {
                return "{\"error\":" + JSONObject.quote(String.valueOf(e)) + "}";
            }
        }

        @JavascriptInterface
        public String fsReadBin(String path) {
            try (InputStream in = openRead(path)) {
                ByteArrayOutputStream o = new ByteArrayOutputStream();
                copy(in, o);
                JSONObject r = new JSONObject();
                r.put("ok", true);
                r.put("b64", Base64.encodeToString(o.toByteArray(), Base64.NO_WRAP));
                return r.toString();
            } catch (Exception e) {
                return "{\"error\":" + JSONObject.quote(String.valueOf(e)) + "}";
            }
        }

        @JavascriptInterface
        public String fsWrite(String path, String data) {
            try (OutputStream out = openWrite(path)) {
                out.write(data.getBytes(StandardCharsets.UTF_8));
                out.flush();
                return "{\"ok\":true}";
            } catch (Exception e) {
                return "{\"error\":" + JSONObject.quote(String.valueOf(e)) + "}";
            }
        }

        @JavascriptInterface
        public String fsWriteBin(String path, String b64) {
            try (OutputStream out = openWrite(path)) {
                out.write(Base64.decode(b64, Base64.NO_WRAP));
                out.flush();
                return "{\"ok\":true}";
            } catch (Exception e) {
                return "{\"error\":" + JSONObject.quote(String.valueOf(e)) + "}";
            }
        }

        @JavascriptInterface
        public String fsReadDir(String path) {
            try {
                File d = new File(path);
                JSONArray a = new JSONArray();
                File[] list = d.listFiles();
                if (list != null) {
                    for (File f : list) {
                        JSONObject o = new JSONObject();
                        o.put("path", f.getAbsolutePath());
                        o.put("type", f.isDirectory() ? "DIRECTORY" : "FILE");
                        a.put(o);
                    }
                }
                return a.toString();
            } catch (Exception e) {
                return "{\"error\":" + JSONObject.quote(String.valueOf(e)) + "}";
            }
        }

        @JavascriptInterface
        public String fsStats(String path) {
            try {
                if (path.startsWith("content://")) {
                    Cursor c = getContentResolver().query(Uri.parse(path), null, null, null, null);
                    long size = -1;
                    if (c != null) {
                        int idx = c.getColumnIndex(OpenableColumns.SIZE);
                        if (c.moveToFirst() && idx >= 0 && !c.isNull(idx)) size = c.getLong(idx);
                        c.close();
                    }
                    JSONObject o = new JSONObject();
                    o.put("size", size);
                    o.put("isFile", true);
                    o.put("isDirectory", false);
                    o.put("type", "FILE");
                    return o.toString();
                }
                File f = new File(path);
                if (!f.exists()) return "{\"error\":\"not found\"}";
                JSONObject o = new JSONObject();
                o.put("size", f.length());
                o.put("isFile", f.isFile());
                o.put("isDirectory", f.isDirectory());
                o.put("type", f.isDirectory() ? "DIRECTORY" : "FILE");
                o.put("modifiedAt", f.lastModified());
                return o.toString();
            } catch (Exception e) {
                return "{\"error\":" + JSONObject.quote(String.valueOf(e)) + "}";
            }
        }

        @JavascriptInterface
        public String fsMkdir(String path) {
            try {
                File f = new File(path);
                boolean ok = f.isDirectory() || f.mkdirs();
                return ok ? "{\"ok\":true}" : "{\"error\":\"mkdir failed\"}";
            } catch (Exception e) {
                return "{\"error\":" + JSONObject.quote(String.valueOf(e)) + "}";
            }
        }

        @JavascriptInterface
        public String fsRemove(String path) {
            try {
                if (path.startsWith("content://")) {
                    getContentResolver().delete(Uri.parse(path), null, null);
                    return "{\"ok\":true}";
                }
                File f = new File(path);
                if (!f.exists()) return "{\"ok\":true}";
                if (f.isDirectory()) {
                    File[] list = f.listFiles();
                    if (list != null) for (File c : list) {
                        // рекурсия через bridge-независимый вызов
                        if (c.isDirectory()) {
                            File[] inner = c.listFiles();
                            if (inner != null) for (File ic : inner) rm(ic);
                        } else rm(c);
                    }
                }
                boolean ok = f.delete();
                return ok ? "{\"ok\":true}" : "{\"error\":\"delete failed\"}";
            } catch (Exception e) {
                return "{\"error\":" + JSONObject.quote(String.valueOf(e)) + "}";
            }
        }

        private void rm(File f) {
            if (f.isDirectory()) {
                File[] list = f.listFiles();
                if (list != null) for (File c : list) rm(c);
            }
            f.delete();
        }

        @JavascriptInterface
        public String fsCopy(String src, String dst) {
            try (InputStream in = openRead(src); OutputStream out = openWrite(dst)) {
                copy(in, out);
                return "{\"ok\":true}";
            } catch (Exception e) {
                return "{\"error\":" + JSONObject.quote(String.valueOf(e)) + "}";
            }
        }

        /* ── хранилище: filesDir/.storage/<key>.neustorage (как у Neutralino) ── */

        private File storageFile(String key) {
            File d = new File(getFilesDir(), ".storage");
            if (!d.exists()) d.mkdirs();
            return new File(d, key + ".neustorage");
        }

        @JavascriptInterface
        public String storeGet(String key) {
            try {
                File f = storageFile(key);
                if (!f.exists()) return "{\"error\":\"NE_ST_NOKAY\"}";
                FileInputStream in = new FileInputStream(f);
                ByteArrayOutputStream o = new ByteArrayOutputStream();
                copy(in, o);
                in.close();
                JSONObject r = new JSONObject();
                r.put("ok", true);
                r.put("data", new String(o.toByteArray(), StandardCharsets.UTF_8));
                return r.toString();
            } catch (Exception e) {
                return "{\"error\":" + JSONObject.quote(String.valueOf(e)) + "}";
            }
        }

        @JavascriptInterface
        public void storeSet(String key, String value) {
            try {
                FileOutputStream out = new FileOutputStream(storageFile(key));
                out.write(value.getBytes(StandardCharsets.UTF_8));
                out.flush();
                out.close();
            } catch (Exception ignored) {}
        }

        /* ── пути ── */

        @JavascriptInterface
        public String getPath(String kind) {
            JSONObject o = new JSONObject();
            try {
                File base = getFilesDir();
                if ("documents".equals(kind) || "downloads".equals(kind) || "pictures".equals(kind)) {
                    File ext = getExternalFilesDir(null);
                    if (ext != null) base = ext;
                }
                o.put("ok", true);
                o.put("path", base.getAbsolutePath());
                return o.toString();
            } catch (Exception e) {
                return "{\"error\":" + JSONObject.quote(String.valueOf(e)) + "}";
            }
        }

        /* ── диалоги SAF (мост блокируется до выбора пользователя) ── */

        @JavascriptInterface
        public String saveDialog(final String title, final String defaultName, final String mime) {
            return runDialog(REQ_SAVE, title, defaultName, mime);
        }

        @JavascriptInterface
        public String openDialog(final String title, final String mime) {
            return runDialog(REQ_OPEN, title, null, mime);
        }

        private String runDialog(final int req, final String title, final String defaultName, final String mime) {
            final CountDownLatch latch = new CountDownLatch(1);
            runOnUiThread(() -> {
                dialogLatch = latch;
                dialogResult.set("");
                try {
                    Intent i;
                    String m = (mime == null || mime.trim().isEmpty()) ? "*/*" : mime;
                    if (req == REQ_SAVE) {
                        i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                        i.addCategory(Intent.CATEGORY_OPENABLE);
                        i.setType(m);
                        if (defaultName != null && !defaultName.isEmpty())
                            i.putExtra(Intent.EXTRA_TITLE, defaultName);
                    } else {
                        i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                        i.addCategory(Intent.CATEGORY_OPENABLE);
                        i.setType(m);
                    }
                    startActivityForResult(i, req);
                } catch (Exception e) {
                    if (dialogLatch != null) dialogLatch.countDown();
                    toast("Не удалось открыть диалог выбора файла");
                }
            });
            try {
                if (!latch.await(DIALOG_TIMEOUT_SEC, TimeUnit.SECONDS)) return "";
            } catch (InterruptedException e) { return ""; }
            return dialogResult.get();
        }

        /* результат диалога приходит в MainActivity.onActivityResult — он пишет
           в поля dialogResult/dialogLatch (единственный источник истины) */
    }

    @Override
    protected void onActivityResult(int req, int code, Intent data) {
        if (req == REQ_SAVE || req == REQ_OPEN) {
            String uri = "";
            if (code == RESULT_OK && data != null && data.getData() != null) {
                Uri u = data.getData();
                // сохраняем право доступа на чтение/запись до перезапуска приложения
                try {
                    int flags = (data.getFlags()
                            & (Intent.FLAG_GRANT_READ_URI_PERMISSION
                              | Intent.FLAG_GRANT_WRITE_URI_PERMISSION));
                    getContentResolver().takePersistableUriPermission(u, flags);
                } catch (Exception ignored) {}
                uri = u.toString();
            }
            dialogResult.set(uri);
            if (dialogLatch != null) dialogLatch.countDown();
            dialogLatch = null;
        } else {
            super.onActivityResult(req, code, data);
        }
    }

    /* ── открытие файла/папки (os.open) и публичная папка пользователя ──

       v2.5.2: приватный каталог приложения (/data/user/0/…) файловые
       менеджеры НЕ видят — кнопки «Открыть папку» работали молча или вели в
       недоступное место. Теперь:
       1. Пользовательские файлы (отчёты, конфиги, аккаунт) дублируются из
          files/WARPScoutGUI в общую папку устройства Download/WARPScoutGUI —
          она видна любому файловому менеджеру без root:
          • Android 10+ (API 29+): MediaStore (Downloads, RELATIVE_PATH) —
            разрешение не требуется, существующие записи перезаписываются;
          • Android 7–9: прямой файл в Downloads/WARPScoutGUI (для него в
            манифесте объявлен WRITE_EXTERNAL_STORAGE, maxSdkVersion 28);
            без права — fallback в app-specific getExternalFilesDir
            (тот же /storage/emulated/0).
       2. «Открыть папку» показывает публичную копию через DocumentsUI
          (ACTION_VIEW document-URI каталога) и ВСЕГДА отвечает тостом —
          с путём, который реально виден пользователю. */

    private static final String PUB_REL = "Download/WARPScoutGUI";

    /* хвост пути после "WARPScoutGUI/": …/files/WARPScoutGUI/reports/x.txt → reports/x.txt */
    private String pubRelOf(String absPath) {
        String p = absPath.replace('\\', '/');
        int i = p.indexOf("WARPScoutGUI/");
        if (i >= 0) return p.substring(i + "WARPScoutGUI/".length());
        return new File(p).getName();
    }

    private boolean isUnder(File parent, String child) {
        try {
            String a = parent.getCanonicalPath().replace('\\', '/');
            String b = child.replace('\\', '/');
            return b.equals(a) || b.startsWith(a.endsWith("/") ? a : a + "/");
        } catch (Exception e) { return false; }
    }

    /* запись потока в Download/WARPScoutGUI/<rel> через MediaStore (API 29+) */
    private String pubWriteMediaStore(String rel, String mime, InputStream in) throws Exception {
        ContentResolver cr = getContentResolver();
        String relPath = PUB_REL, name = rel;
        int slash = rel.lastIndexOf('/');
        if (slash >= 0) { relPath = PUB_REL + "/" + rel.substring(0, slash); name = rel.substring(slash + 1); }
        Uri collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
        // перезапись существующей записи вместо накопления дублей
        Uri item = null;
        Cursor c = cr.query(collection, new String[]{MediaStore.MediaColumns._ID},
                MediaStore.MediaColumns.RELATIVE_PATH + "=? AND " + MediaStore.MediaColumns.DISPLAY_NAME + "=?",
                new String[]{relPath + "/", name}, null);
        if (c != null) {
            try { if (c.moveToFirst()) item = Uri.withAppendedPath(collection, String.valueOf(c.getLong(0))); }
            finally { c.close(); }
        }
        String display = "/storage/emulated/0/" + relPath + "/" + name;
        if (item != null) {
            OutputStream out = cr.openOutputStream(item, "wt");
            if (out == null) throw new Exception("openOutputStream(wt) = null");
            try { copyStream(in, out); } finally { out.close(); }
            return display;
        }
        ContentValues v = new ContentValues();
        v.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
        v.put(MediaStore.MediaColumns.MIME_TYPE, mime);
        v.put(MediaStore.MediaColumns.RELATIVE_PATH, relPath + "/");
        Uri uri = cr.insert(collection, v);
        if (uri == null) throw new Exception("MediaStore insert failed");
        OutputStream out = cr.openOutputStream(uri);
        if (out == null) throw new Exception("openOutputStream = null");
        try { copyStream(in, out); } finally { out.close(); }
        return display;
    }

    /* запись потока в Downloads/WARPScoutGUI (API 24–28); без права —
       app-specific getExternalFilesDir (тоже /storage/emulated/0) */
    private String pubWriteLegacy(String rel, InputStream in) throws Exception {
        File base = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "WARPScoutGUI");
        File f = new File(base, rel);
        FileOutputStream out;
        try {
            File parent = f.getParentFile();
            if (parent != null && !parent.exists()) parent.mkdirs();
            out = new FileOutputStream(f);
        } catch (Exception noPerm) {
            File altBase = getExternalFilesDir(null);
            if (altBase == null) throw noPerm;
            f = new File(new File(altBase, "WARPScoutGUI"), rel);
            File parent = f.getParentFile();
            if (parent != null && !parent.exists()) parent.mkdirs();
            out = new FileOutputStream(f);
        }
        try { copyStream(in, out); } finally { out.close(); }
        return f.getAbsolutePath();
    }

    private String pubMirrorFile(File src) throws Exception {
        String rel = pubRelOf(src.getAbsolutePath());
        InputStream in = new FileInputStream(src);
        try {
            if (Build.VERSION.SDK_INT >= 29) return pubWriteMediaStore(rel, mimeFor(src.getName()), in);
            return pubWriteLegacy(rel, in);
        } finally { try { in.close(); } catch (Exception ignored) {} }
    }

    /* зеркало содержимого папки (1 уровень + reports/) — «синхронизация перед показом» */
    private void pubMirrorTree(File f) {
        int budget = 64;
        if (f.isFile()) { try { pubMirrorFile(f); } catch (Exception ignored) {} return; }
        if (!f.isDirectory()) return;
        File[] kids = f.listFiles();
        if (kids == null) return;
        for (File k : kids) {
            if (budget-- <= 0) return;
            if (k.isFile()) { try { pubMirrorFile(k); } catch (Exception ignored) {} }
            else if (k.isDirectory()) {
                File[] sub = k.listFiles();
                if (sub == null) continue;
                for (File s : sub) {
                    if (budget-- <= 0) break;
                    if (s.isFile()) { try { pubMirrorFile(s); } catch (Exception ignored) {} }
                }
            }
        }
    }

    /* JS-мост: зеркалирование одного файла (GUI вызывает после записи отчёта/конфига/аккаунта) */
    @JavascriptInterface
    public String pubMirror(String srcPath) {
        JSONObject o = new JSONObject();
        try {
            File src = new File(srcPath);
            if (!src.exists() || !src.isFile()) return "{\"error\":\"not found\"}";
            o.put("ok", true);
            o.put("path", pubMirrorFile(src));
            return o.toString();
        } catch (Exception e) {
            return "{\"error\":" + JSONObject.quote(String.valueOf(e)) + "}";
        }
    }

    /* JS-мост: путь публичной папки для показа пользователю */
    @JavascriptInterface
    public String pubDir() {
        JSONObject o = new JSONObject();
        try {
            o.put("ok", true);
            if (Build.VERSION.SDK_INT >= 29) {
                o.put("path", "/storage/emulated/0/" + PUB_REL);
            } else {
                File base = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "WARPScoutGUI");
                File alt = getExternalFilesDir(null);
                if (!base.exists() && !base.mkdirs() && alt != null) base = new File(alt, "WARPScoutGUI");
                o.put("path", base.getAbsolutePath());
            }
            return o.toString();
        } catch (Exception e) {
            return "{\"error\":" + JSONObject.quote(String.valueOf(e)) + "}";
        }
    }

    @JavascriptInterface
    public void openPath(String path) {
        // IO (зеркалирование) — на потоке моста; UI — только активити/тосты
        final String p = String.valueOf(path == null ? "" : path);
        String docId = null;   // documentId для DocumentsUI ("primary:Download/WARPScoutGUI")
        String human = p;      // путь, который показываем пользователю
        String note = "";
        try {
            if (!p.startsWith("content://")) {
                File f = new File(p);
                if (isUnder(getFilesDir(), p)) {
                    // приватная папка → показываем публичную копию
                    String rel = pubRelOf(p);
                    String sub = rel.contains("/") ? rel.substring(0, rel.lastIndexOf('/')) : "";
                    if (f.isFile()) {
                        try { pubMirrorFile(f); note = "копия обновлена: "; } catch (Exception ignored) {}
                        docId = "primary:" + PUB_REL + (sub.isEmpty() ? "" : "/" + sub);
                    } else {
                        pubMirrorTree(f);
                        docId = "primary:" + PUB_REL;
                    }
                    human = "/storage/emulated/0/" + docId.substring("primary:".length());
                } else {
                    String stRoot = "/storage/emulated/0/";
                    String abs = (f.exists() && f.isFile()) ? f.getParent() : p;
                    String a = abs.replace('\\', '/');
                    if (a.startsWith(stRoot)) {
                        docId = "primary:" + a.substring(stRoot.length());
                        human = a;
                    }
                }
            }
        } catch (Exception ignored) {}
        final String fDocId = docId, fHuman = human, fNote = note;
        runOnUiThread(() -> {
            try {
                if (p.startsWith("content://")) {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(p)));
                    return;
                }
                if (fDocId == null) {
                    // напр. nativeLibraryDir — системный каталог, менеджеры его не показывают
                    toast("Системная папка недоступна файловым менеджерам: " + fHuman);
                    return;
                }
                Uri doc = DocumentsContract.buildDocumentUri("com.android.externalstorage.documents", fDocId);
                if (openInFileManager(doc, fHuman, fNote)) return;
            } catch (Exception e) {
                toast("Не удалось открыть: " + fHuman);
            }
        });
    }

    /* DocumentsUI понимает ACTION_VIEW document-URI каталога — открывается
       нужная папка в системных «Файлах»/файловом менеджере. Цепочка fallback:
       раздел загрузок → тост с путём. Пользователь всегда получает ответ. */
    private boolean openInFileManager(Uri docUri, String human, String note) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(docUri, "vnd.android.document/directory");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(i);
            toast(fNoteEmpty(note) ? ("Папка открыта: " + human) : (note + human));
            return true;
        } catch (Exception e) {
            try {
                startActivity(new Intent(DownloadManager.ACTION_VIEW_DOWNLOADS));
                toast((note.isEmpty() ? "Папка: " : note) + human + " (раздел загрузок)");
                return true;
            } catch (Exception e2) {
                toast("Папка: " + human + " — откройте любым файловым менеджером");
                return false;
            }
        }
    }

    private boolean fNoteEmpty(String s) { return s == null || s.isEmpty(); }

    /* копирование потока для публичной папки (у Bridge свой экземплярный copy) */
    private static void copyStream(InputStream in, OutputStream out) throws Exception {
        byte[] b = new byte[8192];
        int n;
        while ((n = in.read(b)) > 0) out.write(b, 0, n);
    }

    private static String mimeFor(String name) {
        String n = name.toLowerCase();
        if (n.endsWith(".json")) return "application/json";
        if (n.endsWith(".txt") || n.endsWith(".log")) return "text/plain";
        if (n.endsWith(".conf")) return "text/plain";
        if (n.endsWith(".png")) return "image/png";
        if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
        if (n.endsWith(".svg")) return "image/svg+xml";
        if (n.endsWith(".csv")) return "text/csv";
        if (n.endsWith(".html") || n.endsWith(".htm")) return "text/html";
        return "application/octet-stream";
    }

    private void toast(String msg) {
        Toast.makeText(this, msg, Toast.LENGTH_LONG).show();
    }

    /* ── буфер обмена (используется fallback-цепочкой app.js) ── */

    @JavascriptInterface
    public void clipboardWrite(String text) {
        try {
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            cm.setPrimaryClip(ClipData.newPlainText("WARPScoutGUI", text));
        } catch (Exception ignored) {}
    }

    @Override
    public void onBackPressed() {
        // SPA без истории: двойной «назад» не нужен, сворачиваем приложение
        moveTaskToBack(true);
    }

    @Override
    protected void onDestroy() {
        synchronized (procsLock) {
            for (Process p : procs.values()) { try { p.destroy(); } catch (Exception ignored) {} }
            procs.clear();
        }
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
