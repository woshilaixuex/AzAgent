import { tool } from "langchain";
import { z } from "zod";
import path from "node:path";
import { promises as fs } from "node:fs";

import type { CanManaged, ManagedRuntimeTool } from "../tools.js";
/**
 * @name 本地方法调用被管理对象
 */
export class LocalFC<TSchema extends z.ZodTypeAny> implements CanManaged {
  public readonly source = "local" as const;

  constructor(
    public name: string,
    public description: string,
    public schema: TSchema,
    public run: (input: z.infer<TSchema>) => Promise<string> | string,
  ) {}

  public toTool(): ManagedRuntimeTool {
    return tool(this.run, {
      name: this.name,
      description: this.description,
      schema: this.schema,
    });
  }
}
function describeWeatherCode(code: number): string {
  const weatherCodeMap: Record<number, string> = {
    0: '晴朗',
    1: '大部晴朗',
    2: '局部多云',
    3: '阴天',
    45: '有雾',
    48: '冻雾',
    51: '小毛毛雨',
    53: '毛毛雨',
    55: '强毛毛雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    80: '阵雨',
    81: '强阵雨',
    82: '暴雨阵雨',
    95: '雷暴',
  };

  return weatherCodeMap[code] ?? '未知天气';
}
/**
 * @name 获取天气
 * @description 获取
 */
export const getWeatherFunction = new LocalFC(
  "get_weather",
  "Get current weather and the next few days forecast by city name",
  z.object({
    city: z.string().min(1).describe("City name"),
    days: z.number().int().min(1).max(7).default(3).describe("How many forecast days to return, including today"),
  }),
  async ({ city, days = 3 }) => {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh&format=json`,
    );
    const geo = await geoRes.json();
    const place = geo.results?.[0];
    if (!place) {
      return `没有找到城市：${city}`;
    }

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=${days}&timezone=auto`
    );
    const weather = await weatherRes.json();
    const current = weather.current;
    const daily = weather.daily;

    const forecast = daily.time.map((date: string, index: number) => ({
      date,
      weatherCode: daily.weather_code[index],
      weather: describeWeatherCode(daily.weather_code[index]),
      maxTemperatureC: daily.temperature_2m_max[index],
      minTemperatureC: daily.temperature_2m_min[index],
      precipitationProbabilityMax: daily.precipitation_probability_max[index],
    }));

    return JSON.stringify({
      city: place.name,
      country: place.country,
      requestedDays: days,
      current: {
        temperatureC: current.temperature_2m,
        feelsLikeC: current.apparent_temperature,
        windSpeed: current.wind_speed_10m,
        weatherCode: current.weather_code,
        weather: describeWeatherCode(current.weather_code),
        time: current.time,
      },
      forecast,
    }, null, 2);
  },
);
/**
 * @name 获取当前时间
 * @description 获取当前所在时区的时间
 */
export const getCurrentTimeFunction = new LocalFC(
  "get_current_time",
  "Get the current local date and time.",
  z.object({}).describe("No input required"),
  async () =>
    new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "full",
      timeStyle: "long",
    }).format(new Date()),
);
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
/**
 * @name 列出当前项目的文件
 * @description 列出对应文件目录下的文件
 */
export const listProjectFilesFunction = new LocalFC(
  "list_project_files",
  "List files inside the current project directory.",
  z.object({
    maxDepth: z.number().int().min(0).max(4).default(2),
  }),
  async ({ maxDepth }) => {
    const foundFiles: string[] = [];
    await walkFiles(projectRoot, maxDepth, foundFiles);

    if (foundFiles.length === 0) {
      return "No project files found.";
    }

    return foundFiles.sort().join("\n");
  },
);
/**
 * @name 读取文件
 * @description 读取对应路径下的utf8文件
 */
export const readProjectFileFunction = new LocalFC(
  "read_project_file",
  "Read a UTF-8 text file from the current project.",
  z.object({
    filePath: z.string().min(1).describe("Relative path inside the project"),
  }),
  async ({ filePath }) => {
    const absolutePath = resolveProjectPath(filePath);
    const rawContent = await fs.readFile(absolutePath, "utf8");

    if (rawContent.length <= 6000) {
      return rawContent;
    }

    return `${rawContent.slice(0, 6000)}\n\n[truncated]`;
  },
);

export const localFunctions = [
  getWeatherFunction,
  getCurrentTimeFunction,
  listProjectFilesFunction,
  readProjectFileFunction,
] as const;

export const local_tools = localFunctions.map((item) => item.toTool());


