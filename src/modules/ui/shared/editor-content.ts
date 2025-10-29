import type { ElementMetadata } from '@/types';
import { normalizeListMarkers } from './utils';

export type AppendSectionComments = (
  content: string,
  commentMarkup: string
) => string;

export function mergeSectionCommentIntoSegments(
  segments: { content: string; metadata: ElementMetadata | undefined }[],
  commentMarkup: string | null,
  fallbackMetadata: ElementMetadata,
  appendSectionComments: AppendSectionComments
): void {
  if (!commentMarkup || segments.length === 0) {
    return;
  }

  const lastIndex = segments.length - 1;
  const lastSegment = segments[lastIndex];
  if (!lastSegment) {
    return;
  }

  segments[lastIndex] = {
    ...lastSegment,
    content: appendSectionComments(lastSegment.content, commentMarkup),
    metadata: lastSegment.metadata ?? fallbackMetadata,
  };
}

export function normalizeContentForComparison(str: string): string {
  return normalizeListMarkers(str.replace(/\r\n/g, '\n'))
    .replace(/[ \t]+$/gm, '')
    .trim();
}
