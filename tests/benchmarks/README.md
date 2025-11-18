# Performance Benchmarks

This directory contains performance benchmarks for the Quarto Review Extension, with a focus on translation module performance.

## Overview

The benchmark suite provides:
- **Statistical analysis**: Mean, median, P95, P99, standard deviation
- **Performance targets**: Automated assertions for service level objectives
- **Regression testing**: Compare current performance against baselines
- **Detailed reporting**: Human-readable and JSON output formats

## Running Benchmarks

### All Benchmarks

```bash
npm run benchmark
```

### Translation-Specific Benchmarks

```bash
npm run benchmark:translation
```

### Individual Benchmark Files

```bash
npx vitest run tests/benchmarks/translation-performance.bench.ts
```

## Benchmark Suites

### Translation Performance (`translation-performance.bench.ts`)

Comprehensive benchmarks for translation workflows:

1. **Sentence Segmentation**
   - Small documents (50 sentences): <10ms
   - Medium documents (250 sentences): <50ms
   - Large documents (1000 sentences): <200ms

2. **Translation Alignment**
   - Small documents (50 sentences): <20ms
   - Large documents (1000 sentences): <500ms

3. **Translation Provider**
   - Manual provider batch (100 sentences): <50ms

4. **Translation Cache**
   - 1000 cache lookups: <10ms
   - 1000 cache writes: <50ms

5. **End-to-End Workflow**
   - 100-sentence document: <200ms
   - **1000-sentence document (Phase 5 target): <2000ms**

6. **Memory Performance**
   - Operation history limiting verification

7. **UI Performance**
   - Throttled scroll event handling: <0.05ms per event

## Performance Targets

### Phase 5 Targets (Launch Readiness)

| Metric | Target | Test |
|--------|--------|------|
| 1000-sentence translation | <2s | e2e-workflow-1000-sentences |
| Sentence segmentation (1000) | <200ms | segmentation-1000-sentences |
| Alignment (1000) | <500ms | alignment-1000-sentences |
| Cache lookup (1000) | <10ms | cache-1000-lookups |

### Memory Targets

| Metric | Target | Test |
|--------|--------|------|
| Operation history | ≤100 operations | memory-operation-limiting |
| Redo stack | ≤50 operations | (EditTrackingModule) |

### UI Performance Targets

| Metric | Target | Test |
|--------|--------|------|
| Scroll event handling | <0.1ms | ui-throttled-scroll |
| Scroll synchronization | 16ms (60fps) | (TranslationView) |

## Writing New Benchmarks

### Basic Example

```typescript
import { describe, it, expect } from 'vitest';
import { BenchmarkRunner } from './performance-runner';

describe('My Benchmark Suite', () => {
  it('should benchmark my operation', async () => {
    const runner = new BenchmarkRunner('My Operation Benchmarks');

    runner.addBenchmark('operation-name', () => {
      // Code to benchmark
      myOperation();
    });

    const results = await runner.run();
    console.log(runner.generateReport(results));

    // Assert performance target
    expect(results.benchmarks[0].mean).toBeLessThan(100); // <100ms
  });
});
```

### Async Operations

```typescript
runner.addBenchmark('async-operation', async () => {
  await myAsyncOperation();
});
```

### Custom Options

```typescript
const results = await runner.run({
  iterations: 50,       // Run 50 times
  warmup: 10,          // 10 warmup runs
  maxTime: 10000,      // Stop after 10 seconds
  minSamples: 5,       // Minimum 5 samples
});
```

## Benchmark Reports

### Console Output

