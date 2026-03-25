import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  boardAuthService,
  hashBearerToken,
  createCliAuthSecret
} from "./board-auth.js";
import { 
  boardApiKeys,
  cliAuthChallenges
} from "@paperclipai/db";

describe("server: boardAuthService extra", () => {
  let mockDb: any;
  let service: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(() => mockDb),
      from: vi.fn(() => mockDb),
      where: vi.fn(() => mockDb),
      insert: vi.fn(() => mockDb),
      values: vi.fn(() => mockDb),
      update: vi.fn(() => mockDb),
      set: vi.fn(() => mockDb),
      returning: vi.fn(() => mockDb),
      execute: vi.fn().mockResolvedValue(undefined),
      then: vi.fn((cb: any) => Promise.resolve(cb ? cb([]) : [])),
      transaction: vi.fn(async (cb: any) => await cb(mockDb)),
    };
    service = boardAuthService(mockDb);
  });

  it("approveCliAuthChallenge success path", async () => {
      const secret = createCliAuthSecret();
      const hash = hashBearerToken(secret);
      
      // 1. resolveBoardAccess (memberships)
      mockDb.then.mockImplementationOnce((cb: any) => Promise.resolve(cb([{ id: "u1" }]))); // users
      mockDb.then.mockImplementationOnce((cb: any) => Promise.resolve(cb([{ companyId: "c1" }]))); // memberships
      mockDb.then.mockImplementationOnce((cb: any) => Promise.resolve(cb([{ role: "instance_admin" }]))); // roles
      // 2. tx.select (challenge)
      mockDb.then.mockImplementationOnce((cb: any) => Promise.resolve(cb([{ 
          id: "ch1", secretHash: hash, expiresAt: new Date(Date.now() + 10000), requestedAccess: "board" 
      }])));
      // 3. insert key
      mockDb.then.mockImplementationOnce((cb: any) => Promise.resolve(cb([{ id: "k1" }])));
      // 4. update challenge
      mockDb.then.mockImplementationOnce((cb: any) => Promise.resolve(cb([{ id: "ch1", status: "approved" }])));
      
      const res = await service.approveCliAuthChallenge("ch1", secret, "u1");
      expect(res.status).toBe("approved");
  });

  it("cancelCliAuthChallenge successful branch", async () => {
      const secret = "secret";
      const hash = hashBearerToken(secret);
      // getCliAuthChallengeBySecret chain
      mockDb.then.mockImplementationOnce((cb: any) => Promise.resolve(cb([{ id: "ch1", secretHash: hash, expiresAt: new Date(Date.now() + 10000) }])));
      // update
      mockDb.then.mockImplementationOnce((cb: any) => Promise.resolve(cb([{ id: "ch1", cancelledAt: new Date() }])));
      
      const res = await service.cancelCliAuthChallenge("ch1", secret);
      expect(res.status).toBe("cancelled");
  });
});
