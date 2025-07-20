// heavensgate.js
import { app, BrowserWindow } from 'electron';
import { join, dirname } from 'path';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { mapHandler } from './game_engine/mapdata/maphandler.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        // Disable Chrome's features that aren't supported
        chromium: {
            disableDefaultApis: true
        }
    });

    win.loadFile('index.html');
    win.webContents.openDevTools();

    win.webContents.on('did-finish-load', async () => {
        try {
            const javaDir = join(__dirname, 'game_engine', 'java');
            const classFile = join(javaDir, 'Raycaster.class');
            const jsonFile = join(__dirname, 'game_engine', 'mapdata', 'mapjson', 'test_map.json');

            const classExists = await fs.access(classFile).then(() => true).catch(() => false);
            if (!classExists) {
                const msg = `CLASS NOT FOUND at: ${classFile}`;
                console.error(msg);
                win.webContents.send('java-output', msg);
                return;
            }

            const jsonExists = await fs.access(jsonFile).then(() => true).catch(() => false);
            if (!jsonExists) {
                try {
                    // Generate JSON if it doesn't exist
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
                    win.webContents.send('java-output', `Error generating map JSON: ${mapError.message}`);
                    return;
                }
            }

            // Run Java raycaster using PowerShell to read the file
            const command = `powershell.exe -Command "Get-Content '${jsonFile}' | java -cp '${javaDir}' Raycaster"`;
            console.log(`Running: ${command}`);
            exec(command, { shell: 'powershell.exe' }, (error, stdout, stderr) => {
                console.log('--- JAVA RESULTS ---');
                if (stdout) console.log('STDOUT:', stdout);
                if (stderr) console.error('STDERR:', stderr);
                if (error) {
                    console.error('ERROR:', error);
                    win.webContents.send('java-output', `Error running Java: ${error.message}`);
                    return;
                }
                win.webContents.send('java-output', stdout || stderr);
            });
        } catch (error) {
            console.error('Unexpected error:', error);
            win.webContents.send('java-output', `Unexpected error: ${error.message}`);
        }
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});