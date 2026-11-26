import { Identifiable, Repository } from '../../application/ports/Repository';

/** Realizes Repository<T> in memory: used for the fixed user list and in the unit tests. */
export class InMemoryRepository<T extends Identifiable> implements Repository<T> {
  private readonly items = new Map<string, T>();

  constructor(initial: T[] = []) {
    initial.forEach((i) => this.items.set(i.getId(), i));
  }

  findAll(): T[] {
    return [...this.items.values()];
  }

  findById(id: string): T | undefined {
    return this.items.get(id);
  }

  save(item: T): void {
    this.items.set(item.getId(), item);
  }

  delete(id: string): void {
    this.items.delete(id);
  }
}
