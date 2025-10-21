// desktopbuttons.js
import { inputBox } from "../../utils/inputbox.js";
import { REF_CANVAS_HEIGHT } from "../../../../../globals.js";
import { computerAIRenderEngine, computerAICanvas } from "../../../computerai.js";  // Import for drawing
import { SCALE_X, SCALE_Y, CANVAS_WIDTH, CANVAS_HEIGHT } from "../../../../../globals.js";
import { fetchData, postData } from "./datahandler.js";  // Your new "API"

let mainOSButton = null;
let dataAppButton = null;

export function desktopButtonsGodFunction() {
    mainOSButtonFunction();
    dataAppButtonFunction();
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
    mainOSButton.draw();
}

function dataAppButtonFunction() {
    if (!dataAppButton) {
        dataAppButton = new inputBox(
            "dataAppButton",
            70,  // Next to main
            REF_CANVAS_HEIGHT - 55,
            50,
            50,
            "",
            false,
            () => {
                console.log("Data App launched!");
                launchDataApp();
            },
            null,
            "/src/ai/computerai/computeraiimg/dataicon.png"  // Add a cool icon image!
        );
    }
    dataAppButton.draw();
}

// New: Launch the "app" - Fetch and display data, with a way to post new
async function launchDataApp() {
    // Clear a "window" area on the desktop (fake app window)
    const windowX = CANVAS_WIDTH * 0.2;
    const windowY = CANVAS_HEIGHT * 0.2;
    const windowWidth = CANVAS_WIDTH * 0.6;
    const windowHeight = CANVAS_HEIGHT * 0.6;

    computerAIRenderEngine.fillStyle = "#333";  // Dark gray window bg
    computerAIRenderEngine.fillRect(windowX, windowY, windowWidth, windowHeight);
    computerAIRenderEngine.strokeStyle = "#FFF";
    computerAIRenderEngine.strokeRect(windowX, windowY, windowWidth, windowHeight);

    // Fetch data from "API"
    const data = await fetchData();

    // Draw fetched data as a list
    computerAIRenderEngine.fillStyle = "#0f0";
    computerAIRenderEngine.font = `${16 * SCALE_X}px Arial`;
    computerAIRenderEngine.textAlign = "left";
    data.forEach((item, index) => {
        computerAIRenderEngine.fillText(`${item.title}: ${item.content}`, windowX + 20, windowY + 40 + index * 20 * SCALE_Y);
    });

    // Example: Add input boxes for posting new data (using your inputBox class)
    // We'll make two: one for title, one for content, and a submit button
    const titleInput = new inputBox(
        "titleInput",
        (REF_CANVAS_WIDTH * 0.2) + 10,  // Logical coords inside window
        (REF_CANVAS_HEIGHT * 0.2) + windowHeight - 100,
        100,
        20,
        "Enter title",
        true  // Text input
    );

    const contentInput = new inputBox(
        "contentInput",
        (REF_CANVAS_WIDTH * 0.2) + 10,
        (REF_CANVAS_HEIGHT * 0.2) + windowHeight - 70,
        100,
        20,
        "Enter content",
        true
    );

    const submitButton = new inputBox(
        "submitButton",
        (REF_CANVAS_WIDTH * 0.2) + 10,
        (REF_CANVAS_HEIGHT * 0.2) + windowHeight - 40,
        50,
        20,
        "Post",
        false,
        async () => {
            const newItem = { title: titleInput.text, content: contentInput.text };
            const posted = await postData(newItem);
            if (posted) {
                console.log("Posted:", posted);
                // Redraw the app to show updated list
                launchDataApp();
            }
        }
    );

    // Draw them (call .draw() in your drawDesktop loop if not already)
    titleInput.draw();
    contentInput.draw();
    submitButton.draw();
}