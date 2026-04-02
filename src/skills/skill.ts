import * as z from "zod";
import { tool } from "langchain";
import { promises as fs } from 'node:fs';
const SKILL_ROOT = "./skills"
/**
 * @name 技能
 * @description 对应技能的描述信息
 */
export class Skill<TSchema extends z.ZodTypeAny> {
  constructor(
    public name: string,
    public description: string,
    public path: string,
    public body: string,
    public dir: string,
    public schema: TSchema,
    public run: (input: z.infer<TSchema>) => Promise<string> | string,
  ) {}

  toTool() {
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
export class SkillsLoader{
    public skills: Skill<z.ZodTypeAny>[] = [];
    private async dirsLoad() {
        const entries = await fs.readdir(SKILL_ROOT, { withFileTypes: true });
        const skillDirs = entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);
        return skillDirs;
    }
    public async skillLoad(){
        var dirs = await this.dirsLoad()
        dirs.forEach(
            
        )
    }
}
