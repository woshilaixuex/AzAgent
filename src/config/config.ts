import "dotenv/config";

import { z } from "zod";

const logLevelSchema = z.enum([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
]);

/**
 * @description 数据校验
 */
const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  OPENAI_BASE_URL: z.string().trim().optional(),
  AGENT_SYSTEM_PROMPT: z
    .string()
    .default("You are a concise and helpful CLI agent."),
  LOG_LEVEL: logLevelSchema.default("info"),
  LOG_FILE: z.string().default("logs/app.log"),
  LOG_SYNC: z
    .string()
    .default("true")
    .transform((value) => value.trim().toLowerCase())
    .pipe(z.enum(["true", "false"]))
    .transform((value) => value === "true"),
});

/**
 * @description 应用配置信息
 */
export interface AppConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  systemPrompt: string;
  loggerConfig: LoggerConfig;
}

/**
 * @description 日志配置信息
 */
export interface LoggerConfig {
  level: z.infer<typeof logLevelSchema>;
  dest: string;
  sync: boolean;
}

export function getConfig(): AppConfig {
  const env = envSchema.parse(process.env);

  const config: AppConfig = {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    systemPrompt: env.AGENT_SYSTEM_PROMPT,
    loggerConfig: {
      level: env.LOG_LEVEL,
      dest: env.LOG_FILE,
      sync: env.LOG_SYNC,
    },
  };

  if (env.OPENAI_BASE_URL) {
    config.baseUrl = env.OPENAI_BASE_URL;
  }

  return config;
}
