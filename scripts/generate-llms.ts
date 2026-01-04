#!/usr/bin/env ts-node

/**
 * Generate llms.txt for Clix Agent Skills
 *
 * This script scans the skills directory and generates a comprehensive
 * llms.txt file with all skill files indexed for MCP server consumption.
 */

import fs from "fs-extra";
import path from "path";

// Get repo root (script is in scripts/, repo root is parent)
const repoRoot = path.resolve(__dirname, "..");
const skillsDir = path.join(repoRoot, "skills");
const outputPath = path.join(repoRoot, "llms.txt");

interface SkillFile {
  skillName: string;
  type: "skill" | "reference" | "example" | "script" | "license";
  path: string;
  relativePath: string;
  title: string;
  description?: string;
}

/**
 * Extract skill metadata from SKILL.md frontmatter
 */
function extractSkillMetadata(skillPath: string): { name: string; description: string } {
  try {
    const content = fs.readFileSync(skillPath, "utf-8");
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);

      // Match multiline description (YAML multiline format)
      // Handles both single-line and multiline (with indentation) descriptions
      // Format: description:\n  line1\n  line2\n  line3\n--- (or next key)
      const descLines: string[] = [];
      const lines = frontmatter.split("\n");
      let inDescription = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Start of description
        if (line.match(/^description:\s*$/)) {
          inDescription = true;
          // Check if description is on same line
          const sameLineMatch = line.match(/^description:\s+(.+)$/);
          if (sameLineMatch) {
            descLines.push(sameLineMatch[1].trim());
            inDescription = false;
          }
          continue;
        }

        // Collect description lines (with indentation)
        if (inDescription) {
          // Stop if we hit a new key (line starts with letter, no indentation)
          if (line.match(/^[a-zA-Z]/) && !line.match(/^\s/)) {
            break;
          }
          // Collect lines with indentation (description continuation)
          if (line.match(/^\s+/) || line.trim().length > 0) {
            descLines.push(line.trim());
          }
        }
      }

      const description = descLines
        .filter((line) => line.length > 0)
        .join(" ")
        .trim();

      return {
        name: nameMatch?.[1]?.trim() || "",
        description: description || "",
      };
    }
  } catch (error) {
    console.warn(`Failed to extract metadata from ${skillPath}:`, error);
  }

  return { name: "", description: "" };
}

/**
 * Get title from filename
 */
function getTitleFromPath(filePath: string, type: string): string {
  const basename = path.basename(filePath, path.extname(filePath));

  // Convert kebab-case to Title Case
  const title = basename
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  if (type === "reference") {
    return `${title} (Reference)`;
  }
  if (type === "example") {
    return `${title} (Example)`;
  }
  if (type === "script") {
    return `${title} (Script)`;
  }

  return title;
}

/**
 * Scan a skill directory and collect all files
 */
function scanSkill(skillName: string, skillDir: string): SkillFile[] {
  const files: SkillFile[] = [];
  const baseUrl = `https://raw.githubusercontent.com/clix-so/skills/refs/heads/main/skills/${skillName}`;

  // SKILL.md
  const skillPath = path.join(skillDir, "SKILL.md");
  if (fs.existsSync(skillPath)) {
    const metadata = extractSkillMetadata(skillPath);
    files.push({
      skillName,
      type: "skill",
      path: skillPath,
      relativePath: `skills/${skillName}/SKILL.md`,
      title: metadata.name || `${skillName} Skill`,
      description: metadata.description,
    });
  }

  // References
  const refsDir = path.join(skillDir, "references");
  if (fs.existsSync(refsDir) && fs.statSync(refsDir).isDirectory()) {
    const refFiles = fs.readdirSync(refsDir);
    for (const file of refFiles) {
      const refPath = path.join(refsDir, file);
      if (fs.statSync(refPath).isFile() && file.endsWith(".md")) {
        files.push({
          skillName,
          type: "reference",
          path: refPath,
          relativePath: `skills/${skillName}/references/${file}`,
          title: getTitleFromPath(file, "reference"),
          description: `Reference documentation for ${skillName} skill`,
        });
      }
    }
  }

  // Examples
  const examplesDir = path.join(skillDir, "examples");
  if (fs.existsSync(examplesDir) && fs.statSync(examplesDir).isDirectory()) {
    const exampleFiles = fs.readdirSync(examplesDir);
    for (const file of exampleFiles) {
      const examplePath = path.join(examplesDir, file);
      if (fs.statSync(examplePath).isFile()) {
        files.push({
          skillName,
          type: "example",
          path: examplePath,
          relativePath: `skills/${skillName}/examples/${file}`,
          title: getTitleFromPath(file, "example"),
          description: `Code example for ${skillName} skill`,
        });
      }
    }
  }

  // Scripts
  const scriptsDir = path.join(skillDir, "scripts");
  if (fs.existsSync(scriptsDir) && fs.statSync(scriptsDir).isDirectory()) {
    const scriptFiles = fs.readdirSync(scriptsDir);
    for (const file of scriptFiles) {
      const scriptPath = path.join(scriptsDir, file);
      if (fs.statSync(scriptPath).isFile()) {
        files.push({
          skillName,
          type: "script",
          path: scriptPath,
          relativePath: `skills/${skillName}/scripts/${file}`,
          title: getTitleFromPath(file, "script"),
          description: `Utility script for ${skillName} skill`,
        });
      }
    }
  }

  return files;
}

