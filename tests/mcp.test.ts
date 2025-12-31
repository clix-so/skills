import { configureMCP } from "../src/bin/utils/mcp";
import fs from "fs-extra";
import inquirer from "inquirer";
import os from "os";
import path from "path";

jest.mock("fs-extra");
jest.mock("inquirer");
jest.mock("os");

const mockedFs = fs as jest.Mocked<typeof fs> & {
  readFile: jest.MockedFunction<typeof fs.readFile>;
  writeFile: jest.MockedFunction<typeof fs.writeFile>;
};
const mockedInquirer = inquirer as jest.Mocked<typeof inquirer>;
const mockedOs = os as jest.Mocked<typeof os>;

describe("configureMCP", () => {
  const mockHome = "/mock/home";

  beforeEach(() => {
    jest.clearAllMocks();
    mockedOs.homedir.mockReturnValue(mockHome);
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readJSON.mockResolvedValue({ mcpServers: {} });
    mockedFs.writeJSON.mockResolvedValue(undefined);
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

  it("should inject config if confirmed", async () => {
    mockedInquirer.prompt.mockResolvedValueOnce({ inject: true });

    await configureMCP("claude");

    expect(mockedFs.writeJSON).toHaveBeenCalledWith(
      expect.stringContaining("claude_desktop_config.json"),
      expect.objectContaining({
        mcpServers: expect.objectContaining({
          "clix-mcp-server": expect.anything(),
        }),
      }),
      expect.anything()
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

  it("should prioritize project-level config for Cursor", async () => {
    const projectPath = path.join(process.cwd(), ".cursor/mcp.json");
    mockedFs.existsSync.mockImplementation((p) => {
      if (p === projectPath) return true;
      return false;
    });

    // Mock prompt response to avoid crash
    mockedInquirer.prompt.mockResolvedValueOnce({ inject: false });

    await configureMCP("cursor");

    // Should attempt to read from project path
    expect(mockedFs.readJSON).toHaveBeenCalledWith(projectPath);
  });

  it("should fallback to global config for Cursor if project-level missing", async () => {
    const globalPath = path.join(mockHome, ".cursor/mcp.json");
    mockedFs.existsSync.mockImplementation((p) => {
      if (p === path.join(process.cwd(), ".cursor/mcp.json")) return false; // Project missing
      if (p === globalPath) return true; // Global exists
      return false;
    });
    // We also need to mock readJSON success for the global file to proceed to existence check
    mockedFs.readJSON.mockResolvedValue({ mcpServers: {} });

    // Mock prompt response to avoid crash
    mockedInquirer.prompt.mockResolvedValueOnce({ inject: false });

    await configureMCP("cursor");

    expect(mockedFs.readJSON).toHaveBeenCalledWith(globalPath);
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
    (mockedFs.ensureDir as jest.Mock).mockRejectedValueOnce(new Error("Permission denied"));

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

  it("should use Windows path for Claude Desktop on win32", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", {
      value: "win32",
      writable: true,
    });

    const mockAppData = "C:\\Users\\Test\\AppData\\Roaming";
    process.env.APPDATA = mockAppData;

    mockedInquirer.prompt.mockResolvedValueOnce({ inject: false });

    await configureMCP("claude");

    expect(mockedFs.readJSON).toHaveBeenCalledWith(
      expect.stringMatching(/Claude[\\\/]claude_desktop_config\.json/)
    );

    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      writable: true,
    });
  });

  it("should use Linux path for Claude Desktop on linux", async () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", {
      value: "linux",
      writable: true,
    });

    mockedInquirer.prompt.mockResolvedValueOnce({ inject: false });

    await configureMCP("claude");

    expect(mockedFs.readJSON).toHaveBeenCalledWith(
      expect.stringMatching(/\.config[\\\/]Claude[\\\/]claude_desktop_config\.json/)
    );

    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      writable: true,
    });
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

  it("should configure Kiro with project-level config", async () => {
    mockedInquirer.prompt.mockResolvedValueOnce({ inject: true });

    await configureMCP("kiro");

    expect(mockedFs.writeJSON).toHaveBeenCalledWith(
      expect.stringMatching(/\.kiro[\\\/]settings[\\\/]mcp\.json/),
      expect.objectContaining({
        mcpServers: expect.objectContaining({
          "clix-mcp-server": expect.anything(),
        }),
      }),
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
    mockedFs.readFile.mockResolvedValue("[mcp_servers]\n" as never);
    mockedFs.writeFile.mockResolvedValue(undefined as never);
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
});
