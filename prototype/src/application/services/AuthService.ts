import { DomainError } from '../../domain/DomainError';
import { User } from '../../domain/people/User';
import { Repository } from '../ports/Repository';

/** NFR-03: login by user + PIN, and who is logged in now. */
export class AuthService {
  private readonly users: Repository<User>;
  private current: User | null = null;

  constructor(users: Repository<User>) {
    this.users = users;
  }

  listUsers(): User[] {
    return this.users.findAll();
  }

  login(userId: string, pin: string): User {
    const user = this.users.findById(userId);
    if (!user || !user.checkPin(pin)) throw new DomainError('Wrong PIN. Try again.');
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
