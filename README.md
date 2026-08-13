# Obitobuff

**Your AI coding agent, on your own models.** Obitobuff is a TypeScript monorepo (built with Bun) that ships a powerful terminal coding agent with specialized sub-agents, file finding, editing, bash, research, and code review.

Obitobuff is **local-only**: it runs entirely on your own OpenAI-compatible
endpoints (Ollama, OmniRoute, 9Route, OpenRouter, LM Studio, vLLM, …)
configured in `obitobuff.config.json`. No Obitobuff backend, no login, no
sessions, no ads.

---

## Install & auto-update (from GitHub)

Binaries and the launcher are published as GitHub Releases on
[`dikaofc/ObitoBuffCLI`](https://github.com/dikaofc/ObitoBuffCLI/releases).
Install the launcher once — it downloads the CLI binary on first launch and
**checks GitHub Releases for updates on every launch, swapping in new versions
automatically**:

```bash
curl -fsSL https://raw.githubusercontent.com/dikaofc/ObitoBuffCLI/main/install.sh | bash
obitobuff   # run in any project directory
```

**Platform support** — prebuilt binaries for Linux x64/arm64 (Debian, Ubuntu,
Arch, Fedora, …), macOS Intel/Apple Silicon, Windows 10/11 (64-bit), and VPS /
headless servers. See the [platform guide](./docs/platforms.md) for
per-platform instructions (including a `INSTALL_MODE=binary` option for
Node-less servers that adds itself to PATH automatically).

### Publishing a new version

1. Push your changes to the repo.
2. Tag and push: `git tag v0.1.0 && git push origin v0.1.0`
3. The `Release Obitobuff CLI` workflow builds binaries for Linux / macOS /
   Windows (including baseline builds), attaches them to a GitHub Release, and
   every installed launcher updates automatically on its next launch.

You can also release from the Actions tab (workflow_dispatch) by entering a
version. To point the launcher at a different repo, set `OBITOBUFF_UPDATE_REPO`.

---

## Quick start — local mode (recommended)

Run Obitobuff in any project from your terminal, entirely on your own providers.
The only setup is a config file. `install.sh` already creates a global
`~/.obitobuff/config.json` (OpenRouter template) on first install — paste your
API key into it and run `obitobuff`. To start from scratch instead, save one of
the ready-to-copy examples below as `obitobuff.config.json` in your project.

**Ollama — free, runs locally, no API key:**

```bash
ollama pull qwen3-coder        # or any model you have pulled
cat > obitobuff.config.json <<'EOF'
{
  "defaultModel": "qwen3-coder",
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "ollama",
      "models": [{ "id": "qwen3-coder" }]
    }
  }
}
EOF
obitobuff
```

**OpenRouter — cloud models, one key for hundreds of models:**

```bash
cat > obitobuff.config.json <<'EOF'
{
  "defaultModel": "anthropic/claude-sonnet-4",
  "providers": {
    "openrouter": {
      "baseUrl": "https://openrouter.ai/api/v1",
      "api": "openrouter",
      "apiKey": "${OPENROUTER_API_KEY}",
      "models": [{ "id": "anthropic/claude-sonnet-4", "name": "Claude Sonnet 4" }]
    }
  }
}
EOF
export OPENROUTER_API_KEY=sk-or-v1-...   # get one at https://openrouter.ai/keys
obitobuff
```

Running from a source checkout (or building a standalone binary) instead:

```bash
bun install
cd ~/my-project
cp <path-to-obitobuff>/config.example.json ./obitobuff.config.json
# edit the file: set baseUrl / apiKey / models for your providers
bun run --cwd <path-to-obitobuff>/cli dev
# or: bun run build:obitobuff && ./obitobuff
```

Then describe what you want. Obitobuff finds the relevant files, makes changes, and runs the checks that matter for your project — using only the models you configured.

### `obitobuff.config.json`

Place the config in your working directory (or `~/.obitobuff/config.json`, or point at it with the `OBITOBUFF_CONFIG` env var). When a provider with models is found, Obitobuff switches to **local mode** automatically.

```json
{
  "defaultModel": "deepseek/deepseek-v4-flash",
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:20128/v1",
      "api": "openai-completions",
      "apiKey": "sk-your-key",
      "models": [
        { "id": "deepseek/deepseek-v4-flash" }
      ]
    },
    "9route": {
      "baseUrl": "https://api.9route.io/v1",
      "api": "openai-completions",
      "apiKey": "sk-${NINEROUTE_API_KEY}",
      "models": [
        { "id": "anthropic/claude-sonnet-4", "name": "Claude Sonnet 4" }
      ]
    }
  }
}
```

| Field | Description |
| ----- | ----------- |
| `baseUrl` | Base URL of the OpenAI-compatible API (e.g. `http://localhost:11434/v1`, `https://api.omniroute.ai/v1`, `https://api.9route.io/v1`). |
| `api` | Wire API. `openai-completions` (default), `openai`, `ollama`, `openrouter` → `/chat/completions`; `openai-completion`, `completions` → `/completions`. |
| `apiKey` | Optional bearer token. Supports `${ENV_VAR}` / `$ENV_VAR` interpolation. |
| `headers` | Optional extra HTTP headers. |
| `models[].id` | Model id — used for selection and sent to the provider. `models[].model` optionally overrides the id sent to the API. |
| `defaultModel` | Optional model selected on startup (defaults to the first configured model). |

In local mode you can switch models at any time with `/model` (list) or `/model <id>`, and pick one at startup with `--model <id>`. See [`config.example.json`](./config.example.json).

There is no hosted backend anymore — no login, no sessions, no ads, and no
Obitobuff API calls of any kind. The CLI refuses to start until you provide a
`obitobuff.config.json` (see above) with at least one provider + model.

## How Obitobuff works

Obitobuff uses specialized agents instead of sending every task through one model and one prompt. Depending on the task, agents gather context, plan, edit or research, run tools, and review the result.

- **Codebase context** — File-finding agents map the relevant parts of a project before editing.
- **Implementation and review** — Agents divide work, make changes, run commands, and inspect the result.
- **Research and browser use** — Agents investigate documentation and test applications in a real browser.
- **Your models, your rules** — In local mode every request (root agents *and* sub-agents) routes to your configured providers.

## Development

```bash
git clone https://github.com/dikaofc/ObitoBuffCLI.git
cd ObitoBuffCLI
bun install
bun run dev:obitobuff     # start the CLI in dev (local mode)
```

Run checks:

```bash
bun run --cwd common typecheck && bun run --cwd sdk typecheck && bun run --cwd cli typecheck
bun test common/src/__tests__/local-config.test.ts
```

See the [development guide](./docs/development.md) and [testing guide](./docs/testing.md) for environment setup.

## Built on Codebuff

Obitobuff is built on [Codebuff](https://codebuff.com), the open multi-agent framework that powers its orchestration, tools, and SDK. To create custom agents or embed them in another application, see the [Codebuff documentation](https://codebuff.com/docs) and [`@codebuff/sdk`](https://www.npmjs.com/package/@codebuff/sdk).

## Links

- [GitHub](https://github.com/dikaofc/ObitoBuffCLI)
- [Releases](https://github.com/dikaofc/ObitoBuffCLI/releases)
- [License](./LICENSE)
