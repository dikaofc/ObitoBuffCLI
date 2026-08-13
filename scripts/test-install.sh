#!/usr/bin/env bash
# No-network smoke test for install.sh platform detection and release URLs.
#
# Runs install.sh in INSTALL_MODE=binary with shimmed uname/curl/tar so
# nothing touches the network, then asserts the right release asset is
# requested for each supported platform (Linux x64/arm64, Windows, macOS)
# and that unsupported platforms fail cleanly.
#
# Usage:
#   bash scripts/test-install.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_SH="$REPO_ROOT/install.sh"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# --- Shims ----------------------------------------------------------------
mkdir -p "$tmp/bin"

cat > "$tmp/bin/uname" <<'EOF'
#!/usr/bin/env bash
case "$1" in
  -s) printf '%s\n' "${FAKE_UNAME_S:-Linux}" ;;
  -m) printf '%s\n' "${FAKE_UNAME_M:-x86_64}" ;;
  *) exit 1 ;;
esac
EOF
chmod +x "$tmp/bin/uname"

# install.sh calls: curl -fsSL <url> | tar -xz -C <dir>
cat > "$tmp/bin/curl" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "${2:-}" > "$CURL_URL_LOG"
touch "$FAKE_TARBALL"
EOF
chmod +x "$tmp/bin/curl"

cat > "$tmp/bin/tar" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$tmp/bin/tar"

# Launcher mode runs `npm install -g <tgz>`. Capture the args so the test can
# assert the allow-remote flag is present (npm 12+ refuses remote tarballs
# without it) and the launcher asset URL is used.
cat > "$tmp/bin/npm" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" > "$NPM_ARGS_LOG"
EOF
chmod +x "$tmp/bin/npm"

export PATH="$tmp/bin:$PATH"
export CURL_URL_LOG="$tmp/curl-url.log"
export FAKE_TARBALL="$tmp/fake.tar.gz"
export NPM_ARGS_LOG="$tmp/npm-args.log"
export BIN_DIR="$tmp/out"
# install.sh reads OBITOBUFF_BIN_DIR (BIN_DIR above is only used by the path
# tests below). Pinning it keeps installs inside the sandbox instead of
# creating ~/.local/bin in the real home.
export OBITOBUFF_BIN_DIR="$tmp/out"
export VERSION="0.1.0"
export INSTALL_MODE="binary"
# Platform checks must not touch the real shell rc files; the PATH behavior is
# exercised separately below with a sandboxed HOME.
export OBITOBUFF_NO_PATH=1

failures=0

check_target() {
  local label="$1" uname_s="$2" uname_m="$3" expected_url_suffix="$4"
  rm -f "$CURL_URL_LOG"
  if ! FAKE_UNAME_S="$uname_s" FAKE_UNAME_M="$uname_m" bash "$INSTALL_SH" >/dev/null 2>&1; then
    echo "FAIL $label: install.sh exited non-zero"
    failures=$((failures + 1))
    return
  fi
  local url
  url="$(cat "$CURL_URL_LOG" 2>/dev/null || true)"
  case "$url" in
    *"$expected_url_suffix")
      echo "PASS $label -> ${url##*/}"
      ;;
    *)
      echo "FAIL $label: expected asset *$expected_url_suffix, got: $url"
      failures=$((failures + 1))
      ;;
  esac
}

check_rejected() {
  local label="$1" uname_s="$2" uname_m="$3"
  if FAKE_UNAME_S="$uname_s" FAKE_UNAME_M="$uname_m" bash "$INSTALL_SH" >/dev/null 2>&1; then
    echo "FAIL $label: install.sh unexpectedly succeeded"
    failures=$((failures + 1))
  else
    echo "PASS $label -> rejected"
  fi
}

# --- Supported platforms --------------------------------------------------
check_target "linux-x64"        "Linux"          "x86_64"  "obitobuff-linux-x64.tar.gz"
check_target "linux-arm64"      "Linux"          "aarch64" "obitobuff-linux-arm64.tar.gz"
check_target "windows (MINGW)"  "MINGW64_NT-10.0" "x86_64" "obitobuff-win32-x64.tar.gz"
check_target "macos-intel"      "Darwin"         "x86_64"  "obitobuff-darwin-x64.tar.gz"
check_target "macos-arm64"      "Darwin"         "arm64"   "obitobuff-darwin-arm64.tar.gz"

# --- Unsupported platforms -------------------------------------------------
check_rejected "32-bit linux"   "Linux"          "i686"

# --- Launcher mode (shimmed npm, no network) ------------------------------
check_launcher() {
  local label="$1"
  rm -f "$NPM_ARGS_LOG"
  if ! INSTALL_MODE="launcher" FAKE_UNAME_S="Linux" FAKE_UNAME_M="x86_64" \
    bash "$INSTALL_SH" >/dev/null 2>&1; then
    echo "FAIL $label: install.sh exited non-zero"
    failures=$((failures + 1))
    return
  fi
  local args
  args="$(cat "$NPM_ARGS_LOG" 2>/dev/null || true)"
  case "$args" in
    *"--allow-remote=all"*"obitobuff-launcher-0.1.0.tgz"*)
      echo "PASS $label -> $args"
      ;;
    *)
      echo "FAIL $label: expected --allow-remote=all and launcher tgz, got: $args"
      failures=$((failures + 1))
      ;;
  esac
}

check_launcher "launcher-mode"

# --- PATH injection (sandboxed HOME, no network) --------------------------
check_path_added() {
  local home="$tmp/path-home"
  mkdir -p "$home"
  : > "$home/.bashrc"
  rm -f "$CURL_URL_LOG"
  if ! env -u OBITOBUFF_NO_PATH HOME="$home" FAKE_UNAME_S="Linux" FAKE_UNAME_M="x86_64" \
    bash "$INSTALL_SH" >/dev/null 2>&1; then
    echo "FAIL path-injection: install.sh exited non-zero"
    failures=$((failures + 1))
    return
  fi
  if grep -q "export PATH=\"$BIN_DIR" "$home/.bashrc"; then
    echo "PASS path-injection -> $BIN_DIR added to sandboxed ~/.bashrc"
  else
    echo "FAIL path-injection: export line missing from sandboxed ~/.bashrc"
    failures=$((failures + 1))
  fi
}

check_path_idempotent() {
  local home="$tmp/path-home-2"
  mkdir -p "$home"
  : > "$home/.bashrc"
  env -u OBITOBUFF_NO_PATH HOME="$home" FAKE_UNAME_S="Linux" FAKE_UNAME_M="x86_64" \
    bash "$INSTALL_SH" >/dev/null 2>&1
  env -u OBITOBUFF_NO_PATH HOME="$home" FAKE_UNAME_S="Linux" FAKE_UNAME_M="x86_64" \
    bash "$INSTALL_SH" >/dev/null 2>&1
  local count
  count="$(grep -c 'export PATH=' "$home/.bashrc" || true)"
  if [ "$count" -eq 1 ]; then
    echo "PASS path-idempotent -> reinstall keeps exactly one export line"
  else
    echo "FAIL path-idempotent: expected 1 export line, found $count"
    failures=$((failures + 1))
  fi
}

check_path_added
check_path_idempotent

if [ "$failures" -gt 0 ]; then
  echo ""
  echo "$failures check(s) failed"
  exit 1
fi
echo ""
echo "All install.sh platform checks passed"
