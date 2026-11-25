/** FR-06: turns the director's speech into text. The text box is always the fallback. */
export interface SpeechRecognizer {
  isAvailable(): boolean;
  listen(): Promise<string>;
}
