import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const REPO_ROOT = path.resolve(__dirname, "..");
const TMP_TESTS_ROOT = path.join(REPO_ROOT, ".tmp-tests");
const createdTempDirs: string[] = [];

function makeTempDir(): string {
  fs.mkdirSync(TMP_TESTS_ROOT, { recursive: true });
  const dir = fs.mkdtempSync(path.join(TMP_TESTS_ROOT, "clix-agent-skills-"));
  createdTempDirs.push(dir);
  return dir;
}

function writeExecutable(filePath: string, content: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  fs.chmodSync(filePath, 0o755);
}

function runScript(scriptPath: string, cwd: string, env: Record<string, string | undefined>) {
  return spawnSync("bash", [scriptPath], {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    encoding: "utf8",
  });
}

function runScriptWithArgs(
  scriptPath: string,
  cwd: string,
  args: string[],
  env: Record<string, string | undefined>
) {
  return spawnSync("bash", [scriptPath, ...args], {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    encoding: "utf8",
  });
}

function writeFakeNpm(binDir: string) {
  // Allows the installer to pass "npm view ..." without network access.
  writeExecutable(
    path.join(binDir, "npm"),
    `#!/usr/bin/env bash
set -euo pipefail
if [ "\${1:-}" = "view" ]; then
  echo "0.0.0-test"
  exit 0
fi
exit 0
`
  );
}

function writeNodeShim(binDir: string) {
  // Some installer paths run `node <<EOF ...` so we need node present on PATH.
  writeExecutable(
    path.join(binDir, "node"),
    `#!/usr/bin/env bash
exec "${process.execPath}" "$@"
`
  );
}

