declare module '@editorjs/marker';
declare module 'editorjs-parser';

// Node.js globals that may be available in some environments
declare const Buffer: typeof import('buffer').Buffer | undefined;
declare const process:
  | {
      env: Record<string, string | undefined>;
    }
  | undefined;
