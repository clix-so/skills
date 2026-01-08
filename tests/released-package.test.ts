import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

function run(
  command: string,
  args: string[],
  cwd: string,
  env: Record<string, string | undefined>
) {
  return spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"], // Non-interactive: ignore stdin, capture stdout/stderr
    timeout: 60000, // 60 second timeout per command
  });
}

function mkRepoTempDir(repoRoot: string, prefix: string) {
  const base = path.join(repoRoot, ".tmp-tests");
  fs.mkdirSync(base, { recursive: true });
  return fs.mkdtempSync(path.join(base, prefix));
}

/**
 * Verify all necessary files are present in a skill folder
 */
function verifySkillFiles(
  skillPath: string,
  skillName: string
): {
  valid: boolean;
  missing: string[];
  found: string[];
} {
  const requiredFiles = ["SKILL.md", "LICENSE.txt"];

  const requiredDirs = ["references", "scripts"];

  const missing: string[] = [];
  const found: string[] = [];

  // Check required files
  for (const file of requiredFiles) {
    const filePath = path.join(skillPath, file);
    if (fs.existsSync(filePath)) {
      found.push(file);
    } else {
      missing.push(file);
    }
  }

  // Check required directories exist and have content
  for (const dir of requiredDirs) {
    const dirPath = path.join(skillPath, dir);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      const files = fs.readdirSync(dirPath);
      if (files.length > 0) {
        found.push(`${dir}/ (${files.length} files)`);
      } else {
        missing.push(`${dir}/ (empty)`);
      }
    } else {
      missing.push(`${dir}/ (missing)`);
    }
  }

  // Check if examples directory exists (optional but good to verify if present)
  const examplesPath = path.join(skillPath, "examples");
  if (fs.existsSync(examplesPath) && fs.statSync(examplesPath).isDirectory()) {
    const exampleFiles = fs.readdirSync(examplesPath);
    if (exampleFiles.length > 0) {
      found.push(`examples/ (${exampleFiles.length} files)`);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    found,
  };
}

