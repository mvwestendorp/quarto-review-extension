# Feature #12: AI-Powered Suggestions - Holistic Integration Plan

## Overview
Integrate AI capabilities for document review automation: grammar checking, style suggestions, duplicate content detection, readability analysis, and smart formatting recommendations.

**Key Philosophy:** Multiple deployment options to serve different organizational needs (privacy-first, cost-effective, enterprise-ready).

---

## Use Cases & AI Capabilities

### 1. Grammar & Spell Check
**Use Case:** Pre-review QA, catch typos before submission

**AI Tasks:**
- Spell checking (Levenshtein distance or ML-based)
- Grammar error detection (subject-verb agreement, tense consistency)
- Punctuation correction

**Suggestions:** Quick-fix buttons inline or batch-apply

**Example:**
```
Original: "The data shows they is wrong"
Suggestion: "The data shows they are wrong"
Confidence: 98%
```

### 2. Style Recommendations
**Use Case:** Improve readability and consistency

**AI Tasks:**
- Passive voice detection → suggest active voice
- Readability level (Flesch-Kincaid, CEFR)
- Word choice optimization (too formal, too casual)
- Redundancy detection (repeated phrases)
- Sentence length analysis

**Example:**
```
Original: "A determination was made by the team..."
Suggestion: "The team determined..."
Issue: Passive voice reduces clarity
Readability: 8th grade (consider simplifying)
```

### 3. Duplicate Content Detection
**Use Case:** Avoid repetition within document

**AI Tasks:**
- Semantic similarity (embeddings-based)
- Near-duplicate paragraph detection
- Section summary comparison

**Example:**
```
Paragraph 15 and Paragraph 42 discuss similar concepts.
Similarity: 87%
Suggestion: Consider consolidating or linking
```

### 4. Content Summary Generation
**Use Case:** Quick understanding of section purpose

**AI Tasks:**
- Auto-generate section summaries (abstractive summarization)
- Key points extraction

### 5. Readability Analysis
**Use Case:** Ensure document is accessible

**AI Tasks:**
- Flesch Reading Ease score
- Gunning Fog index
- CEFR level assessment
- Complexity recommendations

---

## Deployment Architecture: Three Options

### Option 1: Local Models (Privacy-First, Offline)

#### Recommended Tech Stack
- **Framework:** Transformers.js (ONNX.js runtime in browser)
- **Models:**
  - Grammar: `google/flan-t5-base` (quantized, ~200 MB)
  - Spell check: `bert-base-multilingual-cased` + custom layer
  - Embeddings: `sentence-transformers/all-MiniLM-L6-v2` (~25 MB)

#### Architecture Diagram
```
┌─────────────────────────────────────────┐
│  Browser (Quarto Review Extension)      │
├─────────────────────────────────────────┤
│                                          │
│  UI Layer (Suggestions Panel)            │
│  ↓                                       │
│  AI Service (Web Worker)                 │
│  ├─ Grammar checker (transformers.js)   │
│  ├─ Embeddings generator (sentence-bert)│
│  ├─ Readability analyzer                │
│  └─ Spell checker (fuzzy matching)      │
│  ↓                                       │
│  ONNX Runtime (WebAssembly)             │
│  ↓                                       │
│  Quantized Models (~300 MB total)       │
│                                          │
└─────────────────────────────────────────┘
```

#### Advantages
✅ **Privacy:** No data leaves the device
✅ **Offline:** Works without internet
✅ **Zero latency:** Instant suggestions
✅ **No API costs:** Free to operate
✅ **GDPR/HIPAA compliant:** No external processing
✅ **User control:** Models downloaded once, cached locally

#### Disadvantages
❌ **Large bundle:** ~300 MB models + runtime
❌ **Slow first load:** Models download on first use
❌ **Less accurate:** Smaller models than server-based
❌ **Limited capabilities:** Can't do complex reasoning
❌ **Device dependent:** Needs modern browser (ES2020)
❌ **Browser memory:** Uses 500-800 MB RAM when active

#### Implementation Example

