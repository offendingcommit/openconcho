#!/usr/bin/env bash
# Hermetic container smoke test for the same-origin /api proxy.
#
# Builds the image, then stands up a stub upstream + the openconcho container on
# a shared Docker network and asserts the proxy forwards correctly. Fully
# self-contained — no external Honcho or tailnet needed. Local-only (requires a
# Docker daemon); not part of PR CI, like the desktop cargo-check preflight.
#
# Idempotent: removes its own containers/network on entry and exit. Exits non-zero
# on any failed assertion.
#
# Usage: make smoke-docker   (or: bash docker/smoke-test.sh)
set -euo pipefail
cd "$(dirname "$0")/.."

IMAGE="openconcho-web:smoke"
NET="oc-smoke-net"
UPSTREAM="oc-smoke-upstream"
APP="oc-smoke-app"
PORT="${SMOKE_PORT:-18080}"
# Echo server: returns request method/path/headers as JSON for any verb.
STUB_IMAGE="mendhak/http-https-echo:31"
FAIL=0

cleanup() {
	docker rm -f "$APP" "$UPSTREAM" >/dev/null 2>&1 || true
	docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup

wait_ready() { # url
	for _ in $(seq 1 30); do
		curl -fsS "$1" >/dev/null 2>&1 && return 0
		sleep 0.5
	done
	echo "  FAIL: container did not become ready at $1"
	FAIL=1
}

check() { # label expected actual
	if [ "$2" = "$3" ]; then echo "  PASS: $1 ($3)"; else echo "  FAIL: $1 — expected $2, got $3"; FAIL=1; fi
}

echo "==> build image"
docker build -t "$IMAGE" . >/dev/null

echo "==> create network + stub upstream"
docker network create "$NET" >/dev/null
docker run -d --name "$UPSTREAM" --network "$NET" -e HTTP_PORT=8080 "$STUB_IMAGE" >/dev/null

echo "==> start openconcho (default-open allowlist)"
docker run -d --name "$APP" --network "$NET" -p "$PORT:8080" \
	-e "OPENCONCHO_DEFAULT_HONCHO_URL=http://$UPSTREAM:8080" "$IMAGE" >/dev/null
wait_ready "http://localhost:$PORT/healthz"

echo "==> assertions"
check "healthz 200" 200 "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/healthz")"
check "SPA served 200" 200 "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/")"
check "config.js injected" 200 "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/config.js")"

# Proxy forwards POST /api/v3/test -> stub, stripping the /api prefix.
body=$(curl -s "http://localhost:$PORT/api/v3/test" \
	-H "X-Honcho-Upstream: http://$UPSTREAM:8080" -H 'content-type: application/json' -X POST -d '{}')
if echo "$body" | grep -q '/v3/test'; then echo "  PASS: /api forwards + strips prefix"; else echo "  FAIL: forward/strip — body: $body"; FAIL=1; fi
# Routing header must NOT leak to the upstream.
if echo "$body" | grep -qi 'x-honcho-upstream'; then echo "  FAIL: X-Honcho-Upstream leaked upstream"; FAIL=1; else echo "  PASS: X-Honcho-Upstream cleared upstream"; fi
# Missing routing header -> 421.
check "missing header 421" 421 "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/api/v3/test" -X POST -d '{}')"

echo "==> restart with a non-matching allowlist"
docker rm -f "$APP" >/dev/null
docker run -d --name "$APP" --network "$NET" -p "$PORT:8080" \
	-e "OPENCONCHO_UPSTREAM_ALLOWLIST=*.honcho.dev" "$IMAGE" >/dev/null
wait_ready "http://localhost:$PORT/healthz"
check "allowlist reject 403" 403 "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/api/v3/test" \
	-H "X-Honcho-Upstream: http://$UPSTREAM:8080" -X POST -d '{}')"
reject=$(curl -s -D- -o /dev/null "http://localhost:$PORT/api/v3/test" \
	-H "X-Honcho-Upstream: http://$UPSTREAM:8080" -X POST -d '{}' | grep -i 'X-Honcho-Proxy-Reject' | tr -d '\r')
if echo "$reject" | grep -qi 'allowlist'; then echo "  PASS: reject sentinel header present"; else echo "  FAIL: missing reject sentinel — got: $reject"; FAIL=1; fi

if [ "$FAIL" = 0 ]; then echo "==> SMOKE TEST PASSED"; else echo "==> SMOKE TEST FAILED"; exit 1; fi
