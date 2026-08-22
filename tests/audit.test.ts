import { describe, it, expect } from 'bun:test';
import {
  parseColor,
  getRelativeLuminance,
  getContrastRatio,
  isLargeText,
  getMinContrastThreshold,
  blendColors
} from '../src/auditors/contrast.js';
import {
  getHeadingLevel,
  auditHeadings
} from '../src/auditors/headings.js';
import {
  isGenericAlt,
  extractImageContext,
  auditImages
} from '../src/auditors/images.js';
import {
  auditSeo
} from '../src/auditors/seo.js';
import {
  buildRemedyPrompt,
  buildAltTextPrompt
} from '../src/prompts.js';
import devAuditNano from '../src/index.js';

// Minimal mock DOM helper for headless testing
function createMockElement(tag: string, attrs: Record<string, string> = {}, textContent = '', children: any[] = []): any {
  const el: any = {
    tagName: tag.toUpperCase(),
    textContent,
    outerHTML: `<${tag}${Object.entries(attrs).map(([k, v]) => ` ${k}="${v}"`).join('')}>${textContent}</${tag}>`,
    classList: {
      length: 0,
      [Symbol.iterator]: function* () {
        if (attrs['class']) {
          for (const c of attrs['class'].split(' ')) yield c;
        }
      }
    },
    attributes: attrs,
    parentElement: null,
    children: [],
    previousElementSibling: null,
    getAttribute(name: string) {
      return attrs[name] !== undefined ? attrs[name] : null;
    },
    hasAttribute(name: string) {
      return attrs[name] !== undefined;
    },
    closest(selector: string) {
      let curr: any = el;
      while (curr) {
        if (selector === 'figure' && curr.tagName === 'FIGURE') return curr;
        if (selector === 'a' && curr.tagName === 'A') return curr;
        curr = curr.parentElement;
      }
      return null;
    },
    querySelector(selector: string) {
      for (const child of el.children) {
        if (selector === 'figcaption' && child.tagName === 'FIGCAPTION') return child;
        if (selector.includes('img') && child.tagName === 'IMG') return child;
        const found = child.querySelector?.(selector);
        if (found) return found;
      }
      return null;
    },
    querySelectorAll(selector: string) {
      const results: any[] = [];
      function search(node: any) {
        for (const child of node.children || []) {
          const matchHeading = selector.includes('h1') && ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(child.tagName);
          const matchRole = selector.includes('role') && child.getAttribute('role') === 'heading';
          const matchImg = selector.includes('img') && child.tagName === 'IMG';
          const matchA = selector.includes('a[href]') && child.tagName === 'A' && child.hasAttribute('href');

          if (matchHeading || matchRole || matchImg || matchA) {
            results.push(child);
          }
          search(child);
        }
      }
      search(el);
      return results;
    },
    cloneNode(deep: boolean) {
      return {
        ...el,
        querySelectorAll: () => [],
        remove: () => {}
      };
    }
  };

  for (const child of children) {
    child.parentElement = el;
    el.children.push(child);
  }

  for (let i = 1; i < el.children.length; i++) {
    el.children[i].previousElementSibling = el.children[i - 1];
  }

  return el;
}

