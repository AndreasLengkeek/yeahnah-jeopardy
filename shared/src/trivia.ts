// Ported verbatim from the imported Claude Design canvas ("Jeopardy Board.dc.html",
// project "Jeopardy Web App UI"). Board size, clue text, and values are the source
// of truth from that design — do not redesign them here.

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
