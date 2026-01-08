import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * CSS Snapshot Tests
 *
 * These tests capture computed styles of components as snapshots.
 * If CSS changes cause style drift, these tests will fail, alerting developers
 * to review the changes.
 *
 * To update snapshots after intentional CSS changes:
 * Run: npm test -- --update
 */

const loadCSSContent = () => {
  const cssFiles = [
    'src/css/tokens/colors.css',
    'src/css/tokens/effects.css',
    'src/css/tokens/spacing.css',
    'src/css/components/buttons.css',
    'src/css/components/editor.css',
    'src/css/components/toolbar.css',
    'src/css/base/editable.css',
    'src/css/base/animations.css',
  ];

  const style = document.createElement('style');
  let cssContent = '';

  cssFiles.forEach((filePath) => {
    const fullPath = resolve(filePath);
    try {
      cssContent += readFileSync(fullPath, 'utf-8') + '\n';
    } catch (e) {
      // File not found, skip
    }
  });

  style.textContent = cssContent;
  document.head.appendChild(style);
};

describe('CSS Snapshots - Button Components', () => {
  beforeAll(() => {
    loadCSSContent();
  });
  let primaryBtn: HTMLButtonElement;
  let secondaryBtn: HTMLButtonElement;
  let pillBtn: HTMLButtonElement;
  let iconBtn: HTMLButtonElement;

  beforeEach(() => {
    // Create primary button
    primaryBtn = document.createElement('button');
    primaryBtn.className = 'review-btn review-btn-primary';
    primaryBtn.textContent = 'Primary';
    document.body.appendChild(primaryBtn);

    // Create secondary button
    secondaryBtn = document.createElement('button');
    secondaryBtn.className = 'review-btn review-btn-secondary';
    secondaryBtn.textContent = 'Secondary';
    document.body.appendChild(secondaryBtn);

    // Create pill button
    pillBtn = document.createElement('button');
    pillBtn.className = 'review-btn review-btn-pill';
    pillBtn.textContent = 'Pill';
    document.body.appendChild(pillBtn);

    // Create icon button
    iconBtn = document.createElement('button');
    iconBtn.className = 'review-btn review-btn-icon';
    iconBtn.innerHTML = '⚙️';
    document.body.appendChild(iconBtn);
  });

  it('primary button style snapshot matches', () => {
    const styles = {
      padding: window.getComputedStyle(primaryBtn).padding,
      backgroundColor: window.getComputedStyle(primaryBtn).backgroundColor,
      color: window.getComputedStyle(primaryBtn).color,
      borderRadius: window.getComputedStyle(primaryBtn).borderRadius,
      borderWidth: window.getComputedStyle(primaryBtn).borderWidth,
      fontSize: window.getComputedStyle(primaryBtn).fontSize,
      fontWeight: window.getComputedStyle(primaryBtn).fontWeight,
      cursor: window.getComputedStyle(primaryBtn).cursor,
      transition: window.getComputedStyle(primaryBtn).transition,
    };

    expect(styles).toMatchSnapshot();
  });

  it('secondary button style snapshot matches', () => {
    const styles = {
      padding: window.getComputedStyle(secondaryBtn).padding,
      backgroundColor: window.getComputedStyle(secondaryBtn).backgroundColor,
      color: window.getComputedStyle(secondaryBtn).color,
      borderColor: window.getComputedStyle(secondaryBtn).borderColor,
      borderWidth: window.getComputedStyle(secondaryBtn).borderWidth,
      borderRadius: window.getComputedStyle(secondaryBtn).borderRadius,
      fontSize: window.getComputedStyle(secondaryBtn).fontSize,
      fontWeight: window.getComputedStyle(secondaryBtn).fontWeight,
      boxShadow: window.getComputedStyle(secondaryBtn).boxShadow,
      cursor: window.getComputedStyle(secondaryBtn).cursor,
    };

    expect(styles).toMatchSnapshot();
  });

  it('pill button style snapshot matches', () => {
    const styles = {
      padding: window.getComputedStyle(pillBtn).padding,
      backgroundColor: window.getComputedStyle(pillBtn).backgroundColor,
      color: window.getComputedStyle(pillBtn).color,
      borderColor: window.getComputedStyle(pillBtn).borderColor,
      borderRadius: window.getComputedStyle(pillBtn).borderRadius,
      fontSize: window.getComputedStyle(pillBtn).fontSize,
      fontWeight: window.getComputedStyle(pillBtn).fontWeight,
      boxShadow: window.getComputedStyle(pillBtn).boxShadow,
      transition: window.getComputedStyle(pillBtn).transition,
    };

    expect(styles).toMatchSnapshot();
  });

  it('icon button style snapshot matches', () => {
    const styles = {
      padding: window.getComputedStyle(iconBtn).padding,
      backgroundColor: window.getComputedStyle(iconBtn).backgroundColor,
      color: window.getComputedStyle(iconBtn).color,
      borderRadius: window.getComputedStyle(iconBtn).borderRadius,
      fontSize: window.getComputedStyle(iconBtn).fontSize,
      cursor: window.getComputedStyle(iconBtn).cursor,
      transition: window.getComputedStyle(iconBtn).transition,
    };

    expect(styles).toMatchSnapshot();
  });
});

