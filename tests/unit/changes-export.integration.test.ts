import { describe, it, expect, beforeEach } from 'vitest';
import { ChangesModule } from '@modules/changes';
import { stripCriticMarkup } from '@modules/changes/converters';
import type { Element, ElementMetadata } from '@/types';

const baseMetadata: ElementMetadata = {
  type: 'Para',
};

function buildChanges(initial: Element[]): ChangesModule {
  const changes = new ChangesModule();
  (changes as unknown as { originalElements: Element[] }).originalElements =
    initial.map((element) => ({ ...element }));
  return changes;
}

describe('ChangesModule markdown export integration', () => {
  let changes: ChangesModule;

  beforeEach(() => {
    changes = buildChanges([
      {
        id: 'p-1',
        content: 'Hello world',
        metadata: baseMetadata,
      },
    ]);
  });

  it('toCleanMarkdown reflects edits made to the document', () => {
    changes.edit('p-1', 'Hello moon');
    const clean = changes.toCleanMarkdown();
    expect(clean).toContain('Hello moon');
    expect(clean).not.toContain('world');
  });

  it('toTrackedMarkdown includes critic markup for differences', () => {
    changes.edit('p-1', 'Hello moon');
    const critic = changes.toTrackedMarkdown();
    expect(critic).toContain('{--world--}');
    expect(critic).toContain('{++moon++}');
  });

  it('supports multi-segment replacements before exporting', () => {
    changes.replaceElementWithSegments('p-1', [
      { content: 'First paragraph', metadata: baseMetadata },
      { content: 'Second paragraph', metadata: baseMetadata },
    ]);

    const clean = changes.toCleanMarkdown();
    expect(clean).toContain('First paragraph');
    expect(clean).toContain('Second paragraph');

    const critic = changes.toTrackedMarkdown();
    const accepted = stripCriticMarkup(critic, true);
    expect(accepted).toContain('First paragraph');
    expect(accepted).toContain('Second paragraph');
  });

  it('preserves comments as HTML in clean exports', () => {
    changes.edit('p-1', 'Paragraph {>>comment text<<}');

    const clean = changes.toCleanMarkdown();
    expect(clean).toContain('Paragraph');
    expect(clean).toContain('<!-- review-comment comment text -->');

    const critic = changes.toTrackedMarkdown();
    expect(critic).toContain('{>>comment text<<}');
  });
});
