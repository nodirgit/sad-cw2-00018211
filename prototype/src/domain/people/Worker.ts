import { User } from './User';

/** One of the 2–4 permanent workers: records deaths and feed, never sees money (NFR-03). */
export class Worker extends User {
  canViewFinancials(): boolean {
    return false;
  }

  roleName(): string {
    return 'Worker';
  }
}
