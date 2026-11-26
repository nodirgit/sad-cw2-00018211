import { DomainError } from '../DomainError';
import { PartnerDetails } from './PartnerDetails';

/**
 * A firm or person the farm trades with: one we sell to (Buyer) or buy from (Supplier).
 * Generalization: Partner ← Buyer, Supplier; each says which group it belongs to (polymorphism).
 * A partner that is removed is archived, not erased: past sales and deliveries still name it.
 */
export abstract class Partner {
  protected readonly id: string;
  protected name: string;
  protected active: boolean;
  protected details: PartnerDetails;

  constructor(id: string, name: string, active = true, details: PartnerDetails = PartnerDetails.empty()) {
    this.id = id;
    this.name = Partner.clean(name);
    this.active = active;
    this.details = details;
  }

  /** TIN and contact details (composition: a value object owned by the partner). */
  getDetails(): PartnerDetails {
    return this.details;
  }

  /** Correct the name and the details together. */
  update(name: string, details: PartnerDetails): void {
    this.name = Partner.clean(name);
    this.details = details;
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  /** false once removed from the lists; kept so the history stays readable. */
  isActive(): boolean {
    return this.active;
  }

  archive(): void {
    this.active = false;
  }

  /** The group the partner is listed under, e.g. "Resellers" or "Feed suppliers". */
  abstract groupLabel(): string;

  private static clean(name: string): string {
    const n = name.trim();
    if (!n) throw new DomainError('A partner needs a name.');
    return n;
  }
}
