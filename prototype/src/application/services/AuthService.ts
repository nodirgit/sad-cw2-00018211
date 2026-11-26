import { DomainError } from '../../domain/DomainError';
import { User } from '../../domain/people/User';
import { Repository } from '../ports/Repository';

/** NFR-03: login by PIN alone (each person's PIN is their own), and who is logged in now. */
export class AuthService {
  private readonly users: Repository<User>;
  private current: User | null = null;

  constructor(users: Repository<User>) {
    this.users = users;
  }

  /** The PIN says who it is: no need to pick a name first. */
  login(pin: string): User {
    const user = this.users.findAll().find((u) => u.checkPin(pin));
    if (!user) throw new DomainError('Wrong PIN. Try again.');
    this.current = user;
    return user;
  }

  logout(): void {
    this.current = null;
  }

  currentUser(): User | null {
    return this.current;
  }
}
