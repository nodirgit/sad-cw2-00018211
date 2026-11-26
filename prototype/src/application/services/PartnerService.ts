import { DomainError } from '../../domain/DomainError';
import { Buyer, BuyerGroup } from '../../domain/finance/Buyer';
import { Supplier, SupplierType } from '../../domain/feed/Supplier';
import { Partner } from '../../domain/partners/Partner';
import { PartnerDetails } from '../../domain/partners/PartnerDetails';
import { User } from '../../domain/people/User';
import { newId } from '../ids';
import { Repository } from '../ports/Repository';
import { AccessPolicy } from './AccessPolicy';

/**
 * NFR-05: the farm's trading partners — buyers we sell to and suppliers we buy from — are kept
 * by the Director (add, rename, remove) with no code change, and can be added on the spot while
 * recording a sale or a delivery.
 */
export class PartnerService {
  private readonly buyers: Repository<Buyer>;
  private readonly suppliers: Repository<Supplier>;
  private readonly policy: AccessPolicy;

  constructor(buyers: Repository<Buyer>, suppliers: Repository<Supplier>, policy: AccessPolicy) {
    this.buyers = buyers;
    this.suppliers = suppliers;
    this.policy = policy;
  }

  /** Buyers still in use, A–Z, optionally only some groups. */
  activeBuyers(groups?: BuyerGroup[]): Buyer[] {
    return this.buyers
      .findAll()
      .filter((b) => b.isActive() && (groups === undefined || groups.includes(b.getGroup())))
      .sort(byName);
  }

  /** Suppliers still in use, A–Z, optionally of one type. */
  activeSuppliers(type?: SupplierType): Supplier[] {
    return this.suppliers
      .findAll()
      .filter((s) => s.isActive() && (type === undefined || s.getType() === type))
      .sort(byName);
  }

  /** Every active partner, buyers and suppliers, A–Z. */
  activePartners(): Partner[] {
    return [...this.activeBuyers(), ...this.activeSuppliers()].sort(byName);
  }

  /** Any partner, archived ones included. */
  findPartner(partnerId: string): Partner | undefined {
    return this.buyers.findById(partnerId) ?? this.suppliers.findById(partnerId);
  }

  /** Any buyer, archived ones included (a past sale may name it). */
  findBuyer(buyerId: string): Buyer | undefined {
    return this.buyers.findById(buyerId);
  }

  addBuyer(name: string, group: BuyerGroup, user: User, details: PartnerDetails = PartnerDetails.empty()): Buyer {
    this.policy.requireDirector(user);
    this.checkNameFree(name);
    this.checkTinFree(details);
    const buyer = new Buyer(newId('buyer'), name, group, true, details);
    this.buyers.save(buyer);
    return buyer;
  }

  addSupplier(name: string, type: SupplierType, user: User, details: PartnerDetails = PartnerDetails.empty()): Supplier {
    this.policy.requireDirector(user);
    this.checkNameFree(name);
    this.checkTinFree(details);
    const supplier = new Supplier(newId('sup'), name, type, true, details);
    this.suppliers.save(supplier);
    return supplier;
  }

  /** Correct a partner's name, TIN and contact details. Its group stays (past sales depend on it). */
  updatePartner(partnerId: string, name: string, details: PartnerDetails, user: User): Partner {
    this.policy.requireDirector(user);
    const partner = this.require(partnerId);
    this.checkNameFree(name, partnerId);
    this.checkTinFree(details, partnerId);
    partner.update(name, details);
    this.store(partner);
    return partner;
  }

  /** Removes the partner from every list. Past sales and deliveries keep its name (archived, not erased). */
  removePartner(partnerId: string, user: User): void {
    this.policy.requireDirector(user);
    const partner = this.require(partnerId);
    partner.archive();
    this.store(partner);
  }

  private require(partnerId: string): Partner {
    const partner = this.buyers.findById(partnerId) ?? this.suppliers.findById(partnerId);
    if (!partner || !partner.isActive()) throw new DomainError('Unknown partner.');
    return partner;
  }

  private store(partner: Partner): void {
    if (partner instanceof Buyer) this.buyers.save(partner);
    else if (partner instanceof Supplier) this.suppliers.save(partner);
  }

  /** Two partners with the same TIN are the same firm entered twice. */
  private checkTinFree(details: PartnerDetails, exceptId?: string): void {
    if (!details.tin) return;
    const clash = this.activePartners().find((p) => p.getId() !== exceptId && p.getDetails().tin === details.tin);
    if (clash) throw new DomainError(`TIN ${details.tin} already belongs to ${clash.getName()}.`);
  }

  private checkNameFree(name: string, exceptId?: string): void {
    const wanted = name.trim().toLowerCase();
    const clash = this.activePartners().find((p) => p.getId() !== exceptId && p.getName().toLowerCase() === wanted);
    if (clash) throw new DomainError(`There is already a partner called "${clash.getName()}" (${clash.groupLabel()}).`);
  }
}

const byName = (a: Partner, b: Partner) => a.getName().localeCompare(b.getName());
