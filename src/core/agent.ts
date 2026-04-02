export type AgentCapability =
  | "chat"
  | "skill"
  | "function_call"
  | "mcp";

export type ApplactionRole = "system" | "user" | "assistant" | "tool";

export interface AgentMessage {
  role: ApplactionRole;
  content: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentProfile {
  id: string;
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentRegistry {
  register(agent: Agent): void;
  unregister(agentId: string): boolean;
  get(agentId: string): Agent | undefined;
  list(): Agent[];
  findByCapability(capability: AgentCapability): Agent[];
}

export interface AgentRunContext {
  sessionId?: string;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
  sharedState?: Map<string, unknown>;
  registry?: AgentRegistry;
}

export interface AgentExecutionContext {
  agent: Agent;
  runContext: AgentRunContext;
}

export interface AgentChatRequest {
  messages: AgentMessage[];
  context?: AgentRunContext;
}

export interface AgentChatResponse {
  message: AgentMessage;
  raw?: unknown;
}

export interface AgentSkill<Input = unknown, Output = unknown> {
  name: string;
  description: string;
  inputSchema?: unknown;
  execute(
    input: Input,
    context: AgentExecutionContext,
  ): Promise<Output> | Output;
}

export interface AgentFunction<Input = unknown, Output = unknown> {
  name: string;
  description: string;
  inputSchema?: unknown;
  execute(
    input: Input,
    context: AgentExecutionContext,
  ): Promise<Output> | Output;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema?: unknown;
}

export interface McpServer {
  id: string;
  name: string;
  description?: string;
  listTools(): Promise<McpToolDefinition[]> | McpToolDefinition[];
  callTool(
    toolName: string,
    input: unknown,
    context: AgentExecutionContext,
  ): Promise<unknown> | unknown;
}

export interface Agent {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly capabilities: ReadonlySet<AgentCapability>;

  supports(capability: AgentCapability): boolean;
  chat(request: AgentChatRequest): Promise<AgentChatResponse>;

  registerSkill(skill: AgentSkill): this;
  registerFunction(agentFunction: AgentFunction): this;
  registerMcpServer(server: McpServer): this;

  listSkills(): AgentSkill[];
  listFunctions(): AgentFunction[];
  listMcpServers(): McpServer[];

  executeSkill(
    name: string,
    input: unknown,
    context?: AgentRunContext,
  ): Promise<unknown>;
  callFunction(
    name: string,
    input: unknown,
    context?: AgentRunContext,
  ): Promise<unknown>;
  callMcpTool(
    serverId: string,
    toolName: string,
    input: unknown,
    context?: AgentRunContext,
  ): Promise<unknown>;
}

export abstract class AbstractAgent implements Agent {
  public readonly id: string;
  public readonly name: string;
  public readonly description?: string;

  private readonly baseCapabilities = new Set<AgentCapability>(["chat"]);
  private readonly skillRegistry = new Map<string, AgentSkill>();
  private readonly functionRegistry = new Map<string, AgentFunction>();
  private readonly mcpRegistry = new Map<string, McpServer>();

  protected constructor(profile: AgentProfile) {
    this.id = profile.id;
    this.name = profile.name;

    if (profile.description) {
      this.description = profile.description;
    }
  }

  public get capabilities(): ReadonlySet<AgentCapability> {
    const capabilities = new Set(this.baseCapabilities);

    if (this.skillRegistry.size > 0) {
      capabilities.add("skill");
    }

    if (this.functionRegistry.size > 0) {
      capabilities.add("function_call");
    }

    if (this.mcpRegistry.size > 0) {
      capabilities.add("mcp");
    }

    return capabilities;
  }

  public supports(capability: AgentCapability): boolean {
    return this.capabilities.has(capability);
  }

  public async chat(request: AgentChatRequest): Promise<AgentChatResponse> {
    return this.doChat(request);
  }

  public registerSkill(skill: AgentSkill): this {
    this.skillRegistry.set(skill.name, skill);
    return this;
  }

  public registerFunction(agentFunction: AgentFunction): this {
    this.functionRegistry.set(agentFunction.name, agentFunction);
    return this;
  }

  public registerMcpServer(server: McpServer): this {
    this.mcpRegistry.set(server.id, server);
    return this;
  }

  public listSkills(): AgentSkill[] {
    return Array.from(this.skillRegistry.values());
  }

  public listFunctions(): AgentFunction[] {
    return Array.from(this.functionRegistry.values());
  }

  public listMcpServers(): McpServer[] {
    return Array.from(this.mcpRegistry.values());
  }

  public async executeSkill(
    name: string,
    input: unknown,
    context?: AgentRunContext,
  ): Promise<unknown> {
    const skill = this.skillRegistry.get(name);

    if (!skill) {
      throw new Error(`Skill "${name}" is not registered on agent "${this.id}".`);
    }

    return skill.execute(input, this.createExecutionContext(context));
  }

  public async callFunction(
    name: string,
    input: unknown,
    context?: AgentRunContext,
  ): Promise<unknown> {
    const agentFunction = this.functionRegistry.get(name);

    if (!agentFunction) {
      throw new Error(
        `Function "${name}" is not registered on agent "${this.id}".`,
      );
    }

    return agentFunction.execute(input, this.createExecutionContext(context));
  }

  public async callMcpTool(
    serverId: string,
    toolName: string,
    input: unknown,
    context?: AgentRunContext,
  ): Promise<unknown> {
    const server = this.mcpRegistry.get(serverId);

    if (!server) {
      throw new Error(
        `MCP server "${serverId}" is not registered on agent "${this.id}".`,
      );
    }

    return server.callTool(
      toolName,
      input,
      this.createExecutionContext(context),
    );
  }

  protected createExecutionContext(
    context?: AgentRunContext,
  ): AgentExecutionContext {
    return {
      agent: this,
      runContext: context ?? {},
    };
  }

  protected abstract doChat(
    request: AgentChatRequest,
  ): Promise<AgentChatResponse>;
}

export class LocalFunctionMcpServer implements McpServer {
  public readonly id: string;
  public readonly name: string;
  public readonly description?: string;

  private readonly tools = new Map<string, AgentFunction>();

  constructor(options: {
    id: string;
    name: string;
    description?: string;
    tools: Iterable<AgentFunction>;
  }) {
    this.id = options.id;
    this.name = options.name;

    if (options.description) {
      this.description = options.description;
    }

    for (const tool of options.tools) {
      this.tools.set(tool.name, tool);
    }
  }

  public listTools(): McpToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => {
      const definition: McpToolDefinition = {
        name: tool.name,
        description: tool.description,
      };

      if ("inputSchema" in tool && tool.inputSchema) {
        definition.inputSchema = tool.inputSchema;
      }

      return definition;
    });
  }

  public async callTool(
    toolName: string,
    input: unknown,
    context: AgentExecutionContext,
  ): Promise<unknown> {
    const tool = this.tools.get(toolName);

    if (!tool) {
      throw new Error(`MCP tool "${toolName}" is not available on "${this.id}".`);
    }

    return tool.execute(input, context);
  }
}

export class InMemoryAgentRegistry implements AgentRegistry {
  private readonly agents = new Map<string, Agent>();

  public register(agent: Agent): void {
    this.agents.set(agent.id, agent);
  }

  public unregister(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  public get(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  public list(): Agent[] {
    return Array.from(this.agents.values());
  }

  public findByCapability(capability: AgentCapability): Agent[] {
    return this.list().filter((agent) => agent.supports(capability));
  }
}