/**
 * Generate llms.txt content
 */
function generateLlmsTxt(allFiles: SkillFile[]): string {
  let content = `<!-- Clix Agent Skills llms.txt -->\n\n`;
  content += `# Clix Agent Skills\n\n`;
  content += `This file contains a comprehensive index of all Clix Agent Skills files.\n`;
  content += `Each entry includes the file path, type, and description for semantic search.\n\n`;
  content += `---\n\n`;

  // Group by skill
  const bySkill = new Map<string, SkillFile[]>();
  for (const file of allFiles) {
    if (!bySkill.has(file.skillName)) {
      bySkill.set(file.skillName, []);
    }
    bySkill.get(file.skillName)!.push(file);
  }

  // Generate entries for each skill
  for (const [skillName, files] of bySkill.entries()) {
    // Main skill entry
    const skillFile = files.find((f) => f.type === "skill");
    if (skillFile) {
      const url = `https://raw.githubusercontent.com/clix-so/skills/refs/heads/main/${skillFile.relativePath}`;
      content += `## ${skillFile.title}\n\n`;
      if (skillFile.description) {
        content += `${skillFile.description}\n\n`;
      }
      content += `- [${skillFile.title}](${url}): ${skillFile.description || "Main skill documentation"}\n\n`;
    }

    // Reference files
    const refs = files.filter((f) => f.type === "reference");
    if (refs.length > 0) {
      content += `### References\n\n`;
      for (const ref of refs) {
        const url = `https://raw.githubusercontent.com/clix-so/skills/refs/heads/main/${ref.relativePath}`;
        content += `- [${ref.title}](${url}): ${ref.description || "Reference documentation"}\n`;
      }
      content += `\n`;
    }

    // Examples
    const examples = files.filter((f) => f.type === "example");
    if (examples.length > 0) {
      content += `### Examples\n\n`;
      for (const example of examples) {
        const url = `https://raw.githubusercontent.com/clix-so/skills/refs/heads/main/${example.relativePath}`;
        content += `- [${example.title}](${url}): ${example.description || "Code example"}\n`;
      }
      content += `\n`;
    }

    // Scripts
    const scripts = files.filter((f) => f.type === "script");
    if (scripts.length > 0) {
      content += `### Scripts\n\n`;
      for (const script of scripts) {
        const url = `https://raw.githubusercontent.com/clix-so/skills/refs/heads/main/${script.relativePath}`;
        content += `- [${script.title}](${url}): ${script.description || "Utility script"}\n`;
      }
      content += `\n`;
    }

    content += `---\n\n`;
  }

  return content;
}

/**
 * Main function
 */
async function main() {
  console.log("Generating llms.txt for Clix Agent Skills...");

  if (!fs.existsSync(skillsDir)) {
    console.error(`Skills directory not found: ${skillsDir}`);
    process.exit(1);
  }

  const allFiles: SkillFile[] = [];
  const skillDirs = fs.readdirSync(skillsDir);

  for (const skillName of skillDirs) {
    const skillPath = path.join(skillsDir, skillName);
    if (fs.statSync(skillPath).isDirectory()) {
      console.log(`Scanning skill: ${skillName}`);
      const files = scanSkill(skillName, skillPath);
      allFiles.push(...files);
      console.log(`  Found ${files.length} files`);
    }
  }

  console.log(`\nTotal files indexed: ${allFiles.length}`);

  const llmsContent = generateLlmsTxt(allFiles);
  fs.writeFileSync(outputPath, llmsContent, "utf-8");

  console.log(`\n✅ Generated llms.txt at: ${outputPath}`);
  console.log(`   Skills: ${new Set(allFiles.map((f) => f.skillName)).size}`);
  console.log(`   Files: ${allFiles.length}`);
}

main().catch((error) => {
  console.error("Error generating llms.txt:", error);
  process.exit(1);
});
