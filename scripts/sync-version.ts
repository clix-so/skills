#!/usr/bin/env ts-node
/**
 * Version Synchronization Script
 *
 * Synchronizes the version from package.json across all files that contain version references:
 * - skills/integration/SKILL.md (frontmatter)
 * - .claude-plugin/marketplace.json (metadata.version)
 *
 * Usage:
 *   npm run sync-version
 *   npx ts-node scripts/sync-version.ts
 *
 * Note: cli.ts uses dynamic import from package.json, so it doesn't need updating.
 */

import fs from "fs-extra";
import path from "path";

interface PackageJson {
  version: string;
  [key: string]: unknown;
}

interface MarketplaceJson {
  metadata: {
    version: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const ROOT_DIR = path.resolve(__dirname, "..");

async function getPackageVersion(): Promise<string> {
  const packageJsonPath = path.join(ROOT_DIR, "package.json");
  const packageJson: PackageJson = await fs.readJSON(packageJsonPath);
  return packageJson.version;
}

async function updateSkillMd(version: string): Promise<boolean> {
  const skillMdPath = path.join(ROOT_DIR, "skills", "integration", "SKILL.md");

  if (!fs.existsSync(skillMdPath)) {
    console.warn(`  Warning: ${skillMdPath} not found, skipping...`);
    return false;
  }

  let content = await fs.readFile(skillMdPath, "utf-8");

  // Update version in YAML frontmatter (format: version: X.X.X)
  const versionRegex = /^(version:\s*).+$/m;

  if (!versionRegex.test(content)) {
    console.warn("  Warning: No version field found in SKILL.md frontmatter");
    return false;
  }

  const oldVersionMatch = content.match(versionRegex);
  const oldVersion = oldVersionMatch ? oldVersionMatch[0] : "unknown";

  content = content.replace(versionRegex, `$1${version}`);
  await fs.writeFile(skillMdPath, content, "utf-8");

  console.log(`  skills/integration/SKILL.md: ${oldVersion} -> version: ${version}`);
  return true;
}

async function updateMarketplaceJson(version: string): Promise<boolean> {
  const marketplacePath = path.join(ROOT_DIR, ".claude-plugin", "marketplace.json");

  if (!fs.existsSync(marketplacePath)) {
    console.warn(`  Warning: ${marketplacePath} not found, skipping...`);
    return false;
  }

  const marketplace: MarketplaceJson = await fs.readJSON(marketplacePath);
  const oldVersion = marketplace.metadata?.version || "unknown";

  if (!marketplace.metadata) {
    marketplace.metadata = { version };
  } else {
    marketplace.metadata.version = version;
  }

  await fs.writeJSON(marketplacePath, marketplace, { spaces: 2 });

  console.log(`  .claude-plugin/marketplace.json: ${oldVersion} -> ${version}`);
  return true;
}

async function findAllSkills(): Promise<string[]> {
  const skillsDir = path.join(ROOT_DIR, "skills");

  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function updateAllSkillVersions(version: string): Promise<number> {
  const skills = await findAllSkills();
  let updatedCount = 0;

  for (const skill of skills) {
    const skillMdPath = path.join(ROOT_DIR, "skills", skill, "SKILL.md");

    if (!fs.existsSync(skillMdPath)) {
      continue;
    }

    let content = await fs.readFile(skillMdPath, "utf-8");
    const versionRegex = /^(version:\s*).+$/m;

    if (versionRegex.test(content)) {
      const oldVersionMatch = content.match(versionRegex);
      const oldVersion = oldVersionMatch ? oldVersionMatch[0] : "unknown";

      content = content.replace(versionRegex, `$1${version}`);
      await fs.writeFile(skillMdPath, content, "utf-8");

      console.log(`  skills/${skill}/SKILL.md: ${oldVersion} -> version: ${version}`);
      updatedCount++;
    }
  }

  return updatedCount;
}

async function main(): Promise<void> {
  console.log("Version Sync Script");
  console.log("===================\n");

  try {
    const version = await getPackageVersion();
    console.log(`Source version (package.json): ${version}\n`);
    console.log("Updating files:");

    let updatedCount = 0;

    // Update all skill SKILL.md files
    updatedCount += await updateAllSkillVersions(version);

    // Update marketplace.json
    if (await updateMarketplaceJson(version)) {
      updatedCount++;
    }

    console.log(`\nDone! Updated ${updatedCount} file(s).`);
  } catch (error) {
    console.error("Error syncing versions:", (error as Error).message);
    process.exit(1);
  }
}

main();
