import type { AuditIssue } from './types.js';
export interface RGBA {
    r: number;
    g: number;
    b: number;
    a: number;
}
export declare function parseColor(colorStr: string): RGBA | null;
export declare function blendColors(foreground: RGBA, background: RGBA): RGBA;
export declare function getRelativeLuminance(rgba: RGBA): number;
export declare function getContrastRatio(c1: RGBA | string, c2: RGBA | string): number;
export declare function isLargeText(fontSizePx: number, fontWeight: string | number): boolean;
export declare function getMinContrastThreshold(fontSizePx: number, fontWeight: string | number, level?: 'AA' | 'AAA'): number;
export declare function getEffectiveBackgroundColor(el: Element): RGBA;
export declare function auditContrast(root?: Document | Element): AuditIssue[];
//# sourceMappingURL=contrast.d.ts.map