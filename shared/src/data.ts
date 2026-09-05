// Ported verbatim from the imported Claude Design canvas ("Jeopardy Board.dc.html",
// project "Jeopardy Web App UI"). Board size, clue text, values, and theme palettes
// are the source of truth from that design — do not redesign them here.

export interface ClueData {
  text: string;
  answer: string;
}

export interface CategoryData {
  name: string;
  clues: ClueData[];
}

export const CATS: CategoryData[] = [
  {
    name: "World Capitals",
    clues: [
      { text: "This Baltic capital sits on the Vilnia River", answer: "Vilnius" },
      { text: "Africa's highest capital city, at 2,355 m", answer: "Addis Ababa" },
      { text: "Its old town is called Gamla stan", answer: "Stockholm" },
      { text: "Purpose-built in 1960 to replace Rio", answer: "Brasilia" },
      { text: "The seat of government of Bolivia", answer: "La Paz" },
    ],
  },
  {
    name: "The Periodic Table",
    clues: [
      { text: "Symbol Fe, atomic number 26", answer: "Iron" },
      { text: "The only metal liquid at room temperature", answer: "Mercury" },
      { text: "Named for the Greek word for 'lazy'", answer: "Argon" },
      { text: "Element 79, and the standard of wealth", answer: "Gold" },
      { text: "The lightest of the halogens", answer: "Fluorine" },
    ],
  },
  {
    name: "Silent Film",
    clues: [
      { text: "1927's 'Metropolis' was directed by this man", answer: "Fritz Lang" },
      { text: "This comic hung from a clock face in 'Safety Last!'", answer: "Harold Lloyd" },
      { text: "The 1925 film that made a shipboard staircase famous", answer: "Battleship Potemkin" },
      { text: "Nickname of Buster Keaton, for his unmoving face", answer: "The Great Stone Face" },
      { text: "This 1922 vampire film was an unlicensed Dracula", answer: "Nosferatu" },
    ],
  },
  {
    name: "Deep Water",
    clues: [
      { text: "The deepest point in the ocean bears this name", answer: "Challenger Deep" },
      { text: "This whale dives past 2,000 m hunting squid", answer: "The sperm whale" },
      { text: "The zone from 200 to 1,000 m, or 'twilight'", answer: "The mesopelagic" },
      { text: "Chemical process powering hydrothermal vent life", answer: "Chemosynthesis" },
      { text: "The 1960 sub that reached the Mariana Trench", answer: "The Trieste" },
    ],
  },
  {
    name: "Idioms & Phrases",
    clues: [
      { text: "To do this to the bullet is to endure pain", answer: "Bite it" },
      { text: "This colour of herring is a misleading clue", answer: "Red" },
      { text: "Nautical origin phrase for barely enough room", answer: "By and large" },
      { text: "To 'pull out all' of these is to give full effort", answer: "The stops" },
      { text: "This baked good, when taken, means something is easy", answer: "Cake" },
    ],
  },
];

export const VALUES: number[] = [100, 200, 300, 400, 500];

export interface ThemePalette {
  shell: string;
  header: string;
  headerFg: string;
  tile: [string, string];
  tileFlat: string;
  hover: string;
  used: string;
  panel: string;
  card: string;
  accent: string;
}

export const THEMES: Record<string, ThemePalette> = {
  "Classic Navy": { shell: "#050a2a", header: "#0d1442", headerFg: "#fff", tile: ["#2a52f0", "#1735c4"], tileFlat: "#1e42e0", hover: "#3d63ff", used: "#0a0f30", panel: "#1638d8", card: "#0d1442", accent: "#f2c14e" },
  "Studio Teal": { shell: "#04211f", header: "#0a3230", headerFg: "#fff", tile: ["#0e7c72", "#08574f"], tileFlat: "#0b6b62", hover: "#149a8d", used: "#062724", panel: "#0b6b62", card: "#0a3230", accent: "#ffd166" },
  "Deep Plum": { shell: "#1d0a2b", header: "#2c1140", headerFg: "#fff", tile: ["#6f2bb0", "#4d1c7d"], tileFlat: "#5e2496", hover: "#8a3ad3", used: "#250f36", panel: "#5e2496", card: "#2c1140", accent: "#f6c9ff" },
  "Ink & Coral": { shell: "#14161c", header: "#22252e", headerFg: "#fff", tile: ["#2f3542", "#232833"], tileFlat: "#2a303c", hover: "#3d4553", used: "#1a1d24", panel: "#2a303c", card: "#22252e", accent: "#ff7a5c" },
  "Cobalt & Mint": { shell: "#071a33", header: "#0c2647", headerFg: "#fff", tile: ["#1c62c9", "#12459a"], tileFlat: "#1755b3", hover: "#2a7ae8", used: "#0a1f3b", panel: "#1755b3", card: "#0c2647", accent: "#8ff0c8" },
  "Sunset Brick": { shell: "#26100c", header: "#3a1a13", headerFg: "#fff", tile: ["#b8442a", "#8c3120"], tileFlat: "#a63b25", hover: "#d65535", used: "#2e130e", panel: "#a63b25", card: "#3a1a13", accent: "#ffd9a0" },
};

// Fixed for v1 per spec: only this theme/accent/tile-style/title combination is wired
// up for display. The rest of THEMES is carried over as unused data, not exposed as a setting.
export const GAME_TITLE = "Yeah Nah Jeopardy";
export const BOARD_THEME = "Cobalt & Mint";
export const ACCENT_COLOR = "#f2c14e";
export const TILE_STYLE = "Embossed";
