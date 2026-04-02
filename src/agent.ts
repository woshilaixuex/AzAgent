import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";

import { getConfig } from "./config/config.js";
import {
  AbstractAgent,
  LocalFunctionMcpServer,
  type AgentChatRequest,
  type AgentChatResponse,
  type AgentFunction,
} from "./core/agent.js";
import { tools } from "./tools/tools.js";
import { local_tools } from "./tools/local.js";
import { logger } from "./log/logger.js";
type LangChainRunnableAgent = ReturnType<typeof createAgent>;
type LangChainTool = (typeof tools)[number];

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

  constructor() {
    logger.info("agent create")
    super({
      id: "cli-agent",
      name: "CLI Agent",
      description: "LangChain-powered CLI agent for local project assistance.",
    });

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
    const allTools = [...tools, ...local_tools];
    this.runnableAgent = createAgent({
      model,
      tools: allTools,
      systemPrompt: config.systemPrompt,
    });

    this.registerBuiltInFunctions(tools);
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

  private registerBuiltInFunctions(toolList: readonly LangChainTool[]): void {
    for (const tool of toolList) {
      const invoker = tool as {
        name: string;
        description: string;
        invoke(input: unknown): Promise<unknown>;
      };

      const agentFunction: AgentFunction = {
        name: invoker.name,
        description: invoker.description,
        execute: async (input) => invoker.invoke(input),
      };

      this.registerFunction(agentFunction);
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

export function createCliAgent(): LangChainCliAgent {
  return new LangChainCliAgent();
}
