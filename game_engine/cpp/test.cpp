#include <emscripten.h>
#include <string>

EMSCRIPTEN_KEEPALIVE
extern "C" void logMessage(const char *message)
{
    std::string jsCode = "console.log('" + std::string(message) + "')";
    emscripten_run_script(jsCode.c_str());
}