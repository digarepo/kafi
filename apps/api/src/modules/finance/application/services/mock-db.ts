/**
 * Minimal chainable Drizzle-style mock for unit testing finance services
 * without a real database. Every query builder method returns the same
 * mock instance so that `await db.select().from().where()` resolves the
 * next queued value.
 *
 * @remarks
 * Mirrors `apps/api/src/modules/travellers/application/services/mock-db.ts`
 * so finance service specs follow the same testing convention.
 */
export class MockDb {
  queue: unknown[] = [];
  calls: string[] = [];
  insertValues: unknown[] = [];
  updateSets: unknown[] = [];

  setQueue(values: unknown[]) {
    this.queue = [...values];
    return this;
  }

  private logCall(name: string) {
    this.calls.push(name);
    return this;
  }

  then(onFulfilled?: (value: unknown) => unknown, onRejected?: unknown) {
    const value = this.queue.shift();
    if (typeof onFulfilled === "function") {
      onFulfilled(value);
    }
  }

  select(..._args: unknown[]) {
    return this.logCall("select");
  }

  insert(..._args: unknown[]) {
    this.insertValues.length = 0;
    return this.logCall("insert");
  }

  update(..._args: unknown[]) {
    this.updateSets.length = 0;
    return this.logCall("update");
  }

  delete(..._args: unknown[]) {
    return this.logCall("delete");
  }

  from(..._args: unknown[]) {
    return this.logCall("from");
  }

  values(...args: unknown[]) {
    this.insertValues.push(args[0]);
    return this.logCall("values");
  }

  set(...args: unknown[]) {
    this.updateSets.push(args[0]);
    return this.logCall("set");
  }

  where(..._args: unknown[]) {
    return this.logCall("where");
  }

  and(..._args: unknown[]) {
    return this.logCall("and");
  }

  or(..._args: unknown[]) {
    return this.logCall("or");
  }

  eq(..._args: unknown[]) {
    return this.logCall("eq");
  }

  like(..._args: unknown[]) {
    return this.logCall("like");
  }

  max(..._args: unknown[]) {
    return this.logCall("max");
  }

  innerJoin(..._args: unknown[]) {
    return this.logCall("innerJoin");
  }

  leftJoin(..._args: unknown[]) {
    return this.logCall("leftJoin");
  }

  orderBy(..._args: unknown[]) {
    return this.logCall("orderBy");
  }

  limit(..._args: unknown[]) {
    return this.logCall("limit");
  }

  offset(..._args: unknown[]) {
    return this.logCall("offset");
  }

  $dynamic(..._args: unknown[]) {
    return this.logCall("$dynamic");
  }

  async transaction<T>(callback: (db: MockDb) => Promise<T> | T): Promise<T> {
    const result = await callback(this);
    return result as T;
  }
}

export function createMockDb(queue: unknown[] = []) {
  return new MockDb().setQueue(queue);
}
