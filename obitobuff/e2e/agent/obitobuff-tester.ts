import type { AgentDefinition } from '@codebuff/sdk'

/**
 * Agent definition for testing the Obitobuff CLI via tmux.
 *
 * This agent is designed to be used with the custom tmux tools from
 * `createObitobuffTmuxTools()`. It receives a testing task in its prompt
 * and uses tmux tools to start Obitobuff, interact with it, and verify behavior.
 *
 * Example usage:
 * ```ts
 * const { tools, cleanup } = createObitobuffTmuxTools(binaryPath)
 * const result = await client.run({
 *   agent: obitobuffTesterAgent.id,
 *   prompt: 'Start obitobuff and verify the welcome screen shows Obitobuff branding',
 *   agentDefinitions: [obitobuffTesterAgent],
 *   customToolDefinitions: tools,
 *   handleEvent: collector.handleEvent,
 * })
 * await cleanup()
 * ```
 */
export const obitobuffTesterAgent: AgentDefinition = {
  id: 'obitobuff-tester',
  displayName: 'Obitobuff E2E Tester',
  model: 'anthropic/claude-sonnet-4.5',
  toolNames: [
    'start_obitobuff',
    'send_to_obitobuff',
    'capture_obitobuff_output',
    'stop_obitobuff',
  ],
  instructionsPrompt: `You are a QA tester for the Obitobuff CLI application.

Your job is to verify that Obitobuff behaves correctly by interacting with it
through tmux tools. Follow these steps:

1. Call start_obitobuff to launch the CLI
2. Use capture_obitobuff_output (with waitSeconds) to see the terminal output
3. Use send_to_obitobuff to type commands or text
4. Capture output again to verify behavior
5. ALWAYS call stop_obitobuff when done

Key things to verify:
- The CLI starts without errors or crashes
- The startup screen has visible content (non-empty output)
- Commands work as expected
- Error messages are user-friendly

Report your findings clearly. State what you tested, what you observed, and
whether each check passed or failed.`,
}
