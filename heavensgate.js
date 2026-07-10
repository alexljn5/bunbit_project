import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import { join, dirname } from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

let mainWindow = null;
let httpServer = null;

const logDir = join(__dirname, 'crash_logs');

async function ensureLogDir() {
    await fs.mkdir(logDir, { recursive: true }).catch(() => { });
}

async function writeCrashLog(error, context = 'General') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = join(logDir, `crash_log_${timestamp}.txt`);

    const logContent = `Crash Report - ${context}
Time: ${new Date().toISOString()}
Error: ${error?.message || error}
Stack: ${error?.stack || 'N/A'}
----------------------------------------\n`;

    await fs.appendFile(logFile, logContent).catch(() => { });
}

process.on('uncaughtException', async (err) => {
    await writeCrashLog(err, 'UncaughtException');
});

process.on('unhandledRejection', async (reason) => {
    await writeCrashLog(reason, 'UnhandledRejection');
});

async function createWindow() {
    app.commandLine.appendSwitch('no-sandbox');

    const iconPath = join(__dirname, 'src', 'img', 'logo', 'favicon.ico');

    mainWindow = new BrowserWindow({
        width: 850,
        height: 850,
        icon: iconPath,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            sandbox: false,
        },
    });

    Menu.setApplicationMenu(null);

    const server = express();
    server.use(bodyParser.json());
    server.use(express.static(__dirname));

    const userDataPath = app.getPath('userData');
    const logsFolder = join(userDataPath, 'scary_logs');

    await fs.mkdir(logsFolder, { recursive: true });

    server.get('/player-logs', async (req, res) => {
        try {
            const files = await fs.readdir(logsFolder);
            const logs = [];

            for (const f of files) {
                if (f.endsWith('.json')) {
                    const raw = await fs.readFile(join(logsFolder, f), 'utf8');
                    logs.push(JSON.parse(raw));
                }
            }

            res.json(logs);
        } catch (e) {
            await writeCrashLog(e, 'GET player-logs');
            res.status(500).json({ error: 'failed' });
        }
    });

    server.post('/player-log', async (req, res) => {
        try {
            const data = req.body;
            const file = join(logsFolder, `log_${data.timestamp}.json`);
            await fs.writeFile(file, JSON.stringify(data, null, 2));
            res.json({ ok: true });
        } catch (e) {
            await writeCrashLog(e, 'POST player-log');
            res.status(500).json({ error: 'failed' });
        }
    });

    const PORT = Number(process.env.PORT || 3000);

    httpServer = http.createServer(server);

    httpServer.listen(PORT, 'localhost', async () => {
        console.log(`Server running on http://localhost:${PORT}`);

        const gameQuery = process.env.GAME_QUERY || '';
        const normalized = gameQuery && !gameQuery.startsWith('?')
            ? `?${gameQuery}`
            : gameQuery;

        const url = `http://localhost:${PORT}/src/main_game.html${normalized}`;

        try {
            await mainWindow.loadURL(url);
            console.log(`Loaded: ${url}`);

            mainWindow.webContents.openDevTools({ mode: 'right' });
        } catch (e) {
            console.error('Load failed:', e);
        }
    });

    mainWindow.webContents.on('render-process-gone', async (_, d) => {
        await writeCrashLog(new Error(d.reason), 'RendererCrash');
    });

    ipcMain.on('reload-window', () => {
        mainWindow?.reload();
    });
}

app.whenReady().then(async () => {
    await ensureLogDir();
    await createWindow();
});

app.on('window-all-closed', () => {
    if (httpServer) httpServer.close();
    if (process.platform !== 'darwin') app.quit();
});