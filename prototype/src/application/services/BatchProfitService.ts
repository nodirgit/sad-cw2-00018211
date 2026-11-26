import { DatePeriod } from '../../domain/DatePeriod';
import { DomainError } from '../../domain/DomainError';
import { Buyer } from '../../domain/finance/Buyer';
import { CustomCategory } from '../../domain/finance/CustomCategory';
import { Expense, ExpenseCategory, ExpenseSource } from '../../domain/finance/Expense';
import { FinancialEntry } from '../../domain/finance/FinancialEntry';
import { Sale } from '../../domain/finance/Sale';
import { User } from '../../domain/people/User';
import { newId } from '../ids';
import { Repository } from '../ports/Repository';
import { AccessPolicy } from './AccessPolicy';
import { FarmService } from './FarmService';

export interface BuyerTotal {
  buyerId: string;
  name: string;
  /** e.g. "Resellers" */
  group: string;
  kg: number;
  amount: number;
}

export interface BatchProfit {
  batchId: string;
  /** Category name (built-in or the Director's own) → total. */
  costsByCategory: Record<string, number>;
  salesByBuyer: BuyerTotal[];
  totalCosts: number;
  totalSales: number;
  profit: number;
  entries: FinancialEntry[];
}

/** FR-03: running profit for one batch, from that batch's entries only. Director only (NFR-03). */
export class BatchProfitService {
  private readonly entries: Repository<FinancialEntry>;
  private readonly farm: FarmService;
  private readonly policy: AccessPolicy;

  constructor(entries: Repository<FinancialEntry>, farm: FarmService, policy: AccessPolicy) {
    this.entries = entries;
    this.farm = farm;
    this.policy = policy;
  }

  /** FR-03 edge case: the cost goes to the batch open in that house, not a shared pool. */
  recordExpense(houseId: string, category: ExpenseCategory, amount: number, note: string, date: Date, user: User, customCategory: CustomCategory | null = null): Expense {
    this.policy.requireDirector(user);
    const batch = this.farm.openBatch(houseId);
    const expense = new Expense(newId('exp'), batch.getId(), date, amount, category, note, ExpenseSource.MANUAL, customCategory);
    this.entries.save(expense);
    return expense;
  }

  /** Used when the batch is already known (crew pay for a session, a feed delivery). Same id = replace. */
  recordExpenseForBatch(
    batchId: string,
    category: ExpenseCategory,
    amount: number,
    note: string,
    date: Date,
    user: User,
    id: string = newId('exp'),
    source: ExpenseSource = ExpenseSource.MANUAL,
  ): Expense {
    this.policy.requireDirector(user);
    const expense = new Expense(id, batchId, date, amount, category, note, source);
    this.entries.save(expense);
    return expense;
  }

  /**
   * Sales to buyers that do not need a cross-check (shop, Nurata seller, client).
   * A Bazaar Agent sale must come through CrossCheckService (FR-05).
   */
  recordDirectSale(houseId: string, buyer: Buyer, kg: number, pricePerKg: number, date: Date, user: User): Sale {
    if (buyer.requiresCrossCheck()) throw new DomainError(`Sales to ${buyer.groupLabel().toLowerCase()} are recorded from the weight cross-check.`);
    return this.recordSaleForBatch(this.farm.openBatch(houseId).getId(), buyer, kg, pricePerKg, date, user);
  }

  recordSaleForBatch(batchId: string, buyer: Buyer, kg: number, pricePerKg: number, date: Date, user: User): Sale {
    this.policy.requireDirector(user);
    const sale = new Sale(newId('sale'), batchId, date, buyer, kg, pricePerKg);
    this.entries.save(sale);
    return sale;
  }

  /** Expenses typed in by hand (Expense entry), newest first. */
  manualExpenses(user: User, period: DatePeriod = DatePeriod.allTime()): Expense[] {
    this.policy.requireDirector(user);
    return this.entries
      .findAll()
      .filter((e): e is Expense => e instanceof Expense && !e.isLinked() && period.contains(e.getDate()))
      .sort((a, b) => b.getDate().getTime() - a.getDate().getTime());
  }

  /** Every sale of every batch (direct and Bazaar Agent), newest first. */
  allSales(user: User): Sale[] {
    this.policy.requireDirector(user);
    return this.entries
      .findAll()
      .filter((e): e is Sale => e instanceof Sale)
      .sort((a, b) => b.getDate().getTime() - a.getDate().getTime());
  }

  /** The price per kg of the latest sale to this buyer, to prefill the next one; null if none yet. */
  lastPriceFor(buyerId: string, user: User): number | null {
    return this.allSales(user).find((s) => s.getBuyer().getId() === buyerId)?.getPricePerKg() ?? null;
  }

