# Platform support

Obitobuff ships prebuilt binaries for every major desktop/server platform and
updates itself automatically from GitHub Releases
([dikaofc/ObitoBuffCLI](https://github.com/dikaofc/ObitoBuffCLI/releases)).

| Platform | Binary target | Recommended install |
| -------- | ------------- | ------------------- |
| Linux x64 (Ubuntu, Debian, Arch, Manjaro, Fedora, CentOS, …) | `linux-x64` (+ `linux-x64-baseline`) | `install.sh` |
| Linux arm64 (Raspberry Pi 4/5, Oracle ARM, Hetzner ARM, …) | `linux-arm64` | `install.sh` |
| macOS Intel | `darwin-x64` | `install.sh` |
| macOS Apple Silicon | `darwin-arm64` | `install.sh` |
| Windows 10/11 (64-bit) | `win32-x64` (+ `win32-x64-baseline`) | PowerShell `npm install -g` or Git Bash / WSL `install.sh` |
| VPS / headless server | `linux-x64` / `linux-arm64` | `install.sh` over SSH |

"Baseline" builds are for pre-2013 CPUs without AVX2; the launcher detects this
automatically and falls back to them, so you never have to pick.

---

## Linux (Debian/Ubuntu, Arch, Fedora, …)

```bash
# One line — requires curl and Node.js ≥ 16
curl -fsSL https://raw.githubusercontent.com/dikaofc/ObitoBuffCLI/main/install.sh | bash

obitobuff          # run inside any project directory
```

No Node.js? Install just the binary (no auto-update):

```bash
curl -fsSL https://raw.githubusercontent.com/dikaofc/ObitoBuffCLI/main/install.sh | INSTALL_MODE=binary bash
```

Binary mode installs to `~/.local/bin` (override with `OBITOBUFF_BIN_DIR`) and
**adds that directory to your PATH automatically** by writing a small marker
block into `~/.bashrc` / `~/.zshrc` / `~/.profile` (whichever exists). It is
idempotent — re-running install.sh updates the path in place instead of
stacking duplicates — and you only need to restart your shell (or
`source ~/.bashrc`) once. Set `OBITOBUFF_NO_PATH=1` to skip PATH editing.

On Arch/Manjaro the only prerequisite is `sudo pacman -S nodejs npm`; the
launcher works identically to other distributions.

## macOS (Intel & Apple Silicon)

```bash
curl -fsSL https://raw.githubusercontent.com/dikaofc/ObitoBuffCLI/main/install.sh | bash
```

The right `darwin-x64` / `darwin-arm64` build is chosen automatically. If the
binary is blocked by Gatekeeper the first time, right-click → Open, or run
`xattr -d com.apple.quarantine ~/.config/obitobuff/obitobuff`.

## Windows 10/11

Three supported ways:

```powershell
# 1. PowerShell (no bash needed)
npm install -g https://github.com/dikaofc/ObitoBuffCLI/releases/download/v0.1.0/obitobuff-launcher-0.1.0.tgz
obitobuff
```

```bash
# 2. Git Bash / MSYS2
curl -fsSL https://raw.githubusercontent.com/dikaofc/ObitoBuffCLI/main/install.sh | bash
```

```bash
# 3. WSL (Windows Subsystem for Linux) — behaves like Linux
curl -fsSL https://raw.githubusercontent.com/dikaofc/ObitoBuffCLI/main/install.sh | bash
```

The `win32-x64-baseline` build exists for older Windows machines; the launcher
picks it automatically after a failed launch if needed.

Git Bash / MSYS2 installs (either mode) handle PATH automatically:
`INSTALL_MODE=binary` appends its install dir to your `~/.bashrc`, and the npm
launcher's global bin is already on PATH. PowerShell users get `obitobuff` on
PATH via npm; to use a raw binary from PowerShell, add the install dir to the
Windows PATH manually (System Settings → Environment Variables).

## VPS / headless servers

Any VPS with SSH works — it is just Linux:

```bash
ssh user@your-vps
curl -fsSL https://raw.githubusercontent.com/dikaofc/ObitoBuffCLI/main/install.sh | bash
cd /srv/my-project
obitobuff
```

- The TUI renders over a normal SSH session; use a terminal with truecolor for
  the best look (Kitty, iTerm2, Windows Terminal, …).
- No Node.js on a minimal VPS? Use `INSTALL_MODE=binary bash` to get the raw
  binary (no auto-update; re-run to upgrade) — it installs to `~/.local/bin`
  and adds that directory to PATH automatically.
- For long-running agent work over flaky SSH, run inside `tmux` or `screen`
  so the session survives disconnects.

---

## First launch & local mode

On first launch the launcher downloads the CLI binary for your platform into
`~/.config/obitobuff/`, then starts the TUI. To run entirely on your own
providers (Ollama, OmniRoute, 9Route, OpenRouter, …) — no account, no
sessions, no ads — drop a config into your project directory:

```bash
cd ~/my-project
cat > obitobuff.config.json <<'EOF'
{
  "defaultModel": "oc/deepseek-v4-flash-free",
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "sk-...",
      "models": [{ "id": "oc/deepseek-v4-flash-free" }]
    }
  }
}
EOF
obitobuff
```

See the [root README](../README.md) for the full config reference and
`/model` / `--model` usage.

## Auto-update

The launcher checks GitHub Releases on every launch and swaps in the newest
binary in the background — you don't do anything. To point at a different
fork instead of `dikaofc/ObitoBuffCLI`, set `OBITOBUFF_UPDATE_REPO`:

```bash
OBITOBUFF_UPDATE_REPO=you/your-fork obitobuff
```

## Publishing a release (for maintainers)

Push a version tag and the `Release Obitobuff CLI` workflow builds all 7
binary targets, packages the launcher, and publishes the GitHub release:

```bash
git push origin main
git tag v0.2.0 && git push origin v0.2.0
```

You can also trigger it manually from the **Actions** tab by entering a
version. Installed launchers update automatically within one launch.
