export type CliOptions = {
  help: boolean;
  prompt?: string;
};

export function parseCliArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    return { help: true };
  }

  const prompt = args.join(" ").trim();

  if (prompt.length > 0) {
    return {
      help: false,
      prompt,
    };
  }

  return {
    help: false,
  };
}

export function renderMessageContent(content: unknown): string {
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

export function helpText(): string {
  return [
    "LangChain CLI Agent",
    "",
    "Usage:",
    '  npm run dev -- "帮我总结这个项目"',
    "  npm run dev",
    "",
    "Environment:",
    "  Copy .env.example to .env and set OPENAI_API_KEY",
  ].join("\n");
}