```typescript
// src/modules/ai/local-ai-service.ts
import { pipeline } from '@xenova/transformers';

export class LocalAIService {
  private grammarChecker: any;
  private embeddingModel: any;
  private modelCache = new Map();

  async initialize(): Promise<void> {
    console.log('Initializing local AI models...');
    // Models load lazily on first use
    // Download happens in background, cached in IndexedDB
  }

  async checkGrammar(text: string): Promise<Suggestion[]> {
    if (!this.grammarChecker) {
      this.grammarChecker = await pipeline(
        'text2text-generation',
        'google/flan-t5-base',
        { quantized: true }
      );
    }

    const suggestions: Suggestion[] = [];

    // Split into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

    for (const sentence of sentences) {
      const prompt = `Fix grammar errors in this sentence: "${sentence.trim()}"`;
      const result = await this.grammarChecker(prompt, {
        max_length: sentence.length + 20,
      });

      if (result[0].generated_text !== sentence.trim()) {
        suggestions.push({
          type: 'grammar',
          original: sentence.trim(),
          suggested: result[0].generated_text,
          confidence: 0.85,
          startPos: text.indexOf(sentence),
        });
      }
    }

    return suggestions;
  }

  async findDuplicates(document: string): Promise<DuplicateMatch[]> {
    if (!this.embeddingModel) {
      this.embeddingModel = await pipeline(
        'feature-extraction',
        'sentence-transformers/all-MiniLM-L6-v2',
        { quantized: true }
      );
    }

    const paragraphs = document.split(/\n\n+/).filter(p => p.trim().length > 50);
    const embeddings: any[] = [];

    // Generate embeddings for each paragraph
    for (const para of paragraphs) {
      const embedding = await this.embeddingModel(para, {
        pooling: 'mean',
        normalize: true,
      });
      embeddings.push({
        text: para.substring(0, 100), // Store first 100 chars as ID
        vector: embedding.data,
      });
    }

    // Find similar paragraphs using cosine similarity
    const duplicates: DuplicateMatch[] = [];
    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        const similarity = this.cosineSimilarity(
          embeddings[i].vector,
          embeddings[j].vector
        );

        if (similarity > 0.85) {
          duplicates.push({
            para1Index: i,
            para2Index: j,
            similarity: similarity * 100,
            para1Preview: paragraphs[i].substring(0, 80),
            para2Preview: paragraphs[j].substring(0, 80),
          });
        }
      }
    }

    return duplicates;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
```

#### Storage Strategy
```typescript
// Use IndexedDB to cache models locally
async function cacheModel(modelName: string, blob: Blob): Promise<void> {
  const db = await openIndexedDB();
  const store = db.transaction(['models'], 'readwrite').objectStore('models');
  store.put({ name: modelName, blob, timestamp: Date.now() });
}

async function getOrDownloadModel(modelName: string): Promise<Blob> {
  const cached = await getCachedModel(modelName);
  if (cached && !isExpired(cached.timestamp)) {
    return cached.blob; // Return from cache
  }

  // Download from Hugging Face CDN
  const response = await fetch(
    `https://cdn-lfs.huggingface.net/models/${modelName}/...`
  );
  const blob = await response.blob();
  await cacheModel(modelName, blob);
  return blob;
}
```

---

### Option 2: Public API (Cost-Effective, Easy)

#### Recommended Providers
1. **OpenAI API** ($0.0005-0.002 per 1K tokens)
2. **Google Cloud Natural Language API** ($1-5 per 1M requests)
3. **Anthropic Claude API** (via official chat API)
4. **HuggingFace Inference API** (free tier available)
5. **AWS Comprehend** (pay-per-request)

#### Architecture Diagram
```
┌─────────────────────────────┐
│  Browser                    │
│  (Quarto Review Extension)  │
└────────────────┬────────────┘
                 │ HTTPS
                 ↓
┌─────────────────────────────┐
│  Your Backend Server        │  ← Rate limiting, caching
│  (Proxy / API Router)       │  ← Cost control
│  ├─ Request validation      │  ← Input sanitization
│  └─ Response caching        │
└────────────────┬────────────┘
                 │ API Key
                 ↓
        ┌────────────────┐
        │ OpenAI / Google│
        │ / HuggingFace  │
        └────────────────┘
```

#### Implementation Example (OpenAI)

```typescript
// src/modules/ai/openai-ai-service.ts
export class OpenAIAIService {
  private apiKey: string;
  private backendUrl: string; // Your backend that holds API key

  constructor(backendUrl: string) {
    this.backendUrl = backendUrl;
    // API key stays on server, never sent to browser
  }

