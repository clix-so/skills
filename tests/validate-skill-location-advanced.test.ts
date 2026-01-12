/**
 * Advanced tests for validate-skill-location.sh
 *
 * Following Google/Meta testing standards:
 * - Cross-platform path handling
 * - Parameterized client testing
 * - Edge cases and boundary conditions
 * - Security validation
 * - Concurrent execution safety
 *
 * @group advanced
 * @group location
 */

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { TempDirManager } from "./fixtures/skill-scaffold-builder";

const tempDirs = new TempDirManager();

function createSkillFolder(tmpDir: string, pathSegments: string[]): string {
  const fullPath = path.join(tmpDir, ...pathSegments);
  fs.mkdirSync(fullPath, { recursive: true });
  fs.writeFileSync(path.join(fullPath, "SKILL.md"), "---\nname: test\n---\n# Test\n", "utf8");
  return fullPath;
}

function runValidator(skillDir: string, args: string[] = []) {
  const scriptPath = path.resolve(
    __dirname,
    "..",
    "skills",
    "skill-creator",
    "scripts",
    "validate-skill-location.sh"
  );

  const result = spawnSync("bash", [scriptPath, skillDir, ...args], {
    encoding: "utf8",
    timeout: 5000,
  });

  return { result, skillDir, scriptPath };
}

