import path from "node:path";
import { promises as fs } from "node:fs";

import { tool } from "langchain";
import { z } from "zod";

const projectRoot = process.cwd();
const ignoredEntries = new Set(["node_modules", "dist", ".git"]);

function resolveProjectPath(relativePath: string): string {
  const resolvedPath = path.resolve(projectRoot, relativePath);
  const normalizedRoot = projectRoot.endsWith(path.sep)
    ? projectRoot
    : `${projectRoot}${path.sep}`;

  if (resolvedPath !== projectRoot && !resolvedPath.startsWith(normalizedRoot)) {
    throw new Error("Only files inside the current project can be accessed.");
  }

  return resolvedPath;
}

async function walkFiles(
  currentDir: string,
  remainingDepth: number,
  foundFiles: string[],
): Promise<void> {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoredEntries.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(currentDir, entry.name);
    const relativePath = path.relative(projectRoot, absolutePath) || ".";

    if (entry.isDirectory()) {
      if (remainingDepth > 0) {
        await walkFiles(absolutePath, remainingDepth - 1, foundFiles);
      }
      continue;
    }

    foundFiles.push(relativePath);
  }
}

const listProjectFiles = tool(
  async ({ maxDepth }) => {
    const foundFiles: string[] = [];
    await walkFiles(projectRoot, maxDepth, foundFiles);

    if (foundFiles.length === 0) {
      return "No project files found.";
    }

    return foundFiles.sort().join("\n");
  },
  {
    name: "list_project_files",
    description: "List files inside the current project directory.",
    schema: z.object({
      maxDepth: z.number().int().min(0).max(4).default(2),
    }),
  },
);

const readProjectFile = tool(
  async ({ filePath }) => {
    const absolutePath = resolveProjectPath(filePath);
    const rawContent = await fs.readFile(absolutePath, "utf8");

    if (rawContent.length <= 6000) {
      return rawContent;
    }

    return `${rawContent.slice(0, 6000)}\n\n[truncated]`;
  },
  {
    name: "read_project_file",
    description: "Read a UTF-8 text file from the current project.",
    schema: z.object({
      filePath: z.string().min(1).describe("Relative path inside the project"),
    }),
  },
);

const getCurrentTime = tool(
  async () =>
    new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "full",
      timeStyle: "long",
    }).format(new Date()),
  {
    name: "get_current_time",
    description: "Get the current local date and time.",
    schema: z.object({}),
  },
);

export const tools = [listProjectFiles, readProjectFile, getCurrentTime];

