import { describe, expect, it } from "vitest";
import { 
  paperclipConfigSchema,
  databaseConfigSchema,
  serverConfigSchema
} from "./config-schema.js";

const validBaseConfig = {
  $meta: {
    version: 1,
    updatedAt: new Date().toISOString(),
    source: "onboard",
  },
  database: { mode: "embedded-postgres" },
  logging: { mode: "file" },
  server: {
    deploymentMode: "authenticated",
    exposure: "private",
  },
  auth: {
    baseUrlMode: "auto",
  },
};

describe("config schema", () => {
  it("validates that publicBaseUrl is required when baseUrlMode is explicit", () => {
    const invalidConfig = {
      ...validBaseConfig,
      auth: { ...validBaseConfig.auth, baseUrlMode: "explicit" },
    };
    const result = paperclipConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map(i => i.message);
      expect(messages).toContain("auth.publicBaseUrl is required when auth.baseUrlMode is explicit");
    }
  });

  it("validates that baseUrlMode must be explicit when exposure is public", () => {
    const invalidConfig = {
      ...validBaseConfig,
      server: { ...validBaseConfig.server, exposure: "public" },
      auth: { ...validBaseConfig.auth, baseUrlMode: "auto" },
    };
    const result = paperclipConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map(i => i.message);
      expect(messages).toContain("auth.baseUrlMode must be explicit when deploymentMode=authenticated and exposure=public");
    }
  });

  it("validates that publicBaseUrl is required when exposure is public", () => {
    const invalidConfig = {
      ...validBaseConfig,
      server: { ...validBaseConfig.server, exposure: "public" },
      auth: { ...validBaseConfig.auth, baseUrlMode: "explicit" },
    };
    const result = paperclipConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map(i => i.message);
      expect(messages).toContain("auth.publicBaseUrl is required when deploymentMode=authenticated and exposure=public");
    }
  });

  describe("databaseConfigSchema", () => {
    it("has correct defaults", () => {
      const result = databaseConfigSchema.parse({});
      expect(result.mode).toBe("embedded-postgres");
      expect(result.embeddedPostgresPort).toBe(54329);
    });
  });

  describe("serverConfigSchema", () => {
    it("has correct defaults", () => {
      const result = serverConfigSchema.parse({});
      expect(result.deploymentMode).toBe("local_trusted");
      expect(result.port).toBe(3100);
    });
  });

  describe("paperclipConfigSchema", () => {
    it("validates valid local_trusted config", () => {
      const validConfig = {
        $meta: {
          version: 1,
          updatedAt: new Date().toISOString(),
          source: "configure"
        },
        database: { mode: "embedded-postgres" },
        logging: { mode: "file" },
        server: { 
          deploymentMode: "local_trusted",
          exposure: "private"
        }
      };
      expect(paperclipConfigSchema.parse(validConfig)).toBeDefined();
    });

    it("rejects public exposure with local_trusted mode", () => {
      const invalidConfig = {
        $meta: {
          version: 1,
          updatedAt: new Date().toISOString(),
          source: "configure"
        },
        database: { mode: "embedded-postgres" },
        logging: { mode: "file" },
        server: { 
          deploymentMode: "local_trusted",
          exposure: "public"
        }
      };
      expect(() => paperclipConfigSchema.parse(invalidConfig)).toThrow();
    });
  });
});
