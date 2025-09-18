import { app, BrowserWindow, Menu } from 'electron';
import { join, dirname } from 'path';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { mapHandler } from './game_engine/mapdata/maphandler.js';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

let dbConnection = null; // Global DB connection
let server = null; // Our lil' HTTP server

// Connect to MySQL
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
        return null;
    }
}

async function createWindow() {
    // Disable CORS for file:// (backup, but we use HTTP)
    app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');

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
        icon: iconPath, // Set window icon
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            sandbox: false, // Explicitly disabled as requested
            devTools: false,
            preload: join(__dirname, 'preload.js') // Secure preload script
        },
        autoHideMenuBar: true, // Hide menu bar (File, Edit, View, etc.)
        menuBarVisible: false // Ensure menu bar is not visible
    });

    // Explicitly remove the menu bar
    Menu.setApplicationMenu(null);
    console.log('Application menu bar disabled! *twirls*');

    // Block DevTools shortcuts (Ctrl+Shift+I, F12, Cmd+Opt+I)
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown') {
            if ((input.control && input.shift && input.key.toLowerCase() === 'i') ||
                input.key === 'F12' ||
                (input.meta && input.alt && input.key.toLowerCase() === 'i')) {
                console.log('Blocked DevTools shortcut attempt! *chao chao*');
                event.preventDefault();
            }
        }
    });

    // Additional check to ensure DevTools is disabled
    mainWindow.webContents.on('devtools-opened', () => {
        console.warn('DevTools opened unexpectedly, closing! *pouts*');
        mainWindow.webContents.closeDevTools();
    });

    // Spin up a tiny Express server to serve files over HTTP (fixes worker ESM loads!)
    server = express();
    server.use(express.static(__dirname)); // Serve all files from app root
    const PORT = 3000; // Or any free port
    server.listen(PORT, 'localhost', () => {
        console.log(`Mini-server running at http://localhost:${PORT} *twirls*`);
    });

    // Load over HTTP – workers love this!
    const pageUrl = `http://localhost:${PORT}/game_engine/main_game.html`;
    try {
        await mainWindow.loadURL(pageUrl);
        console.log(`Loaded page: ${pageUrl} *giggles*`);
    } catch (error) {
        console.error('Failed to load page:', error);
    }

    mainWindow.webContents.on('did-finish-load', async () => {
        try {
            const javaDir = join(__dirname, 'game_engine', 'java');
            const classFile = join(javaDir, 'Raycaster.class');
            const jsonFile = join(__dirname, 'game_engine', 'mapdata', 'mapjson', 'test_map.json');

            // Check if Java class exists
            const classExists = await fs.access(classFile).then(() => true).catch(() => false);
            if (!classExists) {
                const msg = `CLASS NOT FOUND at: ${classFile}`;
                console.error(msg);
                mainWindow.webContents.send('java-output', msg);
                return;
            }

            // Check if JSON map exists
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
                    return;
                }
            }

            // Cross-platform Java execution
            const command = `java -cp "${javaDir}" Raycaster < "${jsonFile}"`;
            console.log(`Running Java: ${command}`);
            exec(command, (error, stdout, stderr) => {
                console.log('--- JAVA RESULTS ---');
                if (stdout) console.log('STDOUT:', stdout);
                if (stderr) console.error('STDERR:', stderr);
                if (error) {
                    console.error('ERROR:', error);
                    mainWindow.webContents.send('java-output', `Error running Java: ${error.message}`);
                    return;
                }
                mainWindow.webContents.send('java-output', stdout || stderr);
            });
        } catch (error) {
            console.error('Unexpected error in did-finish-load:', error);
            mainWindow.webContents.send('java-output', `Unexpected error: ${error.message}`);
        }
    });
}

app.whenReady().then(async () => {
    await connectDB(); // Initialize DB connection
    await createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
    // Clean up DB and server
    if (dbConnection) {
        dbConnection.end();
        console.log('MySQL connection closed! *waves*');
    }
    if (server) {
        server.close(() => console.log('Mini-server stopped *chao chao*'));
    }
});

export { dbConnection }; // Export for other modules