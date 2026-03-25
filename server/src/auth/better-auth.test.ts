import { describe, it, expect, vi } from "vitest";
import { 
  resolveBetterAuthSessionFromHeaders, 
  deriveAuthTrustedOrigins,
  createBetterAuthInstance,
  createBetterAuthHandler,
  resolveBetterAuthSession
} from "./better-auth.js";

describe("server: better-auth Full Coverage", () => {
  it("resolves session correctly", async () => {
    const sessionData = {
      session: { id: "s1", userId: "u1" },
      user: { id: "u1", email: "u@e.com", name: "User" }
    };
    const mockAuth = {
        api: {
            getSession: vi.fn().mockResolvedValue(sessionData)
        }
    } as any;
    
    // 1. Success
    const res = await resolveBetterAuthSessionFromHeaders(mockAuth, new Headers());
    expect(res?.user?.id).toBe("u1");

    // 2. Missing user/session
    mockAuth.api.getSession.mockResolvedValueOnce({ session: null, user: null });
    expect(await resolveBetterAuthSessionFromHeaders(mockAuth, new Headers())).toBeNull();

    // 3. Not an object
    mockAuth.api.getSession.mockResolvedValueOnce(null);
    expect(await resolveBetterAuthSessionFromHeaders(mockAuth, new Headers())).toBeNull();
  });

  it("deriveAuthTrustedOrigins", () => {
      const config = {
          authBaseUrlMode: "explicit",
          authPublicBaseUrl: "https://auth.example.com",
          deploymentMode: "authenticated",
          allowedHostnames: ["app.com", " "]
      } as any;
      const origins = deriveAuthTrustedOrigins(config);
      expect(origins).toContain("https://auth.example.com");
      expect(origins).toContain("https://app.com");
      expect(origins).toContain("http://app.com");
  });

  it("createBetterAuthInstance and handler call", () => {
      const mockDb = {} as any;
      const config = {
          authBaseUrlMode: "none",
          authDisableSignUp: true,
          deploymentMode: "local"
      } as any;
      const auth = createBetterAuthInstance(mockDb, config, []);
      expect(auth).toBeDefined();

      const handler = createBetterAuthHandler(auth);
      expect(typeof handler).toBe("function");

      const req = { headers: {} } as any;
      const res = {} as any;
      const next = vi.fn();
      handler(req, res, next);
      expect(next).not.toHaveBeenCalled();
  });

  it("resolveBetterAuthSession", async () => {
      const mockAuth = { api: { getSession: vi.fn().mockResolvedValue({ user: { id: "u1" }, session: { id: "s1", userId: "u1" } }) } } as any;
      const req = { headers: { "cookie": "a=b" } } as any;
      const res = await resolveBetterAuthSession(mockAuth, req);
      expect(res?.user?.id).toBe("u1");
  });
});
