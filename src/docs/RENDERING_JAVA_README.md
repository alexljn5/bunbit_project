This folder is a lightweight Java + TeaVM scaffold for experimenting with moving rendering helpers to WebAssembly.

Purpose
- Provide a safe, isolated place to learn Java and prototype heavy calculations offline.
- Build a small WebAssembly experiment that the browser/Electron renderer can load later.
- Keep the normal JS renderer working even when the WASM artifact has not been built yet.

Quick start
1. Install JDK 17+ and Gradle, or use Docker.
2. From this folder run: gradle test
3. Build the WebAssembly experiment: gradle buildWasmGC
4. Start the normal app/server and open DevTools.
5. Run this in the console:

```js
import("/src/wasm/renderhelpers-smoketest.js").then(m => m.smokeTestRenderHelpersWasm())
```

To test WASM inside the raycast worker, start the game URL with:

```txt
?wasmRayMath=true
```

With the Docker launcher:

```sh
FORCE_REBUILD=true WASM_RAY_MATH=true ./start_bunbit_engine.sh
```

Then check DevTools:

```js
window.__raycastWasmStatus
window.__raycastMathSource
```

Expected values are `disabled`, `requested`, `loading`, `ready`, or `fallback`.
`window.__raycastMathSource` should be `wasm` when the worker is actually using the WASM helper, otherwise it will be `js`.

Generated files are written to:

```txt
src/wasm/generated/wasm-gc/
```

On this machine, Gradle may pick up an old/broken `JAVA_HOME`. If that happens, run the build from the repo root with JDK 17 explicitly:

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-17.0.8.7-hotspot'
gradle -p src\rendering\java test buildWasmGC --no-daemon
```

Next steps
- Keep the Java helpers small until the loader works on your machine.
- Do not call tiny WASM helpers thousands of times per frame from JS.
- Later, export coarse functions like a ray batch calculation instead of individual sin/cos calls.
