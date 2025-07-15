// heavensgate.js
import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { mapHandler } from './game_engine/mapdata/maphandler.js';

async function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html');
    win.webContents.openDevTools();

    win.webContents.on('did-finish-load', async () => {
        const javaDir = join(__dirname, 'game_engine', 'java');
        const classFile = join(javaDir, 'Raycaster.class');
        const jsonFile = join(__dirname, 'game_engine', 'mapdata', 'mapjson', 'test_map.json');

        if (!await fs.access(classFile).then(() => true).catch(() => false)) {
            const msg = `CLASS NOT FOUND at: ${classFile}`;
            console.error(msg);
            win.webContents.send('java-output', msg);
            return;
        }

        if (!await fs.access(jsonFile).then(() => true).catch(() => false)) {
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
        }

        // Run Java raycaster
        const command = `cat "${jsonFile}" | java -cp "${javaDir}" Raycaster`;
        console.log(`Running: ${command}`);
        exec(command, (error, stdout, stderr) => {
            console.log('--- JAVA RESULTS ---');
            console.log('STDOUT:', stdout);
            console.log('STDERR:', stderr);
            if (error) console.error('ERROR:', error);
            win.webContents.send('java-output', stdout || stderr);
        });
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});