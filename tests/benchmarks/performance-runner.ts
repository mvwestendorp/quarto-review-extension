/**
 * Performance Benchmark Runner
 *
 * Provides infrastructure for running and reporting performance benchmarks.
 * Integrates with Vitest's benchmark capabilities and provides custom reporting.
 *
 * Usage:
 * ```typescript
 * const runner = new BenchmarkRunner('Translation Benchmarks');
 * runner.addBenchmark('translateDocument', async () => {
 *   await translateDocument(content);
 * });
 * const results = await runner.run();
 * console.log(runner.generateReport(results));
 * ```
 */

export interface BenchmarkOptions {
  /**
   * Number of iterations to run (default: 100)
   */
  iterations?: number;

  /**
   * Warmup iterations before measuring (default: 10)
   */
  warmup?: number;

  /**
   * Maximum time to run benchmark in ms (default: 10000)
   */
  maxTime?: number;

  /**
   * Minimum sample size (default: 5)
   */
  minSamples?: number;
}

export interface BenchmarkResult {
  name: string;
  samples: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
  stdDev: number;
  margin: number;
  rme: number; // Relative margin of error
  hz: number; // Operations per second
}

export interface BenchmarkSuite {
  name: string;
  benchmarks: BenchmarkResult[];
  totalTime: number;
  timestamp: string;
}

/**
 * Calculate statistical metrics from samples
 */
function calculateStats(samples: number[]): Omit<BenchmarkResult, 'name'> {
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;

  const mean = sorted.reduce((sum, val) => sum + val, 0) / n;
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  const min = sorted[0];
  const max = sorted[n - 1];
  const p95 = sorted[Math.floor(n * 0.95)] || max;
  const p99 = sorted[Math.floor(n * 0.99)] || max;

  // Standard deviation
  const variance = sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // Margin of error (95% confidence interval)
  const margin = 1.96 * (stdDev / Math.sqrt(n));
  const rme = (margin / mean) * 100;

  // Operations per second
  const hz = 1000 / mean;

  return {
    samples: n,
    mean,
    median,
    min,
    max,
    p95,
    p99,
    stdDev,
    margin,
    rme,
    hz,
  };
}

/**
 * Format time in human-readable format
 */
