// datahandler.js
let dataStore = [];  // Your self-contained data source (array of objects)

// Optional: Load from localStorage on init for persistence
if (localStorage.getItem('computerData')) {
    dataStore = JSON.parse(localStorage.getItem('computerData'));
} else {
    // Seed with some example data (general, not hero-specific)
    dataStore = [
        { id: 1, title: 'Note 1', content: 'Hello from the computer!' },
        { id: 2, title: 'Note 2', content: 'This is self-contained fun.' }
    ];
    saveData();  // Save initial data
}

function saveData() {
    localStorage.setItem('computerData', JSON.stringify(dataStore));
}

// "GET" - Fetch all data
export function fetchData() {
    return new Promise((resolve) => {
        setTimeout(() => resolve(dataStore), 500);  // Fake delay for "API feel"
    });
}

// "POST" - Add new data
export function postData(newItem) {
    return new Promise((resolve) => {
        const item = {
            id: dataStore.length + 1,
            title: newItem.title || 'Untitled',
            content: newItem.content || ''
        };
        dataStore.push(item);
        saveData();
        setTimeout(() => resolve(item), 500);  // Fake delay
    });
}