import { tool } from "langchain";
import { z } from "zod";

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

export const getWeather = tool(
  async ({ city, days = 3 }) => {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh&format=json`
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
  {
    name: "get_weather",
    description: "Get current weather and the next few days forecast by city name",
    schema: z.object({
      city: z.string().min(1).describe("City name"),
      days: z.number().int().min(1).max(7).default(3).describe("How many forecast days to return, including today"),
    }),
  }
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
const readDir = tool(
  async () =>{

  },
  {
    name: "readDir",
    description: "read dir",
  },
);
const readFile = tool(
  async () =>{

  },
  {
    name: "readFile",
    description: "read file.",
  },
);
export const local_tools = [getWeather,getCurrentTime];
