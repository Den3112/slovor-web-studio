import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { healthRoutes } from "../routes/health.js";
import { serverVersion } from "../version.js";

describe("GET /health", () => {
  it("returns 200 with status ok when no db", async () => {
    const app = express();
    app.use("/health", healthRoutes());
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", version: serverVersion });
  });

  it("returns 200 with all fields when db and opts provided", async () => {
    const dbMock = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb) => Promise.resolve([{ count: 1 }]).then(cb)),
    } as any;

    // Use a simpler mock structure if needed, but healthRoutes expects a Drizzle-like interface
    const app = express();
    app.use("/health", healthRoutes(dbMock, {
      deploymentMode: "authenticated",
      deploymentExposure: "public",
      authReady: true,
      companyDeletionEnabled: false
    }));

    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "ok",
      deploymentMode: "authenticated",
      deploymentExposure: "public",
      authReady: true,
      features: {
        companyDeletionEnabled: false
      }
    });
  });
});
