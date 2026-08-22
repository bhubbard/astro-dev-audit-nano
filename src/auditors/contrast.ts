import type { AuditIssue } from './types.js';
import { getElementSelector } from './headings.js';

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

const NAMED_COLORS: Record<string, [number, number, number]> = {
  black: [0, 0, 0],
  white: [255, 255, 255],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  darkgray: [169, 169, 169],
  lightgray: [211, 211, 211],
  transparent: [0, 0, 0],
};

export function parseColor(colorStr: string): RGBA | null {
  const str = colorStr.trim().toLowerCase();
  if (!str || str === 'inherit' || str === 'initial' || str === 'unset') return null;

  if (str === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  if (NAMED_COLORS[str]) {
    const [r, g, b] = NAMED_COLORS[str];
    return { r, g, b, a: 1 };
  }

  // Hex format #rgb, #rgba, #rrggbb, #rrggbbaa
  if (str.startsWith('#')) {
    const hex = str.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    if (hex.length === 4) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: parseInt(hex[3] + hex[3], 16) / 255,
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255,
      };
    }
  }

  // rgb(r, g, b) or rgba(r, g, b, a) or modern rgb(r g b / a)
  const rgbMatch = str.match(/rgba?\s*\(\s*([\d.%]+)[\s,]+([\d.%]+)[\s,]+([\d.%]+)(?:[\s,/]+([\d.%]+))?\s*\)/);
  if (rgbMatch) {
    const parseChannel = (val: string): number => {
      if (val.endsWith('%')) {
        return Math.round((parseFloat(val) / 100) * 255);
      }
      return parseFloat(val);
    };

    const parseAlpha = (val?: string): number => {
      if (!val) return 1;
      if (val.endsWith('%')) {
        return parseFloat(val) / 100;
      }
      return parseFloat(val);
    };

    return {
      r: parseChannel(rgbMatch[1]),
      g: parseChannel(rgbMatch[2]),
      b: parseChannel(rgbMatch[3]),
      a: parseAlpha(rgbMatch[4]),
    };
  }

  return null;
}

export function blendColors(foreground: RGBA, background: RGBA): RGBA {
  if (foreground.a >= 1) return foreground;
  const a = foreground.a + background.a * (1 - foreground.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };

  const r = Math.round((foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / a);
  const g = Math.round((foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / a);
  const b = Math.round((foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / a);

  return { r, g, b, a };
}

export function getRelativeLuminance(rgba: RGBA): number {
  const toLinear = (channel: number): number => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const r = toLinear(rgba.r);
  const g = toLinear(rgba.g);
  const b = toLinear(rgba.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(c1: RGBA | string, c2: RGBA | string): number {
  const color1 = typeof c1 === 'string' ? parseColor(c1) : c1;
  const color2 = typeof c2 === 'string' ? parseColor(c2) : c2;

  if (!color1 || !color2) return 1;

  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  const ratio = (brightest + 0.05) / (darkest + 0.05);
  return Math.round(ratio * 100) / 100;
}

export function isLargeText(fontSizePx: number, fontWeight: string | number): boolean {
  const weightNum = typeof fontWeight === 'string' ? (parseInt(fontWeight, 10) || (fontWeight === 'bold' ? 700 : 400)) : fontWeight;
  // Large text: >= 24px (18pt) or >= 18.66px (14pt) bold (>= 700)
  if (fontSizePx >= 24) return true;
  if (fontSizePx >= 18.66 && weightNum >= 700) return true;
  return false;
}

export function getMinContrastThreshold(fontSizePx: number, fontWeight: string | number, level: 'AA' | 'AAA' = 'AA'): number {
  const isLarge = isLargeText(fontSizePx, fontWeight);
  if (level === 'AAA') {
    return isLarge ? 4.5 : 7.0;
  }
  return isLarge ? 3.0 : 4.5;
}

export function getEffectiveBackgroundColor(el: Element): RGBA {
  let current: Element | null = el;
  let blended: RGBA = { r: 255, g: 255, b: 255, a: 1 }; // default page bg is white

  const docElement = typeof document !== 'undefined' ? document.documentElement : null;
  const bgColors: RGBA[] = [];
  while (current && current !== docElement) {
    if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
      const style = window.getComputedStyle(current);
      const bg = parseColor(style.backgroundColor);
      if (bg && bg.a > 0) {
        bgColors.unshift(bg);
        if (bg.a === 1) {
          break;
        }
      }
    }
    current = current.parentElement;
  }

  for (const bg of bgColors) {
    blended = blendColors(bg, blended);
  }

  return blended;
}

export function auditContrast(root: Document | Element = typeof document !== 'undefined' ? document : ({} as Document)): AuditIssue[] {
  const issues: AuditIssue[] = [];
  if (typeof window === 'undefined' || !root || typeof root.querySelectorAll !== 'function') {
    return issues;
  }

  const textNodesCandidates = Array.from(
    root.querySelectorAll('p, span, a, h1, h2, h3, h4, h5, h6, li, label, button, blockquote, dt, dd, th, td')
  );

  const seenElements = new Set<Element>();

  textNodesCandidates.forEach((el, index) => {
    if (seenElements.has(el)) return;
    const text = (el.textContent || '').trim();
    if (!text || text.length === 0) return;

    // Check if element is visible
    if (typeof window.getComputedStyle === 'function') {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return;
      }

      const fgColor = parseColor(style.color);
      if (!fgColor) return;

      const bgColor = getEffectiveBackgroundColor(el);
      const effectiveFg = blendColors(fgColor, bgColor);
      const ratio = getContrastRatio(effectiveFg, bgColor);

      const fontSize = parseFloat(style.fontSize) || 16;
      const fontWeight = style.fontWeight || '400';
      const isLarge = isLargeText(fontSize, fontWeight);
      const minRatio = getMinContrastThreshold(fontSize, fontWeight, 'AA');

      if (ratio < minRatio) {
        seenElements.add(el);
        const selector = getElementSelector(el);
        const htmlSnippet = el.outerHTML ? el.outerHTML.slice(0, 160) : `<${el.tagName.toLowerCase()}>${text.slice(0, 40)}</${el.tagName.toLowerCase()}>`;

        issues.push({
          id: `contrast-low-${index}`,
          ruleId: 'contrast-ratio-low',
          category: 'a11y',
          severity: 'error',
          title: `Low contrast ratio (${ratio}:1 < ${minRatio}:1)`,
          description: `Element text has a contrast ratio of ${ratio}:1 against its background. WCAG 2.1 AA requires a minimum contrast of ${minRatio}:1 for ${isLarge ? 'large' : 'normal'} text.`,
          wcagCriterion: 'WCAG 1.4.3 Contrast (Minimum) (Level AA)',
          element: el,
          selector,
          htmlSnippet,
          remedyHint: `Adjust text color (${style.color}) or background color to achieve at least ${minRatio}:1 contrast.`,
          context: {
            ratio,
            minRatio,
            textColor: style.color,
            fontSize,
            fontWeight,
            isLargeText: isLarge,
            snippet: text.slice(0, 60),
          },
        });
      }
    }
  });

  return issues;
}