```
================================================================================
Benchmark Suite: Translation Module Benchmarks
Timestamp: 2024-01-15T10:30:00.000Z
Total Time: 5234.56ms
================================================================================

Benchmark                        |         Mean |       Median |          P95 |          P99 |        Ops/sec |      RME
-----------------------------------------------------------------------------------------------------------------------------
segmentation-50-sentences        |      8.45ms |      8.32ms |      9.12ms |      9.45ms |     118.34 ops/sec |   ±2.34%
alignment-1000-sentences         |    425.67ms |    422.31ms |    455.23ms |    467.89ms |       2.35 ops/sec |   ±3.12%
e2e-workflow-1000-sentences      |   1834.23ms |   1825.45ms |   1912.34ms |   1945.67ms |       0.55 ops/sec |   ±2.89%

================================================================================
```

### JSON Export

```typescript
const results = await runner.run();
const json = runner.exportJSON(results);
fs.writeFileSync('benchmark-results.json', json);
```

### Comparison Reports

```typescript
const baseline = JSON.parse(fs.readFileSync('baseline.json', 'utf-8'));
const current = await runner.run();
const comparison = BenchmarkRunner.compareReports(baseline, current);
console.log(comparison);
```

Output:
```
================================================================================
Benchmark Comparison: Translation Module Benchmarks
Baseline: 2024-01-01T00:00:00.000Z
Current:  2024-01-15T10:30:00.000Z
================================================================================

Benchmark                        |     Baseline |      Current |       Change |     Status
-----------------------------------------------------------------------------------------------------------------------------
segmentation-1000-sentences      |    245.32ms |    198.45ms |      -19.1% | ✓ 19.1% faster
e2e-workflow-1000-sentences      |   2145.67ms |   1834.23ms |      -14.5% | ✓ 14.5% faster

================================================================================
```

## CI/CD Integration

Benchmarks should be run:
- **Before releases** to verify performance targets
- **After major refactoring** to detect regressions
- **Weekly** to track performance trends

### GitHub Actions Example

```yaml
- name: Run performance benchmarks
  run: npm run benchmark

- name: Upload benchmark results
  uses: actions/upload-artifact@v4
  with:
    name: benchmark-results
    path: benchmark-results.json
```

## Performance Optimization Guidelines

### When to Optimize

1. **Benchmark shows regression** (>10% slower than baseline)
2. **User-reported performance issues**
3. **Performance target not met** (e.g., 1000-sentence target)

### Optimization Strategies

1. **Algorithmic improvements**
   - Use more efficient algorithms (e.g., binary search vs linear)
   - Reduce time complexity

2. **Caching**
   - Cache expensive computations
   - Use memoization for pure functions

3. **Batching**
   - Batch DOM operations
   - Batch API calls

4. **Throttling/Debouncing**
   - Throttle high-frequency events (scroll, resize)
   - Debounce user input

5. **Lazy loading**
   - Virtualize long lists
   - Load data on demand

6. **Memory management**
   - Limit operation history
   - Clean up event listeners
   - Use WeakMap/WeakSet for caches

### Profiling Tools

- **Chrome DevTools Performance**: Profile browser performance
- **Node.js --inspect**: Profile Node.js code
- **Vitest --reporter=verbose**: See test execution times

## Troubleshooting

### Benchmark Fails with "Insufficient Samples"

Increase `maxTime` or decrease `minSamples`:

```typescript
const results = await runner.run({
  maxTime: 30000,  // 30 seconds
  minSamples: 3,   // Minimum 3 samples
});
```

### Benchmark is Too Slow

Reduce iterations for expensive operations:

```typescript
const results = await runner.run({
  iterations: 10,  // Only 10 iterations
  warmup: 2,       // Minimal warmup
});
```

### High Variability (RME > 10%)

- Increase sample size
- Close other applications
- Run on dedicated hardware
- Check for background processes

## References

- **Performance.now()**: High-resolution timing API
- **Statistical methods**: Mean, median, percentiles, standard deviation
- **Vitest benchmarking**: https://vitest.dev/guide/features.html#benchmarking

## Contributing

When adding new features:

1. Write benchmarks for critical paths
2. Set performance targets based on user expectations
3. Run benchmarks before and after optimization
4. Document expected performance in code comments
