import type { AuditIssue } from './types.js';
export interface ImageContext {
    src: string;
    currentAlt?: string;
    hasAltAttribute: boolean;
    caption?: string;
    precedingHeading?: string;
    surroundingText?: string;
    parentLinkHref?: string;
    parentLinkText?: string;
    isDecorativeCandidate: boolean;
}
export declare function isGenericAlt(alt: string): boolean;
export declare function extractImageContext(img: Element): ImageContext;
export declare function auditImages(root?: Document | Element): AuditIssue[];
//# sourceMappingURL=images.d.ts.map