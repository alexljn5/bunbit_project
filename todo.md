## BUGS
- [Fix bug where if Canvas is rescaled using the DEBUG position, for some reason the button pressing is misaligned of the buttons no clue why.]


## TODO
Core stability (must not regress)

Confirm single initialization path for Electron → Express → window load (no duplicate loadURL / retry logic)
Ensure worker init happens exactly once per worker instance (guard against double “init” messages)
Remove any accidental duplicate map load triggers (you currently saw double “Switched to map”)
Add explicit “engine ready” state machine (LOADING → READY → RUNNING → ERROR)

WASM reliability layer

Treat wasmStatus as a real state: disabled / loading / ready / fallback / error
Log one single canonical line per transition (avoid spam + confusion)
Fix or suppress TeaVM “name section invalid function index” warning (non-fatal but noisy)
Add runtime validation:
fastSin(0), fastCos(0)
NaN/Infinity guard on first 100 frames
Add automatic fallback switch after N bad frames (silent recovery instead of crash/freeze)

Worker architecture cleanup

Remove duplicated CPU timer logic edge cases (ensure _lastCpuTime always defined before usage)
Guard postCpu() against NaN intervals
Centralize message schema:
init
frame
updateSettings
wasmStatus
error
Add version tag in worker handshake (engine version mismatch detection)

Rendering correctness

Investigate double map load:
renderengine.js: No active map → loading map_01
followed by AI switch → map_01 again
Likely two independent triggers (engine tick + AI handler)
Ensure map loader is idempotent (same map request ignored if active)

Performance / profiling

Add frame timing breakdown:
raycast time
sprite time
floor time
horizon time
Replace raw console logs with throttled debug channel (or dev-mode flag)
Ensure BroadcastChannel perf messages don’t become bottleneck at 8 workers

Dev experience / noise reduction

Silence known Chromium DevTools noise:
Autofill.enable / Autofill.setAddresses errors (safe to ignore; feature disabled in flags)
Add DEBUG_LEVEL switch:
0 = silent
1 = errors only
2 = engine logs
3 = full tracing (current chaos mode)

Build / deployment (your next scaling step)

Separate “runtime wasm build pipeline”:
input: wasm source / TeaVM output
output: versioned /wasm/build_<hash>/
Add manifest file:
lists wasm version + JS binding version
Prepare dockerization plan:
static server container (Express → nginx later)
deterministic asset paths (no local absolute paths like C:\Users\... in logs)

Engine sanity checks (important)

Add startup validation suite:
worker boots
wasm loads OR fallback activates
first frame renders
map loads once
If any fail → hard error state, not partial runaway loop

Optional but high value

Replace console spam emojis with structured tags ([ENGINE], [WASM], [WORKER])
Add in-engine debug overlay instead of console dependency
Add deterministic seed for any procedural logic (if applicable later)