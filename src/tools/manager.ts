import { logger } from "../log/logger.js";
import { local_tools } from "./local/local.js";
import { SkillsLoader } from "./skills/skill.js";
import { ManagedTool,CanManaged,toTools,isManagedCollection} from "./tools.js";

/**
 * @name 工具调用请求
 * @description
 */
export interface ToolRequest {
  name: string;
  input?: unknown;
}
/**
 * @name 工具调用返回
 * @description
 */
export interface ToolResponse {
  name: string;
  output: unknown;
}
/**
 * @name 工具管理器
 * @description 负责工具管理，将function call、skills、mcp变成tools并加载，支持热加载
 * 
 */
export class ToolsManager {
  public tools : ManagedTool[] = [];

  registerTools(managed: CanManaged | readonly CanManaged[]): ManagedTool[] {
    if (isManagedCollection(managed)) {
      const normalizedTools = toTools(managed);
      this.tools.push(...normalizedTools);
      return normalizedTools;
    }

    const normalizedTool = toTools(managed);
    this.tools.push(normalizedTool);
    return [normalizedTool];
  }

  logOutTools(): string[] {
    return this.tools.map((item) => `${item.source}:${item.name}`);
  }

  async callTools(request: ToolRequest): Promise<ToolResponse> {
    const targetTool = this.tools.find((item) => item.name === request.name);

    if (!targetTool) {
      throw new Error(`Tool "${request.name}" is not registered.`);
    }

    const output = await targetTool.tool.invoke(request.input);

    return {
      name: targetTool.name,
      output,
    };
  }
}
/**
 * @name 创建工具管理器
 * @description 主要用于管理器的初始化，加载初始化skills、mcp、local function进管理器
 * @returns 工具管理器
 */
export async function createToolsManager(): Promise<ToolsManager> {
    var toolsManager = new ToolsManager();
    const skillsLoader = new SkillsLoader();
    const loadedSkills = await skillsLoader.skillLoad();
    toolsManager.registerTools(loadedSkills)
    logger.info("注册skills成功")
    
    return toolsManager;
}