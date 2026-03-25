import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { llmRoutes } from "../routes/llms.js";

// Mock the services and adapters
vi.mock("../adapters/index.js", () => ({
  listServerAdapters: vi.fn(() => [
    { type: "claude-local", agentConfigurationDoc: "Claude config doc" },
    { type: "gemini-local", agentConfigurationDoc: "Gemini config doc" }
  ])
}));

vi.mock("../services/agents.js", () => ({
  agentService: vi.fn(() => ({
    getById: vi.fn().mockResolvedValue({ 
      id: "agent-1", 
      permissions: { canCreateAgents: true } 
    })
  }))
}));

describe("llmRoutes", () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).actor = { type: "board" }; // Board has implicit read access
      next();
    });
    app.use("/", llmRoutes({} as any));
  });

  it("GET /llms/agent-configuration.txt returns text summary", async () => {
    const res = await request(app).get("/llms/agent-configuration.txt");
    expect(res.status).toBe(200);
    expect(res.header["content-type"]).toContain("text/plain");
    expect(res.text).toContain("Installed adapters:");
    expect(res.text).toContain("claude-local");
  });

  it("GET /llms/agent-icons.txt returns icon names", async () => {
    const res = await request(app).get("/llms/agent-icons.txt");
    expect(res.status).toBe(200);
    expect(res.text).toContain("# Paperclip Agent Icon Names");
  });

  it("GET /llms/agent-configuration/:adapterType.txt returns adapter doc", async () => {
    const res = await request(app).get("/llms/agent-configuration/claude-local.txt");
    expect(res.status).toBe(200);
    expect(res.text).toBe("Claude config doc");
  });

  it("GET /llms/agent-configuration/:adapterType.txt returns 404 for unknown adapter", async () => {
    const res = await request(app).get("/llms/agent-configuration/unknown.txt");
    expect(res.status).toBe(404);
    expect(res.text).toContain("Unknown adapter type: unknown");
  });

  it("throws forbidden if agent without permission tries to read", async () => {
    const restrictedApp = express();
    restrictedApp.use((req, _res, next) => {
      (req as any).actor = { type: "agent", agentId: "agent-no-perm" };
      next();
    });
    
    // Re-mock agentsSvc for this test to return agent without permission
    const { agentService } = await import("../services/agents.js");
    (agentService as any).mockReturnValueOnce({
      getById: vi.fn().mockResolvedValue({ 
        id: "agent-no-perm", 
        permissions: { canCreateAgents: false } 
      })
    });

    restrictedApp.use("/", llmRoutes({} as any));
    restrictedApp.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.status || 500).json({ error: err.message });
    });

    const res = await request(restrictedApp).get("/llms/agent-configuration.txt");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Missing permission to read agent configuration reflection");
  });
});
