import { configureMCP } from "../src/bin/utils/mcp";
import fs from "fs-extra";
import inquirer from "inquirer";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

jest.mock("fs-extra");
jest.mock("inquirer");
jest.mock("os");
jest.mock("child_process");

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedInquirer = inquirer as jest.Mocked<typeof inquirer>;
const mockedOs = os as jest.Mocked<typeof os>;
const mockedSpawnSync = spawnSync as unknown as jest.Mock;

describe("configureMCP", () => {
  const mockHome = "/mock/home";

  beforeEach(() => {
    jest.clearAllMocks();
    mockedOs.homedir.mockReturnValue(mockHome);
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readJSON.mockResolvedValue({ mcpServers: {} });
    mockedFs.writeJSON.mockResolvedValue(undefined);
    mockedSpawnSync.mockReset();
  });

  it("should prompt for client if not provided", async () => {
    mockedInquirer.prompt.mockResolvedValueOnce({ client: "manual" });

    await configureMCP(undefined);

    expect(mockedInquirer.prompt).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ name: "client" })])
    );
  });

  it("should skip if client is manual", async () => {
    await configureMCP("manual");
    expect(mockedFs.readJSON).not.toHaveBeenCalled();
  });

  it("should configure Claude via `claude mcp add` (no config file edits)", async () => {
    mockedSpawnSync
      .mockReturnValueOnce({ status: 0, stdout: "help", stderr: "", error: undefined }) // mcp --help
      .mockReturnValueOnce({ status: 0, stdout: "", stderr: "", error: undefined }) // mcp list
      .mockReturnValueOnce({ status: 0, stdout: "added", stderr: "", error: undefined }); // mcp add

    await configureMCP("claude");

    expect(mockedFs.writeJSON).not.toHaveBeenCalled();
    expect(mockedFs.readJSON).not.toHaveBeenCalled();

    expect(mockedSpawnSync).toHaveBeenNthCalledWith(
      1,
      "claude",
      ["mcp", "--help"],
      expect.objectContaining({ encoding: "utf8" })
    );
    expect(mockedSpawnSync).toHaveBeenNthCalledWith(
      2,
      "claude",
      ["mcp", "list"],
      expect.objectContaining({ encoding: "utf8" })
    );
    expect(mockedSpawnSync).toHaveBeenNthCalledWith(
      3,
      "claude",
      [
        "mcp",
        "add",
        "--transport",
        "stdio",
        "clix-mcp-server",
        "--",
        "npx",
        "-y",
        "@clix-so/clix-mcp-server@latest",
      ],
      expect.objectContaining({ encoding: "utf8" })
    );
  });

  it("should skip Claude configuration when already present", async () => {
    mockedSpawnSync
      .mockReturnValueOnce({ status: 0, stdout: "help", stderr: "", error: undefined }) // mcp --help
      .mockReturnValueOnce({
        status: 0,
        stdout: "clix-mcp-server",
        stderr: "",
        error: undefined,
      }); // mcp list contains server

    await configureMCP("claude");

    // help + list only; no add
    expect(mockedSpawnSync).toHaveBeenCalledTimes(2);
  });

  it("should treat claude-code as an alias for claude", async () => {
    mockedSpawnSync
      .mockReturnValueOnce({ status: 0, stdout: "help", stderr: "", error: undefined }) // mcp --help
      .mockReturnValueOnce({ status: 0, stdout: "", stderr: "", error: undefined }) // mcp list
      .mockReturnValueOnce({ status: 0, stdout: "added", stderr: "", error: undefined }); // mcp add

    await configureMCP("claude-code");

    expect(mockedFs.writeJSON).not.toHaveBeenCalled();
    expect(mockedSpawnSync).toHaveBeenNthCalledWith(
      1,
      "claude",
      ["mcp", "--help"],
      expect.objectContaining({ encoding: "utf8" })
    );
  });

  it("should prompt to create file if missing", async () => {
    mockedFs.existsSync.mockReturnValue(false);
    mockedInquirer.prompt.mockResolvedValueOnce({ create: true }); // respond to create prompt
    mockedInquirer.prompt.mockResolvedValueOnce({ inject: true }); // respond to inject prompt

    await configureMCP("vscode");

    // Should ensure directory exists
    expect(mockedFs.ensureDir).toHaveBeenCalled();
    // Should write empty config first, then update it
    expect(mockedFs.writeJSON).toHaveBeenCalledTimes(2);
  });

  it("should always use global config for Cursor (MCP is always global)", async () => {
    const globalPath = path.join(mockHome, ".cursor/mcp.json");
    mockedFs.existsSync.mockImplementation((p) => {
      if (p === globalPath) return true;
      return false;
    });

    // Mock prompt response to avoid crash
    mockedInquirer.prompt.mockResolvedValueOnce({ inject: false });

    await configureMCP("cursor");

    // Should always use global path, never project path
    expect(mockedFs.readJSON).toHaveBeenCalledWith(globalPath);
    expect(mockedFs.readJSON).not.toHaveBeenCalledWith(
      path.join(process.cwd(), ".cursor/mcp.json")
    );
  });

  it("should not inject if already present", async () => {
    mockedFs.readJSON.mockResolvedValue({
      mcpServers: { "clix-mcp-server": { command: "test" } },
    });

    await configureMCP("cursor");

    expect(mockedInquirer.prompt).not.toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ name: "inject" })])
    );
    expect(mockedFs.writeJSON).not.toHaveBeenCalled();
  });

  it("should skip configuration when config path cannot be determined", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    // Use a client that returns null from getConfigPath (e.g., unknown client)
    await configureMCP("unknown-client");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Could not determine config path/)
    );
    expect(mockedFs.readJSON).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should skip configuration when user declines to create file", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    mockedFs.existsSync.mockReturnValue(false);
    mockedInquirer.prompt.mockResolvedValueOnce({ create: false });

    await configureMCP("vscode");

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Skipping MCP configuration/));
    expect(mockedFs.writeJSON).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should handle error when creating config file fails", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    mockedFs.existsSync.mockReturnValue(false);
    mockedInquirer.prompt.mockResolvedValueOnce({ create: true });
    (mockedFs.ensureDir as unknown as jest.Mock).mockRejectedValueOnce(
      new Error("Permission denied")
    );

    await configureMCP("vscode");

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Failed to create config file/));

    consoleSpy.mockRestore();
  });

  it("should handle error when parsing config JSON fails", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    mockedFs.readJSON.mockRejectedValueOnce(new Error("Invalid JSON"));

    await configureMCP("cursor");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Failed to parse existing config JSON/)
    );
    expect(mockedInquirer.prompt).not.toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ name: "inject" })])
    );

    consoleSpy.mockRestore();
  });

  it("should return null for unknown client", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    await configureMCP("unknown-client");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Could not determine config path/)
    );

    consoleSpy.mockRestore();
  });

  it("should not inject if user declines", async () => {
    mockedInquirer.prompt.mockResolvedValueOnce({ inject: false });

    await configureMCP("cursor");

    expect(mockedFs.writeJSON).not.toHaveBeenCalled();
  });

  it("should handle config without mcpServers property", async () => {
    mockedFs.readJSON.mockResolvedValue({});
    mockedInquirer.prompt.mockResolvedValueOnce({ inject: true });

    await configureMCP("cursor");

    expect(mockedFs.writeJSON).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        mcpServers: expect.objectContaining({
          "clix-mcp-server": expect.anything(),
        }),
      }),
      expect.anything()
    );
  });

  // New client tests

  it("should configure Amp with amp.mcpServers key", async () => {
    mockedInquirer.prompt.mockResolvedValueOnce({ inject: true });

    await configureMCP("amp");

    expect(mockedFs.writeJSON).toHaveBeenCalledWith(
      expect.stringMatching(/\.config[\\\/]amp[\\\/]settings\.json/),
      expect.objectContaining({
        "amp.mcpServers": expect.objectContaining({
          "clix-mcp-server": expect.anything(),
        }),
      }),
      expect.anything()
    );
  });

  it("should configure Kiro with global config (MCP is always global)", async () => {
    const globalPath = path.join(mockHome, ".kiro/settings/mcp.json");
    mockedInquirer.prompt.mockResolvedValueOnce({ inject: true });

    await configureMCP("kiro");

    // Should use global path in home directory, not project path
    expect(mockedFs.writeJSON).toHaveBeenCalledWith(
      globalPath,
      expect.objectContaining({
        mcpServers: expect.objectContaining({
          "clix-mcp-server": expect.anything(),
        }),
      }),
      expect.anything()
    );
    // Should not use project path
    expect(mockedFs.writeJSON).not.toHaveBeenCalledWith(
      expect.stringContaining(process.cwd()),
      expect.anything(),
      expect.anything()
    );
  });

  it("should configure Amazon Q with home directory config", async () => {
    mockedInquirer.prompt.mockResolvedValueOnce({ inject: true });

    await configureMCP("amazonq");

    expect(mockedFs.writeJSON).toHaveBeenCalledWith(
      expect.stringMatching(/\.aws[\\\/]amazonq[\\\/]agents[\\\/]default\.json/),
      expect.objectContaining({
        mcpServers: expect.objectContaining({
          "clix-mcp-server": expect.anything(),
        }),
      }),
      expect.anything()
    );
  });

  it("should auto-configure Codex with TOML format", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    (mockedFs.readFile as unknown as jest.Mock).mockResolvedValue("[mcp_servers]\n");
    (mockedFs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);
    mockedInquirer.prompt.mockResolvedValueOnce({ inject: true });

    await configureMCP("codex");

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/~\/\.codex\/config\.toml/));
    expect(mockedFs.writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/config\.toml/),
      expect.stringContaining("clix-mcp-server"),
      "utf-8"
    );

    consoleSpy.mockRestore();
  });

  it("should auto-configure OpenCode with custom JSON format", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();
    mockedFs.readJSON.mockResolvedValue({ $schema: "https://opencode.ai/config.json", mcp: {} });
    mockedInquirer.prompt.mockResolvedValueOnce({ inject: true });

    await configureMCP("opencode");

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/opencode\.json/));
    expect(mockedFs.writeJSON).toHaveBeenCalledWith(
      expect.stringMatching(/opencode\.json/),
      expect.objectContaining({
        mcp: expect.objectContaining({
          "clix-mcp-server": expect.objectContaining({
            type: "local",
            enabled: true,
          }),
        }),
      }),
      expect.anything()
    );

    consoleSpy.mockRestore();
  });

  it("should create empty Amp config with amp.mcpServers key when file missing", async () => {
    mockedFs.existsSync.mockReturnValue(false);
    mockedInquirer.prompt.mockResolvedValueOnce({ create: true });
    mockedInquirer.prompt.mockResolvedValueOnce({ inject: true });

    await configureMCP("amp");

    // First call should create empty config with amp.mcpServers
    expect(mockedFs.writeJSON).toHaveBeenCalledWith(
      expect.stringMatching(/settings\.json/),
      expect.objectContaining({ "amp.mcpServers": {} }),
      expect.anything()
    );
  });

  it("should handle Amp config with existing amp.mcpServers containing clix-mcp-server", async () => {
    mockedFs.readJSON.mockResolvedValue({
      "amp.mcpServers": { "clix-mcp-server": { command: "test" } },
    });

    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    await configureMCP("amp");

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/already configured/));
    expect(mockedFs.writeJSON).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  // ============================================================================
  // Codex TOML Edge Cases
  // ============================================================================

  describe("Codex TOML configuration", () => {
    it("should create new Codex config file when not exists and user confirms", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      mockedFs.existsSync.mockReturnValue(false);
      (mockedFs.ensureDir as unknown as jest.Mock).mockResolvedValue(undefined);
      (mockedFs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);
      mockedInquirer.prompt.mockResolvedValueOnce({ create: true });
      mockedInquirer.prompt.mockResolvedValueOnce({ inject: true });

      await configureMCP("codex");

      expect(mockedFs.ensureDir).toHaveBeenCalled();
      expect(mockedFs.writeFile).toHaveBeenCalledTimes(2); // Create + inject
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Created config file/));

      consoleSpy.mockRestore();
    });

    it("should skip Codex config when user declines to create file", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      mockedFs.existsSync.mockReturnValue(false);
      mockedInquirer.prompt.mockResolvedValueOnce({ create: false });

      await configureMCP("codex");

      expect(mockedFs.writeFile).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Skipping MCP configuration/));

      consoleSpy.mockRestore();
    });

    it("should handle error when creating Codex config file fails", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      mockedFs.existsSync.mockReturnValue(false);
      mockedInquirer.prompt.mockResolvedValueOnce({ create: true });
      (mockedFs.ensureDir as unknown as jest.Mock).mockRejectedValueOnce(
        new Error("Permission denied")
      );

      await configureMCP("codex");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to create config file/)
      );

      consoleSpy.mockRestore();
    });

    it("should handle TOML parse error for Codex", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      (mockedFs.readFile as unknown as jest.Mock).mockRejectedValueOnce(new Error("Invalid TOML"));

      await configureMCP("codex");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to parse existing config TOML/)
      );

      consoleSpy.mockRestore();
    });

    it("should initialize mcp_servers when not present in Codex config", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      // Config without mcp_servers key
      (mockedFs.readFile as unknown as jest.Mock).mockResolvedValue("");
      (mockedFs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);
      mockedInquirer.prompt.mockResolvedValueOnce({ inject: true });

      await configureMCP("codex");

      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining("clix-mcp-server"),
        "utf-8"
      );

      consoleSpy.mockRestore();
    });

    it("should skip when Codex already has clix-mcp-server configured", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const tomlContent = `[mcp_servers]
[mcp_servers.clix-mcp-server]
command = "npx"
args = ["-y", "@clix-so/clix-mcp-server@latest"]
`;
      (mockedFs.readFile as unknown as jest.Mock).mockResolvedValue(tomlContent);

      await configureMCP("codex");

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/already configured/));
      expect(mockedFs.writeFile).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should not inject when user declines for Codex", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      (mockedFs.readFile as unknown as jest.Mock).mockResolvedValue("[mcp_servers]\n");
      mockedInquirer.prompt.mockResolvedValueOnce({ inject: false });

      await configureMCP("codex");

      expect(mockedFs.writeFile).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // OpenCode Edge Cases
  // ============================================================================

  describe("OpenCode configuration", () => {
    it("should create new OpenCode config file when not exists and user confirms", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.writeJSON.mockResolvedValue(undefined);
      mockedInquirer.prompt.mockResolvedValueOnce({ create: true });
      mockedInquirer.prompt.mockResolvedValueOnce({ inject: true });

      await configureMCP("opencode");

      // Two calls: first creates empty config, second adds the MCP server
      // Note: Jest captures object references, so both calls show the final mutated state
      expect(mockedFs.writeJSON).toHaveBeenCalledTimes(2);
      expect(mockedFs.writeJSON).toHaveBeenLastCalledWith(
        expect.stringMatching(/opencode\.json/),
        expect.objectContaining({
          $schema: "https://opencode.ai/config.json",
          mcp: expect.objectContaining({
            "clix-mcp-server": expect.anything(),
          }),
        }),
        expect.anything()
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Created config file/));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Added Clix MCP Server/));

      consoleSpy.mockRestore();
    });

    it("should skip OpenCode config when user declines to create file", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      mockedFs.existsSync.mockReturnValue(false);
      mockedInquirer.prompt.mockResolvedValueOnce({ create: false });

      await configureMCP("opencode");

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Skipping MCP configuration/));
      expect(mockedFs.writeJSON).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle error when creating OpenCode config file fails", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      mockedFs.existsSync.mockReturnValue(false);
      mockedInquirer.prompt.mockResolvedValueOnce({ create: true });
      mockedFs.writeJSON.mockRejectedValueOnce(new Error("Permission denied"));

      await configureMCP("opencode");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to create config file/)
      );

      consoleSpy.mockRestore();
    });

    it("should handle JSON parse error for OpenCode", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      mockedFs.readJSON.mockRejectedValueOnce(new Error("Invalid JSON"));

      await configureMCP("opencode");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to parse existing config JSON/)
      );

      consoleSpy.mockRestore();
    });

    it("should initialize mcp when not present in OpenCode config", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      // Config without mcp key
      mockedFs.readJSON.mockResolvedValue({ $schema: "https://opencode.ai/config.json" });
      mockedFs.writeJSON.mockResolvedValue(undefined);
      mockedInquirer.prompt.mockResolvedValueOnce({ inject: true });

      await configureMCP("opencode");

      expect(mockedFs.writeJSON).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          mcp: expect.objectContaining({
            "clix-mcp-server": expect.anything(),
          }),
        }),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });

    it("should skip when OpenCode already has clix-mcp-server configured", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      mockedFs.readJSON.mockResolvedValue({
        $schema: "https://opencode.ai/config.json",
        mcp: {
          "clix-mcp-server": {
            type: "local",
            command: ["npx", "-y", "@clix-so/clix-mcp-server@latest"],
            enabled: true,
          },
        },
      });

      await configureMCP("opencode");

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/already configured/));
      expect(mockedFs.writeJSON).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should not inject when user declines for OpenCode", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      mockedFs.readJSON.mockResolvedValue({ $schema: "https://opencode.ai/config.json", mcp: {} });
      mockedInquirer.prompt.mockResolvedValueOnce({ inject: false });

      await configureMCP("opencode");

      expect(mockedFs.writeJSON).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // Platform-specific Tests
  // ============================================================================

  describe("Platform-specific paths", () => {
    it("should use Windows path for Amp on win32", async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", {
        value: "win32",
        writable: true,
      });

      const mockUserProfile = "C:\\Users\\Test";
      process.env.USERPROFILE = mockUserProfile;

      mockedInquirer.prompt.mockResolvedValueOnce({ inject: false });

      await configureMCP("amp");

      expect(mockedFs.readJSON).toHaveBeenCalledWith(
        expect.stringMatching(/\.config[\\\/]amp[\\\/]settings\.json/)
      );

      Object.defineProperty(process, "platform", {
        value: originalPlatform,
        writable: true,
      });
    });

    it("should handle missing USERPROFILE on Windows for Amp", async () => {
      const originalPlatform = process.platform;
      const originalUserProfile = process.env.USERPROFILE;
      Object.defineProperty(process, "platform", {
        value: "win32",
        writable: true,
      });

      delete process.env.USERPROFILE;

      mockedInquirer.prompt.mockResolvedValueOnce({ inject: false });

      await configureMCP("amp");

      // Should fallback to home directory
      expect(mockedFs.readJSON).toHaveBeenCalledWith(
        expect.stringMatching(/\.config[\\\/]amp[\\\/]settings\.json/)
      );

      Object.defineProperty(process, "platform", {
        value: originalPlatform,
        writable: true,
      });
      if (originalUserProfile) {
        process.env.USERPROFILE = originalUserProfile;
      }
    });

    // Claude is configured via the Claude Code CLI, so it is not platform-path dependent.
  });

  // ============================================================================
  // Error Handling Edge Cases
  // ============================================================================

  describe("Error handling", () => {
    it("should handle non-Error objects in error messages", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      mockedFs.readJSON.mockRejectedValueOnce("string error");

      await configureMCP("cursor");

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/string error/));

      consoleSpy.mockRestore();
    });

    it("should handle Codex writeFile error after successful create", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      mockedFs.existsSync.mockReturnValue(false);
      (mockedFs.ensureDir as unknown as jest.Mock).mockResolvedValue(undefined);
      (mockedFs.writeFile as unknown as jest.Mock).mockRejectedValueOnce(new Error("Write failed"));
      mockedInquirer.prompt.mockResolvedValueOnce({ create: true });

      await configureMCP("codex");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to create config file/)
      );

      consoleSpy.mockRestore();
    });
  });
});
