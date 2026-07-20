#!/bin/sh
# Regenerate the SPA's runtime config from the environment at container start.
# Lets one prebuilt image target any Honcho backend without a rebuild.
#   OPENCONCHO_DEFAULT_HONCHO_URL — absolute URL seeding the first instance, or empty.
#   OPENCONCHO_UPSTREAM_ALLOWLIST — optional comma-separated host globs (SSRF guard).
# Runs from /docker-entrypoint.d before nginx starts. Requires the html dir to
# be writable (default); skip or bind-mount config.js when running --read-only.
set -eu

cat > /usr/share/nginx/html/config.js <<EOF
window.__OPENCONCHO_DEFAULT_HONCHO_URL__ = "${OPENCONCHO_DEFAULT_HONCHO_URL:-}";
EOF

# Derive nginx's resolver from the container's own DNS so the runtime-variable
# proxy_pass resolves on BOTH user-defined networks (Docker embedded DNS at
# 127.0.0.11) and the default bridge (host nameservers from /etc/resolv.conf).
# Hardcoding 127.0.0.11 breaks `docker run` on the default bridge (no embedded DNS).
# IPv6 nameservers (e.g. Fly.io's fdaa::3) must be bracketed, or nginx reads the
# text after the last colon as a port and dies: [emerg] invalid port in resolver.
RESOLVERS=$(awk '/^nameserver/ { print ($2 ~ /:/) ? "[" $2 "]" : $2 }' /etc/resolv.conf | tr '\n' ' ' | sed 's/ *$//')
[ -z "$RESOLVERS" ] && RESOLVERS=127.0.0.11
# No ipv6=off here: IPv6-only upstreams (e.g. Fly.io .flycast) need AAAA answers.
printf 'resolver %s valid=10s;\n' "$RESOLVERS" > /etc/nginx/conf.d/00-resolver.conf

# Render the SSRF allowlist into an nginx map for $allow_upstream.
# Unset/empty OPENCONCHO_UPSTREAM_ALLOWLIST → open (default 1), fine for the
# localhost-bound default. Set it (comma-separated host globs) before exposing
# the proxy (e.g. behind a tunnel) to reject non-matching upstreams.
ALLOWLIST_CONF=/etc/nginx/conf.d/allowlist_map.conf
if [ -z "${OPENCONCHO_UPSTREAM_ALLOWLIST:-}" ]; then
	printf 'map $http_x_honcho_upstream $allow_upstream { default 1; }\n' > "$ALLOWLIST_CONF"
else
	{
		printf 'map $http_x_honcho_upstream $allow_upstream {\n'
		printf '    default 0;\n'
		IFS=','
		for host in $OPENCONCHO_UPSTREAM_ALLOWLIST; do
			host=$(printf '%s' "$host" | tr -d ' ')
			[ -z "$host" ] && continue
			esc=$(printf '%s' "$host" | sed -e 's/[.]/\\./g' -e 's#[*]#[^/]*#g')
			printf '    "~^https?://%s(:[0-9]+)?(/.*)?$" 1;\n' "$esc"
		done
		printf '}\n'
	} > "$ALLOWLIST_CONF"
fi
