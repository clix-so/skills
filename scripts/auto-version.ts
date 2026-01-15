#!/usr/bin/env ts-node
/**
 * Auto Semantic Versioning Script
 *
 * Analyzes git commits since the last tag and automatically determines
 * the appropriate semantic version bump based on conventional commits:
 *
 * - BREAKING CHANGE or ! after type -> major bump (1.0.0 -> 2.0.0)
 * - feat: -> minor bump (1.0.0 -> 1.1.0)
 * - fix:, perf:, refactor:, etc. -> patch bump (1.0.0 -> 1.0.1)
 *
 * Usage:
 *   npm run auto-version           # Analyze and bump version
 *   npm run auto-version -- --dry-run  # Show what would happen without making changes
 *   npm run auto-version -- --force major|minor|patch  # Force a specific bump type
 *
 * Conventional Commit Format:
 *   <type>[optional scope][!]: <description>
 *
 *   Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
 */

import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";

interface PackageJson {
  version: string;
  [key: string]: unknown;
}

interface CommitAnalysis {
  commits: string[];
  hasMajor: boolean;
  hasMinor: boolean;
  hasPatch: boolean;
  breakingChanges: string[];
  features: string[];
  fixes: string[];
  other: string[];
}

type BumpType = "major" | "minor" | "patch" | "none";

const ROOT_DIR = path.resolve(__dirname, "..");

/**
 * Parse semantic version string into components
 */
function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Bump version based on bump type
 */
function bumpVersion(
  current: { major: number; minor: number; patch: number },
  bumpType: BumpType
): string {
  switch (bumpType) {
    case "major":
      return `${current.major + 1}.0.0`;
    case "minor":
      return `${current.major}.${current.minor + 1}.0`;
    case "patch":
      return `${current.major}.${current.minor}.${current.patch + 1}`;
    case "none":
      return `${current.major}.${current.minor}.${current.patch}`;
  }
}

/**
 * Get the latest git tag (version tag)
 */
function getLatestTag(): string | null {
  try {
    const tag = execSync("git describe --tags --abbrev=0 2>/dev/null", {
      encoding: "utf-8",
      cwd: ROOT_DIR,
    }).trim();
    return tag;
  } catch {
    return null;
  }
}

/**
 * Get commits since the last tag (or all commits if no tag exists)
 */
function getCommitsSinceTag(tag: string | null): string[] {
  try {
    const range = tag ? `${tag}..HEAD` : "HEAD";
    const output = execSync(`git log ${range} --pretty=format:"%s" 2>/dev/null`, {
      encoding: "utf-8",
      cwd: ROOT_DIR,
    });
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

/**
 * Analyze commits to determine bump type
 */
function analyzeCommits(commits: string[]): CommitAnalysis {
  const analysis: CommitAnalysis = {
    commits,
    hasMajor: false,
    hasMinor: false,
    hasPatch: false,
    breakingChanges: [],
    features: [],
    fixes: [],
    other: [],
  };

  // Conventional commit patterns
  const breakingPattern = /^.+!:|BREAKING[ -]CHANGE/i;
  const featPattern = /^feat(\(.+\))?[!]?:/i;
  const fixPattern = /^fix(\(.+\))?[!]?:/i;
  const patchPatterns = [
    /^perf(\(.+\))?:/i,
    /^refactor(\(.+\))?:/i,
    /^style(\(.+\))?:/i,
    /^docs(\(.+\))?:/i,
    /^test(\(.+\))?:/i,
    /^build(\(.+\))?:/i,
    /^ci(\(.+\))?:/i,
    /^chore(\(.+\))?:/i,
    /^revert(\(.+\))?:/i,
  ];

  for (const commit of commits) {
    // Check for breaking changes first
    if (breakingPattern.test(commit)) {
      analysis.hasMajor = true;
      analysis.breakingChanges.push(commit);
      continue;
    }

    // Check for features (minor bump)
    if (featPattern.test(commit)) {
      analysis.hasMinor = true;
      analysis.features.push(commit);
      continue;
    }

    // Check for fixes (patch bump)
    if (fixPattern.test(commit)) {
      analysis.hasPatch = true;
      analysis.fixes.push(commit);
      continue;
    }

    // Check for other patch-level changes
    const isPatchChange = patchPatterns.some((pattern) => pattern.test(commit));
    if (isPatchChange) {
      analysis.hasPatch = true;
      analysis.other.push(commit);
      continue;
    }

    // Non-conventional commits are treated as patch
    analysis.other.push(commit);
    analysis.hasPatch = true;
  }

  return analysis;
}

/**
 * Determine the bump type from commit analysis
 */
function determineBumpType(analysis: CommitAnalysis): BumpType {
  if (analysis.commits.length === 0) {
    return "none";
  }
  if (analysis.hasMajor) {
    return "major";
  }
  if (analysis.hasMinor) {
    return "minor";
  }
  if (analysis.hasPatch) {
    return "patch";
  }
  return "none";
}

/**
 * Update package.json with new version
 */
async function updatePackageJson(newVersion: string): Promise<void> {
  const packageJsonPath = path.join(ROOT_DIR, "package.json");
  const packageJson: PackageJson = await fs.readJSON(packageJsonPath);
  packageJson.version = newVersion;
  await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}

/**
 * Run sync-version script to update all version references
 */
function runSyncVersion(): void {
  execSync("npm run sync-version", {
    cwd: ROOT_DIR,
    stdio: "inherit",
  });
}

/**
 * Create a git tag for the new version
 */
function createGitTag(version: string, dryRun: boolean): void {
  const tagName = `v${version}`;
  if (dryRun) {
    console.log(`\n[DRY RUN] Would create git tag: ${tagName}`);
    return;
  }

  try {
    execSync(`git tag -a ${tagName} -m "Release ${tagName}"`, {
      cwd: ROOT_DIR,
      stdio: "inherit",
    });
    console.log(`\nCreated git tag: ${tagName}`);
  } catch (error) {
    console.error(`Failed to create git tag: ${(error as Error).message}`);
  }
}

/**
 * Print commit analysis summary
 */
function printAnalysisSummary(analysis: CommitAnalysis): void {
  console.log("\nCommit Analysis:");
  console.log("================");
  console.log(`Total commits analyzed: ${analysis.commits.length}`);

  if (analysis.breakingChanges.length > 0) {
    console.log(`\nBreaking Changes (${analysis.breakingChanges.length}):`);
    analysis.breakingChanges.forEach((c) => console.log(`  - ${c}`));
  }

  if (analysis.features.length > 0) {
    console.log(`\nFeatures (${analysis.features.length}):`);
    analysis.features.forEach((c) => console.log(`  - ${c}`));
  }

  if (analysis.fixes.length > 0) {
    console.log(`\nFixes (${analysis.fixes.length}):`);
    analysis.fixes.forEach((c) => console.log(`  - ${c}`));
  }

  if (analysis.other.length > 0) {
    console.log(`\nOther changes (${analysis.other.length}):`);
    analysis.other.slice(0, 5).forEach((c) => console.log(`  - ${c}`));
    if (analysis.other.length > 5) {
      console.log(`  ... and ${analysis.other.length - 5} more`);
    }
  }
}

/**
 * Parse CLI arguments
 */
function parseArgs(): { dryRun: boolean; force: BumpType | null; tag: boolean } {
  const args = process.argv.slice(2);
  let dryRun = false;
  let force: BumpType | null = null;
  let tag = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run" || args[i] === "-n") {
      dryRun = true;
    } else if (args[i] === "--force" || args[i] === "-f") {
      const nextArg = args[i + 1];
      if (nextArg === "major" || nextArg === "minor" || nextArg === "patch") {
        force = nextArg;
        i++;
      } else {
        console.error("Error: --force requires major, minor, or patch");
        process.exit(1);
      }
    } else if (args[i] === "--tag" || args[i] === "-t") {
      tag = true;
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(`
Auto Semantic Versioning

Usage:
  npm run auto-version [options]

Options:
  --dry-run, -n     Show what would happen without making changes
  --force, -f TYPE  Force a specific bump type (major, minor, patch)
  --tag, -t         Create a git tag after versioning
  --help, -h        Show this help message

Examples:
  npm run auto-version              # Auto-detect and bump version
  npm run auto-version -- --dry-run # Preview changes
  npm run auto-version -- -f minor  # Force minor bump
  npm run auto-version -- --tag     # Bump and create git tag
`);
      process.exit(0);
    }
  }

  return { dryRun, force, tag };
}

