import { describe, expect, it } from "vitest";
import { 
  createAgentSchema,
  updateAgentSchema,
  createAgentHireSchema,
  createProjectSchema,
  updateProjectSchema,
  createProjectWorkspaceSchema,
  createIssueSchema,
  updateIssueSchema,
  createIssueLabelSchema,
  checkoutIssueSchema,
  upsertIssueDocumentSchema
} from "./index.js";

const uuid = "00000000-0000-0000-0000-000000000000";

describe("validators: agent", () => {
  it("validates createAgentSchema", () => {
    const valid = { name: "Agent Smith", role: "engineer", adapterType: "process" };
    expect(createAgentSchema.parse(valid)).toMatchObject({ name: "Agent Smith" });
  });

  it("validates updateAgentSchema", () => {
    expect(updateAgentSchema.parse({ name: "Updated" })).toEqual({ name: "Updated" });
  });

  it("validates createAgentHireSchema", () => {
    expect(createAgentHireSchema.parse({ name: "Hire", sourceIssueId: uuid })).toBeDefined();
  });

  it("rejects invalid adapterConfig env", () => {
    const invalid = { 
      name: "Agent", 
      adapterConfig: { 
        env: { "INVALID": { type: "secret_ref" } } // missing secretId
      } 
    };
    expect(() => createAgentSchema.parse(invalid)).toThrow("adapterConfig.env must be a map of valid env bindings");
  });
});

describe("validators: project", () => {
  it("validates createProjectSchema", () => {
    const valid = { name: "Project X", status: "in_progress" };
    expect(createProjectSchema.parse(valid)).toMatchObject({ name: "Project X" });
  });

  it("validates createProjectWorkspaceSchema with cwd", () => {
    expect(createProjectWorkspaceSchema.parse({ name: "WS", sourceType: "local_path", cwd: "/tmp" })).toBeDefined();
  });

  it("rejects createProjectWorkspaceSchema without cwd or repoUrl", () => {
    expect(() => createProjectWorkspaceSchema.parse({ name: "WS", sourceType: "local_path" })).toThrow("Workspace requires at least one of cwd or repoUrl.");
  });

  it("validates remote-managed workspace with remoteRef", () => {
    expect(createProjectWorkspaceSchema.parse({ name: "Remote", sourceType: "remote_managed", remoteWorkspaceRef: "ref" })).toBeDefined();
  });

  it("rejects remote-managed workspace without remoteRef or repoUrl", () => {
    expect(() => createProjectWorkspaceSchema.parse({ name: "Remote", sourceType: "remote_managed" })).toThrow("Remote-managed workspace requires remoteWorkspaceRef or repoUrl.");
  });
});

describe("validators: issue", () => {
  it("validates createIssueSchema", () => {
    const valid = { title: "Fix bug", priority: "high" };
    expect(createIssueSchema.parse(valid)).toMatchObject({ title: "Fix bug" });
  });

  it("validates createIssueLabelSchema", () => {
    expect(createIssueLabelSchema.parse({ name: "bug", color: "#ff0000" })).toBeDefined();
  });

  it("validates checkoutIssueSchema", () => {
    expect(checkoutIssueSchema.parse({ agentId: uuid, expectedStatuses: ["todo"] })).toBeDefined();
  });

  it("validates upsertIssueDocumentSchema", () => {
    const valid = { format: "markdown", body: "Content" };
    expect(upsertIssueDocumentSchema.parse(valid)).toBeDefined();
  });
});
