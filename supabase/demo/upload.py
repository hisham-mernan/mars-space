# Upload the generated demo images into Supabase Storage.
#
# Reads the service-role key from .env.local and never prints it. The key is
# required because these writes land in other people's folders — the bucket
# policies deliberately restrict authenticated users to their own.

import io, os, sys, urllib.request

ENV = r"C:/Users/hisha/OneDrive/Desktop/mars space/.env.local"
cfg = {}
for line in io.open(ENV, encoding='utf-8'):
    line = line.strip()
    if not line or line.startswith('#') or '=' not in line:
        continue
    k, v = line.split('=', 1)
    cfg[k.strip()] = v.strip().strip('"').strip("'")

URL = cfg.get('NEXT_PUBLIC_SUPABASE_URL', '').rstrip('/')
KEY = cfg.get('SUPABASE_SERVICE_ROLE_KEY', '')
if not URL or not KEY:
    missing = [k for k in ('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY')
               if not cfg.get(k)]
    print('missing config keys:', missing)
    sys.exit(1)
print('project:', URL)

HERE = os.path.dirname(os.path.abspath(__file__))
SEP = os.sep


def upload(bucket, path, local):
    data = io.open(local, 'rb').read()
    req = urllib.request.Request(
        URL + '/storage/v1/object/' + bucket + '/' + path,
        data=data, method='POST',
        headers={'Authorization': 'Bearer ' + KEY, 'apikey': KEY,
                 'Content-Type': 'image/png', 'x-upsert': 'true'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.status


ok = 0
fail = 0
errors = []
for bucket in ('company-logos', 'avatars'):
    root = os.path.join(HERE, 'upload', bucket)
    for dirpath, _, files in os.walk(root):
        for fn in files:
            local = os.path.join(dirpath, fn)
            rel = os.path.relpath(local, root).replace(SEP, '/')
            try:
                upload(bucket, rel, local)
                ok += 1
            except Exception as e:
                fail += 1
                if len(errors) < 4:
                    errors.append(bucket + '/' + rel + ': ' + str(e))

print('uploaded', ok, 'failed', fail)
for e in errors:
    print('  ', e)
