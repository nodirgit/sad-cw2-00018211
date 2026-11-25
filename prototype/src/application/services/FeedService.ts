import { DomainError } from '../../domain/DomainError';
import { Batch } from '../../domain/farm/Batch';
import { FeedDelivery } from '../../domain/feed/FeedDelivery';
import { Supplier, SupplierType } from '../../domain/feed/Supplier';
import { ExpenseCategory } from '../../domain/finance/Expense';
import { User } from '../../domain/people/User';
import { newId } from '../ids';
import { Repository } from '../ports/Repository';
import { AccessPolicy } from './AccessPolicy';
import { BatchProfitService } from './BatchProfitService';
import { FarmService } from './FarmService';
import { MortalityService } from './MortalityService';

export interface FeedDeliveryResult {
  delivery: FeedDelivery;
  feedPerBirdKg: number;
}

/** FR-02: feed deliveries tied to supplier, house and batch; feed per bird for that batch. */
export class FeedService {
  private readonly deliveries: Repository<FeedDelivery>;
  private readonly suppliers: Repository<Supplier>;
  private readonly farm: FarmService;
  private readonly mortality: MortalityService;
  private readonly profit: BatchProfitService;
  private readonly policy: AccessPolicy;

  constructor(
    deliveries: Repository<FeedDelivery>,
    suppliers: Repository<Supplier>,
    farm: FarmService,
    mortality: MortalityService,
    profit: BatchProfitService,
    policy: AccessPolicy,
  ) {
    this.deliveries = deliveries;
    this.suppliers = suppliers;
    this.farm = farm;
    this.mortality = mortality;
    this.profit = profit;
    this.policy = policy;
  }

  feedSuppliers(): Supplier[] {
    return this.suppliers.findAll().filter((s) => s.getType() === SupplierType.FEED);
  }

  /**
   * FR-02 edge case: the delivery goes to the batch open in the chosen house.
   * NFR-03: a Worker cannot enter (or see) the cost; the Director's cost also becomes a FEED expense (FR-03).
   */
  recordDelivery(houseId: string, supplierId: string, quantityKg: number, cost: number | null, user: User, date: Date = new Date()): FeedDeliveryResult {
    const supplier = this.suppliers.findById(supplierId);
    if (!supplier) throw new DomainError('Pick a supplier.');
    if (cost !== null && !this.policy.canSeeMoney(user)) throw new DomainError('Only the Director enters feed costs.');
    const batch = this.farm.openBatch(houseId);
    const delivery = new FeedDelivery(newId('feed'), batch.getId(), supplier, date, quantityKg, cost);
    this.deliveries.save(delivery);
    if (cost !== null) {
      this.profit.recordExpenseForBatch(batch.getId(), ExpenseCategory.FEED, cost, `${quantityKg.toLocaleString('en-US')} kg, ${supplier.getName()}`, date, user, `exp-${delivery.getId()}`);
    }
    return { delivery, feedPerBirdKg: this.feedPerBird(batch) };
  }

  deliveriesFor(batchId: string): FeedDelivery[] {
    return this.deliveries
      .findAll()
      .filter((d) => d.getBatchId() === batchId)
      .sort((a, b) => b.getDate().getTime() - a.getDate().getTime());
  }

  totalKg(batchId: string): number {
    return this.deliveriesFor(batchId).reduce((s, d) => s + d.getQuantityKg(), 0);
  }

  /** FR-02: kg delivered for this batch ÷ birds alive in this batch. */
  feedPerBird(batch: Batch): number {
    const alive = this.mortality.birdsAlive(batch);
    return alive === 0 ? 0 : this.totalKg(batch.getId()) / alive;
  }
}
