import { DomainError } from '../../domain/DomainError';
import { Batch } from '../../domain/farm/Batch';
import { FeedDelivery } from '../../domain/feed/FeedDelivery';
import { Supplier, SupplierType } from '../../domain/feed/Supplier';
import { ExpenseCategory, ExpenseSource } from '../../domain/finance/Expense';
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
    return this.suppliers.findAll().filter((s) => s.isActive() && s.getType() === SupplierType.FEED);
  }

  /**
   * FR-02 edge case: the delivery goes to the batch open in the chosen house.
   * NFR-03: a Worker cannot enter (or see) the cost; the Director's cost also becomes a FEED expense (FR-03).
   */
  recordDelivery(houseId: string, supplierId: string, quantityKg: number, cost: number | null, user: User, date: Date = new Date()): FeedDeliveryResult {
    const supplier = this.suppliers.findById(supplierId);
    if (!supplier || !supplier.isActive()) throw new DomainError('Pick a supplier.');
    if (cost !== null && !this.policy.canSeeMoney(user)) throw new DomainError('Only the Director enters feed costs.');
    const batch = this.farm.openBatch(houseId);
    const delivery = new FeedDelivery(newId('feed'), batch.getId(), supplier, date, quantityKg, cost);
    this.deliveries.save(delivery);
    if (cost !== null) {
      this.bookCost(delivery, user);
    }
    return { delivery, feedPerBirdKg: this.feedPerBird(batch) };
  }

  /** NFR-03: a Worker may change only deliveries without a cost; the Director any. The batch must be open. */
  canChange(delivery: FeedDelivery, user: User): boolean {
    return (this.policy.canSeeMoney(user) || !delivery.hasCost()) && (this.farm.batch(delivery.getBatchId())?.isOpen() ?? false);
  }

  /** Correct supplier, kg or (Director only) cost. The linked FEED expense follows the cost. */
  editDelivery(deliveryId: string, supplierId: string, quantityKg: number, cost: number | null, user: User): FeedDelivery {
    const old = this.changeable(deliveryId, user);
    if (cost !== null && !this.policy.canSeeMoney(user)) throw new DomainError('Only the Director enters feed costs.');
    const supplier = this.suppliers.findById(supplierId);
    if (!supplier || (!supplier.isActive() && supplier.getId() !== old.getSupplier().getId())) throw new DomainError('Pick a supplier.');
    const keepCost = this.policy.canSeeMoney(user) ? cost : old.getCost();
    const updated = new FeedDelivery(old.getId(), old.getBatchId(), supplier, old.getDate(), quantityKg, keepCost);
    this.deliveries.save(updated);
    if (updated.hasCost()) this.bookCost(updated, user);
    else if (old.hasCost()) this.profit.removeLinkedEntry(FeedService.expenseId(updated), user);
    return updated;
  }

  /** Remove a delivery entered by mistake, with its FEED expense. */
  deleteDelivery(deliveryId: string, user: User): void {
    const old = this.changeable(deliveryId, user);
    this.deliveries.delete(deliveryId);
    if (old.hasCost()) this.profit.removeLinkedEntry(FeedService.expenseId(old), user);
  }

  /** Active feed suppliers, plus this delivery's own supplier if it was removed since. */
  suppliersFor(delivery: FeedDelivery): Supplier[] {
    const list = this.feedSuppliers();
    return list.some((s) => s.getId() === delivery.getSupplier().getId()) ? list : [delivery.getSupplier(), ...list];
  }

  private changeable(deliveryId: string, user: User): FeedDelivery {
    const d = this.deliveries.findById(deliveryId);
    if (!d) throw new DomainError('Delivery not found.');
    if (!(this.farm.batch(d.getBatchId())?.isOpen() ?? false)) throw new DomainError('This batch is closed; its records are locked.');
    if (!this.policy.canSeeMoney(user) && d.hasCost()) throw new DomainError('This delivery has a cost; only the Director can change it.');
    return d;
  }

  /** FR-03: the delivery's cost is a FEED expense of its batch, with a fixed id so a change replaces it. */
  private bookCost(delivery: FeedDelivery, user: User): void {
    const cost = delivery.getCost();
    if (cost === null) return;
    this.profit.recordExpenseForBatch(
      delivery.getBatchId(),
      ExpenseCategory.FEED,
      cost,
      `${delivery.getQuantityKg().toLocaleString('en-US')} kg, ${delivery.getSupplier().getName()}`,
      delivery.getDate(),
      user,
      FeedService.expenseId(delivery),
      ExpenseSource.FEED_DELIVERY,
    );
  }

  private static expenseId(delivery: FeedDelivery): string {
    return `exp-${delivery.getId()}`;
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
