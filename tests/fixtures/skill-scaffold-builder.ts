/**
 * Test fixtures and builders for skill scaffold testing
 *
 * Following Google/Meta test engineering practices:
 * - Builder pattern for flexible test data creation
 * - Immutable fixtures for test isolation
 * - Reusable components for DRY principles
 * - Type-safe test data
 */

import fs from "fs";
import path from "path";

/**
 * Skill metadata configuration
 */
export interface SkillMetadata {
  name: string;
  displayName: string;
  shortDescription: string;
  description: string;
  userInvocable: boolean;
}

/**
 * Skill structure configuration
 */
export interface SkillStructure {
  hasSKILLMd: boolean;
  hasLicense: boolean;
  referenceFiles: string[];
  scriptFiles: string[];
  exampleFiles: string[];
  mcpReference: boolean;
}

/**
 * Frontmatter configuration
 */
export interface FrontmatterConfig {
  hasName: boolean;
  hasDisplayName: boolean;
  hasShortDescription: boolean;
  hasDescription: boolean;
  hasUserInvocable: boolean;
  namePrefix: string;
  userInvocableValue: string | boolean;
}

/**
 * Builder for creating test skill scaffolds
 *
 * Example usage:
 * ```typescript
 * const skill = new SkillScaffoldBuilder()
 *   .withName("test-skill")
 *   .withMcpReference(false)
 *   .build(tmpDir);
 * ```
 */
export class SkillScaffoldBuilder {
  private metadata: SkillMetadata = {
    name: "test-skill",
    displayName: "Test Skill",
    shortDescription: "A test skill",
    description: "This is a test skill for validation",
    userInvocable: true,
  };

  private structure: SkillStructure = {
    hasSKILLMd: true,
    hasLicense: true,
    referenceFiles: ["guide.md"],
    scriptFiles: ["validate.sh"],
    exampleFiles: [],
    mcpReference: true,
  };

  private frontmatter: FrontmatterConfig = {
    hasName: true,
    hasDisplayName: true,
    hasShortDescription: true,
    hasDescription: true,
    hasUserInvocable: true,
    namePrefix: "clix-",
    userInvocableValue: true,
  };

  private customSKILLMdContent: string | null = null;
  private inSkillsDir: boolean = true;

  /**
   * Set skill name
   */
  withName(name: string): this {
    this.metadata.name = name;
    return this;
  }

  /**
   * Set display name
   */
  withDisplayName(displayName: string): this {
    this.metadata.displayName = displayName;
    return this;
  }

  /**
   * Control whether skill is in skills/ directory
   */
  inSkillsDirectory(value: boolean): this {
    this.inSkillsDir = value;
    return this;
  }

  /**
   * Set whether SKILL.md exists
   */
  withSKILLMd(value: boolean): this {
    this.structure.hasSKILLMd = value;
    return this;
  }

  /**
   * Set whether LICENSE.txt exists
   */
  withLicense(value: boolean): this {
    this.structure.hasLicense = value;
    return this;
  }

  /**
   * Set reference files
   */
  withReferenceFiles(...files: string[]): this {
    this.structure.referenceFiles = files;
    return this;
  }

  /**
   * Set script files
   */
  withScriptFiles(...files: string[]): this {
    this.structure.scriptFiles = files;
    return this;
  }

  /**
   * Set example files
   */
  withExampleFiles(...files: string[]): this {
    this.structure.exampleFiles = files;
    return this;
  }

  /**
   * Set whether MCP reference exists
   */
  withMcpReference(value: boolean): this {
    this.structure.mcpReference = value;
    return this;
  }

  /**
   * Remove a frontmatter field
   */
  withoutFrontmatterField(field: keyof FrontmatterConfig): this {
    if (field.startsWith("has")) {
      (this.frontmatter as any)[field] = false;
    }
    return this;
  }

  /**
   * Set frontmatter name prefix
   */
  withNamePrefix(prefix: string): this {
    this.frontmatter.namePrefix = prefix;
    return this;
  }

  /**
   * Set user-invocable value (can be invalid for testing)
   */
  withUserInvocable(value: string | boolean): this {
    this.frontmatter.userInvocableValue = value;
    return this;
  }

  /**
   * Set custom SKILL.md content (bypasses builder logic)
   */
  withCustomSKILLMd(content: string): this {
    this.customSKILLMdContent = content;
    return this;
  }

  /**
   * Build the skill scaffold in the given directory
   * @returns Path to the created skill directory
   */
  build(tmpDir: string): string {
    const pathSegments = this.inSkillsDir ? ["skills", this.metadata.name] : [this.metadata.name];
    const skillDir = path.join(tmpDir, ...pathSegments);

    fs.mkdirSync(skillDir, { recursive: true });

    // Create SKILL.md
    if (this.structure.hasSKILLMd) {
      const content = this.customSKILLMdContent || this.generateSKILLMdContent();
      fs.writeFileSync(path.join(skillDir, "SKILL.md"), content, "utf8");
    }

    // Create LICENSE.txt
    if (this.structure.hasLicense) {
      fs.writeFileSync(path.join(skillDir, "LICENSE.txt"), this.generateLicenseContent(), "utf8");
    }

    // Create references/
    if (this.structure.referenceFiles.length > 0) {
      const refDir = path.join(skillDir, "references");
      fs.mkdirSync(refDir);
      for (const file of this.structure.referenceFiles) {
        fs.writeFileSync(
          path.join(refDir, file),
          `# Reference: ${file}\n\nReference content.`,
          "utf8"
        );
      }
    }

    // Create scripts/
    if (this.structure.scriptFiles.length > 0) {
      const scriptsDir = path.join(skillDir, "scripts");
      fs.mkdirSync(scriptsDir);
      for (const file of this.structure.scriptFiles) {
        fs.writeFileSync(
          path.join(scriptsDir, file),
          `#!/usr/bin/env bash\n# ${file}\necho "test"\nexit 0\n`,
          "utf8"
        );
      }
    }

    // Create examples/
    if (this.structure.exampleFiles.length > 0) {
      const examplesDir = path.join(skillDir, "examples");
      fs.mkdirSync(examplesDir);
      for (const file of this.structure.exampleFiles) {
        fs.writeFileSync(
          path.join(examplesDir, file),
          `# Example: ${file}\nexample: content\n`,
          "utf8"
        );
      }
    }

    return skillDir;
  }

