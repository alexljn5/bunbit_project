// src/rendering/lightengine/shaders.js
export const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = (a_position + 1.0) / 2.0;
  }
`;

const fragmentShaderSource = `
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

        float viewDist;
        if (depthSample >= 0.999) {
            // Approximate projected distance for open space (floor/ceiling)
            float halfWidth = u_resolution.x / 2.0;
            float halfHeight = u_resolution.y / 2.0;
            float projDist = halfWidth / tan(u_fov / 2.0);
            float row = v_texCoord.y * u_resolution.y;
            float yCorrected = abs(row - halfHeight);
            viewDist = projDist / max(1.0, yCorrected);
        } else {
            // Use actual ray depth for geometry hits
            viewDist = clamp(depthSample * 1000.0, 0.001, 1000.0);
        }

        float rayAngle = u_playerPos.z - u_fov / 2.0 + v_texCoord.x * u_fov;
        vec2 dir = vec2(cos(rayAngle), sin(rayAngle));
        vec2 worldPos = vec2(u_playerPos.x, u_playerPos.y) + dir * viewDist;

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