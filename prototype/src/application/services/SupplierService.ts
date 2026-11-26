import { DomainError } from '../../domain/DomainError';
import { Supplier, SupplierType } from '../../domain/feed/Supplier';
import { User } from '../../domain/people/User';
import { newId } from '../ids';
import { Repository } from '../ports/Repository';
import { AccessPolicy } from './AccessPolicy';

/**
 * NFR-05: chick and feed suppliers are configuration the Director keeps up to date
 * (add, rename, remove) — no code change.
 */
export class SupplierService {
  private readonly suppliers: Repository<Supplier>;
  private readonly policy: AccessPolicy;

  constructor(suppliers: Repository<Supplier>, policy: AccessPolicy) {
    this.suppliers = suppliers;
    this.policy = policy;
  }

  /** Suppliers still in use, optionally of one type. */
  activeSuppliers(type?: SupplierType): Supplier[] {
    return this.suppliers
      .findAll()
      .filter((s) => s.isActive() && (type === undefined || s.getType() === type))
      .sort((a, b) => a.getType().localeCompare(b.getType()) || a.getName().localeCompare(b.getName()));
  }

  addSupplier(name: string, type: SupplierType, user: User): Supplier {
    this.policy.requireDirector(user);
    this.checkNameFree(name);
    const supplier = new Supplier(newId('sup'), name, type);
    this.suppliers.save(supplier);
    return supplier;
  }

  renameSupplier(supplierId: string, name: string, user: User): Supplier {
    this.policy.requireDirector(user);
    const supplier = this.require(supplierId);
    this.checkNameFree(name, supplierId);
    supplier.rename(name);
    this.suppliers.save(supplier);
    return supplier;
  }

  /** Removes the supplier from every list. Past deliveries keep its name (it is archived, not erased). */
  removeSupplier(supplierId: string, user: User): void {
    this.policy.requireDirector(user);
    const supplier = this.require(supplierId);
    supplier.archive();
    this.suppliers.save(supplier);
  }

  private require(supplierId: string): Supplier {
    const supplier = this.suppliers.findById(supplierId);
    if (!supplier || !supplier.isActive()) throw new DomainError('Unknown supplier.');
    return supplier;
  }

  private checkNameFree(name: string, exceptId?: string): void {
    const clash = this.activeSuppliers().find((s) => s.getId() !== exceptId && s.getName().toLowerCase() === name.trim().toLowerCase());
    if (clash) throw new DomainError(`There is already a supplier called "${name.trim()}".`);
  }
}
