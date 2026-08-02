const fs = require('fs');

const flow = fs.readFileSync('src/docs/ENGINE_FLOW.md', 'utf8');
console.log('ENGINE_FLOW.md has DialogueTheme:', flow.includes('DialogueTheme'));
console.log('ENGINE_FLOW.md DIALOGUE state:', flow.includes('uses DialogueTheme layer'));

const doc = fs.readFileSync('src/docs/DOCUMENTATION.md', 'utf8');
console.log('DOCUMENTATION.md has DialogueTheme layer:', doc.includes('DialogueTheme layer'));
console.log('DOCUMENTATION.md has uiPosition:', doc.includes('uiPosition'));
console.log('DOCUMENTATION.md has component structure:', doc.includes('Component Structure'));

const std = fs.readFileSync('src/docs/STANDARDISATION.md', 'utf8');
console.log('STANDARDISATION.md has Dialogue UI Standards:', std.includes('Dialogue UI Standards'));
console.log('STANDARDISATION.md has theme/ in folder structure:', std.includes('│   └── theme/'));

const proj = fs.readFileSync('src/docs/PROJECT_STRUCTURE.md', 'utf8');
console.log('PROJECT_STRUCTURE.md has theme/:', proj.includes('│   ├── theme/'));

const patches = JSON.parse(fs.readFileSync('src/dialogue/characters/patches.json', 'utf8'));
const vesper = JSON.parse(fs.readFileSync('src/dialogue/characters/vesper.json', 'utf8'));
console.log('patches uiPosition:', patches.uiPosition);
console.log('vesper uiPosition:', vesper.uiPosition);

const renderer = fs.readFileSync('src/dialogue/renderer/dialogue-renderer.js', 'utf8');
console.log('Renderer has DialogueTheme import:', renderer.includes('DialogueTheme'));
console.log('Renderer has SpeakerAlignment import:', renderer.includes('SpeakerAlignment'));
console.log('Renderer has _getSpeakerAlignment:', renderer.includes('_getSpeakerAlignment'));
console.log('Renderer has _createPortrait:', renderer.includes('_createPortrait'));
console.log('Renderer has _createSpeakerName:', renderer.includes('_createSpeakerName'));
console.log('Renderer has _createDialogueText:', renderer.includes('_createDialogueText'));
console.log('Renderer has _createChoices:', renderer.includes('_createChoices'));
console.log('Renderer has _createContinuePrompt:', renderer.includes('_createContinuePrompt'));

const theme = fs.readFileSync('src/dialogue/theme/dialogue-theme.js', 'utf8');
console.log('Theme has textbox:', theme.includes('textbox'));
console.log('Theme has portrait:', theme.includes('portrait'));
console.log('Theme has speakerName:', theme.includes('speakerName'));
console.log('Theme has dialogueText:', theme.includes('dialogueText'));
console.log('Theme has choice:', theme.includes('choice'));
console.log('Theme has choiceHover:', theme.includes('choiceHover'));
console.log('Theme has continuePrompt:', theme.includes('continuePrompt'));
console.log('Theme has animations:', theme.includes('animations'));
console.log('Theme has typography:', theme.includes('typography'));
console.log('Theme has SpeakerAlignment:', theme.includes('SpeakerAlignment'));
console.log('Theme has DefaultSpeakerAlignments:', theme.includes('DefaultSpeakerAlignments'));