  async checkGrammar(text: string): Promise<Suggestion[]> {
    const response = await fetch(`${this.backendUrl}/api/ai/grammar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Grammar check failed');
    }

    const result = await response.json();
    return result.suggestions;
  }

  async analyzeReadability(text: string): Promise<ReadabilityScore> {
    const response = await fetch(`${this.backendUrl}/api/ai/readability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    return response.json();
  }

  async getStyleSuggestions(text: string): Promise<Suggestion[]> {
    const response = await fetch(`${this.backendUrl}/api/ai/style`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });

    return response.json();
  }
}

// Backend (Node.js with OpenAI SDK)
const express = require('express');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const app = express();
app.use(express.json());

// Cache results to reduce API calls
const cache = new Map();

app.post('/api/ai/grammar', async (req, res) => {
  const { text } = req.body;
  const cacheKey = `grammar:${text.hashCode()}`;

  // Check cache
  if (cache.has(cacheKey)) {
    return res.json(cache.get(cacheKey));
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a grammar checker. Analyze the text and provide suggestions in JSON format:
          {
            "suggestions": [
              { "original": "text", "suggested": "correction", "type": "grammar|spelling", "explanation": "..." }
            ]
          }`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const result = JSON.parse(completion.choices[0].message.content);

    // Cache for 24 hours
    cache.set(cacheKey, result);
    setTimeout(() => cache.delete(cacheKey), 24 * 60 * 60 * 1000);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### Advantages
✅ **High accuracy:** Uses GPT-4/Claude-3 or Google's specialized models
✅ **Feature-rich:** Complex reasoning, context-aware
✅ **Maintenance-free:** Provider handles model updates
✅ **Scalable:** Can handle any document size
✅ **Pay-as-you-go:** Cost aligned with usage

#### Disadvantages
❌ **Latency:** Network round-trip (100-500ms)
❌ **Privacy concerns:** Data sent to external service
❌ **API costs:** Adds operational expense ($5-100/month depending on usage)
❌ **Rate limits:** May throttle during peak usage
❌ **Dependency:** Service outage = no suggestions
❌ **Compliance:** May not meet HIPAA/GDPR requirements

#### Cost Calculation (OpenAI GPT-4)
```
Grammar check on 5KB document: ~2000 tokens
- Input: 1000 tokens × $0.01/1K = $0.01
- Output: 1000 tokens × $0.03/1K = $0.03
- Per check: $0.04

Readability analysis on same doc:
- Per check: $0.02

Per user per day (5 documents): ~$0.30
Per user per month: ~$9
Per 100 users: ~$900/month
```

---

### Option 3: Private API (Enterprise, On-Premise)

#### Recommended Tech Stack
- **Backend Framework:** FastAPI or Express + Node.js
- **Models:** Self-hosted Llama 2, Mistral, or other open-source
- **Infrastructure:** Docker containers, Kubernetes
- **Deployment:** On-premise or private cloud

#### Architecture Diagram
```
┌────────────────────────────────┐
│  Organization's Network        │
│                                │
│  ┌────────────────────────┐   │
│  │  Quarto Review         │   │
│  │  (Browser)             │   │
│  └──────────┬─────────────┘   │
│             │ Private Network │
│             ↓                  │
│  ┌────────────────────────┐   │
│  │  AI Backend Service    │   │
│  │  (FastAPI)             │   │
│  │  ├─ Llama 2 (7B)       │   │
│  │  ├─ Mistral (7B)       │   │
│  │  ├─ Cache Layer        │   │
│  │  └─ Queue (celery)     │   │
│  └──────────┬─────────────┘   │
│             ↓                  │
│  ┌────────────────────────┐   │
│  │  GPU Cluster           │   │
│  │  (Optional)            │   │
│  │  ├─ NVIDIA A100        │   │
│  │  └─ AMD MI300          │   │
│  └────────────────────────┘   │
│                                │
└────────────────────────────────┘
```

#### Implementation Example

```python
# Backend: backend/ai_service.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
import torch
from typing import List
from pydantic import BaseModel

app = FastAPI()

# CORS for Quarto Review frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

# Load models once at startup
device = 0 if torch.cuda.is_available() else -1
grammar_model = pipeline(
    "text2text-generation",
    model="pszemraj/long-t5-tglobal-base-sci-simplify",
    device=device
)

class GrammarCheckRequest(BaseModel):
    text: str
    max_suggestions: int = 10

@app.post("/api/ai/grammar")
async def check_grammar(request: GrammarCheckRequest):
    """Check grammar and spelling in text"""
    try:
        # Process with grammar model
        result = grammar_model(
            f"grammar: {request.text}",
            max_length=len(request.text) + 50
        )

        return {
            "suggestions": [
                {
                    "type": "grammar",
                    "original": request.text[:100],
                    "suggested": result[0]["generated_text"][:100],
                    "confidence": 0.92
                }
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/readability")
async def analyze_readability(request: GrammarCheckRequest):
    """Analyze readability and complexity"""
    from textstat import flesch_reading_ease, gunning_fog

    ease_score = flesch_reading_ease(request.text)
    fog_index = gunning_fog(request.text)

    return {
        "flesch_reading_ease": ease_score,
        "gunning_fog": fog_index,
        "cefr_level": "B1" if ease_score > 60 else "B2",
        "interpretation": "Easy to read" if ease_score > 60 else "Moderately difficult"
    }

# Docker setup
# Dockerfile:
FROM pytorch/pytorch:2.0-cuda11.8-runtime-ubuntu22.04

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "ai_service:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### TypeScript Frontend Integration

```typescript
// src/modules/ai/private-api-service.ts
export class PrivateAPIAIService {
  private apiEndpoint: string;
  private requestQueue: Promise<void> = Promise.resolve();

  constructor(apiEndpoint: string) {
    this.apiEndpoint = apiEndpoint; // e.g., "https://internal-ai.mycompany.com"
  }

  async checkGrammar(text: string): Promise<Suggestion[]> {
    return this.queueRequest(async () => {
      const response = await fetch(`${this.apiEndpoint}/api/ai/grammar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getInternalToken()}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Grammar check failed');
      }

      return response.json();
    });
  }

  private queueRequest<T>(fn: () => Promise<T>): Promise<T> {
    // Prevent overwhelming the backend
    return (this.requestQueue = this.requestQueue
      .then(() => fn())
      .catch(err => {
        console.error('AI request failed:', err);
        return [];
      }));
  }

  private getInternalToken(): string {
    // Get from localStorage or session storage
    return localStorage.getItem('ai-token') || '';
  }
}
```

#### Advantages
✅ **Maximum control:** Run on your own infrastructure
✅ **Privacy:** Data never leaves organization
✅ **Compliance:** HIPAA, SOC 2, GDPR ready
✅ **Customization:** Tune models for your domain
✅ **No variable costs:** Pay only for infrastructure
✅ **Latency:** Local network, <100ms response

#### Disadvantages
❌ **High initial cost:** $20K-100K+ for setup
❌ **Maintenance burden:** Monitor, update, debug
❌ **Lower accuracy:** Open-source models < GPT-4
❌ **Infrastructure required:** GPU servers, monitoring
❌ **Operational expertise:** Need ML/DevOps team
❌ **Scaling complexity:** Manual capacity planning

#### Cost Analysis (Llama 2 7B on AWS EC2)
```
Infrastructure (per month):
- GPU instance (g4dn.2xlarge): $1,000/month
- Load balancer: $50/month
- Storage: $100/month
- Monitoring/logging: $200/month
Total: ~$1,350/month

