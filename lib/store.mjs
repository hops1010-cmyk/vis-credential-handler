export class RecordStore {
  constructor(db) {
    this.db = db;
  }
  async get(id) {
    const row = await this.db
      .prepare("SELECT data,revision FROM vault_records WHERE id=?")
      .bind(id)
      .first();
    return row ? { value: JSON.parse(row.data), revision: row.revision } : null;
  }
  async set(id, value) {
    await this.db
      .prepare(
        "INSERT INTO vault_records(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=revision+1",
      )
      .bind(id, JSON.stringify(value))
      .run();
  }
  async delete(id) {
    await this.db
      .prepare("DELETE FROM vault_records WHERE id=?")
      .bind(id)
      .run();
  }
  async mutate(id, fn) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const previous = await this.get(id);
      const value = await fn(previous?.value ?? null);
      if (value === undefined) return previous?.value;
      const result = previous
        ? await this.db
            .prepare(
              "UPDATE vault_records SET data=?,revision=revision+1 WHERE id=? AND revision=?",
            )
            .bind(JSON.stringify(value), id, previous.revision)
            .run()
        : await this.db
            .prepare("INSERT OR IGNORE INTO vault_records(id,data) VALUES(?,?)")
            .bind(id, JSON.stringify(value))
            .run();
      if (result.meta.changes === 1) return value;
    }
    throw new Error("Concurrent update; retry the action");
  }
  async list(prefix) {
    const result = await this.db
      .prepare("SELECT id,data FROM vault_records WHERE id LIKE ? ORDER BY id")
      .bind(prefix + "%")
      .all();
    return result.results.map((r) => ({ id: r.id, value: JSON.parse(r.data) }));
  }
}
