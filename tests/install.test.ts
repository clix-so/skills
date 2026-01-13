import { installSkill, installAllSkills } from "../src/bin/commands/install";
import fs from "fs-extra";
import path from "path";
import os from "os";
import ora from "ora";
import { configureMCP } from "../src/bin/utils/mcp";

// Mock dependencies
jest.mock("fs-extra");
jest.mock("ora");
jest.mock("os");
jest.mock("../src/bin/utils/mcp");

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedOra = ora as jest.MockedFunction<typeof ora>;
const mockedOs = os as jest.Mocked<typeof os>;
const mockedConfigureMCP = configureMCP as jest.MockedFunction<typeof configureMCP>;

describe("installSkill", () => {
  const mockSpinner = {
    start: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    s: jest.fn(),
  };

  const mockHomeDir = "/mock/home";

  beforeEach(() => {
    jest.clearAllMocks();
    mockedOra.mockReturnValue(mockSpinner as any);
    // Mock os.homedir() to return a consistent test home directory
    (mockedOs.homedir as jest.Mock).mockReturnValue(mockHomeDir);
    // Mock existence of skill
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.ensureDir.mockImplementation(() => Promise.resolve());
    mockedFs.copy.mockImplementation(() => Promise.resolve());
  });

  it("should fall back to CWD skills directory when skill is not found under packageRoot", async () => {
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

    const cwdSkillPath = path.resolve(process.cwd(), "skills", "integration");

    mockedFs.existsSync.mockImplementation((p) => {
      const pathStr = String(p);
      // Short-circuit package root discovery (not central to this test).
      if (pathStr.endsWith(`${path.sep}package.json`)) return true;

      // Pretend skill is missing in the first checked location...
      if (pathStr.includes(`${path.sep}skills${path.sep}integration`)) {
        return pathStr === cwdSkillPath;
      }

      return true;
    });

    await installSkill("integration", {});

    // Should warn about initial path, then proceed using CWD
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringMatching(/trying CWD/i));
    expect(mockedFs.copy).toHaveBeenCalledWith(cwdSkillPath, expect.any(String));

    consoleWarnSpy.mockRestore();
  });

  it("should install to default .clix/skills when no client is specified", async () => {
    await installSkill("integration", {});

    const expectedDest = path.resolve(process.cwd(), ".clix/skills/integration");
    expect(mockedFs.copy).toHaveBeenCalledWith(
      expect.stringContaining("skills/integration"),
      expectedDest
    );
    expect(mockSpinner.succeed).toHaveBeenCalled();
  });

  it("should install to .claude/skills when client is claude", async () => {
    await installSkill("integration", { client: "claude" });

    const expectedDest = path.resolve(process.cwd(), ".claude/skills/integration");
    expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
  });

  it("should install to .claude/skills when client is claude-code", async () => {
    await installSkill("integration", { client: "claude-code" });

    const expectedDest = path.resolve(process.cwd(), ".claude/skills/integration");
    expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
  });

  it("should install to .cursor/skills when client is cursor", async () => {
    await installSkill("integration", { client: "cursor" });

    const expectedDest = path.resolve(process.cwd(), ".cursor/skills/integration");
    expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
  });

  it("should install to .gemini/skills when client is gemini", async () => {
    await installSkill("integration", { client: "gemini" });

    const expectedDest = path.resolve(process.cwd(), ".gemini/skills/integration");
    expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
  });

  it("should install to .opencode/skill when client is opencode", async () => {
    await installSkill("integration", { client: "opencode" });

    const expectedDest = path.resolve(process.cwd(), ".opencode/skill/integration");
    expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
  });

  it("should install to .skills when client is letta", async () => {
    await installSkill("integration", { client: "letta" });

    const expectedDest = path.resolve(process.cwd(), ".skills/integration");
    expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
  });

  it("should install to .github/skills when client is copilot", async () => {
    await installSkill("integration", { client: "copilot" });

    const expectedDest = path.resolve(process.cwd(), ".github/skills/integration");
    expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
  });

  it("should install to .github/skills when client is github", async () => {
    await installSkill("integration", { client: "github" });

    const expectedDest = path.resolve(process.cwd(), ".github/skills/integration");
    expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
  });

  it("should install to .agents/skills when client is goose", async () => {
    await installSkill("integration", { client: "goose" });

    const expectedDest = path.resolve(process.cwd(), ".agents/skills/integration");
    expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
  });

  it("should respect custom --path", async () => {
    await installSkill("integration", { path: "./custom/folder" });

    const expectedDest = path.resolve(process.cwd(), "./custom/folder/integration");
    expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
  });

  it("should handle missing skill gracefully", async () => {
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.readdirSync.mockReturnValue(["existing_skill"] as any);

    await installSkill("missing_skill", {});

    // We verify the fail method was called with an error message containing the skill name.
    // Note: Chalk may add color codes to the actual message.
    expect(mockSpinner.fail).toHaveBeenCalledWith(expect.stringMatching(/missing_skill/));
    expect(mockedFs.copy).not.toHaveBeenCalled();
  });

  it("should attempt to configure MCP", async () => {
    await installSkill("integration", { client: "cursor" });
    expect(mockedConfigureMCP).toHaveBeenCalledWith("cursor");
  });

  it("should attempt to configure MCP for Claude Code when client is claude-code", async () => {
    await installSkill("integration", { client: "claude-code" });
    expect(mockedConfigureMCP).toHaveBeenCalledWith("claude-code");
  });

  it("should handle copy errors gracefully", async () => {
    const copyError = new Error("Copy failed");
    (mockedFs.copy as jest.Mock).mockRejectedValueOnce(copyError);

    await expect(installSkill("integration", {})).rejects.toThrow("Copy failed");
    expect(mockSpinner.fail).toHaveBeenCalledWith(expect.stringContaining("Copy failed"));
  });

  it("should handle MCP configuration errors gracefully", async () => {
    const mcpError = new Error("MCP config failed");
    mockedConfigureMCP.mockRejectedValueOnce(mcpError);

    // Should not throw, just warn
    await installSkill("integration", {});
    expect(mockedConfigureMCP).toHaveBeenCalled();
    // The function should complete successfully despite MCP error
    expect(mockSpinner.succeed).toHaveBeenCalled();
  });

  it("should install to .vscode/skills when client is vscode", async () => {
    await installSkill("integration", { client: "vscode" });

    const expectedDest = path.resolve(process.cwd(), ".vscode/skills/integration");
    expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
  });

  it("should install to .codex/skills when client is codex", async () => {
    await installSkill("integration", { client: "codex" });

    const expectedDest = path.resolve(process.cwd(), ".codex/skills/integration");
    expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
  });

  it("should install to .agents/skills when client is amp", async () => {
    await installSkill("integration", { client: "amp" });

    const expectedDest = path.resolve(process.cwd(), ".agents/skills/integration");
    expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
  });

  it("should install to .kiro/skills when client is kiro", async () => {
    await installSkill("integration", { client: "kiro" });

    const expectedDest = path.resolve(process.cwd(), ".kiro/skills/integration");
    expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
  });

  it("should install to .amazonq/skills when client is amazonq", async () => {
    await installSkill("integration", { client: "amazonq" });

    const expectedDest = path.resolve(process.cwd(), ".amazonq/skills/integration");
    expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
  });

  it("should install to custom path when client starts with dot", async () => {
    await installSkill("integration", { client: ".custom" });

    const expectedDest = path.resolve(process.cwd(), ".custom/skills/integration");
    expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
  });

  it("should fallback to .clix/skills for unknown client", async () => {
    await installSkill("integration", { client: "unknown-client" });

    const expectedDest = path.resolve(process.cwd(), ".clix/skills/integration");
    expect(mockedFs.copy).toHaveBeenCalledWith(expect.any(String), expectedDest);
  });

  it("should show available skills when skill not found but skills dir exists", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    mockedFs.existsSync.mockImplementation((p) => {
      const pathStr = String(p);
      if (pathStr.includes("missing_skill")) return false;
      if (pathStr.includes("skills") && !pathStr.includes("missing_skill")) return true;
      return true;
    });
    mockedFs.readdirSync.mockReturnValue(["integration", "other_skill"] as any);

    await installSkill("missing_skill", {});

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Available skills:.*integration.*other_skill/)
    );
    expect(mockedFs.copy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it("should show skills directory not found message", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    mockedFs.existsSync.mockReturnValue(false);

    await installSkill("missing_skill", {});

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Skills directory not found/));

    consoleSpy.mockRestore();
  });

  it("should handle package root detection when package.json not found", async () => {
    // Mock __dirname to simulate being in a directory without package.json
    mockedFs.existsSync.mockImplementation((p) => {
      const pathStr = String(p);
      if (pathStr.includes("package.json")) return false;
      if (pathStr.includes("integration")) return true;
      return true;
    });

    await installSkill("integration", {});

    // Should still work by falling back to process.cwd()
    expect(mockedFs.copy).toHaveBeenCalled();
  });

  it("should handle non-Error objects in error messages", async () => {
    const nonError = "string error";
    (mockedFs.copy as jest.Mock).mockRejectedValueOnce(nonError);

    await expect(installSkill("integration", {})).rejects.toBe(nonError);
    expect(mockSpinner.fail).toHaveBeenCalledWith(expect.stringContaining("string error"));
  });

  describe("Installation modes: global vs project-level", () => {
    it("should install to project root (default) when global flag is not set", async () => {
      await installSkill("integration", { client: "cursor" });

      // Should install to project directory (process.cwd())
      const expectedDest = path.resolve(process.cwd(), ".cursor/skills/integration");
      expect(mockedFs.copy).toHaveBeenCalledWith(
        expect.stringContaining("skills/integration"),
        expectedDest
      );
      expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining("repo root"));
      expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining(process.cwd()));
    });

    it("should install to system root (global) when global flag is set", async () => {
      await installSkill("integration", { client: "cursor", global: true });

      // Should install to home directory
      const expectedDest = path.resolve(mockHomeDir, ".cursor/skills/integration");
      expect(mockedFs.copy).toHaveBeenCalledWith(
        expect.stringContaining("skills/integration"),
        expectedDest
      );
      expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining("system root"));
      expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining(mockHomeDir));
    });

    it("should install to project root for default client when global is false", async () => {
      await installSkill("integration", { global: false });

      const expectedDest = path.resolve(process.cwd(), ".clix/skills/integration");
      expect(mockedFs.copy).toHaveBeenCalledWith(
        expect.stringContaining("skills/integration"),
        expectedDest
      );
      expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining("repo root"));
    });

    it("should install to system root for multiple clients when global is true", async () => {
      const clients = ["cursor", "claude", "vscode", "amp", "kiro"];

      for (const client of clients) {
        jest.clearAllMocks();
        await installSkill("integration", { client, global: true });

        const expectedDest =
          client === "amp"
            ? path.resolve(mockHomeDir, ".config/agents/skills/integration")
            : path.resolve(mockHomeDir, `.${client}/skills/integration`);
        expect(mockedFs.copy).toHaveBeenCalledWith(
          expect.stringContaining("skills/integration"),
          expectedDest
        );
        expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining("system root"));
      }
    });

    it("should install to project root for multiple clients when global is false", async () => {
      const clients = ["cursor", "claude", "vscode", "amp", "kiro"];

      for (const client of clients) {
        jest.clearAllMocks();
        await installSkill("integration", { client, global: false });

        const expectedDest =
          client === "amp"
            ? path.resolve(process.cwd(), ".agents/skills/integration")
            : path.resolve(process.cwd(), `.${client}/skills/integration`);
        expect(mockedFs.copy).toHaveBeenCalledWith(
          expect.stringContaining("skills/integration"),
          expectedDest
        );
        expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining("repo root"));
      }
    });

    it("should use custom path with project root when global is false", async () => {
      await installSkill("integration", { path: "./custom/skills", global: false });

      const expectedDest = path.resolve(process.cwd(), "./custom/skills/integration");
      expect(mockedFs.copy).toHaveBeenCalledWith(
        expect.stringContaining("skills/integration"),
        expectedDest
      );
      expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining("repo root"));
    });

    it("should use custom path with system root when global is true", async () => {
      await installSkill("integration", { path: "./custom/skills", global: true });

      const expectedDest = path.resolve(mockHomeDir, "./custom/skills/integration");
      expect(mockedFs.copy).toHaveBeenCalledWith(
        expect.stringContaining("skills/integration"),
        expectedDest
      );
      expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining("system root"));
    });

    it("should always configure MCP globally regardless of global flag", async () => {
      // MCP should always be configured globally
      await installSkill("integration", { client: "cursor", global: false });
      expect(mockedConfigureMCP).toHaveBeenCalledWith("cursor");

      jest.clearAllMocks();

      await installSkill("integration", { client: "cursor", global: true });
      expect(mockedConfigureMCP).toHaveBeenCalledWith("cursor");
    });
  });
});

