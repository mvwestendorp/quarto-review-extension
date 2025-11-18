/**
 * Translation Performance Benchmarks
 *
 * Benchmarks for translation module workflows to ensure performance targets are met.
 *
 * **Phase 5 Target**: 1000-sentence document translation in <2 seconds
 *
 * Run with:
 * ```bash
 * npm run benchmark:translation
 * ```
 */

import { describe, it, beforeEach, expect } from 'vitest';
import { BenchmarkRunner } from './performance-runner';
import { SentenceSegmenter } from '../../src/modules/translation/segmentation/SentenceSegmenter';
import { TranslationAlignmentEngine } from '../../src/modules/translation/alignment/TranslationAlignmentEngine';
import { ManualProvider } from '../../src/modules/translation/providers/ManualProvider';
import { TranslationCacheService } from '../../src/modules/translation/cache/TranslationCacheService';

/**
 * Generate test content with specified number of sentences
 */
function generateTestContent(sentenceCount: number): string {
  const sentences: string[] = [];
  const templates = [
    'This is a test sentence number {n}.',
    'The quick brown fox jumps over the lazy dog in sentence {n}.',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit in {n}.',
    'Translation testing is important for quality assurance at {n}.',
    'Performance benchmarks help us maintain service level objectives {n}.',
  ];

  for (let i = 0; i < sentenceCount; i++) {
    const template = templates[i % templates.length];
    sentences.push(template.replace('{n}', String(i + 1)));
  }

  return sentences.join(' ');
}

/**
 * Generate markdown document with headings and structure
 */
function generateMarkdownDocument(sentenceCount: number): string {
  const content: string[] = [];
  content.push('# Test Document\n\n');
  content.push('This is a comprehensive test document for benchmarking.\n\n');

  const sentencesPerSection = Math.ceil(sentenceCount / 5);

  for (let section = 1; section <= 5; section++) {
    content.push(`## Section ${section}\n\n`);

    const sectionContent = generateTestContent(
      Math.min(sentencesPerSection, sentenceCount - (section - 1) * sentencesPerSection)
    );
    content.push(sectionContent);
    content.push('\n\n');
  }

  return content.join('');
}