describe("skills/integration/scripts/install-mcp.sh", () => {
  const scriptPath = path.resolve(
    __dirname,
    "..",
    "skills",
    "integration",
    "scripts",
    "install-mcp.sh"
  );

  afterEach(() => {
    // Keep the workspace clean and avoid accumulating tmp dirs.
    while (createdTempDirs.length) {
      const dir = createdTempDirs.pop()!;
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  });

  it("detects Claude Code CLI first (even if opencode.jsonc exists) and runs `claude mcp add`", () => {
    const tmp = makeTempDir();
    const binDir = path.join(tmp, "bin");
    const homeDir = path.join(tmp, "home");
    const claudeLog = path.join(tmp, "claude.log");

    // Make an opencode.jsonc file in cwd (this previously caused mis-detection).
    fs.writeFileSync(
      path.join(tmp, "opencode.jsonc"),
      `{\n  "$schema": "https://opencode.ai/config.json",\n  "mcp": {}\n}\n`,
      "utf8"
    );

    writeFakeNpm(binDir);
    writeNodeShim(binDir);

    // Fake claude CLI with mcp support.
    writeExecutable(
      path.join(binDir, "claude"),
      `#!/usr/bin/env bash
set -euo pipefail
echo "$@" >> "${claudeLog}"

if [ "\${1:-}" = "mcp" ] && [ "\${2:-}" = "--help" ]; then
  echo "help"
  exit 0
fi

if [ "\${1:-}" = "mcp" ] && [ "\${2:-}" = "list" ]; then
  # No servers configured
  exit 0
fi

if [ "\${1:-}" = "mcp" ] && [ "\${2:-}" = "add" ]; then
  echo "added"
  exit 0
fi

exit 0
`
    );

    const res = runScriptWithArgs(scriptPath, tmp, ["--client", "claude"], {
      HOME: homeDir,
      PATH: `${binDir}:/usr/bin:/bin`,
    });

    expect(res.status).toBe(0);
    expect(fs.existsSync(claudeLog)).toBe(true);
    const log = fs.readFileSync(claudeLog, "utf8");
    expect(log).toMatch(/mcp list/);
    expect(log).toMatch(
      /mcp add --transport stdio clix-mcp-server -- npx -y @clix-so\/clix-mcp-server@latest/
    );
  });

  it("updates opencode.jsonc containing https:// in $schema + comments without JSON.parse failure", () => {
    const tmp = makeTempDir();
    const binDir = path.join(tmp, "bin");
    const homeDir = path.join(tmp, "home");

    writeFakeNpm(binDir);
    writeNodeShim(binDir);

    // Ensure Claude is NOT detected, so OpenCode path is chosen.
    // (No `claude` executable in PATH.)

    const opencodePath = path.join(tmp, "opencode.jsonc");
    fs.writeFileSync(
      opencodePath,
      String.raw`{
  // comment line that must be stripped
  "$schema": "https://opencode.ai/config.json",
  "note": "keep // inside string, and escaped quote: \"ok\"",
  "mcp": {
    /* block comment */
  }
}
`,
      "utf8"
    );

    const res = runScriptWithArgs(scriptPath, tmp, ["--client", "opencode"], {
      HOME: homeDir,
      PATH: `${binDir}:/usr/bin:/bin`,
    });

    expect(res.status).toBe(0);
    const updated = fs.readFileSync(opencodePath, "utf8");
    expect(updated).toMatch(/"clix-mcp-server"/);
    expect(updated).toMatch(
      /"command": \[\s*"npx",\s*"-y",\s*"@clix-so\/clix-mcp-server@latest"\s*\]/
    );
    expect(updated).toMatch(/"enabled": true/);
  });

  it("detects Codex via ~/.codex/config.toml and injects clix-mcp-server entry", () => {
    const tmp = makeTempDir();
    const binDir = path.join(tmp, "bin");
    const homeDir = path.join(tmp, "home");

    writeFakeNpm(binDir);

    const codexPath = path.join(homeDir, ".codex", "config.toml");
    fs.mkdirSync(path.dirname(codexPath), { recursive: true });
    fs.writeFileSync(codexPath, "[mcp_servers]\n", "utf8");

    const res = runScriptWithArgs(scriptPath, tmp, ["--client", "codex"], {
      HOME: homeDir,
      PATH: `${binDir}:/usr/bin:/bin`,
    });

    expect(res.status).toBe(0);
    const updated = fs.readFileSync(codexPath, "utf8");
    expect(updated).toMatch(/\[mcp_servers\."clix-mcp-server"\]/);
    expect(updated).toMatch(/@clix-so\/clix-mcp-server@latest/);
  });

  it("detects Amp via .vscode/settings.json and updates JSONC safely (https:// + comments)", () => {
    const tmp = makeTempDir();
    const binDir = path.join(tmp, "bin");
    const homeDir = path.join(tmp, "home");

    writeFakeNpm(binDir);
    writeNodeShim(binDir);

    fs.mkdirSync(path.join(tmp, ".vscode"), { recursive: true });
    const settingsPath = path.join(tmp, ".vscode", "settings.json");
    fs.writeFileSync(
      settingsPath,
      String.raw`{
  // comment
  "someUrl": "https://example.com/schema",
  "note": "escaped quote: \"ok\" and // inside string",
  "amp.mcpServers": {
    /* block comment */
  }
}
`,
      "utf8"
    );

    const res = runScriptWithArgs(scriptPath, tmp, ["--client", "amp"], {
      HOME: homeDir,
      PATH: `${binDir}:/usr/bin:/bin`,
    });

    expect(res.status).toBe(0);
    const updated = fs.readFileSync(settingsPath, "utf8");
    expect(updated).toMatch(/"amp\.mcpServers"/);
    expect(updated).toMatch(/"clix-mcp-server"/);
    expect(updated).toMatch(/"@clix-so\/clix-mcp-server@latest"/);
  });

  it("detects Cursor via ~/.cursor/mcp.json and writes mcpServers", () => {
    const tmp = makeTempDir();
    const binDir = path.join(tmp, "bin");
    const homeDir = path.join(tmp, "home");

    writeFakeNpm(binDir);
    writeNodeShim(binDir);

    const cursorPath = path.join(homeDir, ".cursor", "mcp.json");
    fs.mkdirSync(path.dirname(cursorPath), { recursive: true });
    fs.writeFileSync(cursorPath, `{"mcpServers": {}}\n`, "utf8");

    const res = runScriptWithArgs(scriptPath, tmp, ["--client", "cursor"], {
      HOME: homeDir,
      PATH: `${binDir}:/usr/bin:/bin`,
    });

    expect(res.status).toBe(0);
    const updated = fs.readFileSync(cursorPath, "utf8");
    expect(updated).toMatch(/"mcpServers"/);
    expect(updated).toMatch(/"clix-mcp-server"/);
  });

  it("treats --client claude as Claude Code and runs `claude mcp add`", () => {
    const tmp = makeTempDir();
    const binDir = path.join(tmp, "bin");
    const homeDir = path.join(tmp, "home");
    const claudeLog = path.join(tmp, "claude.log");

    writeFakeNpm(binDir);
    writeNodeShim(binDir);

    // Fake claude CLI with mcp support.
    writeExecutable(
      path.join(binDir, "claude"),
      `#!/usr/bin/env bash
set -euo pipefail
echo "$@" >> "${claudeLog}"

if [ "\${1:-}" = "mcp" ] && [ "\${2:-}" = "--help" ]; then
  echo "help"
  exit 0
fi

if [ "\${1:-}" = "mcp" ] && [ "\${2:-}" = "list" ]; then
  # No servers configured
  exit 0
fi

if [ "\${1:-}" = "mcp" ] && [ "\${2:-}" = "add" ]; then
  echo "added"
  exit 0
fi

exit 0
`
    );

    const res = runScriptWithArgs(scriptPath, tmp, ["--client", "claude"], {
      HOME: homeDir,
      PATH: `${binDir}:/usr/bin:/bin`,
    });

    expect(res.status).toBe(0);
    expect(fs.existsSync(claudeLog)).toBe(true);
    const log = fs.readFileSync(claudeLog, "utf8");
    expect(log).toMatch(/mcp list/);
    expect(log).toMatch(
      /mcp add --transport stdio clix-mcp-server -- npx -y @clix-so\/clix-mcp-server@latest/
    );
  });

  it("fails safely when multiple clients are detected and no --client is provided (non-interactive)", () => {
    const tmp = makeTempDir();
    const binDir = path.join(tmp, "bin");
    const homeDir = path.join(tmp, "home");

    writeFakeNpm(binDir);
    writeNodeShim(binDir);

    // Make OpenCode detectable
    fs.writeFileSync(
      path.join(tmp, "opencode.jsonc"),
      `{\n  "$schema": "https://opencode.ai/config.json",\n  "mcp": {}\n}\n`,
      "utf8"
    );

    // Make Claude Code detectable too
    writeExecutable(
      path.join(binDir, "claude"),
      `#!/usr/bin/env bash
set -euo pipefail
if [ "\${1:-}" = "mcp" ] && [ "\${2:-}" = "--help" ]; then
  exit 0
fi
exit 0
`
    );

    const res = runScript(scriptPath, tmp, {
      HOME: homeDir,
      PATH: `${binDir}:/usr/bin:/bin`,
    });

    expect(res.status).toBe(2);
    expect((res.stdout || "") + (res.stderr || "")).toMatch(/Multiple MCP clients detected/);
    expect((res.stdout || "") + (res.stderr || "")).toMatch(/--client/);
  });

  describe("Duplicate configuration detection", () => {
    it("warns when clix-mcp-server is already configured in another Gemini location", () => {
      const tmp = makeTempDir();
      const binDir = path.join(tmp, "bin");
      const homeDir = path.join(tmp, "home");

      writeFakeNpm(binDir);
      writeNodeShim(binDir);

      // Create user-level Gemini config with clix-mcp-server
      const userGeminiPath = path.join(homeDir, ".gemini", "settings.json");
      fs.mkdirSync(path.dirname(userGeminiPath), { recursive: true });
      fs.writeFileSync(
        userGeminiPath,
        JSON.stringify({
          mcpServers: {
            "clix-mcp-server": {
              command: "npx",
              args: ["-y", "@clix-so/clix-mcp-server@latest"],
            },
          },
        }),
        "utf8"
      );

      // Create project-level Gemini config without clix-mcp-server
      const projectGeminiPath = path.join(tmp, ".gemini", "settings.json");
      fs.mkdirSync(path.dirname(projectGeminiPath), { recursive: true });
      fs.writeFileSync(projectGeminiPath, JSON.stringify({ mcpServers: {} }), "utf8");

      const res = runScriptWithArgs(scriptPath, tmp, ["--client", "gemini"], {
        HOME: homeDir,
        PATH: `${binDir}:/usr/bin:/bin`,
      });

      expect(res.status).toBe(0);
      const output = (res.stdout || "") + (res.stderr || "");
      expect(output).toMatch(/Found clix-mcp-server in other.*config location/);
      expect(output).toMatch(/\.gemini\/settings\.json/);
    });

    it("warns when clix-mcp-server is already configured in another Cursor location", () => {
      const tmp = makeTempDir();
      const binDir = path.join(tmp, "bin");
      const homeDir = path.join(tmp, "home");

      writeFakeNpm(binDir);
      writeNodeShim(binDir);

      // Create user-level Cursor config with clix-mcp-server
      const userCursorPath = path.join(homeDir, ".cursor", "mcp.json");
      fs.mkdirSync(path.dirname(userCursorPath), { recursive: true });
      fs.writeFileSync(
        userCursorPath,
        JSON.stringify({
          mcpServers: {
            "clix-mcp-server": {
              command: "npx",
              args: ["-y", "@clix-so/clix-mcp-server@latest"],
            },
          },
        }),
        "utf8"
      );

      // Create project-level Cursor config without clix-mcp-server
      const projectCursorPath = path.join(tmp, ".cursor", "mcp.json");
      fs.mkdirSync(path.dirname(projectCursorPath), { recursive: true });
      fs.writeFileSync(projectCursorPath, JSON.stringify({ mcpServers: {} }), "utf8");

      const res = runScriptWithArgs(scriptPath, tmp, ["--client", "cursor"], {
        HOME: homeDir,
        PATH: `${binDir}:/usr/bin:/bin`,
      });

      expect(res.status).toBe(0);
      const output = (res.stdout || "") + (res.stderr || "");
      expect(output).toMatch(/Found clix-mcp-server in other.*config location/);
      expect(output).toMatch(/\.cursor\/mcp\.json/);
    });

    it("warns when clix-mcp-server is configured in multiple Amp/VS Code locations", () => {
      const tmp = makeTempDir();
      const binDir = path.join(tmp, "bin");
      const homeDir = path.join(tmp, "home");

      writeFakeNpm(binDir);
      writeNodeShim(binDir);

      // Create user-level VS Code settings with clix-mcp-server
      const userSettingsPath = path.join(homeDir, ".vscode", "settings.json");
      fs.mkdirSync(path.dirname(userSettingsPath), { recursive: true });
      fs.writeFileSync(
        userSettingsPath,
        JSON.stringify({
          "amp.mcpServers": {
            "clix-mcp-server": {
              command: "npx",
              args: ["-y", "@clix-so/clix-mcp-server@latest"],
            },
          },
        }),
        "utf8"
      );

      // Create project-level VS Code settings without clix-mcp-server
      const projectSettingsPath = path.join(tmp, ".vscode", "settings.json");
      fs.mkdirSync(path.dirname(projectSettingsPath), { recursive: true });
      fs.writeFileSync(
        projectSettingsPath,
        JSON.stringify({ "amp.mcpServers": {} }),
        "utf8"
      );

      const res = runScriptWithArgs(scriptPath, tmp, ["--client", "amp"], {
        HOME: homeDir,
        PATH: `${binDir}:/usr/bin:/bin`,
      });

      expect(res.status).toBe(0);
      const output = (res.stdout || "") + (res.stderr || "");
      expect(output).toMatch(/Found clix-mcp-server in other.*config location/);
      expect(output).toMatch(/\.vscode\/settings\.json/);
    });

    it("does not warn when clix-mcp-server is only in the target config", () => {
      const tmp = makeTempDir();
      const binDir = path.join(tmp, "bin");
      const homeDir = path.join(tmp, "home");

      writeFakeNpm(binDir);
      writeNodeShim(binDir);

      // Create only user-level Gemini config with clix-mcp-server
      const userGeminiPath = path.join(homeDir, ".gemini", "settings.json");
      fs.mkdirSync(path.dirname(userGeminiPath), { recursive: true });
      fs.writeFileSync(
        userGeminiPath,
        JSON.stringify({
          mcpServers: {
            "clix-mcp-server": {
              command: "npx",
              args: ["-y", "@clix-so/clix-mcp-server@latest"],
            },
          },
        }),
        "utf8"
      );

      const res = runScriptWithArgs(scriptPath, tmp, ["--client", "gemini"], {
        HOME: homeDir,
        PATH: `${binDir}:/usr/bin:/bin`,
      });

      expect(res.status).toBe(0);
      const output = (res.stdout || "") + (res.stderr || "");
      expect(output).toMatch(/already configured/);
      expect(output).not.toMatch(/Found clix-mcp-server in other.*config location/);
    });

    it("still configures target location even when found elsewhere", () => {
      const tmp = makeTempDir();
      const binDir = path.join(tmp, "bin");
      const homeDir = path.join(tmp, "home");

      writeFakeNpm(binDir);
      writeNodeShim(binDir);

      // Create user-level config with clix-mcp-server
      const userCursorPath = path.join(homeDir, ".cursor", "mcp.json");
      fs.mkdirSync(path.dirname(userCursorPath), { recursive: true });
      fs.writeFileSync(
        userCursorPath,
        JSON.stringify({
          mcpServers: {
            "clix-mcp-server": {
              command: "npx",
              args: ["-y", "@clix-so/clix-mcp-server@latest"],
            },
          },
        }),
        "utf8"
      );

      // Create project-level config without it
      const projectCursorPath = path.join(tmp, ".cursor", "mcp.json");
      fs.mkdirSync(path.dirname(projectCursorPath), { recursive: true });
      fs.writeFileSync(projectCursorPath, JSON.stringify({ mcpServers: {} }), "utf8");

      const res = runScriptWithArgs(scriptPath, tmp, ["--client", "cursor"], {
        HOME: homeDir,
        PATH: `${binDir}:/usr/bin:/bin`,
      });

      expect(res.status).toBe(0);

      // Verify project-level config now has clix-mcp-server
      const updated = fs.readFileSync(projectCursorPath, "utf8");
      expect(updated).toMatch(/"clix-mcp-server"/);
      expect(updated).toMatch(/"@clix-so\/clix-mcp-server@latest"/);
    });
  });
});