describe('Contrast Auditor & Math', () => {
  it('parses named colors correctly', () => {
    expect(parseColor('black')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(parseColor('white')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('red')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('parses hex colors in 3, 4, 6, and 8 digit formats', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('#000000')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('#00000080')?.a).toBeCloseTo(0.5, 1);
  });

  it('parses rgb and rgba strings', () => {
    expect(parseColor('rgb(255, 0, 128)')).toEqual({ r: 255, g: 0, b: 128, a: 1 });
    expect(parseColor('rgba(100, 150, 200, 0.5)')).toEqual({ r: 100, g: 150, b: 200, a: 0.5 });
  });

  it('calculates relative luminance correctly', () => {
    const whiteLum = getRelativeLuminance({ r: 255, g: 255, b: 255, a: 1 });
    const blackLum = getRelativeLuminance({ r: 0, g: 0, b: 0, a: 1 });
    expect(whiteLum).toBeCloseTo(1.0, 4);
    expect(blackLum).toBeCloseTo(0.0, 4);
  });

  it('calculates contrast ratios conforming to WCAG formulas', () => {
    const blackOnWhite = getContrastRatio('#000000', '#ffffff');
    expect(blackOnWhite).toBe(21);

    const whiteOnWhite = getContrastRatio('#ffffff', '#ffffff');
    expect(whiteOnWhite).toBe(1);

    const grayOnWhite = getContrastRatio('#767676', '#ffffff');
    expect(grayOnWhite).toBeGreaterThanOrEqual(4.5); // WCAG AA minimum for normal text
  });

  it('detects large text and assigns appropriate thresholds', () => {
    expect(isLargeText(24, '400')).toBe(true);
    expect(isLargeText(19, '700')).toBe(true);
    expect(isLargeText(16, '400')).toBe(false);

    expect(getMinContrastThreshold(16, '400', 'AA')).toBe(4.5);
    expect(getMinContrastThreshold(24, '400', 'AA')).toBe(3.0);
    expect(getMinContrastThreshold(16, '400', 'AAA')).toBe(7.0);
    expect(getMinContrastThreshold(24, '400', 'AAA')).toBe(4.5);
  });

  it('blends semi-transparent colors with background', () => {
    const semiBlack = { r: 0, g: 0, b: 0, a: 0.5 };
    const whiteBg = { r: 255, g: 255, b: 255, a: 1 };
    const blended = blendColors(semiBlack, whiteBg);
    expect(blended.r).toBeCloseTo(128, -1);
    expect(blended.g).toBeCloseTo(128, -1);
    expect(blended.b).toBeCloseTo(128, -1);
  });
});

describe('Heading Auditor', () => {
  it('identifies heading level correctly for standard and ARIA tags', () => {
    const h1 = createMockElement('h1');
    const h3 = createMockElement('h3');
    const ariaH2 = createMockElement('div', { role: 'heading', 'aria-level': '2' });

    expect(getHeadingLevel(h1)).toBe(1);
    expect(getHeadingLevel(h3)).toBe(3);
    expect(getHeadingLevel(ariaH2)).toBe(2);
  });

  it('detects missing H1', () => {
    const root = createMockElement('div', {}, '', [
      createMockElement('h2', {}, 'Section Title')
    ]);
    const issues = auditHeadings(root);
    expect(issues.some(i => i.ruleId === 'headings-missing-h1')).toBe(true);
    expect(issues.some(i => i.ruleId === 'headings-invalid-start')).toBe(true);
  });

  it('detects multiple H1s', () => {
    const root = createMockElement('div', {}, '', [
      createMockElement('h1', {}, 'First Main Title'),
      createMockElement('h1', {}, 'Second Main Title')
    ]);
    const issues = auditHeadings(root);
    expect(issues.some(i => i.ruleId === 'headings-multiple-h1')).toBe(true);
  });

  it('detects skipped heading levels (e.g. h1 to h3)', () => {
    const root = createMockElement('div', {}, '', [
      createMockElement('h1', {}, 'Main Title'),
      createMockElement('h3', {}, 'Skipped Subtitle')
    ]);
    const issues = auditHeadings(root);
    const skipIssue = issues.find(i => i.ruleId === 'headings-skip-level');
    expect(skipIssue).toBeDefined();
    expect(skipIssue?.severity).toBe('error');
  });

  it('detects empty headings', () => {
    const root = createMockElement('div', {}, '', [
      createMockElement('h1', {}, 'Valid Title'),
      createMockElement('h2', {}, '   ')
    ]);
    const issues = auditHeadings(root);
    const emptyIssue = issues.find(i => i.ruleId === 'headings-empty');
    expect(emptyIssue).toBeDefined();
  });
});

describe('Images Auditor & Context Extractor', () => {
  it('identifies generic alt text patterns', () => {
    expect(isGenericAlt('image')).toBe(true);
    expect(isGenericAlt('photo')).toBe(true);
    expect(isGenericAlt('photo.jpg')).toBe(true);
    expect(isGenericAlt('screenshot')).toBe(true);
    expect(isGenericAlt('banner')).toBe(true);
    expect(isGenericAlt('A golden retriever playing catch in the park')).toBe(false);
  });

  it('detects missing alt attributes on images', () => {
    const root = createMockElement('div', {}, '', [
      createMockElement('img', { src: '/hero.png' })
    ]);
    const issues = auditImages(root);
    const missingAlt = issues.find(i => i.ruleId === 'img-alt-missing');
    expect(missingAlt).toBeDefined();
    expect(missingAlt?.severity).toBe('error');
  });

  it('detects generic alt attribute and flags warning', () => {
    const root = createMockElement('div', {}, '', [
      createMockElement('img', { src: '/dog.png', alt: 'photo' })
    ]);
    const issues = auditImages(root);
    const genericAlt = issues.find(i => i.ruleId === 'img-alt-generic');
    expect(genericAlt).toBeDefined();
    expect(genericAlt?.severity).toBe('warning');
  });

  it('extracts surrounding DOM context for Chrome AI alt generation', () => {
    const figcaption = createMockElement('figcaption', {}, 'Graph showing annual carbon emissions');
    const img = createMockElement('img', { src: '/chart.svg' });
    const figure = createMockElement('figure', {}, '', [img, figcaption]);

    const context = extractImageContext(img);
    expect(context.src).toBe('/chart.svg');
    expect(context.caption).toBe('Graph showing annual carbon emissions');
  });
});

describe('SEO & Link Auditor', () => {
  it('detects generic link anchor text like "click here"', () => {
    const link = createMockElement('a', { href: '/docs' }, 'click here');
    const root = createMockElement('div', {}, '', [link]);
    const issues = auditSeo(root);
    const genericLink = issues.find(i => i.ruleId === 'link-text-generic');
    expect(genericLink).toBeDefined();
    expect(genericLink?.severity).toBe('warning');
  });
});

describe('Prompts & AI Builders', () => {
  it('builds WCAG remedy prompt with details and ruleId', () => {
    const prompt = buildRemedyPrompt({
      id: 'test-1',
      ruleId: 'headings-skip-level',
      category: 'a11y',
      severity: 'error',
      title: 'Skipped heading level',
      description: 'Heading skips from h1 to h3',
      wcagCriterion: 'WCAG 1.3.1',
      htmlSnippet: '<h3>Skip</h3>'
    });

    expect(prompt).toContain('headings-skip-level');
    expect(prompt).toContain('WCAG 1.3.1');
    expect(prompt).toContain('<h3>Skip</h3>');
  });

  it('builds context-aware alt text prompt for Gemini Nano', () => {
    const prompt = buildAltTextPrompt({
      src: '/assets/team-retreat.jpg',
      hasAltAttribute: false,
      precedingHeading: 'Our Annual Company Summit',
      surroundingText: 'The engineering team gathered in Lake Tahoe for a 3-day hackathon.',
      isDecorativeCandidate: false
    });

    expect(prompt).toContain('team-retreat.jpg');
    expect(prompt).toContain('Our Annual Company Summit');
    expect(prompt).toContain('Lake Tahoe');
  });
});

describe('Astro Integration Hook', () => {
  it('creates an Astro integration with name and setup hook', () => {
    const integration = devAuditNano();
    expect(integration.name).toBe('astro-dev-audit-nano');
    expect(typeof integration.hooks['astro:config:setup']).toBe('function');

    let registeredApp: any = null;
    const setupHook = integration.hooks['astro:config:setup'];
    if (setupHook) {
      (setupHook as any)({
        addDevToolbarApp: (app: any) => {
          registeredApp = app;
        }
      });
    }

    expect(registeredApp).toBeDefined();
    expect(registeredApp.id).toBe('astro-dev-audit-nano');
    expect(registeredApp.entrypoint).toBe('astro-dev-audit-nano/app');
  });
});
