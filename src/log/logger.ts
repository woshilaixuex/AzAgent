import pino from "pino";
import { getConfig } from "../config/config.js";

const config = getConfig()
export const logger = pino(
  { level: config.loggerConfig.level },
  pino.destination({
    dest: config.loggerConfig.dest,
    sync: config.loggerConfig.sync,
  }),
);
