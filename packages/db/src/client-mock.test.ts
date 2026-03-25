import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  createDb, 
  getPostgresDataDirectory, 
  ensurePostgresDatabase, 
  inspectMigrations,
  migratePostgresIfEmpty,
  applyPendingMigrations,
  reconcilePendingMigrationHistory
} from "./client.js";
import postgres from "postgres";
import * as fs from "node:fs/promises";
import { drizzle } from "drizzle-orm/postgres-js";
import * as migrator from "drizzle-orm/postgres-js/migrator";

vi.mock("postgres", () => {
  const mock: any = vi.fn();
  mock.unsafe = vi.fn();
  mock.begin = vi.fn();
  mock.end = vi.fn();
  return { default: vi.fn(() => mock) };
});

vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: vi.fn((sql: any) => ({
    sql,
    migrate: async () => {} 
  })),
}));

vi.mock("drizzle-orm/postgres-js/migrator", () => ({
  migrate: vi.fn(),
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    readdir: vi.fn(),
    readFile: vi.fn(),
  };
});

describe("db: client FINAL 100", () => {
  let mockSql: any;
  let dbState: { migrated: boolean, hasTable: boolean, hasData: boolean, repaired: boolean, columnSet: Set<string>, schemaName: string };

  let queryHandler: (q: string) => any;

  const createPendingQuery = (query: string) => ({
    query,
    toString: () => query,
    then: (resolve: any, reject: any) => Promise.resolve(queryHandler(query)).then(resolve, reject),
  });

  const baseHandler = (q: string) => {
    const qL = q.toLowerCase();
    if (qL.includes("information_schema.columns")) return Array.from(dbState.columnSet).map(c => ({ column_name: c }));
    if (qL.includes("count(*)")) return [{ count: dbState.hasData || dbState.migrated || dbState.repaired ? 10 : 0 }];
    if (qL.includes("pg_class") || (qL.includes("__drizzle_migrations") && qL.includes("nspname"))) {
      if (dbState.hasTable || dbState.migrated || dbState.repaired) return [{ schemaName: dbState.schemaName }];
      return [];
    }
    if (qL.includes("select name") || qL.includes("select hash") || qL.includes("select id") || qL.includes("select created_at")) {
      if (dbState.migrated || dbState.repaired) return [{ name: "0001_initial.sql", id: 1, hash: "h1", created_at: 1000 }];
      return [];
    }
    if (qL.includes("select 1 as")) {
      if (qL.includes("pg_database")) return [];
      return [{ one: 1 }];
    }
    if (qL.includes("exists")) return [{ exists: dbState.hasTable || dbState.migrated || dbState.repaired }];
    if (qL.includes("current_setting")) return [{ data_directory: "/data" }];
    if (qL.includes("insert into") || qL.includes("create table") || qL.includes("update ") || qL.includes("create schema") || qL.includes("rollback")) {
      dbState.repaired = true;
      dbState.hasTable = true;
      return [];
    }
    return [];
  };

  beforeEach(() => {
    vi.clearAllMocks();
    dbState = { 
        migrated: false, 
        hasTable: false, 
        hasData: false, 
        repaired: false, 
        columnSet: new Set(["name", "hash", "created_at"]),
        schemaName: "public"
    };
    mockSql = (postgres as any)();
    (postgres as any).mockReturnValue(mockSql);

    queryHandler = baseHandler;

    const sqlImpl = (s: any, ...v: any[]) => {
      if (Array.isArray(s)) {
        let q = "";
        for (let i = 0; i < s.length; i++) {
          q += s[i];
          if (i < v.length) q += String(v[i]);
        }
        return Promise.resolve(queryHandler(q));
      }
      return createPendingQuery(s);
    };

    mockSql.mockImplementation(sqlImpl);
    mockSql.unsafe.mockImplementation((q: string) => createPendingQuery(q));
    mockSql.begin.mockImplementation(async (cb: any) => await cb(mockSql));
    mockSql.end = vi.fn();
    
    (migrator.migrate as any).mockImplementation(async () => {
      dbState.migrated = true;
      dbState.hasTable = true;
    });

    (fs.readdir as any).mockResolvedValue([{ isFile: () => true, name: "0001_initial.sql" }]);
    (fs.readFile as any).mockImplementation((p: any) => {
      if (String(p).includes("journal")) return Promise.resolve(JSON.stringify({ entries: [{ tag: "0001_initial", when: 1000 }] }));
      return Promise.resolve("CREATE TABLE t1");
    });
  });

  it("utility functions", async () => {
    expect(createDb("url")).toBeDefined();
    expect(await getPostgresDataDirectory("url")).toBe("/data");
    queryHandler = (q) => { if (q.includes("current_setting")) throw new Error("!!") ; return baseHandler(q); };
    expect(await getPostgresDataDirectory("url2")).toBeNull();
    queryHandler = baseHandler;
    expect(await ensurePostgresDatabase("url", "n")).toBe("created");
    queryHandler = (q) => q.includes("pg_database") ? [{ one: 1 }] : baseHandler(q);
    expect(await ensurePostgresDatabase("url", "e")).toBe("exists");
    await expect(ensurePostgresDatabase("url", "e;")).rejects.toThrow();
  });

  it("inspectMigrations states", async () => {
    dbState.migrated = true;
    expect((await inspectMigrations("url?1")).status).toBe("upToDate");
    dbState.migrated = false;
    dbState.columnSet = new Set(["hash"]);
    dbState.repaired = true;
    expect((await inspectMigrations("url?2")).status).toBe("upToDate");
    
    dbState.repaired = false;
    (fs.readdir as any).mockResolvedValueOnce([]); 
    expect((await inspectMigrations("url?3")).status).toBe("needsMigrations");
  });

  it("applyPendingMigrations: all paths", async () => {
    // 1. empty -> bootstrap
    await applyPendingMigrations("url?1");
    expect(dbState.migrated).toBe(true);

    // 2. pending -> reconcile
    dbState.migrated = false;
    dbState.repaired = false;
    dbState.hasTable = true;
    dbState.hasData = true;
    await applyPendingMigrations("url?2");
    expect(dbState.repaired).toBe(true);
  });

  it("reconcile: no schema branch", async () => {
    dbState.hasTable = false;
    dbState.hasData = true;
    queryHandler = (q) => q.includes("pg_class") ? [] : baseHandler(q);
    const res = await reconcilePendingMigrationHistory("url");
    expect(res.repairedMigrations).toHaveLength(0);
  });

  it("errors: bootstrap fail and manual fail", async () => {
    (migrator.migrate as any).mockImplementationOnce(() => { throw new Error("!!") });
    await expect(applyPendingMigrations("url")).rejects.toThrow();

    dbState.hasData = true;
    dbState.hasTable = true;
    mockSql.mockResolvedValue([]); // forces reconcile
    queryHandler = (q) => { if (q.includes("INSERT INTO")) throw new Error("!!"); return baseHandler(q); };
    await expect(applyPendingMigrations("url?manual")).rejects.toThrow();
  });

  it("migratePostgresIfEmpty branches", async () => {
    dbState.hasTable = true;
    expect((await migratePostgresIfEmpty("url?1")).reason).toBe("already-migrated");
    dbState.hasTable = false;
    dbState.hasData = true;
    expect((await migratePostgresIfEmpty("url?2")).reason).toBe("not-empty-no-migration-journal");
    dbState.hasData = false;
    expect((await migratePostgresIfEmpty("url?3")).migrated).toBe(true);
  });
});
