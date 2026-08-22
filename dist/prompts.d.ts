import type { AuditIssue } from './auditors/types.js';
import type { ImageContext } from './auditors/images.js';
import type { AICapabilityAvailability, AILanguageModel } from './chrome-ai.js';
export declare function buildRemedyPrompt(issue: AuditIssue): string;
export declare function buildAltTextPrompt(context: ImageContext): string;
export declare function checkChromeAIAvailability(): Promise<AICapabilityAvailability | 'unsupported'>;
export declare function createNanoModel(systemPrompt?: string): Promise<AILanguageModel | null>;
export declare function generateNanoRemedy(issue: AuditIssue, onChunk?: (text: string) => void): Promise<string>;
export declare function generateNanoAltText(context: ImageContext, onChunk?: (text: string) => void): Promise<string>;
//# sourceMappingURL=prompts.d.ts.map