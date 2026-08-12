// The label/dots/perk-note logic is shared with Obitobuff Desktop and lives in
// common; this module re-exports it and adds the terminal rendering and layout
// gating only the CLI needs.
export {
  OBITOBUFF_STREAK_WEEK,
  getObitobuffStreakBonusNote,
} from '@codebuff/common/util/obitobuff-streak-line'
export type { ObitobuffStreakLine } from '@codebuff/common/util/obitobuff-streak-line'

import {
  OBITOBUFF_STREAK_WEEK,
  getObitobuffStreakBonusNote,
  getObitobuffStreakLine as getSharedObitobuffStreakLine,
} from '@codebuff/common/util/obitobuff-streak-line'

import type { ObitobuffStreakLine } from '@codebuff/common/util/obitobuff-streak-line'

const OBITOBUFF_STREAK_BONUS_MIN_HEIGHT = 30

/** Columns between the count label and its progress dots. */
export const OBITOBUFF_STREAK_LABEL_GAP = 2

/** Columns kept clear between the heading and the streak when they share a
 *  row. The heading row is laid out space-between inside a shrink-to-fit
 *  column, so when the row is the widest child there is no free space to
 *  distribute and the two would otherwise render flush against each other
 *  ("Start coding for free18 day streak"). This is the floor, and the same
 *  number decides whether they may share a row at all. */
export const OBITOBUFF_STREAK_INLINE_GAP = 3

/** Progress glyphs for a terminal. The shared default is ●/○, but U+25CF is
 *  missing from plenty of terminal fonts and renders as a tofu box — a
 *  CP437-derived font, for instance, has the box-drawing and block elements
 *  the CLI already draws with, and even ○, but no ●. Bullet and middle dot
 *  keep the dot look while being about as universal as glyphs get.
 *
 *  If a font ever fails these too, █/░ (Block Elements) is the fallback pair:
 *  the ASCII logo and the progress bar are built from them, so anything that
 *  renders the CLI at all renders those. */
const TERMINAL_DOT_CHARS = { filled: '•', empty: '·' }

/** The streak line as the CLI draws it. */
export function getObitobuffStreakLine(
  streak: number,
): ObitobuffStreakLine | null {
  return getSharedObitobuffStreakLine(streak, TERMINAL_DOT_CHARS)
}

/** Rendered width of the streak, e.g. "18 day streak  •••••••+". */
export function getObitobuffStreakInlineWidth(line: ObitobuffStreakLine): number {
  return line.label.length + OBITOBUFF_STREAK_LABEL_GAP + line.dots.length
}

/** What a user with no streak yet is about to earn. The empty slot is measured
 *  against it so the row doesn't move on day one. */
const DAY_ONE_LINE = getObitobuffStreakLine(1)!

/** Whether the heading and the streak can share a row with the inline gap left
 *  clear between them. A streak long enough to widen its own label (or a
 *  narrow terminal) pushes the streak onto its own line instead of letting the
 *  two collide. */
export function fitsObitobuffStreakOnHeadingRow(params: {
  /** null when the user has no streak yet — measured as day one. */
  line: ObitobuffStreakLine | null
  headingWidth: number
  availableWidth: number
}): boolean {
  return (
    params.headingWidth +
      OBITOBUFF_STREAK_INLINE_GAP +
      getObitobuffStreakInlineWidth(params.line ?? DAY_ONE_LINE) <=
    params.availableWidth
  )
}

/** Returns the earned perk note only when the landing layout can show it
 * without crowding the picker or wrapping onto additional rows. */
export function getObitobuffStreakBonusNoteForLayout(params: {
  streak: number
  accessTier: 'full' | 'limited'
  terminalHeight: number
  availableWidth: number
}): string | null {
  if (params.streak < OBITOBUFF_STREAK_WEEK) return null
  if (params.terminalHeight < OBITOBUFF_STREAK_BONUS_MIN_HEIGHT) return null

  const note = getObitobuffStreakBonusNote(params)
  if (!note || note.length > params.availableWidth) return null

  return note
}
