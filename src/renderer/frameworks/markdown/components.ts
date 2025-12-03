/**
 * React Markdown Components Configuration
 *
 * Configures react-markdown with custom components and plugins
 * for rendering markdown in the preview pane.
 */

import React from 'react';
import type { Components } from 'react-markdown';
import type { ReactMarkdownProps } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

/**
 * Configuration options for markdown rendering
 */
export interface MarkdownConfig {
  /**
   * Whether to enable GitHub Flavored Markdown
   */
  enableGfm?: boolean;

  /**
   * Whether to enable syntax highlighting
   */
  enableSyntaxHighlighting?: boolean;

  /**
   * Whether to enable line breaks
   */
  enableLineBreaks?: boolean;

  /**
   * Whether to enable heading anchors
   */
  enableHeadingAnchors?: boolean;

  /**
   * Whether to sanitize HTML (recommended for security)
   */
  sanitizeHtml?: boolean;

  /**
   * Custom CSS classes for elements
   */
  customClasses?: {
    heading?: string;
    paragraph?: string;
    link?: string;
    list?: string;
    blockquote?: string;
    code?: string;
    pre?: string;
    table?: string;
  };

  /**
   * Whether to open external links in new tab
   */
  openLinksInNewTab?: boolean;

  /**
   * Whether to allow HTML in markdown
   */
  allowDangerousHtml?: boolean;
}

/**
 * Default markdown configuration
 */
const defaultMarkdownConfig: Required<MarkdownConfig> = {
  enableGfm: true,
  enableSyntaxHighlighting: true,
  enableLineBreaks: true,
  enableHeadingAnchors: true,
  sanitizeHtml: true,
  customClasses: {
    heading: 'markdown-heading',
    paragraph: 'markdown-paragraph',
    link: 'markdown-link',
    list: 'markdown-list',
    blockquote: 'markdown-blockquote',
    code: 'markdown-code',
    pre: 'markdown-pre',
    table: 'markdown-table',
  },
  openLinksInNewTab: true,
  allowDangerousHtml: false,
};

/**
 * Custom React components for markdown elements
 */
