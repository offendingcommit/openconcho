#!/bin/sh
# Regenerate the SPA's runtime config from the environment at container start.
# Lets one prebuilt image target any Honcho backend without a rebuild.
#   OPENCONCHO_DEFAULT_HONCHO_URL — absolute URL, "same-origin", or empty.
# Runs from /docker-entrypoint.d before nginx starts. Requires the html dir to
# be writable (default); skip or bind-mount config.js when running --read-only.
set -eu

cat > /usr/share/nginx/html/config.js <<EOF
window.__OPENCONCHO_DEFAULT_HONCHO_URL__ = "${OPENCONCHO_DEFAULT_HONCHO_URL:-}";
EOF