Per-user cost (100 users):
- Monthly: $1,350 / 100 = $13.50/user
- Annual: $162/user

Comparison:
- OpenAI: $180/user/year (~$15/month)
- Local: Free (but slow)
- Private: $162/user/year (best for enterprise)
```

---

## Unified AI Module Architecture

Regardless of deployment option, the frontend should use a common interface:

```typescript
// src/modules/ai/ai-service.ts
export interface AIServiceConfig {
  mode: 'local' | 'public' | 'private';
  provider?: 'openai' | 'google' | 'huggingface' | 'custom';
  endpoint?: string;
  apiKey?: string;
  modelName?: string;
}

export interface Suggestion {
  type: 'grammar' | 'style' | 'duplicate' | 'readability' | 'formatting';
  startPos?: number;
  endPos?: number;
  original: string;
  suggested: string;
  explanation: string;
  confidence: number;
  quickFix?: boolean; // Can be auto-applied
}

export abstract class BaseAIService {
  abstract checkGrammar(text: string): Promise<Suggestion[]>;
  abstract getStyleSuggestions(text: string): Promise<Suggestion[]>;
  abstract findDuplicates(document: string): Promise<DuplicateMatch[]>;
  abstract analyzeReadability(text: string): Promise<ReadabilityScore>;
}

