/**
 * RenderMarkdown Use Case - Renderer Process
 *
 * Implements the business logic for rendering markdown content to HTML.
 * This use case orchestrates markdown processing while maintaining
 * Clean Architecture principles through dependency inversion.
 */

import type { MarkdownContent } from '../../shared/entities/Document';

/**
 * Markdown rendering interface (dependency inversion)
 */
export interface MarkdownRenderer {
  render(markdown: string, options?: RenderOptions): Promise<RenderedMarkdown>;
}

/**
 * Content sanitization interface for security (dependency inversion)
 */
export interface ContentSanitizer {
  sanitize(html: string): string;
  validateContent(content: string): { isValid: boolean; errors: string[] };
}

/**
 * Caching interface for rendered content (dependency inversion)
 */
export interface RenderCache {
  get(key: string): RenderedMarkdown | null;
  set(key: string, value: RenderedMarkdown, ttl?: number): void;
  clear(): void;
  delete(key: string): void;
}

/**
 * Performance monitoring interface (dependency inversion)
 */
export interface PerformanceMonitor {
  startTimer(operation: string): string;
  endTimer(timerId: string): number;
  recordMetric(name: string, value: number): void;
}

/**
 * Configuration and types for rendering
 */
export interface RenderOptions {
  enableGfm?: boolean;
  enableSyntaxHighlighting?: boolean;
  sanitize?: boolean;
  maxRenderTime?: number;
  enableMath?: boolean;
  enableTables?: boolean;
  enableTaskLists?: boolean;
  baseUrl?: string;
  target?: 'preview' | 'export' | 'print';
}

export interface RenderedMarkdown {
  html: string;
  metadata: RenderMetadata;
  errors: string[];
}

export interface RenderMetadata {
  wordCount: number;
  headings: Array<{ level: number; text: string; id: string }>;
  renderTime: number;
  cached: boolean;
  hasCodeBlocks: boolean;
  hasTables: boolean;
  hasTaskLists: boolean;
  hasMath: boolean;
  linkCount: number;
  imageCount: number;
}

export interface RenderMarkdownRequest {
  content: MarkdownContent;
  options?: RenderOptions;
  forceRefresh?: boolean;
}

export interface RenderMarkdownResult {
  success: boolean;
  result?: RenderedMarkdown;
  errors?: string[];
  warnings?: string[];
  performanceMetrics?: {
    renderTime: number;
    cacheHit: boolean;
    contentSize: number;
  };
}

/**
 * RenderMarkdown Use Case Implementation
 *
 * This class implements the core business logic for rendering markdown.
 * It demonstrates Clean Architecture by depending only on interfaces.
 */
export class RenderMarkdown {
  private readonly defaultOptions: Required<RenderOptions> = {
    enableGfm: true,
    enableSyntaxHighlighting: true,
    sanitize: true,
    maxRenderTime: 5000,
    enableMath: false,
    enableTables: true,
    enableTaskLists: true,
    baseUrl: '',
    target: 'preview',
  };

  constructor(
    private renderer: MarkdownRenderer,
    private sanitizer: ContentSanitizer,
    private cache: RenderCache,
    private performanceMonitor: PerformanceMonitor
  ) {}

