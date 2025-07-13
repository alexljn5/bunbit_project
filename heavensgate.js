const { app, BrowserWindow } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

function createWindow() {
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

    win.webContents.on('did-finish-load', () => {
        // 1. Construct absolute path
        const javaDir = path.join(__dirname, 'game_engine', 'java');
        const classFile = path.join(javaDir, 'Test.class');

        // 2. Verify class exists
        if (!fs.existsSync(classFile)) {
            const msg = `CLASS NOT FOUND at: ${classFile}`;
            console.error(msg);
            win.webContents.send('java-output', msg);
            return;
        }

        // 3. Execute Java with proper paths
        console.log(`Running: java -cp "${javaDir}" Test`);
        exec(`java -cp "${javaDir}" Test`, (error, stdout, stderr) => {
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