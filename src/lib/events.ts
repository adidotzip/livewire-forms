export const EVENT_LIST = [
  "Ascension — Valorant",
  "Ascension — Rocket League",
  "Ascension — BGMI",
  "Dynamic Racing Showdown",
  "Paradox Palette",
  "Sandbox Mania",
  "APPetite",
  "Frame by Frame",
  "Venture Verse",
  "Aenigma Syntax",
  "HackerRank",
  "Aperture Alchemy",
  "Voxel Visionaries"
];

export const EVENT_DETAILS: Record<string, { teamSize: number | null; requiresInGameId: boolean; idFormat: string }> = {
  "Ascension — Valorant": { teamSize: 5, requiresInGameId: true, idFormat: "Riot ID (Username#Tagline)" },
  "Ascension — Rocket League": { teamSize: 4, requiresInGameId: true, idFormat: "Epic Games ID / Rocket ID" },
  "Ascension — BGMI": { teamSize: 4, requiresInGameId: true, idFormat: "10-digit Character ID and IGN" },
  "Dynamic Racing Showdown": { teamSize: 4, requiresInGameId: false, idFormat: "" },
  "Paradox Palette": { teamSize: null, requiresInGameId: false, idFormat: "" }, // No limit
  "Sandbox Mania": { teamSize: null, requiresInGameId: false, idFormat: "" },
  "APPetite": { teamSize: null, requiresInGameId: false, idFormat: "" },
  "Frame by Frame": { teamSize: null, requiresInGameId: false, idFormat: "" },
  "Venture Verse": { teamSize: null, requiresInGameId: false, idFormat: "" },
  "Aenigma Syntax": { teamSize: null, requiresInGameId: false, idFormat: "" },
  "HackerRank": { teamSize: 1, requiresInGameId: false, idFormat: "" },
  "Aperture Alchemy": { teamSize: 1, requiresInGameId: false, idFormat: "" },
  "Voxel Visionaries": { teamSize: 1, requiresInGameId: false, idFormat: "" },
};
