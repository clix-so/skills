import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const tempDirs: string[] = [];

function mkdirp(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function runValidator(creatorDir: string | undefined, newSkillDir: string | undefined) {
  const scriptPath = path.resolve(
    __dirname,
    "..",
    "skills",
    "skill-creator",
    "scripts",
    "validate-same-scope.sh"
  );

  const args = [scriptPath];
  if (creatorDir !== undefined) args.push(creatorDir);
  if (newSkillDir !== undefined) args.push(newSkillDir);

  const result = spawnSync("bash", args, { encoding: "utf8" });
  return { result, scriptPath };
}

describe("validate-same-scope.sh", () => {
  afterEach(() => {
    for (const dir of tempDirs) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    }
    tempDirs.length = 0;
  });

  it("passes when both folders share the same parent skills directory", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "same-scope-"));
    tempDirs.push(tmp);

    const creator = path.join(tmp, ".cursor", "skills", "skill-creator");
    const newSkill = path.join(tmp, ".cursor", "skills", "new-skill");
    mkdirp(creator);
    mkdirp(newSkill);

    const { result } = runValidator(creator, newSkill);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("OK: skill scope matches");
  });

  it("fails when folders are in different parent skills directories (project vs user)", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "same-scope-"));
    tempDirs.push(tmp);

    const creator = path.join(tmp, ".cursor", "skills", "skill-creator");
    const newSkill = path.join(tmp, "home", ".cursor", "skills", "new-skill");
    mkdirp(creator);
    mkdirp(newSkill);

    const { result } = runValidator(creator, newSkill);
    expect(result.status).toBe(1);
    expect(result.stdout || result.stderr).toContain("ERROR: scope mismatch");
  });

  it("fails when new skill is not under a skills directory", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "same-scope-"));
    tempDirs.push(tmp);

    const creator = path.join(tmp, "skills", "skill-creator");
    const newSkill = path.join(tmp, "src", "new-skill");
    mkdirp(creator);
    mkdirp(newSkill);

    const { result } = runValidator(creator, newSkill);
    expect(result.status).toBe(1);
    expect(result.stdout || result.stderr).toContain(
      "ERROR: new skill must live under a skills directory"
    );
  });

  it("fails when skill-creator is not under a skills directory", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "same-scope-"));
    tempDirs.push(tmp);

    const creator = path.join(tmp, "src", "skill-creator");
    const newSkill = path.join(tmp, "skills", "new-skill");
    mkdirp(creator);
    mkdirp(newSkill);

    const { result } = runValidator(creator, newSkill);
    expect(result.status).toBe(1);
    expect(result.stdout || result.stderr).toContain(
      "ERROR: skill-creator must live under a skills directory"
    );
  });

  it("returns exit code 2 when arguments are missing", () => {
    const { result } = runValidator(undefined, undefined);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Usage:");
  });

  it("returns exit code 2 when directories do not exist", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "same-scope-"));
    tempDirs.push(tmp);

    const creator = path.join(tmp, "skills", "skill-creator"); // not created
    const newSkill = path.join(tmp, "skills", "new-skill"); // not created

    const { result } = runValidator(creator, newSkill);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("directory not found");
  });

  it("accepts Letta-style .skills directory", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "same-scope-"));
    tempDirs.push(tmp);

    const creator = path.join(tmp, ".skills", "skill-creator");
    const newSkill = path.join(tmp, ".skills", "new-skill");
    mkdirp(creator);
    mkdirp(newSkill);

    const { result } = runValidator(creator, newSkill);
    expect(result.status).toBe(0);
  });

  it("accepts OpenCode-style singular skill directory", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "same-scope-"));
    tempDirs.push(tmp);

    const creator = path.join(tmp, ".opencode", "skill", "skill-creator");
    const newSkill = path.join(tmp, ".opencode", "skill", "new-skill");
    mkdirp(creator);
    mkdirp(newSkill);

    const { result } = runValidator(creator, newSkill);
    expect(result.status).toBe(0);
  });
});
