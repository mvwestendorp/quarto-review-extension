/**
 * Unified Exporter
 * Creates a single Quarto project with language conditionals
 */

import { TranslationExportService } from './TranslationExportService';
import type {
  TranslationDocument,
  Sentence,
  TranslationPair,
  Language,
} from '../types';
import type {
  TranslationExportOptions,
  TranslationExportFile,
  UnifiedExportOptions,
} from './types';

/**
 * Unified Exporter
 * Exports translation as a single Quarto project with conditional content
 */
export class UnifiedExporter extends TranslationExportService {
  /**
   * Create unified export files with Quarto conditionals
   */
  protected createUnifiedFiles(
    document: TranslationDocument,
    options: TranslationExportOptions
  ): TranslationExportFile[] {
    const unifiedOptions: UnifiedExportOptions = {
      useConditionals: true,
      conditionalStyle: 'shortcodes',
      includeBothLanguages: true,
    };

    const languageMode = options.languageMode || 'both';

    // If only one language requested, use base implementation
    if (languageMode !== 'both') {
      return super.createUnifiedFiles(document, options);
    }

    // Create single file with both languages using conditionals
    const content = this.createConditionalDocument(
      document,
      unifiedOptions.conditionalStyle || 'shortcodes'
    );

    const files: TranslationExportFile[] = [
      {
        filename: this.primaryFilename,
        content,
        language: document.metadata.sourceLanguage,
        type: 'qmd',
        primary: true,
      },
    ];

    // Add Quarto config with language profiles
    files.push(this.createMultiLanguageQuartoConfig(document));

    return files;
  }

  /**
   * Create document with conditional content for both languages
   */
  protected createConditionalDocument(
    document: TranslationDocument,
    style: 'shortcodes' | 'divs'
  ): string {
    const sections: string[] = [];

    // Add YAML header with language configuration
    sections.push(this.createYAMLHeader(document));
    sections.push('');

    // Pair source and target sentences
    const pairs = document.correspondenceMap.pairs;

    // Group by element
    const elementGroups = this.groupPairsByElement(
      pairs,
      document.sourceSentences,
      document.targetSentences
    );

    // Create conditional content for each element
    elementGroups.forEach((group) => {
      const conditionalContent = this.createConditionalElement(
        group.sourceSentences,
        group.targetSentences,
        document.metadata.sourceLanguage,
        document.metadata.targetLanguage,
        style
      );
      sections.push(conditionalContent);
      sections.push('');
    });

    return sections.join('\n');
  }

  /**
   * Create YAML header with language configuration
   */
  protected createYAMLHeader(document: TranslationDocument): string {
    return `---
title: "${this.config.projectName || 'Multilingual Document'}"
lang: ${document.metadata.sourceLanguage}
format:
  html:
    toc: true
    code-fold: true
---`;
  }

  /**
   * Create conditional element (paragraph) with both language versions
   */
  protected createConditionalElement(
    sourceSentences: Sentence[],
    targetSentences: Sentence[],
    sourceLanguage: Language,
    targetLanguage: Language,
    style: 'shortcodes' | 'divs'
  ): string {
    const sourceText = sourceSentences.map((s) => s.content).join(' ');
    const targetText = targetSentences.map((s) => s.content).join(' ');

    if (style === 'shortcodes') {
      return this.createShortcodeConditional(
        sourceText,
        targetText,
        sourceLanguage,
        targetLanguage
      );
    } else {
      return this.createDivConditional(
        sourceText,
        targetText,
        sourceLanguage,
        targetLanguage
      );
    }
  }

  /**
   * Create conditional using Quarto shortcodes
   */
  protected createShortcodeConditional(
    sourceText: string,
    targetText: string,
    sourceLanguage: Language,
    targetLanguage: Language
  ): string {
    // Use Quarto's {{< content >}} shortcodes with language conditionals
    // This requires custom Quarto extension for language switching
    return `{{< lang-switch ${sourceLanguage}="${sourceText}" ${targetLanguage}="${targetText}" >}}`;
  }

