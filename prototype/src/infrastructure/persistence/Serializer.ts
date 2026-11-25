/** Converts a domain object to plain JSON data and back (keeps storage details out of the domain). */
export interface Serializer<T> {
  toRecord(item: T): unknown;
  fromRecord(record: any): T;
}
