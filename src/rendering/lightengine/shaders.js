// src/rendering/lightengine/shaders.js
export const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = (a_position + 1.0) / 2.0;
  }
`;

export const fragmentShaderSource = (width, height) => `
  precision mediump float;
  uniform sampler2D u_sceneTexture;
  uniform sampler2D u_depthTexture;
  uniform vec3 u_playerPos;
  uniform float u_fov;
  uniform vec2 u_resolution;
  uniform vec3 u_lightPos[4]; // Up to 4 lights
  uniform vec3 u_lightColor[4];
  uniform float u_lightIntensity[4];
  uniform int u_lightCount;
  varying vec2 v_texCoord;

  void main() {
    vec4 color = texture2D(u_sceneTexture, v_texCoord);
    float depth = texture2D(u_depthTexture, v_texCoord).r;
    vec2 screenPos = v_texCoord * u_resolution;
    float yCorrected = abs(screenPos.y - ${height}.0 / 2.0);
    float distance = (${width}.0 / 2.0 / tan(u_fov / 2.0)) / max(1.0, yCorrected);
    float rayAngle = u_playerPos.z - u_fov / 2.0 + v_texCoord.x * u_fov;
    vec2 worldPos = vec2(
        u_playerPos.x + distance * cos(rayAngle),
        u_playerPos.y + distance * sin(rayAngle)
    );
    vec3 lightEffect = vec3(0.2); // Base ambient to avoid pure black
    for (int i = 0; i < 4; i++) {
        if (i >= u_lightCount) break;
        float lightDist = distance(worldPos, u_lightPos[i].xy);
        float attenuation = u_lightIntensity[i] / (1.0 + 0.01 * lightDist + 0.001 * lightDist * lightDist);
        lightEffect += u_lightColor[i] * attenuation;
    }
    // Debug: Output red if lightEffect is zero
    if (lightEffect == vec3(0.0)) {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Red for debug
    } else {
        gl_FragColor = vec4(color.rgb * lightEffect, color.a);
    }
  }
`;
