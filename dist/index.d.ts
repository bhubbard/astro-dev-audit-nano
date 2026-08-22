import type { AstroIntegration } from 'astro';
export interface AuditNanoOptions {
    /**
     * Automatically run accessibility and SEO audit upon page load.
     * @default true
     */
    autoRun?: boolean;
}
/**
 * Astro Dev Toolbar integration for real-time WCAG a11y & SEO audits
 * powered by Chrome Built-in AI (Gemini Nano).
 */
export default function devAuditNano(options?: AuditNanoOptions): AstroIntegration;
export { devAuditNano };
export * from './auditors/index.js';
export * from './prompts.js';
//# sourceMappingURL=index.d.ts.map