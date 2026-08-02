# Bunbit Dialogue Creation Guide

This document explains how to create, modify, and extend dialogue for the Bunbit Engine. All dialogue is data-driven — no dialogue text is ever hardcoded in JavaScript.

---

## Table of Contents

1. [Dialogue File Location](#dialogue-file-location)
2. [Creating a New Dialogue](#creating-a-new-dialogue)
3. [Node Graph Structure](#node-graph-structure)
4. [Node Properties](#node-properties)
5. [Linear Dialogue](#linear-dialogue)
6. [Branching Choices](#branching-choices)
7. [Loops](#loops)
8. [Conditional Branches](#conditional-branches)
9. [Reusable Nodes](#reusable-nodes)
10. [Event Triggers](#event-triggers)
11. [Character Metadata](#character-metadata)
12. [Speaker Positioning](#speaker-positioning)
13. [Sprite Metadata](#sprite-metadata)
14. [Localisation](#localisation)
15. [Testing a Dialogue](#testing-a-dialogue)
16. [Common Patterns](#common-patterns)

---

## Dialogue File Location

All dialogue files live in:

```
src/dialogue/dialogues/
```

Each dialogue is a single JSON file. Example files:

- `example.json` — Minimal example with all features
- `new_game_intro.json` — Test dialogue for the new game intro flow

---

## Creating a New Dialogue

### Step 1: Create the JSON file

Create a new file in `src/dialogue/dialogues/`, for example `src/dialogue/dialogues/my_quest.json`.

### Step 2: Define the basic structure

```json
{
    "id": "my_quest_intro",
    "metadata": {
        "language": "en",
        "version": 1
    },
    "startNode": "quest_start",
    "nodes": {
        "quest_start": {
            "expression": "neutral",
            "text": "A new quest awaits.",
            "next": "quest_continue"
        }
    }
}
```

### Step 3: Required fields

Every dialogue file must include:

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier for this dialogue graph |
| `metadata.language` | string | Language code (e.g., `"en"`, `"fr"`, `"de"`) |
| `metadata.version` | number | Version number for future migrations |
| `startNode` | string | ID of the first node to display |
| `nodes` | object | Map of node IDs to node objects |

---

## Node Graph Structure

Dialogue uses a **node graph** architecture. Nodes are independent objects identified by unique IDs. Connections are string references, not nested objects.

### Node ID Rules

- IDs must be unique within a dialogue file
- IDs must be strings
- Use descriptive names: `intro_001`, `branch_a`, `quest_complete`
- Use underscores to separate words

### Example Graph

```
intro_001 → intro_002 → branch_point
                                  ├── choice_a → ending_a
                                  └── choice_b → ending_b
```

---

## Node Properties

Each node object can have the following properties:

| Property | Type | Required | Description |
|---|---|---|---|
| `speaker` | string | Yes* | Character ID referencing a character in `characters/` |
| `expression` | string | No | Expression name for sprite rendering (defaults to character's `defaultExpression`) |
| `text` | string | No* | Dialogue text (required unless node has choices) |
| `next` | string | No* | ID of the next node (for linear progression) |
| `choices` | array | No* | Player choice options (each has `text` and `next`) |
| `events` | array | No | Event triggers executed when node is entered |
| `conditionalBranches` | array | No | Conditional next-node resolution |

*At least one of `text`, `choices`, or `next` must be present.

---

## Linear Dialogue

A → B → C

```json
{
    "nodes": {
        "node_a": {
            "speaker": "patches",
            "expression": "neutral",
            "text": "Hello, traveler.",
            "next": "node_b"
        },
        "node_b": {
            "speaker": "vesper",
            "expression": "curious",
            "text": "What brings you here?",
            "next": "node_c"
        },
        "node_c": {
            "speaker": "patches",
            "expression": "smug",
            "text": "That is none of your concern.",
            "next": "node_d"
        }
    }
}
```

---

## Branching Choices

A → B → (Choice 1 → C, Choice 2 → D)

```json
{
    "nodes": {
        "node_a": {
            "speaker": "patches",
            "expression": "neutral",
            "text": "What would you like to do?",
            "choices": [
                {
                    "text": "Explore the forest",
                    "next": "forest_path"
                },
                {
                    "text": "Return to town",
                    "next": "town_path"
                }
            ]
        },
        "forest_path": {
            "speaker": "vesper",
            "expression": "curious",
            "text": "The forest is dangerous.",
            "next": "forest_ending"
        },
        "town_path": {
            "speaker": "patches",
            "expression": "smug",
            "text": "Wise choice.",
            "next": "town_ending"
        }
    }
}
```

---

## Loops

A conversation can return to a previous node:

```json
{
    "nodes": {
        "greeting": {
            "speaker": "patches",
            "expression": "happy",
            "text": "Welcome back!",
            "next": "question"
        },
        "question": {
            "speaker": "vesper",
            "expression": "curious",
            "text": "Have you seen my cat?",
            "choices": [
                {
                    "text": "Yes",
                    "next": "yes_answer"
                },
                {
                    "text": "No",
                    "next": "greeting"
                }
            ]
        },
        "yes_answer": {
            "speaker": "patches",
            "expression": "judging",
            "text": "I haven't seen it.",
            "next": "greeting"
        }
    }
}
```

---

## Conditional Branches

Nodes can check game flags to determine the next node:

```json
{
    "nodes": {
        "meeting": {
            "speaker": "patches",
            "expression": "neutral",
            "text": "You again.",
            "conditionalBranches": [
                {
                    "condition": { "flag": "met_vesper", "operator": "eq", "value": true },
                    "next": "vesper_already_met"
                },
                {
                    "condition": { "flag": "met_vesper", "operator": "eq", "value": false },
                    "next": "first_meeting"
                }
            ]
        },
        "vesper_already_met": {
            "speaker": "patches",
            "expression": "smug",
            "text": "Still looking for Vesper?",
            "next": "end"
        },
        "first_meeting": {
            "speaker": "patches",
            "expression": "neutral",
            "text": "Let me introduce myself.",
            "events": [
                { "type": "SET_FLAG", "flag": "met_vesper", "value": true }
            ],
            "next": "end"
        }
    }
}
```

### Available Condition Operators

| Operator | Description |
|---|---|
| `eq` | Flag equals value |
| `neq` | Flag does not equal value |
| `gt` | Flag greater than value |
| `lt` | Flag less than value |
| `gte` | Flag greater than or equal to value |
| `lte` | Flag less than or equal to value |
| `has` | Flag exists (not null/undefined) |
| `notHas` | Flag does not exist |

---

## Reusable Nodes

Multiple paths can point to the same node:

```json
{
    "nodes": {
        "path_a": {
            "speaker": "patches",
            "text": "Path A ending.",
            "next": "shared_ending"
        },
        "path_b": {
            "speaker": "vesper",
            "text": "Path B ending.",
            "next": "shared_ending"
        },
        "shared_ending": {
            "speaker": "patches",
            "expression": "happy",
            "text": "Either way, we win!",
            "next": "final"
        }
    }
}
```

---

## Event Triggers

Dialogue nodes can trigger engine events when entered:

```json
{
    "nodes": {
        "intro_start": {
            "speaker": "patches",
            "expression": "neutral",
            "text": "Placeholder dialogue system online.",
            "events": [
                { "type": "SET_FLAG", "flag": "intro_complete", "value": true }
            ],
            "next": "intro_continue"
        }
    }
}
```

### Built-in Event Types

| Type | Description | Properties |
|---|---|---|
| `SET_FLAG` | Set a game flag | `flag` (string), `value` (any) |
| `REMOVE_FLAG` | Remove a game flag | `flag` (string) |
| `INCREMENT_FLAG` | Increment a numeric flag | `flag` (string) |
| `EMIT_EVENT` | Emit a custom event | `type` (string), `payload` (object) |

### Custom Event Handlers

Future event types can be registered at runtime:

```javascript
import { dialogueEventSystem } from '../dialogue/events/dialogue-events.js';

dialogueEventSystem.registerHandler('SPAWN_OBJECT', (event, flags) => {
    // Custom spawn logic
});
```

### Future Event Types (Planned)

- `SPAWN_OBJECT` — Spawn an object in the game world
- `CHANGE_MAP` — Transition to a different map
- `PLAY_ANIMATION` — Play a character animation
- `CHANGE_MUSIC` — Change the background music
- `START_QUEST` — Begin a quest
- `GIVE_ITEM` — Add an item to the player's inventory

---

## Character Metadata

Characters are defined separately from dialogue in `src/dialogue/characters/`.

### Character JSON Structure

```json
{
    "id": "patches",
    "displayName": "Patches",
    "defaultExpression": "neutral",
    "spriteFolder": "img/sprites/friendly/patches",
    "spriteSheet": "patches-ascii-sheet.md",
    "uiPosition": "left",
    "expressions": [
        "neutral",
        "happy",
        "smug",
        "judging",
        "curious"
    ]
}
```

### Character Fields

| Field | Description |
|---|---|
| `id` | Unique character identifier (used in dialogue `speaker` field) |
| `displayName` | Human-readable name |
| `defaultExpression` | Default expression when none is specified |
| `spriteFolder` | Path to the character's sprite folder |
| `spriteSheet` | Filename of the markdown sprite sheet |
| `uiPosition` | `"left"`, `"right"`, or `"center"` — determines which side of the textbox the character appears on |
| `expressions` | Array of available expression names |

### Adding a New Character

1. Create a new JSON file in `src/dialogue/characters/` (e.g., `new_character.json`)
2. Add the character's sprite sheet markdown file to their sprite folder
3. Reference the character ID in dialogue nodes via the `speaker` field
4. The renderer will automatically load the character's metadata and expression sprites

---

## Speaker Positioning

Speaker layout is data-driven, not hardcoded. Each character JSON includes a `uiPosition` field:

- `"left"` — Character appears on the left side of the textbox (default)
- `"right"` — Character appears on the right side of the textbox
- `"center"` — Character appears centered

The renderer reads `uiPosition` from the character metadata to determine alignment. Characters without `uiPosition` default to left alignment.

### Default Alignments

Default alignments can be set in the `DefaultSpeakerAlignments` map in `src/dialogue/theme/dialogue-theme.js`. This is useful for setting global defaults without modifying every character JSON.

---

## Sprite Metadata

Characters' ASCII expression art is stored in markdown files within their sprite folders. The renderer requests by `character` + `expression`; the metadata loader resolves the ASCII representation.

### Sprite Sheet Format

Two formats are supported:

**Format 1 — With expression names:**

```markdown
neutral
(\_/)
(•.•)

happy
(\_/)
(•ᴗ•)
```

**Format 2 — Bare ASCII art (single default expression):**

```markdown
(\_/)
(•.•)
```

### Adding New Expressions

1. Add the expression name to the character's `expressions` array in their JSON
2. Add the ASCII art to the sprite sheet markdown file under the expression name header
3. The renderer will automatically pick up the new expression

---

## Localisation

Every dialogue file must include `metadata.language` and `metadata.version` fields for future translation support.

### Adding Translations

To add a translation for a dialogue:

1. Create a new dialogue file with the same `id` but a different `metadata.language`
2. The runtime will load the appropriate file based on the current language setting

Example:
- `src/dialogue/dialogues/greeting_en.json` — English version
- `src/dialogue/dialogues/greeting_fr.json` — French version

---

## Testing a Dialogue

### Manual Testing

1. Add your dialogue file to `src/dialogue/dialogues/`
2. Reference it in a state transition (e.g., from `NEW_GAME_PLACEHOLDER` to `DIALOGUE` with your dialogue ID)
3. Run the engine and navigate to the dialogue

### Verification Checklist

- [ ] Dialogue loads without errors
- [ ] Nodes resolve correctly (O(1) lookup)
- [ ] Speaker names display correctly
- [ ] Expressions render from sprite metadata
- [ ] Choices resolve and advance to the correct nodes
- [ ] Events fire when nodes are entered
- [ ] Conditions evaluate correctly
- [ ] Dialogue completion emits `DialogueFinished`

---

## Common Patterns

### Intro Sequence

```json
{
    "id": "intro_sequence",
    "metadata": { "language": "en", "version": 1 },
    "startNode": "intro_001",
    "nodes": {
        "intro_001": {
            "speaker": "patches",
            "expression": "neutral",
            "text": "Placeholder dialogue system online.",
            "events": [
                { "type": "SET_FLAG", "flag": "intro_started", "value": true }
            ],
            "next": "intro_002"
        },
        "intro_002": {
            "speaker": "vesper",
            "expression": "curious",
            "text": "Dialogue graph connection successful.",
            "next": "intro_end"
        },
        "intro_end": {
            "speaker": "patches",
            "expression": "happy",
            "text": "Welcome to the game.",
            "events": [
                { "type": "SET_FLAG", "flag": "intro_complete", "value": true }
            ]
        }
    }
}
```

### Quest Dialogue

```json
{
    "id": "quest_giver_intro",
    "metadata": { "language": "en", "version": 1 },
    "startNode": "quest_start",
    "nodes": {
        "quest_start": {
            "speaker": "patches",
            "expression": "determined",
            "text": "I need your help with something.",
            "choices": [
                { "text": "Tell me more", "next": "quest_details" },
                { "text": "Not interested", "next": "quest_refused" }
            ]
        },
        "quest_details": {
            "speaker": "patches",
            "expression": "neutral",
            "text": "Something stirs in the old ruins.",
            "events": [
                { "type": "SET_FLAG", "flag": "quest_accepted", "value": true }
            ],
            "next": "quest_end"
        },
        "quest_refused": {
            "speaker": "vesper",
            "expression": "annoyed",
            "text": "Your loss.",
            "next": "quest_end"
        },
        "quest_end": {
            "speaker": "patches",
            "expression": "smug",
            "text": "Come back when you're ready."
        }
    }
}
```

---

## File Naming Conventions

- Use `snake_case` for dialogue file names: `new_game_intro.json`, `quest_giver.json`
- Use `snake_case` for node IDs: `intro_001`, `branch_a`, `quest_complete`
- Use `kebab-case` for character JSON files: `patches.json`, `vesper.json`

---

## Performance Notes

- Node lookup is O(1) using Map keyed by node ID
- No traversal searching or array scanning
- Lazy loading supported (dialogues loaded on demand)
- Reusable nodes supported (multiple paths can reference the same node)
- The system is designed to support thousands of dialogue nodes without architectural changes
