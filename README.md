# Obitobuff

**Your AI coding agent, on your own models.** Obitobuff is a TypeScript monorepo (built with Bun) that ships a powerful terminal coding agent with specialized sub-agents, file finding, editing, bash, research, and code review.

Two ways to run it:

1. **Local mode (no account, no limits)** — point Obitobuff at any OpenAI-compatible endpoint (Ollama, OmniRoute, 9Route, OpenRouter, LM Studio, vLLM, …) with a local `obitobuff.config.json`. No login, no sessions, no ads, unlimited use.
2. **Free hosted mode** — the bundled free model catalog (DeepSeek V4 Flash, GPT-5.6 Luna, MiniMax M3, MiMo 2.5, …), served by the Obitobuff backend.

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
Arch, Fedora, …), macOS Intel/Apple Silicon, Windows 10/11 (64-bit), VPS /
headless servers, and Android via Termux + proot-distro. See the
[platform guide](./docs/platforms.md) for per-platform instructions
(including the Android/Termux setup and a `INSTALL_MODE=binary` option for
Node-less servers).

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

Run Obitobuff in any project from your terminal, entirely on your own providers:

```bash
bun install
cd ~/my-project
cp <path-to-obitobuff>/config.example.json ./obitobuff.config.json
# edit the file: set baseUrl / apiKey / models for your providers
bun run --cwd <path-to-obitobuff>/cli dev
```

Or build a standalone binary:

```bash
bun run build:obitobuff
./obitobuff
```

Then describe what you want. Obitobuff finds the relevant files, makes changes, and runs the checks that matter for your project — using only the models you configured.

### `obitobuff.config.json`

Place the config in your working directory (or `~/.obitobuff/config.json`, or point at it with the `OBITOBUFF_CONFIG` env var). When a provider with models is found, Obitobuff switches to **local mode** automatically.

```json
{
  "defaultModel": "oc/deepseek-v4-flash-free",
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:20128/v1",
      "api": "openai-completions",
      "apiKey": "sk-your-key",
      "models": [
        { "id": "oc/deepseek-v4-flash-free" }
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

## Free hosted mode

The bundled model catalog requires the Obitobuff backend (login + sessions, text-ads supported). Build with the free-mode flag:

```bash
OBITOBUFF_MODE=true bun --cwd cli dev        # dev
bun run build:obitobuff                        # binary (already free-mode)
```

The regular picker currently offers:

| Model                       | Access                  | Best for                                |
| --------------------------- | ----------------------- | --------------------------------------- |
| **DeepSeek V4 Flash 07/31** | Full and limited access | The default; fast coding and tool use   |
| **DeepSeek V4 Pro**         | Full access             | Longer, deeper reasoning                |
| **GPT-5.6 Luna**            | Full access             | Deep reasoning with image support       |
| **MiniMax M3**              | Full access             | Fast responses with image support       |
| **MiMo 2.5**                | Full and limited access | Balanced performance with image support |

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
bun run dev:obitobuff     # start the CLI in dev (free mode)
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
