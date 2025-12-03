/**
 * RenderMarkdown Use Case Test
 *
 * Educational test demonstrating Clean Architecture boundaries:
 * - Use cases orchestrate business logic for markdown rendering
 * - Abstraction over specific rendering libraries (react-markdown, marked, etc.)
 * - Testing markdown processing rules and security policies
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Domain interfaces that demonstrate dependency inversion
 * The use case depends on these abstractions, not concrete implementations
 */
interface MarkdownRenderer {
  render(markdown: string, options?: RenderOptions): Promise<RenderedMarkdown>;
}

interface ContentSanitizer {
  sanitize(html: string): string;
  validateContent(content: string): { isValid: boolean; errors: string[] };
}

interface RenderCache {
  get(key: string): RenderedMarkdown | null;
  set(key: string, value: RenderedMarkdown, ttl?: number): void;
  clear(): void;
}

interface RenderOptions {
  enableGfm?: boolean;
  enableSyntaxHighlighting?: boolean;
  sanitize?: boolean;
  maxRenderTime?: number;
  enableMath?: boolean;
}

interface RenderedMarkdown {
  html: string;
  metadata: {
    wordCount: number;
    headings: Array<{ level: number; text: string; id: string }>;
    renderTime: number;
    cached: boolean;
    hasCodeBlocks: boolean;
    hasTables: boolean;
  };
  errors: string[];
}

/**
 * RenderMarkdown Use Case Implementation
 *
 * This represents the business logic for rendering markdown content.
 * Notice how it orchestrates multiple concerns while remaining framework-agnostic.
 */
class RenderMarkdown {
  constructor(
    private renderer: MarkdownRenderer,
    private sanitizer: ContentSanitizer,
    private cache: RenderCache
  ) {}

  async execute(
    content: string,
    options: RenderOptions = {}
  ): Promise<RenderMarkdownResult> {
    const startTime = Date.now();

    try {
      // Business Rule 1: Validate input content
      const validation = this.sanitizer.validateContent(content);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // Business Rule 2: Check cache for previously rendered content
      const cacheKey = this.generateCacheKey(content, options);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return {
          success: true,
          result: {
            ...cached,
            metadata: {
              ...cached.metadata,
              cached: true,
            },
          },
        };
      }

      // Business Rule 3: Apply rendering timeout protection
      const renderTimeout = options.maxRenderTime || 5000;
      const renderPromise = this.renderer.render(content, options);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Render timeout exceeded')), renderTimeout)
      );

      const rendered = await Promise.race([renderPromise, timeoutPromise]);

      // Business Rule 4: Sanitize output for security
      const sanitizedHtml = options.sanitize !== false
        ? this.sanitizer.sanitize(rendered.html)
        : rendered.html;

      const result: RenderedMarkdown = {
        ...rendered,
        html: sanitizedHtml,
        metadata: {
          ...rendered.metadata,
          renderTime: Date.now() - startTime,
          cached: false,
        },
      };

      // Business Rule 5: Cache successful renders
      this.cache.set(cacheKey, result, 300000); // 5 minutes TTL

      return {
        success: true,
        result,
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown rendering error'],
      };
    }
  }

  async renderPreview(content: string): Promise<RenderMarkdownResult> {
    // Business Rule: Preview rendering with optimized settings
    return this.execute(content, {
      enableGfm: true,
      enableSyntaxHighlighting: false, // Disable for performance
      sanitize: true,
      maxRenderTime: 2000, // Shorter timeout for previews
      enableMath: false, // Disable math for performance
    });
  }

  async renderFinal(content: string): Promise<RenderMarkdownResult> {
    // Business Rule: Final rendering with full features
    return this.execute(content, {
      enableGfm: true,
      enableSyntaxHighlighting: true,
      sanitize: true,
      maxRenderTime: 10000, // Longer timeout for final render
      enableMath: true,
    });
  }

  clearCache(): void {
    // Business Rule: Allow manual cache clearing
    this.cache.clear();
  }

  private generateCacheKey(content: string, options: RenderOptions): string {
    const optionsStr = JSON.stringify(options);
    const contentHash = this.hashContent(content);
    return `${contentHash}-${this.hashContent(optionsStr)}`;
  }

  private hashContent(content: string): string {
    // Simple hash for demonstration (in production, use proper hash function)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
}

