import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

import { getConfig } from "./config/config.js";
import {
  AbstractAgent,
  LocalFunctionMcpServer,
  type AgentChatRequest,
  type AgentChatResponse,
  type AgentFunction,
} from "./core/agent.js";
import { local_tools } from "./tools/local/local.js";
import { logger } from "./log/logger.js";
import { SkillsLoader, type Skill } from "./tools/skills/skill.js";
type LangChainRunnableAgent = ReturnType<typeof createAgent>;
type AgentTool = {
  name: string;
  description: string;
  invoke(input: unknown): Promise<unknown>;
};

function normalizeMessageContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (
          typeof item === "object" &&
          item !== null &&
          "text" in item &&
          typeof item.text === "string"
        ) {
          return item.text;
        }

        return JSON.stringify(item);
      })
      .join("\n");
  }

  if (content == null) {
    return "";
  }

  return JSON.stringify(content, null, 2);
}

function getFilePathFromInput(input: unknown): string {
  if (typeof input === "string" && input.trim().length > 0) {
    return input.trim();
  }

  if (
    typeof input === "object" &&
    input !== null &&
    "filePath" in input &&
    typeof input.filePath === "string" &&
    input.filePath.trim().length > 0
  ) {
    return input.filePath.trim();
  }

  throw new Error('Skill "summarize_project_file" requires a "filePath".');
}

export class LangChainCliAgent extends AbstractAgent {
  private readonly runnableAgent: LangChainRunnableAgent;

  constructor(
    allTools: AgentTool[],
    loadedSkills: readonly Skill<z.ZodTypeAny>[],
    systemPrompt: string,
    model: ChatOpenAI,
  ) {
    logger.info("agent create");
    super({
      id: "cli-agent",
      name: "CLI Agent",
      description: "LangChain-powered CLI agent for local project assistance.",
    });

    this.runnableAgent = createAgent({
      model,
      tools: [...allTools],
      systemPrompt,
    });

    this.registerBuiltInFunctions(allTools);
    this.registerLoadedSkills(loadedSkills);
    this.registerBuiltInSkills();
    this.registerBuiltInMcpServer();
  }

  protected async doChat(
    request: AgentChatRequest,
  ): Promise<AgentChatResponse> {
    const result = await this.runnableAgent.invoke({
      messages: request.messages,
    });

    const lastMessage = result.messages.at(-1);

    return {
      message: {
        role: "assistant",
        content: normalizeMessageContent(lastMessage?.content),
      },
      raw: result,
    };
  }

  private registerBuiltInFunctions(toolList: readonly AgentTool[]): void {
    for (const tool of toolList) {
      const agentFunction: AgentFunction = {
        name: tool.name,
        description: tool.description,
        execute: async (input) => tool.invoke(input),
      };

      this.registerFunction(agentFunction);
    }
  }

  private registerLoadedSkills(loadedSkills: readonly Skill<z.ZodTypeAny>[]): void {
    for (const skill of loadedSkills) {
      this.registerSkill({
        name: skill.name,
        description: skill.description,
        inputSchema: skill.schema,
        execute: async (input) => skill.run(input as z.infer<typeof skill.schema>),
      });
    }
  }

  private registerBuiltInSkills(): void {
    this.registerSkill({
      name: "summarize_project_file",
      description:
        "Read a project file and explain what it does in beginner-friendly language.",
      execute: async (input, context) => {
        const filePath = getFilePathFromInput(input);
        const fileContent = await this.callFunction(
          "read_project_file",
          { filePath },
          context.runContext,
        );

        const result = await this.chat({
          messages: [
            {
              role: "system",
              content:
                "You explain code to beginners. Be concrete and focus on purpose and flow.",
            },
            {
              role: "user",
              content: [
                `Please explain the file "${filePath}".`,
                "Cover:",
                "1. What the file is responsible for",
                "2. The key functions or classes",
                "3. How it fits into the app",
                "",
                "File content:",
                String(fileContent),
              ].join("\n"),
            },
          ],
          context: context.runContext,
        });

        return result.message.content;
      },
    });
  }

  private registerBuiltInMcpServer(): void {
    this.registerMcpServer(
      new LocalFunctionMcpServer({
        id: "local-tools",
        name: "Local Tools",
        description:
          "Expose built-in project functions through an MCP-style server interface.",
        tools: this.listFunctions(),
      }),
    );
  }
}
/**
 * @name 控制台agent
 * @description 实现最基础的功能
 */
let cliAgentPromise: Promise<LangChainCliAgent> | undefined;

export async function createCliAgent(): Promise<LangChainCliAgent> {
  const config = getConfig();
  const model = new ChatOpenAI({
    model: config.model,
    temperature: 0,
    apiKey: config.apiKey,
    streamUsage: config.baseUrl ? false : true,
    ...(config.baseUrl
      ? {
          configuration: {
            baseURL: config.baseUrl,
          },
        }
      : {}),
  });

  const skillsLoader = new SkillsLoader();
  const loadedSkills = await skillsLoader.skillLoad();
  const skillTools = loadedSkills.map((skill) => skill.toTool());
  const allTools = [...local_tools, ...skillTools];

  return new LangChainCliAgent(
    allTools,
    loadedSkills,
    config.systemPrompt,
    model,
  );
}

export function getCliAgent(): Promise<LangChainCliAgent> {
  cliAgentPromise ??= createCliAgent();
  return cliAgentPromise;
}

export function resetCliAgent(): void {
  cliAgentPromise = undefined;
}
