import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import { join, dirname } from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import express from 'express';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

let mainWindow = null;
let dbConnection = null;
let httpServer = null;

// Crash log directory
const logDir = join(__dirname, 'crash_logs');

// Ensure crash_logs directory exists
async function ensureLogDir() {
    try {
        await fs.mkdir(logDir, { recursive: true });
    } catch (err) {
        console.error('Failed to create crash_logs directory:', err.message);
    }
}

// Write crash log to file
async function writeCrashLog(error, context = 'General') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = join(logDir, `crash_log_${timestamp}.txt`);
    const logContent = `Crash Report - ${context}
Timestamp: ${new Date().toISOString()}
Error: ${error.message || 'Unknown error'}
Stack: ${error.stack || 'No stack trace available'}
Platform: ${process.platform}
Node Version: ${process.version}
Electron Version: ${process.versions.electron}
----------------------------------------\n`;

    try {
        await fs.appendFile(logFile, logContent);
        console.log(`Crash log saved to ${logFile} *chao chao*`);
    } catch (err) {
        console.error('Failed to write crash log:', err.message);
    }
}

// Global error handlers
process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error);
    await writeCrashLog(error, 'Uncaught Exception');
    app.quit();
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'Reason:', reason);
    await writeCrashLog(reason instanceof Error ? reason : new Error(String(reason)), 'Unhandled Rejection');
});

async function connectDB() {
    try {
        dbConnection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            user: process.env.DB_USER || 'game_user',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'game_db'
        });
        console.log('Connected to MySQL! *chao chao*');
        return dbConnection;
    } catch (error) {
        console.error('Failed to connect to MySQL:', error.message);
        await writeCrashLog(error, 'MySQL Connection');
        return null;
    }
}

async function createWindow() {
    // Disable Chromium features
    app.commandLine.appendSwitch('no-sandbox');
    app.commandLine.appendSwitch('disable-gpu');
    app.commandLine.appendSwitch('disable-features', 'Spellcheck,WebRTC,WebGL,Autofill,FontsNetwork,MediaSession,Geolocation,WebSQL,WebAudio');
    app.commandLine.appendSwitch('disable-background-timer-throttling');
    app.commandLine.appendSwitch('disable-renderer-backgrounding');

    // Resolve icon path
    const iconPath = join(__dirname, 'src', 'img', 'logo', 'favicon.ico');
    try {
        await fs.access(iconPath);
        console.log(`Icon found at: ${iconPath} *giggles*`);
    } catch (error) {
        console.warn(`Icon not found at: ${iconPath}, proceeding without icon *pouts*`);
    }

    mainWindow = new BrowserWindow({
        width: 800,
        height: 800,
        icon: iconPath,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            sandbox: false,
            devTools: false
        },
        autoHideMenuBar: true,
        menuBarVisible: false
    });

    // Remove menu bar
    Menu.setApplicationMenu(null);
    console.log('Application menu bar disabled! *twirls*');

    // Start Express server
    const server = express();
    server.use(express.static(__dirname));
    const PORT = process.env.PORT || 3000;
    httpServer = http.createServer(server);
    httpServer.on('error', async (error) => {
        console.error('Express server error:', error.message);
        await writeCrashLog(error, 'Express Server');
        if (error.code === 'EADDRINUSE') {
            console.warn(`Port ${PORT} is in use, trying port ${PORT + 1} *pouts*`);
            httpServer.listen(PORT + 1, 'localhost');
        }
    });
    httpServer.listen(PORT, 'localhost', () => {
        console.log(`Mini-server running at http://localhost:${PORT} *twirls*`);
    });

    // Load main_game.html via Express
    const pageUrl = `http://localhost:${PORT}/src/main_game.html`;
    try {
        await mainWindow.loadURL(pageUrl);
        console.log(`Loaded page: ${pageUrl} *giggles*`);
    } catch (error) {
        console.error('Failed to load page:', error);
        await writeCrashLog(error, 'Page Load');
    }

    // Handle renderer process crashes
    mainWindow.webContents.on('render-process-gone', async (event, details) => {
        const error = new Error(`Renderer process crashed: ${details.reason}`);
        console.error(error.message);
        await writeCrashLog(error, 'Renderer Process Crash');
    });

    // Handle reload IPC
    ipcMain.on('reload-window', () => {
        if (mainWindow) {
            console.log('Reloading window! *chao chao*');
            mainWindow.reload();
        }
    });
}

app.whenReady().then(async () => {
    await ensureLogDir();
    await connectDB();
    await createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
    if (dbConnection) {
        dbConnection.end();
        console.log('MySQL connection closed! *waves*');
    }
    if (httpServer) {
        httpServer.close(() => console.log('Mini-server stopped *chao chao*'));
    }
});

export { dbConnection };