// Factory to create appropriate service
export class AIServiceFactory {
  static create(config: AIServiceConfig): BaseAIService {
    switch (config.mode) {
      case 'local':
        return new LocalAIService();
      case 'public':
        return new PublicAPIService(config);
      case 'private':
        return new PrivateAPIService(config.endpoint!);
      default:
        throw new Error(`Unknown AI mode: ${config.mode}`);
    }
  }
}
```

---

## UI Integration

### Suggestions Panel (Right Sidebar)

```typescript
// src/modules/ui/suggestions-panel.ts
export class SuggestionsPanel {
  private aiService: BaseAIService;
  private suggestions: Suggestion[] = [];
  private currentSuggestionIndex: number = 0;

  constructor(aiService: BaseAIService) {
    this.aiService = aiService;
  }

  async analyzeCurrent ElementId(elementId: string): Promise<void> {
    const element = this.config.changes.getElementById(elementId);
    if (!element) return;

    this.showLoading('Analyzing...');

    try {
      const [grammar, style, readability] = await Promise.all([
        this.aiService.checkGrammar(element.content),
        this.aiService.getStyleSuggestions(element.content),
        this.aiService.analyzeReadability(element.content),
      ]);

      this.suggestions = [...grammar, ...style];
      this.renderSuggestions();
      this.showReadabilityScore(readability);
    } catch (error) {
      this.showError('Analysis failed: ' + error.message);
    }
  }

