/**
 * CriticMarkup Module
 *
 * Provides CriticMarkup syntax support for the Milkdown editor, including:
 * - Mark definitions (addition, deletion, highlight, comment, substitution)
 * - Remark plugin for parsing CriticMarkup in markdown
 * - Keyboard shortcuts for quick markup (Mod-Shift-A/D/H/C/S)
 * - ProseMirror plugins for editor integration
 *
 * @module criticmarkup
 */

// Mark definitions and keyboard shortcuts
export {
  criticAddition,
  criticDeletion,
  criticHighlight,
  criticComment,
  criticSubstitution,
  criticAdditionRule,
  criticKeymap,
  criticDecorationPlugin,
  criticMarkupPlugin,
  criticMarkupRemarkPlugin,
} from './milkdown-marks';

// Remark parser
export { remarkCriticMarkupMilkdown } from './remark-parser';
export type { default as RemarkPlugin } from 'unified';