  /**
   * Create conditional using Quarto divs
   */
  protected createDivConditional(
    sourceText: string,
    targetText: string,
    sourceLanguage: Language,
    targetLanguage: Language
  ): string {
    // Use Quarto div syntax with conditional classes
    return `::: {.content-${sourceLanguage} .lang-${sourceLanguage}}
${sourceText}
:::

::: {.content-${targetLanguage} .lang-${targetLanguage}}
${targetText}
:::`;
  }

  /**
   * Group translation pairs by element
   */
  protected groupPairsByElement(
    pairs: TranslationPair[],
    sourceSentences: Sentence[],
    targetSentences: Sentence[]
  ): Array<{
    elementId: string;
    sourceSentences: Sentence[];
    targetSentences: Sentence[];
  }> {
    const sourceMap = new Map<string, Sentence>();
    const targetMap = new Map<string, Sentence>();

    sourceSentences.forEach((s) => sourceMap.set(s.id, s));
    targetSentences.forEach((s) => targetMap.set(s.id, s));

    const elementGroups = new Map<
      string,
      {
        elementId: string;
        sourceSentences: Sentence[];
        targetSentences: Sentence[];
      }
    >();

    pairs.forEach((pair) => {
      const source = sourceMap.get(pair.sourceId);
      const target = targetMap.get(pair.targetId);

      if (!source || !target) return;

      const elementId = source.elementId;

      let group = elementGroups.get(elementId);
      if (!group) {
        group = {
          elementId,
          sourceSentences: [],
          targetSentences: [],
        };
        elementGroups.set(elementId, group);
      }

      // Avoid duplicates
      if (!group.sourceSentences.find((s) => s.id === source.id)) {
        group.sourceSentences.push(source);
      }
      if (!group.targetSentences.find((s) => s.id === target.id)) {
        group.targetSentences.push(target);
      }
    });

    // Sort sentences within each group
    elementGroups.forEach((group) => {
      group.sourceSentences.sort((a, b) => a.startOffset - b.startOffset);
      group.targetSentences.sort((a, b) => a.startOffset - b.startOffset);
    });

    return Array.from(elementGroups.values());
  }

  /**
   * Create multi-language Quarto config with profiles
   */
  protected createMultiLanguageQuartoConfig(
    document: TranslationDocument
  ): TranslationExportFile {
    const sourceLanguage = document.metadata.sourceLanguage;
    const targetLanguage = document.metadata.targetLanguage;

    const languageNames: Record<Language, string> = {
      en: 'English',
      nl: 'Nederlands',
      fr: 'Français',
    };

    const config = `project:
  type: website
  output-dir: _site

# Default language
lang: ${sourceLanguage}

website:
  title: "${this.config.projectName || 'Multilingual Document'}"
  navbar:
    left:
      - text: Home
        href: index.qmd
      - text: ${languageNames[sourceLanguage]}
        href: index.qmd
      - text: ${languageNames[targetLanguage]}
        href: index.qmd?lang=${targetLanguage}

format:
  html:
    theme: cosmo
    css:
      - styles.css
      - lang-styles.css
    toc: true
    include-in-header:
      - text: |
          <script>
          // Language switcher
          const urlParams = new URLSearchParams(window.location.search);
          const lang = urlParams.get('lang') || '${sourceLanguage}';
          document.documentElement.lang = lang;

          // Hide/show content based on language
          document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('[class*="content-"]').forEach(el => {
              if (el.classList.contains(\`content-\${lang}\`)) {
                el.style.display = 'block';
              } else {
                el.style.display = 'none';
              }
            });
          });
          </script>
`;

    return {
      filename: '_quarto.yml',
      content: config,
      language: sourceLanguage,
      type: 'config',
    };
  }

  /**
   * Create CSS for language switching
   */
  protected createLanguageSwitcherCSS(document: TranslationDocument): string {
    return `/* Language switcher styles */
[class*="content-"] {
  display: none;
}

html[lang="${document.metadata.sourceLanguage}"] .content-${document.metadata.sourceLanguage},
html[lang="${document.metadata.targetLanguage}"] .content-${document.metadata.targetLanguage} {
  display: block;
}

.lang-switcher {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.lang-switcher button {
  margin: 0 0.25rem;
  padding: 0.25rem 0.75rem;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 3px;
}

.lang-switcher button:hover {
  background: #f5f5f5;
}

.lang-switcher button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}
`;
  }
}

export default UnifiedExporter;