  /**
   * Generate SKILL.md content based on configuration
   */
  private generateSKILLMdContent(): string {
    const frontmatter = this.generateFrontmatter();
    const mcpText = this.structure.mcpReference
      ? "This skill uses clix-mcp-server:search_docs and clix-mcp-server:search_sdk."
      : "This skill does not reference the MCP server.";

    return `${frontmatter}

# ${this.metadata.displayName}

${this.metadata.description}

${mcpText}

## Workflow

1. Step 1: Do something
2. Step 2: Do something else

## References

- [Reference Guide](references/guide.md)
`;
  }

  /**
   * Generate frontmatter based on configuration
   */
  private generateFrontmatter(): string {
    const lines: string[] = ["---"];

    if (this.frontmatter.hasName) {
      const fullName = `${this.frontmatter.namePrefix}${this.metadata.name}`;
      lines.push(`name: ${fullName}`);
    }

    if (this.frontmatter.hasDisplayName) {
      lines.push(`display-name: ${this.metadata.displayName}`);
    }

    if (this.frontmatter.hasShortDescription) {
      lines.push(`short-description: ${this.metadata.shortDescription}`);
    }

    if (this.frontmatter.hasDescription) {
      lines.push(`description: ${this.metadata.description}`);
    }

    if (this.frontmatter.hasUserInvocable) {
      lines.push(`user-invocable: ${this.frontmatter.userInvocableValue}`);
    }

    lines.push("---");
    return lines.join("\n");
  }

  /**
   * Generate LICENSE.txt content
   */
  private generateLicenseContent(): string {
    return `Copyright (c) 2026 Clix (https://clix.so/)

                             Apache License
                       Version 2.0, January 2004
                    http://www.apache.org/licenses/

[Full license text would go here...]
`;
  }
}

/**
 * Pre-built fixtures for common test scenarios
 */
export class SkillFixtures {
  /**
   * Valid, complete skill with all required components
   */
  static validComplete(): SkillScaffoldBuilder {
    return new SkillScaffoldBuilder()
      .withName("valid-complete")
      .withReferenceFiles("guide.md", "reference.md")
      .withScriptFiles("validate.sh", "helper.sh")
      .withExampleFiles("example1.yaml");
  }

  /**
   * Minimal valid skill (no examples)
   */
  static validMinimal(): SkillScaffoldBuilder {
    return new SkillScaffoldBuilder()
      .withName("valid-minimal")
      .withReferenceFiles("guide.md")
      .withScriptFiles("validate.sh")
      .withExampleFiles();
  }

  /**
   * Skill missing SKILL.md
   */
  static missingSKILLMd(): SkillScaffoldBuilder {
    return new SkillScaffoldBuilder().withName("missing-skill-md").withSKILLMd(false);
  }

  /**
   * Skill missing LICENSE.txt
   */
  static missingLicense(): SkillScaffoldBuilder {
    return new SkillScaffoldBuilder().withName("missing-license").withLicense(false);
  }

  /**
   * Skill with empty references directory
   */
  static emptyReferences(): SkillScaffoldBuilder {
    return new SkillScaffoldBuilder().withName("empty-refs").withReferenceFiles();
  }

  /**
   * Skill with empty scripts directory
   */
  static emptyScripts(): SkillScaffoldBuilder {
    return new SkillScaffoldBuilder().withName("empty-scripts").withScriptFiles();
  }

  /**
   * Skill without MCP reference
   */
  static noMcpReference(): SkillScaffoldBuilder {
    return new SkillScaffoldBuilder().withName("no-mcp").withMcpReference(false);
  }

  /**
   * Skill with invalid name (no clix- prefix)
   */
  static invalidNamePrefix(): SkillScaffoldBuilder {
    return new SkillScaffoldBuilder().withName("invalid-prefix").withNamePrefix("");
  }

  /**
   * Skill with invalid user-invocable value
   */
  static invalidUserInvocable(): SkillScaffoldBuilder {
    return new SkillScaffoldBuilder().withName("invalid-bool").withUserInvocable("yes");
  }

  /**
   * Skill missing frontmatter
   */
  static missingFrontmatter(): SkillScaffoldBuilder {
    return new SkillScaffoldBuilder()
      .withName("no-frontmatter")
      .withCustomSKILLMd("# No Frontmatter\n\nThis has no frontmatter.");
  }

  /**
   * Skill in wrong directory (not in skills/)
   */
  static wrongDirectory(): SkillScaffoldBuilder {
    return new SkillScaffoldBuilder().withName("wrong-dir").inSkillsDirectory(false);
  }
}

/**
 * Helper to create temporary directory with automatic cleanup tracking
 */
export class TempDirManager {
  private dirs: string[] = [];

  create(prefix: string): string {
    const tmpDir = fs.mkdtempSync(path.join(require("os").tmpdir(), prefix));
    this.dirs.push(tmpDir);
    return tmpDir;
  }

  cleanup(): void {
    for (const dir of this.dirs) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
    this.dirs = [];
  }
}
