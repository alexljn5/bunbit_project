// Tauri backend for Bunbit Game Engine
// Replaces heavensgate.js (Electron main process)

#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::Manager;
use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};

// State for crash logs
struct CrashLogState {
    log_dir: PathBuf,
}

// Player log data structure
#[derive(Debug, Serialize, Deserialize)]
struct PlayerLog {
    timestamp: String,
    // Add other fields as needed
    #[serde(flatten)]
    data: serde_json::Value,
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            // Create crash logs directory
            let log_dir = app
                .path()
                .app_data_dir()
                .map(|p| p.join("crash_logs"))
                .unwrap_or_else(|_| PathBuf::from("crash_logs"));
            
            if let Err(e) = fs::create_dir_all(&log_dir) {
                eprintln!("Failed to create crash logs directory: {}", e);
            }

            // Store log directory in app state
            app.manage(CrashLogState { log_dir });

            // Create player logs directory
            let user_data_path = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
            let logs_folder = user_data_path.join("scary_logs");
            if let Err(e) = fs::create_dir_all(&logs_folder) {
                eprintln!("Failed to create player logs directory: {}", e);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            reload_window,
            get_player_logs,
            save_player_log,
            write_crash_log
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Command to reload the window
#[tauri::command]
async fn reload_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.eval("window.location.reload()").map_err(|e| e.to_string())
}

// Get all player logs
#[tauri::command]
fn get_player_logs(state: tauri::State<CrashLogState>) -> Result<Vec<PlayerLog>, String> {
    let logs_folder = state.log_dir.parent()
        .map(|p| p.join("scary_logs"))
        .unwrap_or_else(|| PathBuf::from("scary_logs"));
    
    if !logs_folder.exists() {
        return Ok(Vec::new());
    }

    let mut logs = Vec::new();
    
    for entry in fs::read_dir(&logs_folder)
        .map_err(|e| format!("Failed to read logs directory: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        
        if path.extension().map_or(false, |ext| ext == "json") {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(log) = serde_json::from_str::<PlayerLog>(&content) {
                    logs.push(log);
                }
            }
        }
    }

    Ok(logs)
}

// Save a player log
#[tauri::command]
fn save_player_log(state: tauri::State<CrashLogState>, data: PlayerLog) -> Result<bool, String> {
    let logs_folder = state.log_dir.parent()
        .map(|p| p.join("scary_logs"))
        .unwrap_or_else(|| PathBuf::from("scary_logs"));
    
    if let Err(e) = fs::create_dir_all(&logs_folder) {
        return Err(format!("Failed to create logs directory: {}", e));
    }

    let file_path = logs_folder.join(format!("log_{}.json", data.timestamp));
    
    let content = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Failed to serialize log: {}", e))?;
    
    fs::write(&file_path, content)
        .map_err(|e| format!("Failed to write log file: {}", e))?;

    Ok(true)
}

// Write crash log
#[tauri::command]
fn write_crash_log(state: tauri::State<CrashLogState>, error: String, context: String) -> Result<bool, String> {
    use chrono::Local;
    
    let timestamp = Local::now().format("%Y-%m-%dT%H-%M-%S").to_string();
    let log_file = state.log_dir.join(format!("crash_log_{}.txt", timestamp));

    let log_content = format!(
        "Crash Report - {}\n\
         Time: {}\n\
         Error: {}\n\
         ----------------------------------------\n",
        context,
        Local::now().to_rfc3339(),
        error
    );

    fs::write(&log_file, log_content)
        .map_err(|e| format!("Failed to write crash log: {}", e))?;

    Ok(true)
}