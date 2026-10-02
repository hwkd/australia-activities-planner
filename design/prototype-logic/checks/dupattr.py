import re, sys
for f in sys.argv[1:]:
    body = open(f).read().split('<script type="text/x-dc"')[0]
    n = 0
    for m in re.finditer(r'<([a-zA-Z][\w-]*)((?:\s+[^\s=>]+(?:="[^"]*")?)*)\s*/?>', body):
        names = re.findall(r'\s([^\s=>]+)(?:="[^"]*")?', m.group(2))
        dup = {x for x in names if names.count(x) > 1}
        if dup:
            n += 1
            line = body[:m.start()].count('\n') + 1
            if n <= 6: print(f"{f}:{line} dup {dup}")
    print(f, 'duplicate-attr tags:', n)
