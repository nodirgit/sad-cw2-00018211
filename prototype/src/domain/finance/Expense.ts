import { FinancialEntry } from './FinancialEntry';

export enum ExpenseCategory {
  CHICKS = 'CHICKS',
  FEED = 'FEED',
  CREW = 'CREW',
  DRIVER = 'DRIVER',
  VET = 'VET',
  OTHER = 'OTHER',
}

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  [ExpenseCategory.CHICKS]: 'Chicks',
  [ExpenseCategory.FEED]: 'Feed',
  [ExpenseCategory.CREW]: 'Slaughter crew',
  [ExpenseCategory.DRIVER]: 'Delivery driver',
  [ExpenseCategory.VET]: 'Vet & vitamins',
  [ExpenseCategory.OTHER]: 'Other',
};

/**
 * Where an expense came from. MANUAL ones are typed in (Expense entry) and can be edited or
 * deleted there; the others are created by another record and change only with it.
 */
export enum ExpenseSource {
  MANUAL = 'MANUAL',
  FEED_DELIVERY = 'FEED_DELIVERY',
  CREW_PAY = 'CREW_PAY',
}

/** Money out, against one batch (FR-03). */
export class Expense extends FinancialEntry {
  private readonly category: ExpenseCategory;
  private readonly note: string;
  private readonly source: ExpenseSource;

  constructor(id: string, batchId: string, date: Date, amount: number, category: ExpenseCategory, note = '', source: ExpenseSource = ExpenseSource.MANUAL) {
    super(id, batchId, date, amount);
    this.category = category;
    this.note = note;
    this.source = source;
  }

  getSource(): ExpenseSource {
    return this.source;
  }

  /** true when another record (a feed delivery, a slaughter session) owns this expense. */
  isLinked(): boolean {
    return this.source !== ExpenseSource.MANUAL;
  }

  getCategory(): ExpenseCategory {
    return this.category;
  }

  getNote(): string {
    return this.note;
  }

  signedAmount(): number {
    return -this.amount;
  }

  describe(): string {
    return this.note ? `${EXPENSE_CATEGORY_LABEL[this.category]} — ${this.note}` : EXPENSE_CATEGORY_LABEL[this.category];
  }
}
