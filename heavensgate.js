import { app, BrowserWindow, Menu } from 'electron';
import { join, dirname } from 'path';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { mapHandler } from './game_engine/mapdata/maphandler.js';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import express from 'express';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

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
    app.commandLine.appendSwitch('no-sandbox'); // As requested
    app.commandLine.appendSwitch('disable-gpu');
    app.commandLine.appendSwitch('disable-features', 'Spellcheck,WebRTC,WebGL,Autofill,FontsNetwork,MediaSession,Geolocation,WebSQL,WebAudio');
    app.commandLine.appendSwitch('disable-background-timer-throttling');
    app.commandLine.appendSwitch('disable-renderer-backgrounding');

    // Resolve icon path
    const iconPath = join(__dirname, 'game_engine', 'img', 'logo', 'favicon.ico');
    try {
        await fs.access(iconPath);
        console.log(`Icon found at: ${iconPath} *giggles*`);
    } catch (error) {
        console.warn(`Icon not found at: ${iconPath}, proceeding without icon *pouts*`);
    }

    const mainWindow = new BrowserWindow({
        width: 800,
        height: 800,
        icon: iconPath,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            sandbox: false, // Explicitly disabled as requested
            devTools: false,
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
    const PORT = 3000;
    httpServer = http.createServer(server);
    httpServer.listen(PORT, 'localhost', () => {
        console.log(`Mini-server running at http://localhost:${PORT} *twirls*`);
    });

    // Load index.html
    const pageUrl = `http://localhost:${PORT}/index.html`;
    try {
        await mainWindow.loadURL(pageUrl);
        console.log(`Loaded page: ${pageUrl} *giggles*`);
    } catch (error) {
        console.error('Failed to load page:', error);
        await writeCrashLog(error, 'Page Load');
    }

    mainWindow.webContents.on('did-finish-load', async () => {
        try {
            const javaDir = join(__dirname, 'game_engine', 'java');
            const classFile = join(javaDir, 'Raycaster.class');
            const jsonFile = join(__dirname, 'game_engine', 'mapdata', 'mapjson', 'test_map.json');

            const classExists = await fs.access(classFile).then(() => true).catch(() => false);
            if (!classExists) {
                const msg = `CLASS NOT FOUND at: ${classFile}`;
                console.error(msg);
                mainWindow.webContents.send('java-output', msg);
                await writeCrashLog(new Error(msg), 'Java Class Check');
                return;
            }

            const jsonExists = await fs.access(jsonFile).then(() => true).catch(() => false);
            if (!jsonExists) {
                try {
                    await mapHandler.loadMap('map_test', { x: 75.0, z: 75.0, angle: 0.0 });
                    await mapHandler.saveMapJson('map_test', jsonFile, { x: 75.0, z: 75.0, angle: 0.0 }, 1, {
                        startRay: 0,
                        endRay: 10,
                        playerFOV: 1.0471975511965976,
                        CANVAS_WIDTH: 800,
                        numCastRays: 300,
                        maxRayDepth: 50
                    });
                } catch (mapError) {
                    console.error('Error generating map JSON:', mapError);
                    mainWindow.webContents.send('java-output', `Error generating map JSON: ${mapError.message}`);
                    await writeCrashLog(mapError, 'Map JSON Generation');
                    return;
                }
            }

            const command = `java -cp "${javaDir}" Raycaster < "${jsonFile}"`;
            console.log(`Running Java: ${command}`);
            exec(command, (error, stdout, stderr) => {
                console.log('--- JAVA RESULTS ---');
                if (stdout) console.log('STDOUT:', stdout);
                if (stderr) console.error('STDERR:', stderr);
                if (error) {
                    console.error('ERROR:', error);
                    mainWindow.webContents.send('java-output', `Error running Java: ${error.message}`);
                    writeCrashLog(error, 'Java Execution');
                    return;
                }
                mainWindow.webContents.send('java-output', stdout || stderr);
            });
        } catch (error) {
            console.error('Unexpected error in did-finish-load:', error);
            mainWindow.webContents.send('java-output', `Unexpected error: ${error.message}`);
            await writeCrashLog(error, 'Did Finish Load');
        }
    });

    // Handle renderer process crashes
    mainWindow.webContents.on('render-process-gone', async (event, details) => {
        const error = new Error(`Renderer process crashed: ${details.reason}`);
        console.error(error.message);
        await writeCrashLog(error, 'Renderer Process Crash');
        app.quit();
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