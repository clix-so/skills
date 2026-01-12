import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const tempDirs: string[] = [];

/**
 * Creates a complete skill scaffold with all required files
 */
function createCompleteSkill(
  tmpDir: string,
  skillName: string,
  options: {
    inSkillsDir?: boolean;
    mcpReference?: boolean;
    validFrontmatter?: boolean;
  } = {}
): string {
  const { inSkillsDir = true, mcpReference = true, validFrontmatter = true } = options;

  // Determine path
  const pathSegments = inSkillsDir ? ["skills", skillName] : [skillName];
  const skillDir = path.join(tmpDir, ...pathSegments);
  fs.mkdirSync(skillDir, { recursive: true });

  // Create SKILL.md
  const mcpText = mcpReference
    ? "This skill uses clix-mcp-server:search_docs and clix-mcp-server:search_sdk."
    : "This skill does not reference MCP.";

  const frontmatter = validFrontmatter
    ? `---
name: clix-${skillName}
display-name: ${skillName.charAt(0).toUpperCase() + skillName.slice(1)} Skill
short-description: A test skill for ${skillName}
description: This skill demonstrates ${skillName} functionality
user-invocable: true
---`
    : `---
name: ${skillName}
---`;

  const skillMdContent = `${frontmatter}

# ${skillName} Skill

${mcpText}

## Workflow

1. Step 1: Do something
2. Step 2: Do something else

## References

- [Reference Guide](references/guide.md)
`;

  fs.writeFileSync(path.join(skillDir, "SKILL.md"), skillMdContent, "utf8");

  // Create LICENSE.txt
  fs.writeFileSync(
    path.join(skillDir, "LICENSE.txt"),
    `Copyright (c) 2026 Clix (https://clix.so/)

                             Apache License
                       Version 2.0, January 2004
                    http://www.apache.org/licenses/

[License text...]
`,
    "utf8"
  );

  // Create references/
  const refDir = path.join(skillDir, "references");
  fs.mkdirSync(refDir);
  fs.writeFileSync(
    path.join(refDir, "guide.md"),
    `# ${skillName} Reference Guide

This is a reference guide for ${skillName}.

## API Reference

See clix-mcp-server for latest signatures.
`,
    "utf8"
  );

  fs.writeFileSync(
    path.join(refDir, "examples.md"),
    `# ${skillName} Examples

Example 1: Basic usage
Example 2: Advanced usage
`,
    "utf8"
  );

  // Create scripts/
  const scriptsDir = path.join(skillDir, "scripts");
  fs.mkdirSync(scriptsDir);
  fs.writeFileSync(
    path.join(scriptsDir, "validate.sh"),
    `#!/usr/bin/env bash
# Validation script for ${skillName}
echo "OK: validation passed"
exit 0
`,
    "utf8"
  );

  // Create examples/
  const examplesDir = path.join(skillDir, "examples");
  fs.mkdirSync(examplesDir);
  fs.writeFileSync(
    path.join(examplesDir, "example1.yaml"),
    `# Example configuration
skill: clix-${skillName}
enabled: true
`,
    "utf8"
  );

  return skillDir;
}

function runLocationValidator(skillDir: string, args: string[] = []) {
  const scriptPath = path.resolve(
    __dirname,
    "..",
    "skills",
    "skill-creator",
    "scripts",
    "validate-skill-location.sh"
  );

  return spawnSync("bash", [scriptPath, skillDir, ...args], {
    encoding: "utf8",
  });
}

function runScaffoldValidator(skillDir: string) {
  const scriptPath = path.resolve(
    __dirname,
    "..",
    "skills",
    "skill-creator",
    "scripts",
    "validate-skill-scaffold.sh"
  );

  return spawnSync("bash", [scriptPath, skillDir], {
    encoding: "utf8",
  });
}

