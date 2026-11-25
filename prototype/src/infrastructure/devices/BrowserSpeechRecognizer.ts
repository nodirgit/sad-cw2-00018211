import { SpeechRecognizer } from '../../application/ports/SpeechRecognizer';

/**
 * Realizes SpeechRecognizer with the browser's Web Speech API (Chrome / Edge).
 * When it is missing, the screen shows only the text box (FR-06 fallback).
 */
export class BrowserSpeechRecognizer implements SpeechRecognizer {
  private readonly lang: string;

  constructor(lang = 'uz-UZ') {
    this.lang = lang;
  }

  private recognitionClass(): any {
    if (typeof window === 'undefined') return undefined;
    const w = window as any;
    return w.SpeechRecognition ?? w.webkitSpeechRecognition;
  }

  isAvailable(): boolean {
    return Boolean(this.recognitionClass());
  }

  listen(): Promise<string> {
    const Recognition = this.recognitionClass();
    if (!Recognition) return Promise.reject(new Error('Speech input is not available in this browser.'));
    return new Promise((resolve, reject) => {
      const rec = new Recognition();
      rec.lang = this.lang;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e: any) => resolve(String(e.results[0][0].transcript ?? ''));
      rec.onerror = (e: any) => reject(new Error(`Microphone error: ${e.error ?? 'unknown'}`));
      rec.onnomatch = () => reject(new Error('Did not catch that. Try again or type it.'));
      rec.start();
    });
  }
}
