/**
 * Core type definitions for Quarto Review Extension
 */

export type ElementType =
  | 'Para'
  | 'Header'
  | 'CodeBlock'
  | 'BulletList'
  | 'OrderedList'
  | 'BlockQuote'
  | 'Div'
  | 'FigureCaption'
  | 'TableCaption'
  | 'DocumentTitle';

export type OperationType = 'insert' | 'delete' | 'edit' | 'move';

export interface ElementMetadata {
  type: ElementType;
  level?: number; // For headers
  attributes?: Record<string, string>;
  classes?: string[];
  // Translation-specific metadata
  translationEdit?: boolean;
  segmentCount?: number;
  language?: string;
}

export interface Element {
  id: string;
  content: string;
  metadata: ElementMetadata;
  sourcePosition?: {
    line: number;
    column: number;
  };
}

export interface Operation {
  id: string;
  type: OperationType;
  elementId: string;
  timestamp: number;
  userId?: string;
  data: OperationData;
}

export type OperationData = InsertData | DeleteData | EditData | MoveData;

export interface InsertData {
  type: 'insert';
  content: string;
  metadata: ElementMetadata;
  position: {
    after?: string;
    before?: string;
    parent?: string;
  };
  parentId?: string;
  generated?: boolean;
  source?: string; // Track which extension or component created this operation
}

export interface DeleteData {
  type: 'delete';
  // Keeps original content for undo
  originalContent: string;
  originalMetadata: ElementMetadata;
  source?: string; // Track which extension or component created this operation
}

export interface TextChange {
  type: 'addition' | 'deletion';
  position: number; // character offset in oldContent
  length: number; // length of change
  text: string; // added text (for addition) or deleted text (for deletion)
}

export interface EditData {
  type: 'edit';
  oldContent: string;
  newContent: string;
  changes: TextChange[]; // Granular character-level changes
  oldMetadata?: ElementMetadata;
  newMetadata?: ElementMetadata;
  source?: string; // Track which extension or component created this operation
}

export interface MoveData {
  type: 'move';
  fromPosition: number;
  toPosition: number;
  source?: string; // Track which extension or component created this operation
}

export interface Comment {
  id: string;
  elementId: string;
  userId: string;
  timestamp: number;
  content: string;
  resolved: boolean;
  type: 'comment' | 'suggestion' | 'highlight';
}

export interface User {
  id: string;
  name: string;
  email?: string;
  role: 'viewer' | 'editor' | 'admin';
}

export interface GitProvider {
  type: 'github' | 'gitlab' | 'gitea' | 'forgejo' | 'azure-devops' | 'local';
  url?: string;
  token?: string;
}

export interface ReviewGitAuthConfig {
  /**
   * Authentication mode used when communicating with the provider.
   * `header`/`cookie` expect credentials to be provided by the host environment,
   * while `pat` is intended for development-time personal access tokens.
   */
  mode?: 'header' | 'cookie' | 'pat';
  /**
   * Name of the header to read when mode is `header`.
   * Defaults to `Authorization` if omitted.
   */
  headerName?: string;
  /**
   * Name of the cookie to read when mode is `cookie`.
   */
  cookieName?: string;
  /**
   * Personal access token value when mode is `pat`.
   * Should only be set for development scenarios.
   */
  token?: string;
}

export interface ReviewGitConfig {
  provider?: GitProvider['type'];
  owner?: string;
  repo?: string;
  branch?: string;
  baseBranch?: string;
  ['base-branch']?: string;
  sourceFile?: string;
  ['source-file']?: string;
  auth?: ReviewGitAuthConfig;
  /**
   * Arbitrary provider-specific options for future extensibility
   */
  options?: Record<string, unknown>;
}

/**
 * Configuration for DocumentSearch module
 */
export interface DocumentSearchConfig {
  changes: {
    getCurrentState(): Element[];
  };
  markdown: {
    toPlainText(content: string): string;
  };
}

/**
 * Configuration for ChangeSummaryDashboard module
 */
export interface ChangeSummaryConfig {
  changes: {
    getOperations(): ReadonlyArray<Operation>;
    getCurrentState(): ReadonlyArray<Element>;
    getElementById(id: string): Element | null;
    getElementContentWithTrackedChanges(elementId: string): string;
  };
  comments: {
    parse(content: string): Array<{ type: string }>;
  };
  markdown: {
    toPlainText(content: string): string;
  };
}

/**
 * Interface for UIModule used by keyboard shortcuts and other modules
 */
export interface UIModuleInterface {
  config: {
    changes: {
      undo(): boolean;
      redo(): boolean;
      canUndo(): boolean;
      canRedo(): boolean;
    };
  };
  refresh(): void;
  toggleTrackedChanges(): void;
  toggleSidebarCollapsed(): void;
}