describe("skill-creator integration", () => {
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

  describe("complete workflow validation", () => {
    it("validates a properly created skill through both stages", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-integration-"));
      tempDirs.push(tmpDir);

      const skillDir = createCompleteSkill(tmpDir, "test-workflow");

      // Stage 1: Location validation
      const locationResult = runLocationValidator(skillDir, ["--mode", "repo"]);
      expect(locationResult.status).toBe(0);
      expect(locationResult.stdout).toContain("OK: skill location looks OK (repo)");

      // Stage 2: Scaffold validation
      const scaffoldResult = runScaffoldValidator(skillDir);
      expect(scaffoldResult.status).toBe(0);
      expect(scaffoldResult.stdout).toContain("OK: skill scaffold validation passed");
    });

    it("fails at location stage if skill is in wrong directory", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-integration-"));
      tempDirs.push(tmpDir);

      const skillDir = createCompleteSkill(tmpDir, "test-wrong-location", {
        inSkillsDir: false, // Not in skills/ directory
      });

      // Stage 1: Location validation should fail
      const locationResult = runLocationValidator(skillDir, ["--mode", "repo"]);
      expect(locationResult.status).toBe(1);
      expect(locationResult.stdout || locationResult.stderr).toContain("ERROR: Invalid location:");

      // Don't proceed to Stage 2 when Stage 1 fails
    });

    it("passes location but fails scaffold if MCP reference is missing", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-integration-"));
      tempDirs.push(tmpDir);

      const skillDir = createCompleteSkill(tmpDir, "test-no-mcp", {
        mcpReference: false, // Missing MCP reference
      });

      // Stage 1: Location validation passes
      const locationResult = runLocationValidator(skillDir, ["--mode", "repo"]);
      expect(locationResult.status).toBe(0);

      // Stage 2: Scaffold validation fails due to missing MCP reference
      const scaffoldResult = runScaffoldValidator(skillDir);
      expect(scaffoldResult.status).toBe(1);
      expect(scaffoldResult.stdout).toContain("SKILL.md must reference 'clix-mcp-server'");
    });

    it("passes location but fails scaffold if frontmatter is invalid", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-integration-"));
      tempDirs.push(tmpDir);

      const skillDir = createCompleteSkill(tmpDir, "test-bad-frontmatter", {
        validFrontmatter: false, // Invalid frontmatter
      });

      // Stage 1: Location validation passes
      const locationResult = runLocationValidator(skillDir, ["--mode", "repo"]);
      expect(locationResult.status).toBe(0);

      // Stage 2: Scaffold validation fails due to invalid frontmatter
      const scaffoldResult = runScaffoldValidator(skillDir);
      expect(scaffoldResult.status).toBe(1);
      expect(scaffoldResult.stdout).toContain("frontmatter missing key:");
    });
  });

  describe("client installation validation", () => {
    it("validates a skill installed in Cursor", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-integration-"));
      tempDirs.push(tmpDir);

      // Create skill in .cursor/skills/
      const cursorSkillsDir = path.join(tmpDir, ".cursor", "skills", "test-cursor-skill");
      fs.mkdirSync(cursorSkillsDir, { recursive: true });

      // Copy over a complete skill structure
      const skillDir = createCompleteSkill(tmpDir, "temp-skill");
      const files = ["SKILL.md", "LICENSE.txt"];
      const dirs = ["references", "scripts", "examples"];

      for (const file of files) {
        fs.copyFileSync(path.join(skillDir, file), path.join(cursorSkillsDir, file));
      }

      for (const dir of dirs) {
        const srcDir = path.join(skillDir, dir);
        const destDir = path.join(cursorSkillsDir, dir);
        fs.mkdirSync(destDir, { recursive: true });
        const dirFiles = fs.readdirSync(srcDir);
        for (const file of dirFiles) {
          fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
        }
      }

      // Stage 1: Location validation for client mode
      const locationResult = runLocationValidator(cursorSkillsDir, [
        "--mode",
        "client",
        "--client",
        "cursor",
      ]);
      expect(locationResult.status).toBe(0);
      expect(locationResult.stdout).toContain("OK: skill location looks OK (client)");

      // Stage 2: Scaffold validation (should work the same)
      const scaffoldResult = runScaffoldValidator(cursorSkillsDir);
      expect(scaffoldResult.status).toBe(0);
      expect(scaffoldResult.stdout).toContain("OK: skill scaffold validation passed");
    });

    it("validates a skill installed in Claude Code", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-integration-"));
      tempDirs.push(tmpDir);

      const claudeSkillsDir = path.join(tmpDir, ".claude", "skills", "test-claude-skill");
      fs.mkdirSync(claudeSkillsDir, { recursive: true });

      const skillDir = createCompleteSkill(tmpDir, "temp-skill");
      const files = ["SKILL.md", "LICENSE.txt"];
      const dirs = ["references", "scripts", "examples"];

      for (const file of files) {
        fs.copyFileSync(path.join(skillDir, file), path.join(claudeSkillsDir, file));
      }

      for (const dir of dirs) {
        const srcDir = path.join(skillDir, dir);
        const destDir = path.join(claudeSkillsDir, dir);
        fs.mkdirSync(destDir, { recursive: true });
        const dirFiles = fs.readdirSync(srcDir);
        for (const file of dirFiles) {
          fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
        }
      }

      const locationResult = runLocationValidator(claudeSkillsDir, [
        "--mode",
        "client",
        "--client",
        "claude-code",
      ]);
      expect(locationResult.status).toBe(0);

      const scaffoldResult = runScaffoldValidator(claudeSkillsDir);
      expect(scaffoldResult.status).toBe(0);
    });
  });

  describe("existing skills validation", () => {
    it("validates the skill-creator itself", () => {
      const skillCreatorPath = path.resolve(__dirname, "..", "skills", "skill-creator");

      // Check if skill-creator exists (it should in the repo)
      if (!fs.existsSync(skillCreatorPath)) {
        console.warn("Skipping: skill-creator not found at", skillCreatorPath);
        return;
      }

      // Stage 1: Location validation
      const locationResult = runLocationValidator(skillCreatorPath, ["--mode", "repo"]);
      expect(locationResult.status).toBe(0);

      // Stage 2: Scaffold validation
      const scaffoldResult = runScaffoldValidator(skillCreatorPath);
      expect(scaffoldResult.status).toBe(0);
    });

    it("validates all existing skills in the repository", () => {
      const skillsDir = path.resolve(__dirname, "..", "skills");

      // Check if skills directory exists
      if (!fs.existsSync(skillsDir)) {
        console.warn("Skipping: skills directory not found");
        return;
      }

      const skills = fs.readdirSync(skillsDir).filter((name) => {
        const skillPath = path.join(skillsDir, name);
        return (
          fs.statSync(skillPath).isDirectory() && fs.existsSync(path.join(skillPath, "SKILL.md"))
        );
      });

      // Should have at least skill-creator
      expect(skills.length).toBeGreaterThan(0);

      for (const skill of skills) {
        const skillPath = path.join(skillsDir, skill);

        // Location validation
        const locationResult = runLocationValidator(skillPath, ["--mode", "repo"]);
        expect(locationResult.status).toBe(0);

        // Scaffold validation
        const scaffoldResult = runScaffoldValidator(skillPath);
        expect(scaffoldResult.status).toBe(0);
      }
    });
  });

  describe("error recovery workflow", () => {
    it("provides actionable feedback when skill fails validation", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-integration-"));
      tempDirs.push(tmpDir);

      // Create an incomplete skill (missing scripts/)
      const skillDir = path.join(tmpDir, "skills", "incomplete-skill");
      fs.mkdirSync(skillDir, { recursive: true });

      fs.writeFileSync(
        path.join(skillDir, "SKILL.md"),
        `---
name: clix-incomplete
display-name: Incomplete
short-description: Incomplete skill
description: Missing scripts directory
user-invocable: true
---

# Incomplete Skill

Uses clix-mcp-server.
`,
        "utf8"
      );

      fs.writeFileSync(path.join(skillDir, "LICENSE.txt"), "Apache License\n", "utf8");

      const refDir = path.join(skillDir, "references");
      fs.mkdirSync(refDir);
      fs.writeFileSync(path.join(refDir, "guide.md"), "# Guide\n", "utf8");

      // No scripts/ directory created

      // Location should pass
      const locationResult = runLocationValidator(skillDir, ["--mode", "repo"]);
      expect(locationResult.status).toBe(0);

      // Scaffold should fail with clear error
      const scaffoldResult = runScaffoldValidator(skillDir);
      expect(scaffoldResult.status).toBe(1);
      expect(scaffoldResult.stdout).toContain("ERROR: skill scaffold validation failed:");
      expect(scaffoldResult.stdout).toContain("missing required directory: scripts/");
    });
  });
});
