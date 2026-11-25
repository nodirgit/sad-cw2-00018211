import { ExpenseCategory } from '../finance/Expense';

/** One field read from speech: the value (if any) and whether the parser is sure. */
export class ParsedField<T> {
  private readonly value: T | null;
  private readonly confident: boolean;

  private constructor(value: T | null, confident: boolean) {
    this.value = value;
    this.confident = confident;
  }

  static sure<T>(value: T): ParsedField<T> {
    return new ParsedField<T>(value, true);
  }

  /** FR-06 edge case: not parsed confidently → shown to the director to confirm, never guessed silently. */
  static unsure<T>(value: T | null): ParsedField<T> {
    return new ParsedField<T>(value, false);
  }

  getValue(): T | null {
    return this.value;
  }

  isConfident(): boolean {
    return this.confident && this.value !== null;
  }
}

/** FR-06: what the voice parser understood from one spoken record. */
export class ParsedEntry {
  private readonly utterance: string;
  private readonly amount: ParsedField<number>;
  private readonly date: ParsedField<Date>;
  private readonly category: ParsedField<ExpenseCategory>;
  private readonly reason: ParsedField<string>;
  /** House number if the speaker said one ("1-xona"); optional. */
  private readonly houseNumber: ParsedField<number>;

  constructor(
    utterance: string,
    amount: ParsedField<number>,
    date: ParsedField<Date>,
    category: ParsedField<ExpenseCategory>,
    reason: ParsedField<string>,
    houseNumber: ParsedField<number>,
  ) {
    this.utterance = utterance;
    this.amount = amount;
    this.date = date;
    this.category = category;
    this.reason = reason;
    this.houseNumber = houseNumber;
  }

  getUtterance(): string {
    return this.utterance;
  }

  getAmount(): ParsedField<number> {
    return this.amount;
  }

  getDate(): ParsedField<Date> {
    return this.date;
  }

  getCategory(): ParsedField<ExpenseCategory> {
    return this.category;
  }

  getReason(): ParsedField<string> {
    return this.reason;
  }

  getHouseNumber(): ParsedField<number> {
    return this.houseNumber;
  }

  /** Names of the required fields the director must confirm before saving. */
  flaggedFields(): string[] {
    const out: string[] = [];
    if (!this.amount.isConfident()) out.push('amount');
    if (!this.date.isConfident()) out.push('date');
    if (!this.category.isConfident()) out.push('category');
    if (!this.reason.isConfident()) out.push('reason');
    return out;
  }

  needsConfirmation(): boolean {
    return this.flaggedFields().length > 0;
  }
}
