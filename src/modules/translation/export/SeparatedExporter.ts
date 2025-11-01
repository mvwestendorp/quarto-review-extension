/**
 * Separated Exporter
 * Creates separate Quarto projects for each language
 */

import { TranslationExportService } from './TranslationExportService';
import type { TranslationDocument, Language } from '../types';
import type {
  TranslationExportOptions,
  TranslationExportFile,
  SeparatedExportOptions,
} from './types';

/**
 * Separated Exporter
 * Exports translation as separate projects for each language
 */
export class SeparatedExporter extends TranslationExportService {
  /**
   * Create separated export files (one project per language)
   */
  protected createSeparatedFiles(
    document: TranslationDocument,
    options: TranslationExportOptions
  ): TranslationExportFile[] {
    const separatedOptions: SeparatedExportOptions = {
      separateProjects: true,
      sharedProject: false,
      directoryStructure: 'nested',
    };

    const files: TranslationExportFile[] = [];
    const languageMode = options.languageMode || 'both';
    const directoryStructure = separatedOptions.directoryStructure || 'nested';

    // Source language project
    if (languageMode === 'both' || languageMode === 'source') {
      files.push(
        ...this.createLanguageProject(
          document,
          document.metadata.sourceLanguage,
          true,
          directoryStructure
        )
      );
    }

    // Target language project
    if (languageMode === 'both' || languageMode === 'target') {
      files.push(
        ...this.createLanguageProject(
          document,
          document.metadata.targetLanguage,
          false,
          directoryStructure
        )
      );
    }

    // Add shared resources if both languages
    if (languageMode === 'both') {
      files.push(this.createRootReadme(document));
      files.push(this.createSharedStyles());
    }

    return files;
  }

  /**
   * Create complete project for a specific language
   */
  protected createLanguageProject(
    document: TranslationDocument,
    language: Language,
    isSource: boolean,
    directoryStructure: 'flat' | 'nested'
  ): TranslationExportFile[] {
    const files: TranslationExportFile[] = [];
    const prefix = directoryStructure === 'nested' ? `${language}/` : '';

    // Get sentences for this language
    const sentences = isSource
      ? document.sourceSentences
      : document.targetSentences;

    // Reconstruct document content
    const content = this.reconstructDocument(sentences, language);

    // Add main QMD file
    files.push({
      filename: `${prefix}${this.primaryFilename}`,
      content,
      language,
      type: 'qmd',
      primary: true,
    });

    // Add Quarto config
    files.push({
      filename: `${prefix}_quarto.yml`,
      content: this.createLanguageQuartoConfig(
        language,
        document,
        directoryStructure
      ),
      language,
      type: 'config',
    });

    // Add index file if not the primary
    if (this.primaryFilename !== 'index.qmd') {
      files.push({
        filename: `${prefix}index.qmd`,
        content: this.createIndexFile(language, document),
        language,
        type: 'qmd',
      });
    }

    // Add styles
    files.push({
      filename: `${prefix}styles.css`,
      content: this.createLanguageStyles(language),
      language,
      type: 'config',
    });

    // Add README
    files.push({
      filename: `${prefix}README.md`,
      content: this.createLanguageReadme(language, document),
      language,
      type: 'config',
    });

    return files;
  }

  /**
   * Create Quarto config for language-specific project
   */
  protected createLanguageQuartoConfig(
    language: Language,
    document: TranslationDocument,
    directoryStructure: 'flat' | 'nested'
  ): string {
    const languageNames: Record<Language, string> = {
      en: 'English',
      nl: 'Nederlands',
      fr: 'Français',
    };

    const otherLanguage =
      language === document.metadata.sourceLanguage
        ? document.metadata.targetLanguage
        : document.metadata.sourceLanguage;

    const otherPath =
      directoryStructure === 'nested'
        ? `../${otherLanguage}/index.html`
        : `index-${otherLanguage}.html`;

    return `project:
  type: website
  output-dir: _site

lang: ${language}

website:
  title: "${this.config.projectName || 'Document'}"
  navbar:
    left:
      - text: Home
        href: index.qmd
      - text: About
        href: about.qmd
    right:
      - icon: translate
        text: ${languageNames[otherLanguage]}
        href: ${otherPath}

format:
  html:
    theme: cosmo
    css: styles.css
    toc: true
    toc-depth: 3
    number-sections: false
    code-fold: true
    code-tools: true

metadata-files:
  - .translation-info.yml
`;
  }

