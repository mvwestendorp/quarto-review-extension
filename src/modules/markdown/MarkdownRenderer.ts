import { unified, type Processor } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

import { remarkCriticMarkup } from './remark-criticmarkup';

export interface RendererOptions {
  enableCriticMarkup: boolean;
  allowRawHtml: boolean;
}

const DEFAULT_OPTIONS: RendererOptions = {
  enableCriticMarkup: true,
  allowRawHtml: false,
};

/**
 * Shared renderer for markdown pipelines. Caches unified processors by option set
 * so we do not rebuild the entire chain for every render call.
 */
type MarkdownProcessor = Processor<any, any, any, any, string>;

export class MarkdownRenderer {
  private readonly cache = new Map<string, MarkdownProcessor>();

  render(markdown: string, options?: Partial<RendererOptions>): string {
    const processor = this.getProcessor(options);
    return String(processor.processSync(markdown));
  }

  renderAsync(markdown: string, options?: Partial<RendererOptions>): Promise<string> {
    const processor = this.getProcessor(options);
    return processor.process(markdown).then(String);
  }

  private getProcessor(partial?: Partial<RendererOptions>): MarkdownProcessor {
    const opts = { ...DEFAULT_OPTIONS, ...partial };
    const cacheKey = `${opts.enableCriticMarkup}:${opts.allowRawHtml}`;

    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const pipeline = unified() as unknown as MarkdownProcessor;
    pipeline.use(remarkParse).use(remarkGfm);

    if (opts.enableCriticMarkup) {
      pipeline.use(remarkCriticMarkup as any);
    }

    pipeline
      .use(remarkRehype as any, { allowDangerousHtml: true })
      .use(rehypeStringify as any, { allowDangerousHtml: true });

    this.cache.set(cacheKey, pipeline as MarkdownProcessor);
    return pipeline as MarkdownProcessor;
  }
}
