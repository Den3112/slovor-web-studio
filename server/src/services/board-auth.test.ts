import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  boardAuthService,
  hashBearerToken,
  tokenHashesMatch,
  createBoardApiToken,
  createCliAuthSecret,
  boardApiKeyExpiresAt,
  cliAuthChallengeExpiresAt
} from "./board-auth.js";
import { 
  authUsers, 
  boardApiKeys, 
  cliAuthChallenges, 
  companies, 
  companyMemberships, 
  instanceUserRoles 
} from "@paperclipai/db";

describe("server: boardAuthService 100% coverage", () => {
  let mockDb: any;
  let service: ReturnType<typeof boardAuthService>;
  let nextResults: any[][] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    nextResults = [];
    
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      execute: vi.fn().mockImplementation(() => Promise.resolve([])), // does not consume nextResults
      transaction: vi.fn(async (cb: any) => await cb(mockDb)),
      then: vi.fn((cb: any) => {
          const res = nextResults.shift() || [];
          return Promise.resolve(cb ? cb(res) : res);
      }),
    };
    service = boardAuthService(mockDb);
  });

  it("utility functions", () => {
    const token = createBoardApiToken();
    expect(token).toMatch(/^pcp_board_/);
    const secret = createCliAuthSecret();
    expect(secret).toMatch(/^pcp_cli_auth_/);
    const hash = hashBearerToken("test");
    expect(tokenHashesMatch(hash, hashBearerToken("test"))).toBe(true);
    expect(tokenHashesMatch(hash, hashBearerToken("wrong"))).toBe(false);
    expect(boardApiKeyExpiresAt()).toBeInstanceOf(Date);
    expect(cliAuthChallengeExpiresAt()).toBeInstanceOf(Date);
  });

  it("resolveBoardAccess context", async () => {
    nextResults = [
        [{ id: "u1" }], // user
        [{ companyId: "c1" }], // memberships
        [{ id: "r1" }] // admin role
    ];
    const res = await service.resolveBoardAccess("u1");
    expect(res.user?.id).toBe("u1");
    expect(res.isInstanceAdmin).toBe(true);
  });

  it("resolveBoardActivityCompanyIds branches", async () => {
    // requested
    nextResults = [[{ id: "u1" }], [], []];
    let res = await service.resolveBoardActivityCompanyIds({ userId: "u1", requestedCompanyId: "c_req" });
    expect(res).toContain("c_req");

    // challenge
    nextResults = [
        [{ id: "u1" }], [], [], // access
        [{ requestedCompanyId: "c_chall" }] // challenge
    ];
    res = await service.resolveBoardActivityCompanyIds({ userId: "u1", boardApiKeyId: "key1" });
    expect(res).toContain("c_chall");

    // admin
    nextResults = [
        [{ id: "u1" }], [], [{ id: "r1" }], // access admin
        [{ id: "c_all" }] // companies
    ];
    res = await service.resolveBoardActivityCompanyIds({ userId: "u1" });
    expect(res).toContain("c_all");
  });

  it("findBoardApiKeyByToken cases", async () => {
    const hash = hashBearerToken("t1");
    nextResults = [[{ keyHash: hash, expiresAt: new Date(0) }]];
    expect(await service.findBoardApiKeyByToken("t1")).toBeNull();
    nextResults = [[{ keyHash: hash, expiresAt: new Date(Date.now() + 100000) }]];
    expect(await service.findBoardApiKeyByToken("t1")).toBeDefined();
  });

  it("createCliAuthChallenge", async () => {
    nextResults = [[{ id: "ch1" }]];
    const res = await service.createCliAuthChallenge({ command: "c", requestedAccess: "board" });
    expect(res.challenge.id).toBe("ch1");
  });

  it("describeCliAuthChallenge variety", async () => {
    const secret = "s1";
    const hash = hashBearerToken(secret);
    const now = new Date();
    nextResults = [
        [{ id: "ch1", secretHash: hash, requestedCompanyId: "c1", expiresAt: new Date(Date.now() + 1000), approvedAt: now, approvedByUserId: "u1", boardApiKeyId: "k1" }],
        [{ name: "Comp" }],
        [{ id: "u1", name: "Admin" }]
    ];
    const res = await service.describeCliAuthChallenge("ch1", secret);
    expect(res?.status).toBe("approved");
    expect(res?.requestedCompanyName).toBe("Comp");
    expect(res?.approvedByUser?.name).toBe("Admin");
  });

  it("describeCliAuthChallenge edge cases", async () => {
    // 1. null challenge
    nextResults = [[]];
    expect(await service.describeCliAuthChallenge("ch1", "s1")).toBeNull();
    // 2. wrong secret
    nextResults = [[{ secretHash: "wrong", expiresAt: new Date(Date.now() + 1000) }]];
    expect(await service.describeCliAuthChallenge("ch1", "s1")).toBeNull();
  });

  it("approveCliAuthChallenge status returns", async () => {
    const s = "s1";
    const h = hashBearerToken(s);
    // cancelled
    nextResults = [
        [{ id: "u1" }], [], [], // access
        [{ id: "ch1", secretHash: h, cancelledAt: new Date(), expiresAt: new Date(Date.now() + 1000) }]
    ];
    const res = await service.approveCliAuthChallenge("ch1", s, "u1");
    expect(res.status).toBe("cancelled");
  });

  it("approveCliAuthChallenge error paths", async () => {
    const secret = "s1";
    // mismatched token in transaction
    nextResults = [
        [{ id: "u1" }], [], [{ id: "r1" }], // access admin
        [{ id: "ch1", secretHash: "wrong", expiresAt: new Date(Date.now() + 1000) }] // challenge
    ];
    await expect(service.approveCliAuthChallenge("ch1", secret, "u1")).rejects.toThrow(/challenge not found/);
  });

  it("cancelCliAuthChallenge branches", async () => {
    const s = "s1";
    const h = hashBearerToken(s);
    // cancel success
    nextResults = [
        [{ id: "ch1", secretHash: h, expiresAt: new Date(Date.now() + 1000) }], // find by secret
        [{ id: "ch1" }] // update
    ];
    const final = await service.cancelCliAuthChallenge("ch1", s);
    expect(final.status).toBe("cancelled");
  });

  it("key operations", async () => {
    // touch
    await service.touchBoardApiKey("k1");
    expect(mockDb.update).toHaveBeenCalled();

    // revoke
    nextResults = [[{ id: "k1" }]];
    expect(await service.revokeBoardApiKey("k1")).toBeDefined();

    // assert
    nextResults = [[{ id: "k1", userId: "u1" }]];
    expect(await service.assertCurrentBoardKey("k1", "u1")).toBeDefined();
  });
});
