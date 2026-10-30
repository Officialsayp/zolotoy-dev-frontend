#!/usr/bin/env bash
# Validate the routing profile locally; no live service or TLS files are used.
set -euo pipefail
repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
command -v nginx >/dev/null
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
python3 - "$repo_root" "$scratch" <<'PY'
from pathlib import Path
import sys
root, scratch = map(Path, sys.argv[1:])
profile = root / 'deploy/nginx'
(scratch / 'router.js').write_bytes((profile / 'zolotoy-routes.js').read_bytes())
(scratch / 'routes.conf').write_text((profile / 'zolotoy-routes.conf').read_text().replace('/etc/nginx/zolotoy-routes.js', str(scratch / 'router.js')))
(scratch / 'nginx.conf').write_text(f'''
load_module /usr/lib/nginx/modules/ngx_http_js_module.so;
load_module /usr/lib/nginx/modules/ngx_http_headers_more_filter_module.so;
pid {scratch}/nginx.pid;
error_log stderr;
events {{}}
http {{
    access_log off;
    include /etc/nginx/mime.types;
    server {{
        listen 127.0.0.1:18080;
        server_name origin.zolotoy.dev;
        root {scratch};
        include {scratch}/routes.conf;
    }}
}}
''')
PY
nginx -t -p "$scratch/" -c "$scratch/nginx.conf"
