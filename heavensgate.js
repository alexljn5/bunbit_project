import { app, BrowserWindow } from 'electron';
import { join, dirname } from 'path';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { mapHandler } from './game_engine/mapdata/maphandler.js';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

let dbConnection = null; // Global DB connection

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

        // Optional test query to verify connection
        // const [rows] = await dbConnection.execute('SELECT 1 as ping');
        // console.log('DB ping:', rows);

        return dbConnection;
    } catch (error) {
        console.error('Failed to connect to MySQL:', error.message);
        // Optionally send error to renderer
        // mainWindow.webContents.send('db-error', error.message);
        return null;
    }
}

async function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: {
            nodeIntegration: true, // WARNING: Insecure for prod; use preload script later
            contextIsolation: false,
            enableRemoteModule: true // Deprecated; avoid in prod
        }
    });

    await mainWindow.loadFile('index.html');
    mainWindow.webContents.openDevTools(); // For debugging

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
    // Clean up DB connection
    if (dbConnection) {
        dbConnection.end();
        console.log('MySQL connection closed! *waves*');
    }
});

export { dbConnection }; // Export for other modules (e.g., NPC dialogue logic)