  /**
   * Execute the render markdown use case
   */
  async execute(request: RenderMarkdownRequest): Promise<RenderMarkdownResult> {
    const timerId = this.performanceMonitor.startTimer('render-markdown');

    try {
      const options = { ...this.defaultOptions, ...request.options };

      // Business Rule 1: Validate input content
      const validation = this.sanitizer.validateContent(request.content);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // Business Rule 2: Check cache unless force refresh is requested
      let cacheHit = false;
      let result: RenderedMarkdown;

      if (!request.forceRefresh) {
        const cacheKey = this.generateCacheKey(request.content, options);
        const cached = this.cache.get(cacheKey);

        if (cached) {
          result = {
            ...cached,
            metadata: {
              ...cached.metadata,
              cached: true,
            },
          };
          cacheHit = true;
        }
      }

      // Business Rule 3: Render if not cached
      if (!cacheHit) {
        result = await this.performRender(request.content, options);
      }

      // Business Rule 4: Record performance metrics
      const renderTime = this.performanceMonitor.endTimer(timerId);
      this.performanceMonitor.recordMetric('markdown.render_time', renderTime);
      this.performanceMonitor.recordMetric('markdown.content_size', request.content.length);

      return {
        success: true,
        result: result!,
        performanceMetrics: {
          renderTime,
          cacheHit,
          contentSize: request.content.length,
        },
      };
    } catch (error) {
      this.performanceMonitor.endTimer(timerId);
      const errorMessage = error instanceof Error ? error.message : 'Unknown rendering error';

      return {
        success: false,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Render markdown content for preview with optimized settings
   */
  async renderPreview(content: MarkdownContent): Promise<RenderMarkdownResult> {
    return this.execute({
      content,
      options: {
        enableGfm: true,
        enableSyntaxHighlighting: false, // Disabled for performance
        sanitize: true,
        maxRenderTime: 2000, // Shorter timeout
        enableMath: false, // Disabled for performance
        enableTables: true,
        enableTaskLists: true,
        target: 'preview',
      },
    });
  }

  /**
   * Render markdown content for final output with full features
   */
  async renderFinal(content: MarkdownContent): Promise<RenderMarkdownResult> {
    return this.execute({
      content,
      options: {
        enableGfm: true,
        enableSyntaxHighlighting: true,
        sanitize: true,
        maxRenderTime: 10000, // Longer timeout
        enableMath: true,
        enableTables: true,
        enableTaskLists: true,
        target: 'export',
      },
    });
  }

  /**
   * Render markdown for printing with print-optimized settings
   */
  async renderForPrint(content: MarkdownContent): Promise<RenderMarkdownResult> {
    return this.execute({
      content,
      options: {
        enableGfm: true,
        enableSyntaxHighlighting: true,
        sanitize: true,
        maxRenderTime: 10000,
        enableMath: true,
        enableTables: true,
        enableTaskLists: true,
        target: 'print',
      },
    });
  }

  /**
   * Extract metadata from markdown content without full rendering
   */
  async extractMetadata(content: MarkdownContent): Promise<Partial<RenderMetadata>> {
    const timerId = this.performanceMonitor.startTimer('extract-metadata');

    try {
      const metadata: Partial<RenderMetadata> = {
        wordCount: this.calculateWordCount(content),
        headings: this.extractHeadings(content),
        hasCodeBlocks: this.hasCodeBlocks(content),
        hasTables: this.hasTables(content),
        hasTaskLists: this.hasTaskLists(content),
        hasMath: this.hasMath(content),
        linkCount: this.countLinks(content),
        imageCount: this.countImages(content),
      };

      this.performanceMonitor.endTimer(timerId);
      return metadata;
    } catch (error) {
      this.performanceMonitor.endTimer(timerId);
      throw error;
    }
  }

  /**
   * Clear all cached renders
   */
  clearCache(): void {
    this.cache.clear();
    this.performanceMonitor.recordMetric('cache.cleared', 1);
  }

  /**
   * Clear cached render for specific content
   */
  clearCacheForContent(content: MarkdownContent, options?: RenderOptions): void {
    const cacheKey = this.generateCacheKey(content, options || this.defaultOptions);
    this.cache.delete(cacheKey);
  }

  /**
   * Preload and cache render for content
   */
  async preloadRender(
    content: MarkdownContent,
    options?: RenderOptions
  ): Promise<void> {
    await this.execute({
      content,
      options,
    });
  }

  /**
   * Perform the actual rendering with timeout protection
   */
  private async performRender(
    content: MarkdownContent,
    options: Required<RenderOptions>
  ): Promise<RenderedMarkdown> {
    // Business Rule: Apply rendering timeout protection
    const renderPromise = this.renderer.render(content, options);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Render timeout exceeded')), options.maxRenderTime)
    );

    const rendered = await Promise.race([renderPromise, timeoutPromise]);

    // Business Rule: Sanitize output for security
    const sanitizedHtml = options.sanitize
      ? this.sanitizer.sanitize(rendered.html)
      : rendered.html;

    const result: RenderedMarkdown = {
      ...rendered,
      html: sanitizedHtml,
      metadata: {
        ...rendered.metadata,
        cached: false,
      },
    };

    // Business Rule: Cache successful renders
    const cacheKey = this.generateCacheKey(content, options);
    const cacheTtl = this.getCacheTtl(options.target);
    this.cache.set(cacheKey, result, cacheTtl);

    return result;
  }

  /**
   * Generate cache key for content and options
   */
  private generateCacheKey(content: MarkdownContent, options: RenderOptions): string {
    const optionsStr = JSON.stringify(options);
    const contentHash = this.hashContent(content);
    const optionsHash = this.hashContent(optionsStr);
    return `${contentHash}-${optionsHash}`;
  }

  /**
   * Simple hash function for content
   */
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cache TTL based on target
   */
  private getCacheTtl(target: string): number {
    switch (target) {
      case 'preview':
        return 300000; // 5 minutes
      case 'export':
        return 900000; // 15 minutes
      case 'print':
        return 600000; // 10 minutes
      default:
        return 300000; // 5 minutes default
    }
  }

  /**
   * Calculate word count from markdown content
   */
  private calculateWordCount(content: string): number {
    // Remove code blocks and inline code for more accurate count
    const withoutCode = content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]+`/g, '') // Remove inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with text only
      .replace(/[#*_~]/g, '') // Remove formatting characters
      .replace(/\n+/g, ' '); // Replace newlines with spaces

    return withoutCode.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Extract headings from markdown content
   */
  private extractHeadings(content: string): Array<{ level: number; text: string; id: string }> {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings: Array<{ level: number; text: string; id: string }> = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

      headings.push({ level, text, id });
    }

    return headings;
  }

  /**
   * Check if content has code blocks
   */
  private hasCodeBlocks(content: string): boolean {
    return /```[\s\S]*?```/.test(content);
  }

  /**
   * Check if content has tables
   */
  private hasTables(content: string): boolean {
    return /\|.*\|/.test(content);
  }

  /**
   * Check if content has task lists
   */
  private hasTaskLists(content: string): boolean {
    return /^\s*[-*+]\s+\[[ x]\]/m.test(content);
  }

  /**
   * Check if content has math expressions
   */
  private hasMath(content: string): boolean {
    return /\$\$[\s\S]*?\$\$|\$[^$]+\$/.test(content);
  }

  /**
   * Count links in content
   */
  private countLinks(content: string): number {
    const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    return (content.match(linkRegex) || []).length;
  }

  /**
   * Count images in content
   */
  private countImages(content: string): number {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    return (content.match(imageRegex) || []).length;
  }
}

/**
 * Default performance monitor implementation
 */
export class DefaultPerformanceMonitor implements PerformanceMonitor {
  private timers: Map<string, number> = new Map();
  private metrics: Map<string, number[]> = new Map();

  startTimer(operation: string): string {
    const timerId = `${operation}-${Date.now()}-${Math.random()}`;
    this.timers.set(timerId, performance.now());
    return timerId;
  }

  endTimer(timerId: string): number {
    const startTime = this.timers.get(timerId);
    if (!startTime) {
      console.warn(`Timer ${timerId} not found`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    this.timers.delete(timerId);
    return duration;
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);

    // Keep only last 100 measurements
    const measurements = this.metrics.get(name)!;
    if (measurements.length > 100) {
      measurements.splice(0, measurements.length - 100);
    }
  }

  getMetrics(): Record<string, { count: number; avg: number; min: number; max: number }> {
    const result: Record<string, { count: number; avg: number; min: number; max: number }> = {};

    for (const [name, values] of this.metrics) {
      if (values.length > 0) {
        result[name] = {
          count: values.length,
          avg: values.reduce((sum, val) => sum + val, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
        };
      }
    }

    return result;
  }
}

/**
 * Export types for use in adapters layer
 */
export type {
  MarkdownRenderer,
  ContentSanitizer,
  RenderCache,
  PerformanceMonitor,
  RenderOptions,
  RenderedMarkdown,
  RenderMetadata,
  RenderMarkdownRequest,
  RenderMarkdownResult,
};