export function createMarkdownComponents(config: MarkdownConfig = {}): Components {
  const mergedConfig = { ...defaultMarkdownConfig, ...config };

  return {
    // Headings with custom styling and anchors
    h1: ({ children, id, ...props }) =>
      React.createElement('h1', {
        id,
        className: `${mergedConfig.customClasses.heading} markdown-h1`,
        ...props,
      }, children),

    h2: ({ children, id, ...props }) =>
      React.createElement('h2', {
        id,
        className: `${mergedConfig.customClasses.heading} markdown-h2`,
        ...props,
      }, children),

    h3: ({ children, id, ...props }) =>
      React.createElement('h3', {
        id,
        className: `${mergedConfig.customClasses.heading} markdown-h3`,
        ...props,
      }, children),

    h4: ({ children, id, ...props }) =>
      React.createElement('h4', {
        id,
        className: `${mergedConfig.customClasses.heading} markdown-h4`,
        ...props,
      }, children),

    h5: ({ children, id, ...props }) =>
      React.createElement('h5', {
        id,
        className: `${mergedConfig.customClasses.heading} markdown-h5`,
        ...props,
      }, children),

    h6: ({ children, id, ...props }) =>
      React.createElement('h6', {
        id,
        className: `${mergedConfig.customClasses.heading} markdown-h6`,
        ...props,
      }, children),

    // Paragraphs
    p: ({ children, ...props }) =>
      React.createElement('p', {
        className: mergedConfig.customClasses.paragraph,
        ...props,
      }, children),

    // Links with external link handling
    a: ({ children, href, ...props }) => {
      const isExternal = href?.startsWith('http') || href?.startsWith('//');
      const linkProps: any = {
        href,
        className: mergedConfig.customClasses.link,
        ...props,
      };

      if (isExternal && mergedConfig.openLinksInNewTab) {
        linkProps.target = '_blank';
        linkProps.rel = 'noopener noreferrer';
      }

      return React.createElement('a', linkProps, children);
    },

    // Lists
    ul: ({ children, ...props }) =>
      React.createElement('ul', {
        className: `${mergedConfig.customClasses.list} markdown-ul`,
        ...props,
      }, children),

    ol: ({ children, ...props }) =>
      React.createElement('ol', {
        className: `${mergedConfig.customClasses.list} markdown-ol`,
        ...props,
      }, children),

    li: ({ children, ...props }) =>
      React.createElement('li', {
        className: 'markdown-li',
        ...props,
      }, children),

    // Blockquotes
    blockquote: ({ children, ...props }) =>
      React.createElement('blockquote', {
        className: mergedConfig.customClasses.blockquote,
        ...props,
      }, children),

    // Code blocks and inline code
    code: ({ children, className, inline, ...props }) => {
      const codeProps: any = {
        className: `${mergedConfig.customClasses.code} ${className || ''}`,
        ...props,
      };

      if (inline) {
        codeProps.className += ' markdown-code-inline';
        return React.createElement('code', codeProps, children);
      } else {
        return React.createElement('code', {
          ...codeProps,
          className: codeProps.className + ' markdown-code-block',
        }, children);
      }
    },

    pre: ({ children, ...props }) =>
      React.createElement('pre', {
        className: mergedConfig.customClasses.pre,
        ...props,
      }, children),

    // Tables
    table: ({ children, ...props }) =>
      React.createElement('table', {
        className: mergedConfig.customClasses.table,
        ...props,
      }, children),

    thead: ({ children, ...props }) =>
      React.createElement('thead', {
        className: 'markdown-thead',
        ...props,
      }, children),

    tbody: ({ children, ...props }) =>
      React.createElement('tbody', {
        className: 'markdown-tbody',
        ...props,
      }, children),

    tr: ({ children, ...props }) =>
      React.createElement('tr', {
        className: 'markdown-tr',
        ...props,
      }, children),

    th: ({ children, ...props }) =>
      React.createElement('th', {
        className: 'markdown-th',
        ...props,
      }, children),

    td: ({ children, ...props }) =>
      React.createElement('td', {
        className: 'markdown-td',
        ...props,
      }, children),

    // Images
    img: ({ src, alt, ...props }) =>
      React.createElement('img', {
        src,
        alt,
        className: 'markdown-img',
        loading: 'lazy',
        ...props,
      }),

    // Horizontal rule
    hr: ({ ...props }) =>
      React.createElement('hr', {
        className: 'markdown-hr',
        ...props,
      }),

    // Emphasis
    em: ({ children, ...props }) =>
      React.createElement('em', {
        className: 'markdown-em',
        ...props,
      }, children),

    strong: ({ children, ...props }) =>
      React.createElement('strong', {
        className: 'markdown-strong',
        ...props,
      }, children),

    // Delete (strikethrough)
    del: ({ children, ...props }) =>
      React.createElement('del', {
        className: 'markdown-del',
        ...props,
      }, children),
  };
}

/**
 * Create remark plugins array based on configuration
 */
export function createRemarkPlugins(config: MarkdownConfig = {}): any[] {
  const mergedConfig = { ...defaultMarkdownConfig, ...config };
  const plugins: any[] = [];

  // GitHub Flavored Markdown
  if (mergedConfig.enableGfm) {
    plugins.push(remarkGfm);
  }

  // Line breaks
  if (mergedConfig.enableLineBreaks) {
    plugins.push(remarkBreaks);
  }

  return plugins;
}

/**
 * Create rehype plugins array based on configuration
 */
