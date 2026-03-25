import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLocalAgentJwt, verifyLocalAgentJwt } from "./agent-auth-jwt.js";

describe("server: agent-auth-jwt", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.PAPERCLIP_AGENT_JWT_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("creates and verifies a valid token", () => {
    const token = createLocalAgentJwt("a1", "c1", "local", "r1");
    expect(token).not.toBeNull();
    
    const claims = verifyLocalAgentJwt(token!);
    expect(claims?.sub).toBe("a1");
    expect(claims?.company_id).toBe("c1");
    expect(claims?.run_id).toBe("r1");
  });

  it("returns null if secret is missing", () => {
    delete process.env.PAPERCLIP_AGENT_JWT_SECRET;
    expect(createLocalAgentJwt("a1", "c1", "l", "r")).toBeNull();
    expect(verifyLocalAgentJwt("some.token.here")).toBeNull();
  });

  it("fails verification for invalid signatures", () => {
    const token = createLocalAgentJwt("a1", "c1", "l", "r")!;
    const parts = token.split(".");
    const tampered = `${parts[0]}.${parts[1]}.invalid-sig`;
    expect(verifyLocalAgentJwt(tampered)).toBeNull();
  });

  it("fails verification for expired tokens", () => {
    vi.useFakeTimers();
    const token = createLocalAgentJwt("a1", "c1", "l", "r")!;
    
    // Advance time by 49 hours (default TTL is 48h)
    vi.advanceTimersByTime(49 * 60 * 60 * 1000);
    
    expect(verifyLocalAgentJwt(token)).toBeNull();
    vi.useRealTimers();
  });

  it("fails verification for wrong issuer/audience", () => {
      process.env.PAPERCLIP_AGENT_JWT_ISSUER = "real";
      const token = createLocalAgentJwt("a1", "c1", "l", "r")!;
      
      process.env.PAPERCLIP_AGENT_JWT_ISSUER = "fake";
      expect(verifyLocalAgentJwt(token)).toBeNull();
  });

  it("handles malformed tokens", () => {
      expect(verifyLocalAgentJwt("not-a-jwt")).toBeNull();
      expect(verifyLocalAgentJwt("a.b.c.d")).toBeNull();
      expect(verifyLocalAgentJwt("")).toBeNull();
  });

  it("handles invalid JSON payloads", () => {
      const header = Buffer.from("not-json").toString("base64url");
      const claims = Buffer.from("not-json").toString("base64url");
      expect(verifyLocalAgentJwt(`${header}.${claims}.sig`)).toBeNull();
  });

  it("handles negative TTL in env", () => {
      process.env.PAPERCLIP_AGENT_JWT_TTL_SECONDS = "-10";
      const token = createLocalAgentJwt("a1", "c1", "l", "r")!;
      expect(token).toBeDefined();
  });

  it("handles invalid TTL in env", () => {
      process.env.PAPERCLIP_AGENT_JWT_TTL_SECONDS = "nan";
      const token = createLocalAgentJwt("a1", "c1", "l", "r")!;
      expect(token).toBeDefined();
  });

  it("handles invalid header alg", () => {
      const header = Buffer.from(JSON.stringify({ alg: "NONE" })).toString("base64url");
      const claims = Buffer.from(JSON.stringify({ sub: "a1" })).toString("base64url");
      expect(verifyLocalAgentJwt(`${header}.${claims}.sig`)).toBeNull();
  });
});
