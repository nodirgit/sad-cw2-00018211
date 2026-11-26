import { DomainError } from '../DomainError';

/**
 * NFR-05: an expense category the Director adds (e.g. "Electricity"), next to the built-in ones.
 * A removed category is archived, not erased: past expenses still show its name.
 */
export class CustomCategory {
  private readonly id: string;
  private name: string;
  private active: boolean;

  constructor(id: string, name: string, active = true) {
    this.id = id;
    this.name = CustomCategory.clean(name);
    this.active = active;
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  /** false once removed from the list; kept so the history stays readable. */
  isActive(): boolean {
    return this.active;
  }

  rename(name: string): void {
    this.name = CustomCategory.clean(name);
  }

  archive(): void {
    this.active = false;
  }

  private static clean(name: string): string {
    const n = name.trim();
    if (!n) throw new DomainError('A category needs a name.');
    if (n.length > 30) throw new DomainError('Keep the category name short (30 letters at most).');
    return n;
  }
}
