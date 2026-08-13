# Obitobuff

**The local coding agent.** No account, no login, no hosted backend — it runs
entirely on your own OpenAI-compatible providers from `obitobuff.config.json`.

An AI coding agent that runs in your terminal — describe what you want, and Obitobuff edits your code.

## Install

```bash
npm install -g obitobuff
```

## Usage

```bash
cd ~/my-project
cp config.example.json ./obitobuff.config.json   # add your providers + API keys
obitobuff
```

## Project Structure

```
obitobuff/
├── cli/       # CLI build & npm release files
└── web/       # Obitobuff website
```

## Building from Source

```bash
# From the repo root
bun obitobuff/cli/build.ts 1.0.0
```

---

For everything else — what Obitobuff does, how it works, FAQ, and how it relates to Codebuff — see the [repo root README](../README.md). We keep that one up to date as the single source of truth.

## License

MIT
