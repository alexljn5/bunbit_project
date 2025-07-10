import { _2DRenderEngine } from "./2drenderengine.js";
import { _2DPlayerX, _2DPlayerY } from "./2dplayerdata/2dplayerlogic.js";

export function creepyShit() {
    // White box properties
    const boxX = 150, boxY = 100, boxW = 100, boxH = 50;
    // Eye properties
    const eyeW = 25, eyeH = 25;
    // Center of the white box
    const boxCenterX = boxX + boxW / 2;
    const boxCenterY = boxY + boxH / 2;
    // Center of the player
    const playerCenterX = _2DPlayerX + 16; // player width/2
    const playerCenterY = _2DPlayerY + 32; // player height/2

    // Direction vector from box center to player
    let dx = playerCenterX - boxCenterX;
    let dy = playerCenterY - boxCenterY;
    // Limit the distance the eye can move from the box center
    const maxEyeOffsetX = (boxW - eyeW) / 2;
    const maxEyeOffsetY = (boxH - eyeH) / 2;
    // Normalize and scale
    let dist = Math.sqrt(dx * dx + dy * dy);
    let eyeOffsetX = 0, eyeOffsetY = 0;
    if (dist > 0) {
        eyeOffsetX = Math.min(maxEyeOffsetX, Math.abs(dx)) * Math.sign(dx);
        eyeOffsetY = Math.min(maxEyeOffsetY, Math.abs(dy)) * Math.sign(dy);
    }

    // Draw white box
    _2DRenderEngine.fillStyle = "rgba(255, 255, 255, 0.5)";
    _2DRenderEngine.fillRect(boxX, boxY, boxW, boxH);

    // Draw eye inside the box, following the player
    _2DRenderEngine.fillStyle = "rgba(0, 0, 0, 1)";
    _2DRenderEngine.fillRect(
        boxCenterX - eyeW / 2 + eyeOffsetX,
        boxCenterY - eyeH / 2 + eyeOffsetY,
        eyeW,
        eyeH
    );
}