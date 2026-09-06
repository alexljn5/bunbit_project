// God menu handler - combines all menu god functions into a single entry point
// This is the central menu handler imported by renderengine.js

import { menuSettingsGodFunction } from './ingame_menu/settings/menusettings.js';

export function menuHandler() {
    menuSettingsGodFunction();
}
