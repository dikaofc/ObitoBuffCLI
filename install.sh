#!/usr/bin/env bash
# Install Obitobuff CLI from GitHub Releases (dikaofc/ObitoBuffCLI).
#
# Default mode installs the launcher (a small npm package) which downloads the
# compiled CLI binary on first launch and checks GitHub Releases for updates on
# every launch — swapping in new versions automatically.
#
#   INSTALL_MODE=binary   → download just the CLI binary (no auto-update);
#                           for systems without Node.js (e.g. minimal VPS).
#   OBITOBUFF_UPDATE_REPO → point the launcher at a different fork.
#   VERSION=0.1.0         → pin a specific version instead of latest.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/dikaofc/ObitoBuffCLI/main/install.sh | bash
set -euo pipefail

REPO="${OBITOBUFF_UPDATE_REPO:-dikaofc/ObitoBuffCLI}"
VERSION="${VERSION:-latest}"
MODE="${INSTALL_MODE:-launcher}"

# --- Platform detection -----------------------------------------------------
case "$(uname -s)-$(uname -m)" in
  Linux-x86_64)          TARGET="linux-x64" ;;
  Linux-aarch64|Linux-arm64) TARGET="linux-arm64" ;;
  Linux-i686|Linux-i386) echo "❌ 32-bit Linux is not supported." >&2; exit 1 ;;
  Darwin-x86_64)         TARGET="darwin-x64" ;;
  Darwin-arm64)          TARGET="darwin-arm64" ;;
  MINGW*|MSYS*|CYGWIN*)  TARGET="win32-x64" ;;
  *)
    echo "❌ Unsupported platform: $(uname -s) $(uname -m)" >&2
    echo "   Supported: Linux (x64/arm64), macOS (Intel/Apple Silicon), Windows 10/11 (64-bit)." >&2
    exit 1
    ;;
esac

# --- Resolve version --------------------------------------------------------
if [ "$VERSION" = "latest" ]; then
  echo "Resolving latest release from $REPO..."
  # Follow the /releases/latest redirect and read the tag from the final URL.
  # Unlike the GitHub API this has no per-IP rate limit — the API returns 403
  # once 60 unauthenticated requests/hour are exhausted (common on shared or
  # public IPs), which broke installs.
  TAG="$(
    curl -fsSL -o /dev/null -w '%{url_effective}' \
      "https://github.com/$REPO/releases/latest" |
      sed -E 's|.*/tag/(v?[^/?]+)/?$|\1|'
  )"
  [ -n "$TAG" ] || { echo "❌ Could not determine the latest release." >&2; exit 1; }
  VERSION="${TAG#v}"
else
  VERSION="${VERSION#v}"
  TAG="v$VERSION"
fi

BINARY_URL="https://github.com/$REPO/releases/download/$TAG/obitobuff-$TARGET.tar.gz"

# --- PATH management --------------------------------------------------------
# Add a directory to PATH by writing an idempotent marker block into the
# user's shell rc files (works on Linux, macOS, VPS, and Windows Git Bash /
# MSYS2 / Cygwin). Re-running install.sh rewrites the path inside the existing
# block, so moving BIN_DIR later (or upgrading) updates it instead of stacking
# duplicates. Set OBITOBUFF_NO_PATH=1 to skip this entirely.

add_path_entry() {
  local bin_dir="$1" rc_file="$2" head="# >>> obitobuff >>>" tail="# <<< obitobuff <<<"
  if [ -f "$rc_file" ] && grep -qF "$head" "$rc_file"; then
    sed -i.bak "/$head/,/$tail/ s|^export PATH=.*|export PATH=\"$bin_dir:\$PATH\"|" "$rc_file"
    rm -f "$rc_file.bak"
  else
    printf '\n%s\n# Add Obitobuff CLI to PATH (managed by install.sh)\nexport PATH="%s:$PATH"\n%s\n' "$head" "$bin_dir" "$tail" >> "$rc_file"
  fi
}

