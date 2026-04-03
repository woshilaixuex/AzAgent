import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { SkillsLoader } from "../src/tools/skills/skill.js";

test("SkillsLoader.dirsLoad returns skill directory names and paths", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "skills-loader-"));
  const skillsRoot = path.join(tempRoot, "skills");

  await mkdir(path.join(skillsRoot, "writer"), { recursive: true });
  await mkdir(path.join(skillsRoot, "summarizer"), { recursive: true });

  const loader = new SkillsLoader(skillsRoot);
  const dirs = await loader.dirsLoad();

  assert.deepEqual(dirs, [
    { name: "summarizer", path: path.join(skillsRoot, "summarizer") },
    { name: "writer", path: path.join(skillsRoot, "writer") },
  ]);
});

test("SkillsLoader.skillLoad reads manifest and body into Skill instances", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "skills-loader-"));
  const skillsRoot = path.join(tempRoot, "skills");
  const writerRoot = path.join(skillsRoot, "writer");

  await mkdir(writerRoot, { recursive: true });
  await writeFile(
    path.join(writerRoot, "skill.json"),
    JSON.stringify({
      name: "writer-helper",
      description: "Assist with drafting text.",
      bodyFile: "prompt.md",
    }),
    "utf8",
  );
  await writeFile(
    path.join(writerRoot, "prompt.md"),
    "Write clearly and keep the answer actionable.",
    "utf8",
  );

  const loader = new SkillsLoader(skillsRoot);
  const skills = await loader.skillLoad();

  assert.equal(skills.length, 1);
  assert.equal(loader.skills.length, 1);
  assert.equal(skills[0]?.name, "writer-helper");
  assert.equal(skills[0]?.description, "Assist with drafting text.");
  assert.equal(skills[0]?.dir, "writer");
  assert.equal(skills[0]?.path, writerRoot);
  assert.equal(
    skills[0]?.body,
    "Write clearly and keep the answer actionable.",
  );

  const output = await skills[0]?.run({ input: "Draft a short release note." });
  assert.equal(
    output,
    "Write clearly and keep the answer actionable.\n\nUser input:\nDraft a short release note.",
  );
});

test("SkillsLoader falls back to README.md and first content line for description", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "skills-loader-"));
  const skillsRoot = path.join(tempRoot, "skills");
  const summarizerRoot = path.join(skillsRoot, "summarizer");

  await mkdir(summarizerRoot, { recursive: true });
  await writeFile(
    path.join(summarizerRoot, "README.md"),
    "Summarize long content.\n\nReturn only the key points.",
    "utf8",
  );

  const loader = new SkillsLoader(skillsRoot);
  const [skill] = await loader.skillLoad();

  assert.equal(skill?.name, "summarizer");
  assert.equal(skill?.description, "Summarize long content.");
  assert.equal(await skill?.run({}), await readFile(path.join(summarizerRoot, "README.md"), "utf8"));
});
