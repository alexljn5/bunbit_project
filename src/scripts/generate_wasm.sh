setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-17.0.8.7-hotspot"
export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-17.0.8.7-hotspot"
export PATH="$JAVA_HOME/bin:$PATH"
# Run gradle from the project root so -p points to an existing directory.
# (In some terminals/scripts the working directory ends up being src/scripts, which breaks -p.)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

gradle -p src/rendering/java clean buildWasmGC --stacktrace --info


