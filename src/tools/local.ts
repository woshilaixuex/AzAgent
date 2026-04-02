import { tool } from "langchain";
import { z } from "zod";
const getWeather = tool(
  async ({ city }) => {
    return `${city} 今天天气晴，25°C`;
  },
  {
    name: "get_weather",
    description: "Get the weather for a city.",
    schema: z.object({
      city: z.string().min(1).describe("City name"),
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
    schema: z.object({}).describe("No input required")
  },
);

export const local_tools = [getWeather,getCurrentTime];