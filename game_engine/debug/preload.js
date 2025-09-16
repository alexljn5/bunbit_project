const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('debugAPI', {
    sendLog: (log) => ipcRenderer.send('debug-log', log),
    requestLogs: (callback) => {
        ipcRenderer.on('debug-log', (event, log) => callback(log));
        ipcRenderer.send('request-logs');
    },
    isProduction: () => process.env.NODE_ENV === 'production'
});