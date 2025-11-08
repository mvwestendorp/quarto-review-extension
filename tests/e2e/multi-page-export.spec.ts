import { test, expect, type Page, type Locator } from '@playwright/test';

interface RecordedEdit {
  elementId: string;
  marker: string;
  exportText: string;
}

test.describe('Cross-page edits and export integrity', () => {
  test('edits on multiple pages show up in changes module, UI, and exported bundle', async ({
    page,
  }) => {
    await page.goto('/debug-example.html');
    await waitForReviewDebug(page);

    const debugEdits: RecordedEdit[] = [];
    debugEdits.push(
      await applyEdit({
        page,
        locator: page.locator('[data-review-type="Para"]').nth(1),
        marker: '[DEBUG_PARA_EDIT]',
      })
    );
    debugEdits.push(
      await applyEdit({
        page,
        locator: page.locator('[data-review-type="BulletList"]').first(),
        marker: '[DEBUG_LIST_EDIT]',
      })
    );

    await expectOperationsForEdits(page, debugEdits);
    const debugArchive = await captureCleanExport(page);
    debugEdits.forEach((edit) => {
      expect(debugArchive).toContain(edit.exportText);
    });

    await page.goto('/document.html');
    await waitForReviewDebug(page);

    const documentEdits: RecordedEdit[] = [];
    documentEdits.push(
      await applyEdit({
        page,
        locator: page
          .locator('[data-review-type="Header"]')
          .filter({ hasText: 'Introduction' })
          .first(),
        marker: '[DOC_HEADING_EDIT]',
      })
    );
    documentEdits.push(
      await applyEdit({
        page,
        locator: page.locator('[data-review-type="OrderedList"]').first(),
        marker: '[DOC_ORDERED_EDIT]',
      })
    );
    documentEdits.push(
      await applyEdit({
        page,
        locator: page.locator('[data-review-type="CodeBlock"]').first(),
        marker: '# DOC_CODE_EDIT',
        update: (current, marker) => `${current.trimEnd()}\n${marker}`,
      })
    );

    await expectOperationsForEdits(page, documentEdits);
    const documentArchive = await captureCleanExport(page);
    documentEdits.forEach((edit) => {
      expect(documentArchive).toContain(edit.exportText);
    });
    expect(documentArchive).toContain('title: "Example Document with Review Extension"');
  });
});

async function waitForReviewDebug(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean((window as any).reviewDebug?.operations), null, {
    timeout: 10_000,
  });
}

async function applyEdit(options: {
  page: Page;
  locator: Locator;
  marker: string;
  update?: (current: string, marker: string) => string;
}): Promise<RecordedEdit> {
  const { page, locator, marker } = options;
  await expect(locator).toBeVisible();

  const elementId =
    (await locator.evaluate((el) => el.getAttribute('data-review-id'))) ?? undefined;
  expect(elementId, 'Element must include a data-review-id attribute').toBeDefined();

  await locator.dblclick();
  await page.waitForSelector('.review-editor-modal', { state: 'visible' });

  const textarea = page.locator('.review-editor-content textarea').first();
  const existing = await textarea.inputValue();
  const updateFn = options.update ?? ((current: string, token: string) => `${current} ${token}`);
  const newValue = updateFn(existing, marker);

  await textarea.fill(newValue);
  await page.locator('button:has-text("Save")').first().click();
  await page.waitForSelector('.review-editor-modal', { state: 'hidden' });

  const assertionText = marker.replace(/\s+/g, ' ').trim();
  await expect(page.locator(`[data-review-id="${elementId}"]`)).toContainText(assertionText, {
    timeout: 5_000,
  });

  return {
    elementId: elementId!,
    marker,
    exportText: marker,
  };
}

async function expectOperationsForEdits(page: Page, edits: RecordedEdit[]): Promise<void> {
  await page.waitForFunction(
    (ids) => {
      const ops =
        ((window as any).reviewDebug?.operations?.() as Array<{ type: string; elementId: string }>) ??
        [];
      const editIds = ops.filter((op) => op.type === 'edit').map((op) => op.elementId);
      return ids.every((id) => editIds.includes(id));
    },
    edits.map((edit) => edit.elementId),
    { timeout: 5_000 }
  );
}

async function captureCleanExport(page: Page): Promise<string> {
  const exportButton = page.locator('button:has-text("Export Clean QMD")').first();
  await expect(exportButton).toBeEnabled();

  const [download] = await Promise.all([page.waitForEvent('download'), exportButton.click()]);
  const stream = await download.createReadStream();
  if (!stream) {
    throw new Error('Failed to read exported bundle contents');
  }

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}
