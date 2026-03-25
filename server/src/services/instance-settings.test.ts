import { describe, it, expect, vi, beforeEach } from "vitest";
import { instanceSettingsService } from "./instance-settings.js";

describe("instanceSettingsService", () => {
  let dbMock: any;

  beforeEach(() => {
    dbMock = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      onConflictDoUpdate: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb: any) => Promise.resolve([]).then(cb)),
    };
  });

  it("gets existing settings", async () => {
    const existingRow = {
      id: "row-1",
      singletonKey: "default",
      general: { censorUsernameInLogs: true },
      experimental: { enableIsolatedWorkspaces: true },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([existingRow]).then(cb));

    const svc = instanceSettingsService(dbMock);
    const settings = await svc.get();

    expect(settings.id).toBe("row-1");
    expect(settings.general.censorUsernameInLogs).toBe(true);
    expect(settings.experimental.enableIsolatedWorkspaces).toBe(true);
  });

  it("creates settings if not exists", async () => {
    // 1st call for select returns empty
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb));
    // 2nd call for insert returning
    const createdRow = { id: "new-row", general: {}, experimental: {} };
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([createdRow]).then(cb));

    const svc = instanceSettingsService(dbMock);
    const settings = await svc.get();

    expect(settings.id).toBe("new-row");
    expect(dbMock.insert).toHaveBeenCalled();
  });

  it("updates general settings", async () => {
    const existingRow = { id: "row-1", general: { censorUsernameInLogs: false }, experimental: {} };
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([existingRow]).then(cb)); // for getOrCreate
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ ...existingRow, general: { censorUsernameInLogs: true } }]).then(cb)); // for update returning

    const svc = instanceSettingsService(dbMock);
    const updated = await svc.updateGeneral({ censorUsernameInLogs: true });

    expect(updated.general.censorUsernameInLogs).toBe(true);
    expect(dbMock.update).toHaveBeenCalled();
  });

  it("lists company ids", async () => {
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ id: "comp-1" }, { id: "comp-2" }]).then(cb));
    const svc = instanceSettingsService(dbMock);
    const ids = await svc.listCompanyIds();
    expect(ids).toEqual(["comp-1", "comp-2"]);
  });
});
