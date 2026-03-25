import { describe, it, expect } from "vitest";
import { assertBoard, assertCompanyAccess, getActorInfo } from "../routes/authz.js";

describe("authz utilities", () => {
  describe("assertBoard", () => {
    it("throws forbidden if actor is not board", () => {
      const req = { actor: { type: "agent" } } as any;
      expect(() => assertBoard(req)).toThrow("Board access required");
    });
    it("does not throw if actor is board", () => {
      const req = { actor: { type: "board" } } as any;
      expect(() => assertBoard(req)).not.toThrow();
    });
  });

  describe("assertCompanyAccess", () => {
    it("throws unauthorized if no actor", () => {
      const req = { actor: { type: "none" } } as any;
      expect(() => assertCompanyAccess(req, "comp-1")).toThrow();
    });
    it("throws forbidden if agent accesses wrong company", () => {
      const req = { actor: { type: "agent", companyId: "comp-2" } } as any;
      expect(() => assertCompanyAccess(req, "comp-1")).toThrow("Agent key cannot access another company");
    });
    it("allows agent to access its own company", () => {
      const req = { actor: { type: "agent", companyId: "comp-1" } } as any;
      expect(() => assertCompanyAccess(req, "comp-1")).not.toThrow();
    });
    it("allows instance admin board to access any company", () => {
      const req = { actor: { type: "board", isInstanceAdmin: true } } as any;
      expect(() => assertCompanyAccess(req, "comp-1")).not.toThrow();
    });
    it("allows local implicit board to access any company", () => {
      const req = { actor: { type: "board", source: "local_implicit" } } as any;
      expect(() => assertCompanyAccess(req, "comp-1")).not.toThrow();
    });
    it("throws forbidden if user board lacks company access", () => {
      const req = { actor: { type: "board", source: "session", companyIds: ["comp-2"] } } as any;
      expect(() => assertCompanyAccess(req, "comp-1")).toThrow("User does not have access to this company");
    });
  });

  describe("getActorInfo", () => {
    it("returns agent info", () => {
      const req = { actor: { type: "agent", agentId: "agent-1", runId: "run-1" } } as any;
      const info = getActorInfo(req);
      expect(info).toEqual({
        actorType: "agent",
        actorId: "agent-1",
        agentId: "agent-1",
        runId: "run-1"
      });
    });
    it("returns user info", () => {
      const req = { actor: { type: "board", userId: "user-1", runId: "run-2" } } as any;
      const info = getActorInfo(req);
      expect(info).toEqual({
        actorType: "user",
        actorId: "user-1",
        agentId: null,
        runId: "run-2"
      });
    });
  });
});
