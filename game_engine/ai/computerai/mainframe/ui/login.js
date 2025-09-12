import { computerAIRenderEngine } from "../../computerai.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT, SCALE_X, SCALE_Y, REF_CANVAS_HEIGHT, REF_CANVAS_WIDTH } from "../../../../globals.js";
import { initInputHandler, registerUsernameBox, registerPasswordBox, username, password, activeElement } from "../utils/inputhandler.js";

export function computerAiLoginEnvironmentGodFunction() {
    mainComputerAiLoginEnvironmentBoxes();
    loginBox();
    insertUserNameBox();
    insertPasswordBox();
    // Register boxes (once)
    if (!window.usernameBox) registerUsernameBox();
    if (!window.passwordBox) registerPasswordBox();
}

function mainComputerAiLoginEnvironmentBoxes() {
    const boxWidth_logical = 200;  // logical
    const boxHeight_logical = 250;
    const boxX_logical = (REF_CANVAS_WIDTH - boxWidth_logical) / 2;
    const boxY_logical = (REF_CANVAS_HEIGHT - boxHeight_logical) / 2;

    computerAIRenderEngine.fillStyle = "#FC0000";
    computerAIRenderEngine.fillRect(
        boxX_logical * SCALE_X,
        boxY_logical * SCALE_Y,
        boxWidth_logical * SCALE_X,
        boxHeight_logical * SCALE_Y
    );

    computerAIRenderEngine.strokeStyle = "#000";
    computerAIRenderEngine.lineWidth = 2 * SCALE_X; // Already good, keeps consistent visual thickness
    computerAIRenderEngine.strokeRect(
        boxX_logical * SCALE_X,
        boxY_logical * SCALE_Y,
        boxWidth_logical * SCALE_X,
        boxHeight_logical * SCALE_Y
    );
}

function loginBox() {
    const loginBoxWidth_logical = 150;
    const loginBoxHeight_logical = 150;
    const loginBoxX_logical = (REF_CANVAS_WIDTH - loginBoxWidth_logical) / 2;
    const loginBoxY_logical = (REF_CANVAS_HEIGHT - loginBoxHeight_logical) / 2;

    computerAIRenderEngine.fillStyle = "#00F";
    computerAIRenderEngine.fillRect(
        loginBoxX_logical * SCALE_X,
        loginBoxY_logical * SCALE_Y,
        loginBoxWidth_logical * SCALE_X,
        loginBoxHeight_logical * SCALE_Y
    );

    computerAIRenderEngine.strokeStyle = "#FFF";
    computerAIRenderEngine.lineWidth = 2 * SCALE_X;
    computerAIRenderEngine.strokeRect(
        loginBoxX_logical * SCALE_X,
        loginBoxY_logical * SCALE_Y,
        loginBoxWidth_logical * SCALE_X,
        loginBoxHeight_logical * SCALE_Y
    );

    computerAIRenderEngine.fillStyle = "#0f0";
    computerAIRenderEngine.font = `${20 * SCALE_X}px Arial`; // Already good
    computerAIRenderEngine.textAlign = "center";
    computerAIRenderEngine.textBaseline = "middle";
    computerAIRenderEngine.fillText(
        "Login Box",
        (REF_CANVAS_WIDTH / 2) * SCALE_X,
        (REF_CANVAS_HEIGHT / 2) * SCALE_Y + 60 * SCALE_Y // Scale the offset for consistency
    );
}

function insertUserNameBox() {
    const userBoxWidth_logical = 100;
    const userBoxHeight_logical = 20;
    const userBoxX_logical = (REF_CANVAS_WIDTH - userBoxWidth_logical) / 2;
    const userBoxY_logical = (REF_CANVAS_HEIGHT - userBoxHeight_logical) / 2 - 20; // Logical offset

    computerAIRenderEngine.fillStyle = activeElement === "usernameBox" ? "#FFD700" : "#FFF";
    computerAIRenderEngine.fillRect(
        userBoxX_logical * SCALE_X,
        userBoxY_logical * SCALE_Y,
        userBoxWidth_logical * SCALE_X,
        userBoxHeight_logical * SCALE_Y
    );

    computerAIRenderEngine.strokeStyle = "#000";
    computerAIRenderEngine.lineWidth = 2 * SCALE_X;
    computerAIRenderEngine.strokeRect(
        userBoxX_logical * SCALE_X,
        userBoxY_logical * SCALE_Y,
        userBoxWidth_logical * SCALE_X,
        userBoxHeight_logical * SCALE_Y
    );

    computerAIRenderEngine.fillStyle = "#000";
    computerAIRenderEngine.font = `${16 * SCALE_X}px Arial`;
    computerAIRenderEngine.textAlign = "center";
    computerAIRenderEngine.textBaseline = "middle";
    computerAIRenderEngine.fillText(
        username || "Username",
        (REF_CANVAS_WIDTH / 2) * SCALE_X,
        (userBoxY_logical + userBoxHeight_logical / 2) * SCALE_Y // Center text in scaled box
    );
}

function insertPasswordBox() {
    const passBoxWidth_logical = 100;
    const passBoxHeight_logical = 20;
    const passBoxX_logical = (REF_CANVAS_WIDTH - passBoxWidth_logical) / 2;
    const passBoxY_logical = (REF_CANVAS_HEIGHT - passBoxHeight_logical) / 2 + 20; // Logical offset

    computerAIRenderEngine.fillStyle = activeElement === "passwordBox" ? "#FFD700" : "#FFF";
    computerAIRenderEngine.fillRect(
        passBoxX_logical * SCALE_X,
        passBoxY_logical * SCALE_Y,
        passBoxWidth_logical * SCALE_X,
        passBoxHeight_logical * SCALE_Y
    );

    computerAIRenderEngine.strokeStyle = "#000";
    computerAIRenderEngine.lineWidth = 2 * SCALE_X;
    computerAIRenderEngine.strokeRect(
        passBoxX_logical * SCALE_X,
        passBoxY_logical * SCALE_Y,
        passBoxWidth_logical * SCALE_X,
        passBoxHeight_logical * SCALE_Y
    );

    computerAIRenderEngine.fillStyle = "#000";
    computerAIRenderEngine.font = `${16 * SCALE_X}px Arial`;
    computerAIRenderEngine.textAlign = "center";
    computerAIRenderEngine.textBaseline = "middle";
    computerAIRenderEngine.fillText(
        password || "Password",
        (REF_CANVAS_WIDTH / 2) * SCALE_X,
        (passBoxY_logical + passBoxHeight_logical / 2) * SCALE_Y // Center text in scaled box
    );
}