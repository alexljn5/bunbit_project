import { inputBox } from "../../utils/inputbox.js";
import { REF_CANVAS_HEIGHT } from "../../../../../globals.js";

let startButton;
export function testButton() {
    if (!startButton) {
        startButton = new inputBox(
            "startButton",
            10, // xLogical (left footer)
            REF_CANVAS_HEIGHT - 60, // yLogical (in footer)
            80, // widthLogical
            30, // heightLogical
            "Start App", // label
            false, // button
            () => {
                console.log("Start App clicked! Open menu...");
                // Your action (e.g., load new screen)
            }
        );
    }
    // Draw button
    startButton.draw();
}