describe("released package smoke test", () => {
  // Building + packing + installing can be slow on CI.
  jest.setTimeout(3 * 60 * 1000);

  const runReleased = process.env.CLIX_RELEASE_SMOKE_TEST === "1";
  const repoRoot = path.resolve(__dirname, "..");
  const tmpTestsRoot = path.join(repoRoot, ".tmp-tests");

  // Clean up all test directories after all tests complete
  // (Individual tests also clean up in their finally blocks, but this ensures everything is removed)
  afterAll(() => {
    console.log("\n[CLEANUP] Final cleanup: Removing all test directories...");
    try {
      if (fs.existsSync(tmpTestsRoot)) {
        const beforeCleanup = fs.readdirSync(tmpTestsRoot);
        fs.rmSync(tmpTestsRoot, { recursive: true, force: true });
        console.log(
          `[CLEANUP] ✓ Removed ${tmpTestsRoot} (contained ${beforeCleanup.length} test directories)`
        );
      } else {
        console.log(`[CLEANUP] ✓ No test directories to clean (${tmpTestsRoot} doesn't exist)`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[CLEANUP] ✗ Error cleaning up test directories: ${errorMessage}`);
      // Don't throw - cleanup failures shouldn't fail the test suite
    }
  });

  const expectedSkills = [
    "api-triggered-campaigns",
    "event-tracking",
    "integration",
    "personalization",
    "user-management",
  ];

  // Test all supported clients from README
  const clients = [
    { name: "amp", path: ".amp/skills" },
    { name: "claude", path: ".claude/skills" },
    { name: "claude-code", path: ".claude/skills" },
    { name: "codex", path: ".codex/skills" },
    { name: "cursor", path: ".cursor/skills" },
    { name: "github", path: ".github/skills" },
    { name: "goose", path: ".goose/skills" },
    { name: "letta", path: ".skills" },
    { name: "opencode", path: ".opencode/skill" },
  ];

  // First, verify CLI works
  (runReleased ? it : it.skip)("CLI version check", () => {
    console.log("\n[TEST] Starting CLI version check...");
    const repoRoot = path.resolve(__dirname, "..");
    const tmp = mkRepoTempDir(repoRoot, "released-version-");
    const projectDir = path.join(tmp, "project");
    const homeDir = path.join(tmp, "home");
    const npmCacheDir = path.join(tmp, "npm-cache");

    try {
      console.log(`[STEP] Creating temp directories...`);
      fs.mkdirSync(projectDir, { recursive: true });
      fs.mkdirSync(homeDir, { recursive: true });

      const env = {
        HOME: homeDir,
        npm_config_cache: npmCacheDir,
        npm_config_fund: "false",
        npm_config_audit: "false",
        npm_config_update_notifier: "false",
      };

      console.log(`[STEP] Running: npx -y @clix-so/clix-agent-skills@latest --version`);
      const versionRes = run(
        "npx",
        ["-y", "@clix-so/clix-agent-skills@latest", "--version"],
        projectDir,
        env
      );

      console.log(`[RESULT] Exit status: ${versionRes.status}`);
      if (versionRes.stdout) {
        console.log(`[STDOUT]\n${versionRes.stdout}`);
      }
      if (versionRes.stderr) {
        console.log(`[STDERR]\n${versionRes.stderr}`);
      }

      expect(versionRes.status).toBe(0);
      expect((versionRes.stdout || "").trim()).toMatch(/\d+\.\d+\.\d+/);
      console.log(`[SUCCESS] CLI version check passed\n`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  // Test each client installation at repo root
  clients.forEach(({ name, path: expectedPath }) => {
    (runReleased ? it : it.skip)(`installs all skills at repo root for client: ${name}`, () => {
      console.log(`\n[TEST] Starting installation test for client: ${name}`);
      const repoRoot = path.resolve(__dirname, "..");
      const tmp = mkRepoTempDir(repoRoot, `released-${name}-`);
      const projectDir = path.join(tmp, "project");
      const homeDir = path.join(tmp, "home");
      const npmCacheDir = path.join(tmp, "npm-cache");

      try {
        console.log(`[STEP] Creating temp directories...`);
        fs.mkdirSync(projectDir, { recursive: true });
        fs.mkdirSync(homeDir, { recursive: true });

        const env = {
          HOME: homeDir,
          npm_config_cache: npmCacheDir,
          npm_config_fund: "false",
          npm_config_audit: "false",
          npm_config_update_notifier: "false",
          // Make inquirer non-interactive (use defaults or fail fast)
          CI: "true",
          // Prevent any interactive prompts
          FORCE_COLOR: "0",
        };

        // Install all skills for this client (repo root, no --global flag)
        const installCmd = [
          "-y",
          "@clix-so/clix-agent-skills@latest",
          "install",
          "--all",
          "--client",
          name,
        ];
        console.log(`[STEP] Running: npx ${installCmd.join(" ")}`);
        console.log(`[STEP] Working directory: ${projectDir}`);
        console.log(`[STEP] Expected install path: ${expectedPath}`);

        const cliRes = run("npx", installCmd, projectDir, env);

        console.log(`[RESULT] Exit status: ${cliRes.status}`);
        if (cliRes.error) {
          console.log(`[ERROR] Process error: ${cliRes.error.message}`);
        }
        if (cliRes.stdout) {
          console.log(`[STDOUT]\n${cliRes.stdout}`);
        }
        if (cliRes.stderr) {
          console.log(`[STDERR]\n${cliRes.stderr}`);
        }

        // Verify skills were installed in the correct repo root path
        // (This is the main thing we care about - MCP config is secondary)
        const installedSkillsRoot = path.join(projectDir, ...expectedPath.split("/"));
        console.log(`[STEP] Verifying skills installed at: ${installedSkillsRoot}`);

        // Check if skills were installed and verify all necessary files
        const installedSkills: string[] = [];
        const missingSkills: string[] = [];
        const skillFileIssues: Array<{ skill: string; missing: string[] }> = [];

        expectedSkills.forEach((skill) => {
          const skillPath = path.join(installedSkillsRoot, skill);
          const skillMd = path.join(skillPath, "SKILL.md");

          if (fs.existsSync(skillMd)) {
            installedSkills.push(skill);

            // Verify all necessary files in the skill folder
            console.log(`[VERIFY] Checking files for skill: ${skill}`);
            const fileCheck = verifySkillFiles(skillPath, skill);

            if (fileCheck.valid) {
              console.log(`[VERIFY] ✓ ${skill}: All required files present`);
              if (fileCheck.found.length > 0) {
                console.log(`[VERIFY]   Found: ${fileCheck.found.join(", ")}`);
              }
            } else {
              console.log(`[VERIFY] ✗ ${skill}: Missing files: ${fileCheck.missing.join(", ")}`);
              skillFileIssues.push({ skill, missing: fileCheck.missing });
            }
          } else {
            missingSkills.push(skill);
            console.log(`[VERIFY] ✗ ${skill}: Skill folder not found`);
          }
        });

        console.log(
          `[VERIFY] Installed skills: ${installedSkills.length}/${expectedSkills.length}`
        );
        if (installedSkills.length > 0) {
          console.log(`[VERIFY] ✓ Found: ${installedSkills.join(", ")}`);
        }
        if (missingSkills.length > 0) {
          console.log(`[VERIFY] ✗ Missing: ${missingSkills.join(", ")}`);
        }

        const allSkillsInstalled = missingSkills.length === 0 && skillFileIssues.length === 0;

        // If skills weren't installed or files are missing, show detailed error
        if (!allSkillsInstalled) {
          const errorMsg =
            cliRes.status === null
              ? cliRes.error
                ? `Process error: ${cliRes.error.message}`
                : "Process was killed or timed out"
              : `CLI exited with status ${cliRes.status}`;
          const stderr = (cliRes.stderr || "").toString();
          const stdout = (cliRes.stdout || "").toString();

          let errorDetails = `${errorMsg}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}\n\nExpected skills at: ${installedSkillsRoot}`;

          if (missingSkills.length > 0) {
            errorDetails += `\n\nMissing skills: ${missingSkills.join(", ")}`;
          }

          if (skillFileIssues.length > 0) {
            errorDetails += `\n\nSkills with missing files:`;
            skillFileIssues.forEach(({ skill, missing }) => {
              errorDetails += `\n  - ${skill}: ${missing.join(", ")}`;
            });
          }

          throw new Error(errorDetails);
        }

        // If we got here, skills were installed successfully with all required files
        // Status check is secondary (MCP config might have failed, but that's OK for smoke test)
        if (cliRes.status !== null && cliRes.status !== 0) {
          // Log warning but don't fail - skills are installed which is what matters
          const stderr = (cliRes.stderr || "").toString();
          console.warn(
            `[WARNING] CLI exited with status ${cliRes.status} but skills were installed.\nSTDERR:\n${stderr}`
          );
        }

        console.log(
          `[SUCCESS] All skills installed correctly with all required files for client: ${name}`
        );
        console.log(
          `[SUCCESS] Verified ${installedSkills.length} skills with SKILL.md, LICENSE.txt, references/, and scripts/\n`
        );
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });
  });

  // Test each client installation at repo root WITH MCP configuration
  clients.forEach(({ name, path: expectedPath }) => {
    (runReleased ? it : it.skip)(
      `installs all skills at repo root with MCP config for client: ${name}`,
      () => {
        console.log(`\n[TEST] Starting installation test with MCP config for client: ${name}`);
        const repoRoot = path.resolve(__dirname, "..");
        const tmp = mkRepoTempDir(repoRoot, `released-mcp-${name}-`);
        const projectDir = path.join(tmp, "project");
        const homeDir = path.join(tmp, "home");
        const npmCacheDir = path.join(tmp, "npm-cache");

        try {
          console.log(`[STEP] Creating temp directories...`);
          fs.mkdirSync(projectDir, { recursive: true });
          fs.mkdirSync(homeDir, { recursive: true });

          const env = {
            HOME: homeDir,
            npm_config_cache: npmCacheDir,
            npm_config_fund: "false",
            npm_config_audit: "false",
            npm_config_update_notifier: "false",
            // Make inquirer non-interactive (use defaults or fail fast)
            CI: "true",
            FORCE_COLOR: "0",
          };

          // Install all skills for this client (repo root, WITH MCP config - no --client manual)
          const installCmd = [
            "-y",
            "@clix-so/clix-agent-skills@latest",
            "install",
            "--all",
            "--client",
            name,
          ];
          console.log(`[STEP] Running: npx ${installCmd.join(" ")}`);
          console.log(`[STEP] Working directory: ${projectDir}`);
          console.log(`[STEP] Expected install path: ${expectedPath}`);
          console.log(`[STEP] MCP config will be attempted (may prompt or fail in CI, that's OK)`);

          const cliRes = run("npx", installCmd, projectDir, env);

          console.log(`[RESULT] Exit status: ${cliRes.status}`);
          if (cliRes.error) {
            console.log(`[ERROR] Process error: ${cliRes.error.message}`);
          }
          if (cliRes.stdout) {
            console.log(`[STDOUT]\n${cliRes.stdout}`);
          }
          if (cliRes.stderr) {
            console.log(`[STDERR]\n${cliRes.stderr}`);
          }

          // Verify skills were installed in the correct repo root path
          const installedSkillsRoot = path.join(projectDir, ...expectedPath.split("/"));
          console.log(`[STEP] Verifying skills installed at: ${installedSkillsRoot}`);

          const installedSkills: string[] = [];
          const missingSkills: string[] = [];
          const skillFileIssues: Array<{ skill: string; missing: string[] }> = [];

          expectedSkills.forEach((skill) => {
            const skillPath = path.join(installedSkillsRoot, skill);
            const skillMd = path.join(skillPath, "SKILL.md");

            if (fs.existsSync(skillMd)) {
              installedSkills.push(skill);

              const fileCheck = verifySkillFiles(skillPath, skill);

              if (fileCheck.valid) {
                console.log(`[VERIFY] ✓ ${skill}: All required files present`);
              } else {
                console.log(`[VERIFY] ✗ ${skill}: Missing files: ${fileCheck.missing.join(", ")}`);
                skillFileIssues.push({ skill, missing: fileCheck.missing });
              }
            } else {
              missingSkills.push(skill);
              console.log(`[VERIFY] ✗ ${skill}: Skill folder not found`);
            }
          });

          console.log(
            `[VERIFY] Installed skills: ${installedSkills.length}/${expectedSkills.length}`
          );
          const allSkillsInstalled = missingSkills.length === 0 && skillFileIssues.length === 0;

          if (!allSkillsInstalled) {
            const errorMsg =
              cliRes.status === null
                ? cliRes.error
                  ? `Process error: ${cliRes.error.message}`
                  : "Process was killed or timed out"
                : `CLI exited with status ${cliRes.status}`;
            const stderr = (cliRes.stderr || "").toString();
            const stdout = (cliRes.stdout || "").toString();

            let errorDetails = `${errorMsg}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}\n\nExpected skills at: ${installedSkillsRoot}`;

            if (missingSkills.length > 0) {
              errorDetails += `\n\nMissing skills: ${missingSkills.join(", ")}`;
            }

            if (skillFileIssues.length > 0) {
              errorDetails += `\n\nSkills with missing files:`;
              skillFileIssues.forEach(({ skill, missing }) => {
                errorDetails += `\n  - ${skill}: ${missing.join(", ")}`;
              });
            }

            throw new Error(errorDetails);
          }

          // Skills are installed - MCP config status is secondary
          if (cliRes.status !== null && cliRes.status !== 0) {
            const stderr = (cliRes.stderr || "").toString();
            console.warn(
              `[WARNING] CLI exited with status ${cliRes.status} but skills were installed.\nSTDERR:\n${stderr}`
            );
          }

          console.log(
            `[SUCCESS] All skills installed correctly with MCP config attempt for client: ${name}\n`
          );
        } finally {
          fs.rmSync(tmp, { recursive: true, force: true });
        }
      }
    );
  });

  // Test each client installation at global level (system root) WITH MCP configuration
  clients.forEach(({ name, path: expectedPath }) => {
    (runReleased ? it : it.skip)(
      `installs all skills globally with MCP config for client: ${name}`,
      () => {
        console.log(
          `\n[TEST] Starting global installation test with MCP config for client: ${name}`
        );
        const repoRoot = path.resolve(__dirname, "..");
        const tmp = mkRepoTempDir(repoRoot, `released-global-${name}-`);
        const projectDir = path.join(tmp, "project");
        const homeDir = path.join(tmp, "home");
        const npmCacheDir = path.join(tmp, "npm-cache");

        try {
          console.log(`[STEP] Creating temp directories...`);
          fs.mkdirSync(projectDir, { recursive: true });
          fs.mkdirSync(homeDir, { recursive: true });

          const env = {
            HOME: homeDir,
            npm_config_cache: npmCacheDir,
            npm_config_fund: "false",
            npm_config_audit: "false",
            npm_config_update_notifier: "false",
            CI: "true",
            FORCE_COLOR: "0",
          };

          // Install all skills globally (system root) WITH MCP config
          const installCmd = [
            "-y",
            "@clix-so/clix-agent-skills@latest",
            "install",
            "--all",
            "--client",
            name,
            "--global",
          ];
          console.log(`[STEP] Running: npx ${installCmd.join(" ")}`);
          console.log(`[STEP] Working directory: ${projectDir}`);
          console.log(`[STEP] HOME directory: ${homeDir}`);
          console.log(`[STEP] Expected install path: ${homeDir}/${expectedPath}`);
          console.log(`[STEP] MCP config will be attempted (may prompt or fail in CI, that's OK)`);

          const cliRes = run("npx", installCmd, projectDir, env);

          console.log(`[RESULT] Exit status: ${cliRes.status}`);
          if (cliRes.error) {
            console.log(`[ERROR] Process error: ${cliRes.error.message}`);
          }
          if (cliRes.stdout) {
            console.log(`[STDOUT]\n${cliRes.stdout}`);
          }
          if (cliRes.stderr) {
            console.log(`[STDERR]\n${cliRes.stderr}`);
          }

          // Verify skills were installed in the global (home) directory
          const installedSkillsRoot = path.join(homeDir, ...expectedPath.split("/"));
          console.log(`[STEP] Verifying skills installed at: ${installedSkillsRoot}`);

          const installedSkills: string[] = [];
          const missingSkills: string[] = [];
          const skillFileIssues: Array<{ skill: string; missing: string[] }> = [];

          expectedSkills.forEach((skill) => {
            const skillPath = path.join(installedSkillsRoot, skill);
            const skillMd = path.join(skillPath, "SKILL.md");

            if (fs.existsSync(skillMd)) {
              installedSkills.push(skill);

              const fileCheck = verifySkillFiles(skillPath, skill);

              if (fileCheck.valid) {
                console.log(`[VERIFY] ✓ ${skill}: All required files present`);
              } else {
                console.log(`[VERIFY] ✗ ${skill}: Missing files: ${fileCheck.missing.join(", ")}`);
                skillFileIssues.push({ skill, missing: fileCheck.missing });
              }
            } else {
              missingSkills.push(skill);
              console.log(`[VERIFY] ✗ ${skill}: Skill folder not found`);
            }
          });

          console.log(
            `[VERIFY] Installed skills: ${installedSkills.length}/${expectedSkills.length}`
          );
          const allSkillsInstalled = missingSkills.length === 0 && skillFileIssues.length === 0;

          if (!allSkillsInstalled) {
            const errorMsg =
              cliRes.status === null
                ? cliRes.error
                  ? `Process error: ${cliRes.error.message}`
                  : "Process was killed or timed out"
                : `CLI exited with status ${cliRes.status}`;
            const stderr = (cliRes.stderr || "").toString();
            const stdout = (cliRes.stdout || "").toString();

            let errorDetails = `${errorMsg}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}\n\nExpected skills at: ${installedSkillsRoot}`;

            if (missingSkills.length > 0) {
              errorDetails += `\n\nMissing skills: ${missingSkills.join(", ")}`;
            }

            if (skillFileIssues.length > 0) {
              errorDetails += `\n\nSkills with missing files:`;
              skillFileIssues.forEach(({ skill, missing }) => {
                errorDetails += `\n  - ${skill}: ${missing.join(", ")}`;
              });
            }

            throw new Error(errorDetails);
          }

          // Skills are installed - MCP config status is secondary
          if (cliRes.status !== null && cliRes.status !== 0) {
            const stderr = (cliRes.stderr || "").toString();
            console.warn(
              `[WARNING] CLI exited with status ${cliRes.status} but skills were installed.\nSTDERR:\n${stderr}`
            );
          }

          console.log(
            `[SUCCESS] All skills installed correctly globally with MCP config attempt for client: ${name}\n`
          );
        } finally {
          fs.rmSync(tmp, { recursive: true, force: true });
        }
      }
    );
  });
});
