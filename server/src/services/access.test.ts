import { describe, it, expect, vi, beforeEach } from "vitest";
import { accessService } from "./access.js";

describe("accessService", () => {
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
      delete: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      transaction: vi.fn().mockImplementation((cb: any) => cb(dbMock)),
      then: vi.fn().mockImplementation((cb: any) => Promise.resolve([]).then(cb)),
    };
  });

  describe("isInstanceAdmin", () => {
    it("returns true if user is instance admin", async () => {
      dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ id: "role-1" }]).then(cb));
      const svc = accessService(dbMock);
      const isAdmin = await svc.isInstanceAdmin("user-1");
      expect(isAdmin).toBe(true);
    });
    it("returns false if user is not instance admin", async () => {
      dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb));
      const svc = accessService(dbMock);
      const isAdmin = await svc.isInstanceAdmin("user-1");
      expect(isAdmin).toBe(false);
    });
  });

  describe("canUser", () => {
    it("returns true if user is instance admin", async () => {
      // isInstanceAdmin call
      dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ id: "role-1" }]).then(cb));
      const svc = accessService(dbMock);
      const can = await svc.canUser("comp-1", "user-1", "any:perm" as any);
      expect(can).toBe(true);
    });
    it("delegates to hasPermission if not instance admin", async () => {
      // isInstanceAdmin returns false
      dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb));
      // getMembership returns active
      dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ status: "active" }]).then(cb));
      // hasPermission grant exists
      dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ id: "grant-1" }]).then(cb));

      const svc = accessService(dbMock);
      const can = await svc.canUser("comp-1", "user-1", "any:perm" as any);
      expect(can).toBe(true);
    });
  });

  describe("ensureMembership", () => {
    it("returns existing if status matches", async () => {
      const existing = { id: "mem-1", status: "active", membershipRole: "member" };
      dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([existing]).then(cb));
      const svc = accessService(dbMock);
      const res = await svc.ensureMembership("comp-1", "user", "user-1");
      expect(res).toEqual(existing);
      expect(dbMock.insert).not.toHaveBeenCalled();
    });
    it("inserts if not exists", async () => {
      dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // getMembership
      dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ id: "new-mem" }]).then(cb)); // insert returning
      const svc = accessService(dbMock);
      const res = await svc.ensureMembership("comp-1", "user", "user-1");
      expect(res.id).toBe("new-mem");
      expect(dbMock.insert).toHaveBeenCalled();
    });
  });

  describe("setUserCompanyAccess", () => {
    it("syncs company memberships", async () => {
      const existing = [{ id: "mem-old", companyId: "comp-old" }];
      dbMock.then.mockImplementation((cb: any) => Promise.resolve(existing).then(cb)); // listUserCompanyAccess
      
      const svc = accessService(dbMock);
      await svc.setUserCompanyAccess("user-1", ["comp-new"]);
      
      expect(dbMock.delete).toHaveBeenCalled();
      expect(dbMock.insert).toHaveBeenCalled();
    });
  });
});
