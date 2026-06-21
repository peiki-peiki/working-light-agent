import { spawn } from "node:child_process";
import net from "node:net";

const port = 5173;
const host = "localhost";
const devServerUrl = `http://${host}:${port}`;

function log(message) {
  console.log(`[agent-light:dev] ${message}`);
}

function run(command, args, options = {}) {
  log(`running: ${[command, ...args].join(" ")}`);
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options
  });

  child.on("error", (error) => {
    console.error(`[agent-light:dev] failed to start ${command}:`, error);
  });

  return child;
}

function createElectronEnv() {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  env.VITE_DEV_SERVER_URL = devServerUrl;
  return env;
}

function waitForPort(targetPort, targetHost, child) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (result) => {
      if (done) {
        return;
      }
      done = true;
      resolve(result);
    };

    const tryConnect = () => {
      const socket = net.createConnection({ port: targetPort, host: targetHost });
      socket.once("connect", () => {
        socket.end();
        finish(true);
      });
      socket.once("error", () => {
        socket.destroy();
        if (!done) {
          setTimeout(tryConnect, 250);
        }
      });
    };

    child.once("exit", () => finish(false));
    tryConnect();
  });
}

log("compiling Electron main process");
const build = run("pnpm", ["run", "build:main"]);
build.on("exit", async (code) => {
  if (code !== 0) {
    console.error(`[agent-light:dev] main process compile failed with exit code ${code ?? 1}`);
    process.exit(code ?? 1);
  }

  log("main process compiled");
  log("starting Vite dev server");
  const vite = run("pnpm", ["exec", "vite", "--", "--host", host, "--port", String(port), "--strictPort"]);
  const viteReady = await waitForPort(port, host, vite);
  if (!viteReady) {
    console.error(`[agent-light:dev] Vite exited before ${devServerUrl} became ready. Port ${port} may already be in use.`);
    process.exit(1);
  }

  log(`Vite ready at ${devServerUrl}`);
  log(`launching Electron with VITE_DEV_SERVER_URL=${devServerUrl}`);
  const electron = run("pnpm", ["exec", "electron", "."], {
    env: createElectronEnv()
  });

  electron.on("exit", (exitCode, signal) => {
    log(`Electron exited with code ${exitCode ?? "null"}${signal ? ` and signal ${signal}` : ""}`);
    vite.kill();
    process.exit(exitCode ?? 0);
  });
});