interface RenderMarkdownResult {
  success: boolean;
  result?: RenderedMarkdown;
  errors?: string[];
}

// Test Implementation
describe('RenderMarkdown Use Case', () => {
  let renderMarkdown: RenderMarkdown;
  let mockRenderer: MarkdownRenderer;
  let mockSanitizer: ContentSanitizer;
  let mockCache: RenderCache;

  const sampleMarkdown = `# Test Document

This is a **test** document with:
- Lists
- Code blocks
\`\`\`javascript
console.log('hello');
\`\`\`
`;

  const sampleRenderedOutput: RenderedMarkdown = {
    html: '<h1>Test Document</h1><p>This is a <strong>test</strong> document...</p>',
    metadata: {
      wordCount: 10,
      headings: [{ level: 1, text: 'Test Document', id: 'test-document' }],
      renderTime: 50,
      cached: false,
      hasCodeBlocks: true,
      hasTables: false,
    },
    errors: [],
  };

  beforeEach(() => {
    // Create mocks using dependency inversion principle
    mockRenderer = {
      render: vi.fn().mockResolvedValue(sampleRenderedOutput),
    };

    mockSanitizer = {
      sanitize: vi.fn().mockImplementation((html: string) => html),
      validateContent: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
    };

    mockCache = {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
      clear: vi.fn(),
    };

    // Inject dependencies (dependency inversion in action)
    renderMarkdown = new RenderMarkdown(mockRenderer, mockSanitizer, mockCache);
  });

  describe('Business Rule: Content Validation', () => {
    it('should reject invalid markdown content', async () => {
      // Arrange
      const invalidContent = 'a'.repeat(5_000_001); // Exceeds limit
      mockSanitizer.validateContent = vi.fn().mockReturnValue({
        isValid: false,
        errors: ['Content too large for rendering'],
      });

      // Act
      const result = await renderMarkdown.execute(invalidContent);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Content too large for rendering');
      expect(mockRenderer.render).not.toHaveBeenCalled();
    });

    it('should accept valid markdown content', async () => {
      // Act
      const result = await renderMarkdown.execute(sampleMarkdown);

      // Assert
      expect(result.success).toBe(true);
      expect(mockSanitizer.validateContent).toHaveBeenCalledWith(sampleMarkdown);
    });
  });

  describe('Business Rule: Caching Strategy', () => {
    it('should return cached result when available', async () => {
      // Arrange
      const cachedResult = {
        ...sampleRenderedOutput,
        metadata: { ...sampleRenderedOutput.metadata, cached: true },
      };
      mockCache.get = vi.fn().mockReturnValue(cachedResult);

      // Act
      const result = await renderMarkdown.execute(sampleMarkdown);

      // Assert
      expect(result.success).toBe(true);
      expect(result.result!.metadata.cached).toBe(true);
      expect(mockRenderer.render).not.toHaveBeenCalled();
    });

    it('should cache successful renders', async () => {
      // Act
      await renderMarkdown.execute(sampleMarkdown);

      // Assert
      expect(mockCache.set).toHaveBeenCalledWith(
        expect.any(String), // cache key
        expect.objectContaining({
          html: expect.any(String),
          metadata: expect.objectContaining({
            cached: false,
          }),
        }),
        300000 // 5 minutes TTL
      );
    });

    it('should generate consistent cache keys for same content and options', async () => {
      // Arrange
      const options = { enableGfm: true };

      // Act
      await renderMarkdown.execute(sampleMarkdown, options);
      await renderMarkdown.execute(sampleMarkdown, options);

      // Assert
      expect(mockCache.get).toHaveBeenCalledTimes(2);
      const firstCall = mockCache.get.mock.calls[0][0];
      const secondCall = mockCache.get.mock.calls[1][0];
      expect(firstCall).toBe(secondCall);
    });
  });

  describe('Business Rule: Security (Sanitization)', () => {
    it('should sanitize HTML output by default', async () => {
      // Act
      await renderMarkdown.execute(sampleMarkdown);

      // Assert
      expect(mockSanitizer.sanitize).toHaveBeenCalledWith(sampleRenderedOutput.html);
    });

    it('should skip sanitization when explicitly disabled', async () => {
      // Act
      await renderMarkdown.execute(sampleMarkdown, { sanitize: false });

      // Assert
      expect(mockSanitizer.sanitize).not.toHaveBeenCalled();
    });

    it('should handle potentially malicious content', async () => {
      // Arrange
      const maliciousMarkdown = '<script>alert("xss")</script>';
      const sanitizedHtml = '&lt;script&gt;alert("xss")&lt;/script&gt;';
      mockSanitizer.sanitize = vi.fn().mockReturnValue(sanitizedHtml);

      // Act
      const result = await renderMarkdown.execute(maliciousMarkdown);

      // Assert
      expect(result.success).toBe(true);
      expect(result.result!.html).toBe(sanitizedHtml);
    });
  });

  describe('Business Rule: Render Performance and Timeout', () => {
    it('should enforce render timeout', async () => {
      // Arrange
      mockRenderer.render = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 6000)) // 6 seconds
      );

      // Act
      const result = await renderMarkdown.execute(sampleMarkdown, { maxRenderTime: 1000 });

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Render timeout exceeded');
    });

    it('should track render time in metadata', async () => {
      // Act
      const result = await renderMarkdown.execute(sampleMarkdown);

      // Assert
      expect(result.success).toBe(true);
      expect(result.result!.metadata.renderTime).toBeGreaterThan(0);
      expect(typeof result.result!.metadata.renderTime).toBe('number');
    });
  });

  describe('Business Rule: Rendering Modes', () => {
    it('should use optimized settings for preview rendering', async () => {
      // Act
      await renderMarkdown.renderPreview(sampleMarkdown);

      // Assert
      expect(mockRenderer.render).toHaveBeenCalledWith(
        sampleMarkdown,
        expect.objectContaining({
          enableSyntaxHighlighting: false,
          maxRenderTime: 2000,
          enableMath: false,
        })
      );
    });

    it('should use full features for final rendering', async () => {
      // Act
      await renderMarkdown.renderFinal(sampleMarkdown);

      // Assert
      expect(mockRenderer.render).toHaveBeenCalledWith(
        sampleMarkdown,
        expect.objectContaining({
          enableSyntaxHighlighting: true,
          maxRenderTime: 10000,
          enableMath: true,
        })
      );
    });
  });

  describe('Business Rule: Error Handling', () => {
    it('should handle renderer failures gracefully', async () => {
      // Arrange
      mockRenderer.render = vi.fn().mockRejectedValue(new Error('Renderer crashed'));

      // Act
      const result = await renderMarkdown.execute(sampleMarkdown);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Renderer crashed');
    });

    it('should handle empty content', async () => {
      // Act
      const result = await renderMarkdown.execute('');

      // Assert
      expect(result.success).toBe(true);
      expect(mockRenderer.render).toHaveBeenCalledWith('', expect.any(Object));
    });
  });

  describe('Cache Management', () => {
    it('should allow manual cache clearing', () => {
      // Act
      renderMarkdown.clearCache();

      // Assert
      expect(mockCache.clear).toHaveBeenCalled();
    });
  });

  describe('Architecture Validation', () => {
    it('should demonstrate dependency inversion principle', () => {
      // The use case depends on interfaces, not concrete implementations
      expect(renderMarkdown).toBeInstanceOf(RenderMarkdown);

      // Verify all dependencies are injected as interfaces
      expect(mockRenderer).toHaveProperty('render');
      expect(mockSanitizer).toHaveProperty('sanitize');
      expect(mockSanitizer).toHaveProperty('validateContent');
      expect(mockCache).toHaveProperty('get');
      expect(mockCache).toHaveProperty('set');
    });

    it('should be testable in isolation (no external dependencies)', () => {
      // This test runs without react-markdown, DOM, or any rendering library
      // It demonstrates that business logic is independent of infrastructure
      expect(() => {
        new RenderMarkdown(mockRenderer, mockSanitizer, mockCache);
      }).not.toThrow();
    });

    it('should handle different rendering options correctly', async () => {
      // Arrange
      const options: RenderOptions = {
        enableGfm: true,
        enableSyntaxHighlighting: false,
        sanitize: true,
        maxRenderTime: 3000,
      };

      // Act
      await renderMarkdown.execute(sampleMarkdown, options);

      // Assert
      expect(mockRenderer.render).toHaveBeenCalledWith(sampleMarkdown, options);
    });
  });
});