#!/bin/sh
# Regenerate the SPA's runtime config from the environment at container start.
# Lets one prebuilt image target any Honcho backend without a rebuild.
#   OPENCONCHO_DEFAULT_HONCHO_URL — absolute URL seeding the first instance, or empty.
#   OPENCONCHO_UPSTREAM_ALLOWLIST — optional comma-separated host globs (SSRF guard).
#   OPENCONCHO_PORT — nginx listen port; unset/empty → 8080. Decimal 1-65535, no
#     leading zeros. UID 101 cannot bind privileged ports (<1024) unless the host allows it.
# Runs from /docker-entrypoint.d before nginx starts. Writes config.js to /tmp
# so the container works cleanly under a read-only root filesystem.
set -eu

# Validate before any config writes. Do not envsubst the nginx file: that would
# empty runtime variables such as $upstream and $proxy_host.
port="${OPENCONCHO_PORT:-8080}"
case "$port" in
	[1-9]|[1-9][0-9]|[1-9][0-9][0-9]|[1-9][0-9][0-9][0-9]|[1-9][0-9][0-9][0-9][0-9]) ;;
	*)
		echo "openconcho: OPENCONCHO_PORT must be a decimal port 1-65535 with no leading zeros, got '${OPENCONCHO_PORT:-}'" >&2
		exit 1
		;;
esac
if [ "$port" -gt 65535 ]; then
	echo "openconcho: OPENCONCHO_PORT must be a decimal port 1-65535 with no leading zeros, got '${OPENCONCHO_PORT:-}'" >&2
	exit 1
fi

cat > /tmp/openconcho-config.js <<EOF
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

# Render both listen directives from the validated port. 20-envsubst copies the
# template first; this replaces only __OPENCONCHO_PORT__ in the staged file.
NGINX_CONF=/etc/nginx/conf.d/default.conf
if [ ! -f "$NGINX_CONF" ]; then
	echo "openconcho: $NGINX_CONF is missing; cannot set listen port" >&2
	exit 1
fi
sed -i "s/__OPENCONCHO_PORT__/${port}/g" "$NGINX_CONF"
if grep -q '__OPENCONCHO_PORT__' "$NGINX_CONF"; then
	echo "openconcho: failed to render listen port into $NGINX_CONF" >&2
	exit 1
fi
if ! grep -qF "listen       ${port};" "$NGINX_CONF" || ! grep -qF "listen       [::]:${port};" "$NGINX_CONF"; then
	echo "openconcho: listen directives were not updated to ${port}" >&2
	exit 1
fi
