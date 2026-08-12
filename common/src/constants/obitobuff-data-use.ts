const POLICY_EFFECTIVE_DATE = 'July 23, 2026'

export const OBITOBUFF_POLICY_ROLLOUT = {
  version: '2026-07-23',
  effectiveDate: POLICY_EFFECTIVE_DATE,
  lastUpdated: '07/23/2026',
  noticeEndsAt: '2026-08-23T00:00:00-07:00',
  notice: {
    title: `We’ve updated our Terms and Privacy Policy, effective ${POLICY_EFFECTIVE_DATE}.`,
    summary:
      'Prompts may be used to personalize ads, AI training applies only to labeled models or features, and usage restrictions were updated.',
  },
} as const

export const OBITOBUFF_PRIVACY_POLICY_URL = 'https://obitobuff.com/privacy-policy'

export const OBITOBUFF_AI_TRAINING_NOTICE = 'May use data for AI training'

export type ObitobuffModelDataUse = 'service' | 'training'

/**
 * Canonical short-form public copy derived from the July 23 Privacy Policy.
 * Product surfaces should import these answers instead of restating data-use
 * promises. Static Markdown/MDX copies are protected by the drift test in
 * `obitobuff-public-data-use-copy.test.ts`.
 */
export const OBITOBUFF_PUBLIC_DATA_USE_COPY = {
  trainingQuestion: 'Is my data used to train AI?',
  trainingAnswer:
    'Only when a model or feature says data may be used for AI training. Obitobuff or the provider may then keep submissions to develop, train, test, evaluate, fine-tune, and improve AI models or products.',
  storageQuestion: 'How is my data used and stored?',
  storageAnswer:
    'We use prompts, messages, code, files, and repository data to provide the service. We may analyze prompts and messages—including pasted content—to personalize ads, using Obitobuff systems and service providers acting on our behalf. Separate uploads and connected repositories are not provided to advertising providers. Where required by law, we provide advertising choices and honor recognized opt-out signals; elsewhere, this processing may be required to use the free service. See the Privacy Policy for retention and details.',
  compactTrainingSummary: `Models or features labeled “${OBITOBUFF_AI_TRAINING_NOTICE}” may keep submissions to develop, train, test, evaluate, fine-tune, and improve AI models or products.`,
  compactPrivacySummary: `Prompts and messages may be analyzed to personalize ads, using Obitobuff systems and service providers acting on our behalf. Separate uploads and connected repositories are not provided to advertising providers. Models or features labeled “${OBITOBUFF_AI_TRAINING_NOTICE}” may use submissions for that purpose.`,
  localExecutionSummary:
    'Obitobuff edits files locally but sends relevant prompts, code, files, and repository context to its servers and model providers. See the Privacy Policy for details.',
  compactLocalExecutionSummary:
    'Edits run locally, but relevant prompts, code, files, and repository context are sent to Obitobuff and model providers.',
} as const

export const OBITOBUFF_DATA_USE_GENERATED_MARKDOWN_BLOCK = {
  start: '<!-- BEGIN GENERATED OBITOBUFF DATA USE -->',
  end: '<!-- END GENERATED OBITOBUFF DATA USE -->',
} as const

export const OBITOBUFF_DATA_USE_GENERATED_MDX_BLOCK = {
  start: '{/* BEGIN GENERATED OBITOBUFF DATA USE */}',
  end: '{/* END GENERATED OBITOBUFF DATA USE */}',
} as const

export function renderObitobuffDataUseFaqMarkdown(): string {
  return `${OBITOBUFF_DATA_USE_GENERATED_MARKDOWN_BLOCK.start}

**${OBITOBUFF_PUBLIC_DATA_USE_COPY.trainingQuestion}** ${OBITOBUFF_PUBLIC_DATA_USE_COPY.trainingAnswer}

**${OBITOBUFF_PUBLIC_DATA_USE_COPY.storageQuestion}** ${OBITOBUFF_PUBLIC_DATA_USE_COPY.storageAnswer}

See the [Privacy Policy](${OBITOBUFF_PRIVACY_POLICY_URL}) for complete details.

${OBITOBUFF_DATA_USE_GENERATED_MARKDOWN_BLOCK.end}`
}

export function renderObitobuffDataUseFaqMdx(): string {
  return `${OBITOBUFF_DATA_USE_GENERATED_MDX_BLOCK.start}

## ${OBITOBUFF_PUBLIC_DATA_USE_COPY.storageQuestion}

${OBITOBUFF_PUBLIC_DATA_USE_COPY.storageAnswer}

## ${OBITOBUFF_PUBLIC_DATA_USE_COPY.trainingQuestion}

${OBITOBUFF_PUBLIC_DATA_USE_COPY.trainingAnswer}

See the [Privacy Policy](${OBITOBUFF_PRIVACY_POLICY_URL}) for complete details.

${OBITOBUFF_DATA_USE_GENERATED_MDX_BLOCK.end}`
}
