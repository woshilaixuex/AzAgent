import test from "node:test";
import assert from "node:assert/strict";

import {
  AbstractAgent,
  InMemoryAgentRegistry,
  LocalFunctionMcpServer,
  type AgentChatRequest,
  type AgentChatResponse,
} from "../src/core/agent.js";

class EchoAgent extends AbstractAgent {
  constructor() {
    super({
      id: "echo-agent",
      name: "Echo Agent",
      description: "Test agent used to verify the base abstractions.",
    });

    this.registerFunction({
      name: "echo_function",
      description: "Return the input as-is.",
      execute: async (input) => input,
    });

    this.registerSkill({
      name: "echo_skill",
      description: "Use the registered function to echo input.",
      execute: async (input, context) =>
        this.callFunction("echo_function", input, context.runContext),
    });

    this.registerMcpServer(
      new LocalFunctionMcpServer({
        id: "local",
        name: "Local",
        tools: this.listFunctions(),
      }),
    );
  }

  protected async doChat(
    request: AgentChatRequest,
  ): Promise<AgentChatResponse> {
    const lastMessage = request.messages.at(-1)?.content ?? "";

    return {
      message: {
        role: "assistant",
        content: `echo:${lastMessage}`,
      },
    };
  }
}

test("AbstractAgent exposes chat, skill, function, and mcp capabilities", () => {
  const agent = new EchoAgent();

  assert.equal(agent.supports("chat"), true);
  assert.equal(agent.supports("skill"), true);
  assert.equal(agent.supports("function_call"), true);
  assert.equal(agent.supports("mcp"), true);
});

test("AbstractAgent executes registered skills and functions", async () => {
  const agent = new EchoAgent();

  const functionResult = await agent.callFunction("echo_function", "hello");
  const skillResult = await agent.executeSkill("echo_skill", "world");

  assert.equal(functionResult, "hello");
  assert.equal(skillResult, "world");
});

test("AbstractAgent can call tools through the MCP adapter", async () => {
  const agent = new EchoAgent();
  const result = await agent.callMcpTool("local", "echo_function", "from mcp");

  assert.equal(result, "from mcp");
});

test("InMemoryAgentRegistry indexes agents by capability", () => {
  const registry = new InMemoryAgentRegistry();
  const agent = new EchoAgent();

  registry.register(agent);

  assert.equal(registry.get("echo-agent"), agent);
  assert.deepEqual(registry.findByCapability("skill"), [agent]);
});
