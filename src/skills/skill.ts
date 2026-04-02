import * as z from "zod";
import { tool } from "langchain";
/**
 * @name 技能
 * @description 对应技能的描述信息
 */
export class Skill<TSchema extends z.ZodTypeAny> {
  constructor(
    public name: string,
    public description: string,
    public schema: TSchema,
    public path: string,
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
 * @name 技能管理
 * @description 负责技能加载以及技能校验，把对应的技能转化为LangChain的Tools
 */ 
export class SkillsManager{
    public skills: Skill<z.ZodTypeAny>[] = [];
}