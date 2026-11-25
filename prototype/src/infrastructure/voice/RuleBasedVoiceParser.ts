import { VoiceParser } from '../../application/ports/VoiceParser';
import { ExpenseCategory } from '../../domain/finance/Expense';
import { ParsedEntry, ParsedField } from '../../domain/voice/ParsedEntry';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Word stems per category, Uzbek (Latin) + English + Russian. Matched at the start of a word. */
const CATEGORY_STEMS: Record<ExpenseCategory, string[]> = {
  [ExpenseCategory.FEED]: ['yem', 'feed', 'ozuqa', 'корм'],
  [ExpenseCategory.VET]: ['vet', 'dori', 'vitamin', 'vaksina', 'vaccin', 'emla', 'medicine', 'лекар', 'витамин'],
  [ExpenseCategory.DRIVER]: ['haydovchi', 'shofyor', 'shofer', 'driver', 'водител'],
  [ExpenseCategory.CREW]: ['brigada', 'crew', "so'yuvchi", "so'yish", 'бригад'],
  [ExpenseCategory.CHICKS]: ["jo'ja", 'chick', 'цыпл'],
  [ExpenseCategory.OTHER]: ['elektr', 'svet', 'electric', 'gaz', 'gas', 'remont', 'repair', "ta'mir", 'benzin', 'fuel', 'suv', 'water', 'ремонт'],
};

const ORDINALS: Record<string, number> = { birinchi: 1, ikkinchi: 2, uchinchi: 3, first: 1, second: 2, third: 3 };

/**
 * FR-06: rule-based parser (regular expressions) — realizes VoiceParser.
 * Reads amount ("150 ming", "1,5 mln", "85 thousand"), date ("bugun", "kecha", "12.11"),
 * category (keywords), house ("1-xona", "house 2") and keeps the rest as the reason.
 * Anything it cannot read with confidence is returned as unsure, never guessed silently.
 */
export class RuleBasedVoiceParser implements VoiceParser {
  parse(utterance: string, today: Date = new Date()): ParsedEntry {
    let text = ` ${utterance.toLowerCase().replace(/[’ʻʼ`‘]/g, "'")} `;

    // House: "1-xona", "2 uy", "house 1", "birinchi xona"
    let houseNumber: ParsedField<number> = ParsedField.unsure<number>(null);
    const houseMatch =
      text.match(/(\d+)\s*-?\s*(xona|uy)\b/) ?? text.match(/\bhouse\s*(\d+)/) ?? text.match(/\b(birinchi|ikkinchi|uchinchi|first|second|third)\s+(xona|uy|house)\b/);
    if (houseMatch) {
      houseNumber = ParsedField.sure(ORDINALS[houseMatch[1]] ?? Number(houseMatch[1]));
      text = text.replace(houseMatch[0], ' ');
    }

    // Date: "bugun"/"today", "kecha"/"yesterday", or "12.11" (but not "1.5 mln")
    let date: ParsedField<Date> = ParsedField.unsure(today);
    const dmy = text.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b(?!\s*(mln|million|ming|thousand|k)\b)/);
    if (/\b(bugun|today|сегодня)\b/.test(text)) {
      date = ParsedField.sure(today);
      text = text.replace(/\b(bugun|today|сегодня)\b/, ' ');
    } else if (/\b(kecha|yesterday|вчера)\b/.test(text)) {
      date = ParsedField.sure(new Date(today.getTime() - DAY_MS));
      text = text.replace(/\b(kecha|yesterday|вчера)\b/, ' ');
    } else if (dmy) {
      const year = dmy[3] ? (dmy[3].length === 2 ? 2000 + Number(dmy[3]) : Number(dmy[3])) : today.getFullYear();
      const parsed = new Date(year, Number(dmy[2]) - 1, Number(dmy[1]));
      date = isNaN(parsed.getTime()) ? ParsedField.unsure(today) : ParsedField.sure(parsed);
      text = text.replace(dmy[0], ' ');
    }

    // Amount: "150 000" is one number said in groups → join it first
    text = text.replace(/\b\d{1,3}(?:[  ]\d{3})+\b/g, (g) => g.replace(/[  ]/g, ''));
    const amounts: number[] = [];
    let plainSmall = false;
    text = text.replace(/(\d+(?:[.,]\d+)?)\s*(ming|минг|тысяч\w*|thousand|k|mln|million|millions|миллион\w*)?(?![\wа-я])/g, (_all, num: string, unit?: string) => {
      const value = Number(num.replace(',', '.'));
      if (unit && /^(ming|минг|тысяч|thousand|k)/.test(unit)) amounts.push(value * 1_000);
      else if (unit && /^(mln|million|миллион)/.test(unit)) amounts.push(value * 1_000_000);
      else {
        amounts.push(value);
        if (value < 1000) plainSmall = true;
      }
      return ' ';
    });
    const amount: ParsedField<number> =
      amounts.length === 1 && amounts[0] >= 1000 && !plainSmall ? ParsedField.sure(Math.round(amounts[0])) : ParsedField.unsure(amounts.length ? Math.round(amounts[0]) : null);

    // Category: exactly one category's keyword → sure
    const found = (Object.keys(CATEGORY_STEMS) as ExpenseCategory[]).filter((cat) =>
      CATEGORY_STEMS[cat].some((stem) => new RegExp(`(^|[^a-z'а-я])${stem}`).test(text)),
    );
    const category: ParsedField<ExpenseCategory> = found.length === 1 ? ParsedField.sure(found[0]) : ParsedField.unsure<ExpenseCategory>(found[0] ?? null);

    // Reason: what is left, tidied
    const left = text
      .replace(/(^|\s)(uchun|for|paid|to'ladim|berdim|so'm|sum|uzs)(?=\s|$)/g, ' ')
      .replace(/[,.;:!?]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const reason = /[a-zа-я]{3,}/.test(left) ? ParsedField.sure(left.charAt(0).toUpperCase() + left.slice(1)) : ParsedField.unsure<string>(null);

    return new ParsedEntry(utterance, amount, date, category, reason, houseNumber);
  }
}
