/** Anything a repository can store: it must know its own id. */
export interface Identifiable {
  getId(): string;
}

/**
 * DIP: services depend on this abstraction, not on localStorage.
 * Realized by LocalStorageRepository (the app) and InMemoryRepository (tests, users);
 * a real database repository could replace them without touching a service.
 */
export interface Repository<T extends Identifiable> {
  findAll(): T[];
  findById(id: string): T | undefined;
  save(item: T): void;
  delete(id: string): void;
}
