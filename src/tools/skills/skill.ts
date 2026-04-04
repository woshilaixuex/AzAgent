import path from "node:path";
import { promises as fs } from "node:fs";

import { tool } from "langchain";
import * as z from "zod";

import type { CanManaged, ManagedRuntimeTool } from "../tools.js";

const SKILL_ROOT = path.resolve(process.cwd(), "skills");
const DEFAULT_BODY_FILES = ["README.md", "skill.md", "prompt.md", "body.md"];

const loadedSkillInputSchema = z.object({
  input: z
    .string()
    .optional()
    .describe("Optional user input that should be appended to the skill body."),
});

const skillManifestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  bodyFile: z.string().min(1).optional(),
});

export interface SkillDirectoryInfo {
  name: string;
  path: string;
}

export type SkillManifest = z.infer<typeof skillManifestSchema>;

/**
 * @name 技能
 * @description 对应技能的描述信息
 */
export class Skill<TSchema extends z.ZodTypeAny> implements CanManaged {
  public readonly source = "skill" as const;

  constructor(
    public name: string,
    public description: string,
    public path: string,
    public body: string,
    public dir: string,
    public schema: TSchema,
    public run: (input: z.infer<TSchema>) => Promise<string> | string,
  ) {}

  public toTool(): ManagedRuntimeTool {
    return tool(this.run, {
      name: this.name,
      description: this.description,
      schema: this.schema,
    });
  }
}

/**
 * @name 技能加载器
 * @description 负责技能加载以及技能校验，把对应的技能转化为LangChain的Tools
 */
export class SkillsLoader {
  public skills: Skill<typeof loadedSkillInputSchema>[] = [];

  constructor(private readonly rootDir: string = SKILL_ROOT) {}

  public async dirsLoad(): Promise<SkillDirectoryInfo[]> {
    try {
      const entries = await fs.readdir(this.rootDir, { withFileTypes: true });

      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
          name: entry.name,
          path: path.join(this.rootDir, entry.name),
        }))
        .sort((left, right) => left.name.localeCompare(right.name));
    } catch (error) {
      if (this.isMissingDirectoryError(error)) {
        return [];
      }

      throw error;
    }
  }

  public async skillLoad(): Promise<Skill<typeof loadedSkillInputSchema>[]> {
    const dirs = await this.dirsLoad();
    const skills = await Promise.all(dirs.map((dir) => this.loadSkill(dir)));

    this.skills = skills;
    return this.skills;
  }

  private async loadSkill(
    dir: SkillDirectoryInfo,
  ): Promise<Skill<typeof loadedSkillInputSchema>> {
    const manifest = await this.loadManifest(dir.path);
    const body = await this.loadBody(dir.path, manifest.bodyFile);
    const name = manifest.name ?? dir.name;
    const description =
      manifest.description ?? this.extractDescription(body, dir.name);

    return new Skill(
      name,
      description,
      dir.path,
      body,
      dir.name,
      loadedSkillInputSchema,
      async ({ input }) => this.composeSkillOutput(body, input),
    );
  }

  private async loadManifest(dirPath: string): Promise<SkillManifest> {
    const manifestPath = path.join(dirPath, "skill.json");

    try {
      const rawManifest = await fs.readFile(manifestPath, "utf8");
      return skillManifestSchema.parse(JSON.parse(rawManifest));
    } catch (error) {
      if (this.isMissingFileError(error)) {
        return {};
      }

      throw error;
    }
  }

  private async loadBody(
    dirPath: string,
    configuredBodyFile?: string,
  ): Promise<string> {
    const bodyFile = configuredBodyFile ?? (await this.findBodyFile(dirPath));

    if (!bodyFile) {
      return "";
    }

    return fs.readFile(path.join(dirPath, bodyFile), "utf8");
  }

  private async findBodyFile(dirPath: string): Promise<string | undefined> {
    for (const fileName of DEFAULT_BODY_FILES) {
      try {
        const stat = await fs.stat(path.join(dirPath, fileName));

        if (stat.isFile()) {
          return fileName;
        }
      } catch (error) {
        if (!this.isMissingFileError(error)) {
          throw error;
        }
      }
    }

    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .find((fileName) => fileName.endsWith(".md") || fileName.endsWith(".txt"));
  }

  private extractDescription(body: string, fallbackName: string): string {
    const firstContentLine = body
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .find((line) => line.length > 0);

    return firstContentLine ?? fallbackName;
  }

  private composeSkillOutput(body: string, input?: string): string {
    if (!input?.trim()) {
      return body;
    }

    if (!body.trim()) {
      return input.trim();
    }

    return `${body.trim()}\n\nUser input:\n${input.trim()}`;
  }

  private isMissingDirectoryError(error: unknown): boolean {
    return (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    );
  }

  private isMissingFileError(error: unknown): boolean {
    return (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    );
  }
}
