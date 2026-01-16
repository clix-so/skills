import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const tempDirs: string[] = [];

function createSkillScaffold(
  tmpDir: string,
  options: {
    skillMd?: string | null;
    licenseTxt?: boolean;
    referencesFiles?: string[];
    scriptsFiles?: string[];
    examplesFiles?: string[];
  }
) {
  const skillDir = path.join(tmpDir, "test-skill");
  fs.mkdirSync(skillDir);

  // Create SKILL.md
  if (options.skillMd !== null) {
    const skillMdContent =
      options.skillMd ||
      `---
name: clix-test-skill
display-name: Test Skill
short-description: A test skill
description: This is a test skill that references clix-mcp-server for testing
user-invocable: true
---

# Test Skill

This skill uses clix-mcp-server for validation.
`;
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), skillMdContent, "utf8");
  }

  // Create LICENSE.txt
  if (options.licenseTxt) {
    fs.writeFileSync(path.join(skillDir, "LICENSE.txt"), "Apache License 2.0\n", "utf8");
  }

  // Create references/
  if (options.referencesFiles !== undefined) {
    const refDir = path.join(skillDir, "references");
    fs.mkdirSync(refDir);
    for (const file of options.referencesFiles) {
      fs.writeFileSync(path.join(refDir, file), "# Reference\n", "utf8");
    }
  }

  // Create scripts/
  if (options.scriptsFiles !== undefined) {
    const scriptsDir = path.join(skillDir, "scripts");
    fs.mkdirSync(scriptsDir);
    for (const file of options.scriptsFiles) {
      fs.writeFileSync(path.join(scriptsDir, file), "#!/usr/bin/env bash\necho test\n", "utf8");
    }
  }

  // Create examples/
  if (options.examplesFiles && options.examplesFiles.length > 0) {
    const examplesDir = path.join(skillDir, "examples");
    fs.mkdirSync(examplesDir);
    for (const file of options.examplesFiles) {
      fs.writeFileSync(path.join(examplesDir, file), "example: test\n", "utf8");
    }
  }

  return skillDir;
}

function runValidator(skillDir: string) {
  const scriptPath = path.resolve(
    __dirname,
    "..",
    "skills",
    "skill-creator",
    "scripts",
    "validate-skill-scaffold.sh"
  );

  const result = spawnSync("bash", [scriptPath, skillDir], {
    encoding: "utf8",
  });

  return { result, skillDir, scriptPath };
}