function formatTime(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}μs`;
  } else if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  } else {
    return `${(ms / 1000).toFixed(2)}s`;
  }
}

/**
 * Format operations per second
 */
function formatHz(hz: number): string {
  if (hz < 1) {
    return `${hz.toFixed(2)} ops/sec`;
  } else if (hz < 1000) {
    return `${hz.toFixed(0)} ops/sec`;
  } else if (hz < 1000000) {
    return `${(hz / 1000).toFixed(2)}k ops/sec`;
  } else {
    return `${(hz / 1000000).toFixed(2)}M ops/sec`;
  }
}

/**
 * Benchmark runner for performance testing
 */
export class BenchmarkRunner {
  private suiteName: string;
  private benchmarks: Map<string, () => Promise<void> | void> = new Map();
  private defaultOptions: BenchmarkOptions;

  constructor(suiteName: string, defaultOptions: BenchmarkOptions = {}) {
    this.suiteName = suiteName;
    this.defaultOptions = {
      iterations: 100,
      warmup: 10,
      maxTime: 10000,
      minSamples: 5,
      ...defaultOptions,
    };
  }

  /**
   * Add a benchmark to the suite
   */
  addBenchmark(name: string, fn: () => Promise<void> | void): void {
    this.benchmarks.set(name, fn);
  }

  /**
   * Run a single benchmark
   */
  private async runBenchmark(
    name: string,
    fn: () => Promise<void> | void,
    options: BenchmarkOptions
  ): Promise<BenchmarkResult> {
    const {
      iterations = 100,
      warmup = 10,
      maxTime = 10000,
      minSamples = 5,
    } = { ...this.defaultOptions, ...options };

    const samples: number[] = [];

    // Warmup phase
    for (let i = 0; i < warmup; i++) {
      await fn();
    }

    // Measurement phase
    const startTime = Date.now();
    let currentIterations = 0;

    while (
      currentIterations < iterations &&
      (Date.now() - startTime) < maxTime &&
      samples.length < iterations
    ) {
      const iterationStart = performance.now();
      await fn();
      const iterationEnd = performance.now();

      samples.push(iterationEnd - iterationStart);
      currentIterations++;
    }

    // Ensure minimum sample size
    if (samples.length < minSamples) {
      throw new Error(
        `Benchmark "${name}" completed with only ${samples.length} samples (minimum: ${minSamples})`
      );
    }

    const stats = calculateStats(samples);

    return {
      name,
      ...stats,
    };
  }

  /**
   * Run all benchmarks in the suite
   */
  async run(options: BenchmarkOptions = {}): Promise<BenchmarkSuite> {
    const results: BenchmarkResult[] = [];
    const suiteStartTime = Date.now();

    for (const [name, fn] of this.benchmarks) {
      console.log(`Running benchmark: ${name}...`);
      const result = await this.runBenchmark(name, fn, options);
      results.push(result);
      console.log(`  ✓ ${formatTime(result.mean)} (±${result.rme.toFixed(2)}%)`);
    }

    const totalTime = Date.now() - suiteStartTime;

    return {
      name: this.suiteName,
      benchmarks: results,
      totalTime,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate a text report from benchmark results
   */
  generateReport(suite: BenchmarkSuite): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('='.repeat(80));
    lines.push(`Benchmark Suite: ${suite.name}`);
    lines.push(`Timestamp: ${suite.timestamp}`);
    lines.push(`Total Time: ${formatTime(suite.totalTime)}`);
    lines.push('='.repeat(80));
    lines.push('');

    // Find the longest benchmark name for alignment
    const maxNameLength = Math.max(
      ...suite.benchmarks.map((b) => b.name.length),
      10
    );

    // Table header
    lines.push(
      `${'Benchmark'.padEnd(maxNameLength)} | ` +
      'Mean'.padStart(12) + ' | ' +
      'Median'.padStart(12) + ' | ' +
      'P95'.padStart(12) + ' | ' +
      'P99'.padStart(12) + ' | ' +
      'Ops/sec'.padStart(15) + ' | ' +
      'RME'.padStart(8)
    );
    lines.push('-'.repeat(maxNameLength + 90));

    // Table rows
    for (const result of suite.benchmarks) {
      lines.push(
        `${result.name.padEnd(maxNameLength)} | ` +
        formatTime(result.mean).padStart(12) + ' | ' +
        formatTime(result.median).padStart(12) + ' | ' +
        formatTime(result.p95).padStart(12) + ' | ' +
        formatTime(result.p99).padStart(12) + ' | ' +
        formatHz(result.hz).padStart(15) + ' | ' +
        `±${result.rme.toFixed(2)}%`.padStart(8)
      );
    }

    lines.push('');
    lines.push('='.repeat(80));
    lines.push('');

    // Detailed statistics
    lines.push('Detailed Statistics:');
    lines.push('');

    for (const result of suite.benchmarks) {
      lines.push(`${result.name}:`);
      lines.push(`  Samples:       ${result.samples}`);
      lines.push(`  Mean:          ${formatTime(result.mean)}`);
      lines.push(`  Median:        ${formatTime(result.median)}`);
      lines.push(`  Min:           ${formatTime(result.min)}`);
      lines.push(`  Max:           ${formatTime(result.max)}`);
      lines.push(`  P95:           ${formatTime(result.p95)}`);
      lines.push(`  P99:           ${formatTime(result.p99)}`);
      lines.push(`  Std Dev:       ${formatTime(result.stdDev)}`);
      lines.push(`  Margin:        ±${formatTime(result.margin)} (±${result.rme.toFixed(2)}%)`);
      lines.push(`  Ops/sec:       ${formatHz(result.hz)}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Export results as JSON
   */
  exportJSON(suite: BenchmarkSuite): string {
    return JSON.stringify(suite, null, 2);
  }

  /**
   * Compare two benchmark suites and generate a comparison report
   */
  static compareReports(baseline: BenchmarkSuite, current: BenchmarkSuite): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('='.repeat(80));
    lines.push(`Benchmark Comparison: ${current.name}`);
    lines.push(`Baseline: ${baseline.timestamp}`);
    lines.push(`Current:  ${current.timestamp}`);
    lines.push('='.repeat(80));
    lines.push('');

    const maxNameLength = Math.max(
      ...current.benchmarks.map((b) => b.name.length),
      10
    );

    // Table header
    lines.push(
      `${'Benchmark'.padEnd(maxNameLength)} | ` +
      'Baseline'.padStart(12) + ' | ' +
      'Current'.padStart(12) + ' | ' +
      'Change'.padStart(12) + ' | ' +
      'Status'.padStart(10)
    );
    lines.push('-'.repeat(maxNameLength + 60));

    // Compare benchmarks
    for (const currentBench of current.benchmarks) {
      const baselineBench = baseline.benchmarks.find(
        (b) => b.name === currentBench.name
      );

      if (!baselineBench) {
        lines.push(
          `${currentBench.name.padEnd(maxNameLength)} | ` +
          'N/A'.padStart(12) + ' | ' +
          formatTime(currentBench.mean).padStart(12) + ' | ' +
          'N/A'.padStart(12) + ' | ' +
          'NEW'.padStart(10)
        );
        continue;
      }

      const changePercent =
        ((currentBench.mean - baselineBench.mean) / baselineBench.mean) * 100;

      let status: string;
      if (Math.abs(changePercent) < 5) {
        status = '~';
      } else if (changePercent < 0) {
        status = `✓ ${Math.abs(changePercent).toFixed(1)}% faster`;
      } else {
        status = `✗ ${changePercent.toFixed(1)}% slower`;
      }

      lines.push(
        `${currentBench.name.padEnd(maxNameLength)} | ` +
        formatTime(baselineBench.mean).padStart(12) + ' | ' +
        formatTime(currentBench.mean).padStart(12) + ' | ' +
        `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`.padStart(12) + ' | ' +
        status.padStart(10)
      );
    }

    lines.push('');
    lines.push('='.repeat(80));
    lines.push('');

    return lines.join('\n');
  }
}

/**
 * Simple benchmark function for quick one-off measurements
 */
export async function benchmark(
  name: string,
  fn: () => Promise<void> | void,
  options: BenchmarkOptions = {}
): Promise<BenchmarkResult> {
  const runner = new BenchmarkRunner('Quick Benchmark');
  runner.addBenchmark(name, fn);
  const suite = await runner.run(options);
  return suite.benchmarks[0];
}
