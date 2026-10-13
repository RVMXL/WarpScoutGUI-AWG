#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v2.6.2 (аудит QUAL-1): проверка целостности i18n по идентификаторам.

Проверяет (exit 1 при любом промахе):
  1. Словарь I18N в js/wsg/03-i18n.js: id уникальны, ru/en непустые.
  2. Каждый вызов t("...")/tF("...") во всех wsg/*.js использует существующий id.
  3. Статика resources/index.html (текстовые узлы и placeholder/title/aria-label
     с кириллицей) полностью покрывается словарём с учётом платформенной
     нормализации platKey/platNorm — как REV-таблица в рантайме.
     Узлы под [data-i18n="off"] и динамические контейнеры (SKIP) не проверяются.
  4. LINUX_TEXT/MAC_TEXT (01-platform.js): канонические фразы есть в словаре,
     mac-варианты сцеплены с linux-вариантами.

Запуск: python3 desktop-app/tools/check-i18n.py   (из любой точки; пути — от файла)
"""
import re, sys, os
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(HERE, '..', 'resources')
WSG = os.path.join(RES, 'js', 'wsg')

def read(p): return open(p, encoding='utf-8').read()

fail = 0
def err(msg):
    global fail
    fail += 1
    print('  FAIL:', msg)

def js_unescape(raw):
    """JS-литерал (RAW с escape) -> реальное значение: \\\\ -> \\\\, \\" -> ", \\n -> LF."""
    out = []
    i = 0
    while i < len(raw):
        c = raw[i]
        if c == '\\' and i + 1 < len(raw):
            n = raw[i + 1]
            if n == 'n': out.append('\n'); i += 2; continue
            if n == 't': out.append('\t'); i += 2; continue
            if n == '\\': out.append('\\'); i += 2; continue
            if n == '"': out.append('"'); i += 2; continue
            if n == "'": out.append("'"); i += 2; continue
            out.append(c); i += 1; continue
        out.append(c); i += 1
    return ''.join(out)

# ── платформенная нормализация (повторение platNorm/platKey из 01-platform.js)
plat_src = read(os.path.join(WSG, '01-platform.js'))
mlinux = re.search(r'const LINUX_TEXT = \[(.*?)\n  \];', plat_src, re.S)
mmac = re.search(r'const MAC_TEXT = \[(.*?)\n  \];', plat_src, re.S)
row_re = re.compile(r'\[\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\]')
LINUX_TEXT = [(js_unescape(a), js_unescape(b), js_unescape(c))
              for a, b, c in (row_re.findall(mlinux.group(1)) if mlinux else [])]
MAC_TEXT = [(js_unescape(a), js_unescape(b), js_unescape(c))
            for a, b, c in (row_re.findall(mmac.group(1)) if mmac else [])]
LINUX_KEY_MAP = {r[0]: r[1] for r in LINUX_TEXT}

UNIX_DATA_DIR = "~/.local/share/WARPScoutGUI"

def plat_norm(s):
    return (s.replace('warpscout.exe', 'warpscout')
             .replace('WARPScoutGUI.exe', 'WARPScoutGUI')
             .replace('bin\\warpscout', 'bin/warpscout')
             .replace('%APPDATA%\\WARPScoutGUI', UNIX_DATA_DIR)
             .replace(' (EBWebView)', ''))

def plat_key(s):
    if s in LINUX_KEY_MAP: return LINUX_KEY_MAP[s]
    return plat_norm(s)

# ── 1. словарь ─────────────────────────────────────────────────────────────
i18n_src = read(os.path.join(WSG, '03-i18n.js'))
m0 = re.search(r'const I18N = \{', i18n_src)
if not m0:
    err('словарь I18N не найден в 03-i18n.js'); sys.exit(1)
start = m0.end(); depth = 1; i = start
while depth > 0:
    c = i18n_src[i]
    if c == '{': depth += 1
    elif c == '}':
        depth -= 1
        if depth == 0: break
    i += 1
block = i18n_src[start:i]

entry_re = re.compile(
    r'"((?:[^"\\]|\\.)*)"\s*:\s*\{\s*ru:\s*"((?:[^"\\]|\\.)*)"\s*,\s*en:\s*"((?:[^"\\]|\\.)*)"\s*\}')
I18N = {}
for m in entry_re.finditer(block):
    sid, ru, en = m.group(1), js_unescape(m.group(2)), js_unescape(m.group(3))
    if sid in I18N: err(f'дублирующийся id: {sid}')
    if not ru.strip(): err(f'пустой ru у {sid}')
    if not en.strip(): err(f'пустой en у {sid}')
    I18N[sid] = {'ru': ru, 'en': en}
print(f'dict entries: {len(I18N)}')

# набор RU-«ключей», по которым REV-таблица резолвит статику
rev_keys = set()
for sid, e in I18N.items():
    rev_keys.add(e['ru'])
    rev_keys.add(plat_key(e['ru']))
    rev_keys.add(plat_norm(e['ru']))

# ── 2. вызовы t()/tF() ─────────────────────────────────────────────────────
call_re = re.compile(r'\btF?\(\s*"((?:[^"\\]|\\.)*)"')
ternary_re = re.compile(r'\btF?\(\s*[a-zA-Z$_.()]+\s*\?\s*"((?:[^"\\]|\\.)*)"\s*:')
bad_calls = 0
for fname in sorted(os.listdir(WSG)):
    if not fname.endswith('.js'): continue
    text = read(os.path.join(WSG, fname))
    for m in call_re.finditer(text):
        arg = m.group(1)
        if arg not in I18N:
            err(f'{fname}: t("{arg[:80]}") — id нет в словаре')
            bad_calls += 1
    for m in ternary_re.finditer(text):   # v2.6.2: тернарники внутри t()
        arg = m.group(1)
        if arg not in I18N:
            err(f'{fname}: t(...? "{arg[:70]}") — RU-текст вместо id')
            bad_calls += 1
if bad_calls == 0:
    print('t()/tF() calls resolved: OK')

# ── 3. статика index.html ──────────────────────────────────────────────────
SKIP_IDS = set("""resultsBody resultsHead resultsEmpty historyPanel resStats resFilterMeta presetHint
customPresetChips confPreview scanLog accLog socksLog toolsLog toasts stWs stAcc accFileState
accFilePath accMainState accMasqueState accOuterState btnRunScanLabel scanPhase resCount
cfgFileName cfgVerHint cfgKeysState socksAddr setWsVerHint foundCmdBadge qrBox cfgEndpointSel
btnHistory btnTheme kbdTable presetName udfState dataRootHint setDataRoot scanLivePhase homeScanRow homeResRow homeConfBox homePubBox
scanLiveElapsed scanLiveMeta scanLiveNodes scanLiveDot qrPageLabel""".split())

class Collector(HTMLParser):
    def __init__(self, want_attrs):
        super().__init__(convert_charrefs=True)
        self.want_attrs = want_attrs
        self.stack = []
        self.in_script = 0
        self.texts = []
        self.attrs = []
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'): self.in_script += 1
        self.stack.append((tag, dict(attrs)))
        if self.in_script: return
        if not self.want_attrs: return
        for a, v in attrs:
            if a in ('placeholder', 'title', 'aria-label') and v and re.search(r'[а-яё]', v, re.I):
                if any(x.get('id') in SKIP_IDS for _, x in self.stack): continue
                if any(x.get('data-i18n') == 'off' for _, x in self.stack): continue
                self.attrs.append(v.strip())
    def handle_endtag(self, tag):
        if tag in ('script', 'style') and self.in_script > 0: self.in_script -= 1
        if self.stack: self.stack.pop()
    def handle_data(self, data):
        if self.in_script or not data or not data.strip(): return
        if not re.search(r'[а-яё]', data, re.I): return
        if any(x.get('id') in SKIP_IDS for _, x in self.stack): return
        if any(x.get('data-i18n') == 'off' for _, x in self.stack): return
        self.texts.append(data.strip())
    def handle_startendtag(self, tag, attrs):
        # <input .../> и прочие self-closing: атрибуты проверить и НЕ оставлять в стеке
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

html = read(os.path.join(RES, 'index.html'))
col = Collector(False); col.feed(html)
ac = Collector(True); ac.feed(html)
miss_t = [t for t in col.texts
          if t not in rev_keys and plat_key(t) not in rev_keys and plat_norm(t) not in rev_keys]
for t in miss_t[:15]:
    err(f'index.html текст без словарной записи: "{t[:90]}"')
if len(miss_t) > 15: err(f'… и ещё {len(miss_t)-15} текстовых узлов')
miss_a = [a for a in ac.attrs
          if a not in rev_keys and plat_key(a) not in rev_keys and plat_norm(a) not in rev_keys]
for a in miss_a[:15]:
    err(f'index.html атрибут без словарной записи: "{a[:90]}"')
if len(miss_a) > 15: err(f'… и ещё {len(miss_a)-15} атрибутов')
print(f'static texts checked: {len(col.texts)}, attrs: {len(ac.attrs)}, misses: {len(miss_t)+len(miss_a)}')

# ── 4. платформенные фразы ─────────────────────────────────────────────────
ru_vals = {e['ru'] for e in I18N.values()}
for canon, lru, _len in LINUX_TEXT:
    if canon not in ru_vals:
        err(f'LINUX_TEXT: каноническая фраза не в словаре: "{canon[:80]}"')
for lru, mru, _men in MAC_TEXT:
    if not any(lrow[1] == lru for lrow in LINUX_TEXT):
        err(f'MAC_TEXT: linux-фраза не соответствует ни одной LINUX_TEXT row[1]: "{lru[:80]}"')

if fail:
    print(f'check-i18n: {fail} problem(s)')
    sys.exit(1)
print('check-i18n: OK')
