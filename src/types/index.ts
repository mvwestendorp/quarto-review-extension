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
  | 'DocumentTitle'
  | 'Title';

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
  sourceFile?: string; // The original QMD/MD file this element came from (e.g., "document.qmd", "processes/page-2.qmd")
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
  userId?: string; // Alternative ID for different auth systems (e.g., databricks-app)
  name?: string;
  email?: string;
  role: 'viewer' | 'editor' | 'admin';
}

export interface GitProvider {
  type: 'github' | 'gitlab' | 'gitea' | 'forgejo' | 'azure-devops' | 'local';
  url?: string;
  token?: string;
}

export interface UserAuthConfig {
  /**
   * Authentication mode for identifying application users.
   * `oauth2-proxy` reads user identity from oauth2-proxy headers (e.g., x-auth-request-user).
   * `databricks-app` fetches user info from Databricks App API endpoint.
   * `manual` relies on programmatic login via UserModule.login().
   * `none` disables user authentication.
   */
  mode?: 'oauth2-proxy' | 'databricks-app' | 'manual' | 'none';
  /**
   * Header name for user identifier when mode is `oauth2-proxy`.
   * Defaults to 'x-auth-request-user'.
   */
  userHeader?: string;
  /**
   * Header name for user email when mode is `oauth2-proxy`.
   * Defaults to 'x-auth-request-email'.
   */
  emailHeader?: string;
  /**
   * Header name for preferred username when mode is `oauth2-proxy`.
   * Defaults to 'x-auth-request-preferred-username'.
   * Used as fallback if userHeader is unavailable.
   */
  usernameHeader?: string;
  /**
   * Default role assigned to users authenticated via oauth2-proxy or databricks-app.
   * Defaults to 'editor'.
   */
  defaultRole?: 'viewer' | 'editor' | 'admin';
  /**
   * Configuration for Databricks App authentication (when mode is 'databricks-app').
   */
  databricks?: {
    /** API endpoint for user info (default: /api/userinfo) */
    endpoint?: string;
    /** Timeout for API call in milliseconds (default: 5000) */
    timeout?: number;
  };
  /**
   * Enable detailed debug logging for troubleshooting.
   * Logs which headers are checked, where they come from, and why auth failed.
   * Can be enabled via YAML: auth: { mode: "oauth2-proxy", debug: true }
   */
  debug?: boolean;
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

export interface GitReviewSession {
  branchName: string;
  pullRequestNumber?: number;
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
