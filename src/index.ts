import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import { createCliAgent } from "./agent.js";
import { parseCliArgs, helpText } from "./cli.js";
import type { AgentMessage } from "./core/agent.js";

async function runPrompt(
  prompt: string,
  history: AgentMessage[],
): Promise<{ reply: string; history: AgentMessage[] }> {
  const agent = createCliAgent();
  const result = await agent.chat({
    messages: [...history, { role: "user", content: prompt }],
  });

  const reply = result.message.content;

  return {
    reply,
    history: [
      ...history,
      { role: "user", content: prompt },
      { role: "assistant", content: reply },
    ],
  };
}

async function agentLoop(): Promise<void> {
  const rl = createInterface({ input, output });
  let history: AgentMessage[] = [];

  console.log("Interactive mode. 输入问题，或输入 /exit 退出。");

  try {
    while (true) {
      const line = (await rl.question("> ")).trim();

      if (line === "/exit" || line === "/quit") {
        break;
      }

      if (!line) {
        continue;
      }

      const result = await runPrompt(line, history);
      history = result.history;
      console.log(`\n${result.reply}\n`);
    }
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const options = parseCliArgs(process.argv);

  if (options.help) {
    console.log(helpText());
    return;
  }

  if (options.prompt) {
    const result = await runPrompt(options.prompt, []);
    console.log(result.reply);
    return;
  }

  await agentLoop();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to start agent: ${message}`);
  process.exitCode = 1;
});
