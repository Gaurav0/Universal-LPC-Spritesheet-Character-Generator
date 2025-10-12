// Constants used throughout the application

// License configuration - single source of truth
export const LICENSE_CONFIG = [
	{
		key: "CC0",
		label: "CC0",
		versions: ["CC0"],
		url: "https://creativecommons.org/public-domain/cc0/"
	},
	{
		key: "CC-BY-SA",
		label: "CC-BY-SA",
		versions: ["CC-BY-SA 3.0", "CC-BY-SA 4.0"],
		url: "https://creativecommons.org/licenses/by-sa/4.0/deed.en",
		urlLabel: "4.0"
	},
	{
		key: "CC-BY",
		label: "CC-BY",
		versions: ["CC-BY 3.0+", "CC-BY 3.0", "CC-BY 4.0", "CC-BY"],
		url: "https://creativecommons.org/licenses/by/4.0/",
		urlLabel: "4.0"
	},
	{
		key: "OGA-BY",
		label: "OGA-BY",
		versions: ["OGA-BY 3.0", "OGA-BY 3.0+", "OGA-BY 4.0"],
		url: "https://static.opengameart.org/OGA-BY-3.0.txt",
		urlLabel: "3.0"
	},
	{
		key: "GPL",
		label: "GPL",
		versions: ["GPL 2.0", "GPL 3.0"],
		url: "https://www.gnu.org/licenses/gpl-3.0.en.html#license-text",
		urlLabel: "3.0"
	}
];

// Animation list - used for filters and preview
export const ANIMATIONS = [
	{ value: 'spellcast', label: 'Spellcast' },
	{ value: 'thrust', label: 'Thrust' },
	{ value: 'walk', label: 'Walk' },
	{ value: 'slash', label: 'Slash' },
	{ value: 'shoot', label: 'Shoot' },
	{ value: 'hurt', label: 'Hurt' },
	{ value: 'climb', label: 'Climb' },
	{ value: 'idle', label: 'Idle' },
	{ value: 'jump', label: 'Jump' },
	{ value: 'sit', label: 'Sit' },
	{ value: 'emote', label: 'Emote' },
	{ value: 'run', label: 'Run' },
	{ value: 'watering', label: 'Watering' },
	{ value: 'combat', label: 'Combat Idle' },
	{ value: '1h_slash', label: '1-Handed Slash' },
	{ value: '1h_backslash', label: '1-Handed Backslash' },
	{ value: '1h_halfslash', label: '1-Handed Halfslash' }
];
