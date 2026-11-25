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

/** Money out, against one batch (FR-03). */
export class Expense extends FinancialEntry {
  private readonly category: ExpenseCategory;
  private readonly note: string;

  constructor(id: string, batchId: string, date: Date, amount: number, category: ExpenseCategory, note = '') {
    super(id, batchId, date, amount);
    this.category = category;
    this.note = note;
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
