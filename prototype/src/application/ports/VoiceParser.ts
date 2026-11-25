import { ParsedEntry } from '../../domain/voice/ParsedEntry';

/**
 * FR-06, "encapsulate the change": today a rule-based parser; later a speech/LLM
 * service could implement the same interface.
 */
export interface VoiceParser {
  parse(utterance: string, today?: Date): ParsedEntry;
}
