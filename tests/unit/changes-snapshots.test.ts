import { describe, it, expect, beforeEach } from 'vitest';
import { ChangesModule } from '@modules/changes';

const buildEditable = (options: {
  id: string;
  type: string;
  markdown: string;
}) => {
  return `
    <div
      data-review-id="${options.id}"
      data-review-type="${options.type}"
      data-review-markdown="${options.markdown.replace(/"/g, '&quot;')}"
    >
      <div>${options.markdown}</div>
    </div>
  `;
};

describe('ChangesModule operation snapshots', () => {
  let changes: ChangesModule;

  beforeEach(() => {
    document.body.innerHTML = [
      buildEditable({
        id: 'title-1',
        type: 'Title',
        markdown: 'Document Title',
      }),
      buildEditable({
        id: 'para-1',
        type: 'Para',
        markdown: 'First paragraph',
      }),
      buildEditable({
        id: 'para-2',
        type: 'Para',
        markdown: 'Second paragraph',
      }),
    ].join('\n');

    changes = new ChangesModule();
    changes.initializeFromDOM();
  });

  it('returns intermediate element states with getStateAfterOperations', () => {
    changes.edit('para-1', 'First paragraph updated');
    changes.insert(
      'Inserted segment',
      { type: 'Para' },
      { after: 'para-1' }
    );

    const original = changes.getStateAfterOperations(0);
    const firstParaOriginal = original.find((el) => el.id === 'para-1');
    expect(firstParaOriginal?.content).toBe('First paragraph');

    const firstStep = changes.getStateAfterOperations(1);
    const firstParaUpdated = firstStep.find((el) => el.id === 'para-1');
    expect(firstParaUpdated?.content).toBe('First paragraph updated');
    expect(firstStep.some((el) => el.content === 'Inserted segment')).toBe(
      false
    );

    const finalState = changes.getCurrentState();
    expect(finalState.some((el) => el.content === 'Inserted segment')).toBe(
      true
    );
  });

  it('produces markdown snapshots for each operation', () => {
    changes.edit('para-1', 'First paragraph {++updated++}');
    changes.delete('para-2');

    const tracked = changes.toMarkdownSnapshot(1);
    expect(tracked).toContain('{++updated++}');

    const clean = changes.toCleanMarkdownSnapshot(1);
    expect(clean).toContain('First paragraph updated');
    expect(clean).not.toContain('{++updated++}');

    const fullMarkdown = changes.toMarkdownSnapshot();
    expect(fullMarkdown).not.toContain('Second paragraph');
  });
});
