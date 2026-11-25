import { DomainError } from '../../domain/DomainError';
import { Expense, ExpenseCategory } from '../../domain/finance/Expense';
import { User } from '../../domain/people/User';
import { ParsedEntry } from '../../domain/voice/ParsedEntry';
import { VoiceParser } from '../ports/VoiceParser';
import { BatchProfitService } from './BatchProfitService';

/** The values the director confirmed on screen (flagged fields included). */
export interface ConfirmedEntry {
  houseId: string;
  amount: number | null;
  date: Date | null;
  category: ExpenseCategory | null;
  reason: string;
}

/** FR-06: spoken small costs → parsed fields → confirmed expense on the right batch. */
export class VoiceEntryService {
  private readonly parser: VoiceParser;
  private readonly profit: BatchProfitService;

  constructor(parser: VoiceParser, profit: BatchProfitService) {
    this.parser = parser;
    this.profit = profit;
  }

  parse(utterance: string): ParsedEntry {
    if (!utterance.trim()) throw new DomainError('Say or type the cost first.');
    return this.parser.parse(utterance, new Date());
  }

  /** Saved only once every field has a value the director has seen. */
  confirm(entry: ConfirmedEntry, user: User): Expense {
    if (entry.amount === null || !(entry.amount > 0)) throw new DomainError('Confirm the amount.');
    if (entry.date === null) throw new DomainError('Confirm the date.');
    if (entry.category === null) throw new DomainError('Confirm the category.');
    if (!entry.reason.trim()) throw new DomainError('Confirm the reason.');
    return this.profit.recordExpense(entry.houseId, entry.category, entry.amount, entry.reason.trim(), entry.date, user);
  }
}
