import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const tempDirs: string[] = [];

function runValidator(plan: unknown) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "clix-user-plan-"));
  tempDirs.push(tmpDir);
  const planPath = path.join(tmpDir, "user-plan.json");
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2) + "\n", "utf8");

  const scriptPath = path.resolve(
    __dirname,
    "..",
    "skills",
    "user-management",
    "scripts",
    "validate-user-plan.sh"
  );

  const result = spawnSync("bash", [scriptPath, planPath], {
    encoding: "utf8",
  });

  return { result, planPath, scriptPath };
}

describe("validate-user-plan.sh", () => {
  afterEach(() => {
    for (const tmpDir of tempDirs) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    }
    tempDirs.length = 0;
  });

  it("passes a minimal valid user plan", () => {
    const { result } = runValidator({
      logout_policy: "do_not_set_user_id_null",
      user_id: { source: "auth response", example: "user_12345" },
      properties: {
        subscription_tier: { type: "string", required: false },
        premium: { type: "boolean", required: false },
        age: { type: "number", required: false },
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("user-plan validation passed");
  });

  it("fails if user_id is missing", () => {
    const { result } = runValidator({
      logout_policy: "do_not_set_user_id_null",
      properties: { premium: { type: "boolean", required: false } },
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("user_id must be an object");
  });

  it("fails if user_id.source is missing/empty", () => {
    const { result } = runValidator({
      user_id: { source: "" },
      properties: { premium: { type: "boolean", required: false } },
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("user_id.source must be a non-empty string");
  });

  it("fails if properties is empty", () => {
    const { result } = runValidator({
      user_id: { source: "auth response" },
      properties: {},
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("properties must be a non-empty object");
  });

  it("fails if property key is not snake_case", () => {
    const { result } = runValidator({
      user_id: { source: "auth response" },
      properties: { subscriptionTier: { type: "string", required: false } },
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("must be snake_case");
  });

  it("fails if property type is missing", () => {
    const { result } = runValidator({
      user_id: { source: "auth response" },
      properties: { premium: { required: false } },
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("properties['premium'].type is required");
  });

  it("fails if property type is invalid", () => {
    const { result } = runValidator({
      user_id: { source: "auth response" },
      properties: { premium: { type: "bool", required: false } },
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("must be one of: string, number, boolean");
  });

  it("fails if required is not boolean", () => {
    const { result } = runValidator({
      user_id: { source: "auth response" },
      properties: { premium: { type: "boolean", required: "yes" } },
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("required must be boolean if present");
  });

  it("fails if logout_policy is invalid", () => {
    const { result } = runValidator({
      logout_policy: "set_user_id_null_on_logout",
      user_id: { source: "auth response" },
      properties: { premium: { type: "boolean", required: false } },
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("logout_policy must be 'do_not_set_user_id_null'");
  });
});
