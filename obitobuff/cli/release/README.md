# Obitobuff

**Your own AI coding agent.** Run it free against your own OpenAI-compatible
providers (Ollama, OmniRoute, 9Route, OpenRouter, LM Studio, vLLM, ...) — no
account, no sessions, no ads — or use the built-in free backend.

This package is the *launcher*: a thin Node wrapper that downloads the
compiled CLI binary and keeps it up to date automatically from
[GitHub Releases](https://github.com/dikaofc/ObitoBuffCLI/releases).

## Install

```bash
npm install -g https://github.com/dikaofc/ObitoBuffCLI/releases/download/v0.1.0/obitobuff-launcher-0.1.0.tgz
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

## Local mode (bring your own provider)

Create `obitobuff.config.json` (or `config.json`) in your project directory:

```json
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
```

Obitobuff detects it, skips login/sessions, and routes every request to your
providers. Secrets can live in the environment: `${API_KEY}` inside the file
is interpolated at load time.

## Links

- [GitHub](https://github.com/dikaofc/ObitoBuffCLI)
- [Releases](https://github.com/dikaofc/ObitoBuffCLI/releases)