  private renderSuggestions(): void {
    const html = `
      <div class="ai-suggestions-panel">
        <div class="ai-header">
          <h4>AI Suggestions (${this.suggestions.length})</h4>
          <button class="ai-btn" data-action="apply-all">Apply All</button>
        </div>
        <div class="ai-suggestions-list">
          ${this.suggestions
            .map(
              (s, i) => `
            <div class="ai-suggestion" data-index="${i}">
              <div class="ai-suggestion-type">${s.type}</div>
              <div class="ai-suggestion-content">
                <p><strong>Original:</strong> ${this.escape(s.original)}</p>
                <p><strong>Suggested:</strong> ${this.escape(s.suggested)}</p>
                <p class="ai-explanation">${s.explanation}</p>
              </div>
              <div class="ai-suggestion-actions">
                <button class="ai-btn-small" data-action="apply">Apply</button>
                <button class="ai-btn-small" data-action="ignore">Ignore</button>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;

    this.panelElement.innerHTML = html;
    this.attachSuggestionHandlers();
  }
}
```

### CSS for AI Panel

```css
.ai-suggestions-panel {
  background: linear-gradient(135deg, rgba(191, 219, 254, 0.8), rgba(240, 249, 255, 0.9));
  border: 1px solid rgba(96, 165, 250, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
}

.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.ai-suggestion {
  background: white;
  border-left: 4px solid #3b82f6;
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ai-suggestion:hover {
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  transform: translateX(2px);
}

.ai-suggestion-type {
  font-size: 11px;
  font-weight: 600;
  color: #3b82f6;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.ai-explanation {
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
  margin-top: 8px;
}
```

---

## Recommendation Matrix

Choose based on your constraints:

| Constraint | Best Option | Reason |
|-----------|-------------|--------|
| **Privacy is critical** | Local Models | Data never leaves device |
| **Budget < $100/month** | Local Models | Free after setup |
| **Need high accuracy** | Public API (GPT-4) | Best models available |
| **Have $1K+/month budget** | Public API | Optimal cost/accuracy |
| **Enterprise compliance** | Private API | Full control required |
| **Need offline mode** | Local Models | Works without internet |
| **Rapid deployment** | Public API | Fastest to launch |
| **Maximum customization** | Private API | Train on your data |

---

## Phased Rollout

### Phase 1: Foundation (Week 1-2)
1. Create `AIServiceFactory` and base interfaces
2. Implement Local Models option (prioritize grammar checker)
3. Add suggestions panel to sidebar
4. Feature flag: `enableAISuggestions: false` by default

**Effort:** 25 hours

### Phase 2: Public API Integration (Week 3-4)
1. Implement OpenAI integration
2. Add backend proxy for API key security
3. Enable for beta users
4. Cost monitoring dashboard

**Effort:** 20 hours

### Phase 3: Private API Support (Week 5-6)
1. Document private API setup
2. Provide Docker setup scripts
3. Add configuration UI
4. Support documentation

**Effort:** 15 hours

### Phase 4: Advanced Features (Week 7-8)
1. Batch analysis (entire document)
2. AI-generated summaries
3. Smart formatting suggestions
4. Training on domain-specific corpus

**Effort:** 20 hours

---

## Configuration & Feature Flags

```yaml
# config.yaml
ai:
  enabled: false
  mode: 'local' # 'local' | 'public' | 'private'

  local:
    enabled: true
    models:
      grammar: 'google/flan-t5-base'
      embeddings: 'sentence-transformers/all-MiniLM-L6-v2'
    cacheModels: true # Cache in IndexedDB
    loadTimeout: 30000 # ms

  public:
    enabled: false
    provider: 'openai' # 'openai' | 'google' | 'huggingface'
    endpoint: 'https://your-backend.com/api/ai' # Proxy endpoint
    rateLimit: 100 # Requests per day per user
    cacheDuration: 86400 # Cache results for 24 hours

  private:
    enabled: false
    endpoint: 'https://internal-ai.company.com'
    auth: 'bearer' # 'bearer' | 'api-key'
    timeout: 10000 # ms

  features:
    grammarCheck: true
    styleRecommendations: true
    duplicateDetection: true
    readabilityAnalysis: true
    autoSummary: false # Requires better hardware
```

---

## Monitoring & Analytics

```typescript
// Track AI usage for cost management
class AIAnalytics {
  async logRequest(service: string, success: boolean, latency: number): Promise<void> {
    await fetch('/api/analytics/ai', {
      method: 'POST',
      body: JSON.stringify({
        timestamp: Date.now(),
        service,
        success,
        latency,
        userId: getCurrentUser().id,
      }),
    });
  }
}

// Dashboard metrics
- Total requests: 1,250/day
- Average latency: 234ms
- Success rate: 99.2%
- Cost this month: $1,234.56
- Top features used: Grammar (45%), Style (30%), Duplicates (15%), Readability (10%)
```

---

## Security Considerations

### Data Handling
1. **Local Models:** No data transmission, fully private
2. **Public APIs:** Use backend proxy to avoid exposing keys
3. **Private APIs:** Use organization's auth, end-to-end encryption

### API Key Management
```typescript
// Never expose API keys in frontend code
// Backend proxy pattern:

// Frontend
fetch('/api/ai/grammar', { body: JSON.stringify({ text }) })

// Backend (Node.js)
app.post('/api/ai/grammar', async (req, res) => {
  const { text } = req.body;

  // API key is in server env var, never exposed to client
  const response = await openai.chat.completions.create({
    messages: [{ role: 'user', content: text }],
  }, { apiKey: process.env.OPENAI_API_KEY });

  res.json(response);
});
```

### Rate Limiting
```typescript
// Prevent abuse
const rateLimit = new Map();

app.post('/api/ai/*', (req, res, next) => {
  const userId = req.user.id;
  const today = new Date().toDateString();
  const key = `${userId}:${today}`;

  const count = (rateLimit.get(key) || 0) + 1;
  if (count > 100) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  rateLimit.set(key, count);
  next();
});
```

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|-----------------|
| Feature adoption | >40% of users | Analytics event tracking |
| Suggestion accuracy | >90% | User feedback/validation |
| Avg suggestion latency | <500ms (local), <1s (API) | Performance logging |
| False positive rate | <5% | Suggestion ignore ratio |
| Cost per user/month | <$5 (public), <$20 (private) | Cost tracking |

---

## Dependencies by Option

### Local Models
- `@xenova/transformers` - Model loading and inference
- `sentence-transformers` - Embeddings (via transformers.js)
- `textstat` - Readability metrics

### Public API
- `openai` - For OpenAI integration
- `@google-cloud/language` - For Google Cloud NLP

### Private API
- `fastapi` - Backend framework (Python)
- `transformers` - Model library
- `torch` - Deep learning runtime

---

## Effort Estimate
- **Total:** 80 hours
  - Phase 1 (Foundation): 25h
  - Phase 2 (Public API): 20h
  - Phase 3 (Private API): 15h
  - Phase 4 (Advanced): 20h

---

## Future Enhancements

1. **Multi-language support** - Extend to non-English documents
2. **Domain-specific tuning** - Train on legal/medical/technical documents
3. **Real-time suggestions** - As user types (challenging for performance)
4. **Tone analysis** - Detect emotional tone, appropriateness
5. **SEO optimization** - For public-facing content
6. **Accessibility checking** - Flag content that's hard to parse for screen readers
