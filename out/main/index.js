"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const child_process = require("child_process");
const fs = require("fs");
const events = require("events");
const icon = path.join(__dirname, "../../resources/icon.png");
function encodeCommand(command) {
  switch (command.type) {
    case "join": {
      return `c ${command.ip}
`;
    }
    case "leave":
      return `d
`;
  }
}
class VoipProcessController extends events.EventEmitter {
  constructor(options = {}) {
    super();
    this.options = options;
  }
  child = null;
  writeChain = Promise.resolve();
  stdoutBuffer = "";
  stderrBuffer = "";
  executablePath = null;
  resolveExecutablePath() {
    if (this.options.executablePath) return this.options.executablePath;
    if (this.executablePath) return this.executablePath;
    const exeName = process.platform === "win32" ? "voip.exe" : "voip";
    const candidates = [
      // Packaged app resources
      path.join(process.resourcesPath, exeName),
      path.join(process.resourcesPath, "voip", exeName),
      // Dev / workspace resources
      path.join(process.cwd(), "resources", exeName),
      path.join(process.cwd(), "resources", "voip", exeName),
      // Fallback for local dev if you built under src/cpp
      path.join(process.cwd(), "src", "cpp", exeName)
    ];
    const found = candidates.find((p) => fs.existsSync(p));
    if (!found) {
      throw new Error(
        `VOIP executable not found. Checked: ${candidates.join(", ")}. Create/copy it into resources/voip/${exeName} or build it under src/cpp/.`
      );
    }
    this.executablePath = found;
    return found;
  }
  async ensureStarted() {
    if (this.child && !this.child.killed) return;
    const executablePath = this.resolveExecutablePath();
    const child = child_process.spawn(executablePath, [], {
      stdio: ["pipe", "pipe", "pipe"]
    });
    this.child = child;
    this.stdoutBuffer = "";
    this.stderrBuffer = "";
    child.stdout?.on("data", (chunk) => {
      this.handleStdoutChunk(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      this.handleStderrChunk(chunk);
    });
    child.on("exit", (code, signal) => {
      const evt = {
        type: "log",
        source: "stderr",
        message: `voip process exited (code=${code}, signal=${signal})`
      };
      this.emit("voip:event", evt);
      this.child = null;
    });
  }
  handleStdoutChunk(chunk) {
    this.stdoutBuffer += chunk.toString("utf8");
    const parts = this.stdoutBuffer.split(/\r?\n/);
    this.stdoutBuffer = parts.pop() ?? "";
    for (const line of parts) {
      const evt = { type: "log", source: "stdout", message: line };
      this.emit("voip:event", evt);
    }
  }
  handleStderrChunk(chunk) {
    this.stderrBuffer += chunk.toString("utf8");
    const parts = this.stderrBuffer.split(/\r?\n/);
    this.stderrBuffer = parts.pop() ?? "";
    for (const line of parts) {
      const evt = { type: "log", source: "stderr", message: line };
      this.emit("voip:event", evt);
    }
  }
  async writeCommand(command) {
    await this.ensureStarted();
    if (!this.child || !this.child.stdin) throw new Error("voip child process stdin is not available");
    const encoded = encodeCommand(command);
    this.writeChain = this.writeChain.then(
      () => new Promise((resolve, reject) => {
        this.child?.stdin.write(encoded, (err) => err ? reject(err) : resolve());
      })
    );
    return this.writeChain;
  }
  async join(ip) {
    await this.writeCommand({ type: "join", ip });
  }
  async leave() {
    await this.writeCommand({ type: "leave" });
  }
  /**
   * Terminates the child process immediately.
   * Note: the C++ process also has a `d` command, but for safety we kill on stop.
   */
  async stop() {
    if (!this.child) return;
    const child = this.child;
    this.child = null;
    try {
      child.kill("SIGTERM");
    } catch {
    }
  }
}
let mainWindow = null;
const voipController = new VoipProcessController();
function createWindow() {
  const win = new electron.BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...process.platform === "linux" ? { icon } : {},
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });
  mainWindow = win;
  win.on("ready-to-show", () => {
    win.show();
  });
  win.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.electron");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  electron.ipcMain.on("ping", () => console.log("pong"));
  electron.ipcMain.handle("voip:ensureStarted", async () => {
    await voipController.ensureStarted();
    return { ok: true };
  });
  electron.ipcMain.handle("voip:join", async (_event, payload) => {
    const ip = payload?.ip;
    if (typeof ip !== "string" || ip.trim().length === 0) {
      throw new Error("voip:join requires payload { ip: string }");
    }
    await voipController.join(ip);
    return { ok: true };
  });
  electron.ipcMain.handle("voip:leave", async () => {
    await voipController.leave();
    return { ok: true };
  });
  electron.ipcMain.handle("voip:stop", async () => {
    await voipController.stop();
    return { ok: true };
  });
  voipController.on("voip:event", (evt) => {
    mainWindow?.webContents.send("voip:event", evt);
  });
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("before-quit", () => {
  voipController.stop().catch(() => {
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
