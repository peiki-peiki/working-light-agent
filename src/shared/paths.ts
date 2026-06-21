import os from "node:os";
import path from "node:path";

export const APP_DIRECTORY_NAME = "CodeAgentTrafficLight";

export interface AppPaths {
  dataDir: string;
  stateFile: string;
  preferencesFile: string;
  commandFile: string;
}

export function getDataDir(platform = process.platform, env = process.env): string {
  if (env.AGENT_LIGHT_HOME) {
    return env.AGENT_LIGHT_HOME;
  }

  if (platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", APP_DIRECTORY_NAME);
  }

  if (platform === "win32") {
    return path.join(env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"), APP_DIRECTORY_NAME);
  }

  return path.join(env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config"), APP_DIRECTORY_NAME);
}

export function getAppPaths(): AppPaths {
  const dataDir = getDataDir();
  return {
    dataDir,
    stateFile: path.join(dataDir, "state.json"),
    preferencesFile: path.join(dataDir, "preferences.json"),
    commandFile: path.join(dataDir, "command.json")
  };
}
