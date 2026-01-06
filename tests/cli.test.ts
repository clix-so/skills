/**
 * QA-focused tests for the CLI entrypoint.
 *
 * These tests treat `src/bin/cli.ts` as a black box:
 * - provide argv
 * - assert which command handlers were invoked
 * - assert user-visible error output + exit codes
 *
 * Note: `cli.ts` executes `program.parse(process.argv)` at import time,
 * so each test must isolate module state with `jest.resetModules()`.
 */

describe("CLI (src/bin/cli.ts)", () => {
  const originalArgv = process.argv;
  const originalExit = process.exit;

  let exitSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Commander expects argv-like structure. We only care about parsing.
    process.argv = ["node", "clix-agent-skills"];

    // Prevent Jest process from actually exiting.
    exitSpy = jest
      .spyOn(process, "exit")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(((code?: number) => undefined) as any);

    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
    exitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("should exit(1) when `install` is called without skill and without --all", async () => {
    const mockedInstallSkill = jest.fn();
    const mockedInstallAllSkills = jest.fn();

    jest.doMock("../src/bin/commands/install", () => ({
      installSkill: mockedInstallSkill,
      installAllSkills: mockedInstallAllSkills,
    }));

    process.argv = ["node", "clix-agent-skills", "install"];

    await import("../src/bin/cli");

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Please specify a skill name or use --all flag/)
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(mockedInstallSkill).not.toHaveBeenCalled();
    expect(mockedInstallAllSkills).not.toHaveBeenCalled();
  });

  it("should call installSkill with parsed options for `install <skill>`", async () => {
    const mockedInstallSkill = jest.fn().mockResolvedValue(undefined);
    const mockedInstallAllSkills = jest.fn();

    jest.doMock("../src/bin/commands/install", () => ({
      installSkill: mockedInstallSkill,
      installAllSkills: mockedInstallAllSkills,
    }));

    process.argv = [
      "node",
      "clix-agent-skills",
      "install",
      "integration",
      "--client",
      "cursor",
      "--path",
      "./custom/skills",
      "--global",
    ];

    await import("../src/bin/cli");

    expect(mockedInstallSkill).toHaveBeenCalledWith(
      "integration",
      expect.objectContaining({
        client: "cursor",
        path: "./custom/skills",
        global: true,
      })
    );
    expect(mockedInstallAllSkills).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("should call installAllSkills when `install --all` is provided", async () => {
    const mockedInstallSkill = jest.fn();
    const mockedInstallAllSkills = jest.fn().mockResolvedValue(undefined);

    jest.doMock("../src/bin/commands/install", () => ({
      installSkill: mockedInstallSkill,
      installAllSkills: mockedInstallAllSkills,
    }));

    process.argv = ["node", "clix-agent-skills", "install", "--all", "--client", "cursor"];

    await import("../src/bin/cli");

    expect(mockedInstallAllSkills).toHaveBeenCalledWith(
      expect.objectContaining({
        all: true,
        client: "cursor",
      })
    );
    expect(mockedInstallSkill).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("should exit(1) and print a helpful message when installSkill throws an Error", async () => {
    const mockedInstallSkill = jest.fn().mockRejectedValue(new Error("boom"));
    const mockedInstallAllSkills = jest.fn();

    jest.doMock("../src/bin/commands/install", () => ({
      installSkill: mockedInstallSkill,
      installAllSkills: mockedInstallAllSkills,
    }));

    process.argv = ["node", "clix-agent-skills", "install", "integration"];

    await import("../src/bin/cli");

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Error installing skill\(s\):/),
      "boom"
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("should exit(1) and print a helpful message when installAllSkills throws a non-Error", async () => {
    const mockedInstallSkill = jest.fn();
    const mockedInstallAllSkills = jest.fn().mockRejectedValue("string failure");

    jest.doMock("../src/bin/commands/install", () => ({
      installSkill: mockedInstallSkill,
      installAllSkills: mockedInstallAllSkills,
    }));

    process.argv = ["node", "clix-agent-skills", "install", "--all"];

    await import("../src/bin/cli");

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Error installing skill\(s\):/),
      "string failure"
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
