// Backend for the local CMS.
//
// - Generic local-filesystem commands (the frontend builds all content logic
//   on top of these + the dialog plugin + asset protocol).
// - A managed preview dev-server (spawns the *site's* Vite server so the CMS
//   can show the real website in an iframe).
// - Thin git commands for publishing content changes.
//
// Everything has full local fs access (single-user, local app); heavy content
// validation lives in the shared Zod schema on the frontend.

use serde::Serialize;
use std::fs;
use std::net::TcpStream;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;

#[derive(Serialize)]
struct DirEntry {
    name: String,
    is_dir: bool,
}

/// Holds the spawned preview dev-server process, if any.
#[derive(Default)]
struct PreviewState(Mutex<Option<Child>>);

/* ------------------------------------------------------------- filesystem */

#[tauri::command]
fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
fn list_dir(path: String) -> Result<Vec<DirEntry>, String> {
    let mut out = Vec::new();
    for entry in fs::read_dir(&path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
        out.push(DirEntry { name: entry.file_name().to_string_lossy().to_string(), is_dir });
    }
    Ok(out)
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
fn copy_file(src: String, dest: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&dest).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::copy(&src, &dest).map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_file(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_dir(path: String) -> Result<(), String> {
    fs::remove_dir_all(&path).map_err(|e| e.to_string())
}

/* --------------------------------------------------------- preview server */

fn port_in_use(port: u16) -> bool {
    let addr = format!("127.0.0.1:{port}");
    match addr.parse() {
        Ok(socket) => TcpStream::connect_timeout(&socket, Duration::from_millis(250)).is_ok(),
        Err(_) => false,
    }
}

/// Surgically free a single TCP port. Only ever targets the specific processes
/// holding that port (never a process group / negative PID), so it cannot
/// cascade to the editor, the terminal session, or the login session.
fn free_port(port: u16) {
    let _ = Command::new("fuser").arg("-k").arg(format!("{port}/tcp")).status();
    if let Ok(out) = Command::new("lsof").args(["-ti", &format!("tcp:{port}")]).output() {
        for pid in String::from_utf8_lossy(&out.stdout).split_whitespace() {
            // A specific positive PID only — no negative/group targets.
            let _ = Command::new("kill").arg("-TERM").arg(pid).status();
        }
    }
}

#[tauri::command]
fn preview_status(port: u16) -> bool {
    port_in_use(port)
}

#[tauri::command]
fn start_preview(state: tauri::State<PreviewState>, root: String, port: u16) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if guard.is_some() || port_in_use(port) {
        return Ok(()); // already running
    }
    let vite = format!("{root}/node_modules/.bin/vite");
    if !Path::new(&vite).exists() {
        return Err("Could not find node_modules/.bin/vite in the repo — run `pnpm install` there first.".into());
    }
    let mut cmd = Command::new(&vite);
    cmd.current_dir(&root)
        .args(["--port", &port.to_string(), "--strictPort"])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    // Note: the child stays in our session so it dies on Ctrl+C; we stop it
    // surgically by PID + port (never a group kill — see free_port).
    let child = cmd.spawn().map_err(|e| format!("Failed to start dev server: {e}"))?;
    *guard = Some(child);
    Ok(())
}

/// Stop the preview. Returns true only if the port is actually free afterwards,
/// so the UI keeps the switch ON (and offers Kill port) when shutdown fails.
#[tauri::command]
fn stop_preview(state: tauri::State<PreviewState>, port: u16) -> Result<bool, String> {
    {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        if let Some(mut child) = guard.take() {
            let _ = child.kill(); // specific child PID only
            let _ = child.wait();
        }
    }
    free_port(port); // clean up any straggler holding the port (e.g. esbuild)
    std::thread::sleep(Duration::from_millis(500));
    Ok(!port_in_use(port))
}

/// Forcefully free the port (fallback for the UI). Port-scoped — safe.
#[tauri::command]
fn kill_port(port: u16) -> Result<(), String> {
    free_port(port);
    std::thread::sleep(Duration::from_millis(300));
    if port_in_use(port) {
        Err("Could not free the port (fuser/lsof unavailable, or nothing to kill).".into())
    } else {
        Ok(())
    }
}

/* ------------------------------------------------------------------- git */

fn run_git(root: &str, args: &[&str]) -> Result<String, String> {
    let out = Command::new("git").current_dir(root).args(args).output().map_err(|e| e.to_string())?;
    let text = format!(
        "{}{}",
        String::from_utf8_lossy(&out.stdout),
        String::from_utf8_lossy(&out.stderr)
    )
    .trim()
    .to_string();
    if out.status.success() {
        Ok(text)
    } else {
        Err(text)
    }
}

#[tauri::command]
fn git_status(root: String) -> Result<serde_json::Value, String> {
    let branch = run_git(&root, &["rev-parse", "--abbrev-ref", "HEAD"]).unwrap_or_default();
    let porcelain = run_git(&root, &["status", "--porcelain"])?;
    let changes: Vec<String> = porcelain.lines().filter(|l| !l.trim().is_empty()).map(|l| l.to_string()).collect();
    Ok(serde_json::json!({
        "branch": branch,
        "changes": changes,
        "clean": changes.is_empty(),
    }))
}

#[tauri::command]
fn git_commit(root: String, message: String) -> Result<String, String> {
    run_git(&root, &["add", "-A"])?;
    let out = Command::new("git")
        .current_dir(&root)
        .args(["commit", "-m", &message])
        .output()
        .map_err(|e| e.to_string())?;
    let text = format!(
        "{}{}",
        String::from_utf8_lossy(&out.stdout),
        String::from_utf8_lossy(&out.stderr)
    )
    .trim()
    .to_string();
    if out.status.success() {
        Ok(text)
    } else if text.contains("nothing to commit") {
        Ok("Nothing to commit — working tree clean.".into())
    } else {
        Err(text)
    }
}

#[tauri::command]
fn git_push(root: String) -> Result<String, String> {
    match run_git(&root, &["push"]) {
        Ok(s) => Ok(if s.is_empty() { "Pushed.".into() } else { s }),
        Err(e) if e.contains("no upstream") || e.contains("has no upstream") => {
            run_git(&root, &["push", "origin", "HEAD"])
        }
        Err(e) => Err(e),
    }
}

/* ------------------------------------------------------------------- run */

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(PreviewState::default())
        .invoke_handler(tauri::generate_handler![
            path_exists,
            list_dir,
            read_text_file,
            write_text_file,
            copy_file,
            remove_file,
            remove_dir,
            preview_status,
            start_preview,
            stop_preview,
            kill_port,
            git_status,
            git_commit,
            git_push
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|handle, event| {
            // Don't leave an orphaned dev server when the app quits.
            if let tauri::RunEvent::Exit = event {
                let child = handle.state::<PreviewState>().0.lock().ok().and_then(|mut g| g.take());
                if let Some(mut child) = child {
                    let _ = child.kill();
                    let _ = child.wait();
                }
            }
        });
}
