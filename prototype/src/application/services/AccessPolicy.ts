import { DomainError } from '../../domain/DomainError';
import { User } from '../../domain/people/User';

/**
 * NFR-03: costs, revenue and profit only under the Director's login.
 * One place for the rule, so screens and services ask the same question.
 */
export class AccessPolicy {
  canSeeMoney(user: User): boolean {
    return user.canViewFinancials();
  }

  /** A money value as this user may see it: the number, or null (hidden). */
  visibleAmount(user: User, amount: number | null): number | null {
    return this.canSeeMoney(user) ? amount : null;
  }

  /** A record can be changed by the person who entered it, or by the Director. */
  canChange(user: User, enteredBy?: User): boolean {
    return this.canSeeMoney(user) || (enteredBy !== undefined && enteredBy.getId() === user.getId());
  }

  requireDirector(user: User): void {
    if (!this.canSeeMoney(user)) throw new DomainError('Only the Director can do this.');
  }
}
