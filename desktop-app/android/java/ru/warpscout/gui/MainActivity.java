/* ═══════════════════════════════════════════════════════════════
   WARPSCOUT GUI — Android-оболочка (v2.5.7)
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
import android.webkit.MimeTypeMap;
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
import java.util.Collections;
import java.util.Locale;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
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

    // ── v2.5.5: content:// URI, выданные СОБСТВЕННЫМИ SAF-диалогами приложения ──
    // файловые операции моста разрешены только с такими URI (или с сохранённым
    // правом доступа) — произвольные content:// из JS не открываются
    private final Set<String> uriAllow = Collections.synchronizedSet(new HashSet<String>());

    /* разрешён ли этот content:// URI: вернул наш диалог (сессия) или
       на URI выдано сохраняемое право доступа (takePersistableUriPermission) */
    private boolean uriAllowed(String u) {
        if (u == null || u.isEmpty()) return false;
        if (uriAllow.contains(u)) return true;
        try {
            Uri uri = Uri.parse(u);
            for (android.content.UriPermission p : getContentResolver().getPersistedUriPermissions()) {
                if (p.getUri() != null && u.equals(p.getUri().toString())) return true;
            }
        } catch (Throwable ignored) {}
        return false;
    }

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

        // v2.5.3: «своя папка» на /storage/emulated/0 + разовый перенос
        // пользовательских файлов из приватного каталога v2.5.2
        lastStorageMode = storageMode();
        migrateLegacyOnce();
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
                // v2.5.3: «своя папка» на /storage/emulated/0 (см. блок хранилища ниже)
                o.put("dataBase", dataBase().getAbsolutePath());
                o.put("dataDir", userDir().getAbsolutePath());
                o.put("storageMode", storageMode());
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

        /* ── процессы ──
           v2.5.5 (CodeQL command-line-injection): команда из нашего JS
           разбирается POSIX-совместимым токенизатором и запускается НАПРЯМУЮ
           (без "sh -c") — метасимволы шелла (; & | ` $() …) не интерпретируются
           никогда, инъекция команд исключена по построению. Исполняемый файл —
           строго своё ядро warpscout (libwarpscout.so) либо chmod (право на
           запуск). Всё прочее — честная ошибка. */

        private Process startProc(String cmd) throws Exception {
            String line = String.valueOf(cmd == null ? "" : cmd).trim();
            // "exec " был нужен только под sh (замена себя бинарём) — под
            // ProcessBuilder он не требуется, destroy() и так убьёт бинарь
            if (line.startsWith("exec ")) line = line.substring(5).trim();
            ArrayList<String> argv = tokenizeCmd(line);
            if (argv.isEmpty()) throw new Exception("пустая команда");
            String exe = argv.get(0);
            String ws = new File(getApplicationInfo().nativeLibraryDir,
                    "libwarpscout.so").getAbsolutePath();
            if (!exe.equals(ws) && !exe.equals("chmod"))
                throw new Exception("выполнять разрешено только warpscout");
            ProcessBuilder pb = new ProcessBuilder(argv);
            // v2.5.3: warpscout работает в СВОЕЙ видимой папке — любые его
            // относительные записи тоже попадают в /storage/emulated/0
            pb.directory(userDir());
            pb.redirectErrorStream(false);
            return pb.start();
        }

        @JavascriptInterface
        public String execStream(String cmd) {
            final int id;
            final Process p;
            try {
                // "exec "-префикс токенизатор отбрасывает (см. startProc):
                // под ProcessBuilder destroy() убивает сам бинарь warpscout
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

        /* v2.5.5 (CodeQL path-injection / unsafe-content-uri-resolution):
           файловые пути — только внутри разрешённых корней (guardPath);
           content:// — только URI, выданные нашими диалогами или с сохранённым
           правом. equals-сравнение URI с доверенным значением — локальный
           guard-барьер для потока данных (закрывает последний алерт). */
        private InputStream openRead(String path) throws Exception {
            if (path.startsWith("content://")) {
                Uri uri = Uri.parse(path);
                List<android.content.UriPermission> perms = null;
                try { perms = getContentResolver().getPersistedUriPermissions(); } catch (Throwable ignored) {}
                if (perms != null) {
                    for (android.content.UriPermission p : perms)
                        if (p.getUri() != null && uri.equals(p.getUri()))
                            return getContentResolver().openInputStream(uri);
                }
                String[] snap;
                synchronized (uriAllow) { snap = uriAllow.toArray(new String[0]); }
                for (String s : snap)
                    if (uri.equals(Uri.parse(s)))
                        return getContentResolver().openInputStream(uri);
                throw new Exception("content URI не выдан приложением");
            }
            String g = guardPath(path);
            if (g == null) throw new Exception("путь вне папок приложения");
            return new FileInputStream(g);
        }

        private OutputStream openWrite(String path) throws Exception {
            if (path.startsWith("content://")) {
                Uri uri = Uri.parse(path);
                List<android.content.UriPermission> perms = null;
                try { perms = getContentResolver().getPersistedUriPermissions(); } catch (Throwable ignored) {}
                if (perms != null) {
                    for (android.content.UriPermission p : perms)
                        if (p.getUri() != null && uri.equals(p.getUri()))
                            return getContentResolver().openOutputStream(uri, "wt");
                }
                String[] snap;
                synchronized (uriAllow) { snap = uriAllow.toArray(new String[0]); }
                for (String s : snap)
                    if (uri.equals(Uri.parse(s)))
                        return getContentResolver().openOutputStream(uri, "wt");
                throw new Exception("content URI не выдан приложением");
            }
            String g = guardPath(path);
            if (g == null) throw new Exception("путь вне папок приложения");
            File f = new File(g);
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
                String g = guardPath(path); // v2.5.5: только свои папки
                if (g == null) return "{\"error\":\"path not allowed\"}";
                File d = new File(g);
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
                    if (!uriAllowed(path)) return "{\"error\":\"content URI не выдан приложением\"}";
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
                String g = guardPath(path); // v2.5.5: только свои папки
                if (g == null) return "{\"error\":\"path not allowed\"}";
                File f = new File(g);
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
                String g = guardPath(path); // v2.5.5: только свои папки
                if (g == null) return "{\"error\":\"path not allowed\"}";
                File f = new File(g);
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
                    if (!uriAllowed(path)) return "{\"error\":\"content URI не выдан приложением\"}";
                    getContentResolver().delete(Uri.parse(path), null, null);
                    return "{\"ok\":true}";
                }
                String g = guardPath(path); // v2.5.5: только свои папки
                if (g == null) return "{\"error\":\"path not allowed\"}";
                File f = new File(g);
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

        /* v2.5.5 (CodeQL path-injection): ключ хранилища — только простое имя
           (state, …); «..», разделители и прочий мусор отвергаются, канонизация
           гарантирует, что файл не выйдет из files/.storage */
        private File storageFile(String key) throws Exception {
            if (key == null || !key.matches("[A-Za-z0-9._-]{1,64}") || key.contains(".."))
                throw new IllegalArgumentException("bad storage key");
            File d = new File(getFilesDir(), ".storage");
            if (!d.exists()) d.mkdirs();
            return new File(new File(d, key + ".neustorage").getCanonicalPath());
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
                // v2.5.3: база пользовательских данных — том /storage/emulated/0
                // (после выдачи доступа) или app-specific files (по умолчанию);
                // GUI добавляет к базе «WARPScoutGUI» (computePaths в app.js)
                o.put("ok", true);
                o.put("path", dataBase().getAbsolutePath());
                return o.toString();
            } catch (Exception e) {
                return "{\"error\":" + JSONObject.quote(String.valueOf(e)) + "}";
            }
        }

        /* ── диалоги SAF (мост блокируется до выбора пользователя) ── */

        @JavascriptInterface
        public String saveDialog(final String title, final String defaultName, final String mime) {
            return runDialog(REQ_SAVE, title, defaultName, mime, null);
        }

        /* v2.5.4: с подсказкой начального каталога (EXTRA_INITIAL_URI, API 26+) —
           диалог «Сохранить как…» открывается в Download/WARPScoutGUI */
        @JavascriptInterface
        public String saveDialog(final String title, final String defaultName, final String mime, final String initDocId) {
            return runDialog(REQ_SAVE, title, defaultName, mime, initDocId);
        }

        @JavascriptInterface
        public String openDialog(final String title, final String mime) {
            return runDialog(REQ_OPEN, title, null, mime, null);
        }

        private String runDialog(final int req, final String title, final String defaultName, final String mime, final String initDocId) {
            final CountDownLatch latch = new CountDownLatch(1);
            runOnUiThread(() -> {
                dialogLatch = latch;
                dialogResult.set("");
                try {
                    Intent i;
                    String m = (mime == null || mime.trim().isEmpty()) ? "*/*" : mime;
                    // v2.5.7: SAF-пикеры прошивок переименовывают «*.conf» в «*.txt»,
                    // если mime не совпадает с их таблицей — отдаём родной для
                    // расширения mime (или не имеющий канонического расширения)
                    if (req == REQ_SAVE) m = mimeForName(defaultName, m);
                    if (req == REQ_SAVE) {
                        i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                        i.addCategory(Intent.CATEGORY_OPENABLE);
                        i.setType(m);
                        if (defaultName != null && !defaultName.isEmpty())
                            i.putExtra(Intent.EXTRA_TITLE, defaultName);
                        // v2.5.4: открываем диалог сразу в папке конфигов
                        if (initDocId != null && !initDocId.isEmpty() && Build.VERSION.SDK_INT >= 26) {
                            try {
                                i.putExtra(DocumentsContract.EXTRA_INITIAL_URI,
                                        DocumentsContract.buildDocumentUri(
                                                "com.android.externalstorage.documents", initDocId));
                            } catch (Throwable ignored) {}
                        }
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

        /* ═══ v2.5.6 FIX: методы ниже были объявлены в MainActivity, а не во
           внутреннем Bridge — WebView экспортирует ТОЛЬКО Bridge, поэтому из
           JS они не вызывались: openPath падал «B.openPath is not a function»
           (v2.5.3 глотал ошибку молча, v2.5.4+ показывал тост), а
           requestPublicAccess/pubDir/pubMirror/saveToDownloads/clipboardWrite
           молча отсутствовали. Перенесены внутрь Bridge без изменения логики:
           inner-класс имеет доступ к приватным методам Activity. ═══ */

        /* JS-мост: запросить доступ к общей папке (мост НЕ блокируется):
           API 30+ — экран «Все файлы» (результат придёт в onResume),
           API 24–29 — системный диалог WRITE (результат в onRequestPermissionsResult) */
        @JavascriptInterface
        public String requestPublicAccess() {
            JSONObject o = new JSONObject();
            try {
                boolean allowed = publicRootAllowed();
                o.put("ok", true);
                o.put("mode", allowed ? "public" : "app");
                if (!allowed) {
                    if (Build.VERSION.SDK_INT >= 30) {
                        try {
                            startActivity(new Intent(
                                    android.provider.Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION,
                                    Uri.parse("package:" + getPackageName())));
                            o.put("asked", "manage");
                        } catch (Exception e) {
                            try {
                                startActivity(new Intent(
                                        android.provider.Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION));
                                o.put("asked", "manage");
                            } catch (Exception e2) { o.put("asked", "unavailable"); }
                        }
                    } else {
                        try {
                            requestPermissions(new String[]{"android.permission.WRITE_EXTERNAL_STORAGE"}, REQ_WRITE);
                            o.put("asked", "write");
                        } catch (Exception e) { o.put("asked", "unavailable"); }
                    }
                }
            } catch (Exception e) {
                try { o.put("error", String.valueOf(e)); } catch (Throwable ignored) {}
            }
            return o.toString();
        }

        /* JS-мост (совместимость v2.5.2): зеркалирование больше не нужно —
           данные уже лежат в видимой папке. Без "path" в ответе JS покажет
           исходный путь и не будет говорить про «копию в общей папке». */
        @JavascriptInterface
        public String pubMirror(String srcPath) { return "{\"ok\":true}"; }

        /* JS-мост: видимая папка пользователя (подсказки в UI) */
        @JavascriptInterface
        public String pubDir() {
            JSONObject o = new JSONObject();
            try {
                o.put("ok", true);
                o.put("path", userDir().getAbsolutePath());
                return o.toString();
            } catch (Exception e) {
                return "{\"error\":" + JSONObject.quote(String.valueOf(e)) + "}";
            }
        }

        /* v2.5.7: MIME, при котором провайдер НЕ переклеит имя файла.
           MediaStore и SAF-пикеры ряда прошивок дописывают каноническое
           расширение MIME к имени, чьё расширение не совпадает с MIME
           («*.conf» + text/plain → «*.conf.txt» / «*.txt»). Правило:
           • платформа знает расширение → отдаём ЕЁ mime (mimeType(ext) == mime
             → reform-логика имени не срабатывает);
           • платформа НЕ знает расширение → mime без канонического расширения
             (application/x-warpscout-<ext>) — дописывать нечем.
           fallbackMime используется, только когда расширения нет вовсе. */
    /* (вызывается из Bridge; не static — javac -source 8 запрещает static во inner-классах) */
    private String mimeForName(String name, String fallbackMime) {
        String ext = "";
        if (name != null) {
            int dot = name.lastIndexOf('.');
            if (dot > 0 && dot < name.length() - 1)
                ext = name.substring(dot + 1).toLowerCase(Locale.US).replaceAll("[^a-z0-9]", "");
        }
        if (ext.isEmpty())
            return (fallbackMime == null || fallbackMime.trim().isEmpty()) ? "application/octet-stream" : fallbackMime;
        try {
            String dm = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
            if (dm != null && !dm.trim().isEmpty()) return dm;
        } catch (Throwable ignored) {}
        return "application/x-warpscout-" + ext;
    }

    /* фактическое DISPLAY_NAME вставленной записи MediaStore */
    private String mediaDisplayName(ContentResolver cr, Uri uri) {
        try {
            Cursor c = cr.query(uri, new String[]{MediaStore.MediaColumns.DISPLAY_NAME}, null, null, null);
            if (c != null) {
                try { if (c.moveToFirst()) { String n = c.getString(0); if (n != null && !n.isEmpty()) return n; } }
                finally { try { c.close(); } catch (Exception ignored) {} }
            }
        } catch (Throwable ignored) {}
        return null;
    }

        /* ── v2.5.4: сохранение готовых конфигов в Download/WARPScoutGUI ──
           API 29+ (Android 10+): MediaStore.Downloads — БЕЗ каких-либо разрешений;
           API 24–28 (Android 7–9): прямая запись при выданном WRITE_EXTERNAL_STORAGE
           (legacy-режим в манифесте); иначе {fallback:true} — JS сохранит в
           папку приложения и честно скажет об этом.
           v2.5.7: mime подбирается под расширение (см. mimeForName) — имя
           «*.conf» больше не превращается в «*.conf.txt»; IS_PENDING убран
           (файл пишется одним куском, а «висящие» pending-записи ряд
           прошивок показывает в Downloads призрачными папками); имя после
           вставки читается обратно, и в ответе уходит РЕАЛЬНЫЙ путь.
           Ответ: {ok:true, path, uri?} | {fallback:true} | {error} */
        @JavascriptInterface
        public String saveToDownloads(String name, String mime, String b64) {
            JSONObject o = new JSONObject();
            try {
                byte[] bytes = Base64.decode(b64 == null ? "" : b64, Base64.NO_WRAP);
                String safeName = String.valueOf(name == null || name.trim().isEmpty() ? "warp.conf" : name.trim());
                safeName = safeName.replaceAll("[\\\\/:*?\"<>|]", "_");
                String m = mimeForName(safeName, mime);
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentResolver cr = getContentResolver();
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.MediaColumns.DISPLAY_NAME, safeName);
                    cv.put(MediaStore.MediaColumns.MIME_TYPE, m);
                    cv.put(MediaStore.MediaColumns.RELATIVE_PATH,
                            Environment.DIRECTORY_DOWNLOADS + "/WARPScoutGUI");
                    Uri uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    if (uri == null) throw new Exception("MediaStore insert failed");
                    OutputStream os = cr.openOutputStream(uri);
                    if (os == null) throw new Exception("openOutputStream failed");
                    try { os.write(bytes); os.flush(); } finally { try { os.close(); } catch (Exception ignored) {} }
                    // v2.5.7: честное имя — провайдер мог переименовать вопреки mime
                    String realName = mediaDisplayName(cr, uri);
                    if (realName != null && !realName.equals(safeName)) {
                        try {
                            ContentValues fix = new ContentValues();
                            fix.put(MediaStore.MediaColumns.DISPLAY_NAME, safeName);
                            cr.update(uri, fix, null, null);
                            String again = mediaDisplayName(cr, uri);
                            if (again != null) realName = again;
                        } catch (Throwable ignored) {}
                    }
                    if (realName == null || realName.isEmpty()) realName = safeName;
                    o.put("ok", true);
                    o.put("path", DOWNLOAD_DIR + "/" + realName);
                    o.put("uri", uri.toString());
                    return o.toString();
                }
                if (publicRootAllowed()) {
                    File dir = new File(DOWNLOAD_DIR);
                    if (!dir.isDirectory() && !dir.mkdirs()) throw new Exception("mkdirs failed: " + DOWNLOAD_DIR);
                    File f = uniqueFile(dir, safeName);
                    FileOutputStream fo = new FileOutputStream(f);
                    try { fo.write(bytes); fo.flush(); } finally { try { fo.close(); } catch (Exception ignored) {} }
                    o.put("ok", true);
                    o.put("path", f.getAbsolutePath());
                    return o.toString();
                }
                o.put("fallback", true);
                return o.toString();
            } catch (Throwable t) {
                try { o.put("error", String.valueOf(t)); } catch (Throwable ignored) {}
                return o.toString();
            }
        }

        /* «Открыть папку» (v2.5.4): открываются СТРОГО
             • своя папка данных (…/Android/data/…/files/WARPScoutGUI или
               /storage/emulated/0/WARPScoutGUI) и её подпапки;
             • публичная папка конфигов Download/WARPScoutGUI и её подпапки.
           Всё прочее (корень тома, системные каталоги, чужие папки) показываем
           как свою папку данных. Корень никогда не открываем.
           Ответ пользователю ГАРАНТИРОВАН в каждой ветке (тост): тишина исключена. */
        @JavascriptInterface
        public void openPath(String path) {
            final String p = String.valueOf(path == null ? "" : path);
            if (p.startsWith("content://")) {
                runOnUiThread(() -> {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(p))); toast("Открываю…"); }
                    catch (Throwable e) { toast("Не удалось открыть: нет подходящего приложения"); }
                });
                return;
            }
            String abs = p;
            try {
                File f = new File(p);
                if (f.exists() && f.isFile()) abs = f.getParent(); // файл → его папка
            } catch (Throwable ignored) {}
            String ud = userDir().getAbsolutePath().replace('\\', '/');
            String a = abs.replace('\\', '/');
            if (a.equals(EXT_ROOT)) a = ud;  // корень тома не открываем
            // v2.5.4: разрешены своя папка и публичная папка конфигов (вместе с подпапками)
            boolean okUser = a.startsWith(ud);
            boolean okDl = a.startsWith(DOWNLOAD_DIR);
            if (!okUser && !okDl) a = ud;    // вне разрешённых → своя папка данных
            try { File d = new File(a); if (!d.exists()) d.mkdirs(); } catch (Throwable ignored) {}
            // v2.5.4: docId строим по реальному тому папки (своя на /storage или Download)
            final String fDocId = underExtDocId(a);
            final String fHuman = a;
            runOnUiThread(() -> openDirChain(fDocId, fHuman));
        }

        /* ── буфер обмена (используется fallback-цепочкой app.js и openDirChain) ── */
        @JavascriptInterface
        public void clipboardWrite(String text) { setClipboard(text); }

        /* результат диалога приходит в MainActivity.onActivityResult — он пишет
           в поля dialogResult/dialogLatch (единственный источник истины) */
    }

    @Override
    protected void onActivityResult(int req, int code, Intent data) {
        if (req == REQ_SAVE || req == REQ_OPEN) {
            String uri = "";
            if (code == RESULT_OK && data != null && data.getData() != null) {
                Uri u = data.getData();
                // v2.5.5: URI, вернувшийся из НАШЕГО диалога, разрешён для файловых операций моста
                uriAllow.add(u.toString());
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

    /* ── хранилище пользователя (v2.5.3) и открытие папок ──

       Пользовательские файлы (аккаунт, отчёты, конфиги) живут ТОЛЬКО в
       «своей папке» на /storage/emulated/0 — файловые менеджеры видят их
       без root, зеркалирование в Downloads больше не нужно:

       • режим "app" (по умолчанию, без разрешений):
           /storage/emulated/0/Android/data/ru.warpscout.gui/files/WARPScoutGUI
         (своя папка внутри app-specific каталога — видна большинству
         файловых менеджеров, пишется всегда);
       • режим "public" (после выдачи доступа):
           /storage/emulated/0/WARPScoutGUI
         – Android 11+ (API 30+): переключатель «Все файлы» (MANAGE);
         – Android 7–10 (API 24–29): WRITE_EXTERNAL_STORAGE + legacy-режим
           (requestLegacyExternalStorage в манифесте).

       os.getPath("data") возвращает БАЗУ (том или app-specific files),
       GUI добавляет к ней «WARPScoutGUI» (computePaths в app.js).
       Рабочий каталог warpscout — тоже эта папка (startProc).

       «Открыть папку» (openPath) открывает СТРОГО свою папку или её
       подпапку — корень тома и системные каталоги никогда не открываются —
       и отвечает тостом в КАЖДОЙ ветке: тишина исключена. */

    private static final String EXT_ROOT = "/storage/emulated/0";
    /* v2.5.4: публичная папка готовых конфигов — видна в любом файловом
       менеджере, на API 29+ пишется через MediaStore без разрешений */
    private static final String DOWNLOAD_DIR = "/storage/emulated/0/Download/WARPScoutGUI";
    private static final int REQ_WRITE = 7101;
    private String lastStorageMode = null;

    /* доступна ли запись в корень общего хранилища */
    private boolean publicRootAllowed() {
        if (Build.VERSION.SDK_INT >= 30) {
            try { return Environment.isExternalStorageManager(); }
            catch (Throwable t) { return false; }
        }
        try {
            return checkSelfPermission("android.permission.WRITE_EXTERNAL_STORAGE")
                    == android.content.pm.PackageManager.PERMISSION_GRANTED;
        } catch (Throwable t) { return false; }
    }

    /* база путей для GUI: том (public) или app-specific files (app) */
    private File dataBase() {
        if (publicRootAllowed()) {
            try {
                File r = Environment.getExternalStorageDirectory();
                if (r != null && r.isDirectory()) return r;
            } catch (Throwable ignored) {}
        }
        File ext = getExternalFilesDir(null);
        return ext != null ? ext : getFilesDir();
    }

    /* «своя папка» пользователя: <база>/WARPScoutGUI */
    private File userDir() {
        File d = new File(dataBase(), "WARPScoutGUI");
        if (!d.exists()) d.mkdirs();
        return d;
    }

    /* ── v2.5.5 (CodeQL path-injection): разрешённые корни файловых операций
       JS-моста. Фронтенд работает только со СВОИМИ папками (данные, публичные
       конфиги в Download, внутренние каталоги приложения); всё прочее —
       системные каталоги, чужие файлы, «..»-обходы — отклоняется с честной
       ошибкой, которую фронтенд показывает пользователю. */
    private List<File> guardRoots() {
        List<File> r = new ArrayList<>();
        try { r.add(getFilesDir().getCanonicalFile()); } catch (Exception ignored) {}
        try {
            File e = getExternalFilesDir(null);
            if (e != null) r.add(e.getCanonicalFile());
        } catch (Exception ignored) {}
        try { r.add(userDir().getCanonicalFile()); } catch (Exception ignored) {}
        try { r.add(new File(DOWNLOAD_DIR).getCanonicalFile()); } catch (Exception ignored) {}
        try { r.add(new File(EXT_ROOT, "WARPScoutGUI").getCanonicalFile()); } catch (Exception ignored) {}
        return r;
    }

    /* канонический путь внутри разрешённых корней — или null (отказ).
       getCanonicalPath убирает «..», симлинки и лишние разделители. */
    private String guardPath(String path) {
        if (path == null) return null;
        String p = path.trim();
        if (p.isEmpty() || p.startsWith("content://")) return null;
        try {
            String canon = new File(p).getCanonicalPath();
            for (File root : guardRoots()) {
                String rp = root.getPath();
                if (canon.equals(rp)
                        || canon.startsWith(rp.endsWith(File.separator) ? rp : rp + File.separator))
                    return canon;
            }
        } catch (Exception ignored) {}
        return null;
    }

    /* POSIX-совместимая токенизация команды (кавычки ' и ", \-экранирование —
       как у sh, включая '\'' внутри одинарных кавычек). Без шелла метасимволы
       (; & | ` $()) не интерпретируются — инъекция команд невозможна. */
    private static ArrayList<String> tokenizeCmd(String s) throws Exception {
        ArrayList<String> out = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean has = false, inS = false, inD = false;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (inS) {
                if (c == '\'') inS = false; else cur.append(c);
            } else if (inD) {
                if (c == '"') inD = false;
                else if (c == '\\' && i + 1 < s.length()) {
                    char n = s.charAt(i + 1);
                    if (n == '"' || n == '\\' || n == '$' || n == '`') { cur.append(n); i++; }
                    else cur.append(c);
                } else cur.append(c);
            } else if (c == '\'') { inS = true; has = true; }
            else if (c == '"') { inD = true; has = true; }
            else if (c == '\\') { if (i + 1 < s.length()) { cur.append(s.charAt(++i)); has = true; } }
            else if (c == ' ' || c == '\t' || c == '\n' || c == '\r') {
                if (has) { out.add(cur.toString()); cur.setLength(0); has = false; }
            } else { cur.append(c); has = true; }
        }
        if (inS || inD) throw new Exception("незакрытая кавычка в команде");
        if (has) out.add(cur.toString());
        return out;
    }

    private String storageMode() { return publicRootAllowed() ? "public" : "app"; }

    /* разовый перенос пользовательских файлов из приватного каталога
       v2.5.2 (files/WARPScoutGUI) в новую видимую папку */
    private void migrateLegacyOnce() {
        try {
            File flag = new File(getFilesDir(), ".migrated-253");
            if (flag.exists()) return;
            File src = new File(getFilesDir(), "WARPScoutGUI");
            if (src.isDirectory()) copyTree(src, userDir(), 512);
            flag.createNewFile();
        } catch (Throwable ignored) {}
    }

    private int copyBudget;

    private void copyTree(File src, File dst, int budget) {
        copyBudget = budget;
        File[] kids = src.listFiles();
        if (kids == null) return;
        for (File k : kids) {
            if (copyBudget <= 0) return;
            File t = new File(dst, k.getName());
            if (k.isDirectory()) {
                if (t.mkdirs() || t.isDirectory()) copyTree(k, t, copyBudget);
            } else {
                try {
                    if (t.exists() && t.length() == k.length()) continue;
                    File p = t.getParentFile();
                    if (p != null && !p.exists()) p.mkdirs();
                    FileInputStream in = new FileInputStream(k);
                    try {
                        FileOutputStream out = new FileOutputStream(t);
                        try { copyStream(in, out); } finally { out.close(); }
                    } finally { try { in.close(); } catch (Exception ignored) {} }
                    copyBudget--;
                } catch (Throwable ignored) {}
            }
        }
    }

    /* Java → JS: режим хранилища изменился (выдача/отзыв доступа) */
    private void emitStorageChanged() {
        try {
            JSONObject o = new JSONObject();
            o.put("mode", storageMode());
            o.put("base", dataBase().getAbsolutePath());
            o.put("userDir", userDir().getAbsolutePath());
            evalJs("window.__wsStorageChanged && window.__wsStorageChanged(JSON.parse("
                    + JSONObject.quote(o.toString()) + "));");
        } catch (Throwable ignored) {}
    }

    /* v2.5.6: requestPublicAccess перенесён во внутренний Bridge —
       вне Bridge он не экспортировался в WebView и не работал */

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        if (req == REQ_WRITE) {
            boolean ok = res != null && res.length > 0
                    && res[0] == android.content.pm.PackageManager.PERMISSION_GRANTED;
            toast(ok
                    ? "Доступ к хранилищу выдан — данные переносятся в общую папку"
                    : "Доступ не выдан — данные остаются в папке приложения (Android/data)");
            if (ok) { lastStorageMode = storageMode(); emitStorageChanged(); }
        } else super.onRequestPermissionsResult(req, perms, res);
    }

    @Override
    protected void onResume() {
        super.onResume();
        String m = storageMode();
        if (lastStorageMode == null) { lastStorageMode = m; return; }
        if (!m.equals(lastStorageMode)) { lastStorageMode = m; emitStorageChanged(); }
    }



    /* v2.5.6: pubMirror/pubDir/saveToDownloads/openPath/clipboardWrite
       перенесены во внутренний Bridge — вне Bridge они не экспортировались
       в WebView (причина «B.openPath is not a function» в v2.5.3–2.5.5) */

    /* «file.conf» существует → «file (1).conf», «file (2).conf», … (API 7–9) */
    private static File uniqueFile(File dir, String name) {
        File f = new File(dir, name);
        if (!f.exists()) return f;
        int dot = name.lastIndexOf('.');
        String base = dot > 0 ? name.substring(0, dot) : name;
        String ext = dot > 0 ? name.substring(dot) : "";
        for (int i = 1; i < 1000; i++) {
            File c = new File(dir, base + " (" + i + ")" + ext);
            if (!c.exists()) return c;
        }
        return new File(dir, base + "-" + System.currentTimeMillis() + ext);
    }

    /* documentId папки под /storage/emulated/0 ("primary:Android/data/…", "primary:Download/…");
       null — если папка вне общего хранилища (например своя папка в /data — не бывает на телефонах) */
    private String underExtDocId(String abs) {
        if (!abs.startsWith(EXT_ROOT)) return null;
        String rel = abs.substring(EXT_ROOT.length());
        while (rel.startsWith("/")) rel = rel.substring(1);
        return "primary:" + rel;
    }

    /* Цепочка открытия с гарантированным ответом (v2.5.4 → v2.5.7):
       0) тост «Открываю папку…» — реакция на нажатие видна ВСЕГДА;
       1) СИСТЕМНЫЕ «Файлы» (DocumentsUI) ЯВНО по классу — только для
          ПУБЛИЧНЫХ папок: OEM-проводники перехватывают ACTION_VIEW каталога
          и открывают свой КОРЕНЬ, игнорируя URI («открывает проводник, а не
          нужную папку»); явный setClassName гарантирует навигацию к папке;
       2) обычный ACTION_VIEW каталога — если системных «Файлов» нет;
       3) SAF-выбор каталога, открытый на нужной папке — для Android/data
          (на 11+ «Файлы» показывают его пустым; системный выборщик видит);
       4) путь в буфер обмена + явный тост. */
    private void openDirChain(String docId, String human) {
        toast("Открываю папку: " + human);
        boolean restricted = human.startsWith(EXT_ROOT + "/Android/data/");
        if (docId != null && !restricted) {
            Uri doc = DocumentsContract.buildDocumentUri(
                    "com.android.externalstorage.documents", docId);
            /* v2.5.7: сначала ЯВНО системный DocumentsUI (две сборки под
               разные ROM/AOSP-версии): он честно переходит к папке из URI */
            String[][] sysFiles = {
                    {"com.android.documentsui", "com.android.documentsui.files.FilesActivity"},
                    {"com.android.documentsui", "com.android.documentsui.DocumentsActivity"},
                    {"com.google.android.documentsui", "com.android.documentsui.files.FilesActivity"}
            };
            for (String[] pa : sysFiles) {
                try {
                    Intent i = new Intent(Intent.ACTION_VIEW);
                    i.setClassName(pa[0], pa[1]);
                    i.setDataAndType(doc, "vnd.android.document/directory");
                    i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(i);
                    toast("Папка открыта: " + human);
                    return;
                } catch (Throwable ignored) {}
            }
            try {
                Intent i = new Intent(Intent.ACTION_VIEW);
                i.setDataAndType(doc, "vnd.android.document/directory");
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                startActivity(i);
                toast("Папка открыта: " + human);
                return;
            } catch (Throwable ignored) {}
        }
        if (docId != null) {
            try {
                Uri doc = DocumentsContract.buildDocumentUri(
                        "com.android.externalstorage.documents", docId);
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
                if (Build.VERSION.SDK_INT >= 26)
                    i.putExtra(DocumentsContract.EXTRA_INITIAL_URI, doc);
                startActivity(i);
                toast(restricted
                        ? "Выберите эту папку в открывшемся менеджере: " + human
                        : "Папка показана в выборе файлов: " + human);
                return;
            } catch (Throwable ignored) {}
        }
        try { setClipboard(human); } catch (Throwable ignored) {}
        toast("Файловый менеджер не смог открыть папку. Путь скопирован: " + human);
    }

    /* копирование потока (миграция старых данных; у Bridge свой экземплярный copy) */
    private static void copyStream(InputStream in, OutputStream out) throws Exception {
        byte[] b = new byte[8192];
        int n;
        while ((n = in.read(b)) > 0) out.write(b, 0, n);
    }

    private void toast(String msg) {
        Toast.makeText(this, msg, Toast.LENGTH_LONG).show();
    }

    /* буфер обмена: логика живёт в MainActivity (вызывается openDirChain),
       JS-метод clipboardWrite во внутреннем Bridge делегирует сюда */
    private void setClipboard(String text) {
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
