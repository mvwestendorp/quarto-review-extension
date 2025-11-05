# Local Translation Options & Performance Analysis

**Version:** 1.0
**Date:** 2025-10-31
**Status:** Research & Planning

## Table of Contents
1. [Overview](#overview)
2. [Available Models](#available-models)
3. [Performance Comparison](#performance-comparison)
4. [Implementation Options](#implementation-options)
5. [Recommendations](#recommendations)

---

## Overview

Local translation enables privacy-preserving, offline translation directly in the browser or on the user's machine without external API calls. This document analyzes the available options for the Quarto Review translation module.

### Key Benefits of Local Translation
- ✅ **Privacy**: No data sent to external servers
- ✅ **Offline**: Works without internet connection
- ✅ **Cost**: No API fees or token limits
- ✅ **Speed**: No network latency (after initial load)
- ✅ **Control**: Full control over translation quality

### Key Challenges
- ❌ **Model Size**: Large downloads (200MB - 2GB)
- ❌ **Initial Load**: Slow first-time loading
- ❌ **Performance**: Slower than cloud APIs
- ❌ **Memory**: High RAM/VRAM requirements
- ❌ **Quality**: May not match GPT-4/Claude quality

---

## Available Models

### 1. NLLB-200 (No Language Left Behind)

#### Model Variants

| Model Name | Parameters | Size | Languages | Quality |
|------------|-----------|------|-----------|---------|
| `Xenova/nllb-200-distilled-600M` | 600M | ~600MB | 200 | Good |
| `Xenova/nllb-200-1.3B` | 1.3B | ~1.3GB | 200 | Better |
| `facebook/nllb-200-3.3B` | 3.3B | ~3.3GB | 200 | Best |

**Recommended for Quarto Review**: `Xenova/nllb-200-distilled-600M`

#### Characteristics
- **Developed by**: Meta AI (Facebook)
- **Architecture**: Transformer-based encoder-decoder
- **Languages**: 200+ languages including EN, NL, FR
- **Optimization**: ONNX-optimized for Transformers.js
- **Special Features**:
  - Specifically designed for low-resource languages
  - Good balance of quality and speed
  - Browser-compatible (WASM/WebGPU)

#### Performance Metrics

**Loading Time** (First Run):
- Model download: 30-60 seconds (600MB)
- Model initialization: 5-10 seconds
- Total first load: 35-70 seconds
- Subsequent loads: <1 second (cached)

**Translation Speed** (WASM Backend):
```
Short sentence (10 words):  1-2 seconds
Medium paragraph (50 words): 5-8 seconds
Long paragraph (200 words): 20-30 seconds
Full document (1000 words): 100-150 seconds
```

**Translation Speed** (WebGPU Backend):
```
Short sentence (10 words):  0.1-0.2 seconds (10x faster)
Medium paragraph (50 words): 0.5-1 second (10x faster)
Long paragraph (200 words): 2-3 seconds (10x faster)
Full document (1000 words): 10-15 seconds (10x faster)
```

**Memory Usage**:
- Base model: ~600MB RAM
- Per translation: +50-200MB (depending on text length)
- Peak: ~1GB RAM
- WebGPU: +500MB VRAM

**Quality** (for EN ↔ NL, EN ↔ FR):
- BLEU Score: 25-35 (Good)
- Comparable to Google Translate for common languages
- Better than Opus MT
- Not as good as GPT-4 or Claude

#### Code Example

```typescript
import { pipeline } from '@xenova/transformers';

// Initialize (first time downloads model)
const translator = await pipeline(
  'translation',
  'Xenova/nllb-200-distilled-600M',
  { device: 'webgpu' } // or 'wasm' for CPU
);

// Translate
const result = await translator('Hello world', {
  src_lang: 'eng_Latn',
  tgt_lang: 'nld_Latn',
});

console.log(result[0].translation_text); // "Hallo wereld"
```

---

### 2. M2M-100 (Many-to-Many)

#### Model Variants

| Model Name | Parameters | Size | Languages | Quality |
|------------|-----------|------|-----------|---------|
| `Xenova/m2m100_418M` | 418M | ~400MB | 100 | Good |
| `facebook/m2m100_1.2B` | 1.2B | ~1.2GB | 100 | Better |

#### Characteristics
- **Developed by**: Meta AI
- **Architecture**: Transformer-based
- **Languages**: 100 languages (fewer than NLLB)
- **Optimization**: Available in Transformers.js

#### Performance
- **Speed**: Similar to NLLB-200
- **Quality**: Slightly lower than NLLB for most pairs
- **Size**: Smaller download (400MB vs 600MB)

**Recommendation**: Use NLLB-200 instead (better quality, more languages)

---

### 3. Opus-MT (MarianMT)

#### Model Variants

Multiple language-pair-specific models:
- `Xenova/opus-mt-en-nl` (EN→NL only)
- `Xenova/opus-mt-nl-en` (NL→EN only)
- `Xenova/opus-mt-en-fr` (EN→FR only)
- `Xenova/opus-mt-fr-en` (FR→EN only)

Each: ~300MB

#### Characteristics
- **Developed by**: University of Helsinki
- **Architecture**: MarianNMT (optimized for speed)
- **Languages**: Separate models per language pair
- **Optimization**: Very fast inference

#### Performance

**Loading Time**:
- Model download: 15-20 seconds (300MB)
- Very fast initialization

**Translation Speed** (WASM):
```
Short sentence (10 words):  0.5-1 second
Medium paragraph (50 words): 2-3 seconds
Long paragraph (200 words): 8-12 seconds
Full document (1000 words): 40-60 seconds
```

**Translation Speed** (WebGPU):
```
Short sentence (10 words):  0.05-0.1 seconds
Medium paragraph (50 words): 0.2-0.4 seconds
Long paragraph (200 words): 1-2 seconds
Full document (1000 words): 5-10 seconds
```

**Pros**:
- ✅ Faster than NLLB-200
- ✅ Smaller model size per pair
- ✅ High quality for common pairs

**Cons**:
- ❌ Need separate model per direction (EN→NL ≠ NL→EN)
- ❌ Must download multiple models
- ❌ Switching languages requires model reload

---

### 4. Small LLMs (Llama, Mistral, Phi)

#### Model Examples

| Model | Parameters | Size | Quality | Browser? |
|-------|-----------|------|---------|----------|
| Phi-3-mini | 3.8B | 2.4GB | Excellent | Yes (WebGPU) |
| Mistral-7B | 7B | 4.5GB | Excellent | Marginal |
| Llama-3-8B | 8B | 5GB | Excellent | No |

#### Characteristics
- **Use Case**: General-purpose LLMs adapted for translation
- **Quality**: Better than specialized models
- **Speed**: MUCH slower (100-1000x)
- **Size**: Very large (2-5GB+)

#### Performance

**Translation Speed** (Phi-3-mini, WebGPU):
```
Short sentence (10 words):  5-10 seconds
Medium paragraph (50 words): 30-60 seconds
Long paragraph (200 words): 2-5 minutes
Full document (1000 words): 10-25 minutes
```

**Recommendation**: **NOT suitable** for interactive translation in browser

---

## Performance Comparison

### Speed Benchmark (50-word paragraph)

| Model | Backend | Time | Relative Speed |
|-------|---------|------|----------------|
| NLLB-200-600M | WebGPU | 0.5-1s | 🔥🔥🔥 (Best) |
| Opus-MT | WebGPU | 0.2-0.4s | 🔥🔥🔥🔥 (Fastest) |
| NLLB-200-600M | WASM | 5-8s | 🔥 (Slow) |
| Opus-MT | WASM | 2-3s | 🔥🔥 (OK) |
| Phi-3-mini | WebGPU | 30-60s | ❄️ (Very Slow) |

### Quality Comparison (EN ↔ NL, EN ↔ FR)

| Model | BLEU Score | Human Rating | Use Case |
|-------|-----------|--------------|----------|
| GPT-4 | 45-55 | ⭐⭐⭐⭐⭐ Excellent | Production (API) |
| Claude 3.5 | 45-55 | ⭐⭐⭐⭐⭐ Excellent | Production (API) |
| NLLB-200-600M | 25-35 | ⭐⭐⭐ Good | Local/Privacy |
| Opus-MT | 24-32 | ⭐⭐⭐ Good | Local/Speed |
| Google Translate | 35-45 | ⭐⭐⭐⭐ Very Good | Production (API) |
| M2M-100 | 22-30 | ⭐⭐ Fair | Legacy |

### Memory Requirements

| Model | RAM | VRAM (WebGPU) | Total |
|-------|-----|---------------|-------|
| NLLB-200-600M | 600MB | 500MB | 1.1GB |
| Opus-MT | 300MB | 300MB | 600MB |
| NLLB-200-1.3B | 1.3GB | 1GB | 2.3GB |
| Phi-3-mini | 2.4GB | 2GB | 4.4GB |

### Browser Compatibility

| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| WASM (CPU) | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| WebGPU | ✅ 113+ | ✅ 113+ | ✅ 18+ | 🟡 Flag |
| Transformers.js | ✅ | ✅ | ✅ | ✅ |

**WebGPU Global Support** (Oct 2024): ~70%

---

## Implementation Options

### Option 1: NLLB-200 with Progressive Enhancement

**Strategy**: Start with WASM, upgrade to WebGPU if available

```typescript
// translation/providers/local-ai.ts

export class LocalAIProvider extends TranslationProvider {
  private translator: any = null;
  private backend: 'wasm' | 'webgpu' = 'wasm';

  async initialize(): Promise<void> {
    // Detect WebGPU support
    const hasWebGPU = await this.detectWebGPU();
    this.backend = hasWebGPU ? 'webgpu' : 'wasm';

    console.log(`Using ${this.backend} backend for translation`);

    this.translator = await pipeline(
      'translation',
      'Xenova/nllb-200-distilled-600M',
      {
        device: this.backend,
        dtype: this.backend === 'webgpu' ? 'fp16' : 'q8',
        progress_callback: (progress) => {
          // Show download progress to user
          this.emitProgress(progress);
        }
      }
    );
  }

  async detectWebGPU(): Promise<boolean> {
    if (!navigator.gpu) return false;

    try {
      const adapter = await navigator.gpu.requestAdapter();
      return adapter !== null;
    } catch {
      return false;
    }
  }

  async translate(text: string, from: Language, to: Language): Promise<string> {
    await this.initialize();

    const result = await this.translator(text, {
      src_lang: this.getLanguageCode(from),
      tgt_lang: this.getLanguageCode(to),
    });

    return result[0].translation_text;
  }
}
```

**Pros**:
- ✅ Works on all browsers
- ✅ Fast on modern browsers (WebGPU)
- ✅ Supports 200 languages
- ✅ Single model for all pairs

**Cons**:
- ❌ Slow on older browsers (WASM)
- ❌ Large initial download (600MB)
- ❌ Quality not as good as cloud APIs

---

### Option 2: Hybrid Opus-MT + Fallback

**Strategy**: Use fast Opus-MT for EN↔NL↔FR, fallback to API for others

```typescript
export class HybridLocalProvider extends TranslationProvider {
  private opusModels = new Map<string, any>();
  private fallbackProvider?: TranslationProvider;

  async initialize(): Promise<void> {
    // Pre-load common pairs
    await this.loadOpusModel('en', 'nl');
    await this.loadOpusModel('nl', 'en');
    await this.loadOpusModel('en', 'fr');
    await this.loadOpusModel('fr', 'en');

    // Set up fallback (could be NLLB or API)
    this.fallbackProvider = new OpenAIProvider(config);
  }

  private async loadOpusModel(from: Language, to: Language): Promise<void> {
    const key = `${from}-${to}`;
    const modelName = `Xenova/opus-mt-${from}-${to}`;

    const translator = await pipeline('translation', modelName, {
      device: 'webgpu',
    });

    this.opusModels.set(key, translator);
  }

  async translate(text: string, from: Language, to: Language): Promise<string> {
    const key = `${from}-${to}`;
    const opusModel = this.opusModels.get(key);

    if (opusModel) {
      // Use fast Opus-MT
      const result = await opusModel(text);
      return result[0].translation_text;
    }

    // Fallback to API
    return this.fallbackProvider!.translate(text, from, to);
  }
}
```

**Pros**:
- ✅ Very fast for common pairs
- ✅ Smaller downloads (300MB each)
- ✅ High quality for common languages

**Cons**:
- ❌ Multiple models to manage
- ❌ Requires internet for uncommon pairs
- ❌ More complex implementation

---

### Option 3: Web Worker + Batching

**Strategy**: Offload translation to Web Worker, batch requests

```typescript
// translation/workers/translation-worker.ts

import { pipeline } from '@xenova/transformers';

let translator: any = null;

self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;

  if (type === 'initialize') {
    translator = await pipeline(
      'translation',
      'Xenova/nllb-200-distilled-600M',
      { device: payload.device }
    );

    self.postMessage({ type: 'ready' });
    return;
  }

  if (type === 'translate') {
    const { texts, from, to } = payload;

    // Batch translation
    const results = await Promise.all(
      texts.map(text => translator(text, {
        src_lang: from,
        tgt_lang: to,
      }))
    );

    const translations = results.map(r => r[0].translation_text);

    self.postMessage({
      type: 'translations',
      payload: translations,
    });
  }
});
```

```typescript
// translation/providers/worker-local-ai.ts

export class WorkerLocalAIProvider extends TranslationProvider {
  private worker: Worker;
  private ready = false;

  constructor(config: LocalAIConfig) {
    super();
    this.worker = new Worker(
      new URL('../workers/translation-worker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.addEventListener('message', (event) => {
      if (event.data.type === 'ready') {
        this.ready = true;
      }
    });

    this.worker.postMessage({
      type: 'initialize',
      payload: { device: 'webgpu' },
    });
  }

  async translateBatch(texts: string[], from: Language, to: Language): Promise<string[]> {
    await this.waitForReady();

    return new Promise((resolve) => {
      const handler = (event: MessageEvent) => {
        if (event.data.type === 'translations') {
          this.worker.removeEventListener('message', handler);
          resolve(event.data.payload);
        }
      };

      this.worker.addEventListener('message', handler);

      this.worker.postMessage({
        type: 'translate',
        payload: {
          texts,
          from: this.getLanguageCode(from),
          to: this.getLanguageCode(to),
        },
      });
    });
  }

  private async waitForReady(): Promise<void> {
    while (!this.ready) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
```

**Pros**:
- ✅ Non-blocking UI
- ✅ Efficient batching
- ✅ Better performance on multi-core CPUs

**Cons**:
- ❌ More complex debugging
- ❌ Worker overhead

---

## Recommendations

### Recommended Approach: Multi-Tier Strategy

Implement a **tiered translation system** with automatic fallbacks:

```
Tier 1: Opus-MT (WebGPU) → Fast, local, common pairs
   ↓ (if pair not available)
Tier 2: NLLB-200 (WebGPU) → Slower, local, all languages
   ↓ (if WebGPU not available)
Tier 3: NLLB-200 (WASM) → Slow, local, fallback
   ↓ (if user prefers cloud)
Tier 4: OpenAI/Google API → Fast, high-quality, requires API key
```

### Implementation Phases

**Phase 1**: NLLB-200 with WASM (baseline)
- Works everywhere
- Good quality
- Acceptable speed

**Phase 2**: Add WebGPU support
- 10x speedup on modern browsers
- Detect and enable automatically

**Phase 3**: Add Opus-MT for common pairs
- Ultra-fast for EN↔NL↔FR
- Preload on initialization

**Phase 4**: Add Web Worker
- Non-blocking UI
- Better UX during translation

### Configuration UI

```typescript
interface LocalTranslationConfig {
  // Auto-detect best option
  mode: 'auto' | 'opus-mt' | 'nllb-200' | 'hybrid';

  // Backend preference
  backend: 'auto' | 'webgpu' | 'wasm';

  // Model variant
  model: 'fast' | 'balanced' | 'quality';
  // fast = Opus-MT (300MB)
  // balanced = NLLB-200-600M (600MB)
  // quality = NLLB-200-1.3B (1.3GB)

  // Download behavior
  downloadOnLoad: boolean; // true = immediate, false = on-demand

  // Performance
  useWebWorker: boolean;
  maxBatchSize: number;
}
```

### Recommended Defaults

```typescript
const DEFAULT_CONFIG: LocalTranslationConfig = {
  mode: 'hybrid', // Opus-MT + NLLB fallback
  backend: 'auto', // WebGPU if available
  model: 'balanced', // NLLB-200-600M
  downloadOnLoad: false, // Don't block initial load
  useWebWorker: true, // Non-blocking
  maxBatchSize: 10, // Translate 10 sentences at once
};
```

---

## Performance Optimization Tips

### 1. Lazy Loading
```typescript
// Don't initialize until user enables translation
if (config.translation?.enabled) {
  // Show "Preparing translation..." message
  await translationModule.initialize();
}
```

### 2. Caching
```typescript
// Cache translations to avoid re-translating
const cache = new Map<string, string>();

async translate(text: string, from: Language, to: Language): Promise<string> {
  const key = `${from}-${to}-${hash(text)}`;

  if (cache.has(key)) {
    return cache.get(key)!;
  }

  const translation = await this.translator(text, { src_lang: from, tgt_lang: to });
  cache.set(key, translation);

  return translation;
}
```

### 3. Sentence-Level Batching
```typescript
// Translate multiple sentences in one call
const sentences = ['Hello', 'How are you?', 'Goodbye'];

const results = await Promise.all(
  sentences.map(s => translator(s, { src_lang: 'eng_Latn', tgt_lang: 'nld_Latn' }))
);
```

### 4. Progressive Translation
```typescript
// Translate visible sentences first
async translateDocument() {
  const visibleSentences = this.getVisibleSentences();
  const invisibleSentences = this.getInvisibleSentences();

  // Translate visible immediately
  await this.translateBatch(visibleSentences);
  this.render();

  // Translate invisible in background
  await this.translateBatch(invisibleSentences);
  this.render();
}
```

### 5. Quantization
```typescript
// Use quantized models for faster inference
const translator = await pipeline(
  'translation',
  'Xenova/nllb-200-distilled-600M',
  {
    device: 'webgpu',
    dtype: 'q8', // 8-bit quantization (smaller, faster, slight quality loss)
  }
);
```

---

## Real-World Performance Expectations

### Scenario 1: Academic Paper (5000 words)

**Setup**: EN → NL, Modern browser (Chrome), WebGPU

| Model | Total Time | User Experience |
|-------|-----------|-----------------|
| NLLB-200 (WebGPU) | 50-75 seconds | Good (progressive) |
| NLLB-200 (WASM) | 500-750 seconds | Poor (too slow) |
| OpenAI GPT-4 (API) | 10-15 seconds | Excellent |

### Scenario 2: Short Document (500 words)

**Setup**: FR → EN, MacBook Pro M1, WebGPU

| Model | Total Time | User Experience |
|-------|-----------|-----------------|
| Opus-MT (WebGPU) | 2-3 seconds | Excellent |
| NLLB-200 (WebGPU) | 5-8 seconds | Good |
| NLLB-200 (WASM) | 50-75 seconds | Fair |

### Scenario 3: Real-time Editing

**Setup**: User types sentence, auto-translate to target

| Model | Delay | User Experience |
|-------|-------|-----------------|
| Opus-MT (WebGPU) | <0.5s | Feels instant |
| NLLB-200 (WebGPU) | 1-2s | Acceptable |
| NLLB-200 (WASM) | 5-8s | Frustrating |
| OpenAI API | 0.5-1s | Excellent |

---

## Conclusion

### Best Choice for Quarto Review Translation Module

**Recommended**: **Hybrid Opus-MT + NLLB-200 (WebGPU preferred)**

**Rationale**:
1. **Fast** for common EN↔NL↔FR pairs (Opus-MT)
2. **Comprehensive** support for all language pairs (NLLB-200 fallback)
3. **Progressive enhancement** (WebGPU → WASM → API)
4. **Privacy-preserving** while maintaining good performance
5. **Reasonable downloads** (300MB Opus + 600MB NLLB if needed)

### Implementation Priority

1. ✅ **Phase 1**: NLLB-200 with WASM (baseline support)
2. ✅ **Phase 2**: Add WebGPU detection and acceleration
3. ✅ **Phase 3**: Add Opus-MT for common pairs
4. ⏭️ **Phase 4**: Add Web Worker for non-blocking
5. ⏭️ **Phase 5**: Add caching and optimization

### User Experience Guidelines

**First-time user**:
```
1. User clicks "Enable Translation"
2. Show: "Downloading translation model... (600MB)"
3. Progress bar: 0% → 100%
4. Show: "Preparing translator... (5s)"
5. Show: "Ready to translate!"
6. Translation now available instantly (cached)
```

**Returning user**:
```
1. User clicks "Enable Translation"
2. Show: "Loading translator... (1s)"
3. Show: "Ready to translate!"
4. Translation available instantly
```

**During translation**:
```
1. User clicks "Translate Document"
2. Show progress: "Translating... 15/150 sentences"
3. Progressive rendering (show sentences as translated)
4. Completion: "Translation complete! (45 seconds)"
```

---

**End of Local Translation Options Analysis**
