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

# --- Android / Termux -------------------------------------------------------
# Bun-compiled binaries target glibc Linux and cannot run on Termux's native
# bionic userspace. The supported Android path is a Linux distro inside
# proot-distro (or any chroot/VM), where the standard install works as-is.
if [ -n "${TERMUX_VERSION:-}" ] || [ -n "${PREFIX:-}" ] || [ -d /data/data/com.termux ]; then
  cat <<'EOF'
📱 Android/Termux detected.

Obitobuff's prebuilt binaries need a glibc Linux environment, so on Termux
install a Linux distro first (gives you a real arm64 Linux userspace):

    pkg update && pkg upgrade
    pkg install proot-distro
    proot-distro install ubuntu
    proot-distro login ubuntu

Then, inside the distro:

    apt update && apt install -y curl nodejs npm
    curl -fsSL https://raw.githubusercontent.com/dikaofc/ObitoBuffCLI/main/install.sh | bash
    obitobuff

EOF
  exit 1
fi

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
  TAG="$(
    curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" |
      grep -o '"tag_name": *"[^"]*"' | head -1 | sed 's/.*"tag_name": *"//; s/"$//'
  )"
  [ -n "$TAG" ] || { echo "❌ Could not determine the latest release." >&2; exit 1; }
  VERSION="${TAG#v}"
else
  VERSION="${VERSION#v}"
  TAG="v$VERSION"
fi

BINARY_URL="https://github.com/$REPO/releases/download/$TAG/obitobuff-$TARGET.tar.gz"

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
npm install -g "$LAUNCHER_URL"

echo ""
echo "✅ Obitobuff $VERSION installed."
echo "   Run 'obitobuff' to start — the CLI binary is downloaded on first launch"
echo "   and auto-updates from GitHub releases on every launch."
echo ""
echo "   Windows note: the same command works from PowerShell or Git Bash."
echo "   Android note: use Termux + proot-distro (see docs/platforms.md)."
