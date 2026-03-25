import { describe, expect, it } from "vitest";
import { 
  createIssueWorkProductSchema,
  updateExecutionWorkspaceSchema,
  createGoalSchema,
  createApprovalSchema,
  envBindingSchema,
  createSecretSchema,
  createRoutineSchema,
  createRoutineTriggerSchema,
  createCostEventSchema,
  createFinanceEventSchema,
  createAssetImageMetadataSchema,
  createCompanyInviteSchema,
  acceptInviteSchema,
  pluginManifestV1Schema,
  installPluginSchema,
  upsertPluginConfigSchema,
  patchPluginConfigSchema,
  updatePluginStatusSchema,
  uninstallPluginSchema,
  pluginStateScopeKeySchema,
  setPluginStateSchema,
  listPluginStateSchema,
  jsonSchemaSchema,
  createProjectWorkspaceSchema
} from "./index.js";

const uuid = "00000000-0000-0000-0000-000000000000";

describe("validators: misc", () => {
  it("validates createIssueWorkProductSchema", () => {
    const valid = { 
      type: "pull_request", 
      provider: "github",
      title: "Refactor" 
    };
    expect(createIssueWorkProductSchema.parse(valid)).toBeDefined();
  });

  it("validates updateExecutionWorkspaceSchema", () => {
    expect(updateExecutionWorkspaceSchema.parse({ status: "active" })).toBeDefined();
  });

  it("validates createGoalSchema", () => {
    expect(createGoalSchema.parse({ title: "Goal", level: "company" })).toBeDefined();
  });

  it("validates createApprovalSchema", () => {
    expect(createApprovalSchema.parse({ type: "hire_agent", payload: {} })).toBeDefined();
  });

  it("validates envBindingSchema", () => {
    expect(envBindingSchema.parse("plain_value")).toEqual("plain_value");
    expect(envBindingSchema.parse({ type: "plain", value: "val" })).toBeDefined();
    expect(envBindingSchema.parse({ type: "secret_ref", secretId: uuid })).toBeDefined();
  });

  it("validates createSecretSchema", () => {
    expect(createSecretSchema.parse({ name: "SECRET", value: "val" })).toBeDefined();
  });

  it("fails if duplicate launcher IDs are present", () => {
    const manifest = {
      id: "test-plugin",
      apiVersion: 1,
      displayName: "Test",
      description: "Test",
      version: "1.0.0",
      author: "Test",
      categories: ["connector"],
      capabilities: ["issues.read"],
      entrypoints: { worker: "main.js" },
      launchers: [
        { id: "L1", displayName: "L1", placementZone: "sidebar", action: { type: "navigate", target: "/" } },
        { id: "L1", displayName: "L2", placementZone: "toolbarButton", action: { type: "performAction", target: "A1" } }
      ]
    };
    const result = pluginManifestV1Schema.safeParse(manifest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("Duplicate launcher ids");
    }
  });

  it("validates createRoutineSchema", () => {
    const valid = {
      projectId: uuid,
      title: "Routine",
      assigneeAgentId: uuid
    };
    expect(createRoutineSchema.parse(valid)).toBeDefined();
  });

  it("validates createCostEventSchema", () => {
    const valid = {
      agentId: uuid,
      provider: "openai",
      model: "gpt-4",
      costCents: 100,
      occurredAt: new Date().toISOString()
    };
    expect(createCostEventSchema.parse(valid)).toBeDefined();
  });

  it("validates createFinanceEventSchema", () => {
    const valid = { 
      eventKind: "inference_charge",
      biller: "openai",
      amountCents: 10, 
      occurredAt: new Date().toISOString()
    };
    expect(createFinanceEventSchema.parse(valid)).toBeDefined();
  });

  it("validates createAssetImageMetadataSchema", () => {
    expect(createAssetImageMetadataSchema.parse({ namespace: "test" })).toBeDefined();
  });

  it("validates access schemas", () => {
    expect(createCompanyInviteSchema.parse({ allowedJoinTypes: "both" })).toBeDefined();
    expect(acceptInviteSchema.parse({ requestType: "human" })).toBeDefined();
  });

  it("validates plugin schemas", () => {
    const validManifest = {
      id: "plugin-1",
      apiVersion: 1,
      version: "1.0.0",
      displayName: "Plugin",
      description: "Desc",
      author: "Me",
      categories: ["automation"],
      capabilities: ["agent.tools.register"],
      entrypoints: {
        worker: "index.js"
      }
    };
    expect(pluginManifestV1Schema.parse(validManifest)).toBeDefined();
    expect(installPluginSchema.parse({ packageName: "pkg" })).toBeDefined();
  });

  describe("pluginManifestV1Schema superRefine", () => {
    const base = {
      id: "plugin-1",
      apiVersion: 1,
      version: "1.0.0",
      displayName: "Plugin",
      description: "Desc",
      author: "Me",
      categories: ["automation"],
      capabilities: ["agent.tools.register"],
      entrypoints: { worker: "index.js" }
    };

    it("requires entrypoints.ui when ui.slots are declared", () => {
      const invalid = { 
        ...base, 
        ui: { slots: [{ type: "page", id: "p1", displayName: "P", exportName: "P" }] } 
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("entrypoints.ui is required");
    });

    it("requires agent.tools.register capability when tools are declared", () => {
      const invalid = { 
        ...base, 
        capabilities: ["jobs.schedule"],
        tools: [{ name: "t1", displayName: "T", description: "D", parametersSchema: {} }] 
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("Capability 'agent.tools.register' is required");
    });

    it("rejects duplicate job keys", () => {
      const invalid = { 
        ...base, 
        capabilities: ["jobs.schedule"],
        jobs: [
          { jobKey: "j1", displayName: "J1" },
          { jobKey: "j1", displayName: "J2" }
        ] 
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("Duplicate job keys: j1");
    });

    it("validates UI slot routePath rules", () => {
      const invalid = { 
        ...base, 
        entrypoints: { worker: "w.js", ui: "u.js" },
        ui: { slots: [{ type: "detailTab", id: "s1", displayName: "S", exportName: "E", routePath: "invalid" }] } 
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow();
    });

    it("rejects duplicate tool names", () => {
      const invalid = { 
        ...base, 
        capabilities: ["agent.tools.register"],
        tools: [
          { name: "t1", displayName: "T1", description: "D", parametersSchema: {} },
          { name: "t1", displayName: "T2", description: "D", parametersSchema: {} }
        ] 
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("Duplicate tool names: t1");
    });

    it("rejects invalid cron expressions", () => {
      const invalidCount = {
        ...base,
        capabilities: ["jobs.schedule"],
        jobs: [{ jobKey: "j1", displayName: "J", schedule: "invalid" }]
      };
      expect(() => pluginManifestV1Schema.parse(invalidCount)).toThrow("schedule must be a valid 5-field cron expression");

      const invalidField = {
        ...base,
        capabilities: ["jobs.schedule"],
        jobs: [{ jobKey: "j1", displayName: "J", schedule: "* * * * invalid" }]
      };
      expect(() => pluginManifestV1Schema.parse(invalidField)).toThrow("schedule must be a valid 5-field cron expression");
    });

    it("requires entityTypes for detailTab slots", () => {
      const invalid = {
        ...base,
        entrypoints: { worker: "w.js", ui: "u.js" },
        ui: { slots: [{ type: "detailTab", id: "s1", displayName: "S", exportName: "E" }] }
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("detailTab slots require at least one entityType");
    });

    it("validates launcher action target for performAction", () => {
      const invalid = {
        ...base,
        launchers: [{
          id: "l1",
          displayName: "L",
          placementZone: "toolbarButton",
          action: { type: "performAction", target: "invalid/path" }
        }]
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("performAction launchers must target an action key");
    });

    it("requires render metadata for modal launchers", () => {
      const invalid = {
        ...base,
        launchers: [{
          id: "l1",
          displayName: "L",
          placementZone: "toolbarButton",
          action: { type: "openModal", target: "route" }
        }]
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("openModal launchers require render metadata");
    });

    it("rejects duplicate launcher ids", () => {
      const invalid = {
        ...base,
        launchers: [
          { id: "l1", displayName: "L1", placementZone: "toolbarButton", action: { type: "navigate", target: "/t1" } },
          { id: "l1", displayName: "L2", placementZone: "toolbarButton", action: { type: "navigate", target: "/t2" } }
        ]
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("Duplicate launcher ids: l1");
    });

    it("requires entityTypes for projectSidebarItem launchers", () => {
      const invalid = {
        ...base,
        launchers: [{
          id: "l1",
          displayName: "L",
          placementZone: "projectSidebarItem",
          action: { type: "navigate", target: "/t" }
        }]
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("projectSidebarItem launchers require at least one entityType");
    });

    it("requires webhooks.receive capability when webhooks are declared", () => {
      const invalid = {
        ...base,
        capabilities: [],
        webhooks: [{ endpointKey: "w1", displayName: "W" }]
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("Capability 'webhooks.receive' is required");
    });

    it("rejects duplicate webhook endpoint keys", () => {
      const invalid = {
        ...base,
        capabilities: ["webhooks.receive"],
        webhooks: [
          { endpointKey: "w1", displayName: "W1" },
          { endpointKey: "w1", displayName: "W2" }
        ]
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("Duplicate webhook endpoint keys: w1");
    });

    it("rejects duplicate UI slot ids", () => {
      const invalid = {
        ...base,
        entrypoints: { worker: "w.js", ui: "u.js" },
        ui: {
          slots: [
            { type: "page", id: "s1", displayName: "S1", exportName: "E1" },
            { type: "page", id: "s1", displayName: "S2", exportName: "E2" }
          ]
        }
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("Duplicate UI slot ids: s1");
    });

    it("validates remaining plugin schemas", () => {
      expect(upsertPluginConfigSchema.parse({ configJson: { a: 1 } })).toBeDefined();
      expect(patchPluginConfigSchema.parse({ configJson: { b: 2 } })).toBeDefined();
      expect(updatePluginStatusSchema.parse({ status: "ready" })).toBeDefined();
      expect(uninstallPluginSchema.parse({ removeData: true })).toBeDefined();
      expect(pluginStateScopeKeySchema.parse({ scopeKind: "company", stateKey: "k" })).toBeDefined();
      expect(setPluginStateSchema.parse({ scopeKind: "agent", stateKey: "k", value: "v" })).toBeDefined();
      expect(listPluginStateSchema.parse({ scopeKind: "issue" })).toBeDefined();
    });

    it("requires matching versions when both are declared", () => {
      const invalid = {
        ...base,
        minimumHostVersion: "1.0.0",
        minimumPaperclipVersion: "2.0.0"
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("minimumHostVersion and minimumPaperclipVersion must match");
    });

    it("requires entrypoints.ui when ui.launchers are declared", () => {
      const invalid = {
        ...base,
        ui: { launchers: [{ id: "l1", displayName: "L", placementZone: "toolbarButton", action: { type: "navigate", target: "/t" } }] }
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("entrypoints.ui is required");
    });

    it("rejects reserved company route segments", () => {
      const invalid = {
        ...base,
        entrypoints: { worker: "w.js", ui: "u.js" },
        ui: { slots: [{ type: "page", id: "s1", displayName: "S", exportName: "E", routePath: "dashboard" }] }
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("is reserved by the host");
    });

    it("validates openDrawer and openPopover environments", () => {
      const drawerInvalid = {
        ...base,
        launchers: [{
          id: "l1",
          displayName: "L",
          placementZone: "toolbarButton",
          action: { type: "openDrawer", target: "route" },
          render: { environment: "hostRoute" }
        }]
      };
      expect(() => pluginManifestV1Schema.parse(drawerInvalid)).toThrow("openDrawer launchers must use hostOverlay or iframe");

      const popoverInvalid = {
        ...base,
        launchers: [{
          id: "l2",
          displayName: "L2",
          placementZone: "toolbarButton",
          action: { type: "openPopover", target: "route" },
          render: { environment: "hostRoute" }
        }]
      };
      expect(() => pluginManifestV1Schema.parse(popoverInvalid)).toThrow("openPopover launchers cannot use the hostRoute");
    });

    it("validates openModal hostInline restriction", () => {
      const invalid = {
        ...base,
        launchers: [{
          id: "l1",
          displayName: "L",
          placementZone: "toolbarButton",
          action: { type: "openModal", target: "route" },
          render: { environment: "hostInline" }
        }]
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("openModal launchers cannot use the hostInline");
    });

    it("requires jobs.schedule capability when jobs are present", () => {
      const invalid = {
        ...base,
        capabilities: ["agent.tools.register"],
        jobs: [{ jobKey: "j1", displayName: "J" }]
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("Capability 'jobs.schedule' is required");
    });

    it("requires project entityType for projectSidebarItem launchers", () => {
      const invalid = {
        ...base,
        launchers: [{
          id: "l1",
          displayName: "L",
          placementZone: "projectSidebarItem",
          entityTypes: ["issue"], // missing project
          action: { type: "navigate", target: "/t" }
        }]
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("projectSidebarItem launchers require entityTypes to include");
    });

    it("rejects render hints for performAction launchers", () => {
      const invalid = {
        ...base,
        launchers: [{
          id: "l1",
          displayName: "L",
          placementZone: "toolbarButton",
          action: { type: "performAction", target: "act" },
          render: { environment: "hostInline" }
        }]
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("performAction launchers cannot declare render hints");
    });

    it("requires comment entityType for commentAnnotation and commentContextMenuItem slots", () => {
      const invalid = {
        ...base,
        entrypoints: { ui: "u.js", worker: "w.js" },
        ui: { slots: [{ type: "commentAnnotation", id: "s1", displayName: "S", exportName: "E", entityTypes: ["issue"] }] }
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("commentAnnotation slots require entityTypes to include");
    });

    it("rejects absolute URLs in navigate launchers", () => {
      const invalid = {
        ...base,
        launchers: [{
          id: "l1",
          displayName: "L",
          placementZone: "toolbarButton",
          action: { type: "navigate", target: "https://google.com" }
        }]
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("navigate launchers must target a host route");
    });

    it("validates bounds compatibility with render environment", () => {
      const invalid = {
        ...base,
        launchers: [{
          id: "l1",
          displayName: "L",
          placementZone: "toolbarButton",
          action: { type: "openModal", target: "/t" },
          render: { environment: "hostOverlay", bounds: "inline" }
        }]
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow(/bounds .*inline.* is not supported for render environment .*hostOverlay.*/);
    });
    it("requires project entityType for projectSidebarItem slots", () => {
      const invalid = {
        ...base,
        entrypoints: { ui: "u.js", worker: "w.js" },
        ui: { slots: [{ type: "projectSidebarItem", id: "s1", displayName: "S", exportName: "E", entityTypes: ["issue"] }] }
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("projectSidebarItem slots require entityTypes to include");
    });

    it("requires comment entityType for commentContextMenuItem slots", () => {
      const invalid = {
        ...base,
        entrypoints: { ui: "u.js", worker: "w.js" },
        ui: { slots: [{ type: "commentContextMenuItem", id: "s1", displayName: "S", exportName: "E", entityTypes: ["issue"] }] }
      };
      expect(() => pluginManifestV1Schema.parse(invalid)).toThrow("commentContextMenuItem slots require entityTypes to include");
    });

    it("covers remaining branches", () => {
      // Empty JSON Schema
      expect(jsonSchemaSchema.parse({})).toEqual({});

      // Empty cron string
      const invalidCron = {
        ...base,
        jobs: [{ jobKey: "j1", displayName: "J", schedule: " " }]
      };
      expect(() => pluginManifestV1Schema.parse(invalidCron)).toThrow("schedule must be a valid 5-field cron expression");

      // Top-level duplicate launchers
      const duplicateLaunchers = {
        ...base,
        launchers: [
          { id: "l1", displayName: "L1", placementZone: "toolbarButton", action: { type: "navigate", target: "/1" } },
          { id: "l1", displayName: "L2", placementZone: "toolbarButton", action: { type: "navigate", target: "/2" } }
        ]
      };
      expect(() => pluginManifestV1Schema.parse(duplicateLaunchers)).toThrow("Duplicate launcher ids: l1");

      // Duplicate launchers in TOP Level (covering line 547 branch)
      const topDuplicateLaunchers = {
        ...base,
        launchers: [
          { id: "l1", displayName: "L1", placementZone: "toolbarButton", action: { type: "navigate", target: "/1" } },
          { id: "l1", displayName: "L2", placementZone: "toolbarButton", action: { type: "navigate", target: "/2" } }
        ]
      };
      expect(() => pluginManifestV1Schema.parse(topDuplicateLaunchers)).toThrow("Duplicate launcher ids: l1");
    });
  });

  describe("projectWorkspaceSchema additional coverage", () => {
    it("covers default sourceType and repoUrl branches", () => {
      // Default sourceType (local_path)
      expect(createProjectWorkspaceSchema.parse({ name: "Local", cwd: "/tmp" })).toBeDefined();

      // hasRepo branch
      expect(createProjectWorkspaceSchema.parse({ name: "Repo", repoUrl: "https://github.com/test/test" })).toBeDefined();

      // remote_managed with repoUrl
      expect(createProjectWorkspaceSchema.parse({ 
        name: "Remote", 
        sourceType: "remote_managed", 
        repoUrl: "https://github.com/test/test" 
      })).toBeDefined();
    });
  });
});