describe('CSS Snapshots - Modal Components', () => {
  let modal: HTMLDivElement;
  let container: HTMLDivElement;
  let header: HTMLDivElement;
  let footer: HTMLDivElement;

  beforeAll(() => {
    loadCSSContent();
  });

  beforeEach(() => {
    // Create modal structure
    modal = document.createElement('div');
    modal.className = 'review-editor-modal';

    container = document.createElement('div');
    container.className = 'review-editor-container';

    header = document.createElement('div');
    header.className = 'review-editor-header';
    header.innerHTML = '<h3>Modal Title</h3>';

    footer = document.createElement('div');
    footer.className = 'review-editor-footer';

    container.appendChild(header);
    container.appendChild(footer);
    modal.appendChild(container);
    document.body.appendChild(modal);
  });

  it('modal backdrop snapshot matches', () => {
    const styles = {
      backgroundColor: window.getComputedStyle(modal).backgroundColor,
      backdropFilter: window.getComputedStyle(modal).backdropFilter,
      display: window.getComputedStyle(modal).display,
      position: window.getComputedStyle(modal).position,
      zIndex: window.getComputedStyle(modal).zIndex,
    };

    expect(styles).toMatchSnapshot();
  });

  it('modal container snapshot matches', () => {
    const styles = {
      backgroundColor: window.getComputedStyle(container).backgroundColor,
      borderRadius: window.getComputedStyle(container).borderRadius,
      borderWidth: window.getComputedStyle(container).borderWidth,
      borderColor: window.getComputedStyle(container).borderColor,
      boxShadow: window.getComputedStyle(container).boxShadow,
      display: window.getComputedStyle(container).display,
      flexDirection: window.getComputedStyle(container).flexDirection,
    };

    expect(styles).toMatchSnapshot();
  });

  it('modal header snapshot matches', () => {
    const styles = {
      backgroundColor: window.getComputedStyle(header).backgroundColor,
      borderBottomWidth: window.getComputedStyle(header).borderBottomWidth,
      borderBottomColor: window.getComputedStyle(header).borderBottomColor,
      padding: window.getComputedStyle(header).padding,
      display: window.getComputedStyle(header).display,
    };

    expect(styles).toMatchSnapshot();
  });

  it('modal footer snapshot matches', () => {
    const styles = {
      backgroundColor: window.getComputedStyle(footer).backgroundColor,
      borderTopWidth: window.getComputedStyle(footer).borderTopWidth,
      borderTopColor: window.getComputedStyle(footer).borderTopColor,
      padding: window.getComputedStyle(footer).padding,
      display: window.getComputedStyle(footer).display,
      justifyContent: window.getComputedStyle(footer).justifyContent,
    };

    expect(styles).toMatchSnapshot();
  });
});

