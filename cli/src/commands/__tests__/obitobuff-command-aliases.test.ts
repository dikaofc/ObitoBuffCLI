import { describe, expect, test } from 'bun:test'

describe('obitobuff command aliases', () => {
  // Obitobuff is local-only: there is no server session to end, so
  // /end-session (and its `model` alias) is gone and /model is the standalone
  // provider-switcher command.
  test('/model is a standalone command in obitobuff (local-only)', () => {
    const slashCommandsUrl = new URL(
      '../../data/slash-commands.ts',
      import.meta.url,
    ).href
    const commandRegistryUrl = new URL(
      '../command-registry.ts',
      import.meta.url,
    ).href

    const result = Bun.spawnSync({
      cmd: [
        'bun',
        '--eval',
        `
          import { SLASH_COMMANDS } from ${JSON.stringify(slashCommandsUrl)}
          import { findCommand } from ${JSON.stringify(commandRegistryUrl)}

          const endSession = SLASH_COMMANDS.find((cmd) => cmd.id === 'end-session')
          if (endSession) {
            throw new Error('end-session slash command must be removed in local-only obitobuff')
          }

          const modelCommand = findCommand('model')
          if (!modelCommand) throw new Error('model command missing')
          if (modelCommand.name !== 'model') {
            throw new Error('model command should resolve to the standalone /model command')
          }
        `,
      ],
      cwd: process.cwd(),
      env: {
        ...process.env,
        OBITOBUFF_MODE: 'true',
        NODE_ENV: 'test',
        NEXT_PUBLIC_CB_ENVIRONMENT: 'test',
        NEXT_PUBLIC_CODEBUFF_APP_URL: 'https://app.codebuff.test',
        NEXT_PUBLIC_SUPPORT_EMAIL: 'support@codebuff.test',
        NEXT_PUBLIC_POSTHOG_API_KEY: 'phc_test_key',
        NEXT_PUBLIC_POSTHOG_HOST_URL: 'https://posthog.codebuff.test',
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
        NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL: 'https://stripe.codebuff.test',
        NEXT_PUBLIC_WEB_PORT: '3000',
      },
      stderr: 'pipe',
      stdout: 'pipe',
    })

    const stderr = new TextDecoder().decode(result.stderr)
    expect(result.exitCode, stderr).toBe(0)
  }, 15_000)
})
