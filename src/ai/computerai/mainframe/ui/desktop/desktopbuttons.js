// desktopbuttons.js
import { inputBox } from "../../utils/inputbox.js";
import { REF_CANVAS_HEIGHT } from "../../../../../globals.js";

let mainOSButton = null;

export function desktopButtonsGodFunction() {
    mainOSButtonFunction();
}

function mainOSButtonFunction() {
    if (!mainOSButton) {
        mainOSButton = new inputBox(
            "mainOSButton",
            10,
            REF_CANVAS_HEIGHT - 55,
            50,
            50,
            "",
            false,
            () => console.log("Start App clicked!"),
            null,
            "/src/ai/computerai/computeraiimg/placeholder.webp"
        );
    }

    // Draw button every frame
    mainOSButton.draw();
}
