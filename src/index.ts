import type { AstroIntegration } from 'astro';

export interface AuditNanoOptions {
  /**
   * Automatically run accessibility and SEO audit upon page load.
   * @default true
   */
  autoRun?: boolean;
}

const ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/><circle cx="12" cy="12" r="4"/></svg>`;

/**
 * Astro Dev Toolbar integration for real-time WCAG a11y & SEO audits
 * powered by Chrome Built-in AI (Gemini Nano).
 */
export default function devAuditNano(options: AuditNanoOptions = {}): AstroIntegration {
  return {
    name: 'astro-dev-audit-nano',
    hooks: {
      'astro:config:setup': ({ addDevToolbarApp }) => {
        addDevToolbarApp({
          id: 'astro-dev-audit-nano',
          name: 'AI a11y & SEO Auditor',
          icon: ICON_SVG,
          entrypoint: 'astro-dev-audit-nano/app',
        });
      },
    },
  };
}

export { devAuditNano };
export * from './auditors/index.js';
export * from './prompts.js';
