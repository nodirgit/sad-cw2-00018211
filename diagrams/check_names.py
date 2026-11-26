"""Checks that every class and member on the detailed diagrams exists in prototype/src with the same name.

Run from D:\\SAD_CW2:  python diagrams/check_names.py
For each class box in detail-a.puml / detail-b.puml it finds the class's source file and checks each
property (name + type) and method (name + parameter names + return type) appears there.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'prototype' / 'src'
FILES = {p.stem: p for p in SRC.rglob('*.ts')}
# classes defined inside another file
FILES.update({'BatchStatus': SRC / 'domain/farm/BatchStatus.ts', 'BuyerGroup': SRC / 'domain/partners/Buyer.ts',
              'CrossCheckStatus': SRC / 'domain/slaughter/WeightTally.ts', 'SessionKind': SRC / 'domain/slaughter/SlaughterSession.ts'})

def norm_type(t: str) -> list[str]:
    """Diagram type -> words that must appear in the code (e.g. 'House [0..1]' -> ['House'])."""
    t = re.sub(r'\[0\.\.1\]|\[\*\]', '', t).strip()
    return [w for w in re.findall(r'[A-Za-z_]+', t) if w not in ('T',)]

problems = []
for puml in ['detail-a.puml', 'detail-b.puml']:
    text = (ROOT / 'diagrams' / puml).read_text(encoding='utf-8')
    for m in re.finditer(r'^(?:abstract class|class|enum|interface)\s+(?:"([^"]+)"\s+as\s+)?(\w+)[^{\n]*\{(.*?)^\}', text, re.S | re.M):
        name = m.group(2)
        body = m.group(3)
        src_name = 'Repository' if name == 'Repository' else name
        f = FILES.get(src_name)
        if not f:
            problems.append(f'{puml}: no source file for class {name}')
            continue
        code = f.read_text(encoding='utf-8')
        if not re.search(rf'\b(class|enum|interface)\s+{name}\b', code):
            problems.append(f'{puml}: class {name} not declared in {f.name}')
        for line in body.strip().splitlines():
            line = line.strip()
            if not line:
                continue
            line = re.sub(r'\{(abstract|static)\}\s*', '', line)
            mm = re.match(r'([+\-#~])?\s*(\w+)\s*(\((.*?)\))?\s*(?::\s*(.*?))?(\s*=\s*\S+)?$', line)
            if not mm:
                problems.append(f'{puml} {name}: cannot read "{line}"')
                continue
            vis, member, _, params, rtype, _ = mm.groups()
            if vis is None:  # enum literal
                if not re.search(rf'\b{member}\b', code):
                    problems.append(f'{puml} {name}: enum value {member} missing')
                continue
            if params is not None:  # method
                # the declaration line, not a call or a comment
                pat = rf'^\s*(?:(?:private|protected|public|static|abstract|readonly)\s+)*{member}\s*\('
                decl = re.search(pat, code, re.M)
                if not decl:
                    problems.append(f'{puml} {name}: method {member}() missing')
                    continue
                sig = re.split(r'\)\s*(?::\s*[^{;]*)?[{;]', code[decl.start():], maxsplit=1)[0]
                sig = code[decl.start():decl.start() + len(sig) + 200].split('{')[0].split(';')[0]
                for p in [x.split(':')[0].strip() for x in params.split(',') if x.strip()]:
                    if not re.search(rf'\b{p}\b', sig):
                        problems.append(f'{puml} {name}.{member}: parameter {p} missing')
                for w in norm_type(rtype or ''):
                    if not re.search(rf'\b{w}\b', sig):
                        problems.append(f'{puml} {name}.{member}: return type {w} not in "{sig.strip()[:80]}"')
            else:  # property
                fm = re.search(rf'\b{member}\??\s*[:=]', code)
                if not fm:
                    problems.append(f'{puml} {name}: property {member} missing')
                    continue
                decl = code[fm.start():code.index('\n', fm.start())]
                for w in norm_type(rtype or ''):
                    if w in ('number',) and '=' in decl:
                        continue
                    if not re.search(rf'\b{w}\b', decl):
                        problems.append(f'{puml} {name}.{member}: type {w} not in "{decl.strip()}"')

print('\n'.join(problems) if problems else 'OK: every class and member on the detailed diagrams is in prototype/src')
sys.exit(1 if problems else 0)