  /**
   * Create index file for language
   */
  protected createIndexFile(
    language: Language,
    document: TranslationDocument
  ): string {
    const languageNames: Record<Language, string> = {
      en: 'English',
      nl: 'Nederlands',
      fr: 'Français',
    };

    return `---
title: "Home"
---

# Welcome

This is the ${languageNames[language]} version of ${this.config.projectName || 'this document'}.

## Contents

- [Main Document](${this.primaryFilename})

## Translation Information

- **Source Language**: ${document.metadata.sourceLanguage}
- **Target Language**: ${document.metadata.targetLanguage}
- **Translation Date**: ${new Date(document.metadata.lastModified).toLocaleDateString()}
- **Sentences**: ${document.metadata.totalSentences}
- **Translated**: ${document.metadata.translatedCount} (${Math.round((document.metadata.translatedCount / document.metadata.totalSentences) * 100)}%)
`;
  }

  /**
   * Create language-specific styles
   */
  protected createLanguageStyles(language: Language): string {
    // Language-specific typography and layout adjustments
    const fonts: Record<Language, string> = {
      en: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      nl: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fr: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    };

    return `/* Styles for ${language} */
body {
  font-family: ${fonts[language]};
  line-height: 1.6;
  color: #333;
}

h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

p {
  margin-bottom: 1em;
}

code {
  background: #f5f5f5;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
}

pre {
  background: #f8f8f8;
  padding: 1em;
  border-radius: 5px;
  overflow-x: auto;
}

blockquote {
  border-left: 4px solid #ddd;
  padding-left: 1em;
  margin-left: 0;
  color: #666;
  font-style: italic;
}

.language-badge {
  display: inline-block;
  padding: 0.25em 0.75em;
  background: #007bff;
  color: white;
  border-radius: 3px;
  font-size: 0.875em;
  font-weight: 500;
  text-transform: uppercase;
}
`;
  }

  /**
   * Create README for language project
   */
  protected createLanguageReadme(
    language: Language,
    document: TranslationDocument
  ): string {
    const languageNames: Record<Language, string> = {
      en: 'English',
      nl: 'Nederlands',
      fr: 'Français',
    };

    const isSource = language === document.metadata.sourceLanguage;
    const otherLanguage = isSource
      ? document.metadata.targetLanguage
      : document.metadata.sourceLanguage;

    return `# ${this.config.projectName || 'Document'} (${languageNames[language]})

${isSource ? 'This is the **source language** version.' : 'This is the **translated** version.'}

## Quick Start

\`\`\`bash
# Preview the website
quarto preview

# Render the website
quarto render
\`\`\`

## Translation Information

- **Language**: ${languageNames[language]}
- **${isSource ? 'Translation to' : 'Translated from'}**: ${languageNames[otherLanguage]}
- **Total Sentences**: ${document.metadata.totalSentences}
- **Translated**: ${document.metadata.translatedCount}
- **Manual Translations**: ${document.metadata.manualCount}
- **Automatic Translations**: ${document.metadata.autoCount}

## Structure

- \`${this.primaryFilename}\` - Main document
- \`_quarto.yml\` - Quarto configuration
- \`styles.css\` - Custom styles
- \`.translation-info.yml\` - Translation metadata

## Other Languages

- [${languageNames[otherLanguage]}](../${otherLanguage}/README.md)

---

*Generated by quarto-review-extension*
`;
  }