describe('CSS Snapshots - Toolbar Components', () => {
  let toolbar: HTMLDivElement;
  let editorToolbar: HTMLDivElement;
  let toolbarBtn: HTMLButtonElement;

  beforeAll(() => {
    loadCSSContent();
  });

  beforeEach(() => {
    // Create main toolbar
    toolbar = document.createElement('div');
    toolbar.className = 'review-toolbar';
    toolbar.style.position = 'fixed';
    document.body.appendChild(toolbar);

    // Create editor toolbar
    editorToolbar = document.createElement('div');
    editorToolbar.className = 'review-editor-toolbar';

    toolbarBtn = document.createElement('button');
    toolbarBtn.className = 'review-editor-toolbar-btn';
    toolbarBtn.textContent = 'B';

    editorToolbar.appendChild(toolbarBtn);
    document.body.appendChild(editorToolbar);
  });

  it('main toolbar snapshot matches', () => {
    const styles = {
      backgroundColor: window.getComputedStyle(toolbar).backgroundColor,
      backdropFilter: window.getComputedStyle(toolbar).backdropFilter,
      borderColor: window.getComputedStyle(toolbar).borderColor,
      borderRadius: window.getComputedStyle(toolbar).borderRadius,
      boxShadow: window.getComputedStyle(toolbar).boxShadow,
      padding: window.getComputedStyle(toolbar).padding,
      display: window.getComputedStyle(toolbar).display,
      position: window.getComputedStyle(toolbar).position,
    };

    expect(styles).toMatchSnapshot();
  });

  it('editor toolbar snapshot matches', () => {
    const styles = {
      backgroundColor: window.getComputedStyle(editorToolbar).backgroundColor,
      backdropFilter: window.getComputedStyle(editorToolbar).backdropFilter,
      borderColor: window.getComputedStyle(editorToolbar).borderColor,
      borderRadius: window.getComputedStyle(editorToolbar).borderRadius,
      boxShadow: window.getComputedStyle(editorToolbar).boxShadow,
      padding: window.getComputedStyle(editorToolbar).padding,
      display: window.getComputedStyle(editorToolbar).display,
    };

    expect(styles).toMatchSnapshot();
  });

  it('editor toolbar button snapshot matches', () => {
    const styles = {
      backgroundColor: window.getComputedStyle(toolbarBtn).backgroundColor,
      borderColor: window.getComputedStyle(toolbarBtn).borderColor,
      borderRadius: window.getComputedStyle(toolbarBtn).borderRadius,
      color: window.getComputedStyle(toolbarBtn).color,
      padding: window.getComputedStyle(toolbarBtn).padding,
      fontSize: window.getComputedStyle(toolbarBtn).fontSize,
      fontWeight: window.getComputedStyle(toolbarBtn).fontWeight,
      cursor: window.getComputedStyle(toolbarBtn).cursor,
      boxShadow: window.getComputedStyle(toolbarBtn).boxShadow,
    };

    expect(styles).toMatchSnapshot();
  });
});

describe('CSS Snapshots - Sidebar Components', () => {
  let sidebar: HTMLDivElement;
  let sidebarHeader: HTMLDivElement;

  beforeAll(() => {
    loadCSSContent();
  });

  beforeEach(() => {
    sidebar = document.createElement('div');
    sidebar.className = 'review-persistent-sidebar';
    sidebar.style.position = 'fixed';

    sidebarHeader = document.createElement('div');
    sidebarHeader.className = 'review-sidebar-header';
    sidebarHeader.innerHTML = '<h3>Sidebar</h3>';

    sidebar.appendChild(sidebarHeader);
    document.body.appendChild(sidebar);
  });

  it('sidebar snapshot matches', () => {
    const styles = {
      backgroundColor: window.getComputedStyle(sidebar).backgroundColor,
      backdropFilter: window.getComputedStyle(sidebar).backdropFilter,
      borderColor: window.getComputedStyle(sidebar).borderColor,
      borderRadius: window.getComputedStyle(sidebar).borderRadius,
      boxShadow: window.getComputedStyle(sidebar).boxShadow,
      display: window.getComputedStyle(sidebar).display,
      position: window.getComputedStyle(sidebar).position,
    };

    expect(styles).toMatchSnapshot();
  });

  it('sidebar header snapshot matches', () => {
    const styles = {
      backgroundColor: window.getComputedStyle(sidebarHeader).backgroundColor,
      borderBottomColor: window.getComputedStyle(sidebarHeader).borderBottomColor,
      borderBottomWidth: window.getComputedStyle(sidebarHeader).borderBottomWidth,
      padding: window.getComputedStyle(sidebarHeader).padding,
      display: window.getComputedStyle(sidebarHeader).display,
      borderRadius: window.getComputedStyle(sidebarHeader).borderRadius,
    };

    expect(styles).toMatchSnapshot();
  });
});

