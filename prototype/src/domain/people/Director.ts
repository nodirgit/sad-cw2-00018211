import { User } from './User';

/** The owner-director: bears the financial risk and is the only one who sees money (NFR-03). */
export class Director extends User {
  canViewFinancials(): boolean {
    return true;
  }

  roleName(): string {
    return 'Director';
  }
}
