This folder is a lightweight Java scaffold for experimenting with moving rendering helpers to Java.

Purpose
- Provide a safe, isolated place to learn Java and prototype heavy calculations offline.
- Not used by the browser build yet — you will manually build/run this project.

Quick start
1. Install JDK 17+ and Gradle (or use Gradle wrapper).
2. From this folder run: gradle build
3. Edit the Java files in src/main/java and run tests via gradle test.

Next steps
- Add heavy algorithms here (e.g., spatial partitioning, map preprocessors).
- Optionally compile to native with GraalVM native-image for testing.
- Later: explore TeaVM/Bytecoder to compile Java to WASM for browser use.