describe("validate-skill-scaffold.sh", () => {
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

  it("passes a valid complete skill scaffold", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-scaffold-"));
    tempDirs.push(tmpDir);

    const skillDir = createSkillScaffold(tmpDir, {
      licenseTxt: true,
      referencesFiles: ["guide.md", "reference.md"],
      scriptsFiles: ["validate.sh", "helper.sh"],
      examplesFiles: ["example1.yaml"],
    });

    const { result } = runValidator(skillDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("OK: skill scaffold validation passed");
  });

  it("passes a minimal valid scaffold (without examples)", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-scaffold-"));
    tempDirs.push(tmpDir);

    const skillDir = createSkillScaffold(tmpDir, {
      licenseTxt: true,
      referencesFiles: ["guide.md"],
      scriptsFiles: ["validate.sh"],
    });

    const { result } = runValidator(skillDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("OK: skill scaffold validation passed");
  });

  it("fails if SKILL.md is missing", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-scaffold-"));
    tempDirs.push(tmpDir);

    const skillDir = createSkillScaffold(tmpDir, {
      skillMd: null, // Don't create SKILL.md
      licenseTxt: true,
      referencesFiles: ["guide.md"],
      scriptsFiles: ["validate.sh"],
    });

    const { result } = runValidator(skillDir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("ERROR: skill scaffold validation failed:");
    expect(result.stdout).toContain("missing required file: SKILL.md");
  });

  it("fails if LICENSE.txt is missing", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-scaffold-"));
    tempDirs.push(tmpDir);

    const skillDir = createSkillScaffold(tmpDir, {
      licenseTxt: false,
      referencesFiles: ["guide.md"],
      scriptsFiles: ["validate.sh"],
    });

    const { result } = runValidator(skillDir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("missing required file: LICENSE.txt");
  });

  it("fails if references/ directory is missing", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-scaffold-"));
    tempDirs.push(tmpDir);

    const skillDir = createSkillScaffold(tmpDir, {
      licenseTxt: true,
      scriptsFiles: ["validate.sh"],
    });

    const { result } = runValidator(skillDir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("missing required directory: references/");
  });

  it("fails if references/ directory is empty", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-scaffold-"));
    tempDirs.push(tmpDir);

    const skillDir = createSkillScaffold(tmpDir, {
      licenseTxt: true,
      referencesFiles: [], // Empty array
      scriptsFiles: ["validate.sh"],
    });

    const { result } = runValidator(skillDir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("required directory is empty: references/");
  });

  it("fails if scripts/ directory is missing", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-scaffold-"));
    tempDirs.push(tmpDir);

    const skillDir = createSkillScaffold(tmpDir, {
      licenseTxt: true,
      referencesFiles: ["guide.md"],
    });

    const { result } = runValidator(skillDir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("missing required directory: scripts/");
  });

  it("fails if scripts/ directory is empty", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-scaffold-"));
    tempDirs.push(tmpDir);

    const skillDir = createSkillScaffold(tmpDir, {
      licenseTxt: true,
      referencesFiles: ["guide.md"],
      scriptsFiles: [], // Empty array
    });

    const { result } = runValidator(skillDir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("required directory is empty: scripts/");
  });

  it("fails if SKILL.md is missing frontmatter", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-scaffold-"));
    tempDirs.push(tmpDir);

    const skillMd = `# Test Skill

This skill has no frontmatter.
`;

    const skillDir = createSkillScaffold(tmpDir, {
      skillMd,
      licenseTxt: true,
      referencesFiles: ["guide.md"],
      scriptsFiles: ["validate.sh"],
    });

    const { result } = runValidator(skillDir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("SKILL.md must start with YAML frontmatter delimited by ---");
  });

  it("fails if frontmatter is missing required keys", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-scaffold-"));
    tempDirs.push(tmpDir);

    const skillMd = `---
name: clix-test-skill
description: Missing display-name and short-description
---

# Test Skill
`;

    const skillDir = createSkillScaffold(tmpDir, {
      skillMd,
      licenseTxt: true,
      referencesFiles: ["guide.md"],
      scriptsFiles: ["validate.sh"],
    });

    const { result } = runValidator(skillDir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("frontmatter missing key:");
  });

  it("passes for non-clix skills without MCP reference", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-scaffold-"));
    tempDirs.push(tmpDir);

    const skillMd = `---
name: permission-ux-auditor
display-name: Permission UX Auditor
short-description: Audit permission UX
description: Audits notification permission request UX
user-invocable: true
---

# Permission UX Auditor

This skill does not reference MCP tools.
`;

    const skillDir = createSkillScaffold(tmpDir, {
      skillMd,
      licenseTxt: true,
      referencesFiles: ["guide.md"],
      scriptsFiles: ["validate.sh"],
    });

    const { result } = runValidator(skillDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("OK: skill scaffold validation passed");
  });

  it("fails if user-invocable is not a boolean", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-scaffold-"));
    tempDirs.push(tmpDir);

    const skillMd = `---
name: clix-test-skill
display-name: Test Skill
short-description: A test
description: Test skill
user-invocable: yes
---

# Test Skill

Uses clix-mcp-server.
`;

    const skillDir = createSkillScaffold(tmpDir, {
      skillMd,
      licenseTxt: true,
      referencesFiles: ["guide.md"],
      scriptsFiles: ["validate.sh"],
    });

    const { result } = runValidator(skillDir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("frontmatter user-invocable must be true or false");
  });

  it("fails if SKILL.md does not reference 'clix-mcp-server' for clix skills", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-scaffold-"));
    tempDirs.push(tmpDir);

    const skillMd = `---
name: clix-test-skill
display-name: Test Skill
short-description: A test
description: Test skill
user-invocable: true
---

# Test Skill

This skill does not mention the MCP server.
`;

    const skillDir = createSkillScaffold(tmpDir, {
      skillMd,
      licenseTxt: true,
      referencesFiles: ["guide.md"],
      scriptsFiles: ["validate.sh"],
    });

    const { result } = runValidator(skillDir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      "SKILL.md must reference 'clix-mcp-server' (MCP-first requirement)"
    );
  });

  it("fails if skill directory does not exist", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-scaffold-"));
    tempDirs.push(tmpDir);

    const nonExistentDir = path.join(tmpDir, "does-not-exist");
    const { result } = runValidator(nonExistentDir);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("directory not found");
  });

  it("handles multiple validation errors correctly", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-scaffold-"));
    tempDirs.push(tmpDir);

    const skillMd = `---
name: test-skill
display-name: Test Skill
short-description: A test
---

# Test Skill
`;

    const skillDir = createSkillScaffold(tmpDir, {
      skillMd,
      licenseTxt: false,
      referencesFiles: [],
      scriptsFiles: [],
    });

    const { result } = runValidator(skillDir);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("ERROR: skill scaffold validation failed:");
    // Should contain multiple errors
    const errorCount = (result.stdout.match(/- /g) || []).length;
    expect(errorCount).toBeGreaterThanOrEqual(3);
  });
});