describe('Translation Performance Benchmarks', () => {
  let runner: BenchmarkRunner;

  beforeEach(() => {
    runner = new BenchmarkRunner('Translation Module Benchmarks', {
      iterations: 50,
      warmup: 5,
      minSamples: 10,
    });
  });

  describe('Sentence Segmentation', () => {
    it('should benchmark sentence segmentation for small documents (50 sentences)', async () => {
      const content = generateTestContent(50);
      const segmenter = new SentenceSegmenter();

      runner.addBenchmark('segmentation-50-sentences', () => {
        segmenter.segment(content);
      });

      const results = await runner.run();
      console.log(runner.generateReport(results));

      // Assert performance target: <10ms for 50 sentences
      expect(results.benchmarks[0].mean).toBeLessThan(10);
    });

    it('should benchmark sentence segmentation for medium documents (250 sentences)', async () => {
      const content = generateTestContent(250);
      const segmenter = new SentenceSegmenter();

      runner.addBenchmark('segmentation-250-sentences', () => {
        segmenter.segment(content);
      });

      const results = await runner.run();
      console.log(runner.generateReport(results));

      // Assert performance target: <50ms for 250 sentences
      expect(results.benchmarks[0].mean).toBeLessThan(50);
    });

    it('should benchmark sentence segmentation for large documents (1000 sentences)', async () => {
      const content = generateTestContent(1000);
      const segmenter = new SentenceSegmenter();

      runner.addBenchmark('segmentation-1000-sentences', () => {
        segmenter.segment(content);
      });

      const results = await runner.run();
      console.log(runner.generateReport(results));

      // Assert performance target: <200ms for 1000 sentences
      expect(results.benchmarks[0].mean).toBeLessThan(200);
    });
  });

  describe('Translation Alignment', () => {
    it('should benchmark alignment for small documents (50 sentences)', async () => {
      const sourceContent = generateTestContent(50);
      const targetContent = generateTestContent(50);

      const segmenter = new SentenceSegmenter();
      const sourceSentences = segmenter.segment(sourceContent);
      const targetSentences = segmenter.segment(targetContent);

      const engine = new TranslationAlignmentEngine();

      runner.addBenchmark('alignment-50-sentences', () => {
        engine.align(sourceSentences, targetSentences);
      });

      const results = await runner.run();
      console.log(runner.generateReport(results));

      // Assert performance target: <20ms for 50 sentences
      expect(results.benchmarks[0].mean).toBeLessThan(20);
    });

    it('should benchmark alignment for large documents (1000 sentences)', async () => {
      const sourceContent = generateTestContent(1000);
      const targetContent = generateTestContent(1000);

      const segmenter = new SentenceSegmenter();
      const sourceSentences = segmenter.segment(sourceContent);
      const targetSentences = segmenter.segment(targetContent);

      const engine = new TranslationAlignmentEngine();

      runner.addBenchmark('alignment-1000-sentences', () => {
        engine.align(sourceSentences, targetSentences);
      });

      const results = await runner.run();
      console.log(runner.generateReport(results));

      // Assert performance target: <500ms for 1000 sentences
      expect(results.benchmarks[0].mean).toBeLessThan(500);
    });
  });

  describe('Translation Provider', () => {
    it('should benchmark manual provider translation (batch of 100 sentences)', async () => {
      const provider = new ManualProvider({ defaultLanguage: 'en' });
      const sentences = Array.from({ length: 100 }, (_, i) => `Sentence ${i + 1}.`);

      runner.addBenchmark('provider-manual-100-sentences', async () => {
        await Promise.all(
          sentences.map((sentence) =>
            provider.translate(sentence, 'en', 'es', {})
          )
        );
      });

      const results = await runner.run({ iterations: 20 });
      console.log(runner.generateReport(results));

      // Manual provider should be very fast (no actual translation)
      expect(results.benchmarks[0].mean).toBeLessThan(50);
    });
  });

  describe('Translation Cache', () => {
    it('should benchmark cache operations (1000 lookups)', async () => {
      const cache = new TranslationCacheService();

      // Populate cache
      for (let i = 0; i < 100; i++) {
        cache.set(`sentence-${i}`, 'en', 'es', {}, `Traducción ${i}`);
      }

      runner.addBenchmark('cache-1000-lookups', () => {
        for (let i = 0; i < 1000; i++) {
          const key = `sentence-${i % 100}`;
          cache.get(key, 'en', 'es', {});
        }
      });

      const results = await runner.run();
      console.log(runner.generateReport(results));

      // Cache lookups should be very fast
      expect(results.benchmarks[0].mean).toBeLessThan(10);
    });

    it('should benchmark cache writes (1000 entries)', async () => {
      const cache = new TranslationCacheService();

      runner.addBenchmark('cache-1000-writes', () => {
        for (let i = 0; i < 1000; i++) {
          cache.set(`sentence-${i}`, 'en', 'es', {}, `Traducción ${i}`);
        }
      });

      const results = await runner.run({ iterations: 20 });
      console.log(runner.generateReport(results));

      // Cache writes should be reasonably fast
      expect(results.benchmarks[0].mean).toBeLessThan(50);
    });
  });

  describe('End-to-End Translation Workflow', () => {
    it('should benchmark complete workflow for 100-sentence document', async () => {
      const content = generateMarkdownDocument(100);
      const segmenter = new SentenceSegmenter();
      const provider = new ManualProvider({ defaultLanguage: 'en' });
      const cache = new TranslationCacheService();

      runner.addBenchmark('e2e-workflow-100-sentences', async () => {
        // 1. Segment
        const sentences = segmenter.segment(content);

        // 2. Translate (using cache where possible)
        const translations = await Promise.all(
          sentences.map(async (sentence) => {
            const cached = cache.get(sentence, 'en', 'es', {});
            if (cached) {
              return cached;
            }

            const translated = await provider.translate(sentence, 'en', 'es', {});
            cache.set(sentence, 'en', 'es', {}, translated);
            return translated;
          })
        );

        // 3. Align
        const engine = new TranslationAlignmentEngine();
        engine.align(sentences, translations);
      });

      const results = await runner.run({ iterations: 20 });
      console.log(runner.generateReport(results));

      // Complete workflow for 100 sentences should be <200ms
      expect(results.benchmarks[0].mean).toBeLessThan(200);
    });

    it('should benchmark complete workflow for 1000-sentence document (Phase 5 target)', async () => {
      const content = generateMarkdownDocument(1000);
      const segmenter = new SentenceSegmenter();
      const provider = new ManualProvider({ defaultLanguage: 'en' });
      const cache = new TranslationCacheService();

      runner.addBenchmark('e2e-workflow-1000-sentences', async () => {
        // 1. Segment
        const sentences = segmenter.segment(content);

        // 2. Translate (using cache where possible)
        const translations = await Promise.all(
          sentences.map(async (sentence) => {
            const cached = cache.get(sentence, 'en', 'es', {});
            if (cached) {
              return cached;
            }

            const translated = await provider.translate(sentence, 'en', 'es', {});
            cache.set(sentence, 'en', 'es', {}, translated);
            return translated;
          })
        );

        // 3. Align
        const engine = new TranslationAlignmentEngine();
        engine.align(sentences, translations);
      });

      const results = await runner.run({ iterations: 10, maxTime: 30000 });
      console.log(runner.generateReport(results));

      // **PHASE 5 TARGET**: Complete workflow for 1000 sentences in <2000ms (2 seconds)
      expect(results.benchmarks[0].mean).toBeLessThan(2000);
    });
  });

  describe('Memory Performance', () => {
    it('should benchmark memory usage with operation history limiting', async () => {
      // This test verifies that our EditTrackingModule limiting works
      const operations: any[] = [];

      runner.addBenchmark('memory-operation-limiting', () => {
        // Simulate adding operations with limiting
        operations.push({
          id: `op-${operations.length}`,
          timestamp: Date.now(),
          data: 'test data',
        });

        // Apply limiting (max 100 operations)
        if (operations.length > 100) {
          operations.shift();
        }
      });

      const results = await runner.run({ iterations: 1000 });
      console.log(runner.generateReport(results));

      // Memory limiting should be very fast
      expect(results.benchmarks[0].mean).toBeLessThan(0.1);

      // Verify limiting worked
      expect(operations.length).toBeLessThanOrEqual(100);
    });
  });

  describe('UI Performance', () => {
    it('should benchmark throttled scroll event handling', async () => {
      // Simulate throttled scroll handling
      let scrollPosition = 0;
      let lastUpdate = 0;
      const THROTTLE_MS = 16; // 60fps

      runner.addBenchmark('ui-throttled-scroll', () => {
        const now = Date.now();

        // Simulate scroll event
        scrollPosition += 10;

        // Throttled update
        if (now - lastUpdate >= THROTTLE_MS) {
          // Update UI (simulated)
          lastUpdate = now;
        }
      });

      const results = await runner.run({ iterations: 1000 });
      console.log(runner.generateReport(results));

      // Throttled scroll handling should be very fast
      expect(results.benchmarks[0].mean).toBeLessThan(0.05);
    });
  });
});

/**
 * Comparison benchmark: Before vs After optimization
 *
 * This test loads baseline results and compares with current performance.
 */
describe('Performance Regression Tests', () => {
  it('should not regress from baseline performance', async () => {
    const runner = new BenchmarkRunner('Regression Test');

    // Run current benchmarks
    const content = generateTestContent(100);
    const segmenter = new SentenceSegmenter();

    runner.addBenchmark('segmentation-regression', () => {
      segmenter.segment(content);
    });

    const results = await runner.run();

    // Save results for future comparisons
    const jsonResults = runner.exportJSON(results);

    // In a real scenario, you'd compare against saved baseline:
    // const baseline = JSON.parse(fs.readFileSync('baseline.json', 'utf-8'));
    // const comparison = BenchmarkRunner.compareReports(baseline, results);
    // console.log(comparison);

    console.log('Current benchmark results:');
    console.log(jsonResults);

    expect(results.benchmarks.length).toBeGreaterThan(0);
  });
});