describe("installAllSkills", () => {
  const mockSpinner = {
    start: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
  };

  const mockHomeDir = "/mock/home";

  beforeEach(() => {
    jest.clearAllMocks();
    mockedOra.mockReturnValue(mockSpinner as any);
    (mockedOs.homedir as jest.Mock).mockReturnValue(mockHomeDir);
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.ensureDir.mockImplementation(() => Promise.resolve());
    mockedFs.copy.mockImplementation(() => Promise.resolve());
    (mockedFs.readdir as unknown as jest.Mock).mockResolvedValue([
      { name: "integration", isDirectory: () => true },
      { name: "event-tracking", isDirectory: () => true },
      { name: "user-management", isDirectory: () => true },
    ]);
  });

  it("should fall back to process.cwd() when searching for package.json (covers package root traversal)", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    // Force findAllSkills() package root detection loop to traverse to filesystem root
    // and hit the `parent === packageRoot` break branch.
    mockedFs.existsSync.mockImplementation((p) => {
      const pathStr = String(p);
      if (pathStr.endsWith(`${path.sep}package.json`)) return false;
      return true;
    });

    await installAllSkills({ client: "cursor" });

    // findAllSkills should read from `${process.cwd()}/skills` after fallback
    expect(mockedFs.readdir).toHaveBeenCalledWith(path.join(process.cwd(), "skills"), {
      withFileTypes: true,
    });

    // Should still install skills normally
    expect(mockedFs.copy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should install all available skills successfully", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    await installAllSkills({ client: "cursor" });

    // Should discover skills
    expect(mockSpinner.succeed).toHaveBeenCalledWith(expect.stringContaining("Found"));

    // Should install each skill
    expect(mockedFs.copy).toHaveBeenCalledTimes(3);
    expect(mockedFs.copy).toHaveBeenCalledWith(
      expect.stringContaining("skills/integration"),
      expect.stringContaining(".cursor/skills/integration")
    );
    expect(mockedFs.copy).toHaveBeenCalledWith(
      expect.stringContaining("skills/event-tracking"),
      expect.stringContaining(".cursor/skills/event-tracking")
    );
    expect(mockedFs.copy).toHaveBeenCalledWith(
      expect.stringContaining("skills/user-management"),
      expect.stringContaining(".cursor/skills/user-management")
    );

    // Should show success message
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Successfully installed all"));

    consoleSpy.mockRestore();
  });

  it("should handle partial failures gracefully", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

    // Make second skill fail
    let callCount = 0;
    (mockedFs.copy as jest.Mock).mockImplementation(() => {
      callCount++;
      if (callCount === 2) {
        return Promise.reject(new Error("Copy failed"));
      }
      return Promise.resolve();
    });

    await installAllSkills({ client: "cursor" });

    // Should still install other skills
    expect(mockedFs.copy).toHaveBeenCalledTimes(3);

    // Should show error for failed skill
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Failed to install"));

    // Should show partial success message
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("Installed"));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("failed"));

    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it("should handle no skills found", async () => {
    (mockedFs.readdir as unknown as jest.Mock).mockResolvedValue([]);

    await installAllSkills({ client: "cursor" });

    expect(mockSpinner.fail).toHaveBeenCalledWith("No skills found to install.");
    expect(mockedFs.copy).not.toHaveBeenCalled();
  });

  it("should handle skills directory not existing", async () => {
    mockedFs.existsSync.mockImplementation((p) => {
      const pathStr = String(p);
      if (pathStr.includes("skills") && !pathStr.includes("package.json")) {
        return false;
      }
      return true;
    });

    await installAllSkills({ client: "cursor" });

    expect(mockSpinner.fail).toHaveBeenCalledWith("No skills found to install.");
    expect(mockedFs.copy).not.toHaveBeenCalled();
  });

  it("should filter out directories without SKILL.md", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    (mockedFs.readdir as unknown as jest.Mock).mockResolvedValue([
      { name: "integration", isDirectory: () => true },
      { name: "invalid-skill", isDirectory: () => true }, // No SKILL.md
      { name: "event-tracking", isDirectory: () => true },
    ]);

    // Mock existsSync to return false for invalid-skill/SKILL.md
    mockedFs.existsSync.mockImplementation((p) => {
      const pathStr = String(p);
      if (pathStr.includes("invalid-skill") && pathStr.includes("SKILL.md")) {
        return false;
      }
      return true;
    });

    await installAllSkills({ client: "cursor" });

    // Should only install skills with SKILL.md
    expect(mockedFs.copy).toHaveBeenCalledTimes(2);
    expect(mockedFs.copy).toHaveBeenCalledWith(
      expect.stringContaining("integration"),
      expect.any(String)
    );
    expect(mockedFs.copy).toHaveBeenCalledWith(
      expect.stringContaining("event-tracking"),
      expect.any(String)
    );
    expect(mockedFs.copy).not.toHaveBeenCalledWith(
      expect.stringContaining("invalid-skill"),
      expect.any(String)
    );

    consoleSpy.mockRestore();
  });

  it("should use custom path option for all skills", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    await installAllSkills({ path: "./custom/skills" });

    // All skills should be installed to custom path
    expect(mockedFs.copy).toHaveBeenCalledWith(
      expect.stringContaining("integration"),
      expect.stringContaining("custom/skills/integration")
    );
    expect(mockedFs.copy).toHaveBeenCalledWith(
      expect.stringContaining("event-tracking"),
      expect.stringContaining("custom/skills/event-tracking")
    );
    expect(mockedFs.copy).toHaveBeenCalledWith(
      expect.stringContaining("user-management"),
      expect.stringContaining("custom/skills/user-management")
    );

    consoleSpy.mockRestore();
  });

  it("should use client option for all skills", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    await installAllSkills({ client: "claude" });

    // All skills should be installed to .claude/skills
    expect(mockedFs.copy).toHaveBeenCalledWith(
      expect.stringContaining("integration"),
      expect.stringContaining(".claude/skills/integration")
    );
    expect(mockedFs.copy).toHaveBeenCalledWith(
      expect.stringContaining("event-tracking"),
      expect.stringContaining(".claude/skills/event-tracking")
    );
    expect(mockedFs.copy).toHaveBeenCalledWith(
      expect.stringContaining("user-management"),
      expect.stringContaining(".claude/skills/user-management")
    );

    consoleSpy.mockRestore();
  });

  it("should configure MCP once for installAllSkills (not once per skill)", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    await installAllSkills({ client: "cursor" });

    // MCP should be configured once per `--all` run (not once per skill)
    expect(mockedConfigureMCP).toHaveBeenCalledTimes(1);
    expect(mockedConfigureMCP).toHaveBeenCalledWith("cursor");

    consoleSpy.mockRestore();
  });

  describe("Installation modes: global vs project-level for installAllSkills", () => {
    it("should install all skills to project root when global is not set", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await installAllSkills({ client: "cursor" });

      // All skills should be installed to project directory
      expect(mockedFs.copy).toHaveBeenCalledWith(
        expect.stringContaining("skills/integration"),
        expect.stringContaining(process.cwd())
      );
      expect(mockedFs.copy).toHaveBeenCalledWith(
        expect.stringContaining("skills/event-tracking"),
        expect.stringContaining(process.cwd())
      );
      expect(mockedFs.copy).toHaveBeenCalledWith(
        expect.stringContaining("skills/user-management"),
        expect.stringContaining(process.cwd())
      );

      // Should not use home directory
      expect(mockedFs.copy).not.toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(mockHomeDir)
      );

      consoleSpy.mockRestore();
    });

    it("should install all skills to system root when global is true", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await installAllSkills({ client: "cursor", global: true });

      // All skills should be installed to home directory
      expect(mockedFs.copy).toHaveBeenCalledWith(
        expect.stringContaining("skills/integration"),
        expect.stringContaining(mockHomeDir)
      );
      expect(mockedFs.copy).toHaveBeenCalledWith(
        expect.stringContaining("skills/event-tracking"),
        expect.stringContaining(mockHomeDir)
      );
      expect(mockedFs.copy).toHaveBeenCalledWith(
        expect.stringContaining("skills/user-management"),
        expect.stringContaining(mockHomeDir)
      );

      // Should not use project directory
      expect(mockedFs.copy).not.toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(process.cwd())
      );

      consoleSpy.mockRestore();
    });

    it("should install all skills to project root when global is false", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await installAllSkills({ client: "claude", global: false });

      // All skills should be installed to project directory
      expect(mockedFs.copy).toHaveBeenCalledWith(
        expect.stringContaining("skills/integration"),
        path.resolve(process.cwd(), ".claude/skills/integration")
      );
      expect(mockedFs.copy).toHaveBeenCalledWith(
        expect.stringContaining("skills/event-tracking"),
        path.resolve(process.cwd(), ".claude/skills/event-tracking")
      );
      expect(mockedFs.copy).toHaveBeenCalledWith(
        expect.stringContaining("skills/user-management"),
        path.resolve(process.cwd(), ".claude/skills/user-management")
      );

      consoleSpy.mockRestore();
    });

    it("should always configure MCP globally for installAllSkills regardless of global flag", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      // Test with global: false
      await installAllSkills({ client: "cursor", global: false });
      expect(mockedConfigureMCP).toHaveBeenCalledWith("cursor");

      jest.clearAllMocks();

      // Test with global: true
      await installAllSkills({ client: "cursor", global: true });
      expect(mockedConfigureMCP).toHaveBeenCalledWith("cursor");

      consoleSpy.mockRestore();
    });
  });
});
