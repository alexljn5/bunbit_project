// src/rendering/lightengine/shaders.js

// Vertex shader (flip Y in v_texCoord)
export const vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_texCoord;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        // map clip space [-1,1] to texcoord [0,1], and flip Y to match canvas
        v_texCoord = vec2((a_position.x + 1.0) * 0.5, 1.0 - (a_position.y + 1.0) * 0.5);
    }
`;

// Fragment shader (WebGL1-friendly, MAX_LIGHTS, base ambient)
export const fragmentShaderSource = `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_sceneTexture; // unit 0
    uniform sampler2D u_depthTexture; // unit 1
    uniform vec3 u_playerPos; // x, y, angle
    uniform float u_fov;
    uniform vec2 u_resolution;
    const int MAX_LIGHTS = 4;
    uniform int u_lightCount;
    uniform vec3 u_lightPos[MAX_LIGHTS];
    uniform vec3 u_lightColor[MAX_LIGHTS];
    uniform float u_lightIntensity[MAX_LIGHTS];

    void main() {
        vec3 sceneColor = texture2D(u_sceneTexture, v_texCoord).rgb;
        float depthSample = texture2D(u_depthTexture, v_texCoord).r;
        // convert normalized depth to world distance (matching CPU division by 1000)
        float actualDistance = clamp(depthSample * 1000.0, 0.001, 1000.0);

        float rayAngle = u_playerPos.z - u_fov / 2.0 + v_texCoord.x * u_fov;
        vec2 dir = vec2(cos(rayAngle), sin(rayAngle));
        vec2 worldPos = vec2(u_playerPos.x, u_playerPos.y) + dir * actualDistance;

        vec3 lightEffect = vec3(0.25); // base ambient so nothing is pure black

        for (int i = 0; i < MAX_LIGHTS; i++) {
            if (i >= u_lightCount) break;
            vec2 lp = u_lightPos[i].xy;
            float lightDist = length(worldPos - lp);
            float attenuation = u_lightIntensity[i] / (1.0 + 0.01 * lightDist + 0.001 * lightDist * lightDist);
            lightEffect += u_lightColor[i] * attenuation;
        }

        vec3 outColor = sceneColor * lightEffect;

        // debug fallback if something's wrong with lighting
        if (length(outColor) < 0.01) {
            // show a faint blue so it's obvious lighting reduced brightness
            outColor = vec3(0.03, 0.03, 0.08);
        }

        gl_FragColor = vec4(outColor, 1.0);
    }
`;

// ---------- Shader helpers ----------
export function compileShaderSafe(glCtx, source, type) {
    const shader = glCtx.createShader(type);
    glCtx.shaderSource(shader, source);
    glCtx.compileShader(shader);
    if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
        console.error('Shader compile error:', glCtx.getShaderInfoLog(shader));
        glCtx.deleteShader(shader);
        return null;
    }
    return shader;
}

export function createShaderProgramSafe(glCtx, vsSrc, fsSrc) {
    const vs = compileShaderSafe(glCtx, vsSrc, glCtx.VERTEX_SHADER);
    const fs = compileShaderSafe(glCtx, fsSrc, glCtx.FRAGMENT_SHADER);
    if (!vs || !fs) return null;
    const prog = glCtx.createProgram();
    glCtx.attachShader(prog, vs);
    glCtx.attachShader(prog, fs);
    glCtx.linkProgram(prog);
    if (!glCtx.getProgramParameter(prog, glCtx.LINK_STATUS)) {
        console.error('Program link error:', glCtx.getProgramInfoLog(prog));
        glCtx.deleteProgram(prog);
        return null;
    }
    return prog;
}

// Convert float depth array -> Uint8 if no float texture support
export function ensureDepthTextureUpload(glCtx, width, height, floatData) {
    const floatExt = glCtx.getExtension('OES_texture_float') || glCtx.getExtension('EXT_color_buffer_float');
    const canUseFloat = !!floatExt || (typeof WebGL2RenderingContext !== 'undefined' && glCtx instanceof WebGL2RenderingContext);
    if (canUseFloat) {
        glCtx.texImage2D(glCtx.TEXTURE_2D, 0, glCtx.LUMINANCE, width, height, 0, glCtx.LUMINANCE, glCtx.FLOAT, floatData);
        return;
    }
    // fallback: pack into Uint8
    const u8 = new Uint8Array(floatData.length);
    for (let i = 0; i < floatData.length; i++) {
        const v = Math.max(0.0, Math.min(1.0, floatData[i]));
        u8[i] = Math.floor(v * 255.0);
    }
    glCtx.texImage2D(glCtx.TEXTURE_2D, 0, glCtx.LUMINANCE, width, height, 0, glCtx.LUMINANCE, glCtx.UNSIGNED_BYTE, u8);
}