async function main(): Promise<void> {
  console.log("Auto Semantic Versioning");
  console.log("========================\n");

  const { dryRun, force, tag } = parseArgs();

  if (dryRun) {
    console.log("[DRY RUN MODE - No changes will be made]\n");
  }

  try {
    // Get current version
    const packageJsonPath = path.join(ROOT_DIR, "package.json");
    const packageJson: PackageJson = await fs.readJSON(packageJsonPath);
    const currentVersion = packageJson.version;
    const parsedVersion = parseVersion(currentVersion);

    console.log(`Current version: ${currentVersion}`);

    // Get latest tag and commits
    const latestTag = getLatestTag();
    console.log(`Latest git tag: ${latestTag || "(none)"}`);

    const commits = getCommitsSinceTag(latestTag);
    console.log(`Commits since last tag: ${commits.length}`);

    // Analyze commits or use forced bump type
    let bumpType: BumpType;
    let analysis: CommitAnalysis | null = null;

    if (force) {
      bumpType = force;
      console.log(`\nForced bump type: ${force}`);
    } else {
      analysis = analyzeCommits(commits);
      printAnalysisSummary(analysis);
      bumpType = determineBumpType(analysis);
    }

    // Calculate new version
    const newVersion = bumpVersion(parsedVersion, bumpType);

    console.log(`\nVersion bump: ${bumpType.toUpperCase()}`);
    console.log(`New version: ${currentVersion} -> ${newVersion}`);

    if (bumpType === "none") {
      console.log("\nNo version bump needed (no relevant commits found).");
      return;
    }

    if (dryRun) {
      console.log("\n[DRY RUN] Would update the following files:");
      console.log("  - package.json");
      console.log("  - All SKILL.md files");
      console.log("  - .claude-plugin/marketplace.json");
      if (tag) {
        createGitTag(newVersion, true);
      }
      return;
    }

    // Apply version update
    console.log("\nApplying version update...");
    await updatePackageJson(newVersion);
    console.log("  Updated package.json");

    // Sync version to other files
    console.log("\nSyncing version to other files...");
    runSyncVersion();

    // Create git tag if requested
    if (tag) {
      createGitTag(newVersion, false);
    }

    console.log(`\nVersion successfully updated to ${newVersion}`);

    if (!tag) {
      console.log("\nNext steps:");
      console.log("  1. Review the changes: git diff");
      console.log("  2. Commit the version bump: git add -A && git commit -m 'chore: bump version to " + newVersion + "'");
      console.log("  3. Create a tag: git tag -a v" + newVersion + " -m 'Release v" + newVersion + "'");
      console.log("  4. Push: git push && git push --tags");
    }
  } catch (error) {
    console.error("\nError:", (error as Error).message);
    process.exit(1);
  }
}

main();
