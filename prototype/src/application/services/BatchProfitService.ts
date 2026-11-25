import { DomainError } from '../../domain/DomainError';
import { Buyer } from '../../domain/finance/Buyer';
import { Expense, ExpenseCategory } from '../../domain/finance/Expense';
import { FinancialEntry } from '../../domain/finance/FinancialEntry';
import { Sale } from '../../domain/finance/Sale';
import { User } from '../../domain/people/User';
import { newId } from '../ids';
import { Repository } from '../ports/Repository';
import { AccessPolicy } from './AccessPolicy';
import { FarmService } from './FarmService';

export interface BuyerTotal {
  buyerType: string;
  kg: number;
  amount: number;
}

export interface BatchProfit {
  batchId: string;
  costsByCategory: Partial<Record<ExpenseCategory, number>>;
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
  recordExpense(houseId: string, category: ExpenseCategory, amount: number, note: string, date: Date, user: User, id: string = newId('exp')): Expense {
    const batch = this.farm.openBatch(houseId);
    return this.recordExpenseForBatch(batch.getId(), category, amount, note, date, user, id);
  }

  /** Used when the batch is already known (crew pay for a session, a feed delivery). Same id = replace. */
  recordExpenseForBatch(batchId: string, category: ExpenseCategory, amount: number, note: string, date: Date, user: User, id: string = newId('exp')): Expense {
    this.policy.requireDirector(user);
    const expense = new Expense(id, batchId, date, amount, category, note);
    this.entries.save(expense);
    return expense;
  }

  /**
   * Sales to buyers that do not need a cross-check (shop, Nurata seller, client).
   * A Bazaar Agent sale must come through CrossCheckService (FR-05).
   */
  recordDirectSale(houseId: string, buyer: Buyer, kg: number, pricePerKg: number, date: Date, user: User): Sale {
    if (buyer.requiresCrossCheck()) throw new DomainError(`${buyer.typeLabel()} sales are recorded from the weight cross-check.`);
    return this.recordSaleForBatch(this.farm.openBatch(houseId).getId(), buyer, kg, pricePerKg, date, user);
  }

  recordSaleForBatch(batchId: string, buyer: Buyer, kg: number, pricePerKg: number, date: Date, user: User): Sale {
    this.policy.requireDirector(user);
    const sale = new Sale(newId('sale'), batchId, date, buyer, kg, pricePerKg);
    this.entries.save(sale);
    return sale;
  }

  /** FR-03: profit = Σ signedAmount() — Expense is negative, Sale positive (polymorphism). */
  profitFor(batchId: string, user: User): BatchProfit {
    this.policy.requireDirector(user);
    const entries = this.entries
      .findAll()
      .filter((e) => e.getBatchId() === batchId)
      .sort((a, b) => b.getDate().getTime() - a.getDate().getTime());

    const costsByCategory: Partial<Record<ExpenseCategory, number>> = {};
    const byBuyer = new Map<string, BuyerTotal>();
    for (const e of entries) {
      if (e instanceof Expense) {
        costsByCategory[e.getCategory()] = (costsByCategory[e.getCategory()] ?? 0) + e.getAmount();
      } else if (e instanceof Sale) {
        const key = e.getBuyer().typeLabel();
        const t = byBuyer.get(key) ?? { buyerType: key, kg: 0, amount: 0 };
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
