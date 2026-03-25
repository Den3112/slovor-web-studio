import { describe, expect, it, vi } from "vitest";
import { 
  formatDatabaseBackupResult,
  // @ts-ignore - internal functions might not be exported in types but are exported in JS
  sanitizeRestoreErrorMessage,
  // @ts-ignore
  timestamp,
  // @ts-ignore
  formatBackupSize,
  // @ts-ignore
  formatSqlLiteral,
  // @ts-ignore
  normalizeTableNameSet,
  // @ts-ignore
  normalizeNullifyColumnMap,
  // @ts-ignore
  quoteIdentifier,
  // @ts-ignore
  quoteQualifiedName
} from "./backup-lib.js";

describe("backup-lib utilities", () => {
  describe("sanitizeRestoreErrorMessage", () => {
    it("extracts message from object", () => {
      // @ts-ignore
      expect(sanitizeRestoreErrorMessage({ message: "Error line 1\nLine 2" })).toBe("Error line 1");
    });
    it("handles severity", () => {
      // @ts-ignore
      expect(sanitizeRestoreErrorMessage({ message: "msg", severity: "ERROR" })).toBe("ERROR: msg");
    });
    it("falls back to Error message", () => {
      // @ts-ignore
      expect(sanitizeRestoreErrorMessage(new Error("standard error"))).toBe("standard error");
    });
  });

  describe("timestamp", () => {
    it("formats date correctly", () => {
      const date = new Date(2023, 0, 1, 12, 30, 5); // 2023-01-01 12:30:05
      // @ts-ignore
      expect(timestamp(date)).toBe("20230101-123005");
    });
  });

  describe("formatBackupSize", () => {
    it("formats bytes", () => {
      // @ts-ignore
      expect(formatBackupSize(500)).toBe("500B");
    });
    it("formats kilobytes", () => {
      // @ts-ignore
      expect(formatBackupSize(1500)).toBe("1.5K");
    });
    it("formats megabytes", () => {
      // @ts-ignore
      expect(formatBackupSize(1500000)).toBe("1.4M");
    });
  });

  describe("formatSqlLiteral", () => {
    it("wraps string in paperclip tags", () => {
      // @ts-ignore
      const result = formatSqlLiteral("some value");
      expect(result).toContain("$paperclip$some value$paperclip$");
    });
    it("handles nested tags by producing a unique tag", () => {
      // @ts-ignore
      const result = formatSqlLiteral("$paperclip$");
      expect(result).toMatch(/^\$paperclip_[a-z0-9]+\$\$paperclip\$\$paperclip_[a-z0-9]+\$$/);
    });
  });

  describe("normalizeTableNameSet", () => {
    it("cleans up table names", () => {
      // @ts-ignore
      const result = normalizeTableNameSet([" table1 ", "", "table2"]);
      expect(result.has("table1")).toBe(true);
      expect(result.has("table2")).toBe(true);
      expect(result.size).toBe(2);
    });
  });

  describe("normalizeNullifyColumnMap", () => {
    it("creates a map of table to column sets", () => {
      // @ts-ignore
      const result = normalizeNullifyColumnMap({
        "table1": ["col1", " col2 "],
        " ": ["col3"]
      });
      expect(result.get("table1")?.has("col1")).toBe(true);
      expect(result.get("table1")?.has("col2")).toBe(true);
      expect(result.has(" ")).toBe(false);
    });
  });

  describe("quoteIdentifier", () => {
    it("quotes identifiers with double quotes", () => {
      // @ts-ignore
      expect(quoteIdentifier("my_table")).toBe('"my_table"');
    });
    it("escapes existing double quotes", () => {
      // @ts-ignore
      expect(quoteIdentifier('my"table')).toBe('"my""table"');
    });
  });

  describe("formatDatabaseBackupResult", () => {
    it("formats result string", () => {
      const result = formatDatabaseBackupResult({
        backupFile: "/path/to/backup.sql",
        sizeBytes: 1024,
        prunedCount: 2
      });
      expect(result).toBe("/path/to/backup.sql (1.0K; pruned 2 old backup(s))");
    });
  });
});