export function createRehypePlugins(config: MarkdownConfig = {}): any[] {
  const mergedConfig = { ...defaultMarkdownConfig, ...config };
  const plugins: any[] = [];

  // HTML sanitization (security)
  if (mergedConfig.sanitizeHtml) {
    const sanitizeSchema = {
      ...defaultSchema,
      attributes: {
        ...defaultSchema.attributes,
        // Allow class attributes for styling
        '*': [...(defaultSchema.attributes?.['*'] || []), 'className', 'class'],
        // Allow id for heading anchors
        h1: [...(defaultSchema.attributes?.h1 || []), 'id'],
        h2: [...(defaultSchema.attributes?.h2 || []), 'id'],
        h3: [...(defaultSchema.attributes?.h3 || []), 'id'],
        h4: [...(defaultSchema.attributes?.h4 || []), 'id'],
        h5: [...(defaultSchema.attributes?.h5 || []), 'id'],
        h6: [...(defaultSchema.attributes?.h6 || []), 'id'],
      },
    };
    plugins.push([rehypeSanitize, sanitizeSchema]);
  }

  // Syntax highlighting
  if (mergedConfig.enableSyntaxHighlighting) {
    plugins.push([rehypeHighlight, { ignoreMissing: true }]);
  }

  // Heading anchors
  if (mergedConfig.enableHeadingAnchors) {
    plugins.push(rehypeSlug);
    plugins.push([
      rehypeAutolinkHeadings,
      {
        behavior: 'wrap',
        properties: {
          className: 'markdown-heading-anchor',
        },
      },
    ]);
  }

  return plugins;
}

/**
 * Create complete react-markdown props based on configuration
 */
export function createReactMarkdownProps(config: MarkdownConfig = {}): Partial<ReactMarkdownProps> {
  const mergedConfig = { ...defaultMarkdownConfig, ...config };

  return {
    components: createMarkdownComponents(mergedConfig),
    remarkPlugins: createRemarkPlugins(mergedConfig),
    rehypePlugins: createRehypePlugins(mergedConfig),
    skipHtml: !mergedConfig.allowDangerousHtml,
  };
}

/**
 * Utility functions for markdown processing
 */
export const MarkdownUtils = {
  /**
   * Extract headings from markdown content
   */
  extractHeadings(content: string): Array<{ level: number; text: string; id: string }> {
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
  },

  /**
   * Generate table of contents from headings
   */
  generateTableOfContents(content: string): string {
    const headings = this.extractHeadings(content);
    if (headings.length === 0) {
      return '';
    }

    let toc = '## Table of Contents\n\n';
    for (const heading of headings) {
      const indent = '  '.repeat(Math.max(0, heading.level - 2));
      toc += `${indent}- [${heading.text}](#${heading.id})\n`;
    }

    return toc;
  },

  /**
   * Count words in markdown content (excluding markup)
   */
  countWords(content: string): number {
    // Remove markdown syntax for more accurate word count
    const plainText = content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]+`/g, '') // Remove inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with text
      .replace(/[#*_~`]/g, '') // Remove formatting characters
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();

    return plainText.split(/\s+/).filter(word => word.length > 0).length;
  },

  /**
   * Estimate reading time in minutes
   */
  estimateReadingTime(content: string, wordsPerMinute: number = 200): number {
    const wordCount = this.countWords(content);
    return Math.ceil(wordCount / wordsPerMinute);
  },

  /**
   * Validate markdown syntax (basic)
   */
  validateMarkdown(content: string): Array<{ line: number; message: string }> {
    const errors: Array<{ line: number; message: string }> = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Check for unmatched code block fences
      if (line.trim().startsWith('```')) {
        const codeBlockRegex = /```[\s\S]*?```/g;
        const matches = content.match(codeBlockRegex);
        const fenceCount = (content.match(/```/g) || []).length;

        if (fenceCount % 2 !== 0) {
          errors.push({
            line: lineNumber,
            message: 'Unmatched code block fence',
          });
        }
      }

      // Check for malformed links
      const linkRegex = /\[([^\]]*)\]\(([^)]*)\)/g;
      let linkMatch;
      while ((linkMatch = linkRegex.exec(line)) !== null) {
        if (!linkMatch[1] || !linkMatch[2]) {
          errors.push({
            line: lineNumber,
            message: 'Malformed link - missing text or URL',
          });
        }
      }
    });

    return errors;
  },
};

/**
 * Export configuration types for use in components
 */
export type { MarkdownConfig };
export { defaultMarkdownConfig };