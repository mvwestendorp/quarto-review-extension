/**
 * Custom error classes for Git operations
 */

/**
 * Base error class for all Git-related errors
 */
export class GitError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'GitError';
    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Error thrown when Git configuration is invalid or missing
 */
export class GitConfigError extends GitError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'GitConfigError';
  }
}

/**
 * Error thrown when Git authentication fails
 */
export class GitAuthError extends GitError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'GitAuthError';
  }
}

/**
 * Error thrown when Git network operations fail
 */
export class GitNetworkError extends GitError {
  constructor(
    message: string,
    public readonly retryable: boolean = true,
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'GitNetworkError';
  }
}

/**
 * Error thrown when Git provider operations fail
 */
export class GitProviderError extends GitError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'GitProviderError';
  }
}

/**
 * Error thrown when Git validation fails
 */
export class GitValidationError extends GitError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'GitValidationError';
  }
}

/**
 * Check if an error is a Git error
 */
export function isGitError(error: unknown): error is GitError {
  return error instanceof GitError;
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof GitNetworkError) {
    return error.retryable;
  }
  return false;
}
