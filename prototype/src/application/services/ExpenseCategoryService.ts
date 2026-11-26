import { DomainError } from '../../domain/DomainError';
import { CustomCategory } from '../../domain/finance/CustomCategory';
import { EXPENSE_CATEGORY_LABEL } from '../../domain/finance/Expense';
import { User } from '../../domain/people/User';
import { newId } from '../ids';
import { Repository } from '../ports/Repository';
import { AccessPolicy } from './AccessPolicy';

/**
 * NFR-05: the Director adds, renames and removes their own expense categories — no code change.
 * The built-in categories (ExpenseCategory) stay fixed: feed deliveries, crew pay and the
 * voice helper depend on them.
 */
export class ExpenseCategoryService {
  private readonly categories: Repository<CustomCategory>;
  private readonly policy: AccessPolicy;

  constructor(categories: Repository<CustomCategory>, policy: AccessPolicy) {
    this.categories = categories;
    this.policy = policy;
  }

  /** Categories still offered on the expense form, A–Z. */
  activeCategories(): CustomCategory[] {
    return this.categories
      .findAll()
      .filter((c) => c.isActive())
      .sort((a, b) => a.getName().localeCompare(b.getName()));
  }

  /** Any category, archived ones included (an old expense may still use it). */
  find(categoryId: string): CustomCategory | undefined {
    return this.categories.findById(categoryId);
  }

  addCategory(name: string, user: User): CustomCategory {
    this.policy.requireDirector(user);
    this.checkNameFree(name);
    const category = new CustomCategory(newId('cat'), name);
    this.categories.save(category);
    return category;
  }

  renameCategory(categoryId: string, name: string, user: User): CustomCategory {
    this.policy.requireDirector(user);
    const category = this.require(categoryId);
    this.checkNameFree(name, categoryId);
    category.rename(name);
    this.categories.save(category);
    return category;
  }

  /** Removes the category from the form. Past expenses keep its name (archived, not erased). */
  removeCategory(categoryId: string, user: User): void {
    this.policy.requireDirector(user);
    const category = this.require(categoryId);
    category.archive();
    this.categories.save(category);
  }

  private require(categoryId: string): CustomCategory {
    const category = this.categories.findById(categoryId);
    if (!category || !category.isActive()) throw new DomainError('Unknown category.');
    return category;
  }

  private checkNameFree(name: string, exceptId?: string): void {
    const wanted = name.trim().toLowerCase();
    const builtIn = Object.values(EXPENSE_CATEGORY_LABEL).find((label) => label.toLowerCase() === wanted);
    if (builtIn) throw new DomainError(`"${builtIn}" is already a built-in category.`);
    const clash = this.activeCategories().find((c) => c.getId() !== exceptId && c.getName().toLowerCase() === wanted);
    if (clash) throw new DomainError(`There is already a category called "${clash.getName()}".`);
  }
}