add_bin_dir_to_path() {
  local bin_dir="$1"
  if [ -n "${OBITOBUFF_NO_PATH:-}" ]; then
    echo "   ℹ️  PATH not modified (OBITOBUFF_NO_PATH is set)."
    return 0
  fi
  if [ -z "$HOME" ]; then
    echo "   ℹ️  \$HOME is empty; could not add to PATH. Add $bin_dir to your PATH manually."
    return 0
  fi
  case ":$PATH:" in
    *":$bin_dir:"*)
      echo "   ✓ $bin_dir is already on PATH."
      return 0
      ;;
  esac

  local rc_files=() f
  for f in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.profile" "$HOME/.bash_profile"; do
    [ -f "$f" ] && rc_files+=("$f")
  done
  if [ "${#rc_files[@]}" -eq 0 ]; then
    case "${SHELL##*/}" in
      zsh) rc_files+=("$HOME/.zshrc") ;;
      *)   rc_files+=("$HOME/.bashrc") ;;
    esac
  fi

  for f in "${rc_files[@]}"; do
    add_path_entry "$bin_dir" "$f"
    echo "   ➕ Added $bin_dir to PATH in $f"
  done
  echo "   Restart your shell (or run 'source ~/.bashrc') to use 'obitobuff'."
}

# --- Binary-only mode (no Node.js required, no auto-update) -----------------
if [ "$MODE" = "binary" ]; then
  command -v curl >/dev/null 2>&1 || { echo "❌ curl is required." >&2; exit 1; }
  command -v tar >/dev/null 2>&1 || { echo "❌ tar is required." >&2; exit 1; }
  BIN_DIR="${OBITOBUFF_BIN_DIR:-$HOME/.local/bin}"
  mkdir -p "$BIN_DIR"
  case "$TARGET" in
    win32-*) BIN_NAME="obitobuff.exe" ;;
    *) BIN_NAME="obitobuff" ;;
  esac
  echo "Downloading obitobuff $VERSION ($TARGET)..."
  curl -fsSL "$BINARY_URL" | tar -xz -C "$BIN_DIR"
  [ "$BIN_NAME" = "obitobuff" ] && chmod +x "$BIN_DIR/$BIN_NAME" 2>/dev/null || true
  echo ""
  echo "✅ Obitobuff $VERSION installed to $BIN_DIR/$BIN_NAME (binary only)."
  add_bin_dir_to_path "$BIN_DIR"
  echo "   Run '$BIN_NAME' to start. This install does not auto-update —"
  echo "   re-run this script to upgrade, or use INSTALL_MODE=launcher for"
  echo "   automatic updates (requires Node.js ≥ 16)."
  exit 0
fi

# --- Launcher mode (default) ------------------------------------------------
command -v npm >/dev/null 2>&1 || {
  echo "❌ npm is required to install the Obitobuff launcher." >&2
  echo "" >&2
  echo "   Install Node.js first, then re-run:" >&2
  echo "     - Debian/Ubuntu:      sudo apt install -y nodejs npm" >&2
  echo "     - Arch/Manjaro:       sudo pacman -S nodejs npm" >&2
  echo "     - Fedora:             sudo dnf install -y nodejs npm" >&2
  echo "     - macOS:              brew install node" >&2
  echo "     - Windows (WSL/Git Bash): https://nodejs.org" >&2
  echo "" >&2
  echo "   Or install just the binary (no auto-update): INSTALL_MODE=binary $0" >&2
  exit 1
}

LAUNCHER_URL="https://github.com/$REPO/releases/download/$TAG/obitobuff-launcher-$VERSION.tgz"

echo "Installing Obitobuff launcher $VERSION..."
# npm 12+ refuses to fetch remote tarballs unless allow-remote is enabled
# (EALLOWREMOTE); --allow-remote=all restores that for this install and is
# silently ignored by older npm versions.
npm install -g --allow-remote=all "$LAUNCHER_URL"

echo ""
echo "✅ Obitobuff $VERSION installed."
echo "   Run 'obitobuff' to start — the CLI binary is downloaded on first launch"
echo "   and auto-updates from GitHub releases on every launch."
echo ""
echo "   Windows note: the same command works from PowerShell or Git Bash."