describe('CSS Snapshots - State Transitions', () => {
  let btn: HTMLButtonElement;

  beforeAll(() => {
    loadCSSContent();
  });

  beforeEach(() => {
    btn = document.createElement('button');
    btn.className = 'review-btn review-btn-primary';
    btn.textContent = 'State Test';
    document.body.appendChild(btn);
  });

  it('button base state snapshot matches', () => {
    const styles = {
      backgroundColor: window.getComputedStyle(btn).backgroundColor,
      boxShadow: window.getComputedStyle(btn).boxShadow,
      transform: window.getComputedStyle(btn).transform,
      cursor: window.getComputedStyle(btn).cursor,
      opacity: window.getComputedStyle(btn).opacity,
    };

    expect(styles).toMatchSnapshot();
  });

  it('button transition property snapshot matches', () => {
    const transition = window.getComputedStyle(btn).transition;

    // Should have transitions defined
    expect(transition).toBeTruthy();
    expect(transition).not.toBe('none');
    expect(transition).toMatchSnapshot();
  });

  it('disabled button state snapshot matches', () => {
    btn.disabled = true;

    const styles = {
      opacity: window.getComputedStyle(btn).opacity,
      cursor: window.getComputedStyle(btn).cursor,
      backgroundColor: window.getComputedStyle(btn).backgroundColor,
      boxShadow: window.getComputedStyle(btn).boxShadow,
    };

    expect(styles).toMatchSnapshot();
  });
});

describe('CSS Snapshots - Color Consistency', () => {
  beforeAll(() => {
    loadCSSContent();
  });

  it('primary buttons use consistent colors', () => {
    const btn1 = document.createElement('button');
    btn1.className = 'review-btn review-btn-primary';
    document.body.appendChild(btn1);

    const btn2 = document.createElement('button');
    btn2.className = 'review-btn review-btn-primary';
    document.body.appendChild(btn2);

    const color1 = window.getComputedStyle(btn1).backgroundColor;
    const color2 = window.getComputedStyle(btn2).backgroundColor;

    expect(color1).toEqual(color2);
  });

  it('secondary buttons use consistent colors', () => {
    const btn1 = document.createElement('button');
    btn1.className = 'review-btn review-btn-secondary';
    document.body.appendChild(btn1);

    const btn2 = document.createElement('button');
    btn2.className = 'review-btn review-btn-secondary';
    document.body.appendChild(btn2);

    const color1 = window.getComputedStyle(btn1).backgroundColor;
    const color2 = window.getComputedStyle(btn2).backgroundColor;

    expect(color1).toEqual(color2);
  });

  it('button shadows use consistent values', () => {
    const btn1 = document.createElement('button');
    btn1.className = 'review-btn review-btn-primary';
    document.body.appendChild(btn1);

    const btn2 = document.createElement('button');
    btn2.className = 'review-btn review-btn-primary';
    document.body.appendChild(btn2);

    const shadow1 = window.getComputedStyle(btn1).boxShadow;
    const shadow2 = window.getComputedStyle(btn2).boxShadow;

    expect(shadow1).toEqual(shadow2);
  });
});

