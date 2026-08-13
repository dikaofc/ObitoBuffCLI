# Obitobuff

**Your own AI coding agent.** Obitobuff is local-only: it runs entirely on
your own OpenAI-compatible providers (Ollama, OmniRoute, 9Route, OpenRouter,
LM Studio, vLLM, ...) — no account, no login, no sessions, no ads, no hosted
backend.

This package is the *launcher*: a thin Node wrapper that downloads the
compiled CLI binary and keeps it up to date automatically from
[GitHub Releases](https://github.com/dikaofc/ObitoBuffCLI/releases).

## Install

```bash
npm install -g https://github.com/dikaofc/ObitoBuffCLI/releases/download/v0.1.1/obitobuff-launcher-0.1.1.tgz
```

or always get the latest:

```bash
curl -fsSL https://raw.githubusercontent.com/dikaofc/ObitoBuffCLI/main/install.sh | bash
```

## Usage

```bash
cd ~/my-project
obitobuff
```

On first launch the CLI binary is downloaded; on every later launch the
launcher checks GitHub Releases and swaps in a newer binary when one exists.
To use a different update repo, set `OBITOBUFF_UPDATE_REPO` (e.g.
`OBITOBUFF_UPDATE_REPO=you/your-fork obitobuff`).

## Configuration (required)

Create `obitobuff.config.json` (or `config.json`) in your project directory:

```json
{
  "defaultModel": "deepseek/deepseek-v4-flash",
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "sk-...",
      "models": [{ "id": "deepseek/deepseek-v4-flash" }]
    }
  }
}
```

The CLI refuses to start until at least one provider + model is configured.
Every request (root agents and sub-agents) routes to your providers — there
is no hosted backend to fall back to. Secrets can live in the environment:
`${API_KEY}` inside the file is interpolated at load time.

## Links

- [GitHub](https://github.com/dikaofc/ObitoBuffCLI)
- [Releases](https://github.com/dikaofc/ObitoBuffCLI/releases)