  /** Sales recorded directly (no cross-check), newest first. */
  directSales(user: User): Sale[] {
    return this.allSales(user).filter((s) => !s.getBuyer().requiresCrossCheck());
  }

  /** Why an entry cannot be changed here, or null when it can (a manual expense). */
  lockReason(entry: FinancialEntry): string | null {
    // FR-05: a Bazaar Agent sale belongs to its slaughter session's cross-check (polymorphism: requiresCrossCheck()).
    if (entry instanceof Sale && entry.getBuyer().requiresCrossCheck()) return 'Recorded from the agent cross-check. Undo the sale there.';
    if (entry instanceof Expense && entry.getSource() === ExpenseSource.FEED_DELIVERY) return 'Comes from a feed delivery. Change it on the Feed delivery screen.';
    if (entry instanceof Expense && entry.getSource() === ExpenseSource.CREW_PAY) return "The crew's pay for a slaughter session. Correct the head count there.";
    return null;
  }

  /** Correct a hand-typed expense; it stays on its batch. */
  editExpense(expenseId: string, category: ExpenseCategory, amount: number, note: string, date: Date, user: User, customCategory: CustomCategory | null = null): Expense {
    this.policy.requireDirector(user);
    const old = this.manualExpense(expenseId);
    const updated = new Expense(old.getId(), old.getBatchId(), date, amount, category, note.trim(), ExpenseSource.MANUAL, customCategory);
    this.entries.save(updated);
    return updated;
  }

  deleteExpense(expenseId: string, user: User): void {
    this.policy.requireDirector(user);
    this.manualExpense(expenseId);
    this.entries.delete(expenseId);
  }

  /** Correct a direct sale (shop, Nurata seller, client): kg and price per kg. */
  editDirectSale(saleId: string, kg: number, pricePerKg: number, user: User): Sale {
    this.policy.requireDirector(user);
    const old = this.entries.findById(saleId);
    if (!(old instanceof Sale)) throw new DomainError('Sale not found.');
    const locked = this.lockReason(old);
    if (locked) throw new DomainError(locked);
    const updated = new Sale(old.getId(), old.getBatchId(), old.getDate(), old.getBuyer(), kg, pricePerKg);
    this.entries.save(updated);
    return updated;
  }

  /** Delete any entry that is not owned by another record (a manual expense or a direct sale). */
  deleteEntry(entryId: string, user: User): void {
    this.policy.requireDirector(user);
    const e = this.entries.findById(entryId);
    if (!e) throw new DomainError('Entry not found.');
    const locked = this.lockReason(e);
    if (locked) throw new DomainError(locked);
    this.entries.delete(entryId);
  }

  /** Used by the service that owns a linked entry (feed cost, sale) when that record changes. */
  removeLinkedEntry(entryId: string, user: User): void {
    this.policy.requireDirector(user);
    this.entries.delete(entryId);
  }

  private manualExpense(expenseId: string): Expense {
    const e = this.entries.findById(expenseId);
    if (!(e instanceof Expense)) throw new DomainError('Expense not found.');
    const locked = this.lockReason(e);
    if (locked) throw new DomainError(locked);
    return e;
  }

  /** FR-03: profit = Σ signedAmount() — Expense is negative, Sale positive (polymorphism). */
  profitFor(batchId: string, user: User): BatchProfit {
    this.policy.requireDirector(user);
    const entries = this.entries
      .findAll()
      .filter((e) => e.getBatchId() === batchId)
      .sort((a, b) => b.getDate().getTime() - a.getDate().getTime());

    const costsByCategory: Record<string, number> = {};
    const byBuyer = new Map<string, BuyerTotal>();
    for (const e of entries) {
      if (e instanceof Expense) {
        const label = e.categoryLabel();
        costsByCategory[label] = (costsByCategory[label] ?? 0) + e.getAmount();
      } else if (e instanceof Sale) {
        const b = e.getBuyer();
        const key = b.getId();
        const t = byBuyer.get(key) ?? { buyerId: key, name: b.getName(), group: b.groupLabel(), kg: 0, amount: 0 };
        t.kg += e.getKg();
        t.amount += e.getAmount();
        byBuyer.set(key, t);
      }
    }
    const profit = entries.reduce((sum, e) => sum + e.signedAmount(), 0);
    const totalSales = entries.filter((e) => e.signedAmount() > 0).reduce((s, e) => s + e.signedAmount(), 0);
    return {
      batchId,
      costsByCategory,
      salesByBuyer: [...byBuyer.values()].sort((a, b) => b.amount - a.amount),
      totalCosts: totalSales - profit,
      totalSales,
      profit,
      entries,
    };
  }
}
