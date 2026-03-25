import { describe, expect, it } from "vitest";
import { 
  companySkillSchema,
  companySkillListItemSchema,
  companySkillUsageAgentSchema,
  companySkillDetailSchema,
  companySkillUpdateStatusSchema,
  companySkillImportSchema,
  companySkillProjectScanRequestSchema,
  companySkillProjectScanSkippedSchema,
  companySkillProjectScanConflictSchema,
  companySkillProjectScanResultSchema,
  companySkillCreateSchema,
  companySkillFileDetailSchema,
  companySkillFileUpdateSchema,
  agentSkillEntrySchema,
  agentSkillSnapshotSchema,
  agentSkillSyncSchema,
  portabilityIncludeSchema,
  portabilityEnvInputSchema,
  portabilityManifestSchema,
  companyPortabilityExportSchema,
  companyPortabilityPreviewSchema,
  companyPortabilityImportSchema
} from "./index.js";

const uuid = "00000000-0000-0000-0000-000000000000";
const date = new Date().toISOString();

describe("validators: company-skill", () => {
  const validSkill = {
    id: uuid,
    companyId: uuid,
    key: "test-skill",
    slug: "test-skill",
    name: "Test Skill",
    description: "Desc",
    markdown: "# Skill",
    sourceType: "local_path",
    sourceLocator: "/path",
    sourceRef: "main",
    trustLevel: "markdown_only",
    compatibility: "compatible",
    fileInventory: [],
    metadata: {},
    createdAt: date,
    updatedAt: date
  };

  it("validates companySkillSchema", () => {
    expect(companySkillSchema.parse(validSkill)).toBeDefined();
  });

  it("validates companySkillListItemSchema", () => {
    const valid = {
      ...validSkill,
      attachedAgentCount: 1,
      editable: true,
      editableReason: null,
      sourceLabel: "Local",
      sourceBadge: "local"
    };
    expect(companySkillListItemSchema.parse(valid)).toBeDefined();
  });

  it("validates companySkillCreateSchema", () => {
    expect(companySkillCreateSchema.parse({ name: "New Skill" })).toBeDefined();
  });

  it("validates companySkillFileUpdateSchema", () => {
    expect(companySkillFileUpdateSchema.parse({ path: "test.md", content: "data" })).toBeDefined();
  });
});

describe("validators: adapter-skills", () => {
  it("validates agentSkillEntrySchema", () => {
    const valid = {
      key: "skill-1",
      runtimeName: "skill_1",
      desired: true,
      managed: true,
      state: "installed"
    };
    expect(agentSkillEntrySchema.parse(valid)).toBeDefined();
  });

  it("validates agentSkillSyncSchema", () => {
    expect(agentSkillSyncSchema.parse({ desiredSkills: ["skill-1"] })).toBeDefined();
  });
});

describe("validators: company-portability", () => {
  it("validates portabilityIncludeSchema", () => {
    expect(portabilityIncludeSchema.parse({ company: true, agents: false })).toBeDefined();
  });

  it("validates portabilityEnvInputSchema", () => {
    const valid = {
      key: "API_KEY",
      description: "API Key",
      agentSlug: "agent-1",
      kind: "secret",
      requirement: "required",
      defaultValue: null,
      portability: "portable"
    };
    expect(portabilityEnvInputSchema.parse(valid)).toBeDefined();
  });

  it("validates companyPortabilityExportSchema", () => {
    expect(companyPortabilityExportSchema.parse({ include: { agents: true } })).toBeDefined();
  });

  it("validates companyPortabilityPreviewSchema", () => {
    const valid = {
      source: { type: "github", url: "https://github.com/test/repo" },
      target: { mode: "new_company", newCompanyName: "New Co" }
    };
    expect(companyPortabilityPreviewSchema.parse(valid)).toBeDefined();
  });

  it("validates companyPortabilityImportSchema", () => {
    const valid = {
      source: { type: "inline", files: { "manifest.json": "content" } },
      target: { mode: "existing_company", companyId: uuid },
      adapterOverrides: {
        "agent-1": { adapterType: "process", adapterConfig: { cmd: "node" } }
      }
    };
    expect(companyPortabilityImportSchema.parse(valid)).toBeDefined();
  });
});