  /**
   * Create root README for multi-language project
   */
  protected createRootReadme(
    document: TranslationDocument
  ): TranslationExportFile {
    const languageNames: Record<Language, string> = {
      en: 'English',
      nl: 'Nederlands',
      fr: 'Français',
    };

    const content = `# ${this.config.projectName || 'Multilingual Document Project'}

This is a multilingual Quarto project with separate directories for each language.

## Available Languages

- **${languageNames[document.metadata.sourceLanguage]}** (Source): [\`${document.metadata.sourceLanguage}/\`](./${document.metadata.sourceLanguage}/)
- **${languageNames[document.metadata.targetLanguage]}** (Translation): [\`${document.metadata.targetLanguage}/\`](./${document.metadata.targetLanguage}/)

## Quick Start

### Preview a specific language

\`\`\`bash
# Preview ${languageNames[document.metadata.sourceLanguage]} version
cd ${document.metadata.sourceLanguage}
quarto preview

# Preview ${languageNames[document.metadata.targetLanguage]} version
cd ${document.metadata.targetLanguage}
quarto preview
\`\`\`

### Render all languages

\`\`\`bash
# Render ${languageNames[document.metadata.sourceLanguage]}
cd ${document.metadata.sourceLanguage}
quarto render

# Render ${languageNames[document.metadata.targetLanguage]}
cd ${document.metadata.targetLanguage}
quarto render
\`\`\`

## Project Structure

\`\`\`
.
├── ${document.metadata.sourceLanguage}/                 # ${languageNames[document.metadata.sourceLanguage]} version
│   ├── ${this.primaryFilename}
│   ├── _quarto.yml
│   ├── index.qmd
│   ├── styles.css
│   └── README.md
├── ${document.metadata.targetLanguage}/                 # ${languageNames[document.metadata.targetLanguage]} version
│   ├── ${this.primaryFilename}
│   ├── _quarto.yml
│   ├── index.qmd
│   ├── styles.css
│   └── README.md
├── .translation-metadata.json  # Translation metadata
├── .translation-mapping.json   # Sentence correspondence mapping
├── styles-shared.css           # Shared styles
└── README.md                   # This file
\`\`\`

## Translation Statistics

- **Total Sentences**: ${document.metadata.totalSentences}
- **Translated**: ${document.metadata.translatedCount} (${Math.round((document.metadata.translatedCount / document.metadata.totalSentences) * 100)}%)
- **Manual Translations**: ${document.metadata.manualCount}
- **Automatic Translations**: ${document.metadata.autoCount}
- **Last Modified**: ${new Date(document.metadata.lastModified).toLocaleString()}

## Metadata Files

- \`.translation-metadata.json\` - Complete translation metadata including all sentences
- \`.translation-mapping.json\` - Correspondence mapping between source and target sentences

## Development

Each language directory is a standalone Quarto website project. You can:

1. Add new pages to each language directory
2. Customize \`_quarto.yml\` for each language
3. Share resources by symlinking or copying between directories
4. Use the metadata files to maintain correspondence between languages

---

*Generated by quarto-review-extension translation export*
`;

    return {
      filename: 'README.md',
      content,
      language: document.metadata.sourceLanguage,
      type: 'config',
    };
  }

  /**
   * Create shared styles for all languages
   */
  protected createSharedStyles(): TranslationExportFile {
    const content = `/* Shared styles for all language versions */

:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --success-color: #28a745;
  --info-color: #17a2b8;
  --warning-color: #ffc107;
  --danger-color: #dc3545;
  --light-color: #f8f9fa;
  --dark-color: #343a40;
}

/* Language switcher */
.language-switcher {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  background: white;
  padding: 0.5rem;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.language-switcher a {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  margin: 0 0.25rem;
  text-decoration: none;
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
  border-radius: 3px;
  transition: all 0.2s;
}

.language-switcher a:hover {
  background: var(--primary-color);
  color: white;
}

/* Translation info box */
.translation-info {
  background: var(--light-color);
  padding: 1rem;
  border-left: 4px solid var(--info-color);
  margin: 1.5rem 0;
  border-radius: 4px;
}

.translation-info h4 {
  margin-top: 0;
  color: var(--info-color);
}

.translation-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.stat-item {
  text-align: center;
  padding: 0.5rem;
  background: white;
  border-radius: 4px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary-color);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--secondary-color);
  margin-top: 0.25rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .language-switcher {
    position: static;
    margin-bottom: 1rem;
  }

  .translation-stats {
    grid-template-columns: 1fr;
  }
}
`;

    return {
      filename: 'styles-shared.css',
      content,
      language: 'en',
      type: 'config',
    };
  }
}

export default SeparatedExporter;
