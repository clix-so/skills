import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const tempDirs: string[] = [];

function createSkillFolder(tmpDir: string, pathSegments: string[]): string {
  const fullPath = path.join(tmpDir, ...pathSegments);
  fs.mkdirSync(fullPath, { recursive: true });

  // Create a minimal SKILL.md to make it look like a skill folder
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
  });

  return { result, skillDir, scriptPath };
}

describe("validate-skill-location.sh", () => {
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

  describe("repo mode", () => {
    it("passes when skill is in skills/ directory", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-loc-"));
      tempDirs.push(tmpDir);

      const skillDir = createSkillFolder(tmpDir, ["skills", "test-skill"]);
      const { result } = runValidator(skillDir, ["--mode", "repo"]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("✅ skill location looks OK (repo)");
    });

    it("fails when skill is NOT in skills/ directory", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-loc-"));
      tempDirs.push(tmpDir);

      const skillDir = createSkillFolder(tmpDir, ["src", "test-skill"]);
      const { result } = runValidator(skillDir, ["--mode", "repo"]);

      expect(result.status).toBe(1);
      expect(result.stdout || result.stderr).toContain("❌ Invalid location:");
      expect(result.stdout || result.stderr).toContain(
        "expected skill folder under 'skills/<name>/'"
      );
    });

    it("fails when skill is at root level", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-loc-"));
      tempDirs.push(tmpDir);

      const skillDir = createSkillFolder(tmpDir, ["test-skill"]);
      const { result } = runValidator(skillDir, ["--mode", "repo"]);

      expect(result.status).toBe(1);
      expect(result.stdout || result.stderr).toContain("❌ Invalid location:");
    });
  });

  describe("client mode", () => {
    it("passes when skill is in client skills/ directory", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-loc-"));
      tempDirs.push(tmpDir);

      const skillDir = createSkillFolder(tmpDir, [".cursor", "skills", "test-skill"]);
      const { result } = runValidator(skillDir, ["--mode", "client"]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("✅ skill location looks OK (client)");
    });

    it("passes when skill is in client skill/ directory (OpenCode)", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-loc-"));
      tempDirs.push(tmpDir);

      const skillDir = createSkillFolder(tmpDir, [".opencode", "skill", "test-skill"]);
      const { result } = runValidator(skillDir, ["--mode", "client"]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("✅ skill location looks OK (client)");
    });

    it("fails when skill is NOT in skills/ or skill/ directory", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-loc-"));
      tempDirs.push(tmpDir);

      const skillDir = createSkillFolder(tmpDir, [".cursor", "plugins", "test-skill"]);
      const { result } = runValidator(skillDir, ["--mode", "client"]);

      expect(result.status).toBe(1);
      expect(result.stdout || result.stderr).toContain("❌ Invalid location:");
      expect(result.stdout || result.stderr).toContain(
        "expected skill folder under '<client>/(skills|skill)/<name>/'"
      );
    });
  });

  describe("client mode with --client flag", () => {
    it("passes for Cursor skill in .cursor/skills/", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-loc-"));
      tempDirs.push(tmpDir);

      const skillDir = createSkillFolder(tmpDir, [".cursor", "skills", "test-skill"]);
      const { result } = runValidator(skillDir, ["--mode", "client", "--client", "cursor"]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("✅ skill location looks OK (client)");
    });

    it("fails for Cursor skill NOT in .cursor/skills/", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-loc-"));
      tempDirs.push(tmpDir);

      const skillDir = createSkillFolder(tmpDir, [".vscode", "skills", "test-skill"]);
      const { result } = runValidator(skillDir, ["--mode", "client", "--client", "cursor"]);

      expect(result.status).toBe(1);
      expect(result.stdout || result.stderr).toContain(
        "❌ Expected Cursor skill path to include '.cursor/skills/'"
      );
    });

    it("passes for Claude skill in .claude/skills/", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-loc-"));
      tempDirs.push(tmpDir);

      const skillDir = createSkillFolder(tmpDir, [".claude", "skills", "test-skill"]);
      const { result } = runValidator(skillDir, ["--mode", "client", "--client", "claude"]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("✅ skill location looks OK (client)");
    });

    it("passes for Claude Code skill in .claude/skills/", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-loc-"));
      tempDirs.push(tmpDir);

      const skillDir = createSkillFolder(tmpDir, [".claude", "skills", "test-skill"]);
      const { result } = runValidator(skillDir, ["--mode", "client", "--client", "claude-code"]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("✅ skill location looks OK (client)");
    });

    it("passes for Codex skill in .codex/skills/", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-loc-"));
      tempDirs.push(tmpDir);

      const skillDir = createSkillFolder(tmpDir, [".codex", "skills", "test-skill"]);
      const { result } = runValidator(skillDir, ["--mode", "client", "--client", "codex"]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("✅ skill location looks OK (client)");
    });

    it("passes for OpenCode skill in .opencode/skill/", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-loc-"));
      tempDirs.push(tmpDir);

      const skillDir = createSkillFolder(tmpDir, [".opencode", "skill", "test-skill"]);
      const { result } = runValidator(skillDir, ["--mode", "client", "--client", "opencode"]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("✅ skill location looks OK (client)");
    });

    it("passes for VS Code skill in .vscode/skills/", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-loc-"));
      tempDirs.push(tmpDir);

      const skillDir = createSkillFolder(tmpDir, [".vscode", "skills", "test-skill"]);
      const { result } = runValidator(skillDir, ["--mode", "client", "--client", "vscode"]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("✅ skill location looks OK (client)");
    });

    it("passes for Amp skill in .amp/skills/", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-loc-"));
      tempDirs.push(tmpDir);

      const skillDir = createSkillFolder(tmpDir, [".amp", "skills", "test-skill"]);
      const { result } = runValidator(skillDir, ["--mode", "client", "--client", "amp"]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("✅ skill location looks OK (client)");
    });

    it("passes for unknown client (skips strict check)", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-loc-"));
      tempDirs.push(tmpDir);

      const skillDir = createSkillFolder(tmpDir, [".unknown", "skills", "test-skill"]);
      const { result } = runValidator(skillDir, ["--mode", "client", "--client", "unknown"]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("✅ skill location looks OK (client)");
    });
  });

  describe("error handling", () => {
    it("fails when skill directory does not exist", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-loc-"));
      tempDirs.push(tmpDir);

      const nonExistentDir = path.join(tmpDir, "does-not-exist");
      const { result } = runValidator(nonExistentDir);

      expect(result.status).toBe(2);
      expect(result.stderr).toContain("directory not found");
    });

    it("fails when no arguments provided", () => {
      const scriptPath = path.resolve(
        __dirname,
        "..",
        "skills",
        "skill-creator",
        "scripts",
        "validate-skill-location.sh"
      );

      const result = spawnSync("bash", [scriptPath], {
        encoding: "utf8",
      });

      expect(result.status).toBe(2);
      expect(result.stderr).toContain("missing <skill-folder> argument");
    });

    it("fails when mode is invalid", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-loc-"));
      tempDirs.push(tmpDir);

      const skillDir = createSkillFolder(tmpDir, ["skills", "test-skill"]);
      const { result } = runValidator(skillDir, ["--mode", "invalid"]);

      expect(result.status).toBe(2);
      expect(result.stderr).toContain("--mode must be 'repo' or 'client'");
    });

    it("shows help when --help flag is provided", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-loc-"));
      tempDirs.push(tmpDir);

      const scriptPath = path.resolve(
        __dirname,
        "..",
        "skills",
        "skill-creator",
        "scripts",
        "validate-skill-location.sh"
      );

      // Create a dummy directory for help to work
      const dummyDir = path.join(tmpDir, "dummy");
      fs.mkdirSync(dummyDir);

      const result = spawnSync("bash", [scriptPath, dummyDir, "--help"], {
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Validate skill folder location");
      expect(result.stdout).toContain("Usage:");
      expect(result.stdout).toContain("Examples:");
    });
  });

  describe("default mode", () => {
    it("defaults to repo mode when --mode not specified", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-loc-"));
      tempDirs.push(tmpDir);

      const skillDir = createSkillFolder(tmpDir, ["skills", "test-skill"]);
      const { result } = runValidator(skillDir); // No --mode flag

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("✅ skill location looks OK (repo)");
    });
  });
});
