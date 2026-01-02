import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

function runValidator(plan: unknown) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "clix-event-plan-"));
  const planPath = path.join(tmpDir, "event-plan.json");
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2) + "\n", "utf8");

  const scriptPath = path.resolve(
    __dirname,
    "..",
    "skills",
    "event-tracking",
    "scripts",
    "validate-event-plan.sh"
  );

  const result = spawnSync("bash", [scriptPath, planPath], {
    encoding: "utf8",
  });

  return { result, planPath, scriptPath };
}

describe("validate-event-plan.sh", () => {
  it("passes a minimal valid event plan (based on docs example)", () => {
    // Based on Clix docs example event: signup_completed with properties like method, trial_days, completed_at
    // https://docs.clix.so/event-tracking/event-tracking
    const { result } = runValidator({
      events: [
        {
          name: "signup_completed",
          when: "after backend confirms account creation",
          purpose: ["analytics", "campaigns"],
          properties: {
            method: { type: "string", required: true },
            discount_applied: { type: "boolean", required: false },
            trial_days: { type: "number", required: false },
            completed_at: { type: "datetime", required: false },
          },
        },
      ],
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("✅ event-plan validation passed");
  });

  it("fails if event name is not snake_case", () => {
    const { result } = runValidator({
      events: [
        {
          name: "SignupCompleted",
          when: "after signup",
          purpose: ["analytics"],
          properties: {},
        },
      ],
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("❌ event-plan validation failed:");
    expect(result.stdout).toContain("events[0].name must be snake_case string");
  });

  it("fails if purpose is missing/empty", () => {
    const { result } = runValidator({
      events: [
        {
          name: "signup_completed",
          when: "after signup",
          purpose: [],
          properties: {},
        },
      ],
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("events[0].purpose must be a non-empty array");
  });

  it("fails if property key is not snake_case", () => {
    const { result } = runValidator({
      events: [
        {
          name: "signup_completed",
          when: "after signup",
          purpose: ["analytics"],
          properties: {
            trialDays: { type: "number", required: false },
          },
        },
      ],
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("must be snake_case");
  });

  it("fails if property type is invalid", () => {
    const { result } = runValidator({
      events: [
        {
          name: "signup_completed",
          when: "after signup",
          purpose: ["analytics"],
          properties: {
            method: { type: "str", required: true },
          },
        },
      ],
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("must be one of: string, number, boolean, datetime");
  });

  it("fails if event name is duplicated", () => {
    const { result } = runValidator({
      events: [
        {
          name: "signup_completed",
          when: "after signup",
          purpose: ["analytics"],
          properties: {},
        },
        {
          name: "signup_completed",
          when: "after signup",
          purpose: ["analytics"],
          properties: {},
        },
      ],
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("is duplicated");
  });

  it("fails if 'when' field is missing or empty", () => {
    const { result } = runValidator({
      events: [
        {
          name: "signup_completed",
          when: "",
          purpose: ["analytics"],
          properties: {},
        },
      ],
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("events[0].when must be a non-empty string");
  });

  it("fails if purpose contains invalid values", () => {
    const { result } = runValidator({
      events: [
        {
          name: "signup_completed",
          when: "after signup",
          purpose: ["analytics", "invalid_purpose"],
          properties: {},
        },
      ],
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("purpose entries must be one of: analytics, campaigns");
  });

  it("fails if events array is missing or empty", () => {
    const { result } = runValidator({
      events: [],
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("events must be a non-empty array");
  });

  it("fails if property spec is not an object", () => {
    const { result } = runValidator({
      events: [
        {
          name: "signup_completed",
          when: "after signup",
          purpose: ["analytics"],
          properties: {
            method: "string", // should be { type: "string", ... }
          },
        },
      ],
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("must be an object");
  });

  it("fails if property 'required' field is not boolean", () => {
    const { result } = runValidator({
      events: [
        {
          name: "signup_completed",
          when: "after signup",
          purpose: ["analytics"],
          properties: {
            method: { type: "string", required: "yes" }, // should be boolean
          },
        },
      ],
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("required must be boolean if present");
  });
});
