import re, sys, difflib
eng = open(__import__('os').path.join(__import__('os').path.dirname(__file__),'../engines/detail-engine.js')).read()
def norm(js):
    js = re.sub(r'this\.FIT = \[.*?\];', 'FIT', js, flags=re.S)
    js = re.sub(r'themeVals\(v\) \{.*?\n  \}\n\n  renderVals', 'THEME\n\n  renderVals', js, flags=re.S)
    js = re.sub(r'  // ---- Direction-specific.*?\n', '', js)
    return js.strip()
base = norm(eng)
for f in sys.argv[1:]:
    src = open(f).read()
    m = re.search(r'<script type="text/x-dc" data-dc-script[^>]*>(.*?)</script>', src, re.S)
    js = norm(m.group(1))
    diff = [l for l in difflib.unified_diff(base.splitlines(), js.splitlines(), lineterm='', n=0) if not l.startswith(('---','+++'))]
    print(f, 'ENGINE IDENTICAL' if not diff else 'DIFF:\n' + '\n'.join(diff[:40]))
    # quick lint
    body = src.split('<script type="text/x-dc"')[0]
    holes = set(re.findall(r'\{\{\s*([^}]*?)\s*\}\}', body))
    bad = [h for h in holes if not re.fullmatch(r'[A-Za-z_$][\w$]*(\.[\w$]+)*|true|false|\d+', h)]
    print('  non-dotted holes:', bad)
    print('  emoji:', bool(re.search('[\U0001F300-\U0001FAFF☀-➿]', body)), ' role=:', 'role=' in body, ' data: URI:', 'data:' in body, ' http(s) refs:', sorted(set(re.findall(r'https?://[^"\')\s]+', body)))[:5])
