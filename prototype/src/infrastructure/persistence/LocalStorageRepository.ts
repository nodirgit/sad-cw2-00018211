import { Identifiable, Repository } from '../../application/ports/Repository';
import { Serializer } from './Serializer';

/**
 * Realizes Repository<T> with the browser's localStorage (prototype only).
 * Loads lazily, keeps the live objects in memory, writes the whole list on save.
 */
export class LocalStorageRepository<T extends Identifiable> implements Repository<T> {
  private readonly key: string;
  private readonly serializer: Serializer<T>;
  private readonly storage: Storage;
  private cache: Map<string, T> | null = null;

  constructor(key: string, serializer: Serializer<T>, storage: Storage) {
    this.key = key;
    this.serializer = serializer;
    this.storage = storage;
  }

  findAll(): T[] {
    return [...this.load().values()];
  }

  findById(id: string): T | undefined {
    return this.load().get(id);
  }

  save(item: T): void {
    this.load().set(item.getId(), item);
    this.storage.setItem(this.key, JSON.stringify(this.findAll().map((i) => this.serializer.toRecord(i))));
  }

  private load(): Map<string, T> {
    if (this.cache) return this.cache;
    this.cache = new Map();
    const raw = this.storage.getItem(this.key);
    if (raw) {
      try {
        for (const record of JSON.parse(raw) as unknown[]) {
          const item = this.serializer.fromRecord(record);
          this.cache.set(item.getId(), item);
        }
      } catch (e) {
        console.error(`Could not read ${this.key}; starting empty.`, e);
      }
    }
    return this.cache;
  }
}
