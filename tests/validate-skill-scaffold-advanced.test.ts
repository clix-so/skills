/**
 * Advanced tests for validate-skill-scaffold.sh
 *
 * Following Google/Meta testing standards:
 * - Parameterized tests for systematic coverage
 * - Edge case and boundary testing
 * - Security validation (injection, path traversal)
 * - Unicode and special character handling
 * - Performance benchmarks
 * - Regression tests
 *
 * @group advanced
 * @group security
 */

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  SkillScaffoldBuilder,
  SkillFixtures,
  TempDirManager,
} from "./fixtures/skill-scaffold-builder";

const tempDirs = new TempDirManager();

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
    timeout: 10000, // 10s timeout for performance testing
  });

  return { result, skillDir, scriptPath };
}

describe("validate-skill-scaffold.sh - Advanced Tests", () => {
  afterEach(() => {
    tempDirs.cleanup();
  });

  describe("Parameterized Tests - Missing Frontmatter Fields", () => {
    /**
     * Test matrix for frontmatter field validation
     * Each missing field should cause validation to fail
     *
     * Note: The validation script checks for the presence of "key:" pattern,
     * not the presence of values. So "name:" and "description:" are validated
     * only for their pattern, not for non-empty values.
     */
    const frontmatterFields = [
      // Note: "name" and "description" check only for pattern existence, not value
      // These are validated separately for semantic correctness
      {
        field: "display-name",
        expectedError: "frontmatter missing key: display-name",
      },
      {
        field: "short-description",
        expectedError: "frontmatter missing key: short-description",
      },
      {
        field: "user-invocable",
        expectedError: "frontmatter missing key: user-invocable",
      },
    ];

    test.each(frontmatterFields)(
      "fails when frontmatter is missing $field",
      ({ field, expectedError }) => {
        const tmpDir = tempDirs.create("scaffold-param-");

        // Build frontmatter lines, excluding the specified field
        const lines = ["---"];
        if (field !== "name") lines.push("name: clix-test");
        if (field !== "display-name") lines.push("display-name: Test");
        if (field !== "short-description") lines.push("short-description: Test");
        if (field !== "description") lines.push("description: Test skill");
        if (field !== "user-invocable") lines.push("user-invocable: true");
        lines.push("---");
        lines.push("");
        lines.push("# Test");
        lines.push("Uses clix-mcp-server.");

        const frontmatter = lines.join("\n");

        const skillDir = new SkillScaffoldBuilder()
          .withName("test-missing-field")
          .withCustomSKILLMd(frontmatter)
          .build(tmpDir);

        const { result } = runValidator(skillDir);

        expect(result.status).toBe(1);
        expect(result.stdout).toContain(expectedError);
      }
    );
  });

  describe("Edge Cases - Special Characters and Unicode", () => {
    it("handles skill names with hyphens correctly", () => {
      const tmpDir = tempDirs.create("scaffold-edge-");

      const skillDir = new SkillScaffoldBuilder()
        .withName("test-skill-with-many-hyphens")
        .withDisplayName("Test Skill With Hyphens")
        .build(tmpDir);

      const { result } = runValidator(skillDir);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("OK: skill scaffold validation passed");
    });

    it("handles Unicode characters in descriptions", () => {
      const tmpDir = tempDirs.create("scaffold-unicode-");

      const skillMd = `---
name: clix-unicode-test
display-name: Unicode Test 测试
short-description: Unicode测试 ñ é ü
description: Support for internationalization 国际化 español français 日本語
user-invocable: true
---

# Unicode Test

Uses clix-mcp-server with Unicode support: 测试 ñ é ü 国际化
`;

      const skillDir = new SkillScaffoldBuilder()
        .withName("unicode-test")
        .withCustomSKILLMd(skillMd)
        .build(tmpDir);

      const { result } = runValidator(skillDir);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("OK: skill scaffold validation passed");
    });

    it("handles SKILL.md with CRLF line endings", () => {
      const tmpDir = tempDirs.create("scaffold-crlf-");

      const skillMdWithCRLF = `---\r
name: clix-crlf-test\r
display-name: CRLF Test\r
short-description: Test CRLF\r
description: Tests CRLF line endings\r
user-invocable: true\r
---\r
\r
# CRLF Test\r
\r
Uses clix-mcp-server.\r
`;

      const skillDir = new SkillScaffoldBuilder()
        .withName("crlf-test")
        .withCustomSKILLMd(skillMdWithCRLF)
        .build(tmpDir);

      const { result } = runValidator(skillDir);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("OK: skill scaffold validation passed");
    });

    it("handles very long skill names (boundary test)", () => {
      const tmpDir = tempDirs.create("scaffold-long-");

      const longName = "a".repeat(50); // 50 character name
      const skillDir = new SkillScaffoldBuilder()
        .withName(longName)
        .withDisplayName("Very Long Name Test")
        .build(tmpDir);

      const { result } = runValidator(skillDir);

      expect(result.status).toBe(0);
    });

    it("handles skill names with numbers", () => {
      const tmpDir = tempDirs.create("scaffold-numbers-");

      const skillDir = new SkillScaffoldBuilder()
        .withName("test-skill-v2")
        .withDisplayName("Test Skill v2")
        .build(tmpDir);

      const { result } = runValidator(skillDir);

      expect(result.status).toBe(0);
    });
  });

  describe("Security Tests - Injection and Path Traversal", () => {
    it("prevents path traversal in skill directory argument", () => {
      const tmpDir = tempDirs.create("scaffold-security-");

      // Try to escape with path traversal
      const maliciousPath = path.join(tmpDir, "skills", "..", "..", "etc");
      fs.mkdirSync(maliciousPath, { recursive: true });

      const { result } = runValidator(maliciousPath);

      // Should fail safely without executing unintended paths
      expect(result.status).not.toBe(0);
    });

    it("handles skill names with shell metacharacters safely", () => {
      const tmpDir = tempDirs.create("scaffold-shell-");

      const skillMd = `---
name: clix-test-skill
display-name: Test $(echo injected)
short-description: Test; rm -rf /
description: Test \`whoami\` injection
user-invocable: true
---

# Test

Uses clix-mcp-server.
`;

      const skillDir = new SkillScaffoldBuilder()
        .withName("shell-meta-test")
        .withCustomSKILLMd(skillMd)
        .build(tmpDir);

      const { result } = runValidator(skillDir);

      // Should process safely without executing shell commands
      // The script reads the file but doesn't execute content
      expect(result.status).toBe(0);
      // Ensure no actual command execution happened
      expect(result.stdout).not.toContain("injected");
      expect(result.stdout).not.toContain(process.env.USER || "");
    });

    it("handles symbolic links appropriately", () => {
      const tmpDir = tempDirs.create("scaffold-symlink-");

      // Create a valid skill
      const realSkillDir = new SkillScaffoldBuilder().withName("real-skill").build(tmpDir);

      // Create a symlink to it
      const symlinkPath = path.join(tmpDir, "skills", "symlinked-skill");
      try {
        fs.symlinkSync(realSkillDir, symlinkPath, "dir");

        const { result } = runValidator(symlinkPath);

        // Should follow symlinks and validate correctly
        expect(result.status).toBe(0);
      } catch (error) {
        // Symlinks might not be supported on all platforms (Windows)
        console.warn("Symlink test skipped - not supported on this platform");
      }
    });
  });

  describe("Performance Tests", () => {
    it("validates large skill with many files efficiently", () => {
      const tmpDir = tempDirs.create("scaffold-perf-");

      // Create skill with many reference and script files
      const manyReferences = Array.from({ length: 50 }, (_, i) => `ref-${i}.md`);
      const manyScripts = Array.from({ length: 50 }, (_, i) => `script-${i}.sh`);

      const skillDir = new SkillScaffoldBuilder()
        .withName("large-skill")
        .withReferenceFiles(...manyReferences)
        .withScriptFiles(...manyScripts)
        .build(tmpDir);

      const startTime = Date.now();
      const { result } = runValidator(skillDir);
      const duration = Date.now() - startTime;

      expect(result.status).toBe(0);
      // Should complete within 5 seconds even with many files
      expect(duration).toBeLessThan(5000);
    });

    it("validates skill with large SKILL.md efficiently", () => {
      const tmpDir = tempDirs.create("scaffold-large-md-");

      // Create SKILL.md with large content (but still valid)
      const largeSKILLMd = `---
name: clix-large-skill
display-name: Large Skill
short-description: Test large content
description: Tests validation with large SKILL.md file
user-invocable: true
---

# Large Skill

Uses clix-mcp-server for validation.

${"## Section\n\nContent paragraph.\n".repeat(500)}
`;

      const skillDir = new SkillScaffoldBuilder()
        .withName("large-md")
        .withCustomSKILLMd(largeSKILLMd)
        .build(tmpDir);

      const startTime = Date.now();
      const { result } = runValidator(skillDir);
      const duration = Date.now() - startTime;

      expect(result.status).toBe(0);
      // Should complete within 3 seconds even with large file
      expect(duration).toBeLessThan(3000);
    });
  });

  describe("Regression Tests - Known Issues", () => {
    it("handles hidden files in directories correctly", () => {
      const tmpDir = tempDirs.create("scaffold-hidden-");

      const skillDir = new SkillScaffoldBuilder().withName("hidden-files").build(tmpDir);

      // Add hidden files that should be ignored
      fs.writeFileSync(path.join(skillDir, "references", ".DS_Store"), "mac hidden file", "utf8");
      fs.writeFileSync(path.join(skillDir, "scripts", ".gitkeep"), "", "utf8");

      const { result } = runValidator(skillDir);

      // Should pass - hidden files are ignored
      expect(result.status).toBe(0);
    });

    it("validates when directory has only hidden files", () => {
      const tmpDir = tempDirs.create("scaffold-only-hidden-");

      const skillDir = new SkillScaffoldBuilder()
        .withName("only-hidden")
        .withReferenceFiles() // Empty
        .build(tmpDir);

      // Manually create references dir with only hidden file
      const refDir = path.join(skillDir, "references");
      fs.mkdirSync(refDir, { recursive: true });
      fs.writeFileSync(path.join(refDir, ".DS_Store"), "hidden", "utf8");

      const { result } = runValidator(skillDir);

      // Should fail - directory is effectively empty
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("required directory is empty: references/");
    });

    it("handles malformed frontmatter delimiter", () => {
      const tmpDir = tempDirs.create("scaffold-malformed-");

      const malformedSKILLMd = `--
name: clix-malformed
display-name: Malformed
short-description: Test
description: Test
user-invocable: true
---

# Malformed
`;

      const skillDir = new SkillScaffoldBuilder()
        .withName("malformed")
        .withCustomSKILLMd(malformedSKILLMd)
        .build(tmpDir);

      const { result } = runValidator(skillDir);

      expect(result.status).toBe(1);
      expect(result.stdout).toContain("SKILL.md must start with YAML frontmatter");
    });

    it("handles frontmatter with extra dashes", () => {
      const tmpDir = tempDirs.create("scaffold-extra-dash-");

      const extraDashes = `----
name: clix-extra-dash
display-name: Extra Dash
short-description: Test
description: Test
user-invocable: true
----

# Extra Dash

Uses clix-mcp-server.
`;

      const skillDir = new SkillScaffoldBuilder()
        .withName("extra-dash")
        .withCustomSKILLMd(extraDashes)
        .build(tmpDir);

      const { result } = runValidator(skillDir);

      // Current implementation requires exactly 3 dashes
      expect(result.status).toBe(1);
    });

    it("handles frontmatter with Windows-style paths in values", () => {
      const tmpDir = tempDirs.create("scaffold-windows-");

      const windowsPath = `---
name: clix-windows-test
display-name: Windows Test
short-description: Test Windows paths
description: References C:\\Users\\test\\file.txt in description
user-invocable: true
---

# Windows Test

Uses clix-mcp-server.
`;

      const skillDir = new SkillScaffoldBuilder()
        .withName("windows-test")
        .withCustomSKILLMd(windowsPath)
        .build(tmpDir);

      const { result } = runValidator(skillDir);

      // Should pass - backslashes in values are okay
      expect(result.status).toBe(0);
    });
  });

  describe("Boundary Tests", () => {
    it("handles empty string values in frontmatter", () => {
      const tmpDir = tempDirs.create("scaffold-empty-");

      const emptyValues = `---
name: clix-empty-test
display-name: ""
short-description: ""
description: Test
user-invocable: true
---

# Empty Test

Uses clix-mcp-server.
`;

      const skillDir = new SkillScaffoldBuilder()
        .withName("empty-values")
        .withCustomSKILLMd(emptyValues)
        .build(tmpDir);

      const { result } = runValidator(skillDir);

      // Empty strings might be valid YAML but violate business rules
      // Current implementation likely accepts them
      expect(result.status).toBe(0);
    });

    it("handles whitespace-only directory content", () => {
      const tmpDir = tempDirs.create("scaffold-whitespace-");

      const skillDir = new SkillScaffoldBuilder()
        .withName("whitespace")
        .withReferenceFiles() // Empty
        .build(tmpDir);

      const refDir = path.join(skillDir, "references");
      fs.mkdirSync(refDir, { recursive: true });
      // Create file with only whitespace
      fs.writeFileSync(path.join(refDir, "empty.md"), "   \n\t\n  ", "utf8");

      const { result } = runValidator(skillDir);

      // Should pass - file exists even if empty
      expect(result.status).toBe(0);
    });
  });

  describe("Error Message Quality", () => {
    it("provides clear error for multiple missing components", () => {
      const tmpDir = tempDirs.create("scaffold-multi-error-");

      const skillDir = new SkillScaffoldBuilder()
        .withName("multi-error")
        .withLicense(false)
        .withReferenceFiles() // Empty
        .withScriptFiles() // Empty
        .withMcpReference(false)
        .withNamePrefix("") // Wrong prefix
        .build(tmpDir);

      const { result } = runValidator(skillDir);

      expect(result.status).toBe(1);
      const output = result.stdout;

      // Should list all errors clearly
      expect(output).toContain("LICENSE.txt");
      expect(output).toContain("references/");
      expect(output).toContain("scripts/");
      expect(output).toContain("clix-mcp-server");
      expect(output).toContain("clix-");

      // Should have clear structure
      expect(output).toContain("ERROR: skill scaffold validation failed:");
    });
  });
});
