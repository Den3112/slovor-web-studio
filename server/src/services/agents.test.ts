import { describe, it, expect, vi, beforeEach } from "vitest";
import { agentService, deduplicateAgentName, hasAgentShortnameCollision } from "./agents.js";

describe("agentService Utilities", () => {
  it("detects shortname collisions", () => {
    const agents = [{ id: "1", name: "Agent Bob", status: "idle" }];
    expect(hasAgentShortnameCollision("agent-bob", agents)).toBe(true);
    expect(hasAgentShortnameCollision("Agent Bob", agents)).toBe(true);
    expect(hasAgentShortnameCollision("Other", agents)).toBe(false);
  });

  it("deduplicated agent names", () => {
    const agents = [{ id: "1", name: "Bob", status: "idle" }];
    expect(deduplicateAgentName("Bob", agents)).toBe("Bob 2");
  });
});

describe("agentService", () => {
  let dbMock: any;

  beforeEach(() => {
    dbMock = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      transaction: vi.fn().mockImplementation((cb: any) => cb(dbMock)),
      then: vi.fn().mockImplementation((cb: any) => Promise.resolve([]).then(cb)),
    };
  });

  it("lists active agents for a company", async () => {
    const agentRow = { id: "agt-1", companyId: "comp-1", name: "Agent 007", status: "idle", role: "general", permissions: {} };
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([agentRow]).then(cb)); // list agents
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // hydrate spend

    const svc = agentService(dbMock);
    const result = await svc.list("comp-1");

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Agent 007");
    expect(result[0].urlKey).toBe("agent-007");
  });

  it("gets agent by id with spend hydration", async () => {
    const agentRow = { id: "agt-1", companyId: "comp-1", name: "Agent 007", status: "idle", role: "general", permissions: {} };
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([agentRow]).then(cb)); // get by id
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ agentId: "agt-1", spentMonthlyCents: 100 }]).then(cb)); // spend

    const svc = agentService(dbMock);
    const result = await svc.getById("agt-1");

    expect(result?.spentMonthlyCents).toBe(100);
  });

  it("creates agent with unique name", async () => {
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // fetch existing for name check
    const newAgent = { id: "new-agt", companyId: "comp-1", name: "Unique Agent", role: "general", permissions: {} };
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([newAgent]).then(cb)); // insert returning

    const svc = agentService(dbMock);
    const result = await svc.create("comp-1", { name: "Unique Agent" });

    expect(result.id).toBe("new-agt");
    expect(dbMock.insert).toHaveBeenCalled();
  });

  it("pauses an agent", async () => {
    const agentRow = { id: "agt-1", companyId: "comp-1", name: "Agent 1", status: "idle", role: "general", permissions: {} };
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([agentRow]).then(cb)); // getById check
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // spend hydration in getById
    const updatedAgent = { ...agentRow, status: "paused", pauseReason: "manual" };
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([updatedAgent]).then(cb)); // update returning

    const svc = agentService(dbMock);
    const result = await svc.pause("agt-1", "manual");

    expect(result?.status).toBe("paused");
  });

  it("resolves agent by reference (Name/Key)", async () => {
    const agentRows = [{ id: "agt-1", companyId: "comp-1", name: "My Agent", status: "idle", role: "general", permissions: {} }];
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve(agentRows).then(cb));

    const svc = agentService(dbMock);
    const result = await svc.resolveByReference("comp-1", "my-agent");

    expect(result.agent?.id).toBe("agt-1");
  });
});