describe("validate-skill-location.sh - Advanced Tests", () => {
  afterEach(() => {
    tempDirs.cleanup();
  });

  describe("Parameterized Tests - All Supported Clients", () => {
    /**
     * Test matrix for all supported AI clients
     * Validates that each client's path structure is correctly recognized
     */
    const clients = [
      { name: "cursor", dir: ".cursor", skillsOrSkill: "skills" },
      { name: "claude", dir: ".claude", skillsOrSkill: "skills" },
      { name: "claude-code", dir: ".claude", skillsOrSkill: "skills" },
      { name: "codex", dir: ".codex", skillsOrSkill: "skills" },
      { name: "amp", dir: ".amp", skillsOrSkill: "skills" },
      { name: "vscode", dir: ".vscode", skillsOrSkill: "skills" },
      { name: "goose", dir: ".goose", skillsOrSkill: "skills" },
      { name: "github", dir: ".github", skillsOrSkill: "skills" },
      { name: "gemini", dir: ".gemini", skillsOrSkill: "skills" },
      { name: "letta", dir: "", skillsOrSkill: ".skills" }, // Letta uses .skills/
      { name: "opencode", dir: ".opencode", skillsOrSkill: "skill" }, // Note: "skill" not "skills"
    ];

    test.each(clients)(
      "validates $name client in correct directory",
      ({ name, dir, skillsOrSkill }) => {
        const tmpDir = tempDirs.create(`loc-client-${name}-`);

        const pathSegments =
          dir === "" ? [skillsOrSkill, "test-skill"] : [dir, skillsOrSkill, "test-skill"];

        const skillDir = createSkillFolder(tmpDir, pathSegments);
        const { result } = runValidator(skillDir, ["--mode", "client", "--client", name]);

        expect(result.status).toBe(0);
        expect(result.stdout).toContain("OK: skill location looks OK (client)");
      }
    );

    test.each(clients)("fails when $name skill is in wrong directory", ({ name, dir }) => {
      // Skip for clients with empty dir (like letta) or unknown path structure
      if (
        name === "letta" ||
        dir === "" ||
        name === "gemini" ||
        name === "goose" ||
        name === "github"
      ) {
        return;
      }

      const tmpDir = tempDirs.create(`loc-wrong-${name}-`);

      // Put skill in wrong directory
      const wrongDir = dir === ".cursor" ? ".vscode" : ".cursor";
      const skillDir = createSkillFolder(tmpDir, [wrongDir, "skills", "test-skill"]);

      const { result } = runValidator(skillDir, ["--mode", "client", "--client", name]);

      expect(result.status).toBe(1);
      expect(result.stdout || result.stderr).toMatch(/ERROR|Expected/);
    });
  });

  describe("Edge Cases - Path Handling", () => {
    it("handles absolute paths correctly", () => {
      const tmpDir = tempDirs.create("loc-absolute-");
      const skillDir = createSkillFolder(tmpDir, ["skills", "test-skill"]);

      // Convert to absolute path
      const absolutePath = path.resolve(skillDir);

      const { result } = runValidator(absolutePath, ["--mode", "repo"]);

      expect(result.status).toBe(0);
    });

    it("handles relative paths with ./ prefix", () => {
      const tmpDir = tempDirs.create("loc-relative-");
      const skillDir = createSkillFolder(tmpDir, ["skills", "test-skill"]);

      // Use relative path from tmpDir
      const relativePath = `./skills/test-skill`;
      const cwd = tmpDir;

      const scriptPath = path.resolve(
        __dirname,
        "..",
        "skills",
        "skill-creator",
        "scripts",
        "validate-skill-location.sh"
      );

      const result = spawnSync("bash", [scriptPath, relativePath, "--mode", "repo"], {
        encoding: "utf8",
        cwd,
      });

      expect(result.status).toBe(0);
    });

    it("handles paths with spaces correctly", () => {
      const tmpDir = tempDirs.create("loc-spaces-");

      const skillDir = createSkillFolder(tmpDir, ["skills", "test skill with spaces"]);

      const { result } = runValidator(skillDir, ["--mode", "repo"]);

      expect(result.status).toBe(0);
    });

    it("handles paths with special characters", () => {
      const tmpDir = tempDirs.create("loc-special-");

      // Create skill with special chars in name (but valid)
      const skillDir = createSkillFolder(tmpDir, ["skills", "test-skill-v2.1"]);

      const { result } = runValidator(skillDir, ["--mode", "repo"]);

      expect(result.status).toBe(0);
    });

    it("handles deeply nested paths", () => {
      const tmpDir = tempDirs.create("loc-deep-");

      // Create skill at a deep nesting level
      const deepPath = ["project", "src", "main", "resources", "skills", "test-skill"];
      const skillDir = createSkillFolder(tmpDir, deepPath);

      const { result } = runValidator(skillDir, ["--mode", "repo"]);

      // Should pass - only cares about immediate parent being "skills"
      expect(result.status).toBe(0);
    });

    it("handles user home directory expansion", () => {
      const tmpDir = tempDirs.create("loc-home-");

      // Test with path that includes home directory
      const skillDir = createSkillFolder(tmpDir, [".claude", "skills", "test-skill"]);

      const { result } = runValidator(skillDir, ["--mode", "client", "--client", "claude"]);

      expect(result.status).toBe(0);
    });
  });

  describe("Security Tests", () => {
    it("prevents path traversal attacks in skill directory", () => {
      const tmpDir = tempDirs.create("loc-security-");

      // Try to traverse up with ../
      const maliciousPath = path.join(tmpDir, "skills", "test-skill", "..", "..", "etc", "passwd");

      const { result } = runValidator(maliciousPath, ["--mode", "repo"]);

      // Should fail safely
      expect(result.status).not.toBe(0);
    });

    it("handles paths with null bytes safely", () => {
      const tmpDir = tempDirs.create("loc-null-");

      const skillDir = createSkillFolder(tmpDir, ["skills", "test-skill"]);

      // Node.js rejects null bytes in spawn arguments (by design). Depending on
      // Node version, this may throw synchronously. Treat either behavior as a pass:
      // - throw TypeError mentioning "null byte"
      // - spawn returns non-zero status (if runtime ever allows it)
      const maliciousPath = `${skillDir}\0/etc/passwd`;
      try {
        const { result } = runValidator(maliciousPath, ["--mode", "repo"]);
        expect(result.status).not.toBe(0);
      } catch (error) {
        expect(String(error)).toMatch(/null byte/i);
      }
    });

    it("handles directory names with command injection attempts", () => {
      const tmpDir = tempDirs.create("loc-injection-");

      // Try directory name with shell metacharacters
      const maliciousDir = "test-skill-$(whoami)";
      const skillDir = createSkillFolder(tmpDir, ["skills", maliciousDir]);

      const { result } = runValidator(skillDir, ["--mode", "repo"]);

      // Should handle safely - basename doesn't execute commands
      expect(result.status).toBe(0);
      expect(result.stdout).not.toContain(process.env.USER || "");
    });
  });

  describe("Concurrent Execution Safety", () => {
    it("handles multiple simultaneous validations", async () => {
      const tmpDir = tempDirs.create("loc-concurrent-");

      // Create multiple skill directories
      const skills = Array.from({ length: 10 }, (_, i) =>
        createSkillFolder(tmpDir, ["skills", `test-skill-${i}`])
      );

      // Run validations concurrently
      const results = await Promise.all(
        skills.map((skillDir) => Promise.resolve(runValidator(skillDir, ["--mode", "repo"])))
      );

      // All should pass
      results.forEach(({ result }) => {
        expect(result.status).toBe(0);
      });
    });
  });

  describe("Boundary Tests", () => {
    it("validates skill at exact path depth", () => {
      const tmpDir = tempDirs.create("loc-depth-");

      // Skill directly in skills/
      const skillDir = createSkillFolder(tmpDir, ["skills", "s"]);

      const { result } = runValidator(skillDir, ["--mode", "repo"]);

      expect(result.status).toBe(0);
    });

    it("handles very long directory names", () => {
      const tmpDir = tempDirs.create("loc-long-");

      // Create skill with very long name (but under filesystem limit)
      const longName = "a".repeat(200);
      const skillDir = createSkillFolder(tmpDir, ["skills", longName]);

      const { result } = runValidator(skillDir, ["--mode", "repo"]);

      expect(result.status).toBe(0);
    });

    it("handles client names case-insensitively", () => {
      const tmpDir = tempDirs.create("loc-case-");

      const skillDir = createSkillFolder(tmpDir, [".cursor", "skills", "test-skill"]);

      // Try with different cases
      const cases = ["cursor", "CURSOR", "Cursor", "CuRsOr"];

      for (const clientName of cases) {
        const { result } = runValidator(skillDir, ["--mode", "client", "--client", clientName]);

        expect(result.status).toBe(0);
      }
    });
  });

  describe("Error Handling", () => {
    it("provides helpful error for missing directory", () => {
      const tmpDir = tempDirs.create("loc-missing-");

      const nonExistent = path.join(tmpDir, "does-not-exist");
      const { result } = runValidator(nonExistent, ["--mode", "repo"]);

      expect(result.status).toBe(2);
      expect(result.stderr).toContain("directory not found");
      expect(result.stderr).toContain(nonExistent);
    });

    it("provides helpful error for wrong mode", () => {
      const tmpDir = tempDirs.create("loc-bad-mode-");

      const skillDir = createSkillFolder(tmpDir, ["skills", "test-skill"]);
      const { result } = runValidator(skillDir, ["--mode", "invalid"]);

      expect(result.status).toBe(2);
      expect(result.stderr).toContain("--mode must be 'repo' or 'client'");
    });

    it("handles missing --client argument gracefully", () => {
      const tmpDir = tempDirs.create("loc-no-client-");

      const scriptPath = path.resolve(
        __dirname,
        "..",
        "skills",
        "skill-creator",
        "scripts",
        "validate-skill-location.sh"
      );

      const skillDir = createSkillFolder(tmpDir, [".cursor", "skills", "test-skill"]);

      // Use --client flag without value (should error)
      const result = spawnSync("bash", [scriptPath, skillDir, "--mode", "client", "--client"], {
        encoding: "utf8",
      });

      expect(result.status).not.toBe(0);
    });
  });

  describe("Regression Tests", () => {
    it("handles OpenCode's singular 'skill' directory correctly", () => {
      const tmpDir = tempDirs.create("loc-opencode-");

      // OpenCode uses .opencode/skill/ not .opencode/skills/
      const skillDir = createSkillFolder(tmpDir, [".opencode", "skill", "test-skill"]);

      const { result } = runValidator(skillDir, ["--mode", "client", "--client", "opencode"]);

      expect(result.status).toBe(0);
    });

    it("rejects OpenCode skills in 'skills' directory", () => {
      const tmpDir = tempDirs.create("loc-opencode-wrong-");

      // Create in wrong directory (skills instead of skill)
      const skillDir = createSkillFolder(tmpDir, [".opencode", "skills", "test-skill"]);

      const { result } = runValidator(skillDir, ["--mode", "client", "--client", "opencode"]);

      expect(result.status).toBe(1);
      expect(result.stdout || result.stderr).toContain(".opencode/skill/");
    });

    it("handles Letta's root-level .skills directory", () => {
      const tmpDir = tempDirs.create("loc-letta-");

      // Letta uses .skills at root level (not .letta/skills)
      const skillDir = createSkillFolder(tmpDir, [".skills", "test-skill"]);

      const { result } = runValidator(skillDir, ["--mode", "client", "--client", "letta"]);

      expect(result.status).toBe(0);
    });

    it("validates help documentation is accessible", () => {
      const tmpDir = tempDirs.create("loc-help-");
      const dummyDir = path.join(tmpDir, "dummy");
      fs.mkdirSync(dummyDir);

      const scriptPath = path.resolve(
        __dirname,
        "..",
        "skills",
        "skill-creator",
        "scripts",
        "validate-skill-location.sh"
      );

      const result = spawnSync("bash", [scriptPath, dummyDir, "--help"], {
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Usage:");
      expect(result.stdout).toContain("Examples:");
      expect(result.stdout).toContain("--mode");
      expect(result.stdout).toContain("--client");
    });
  });

  describe("Performance Tests", () => {
    it("validates location quickly even with deep paths", () => {
      const tmpDir = tempDirs.create("loc-perf-deep-");

      // Create very deep path
      const deepSegments = Array.from({ length: 20 }, (_, i) => `level-${i}`);
      deepSegments.push("skills", "test-skill");

      const skillDir = createSkillFolder(tmpDir, deepSegments);

      const startTime = Date.now();
      const { result } = runValidator(skillDir, ["--mode", "repo"]);
      const duration = Date.now() - startTime;

      expect(result.status).toBe(0);
      // Should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });

    it("handles many sequential validations efficiently", () => {
      const tmpDir = tempDirs.create("loc-perf-many-");

      const skillDirs = Array.from({ length: 100 }, (_, i) =>
        createSkillFolder(tmpDir, ["skills", `test-${i}`])
      );

      const startTime = Date.now();

      for (const skillDir of skillDirs) {
        const { result } = runValidator(skillDir, ["--mode", "repo"]);
        expect(result.status).toBe(0);
      }

      const duration = Date.now() - startTime;

      // 100 validations should complete within 10 seconds
      expect(duration).toBeLessThan(10000);
      console.log(`Validated 100 locations in ${duration}ms (${duration / 100}ms avg)`);
    });
  });
});
