
// src/storage.ts
import * as state from './state';
import type { Scenario, Adventure, GlobalSettings, Card, AvailableTextModel } from './types'; // Added Card
import { AVAILABLE_TEXT_MODELS } from './types'; // Import available models
import { generateId } from './utils';

const GLOBAL_SETTINGS_KEY = 'aiStoryteller_globalSettings';
const SCENARIOS_KEY = 'aiStoryteller_scenarios';
const ADVENTURES_KEY = 'aiStoryteller_adventures';
// REMOVED: const DEFAULT_SCENARIO_TEMPLATE_KEY = 'aiStoryteller_defaultScenarioTemplate';

export function loadGlobalSettingsFromStorage() {
    const storedSettings = localStorage.getItem(GLOBAL_SETTINGS_KEY);
    if (storedSettings) {
        try {
            const parsedSettings = JSON.parse(storedSettings) as Partial<GlobalSettings>;
            state.updateGlobalSettings({
                responseHandlingStrategy: parsedSettings.responseHandlingStrategy || 'truncate',
                allowAiThinking: parsedSettings.allowAiThinking === undefined ? false : parsedSettings.allowAiThinking, // Default false
                globalMaxOutputTokens: parsedSettings.globalMaxOutputTokens || 200,
                selectedModel: (parsedSettings.selectedModel && AVAILABLE_TEXT_MODELS.includes(parsedSettings.selectedModel as AvailableTextModel)) 
                                ? parsedSettings.selectedModel as AvailableTextModel 
                                : 'gemma-3-27b-it', // Default gemma-3-27b-it
            });
        } catch (e) {
            console.error("Failed to parse global settings from localStorage", e);
            // Defaults are already set in state.ts: allowAiThinking=false, selectedModel='gemma-3-27b-it'
        }
    } else {
        // No stored settings, defaults from state.ts will be used.
        state.updateGlobalSettings({
            allowAiThinking: false,
            selectedModel: 'gemma-3-27b-it'
        });
    }
}

export function saveGlobalSettingsToStorage() {
    const settingsToSave: GlobalSettings = {
        responseHandlingStrategy: state.responseHandlingStrategy,
        allowAiThinking: state.allowAiThinking,
        globalMaxOutputTokens: state.globalMaxOutputTokens,
        selectedModel: state.selectedModel,
    };
    try {
        localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(settingsToSave));
    } catch (e) {
        console.error("Failed to save global settings to localStorage", e);
        alert("Warning: Could not save global settings. Your browser's storage might be full or disabled.");
    }
}

// Helper function to migrate/process card keys during loading
function processCardKeys(card: any): string { // Use 'any' for card temporarily due to potential old format
    if (Array.isArray(card.keys)) {
        return card.keys.join(', '); // Join array into a string
    }
    if (typeof card.keys === 'string') {
        return card.keys; // Already a string
    }
    return ""; // Default to empty string if undefined or other type
}

// Factory for the "Neon Static" scenario to ensure it's always available
// IMPORTANT: This function should generate new card IDs each time it's called to ensure uniqueness
// if it's used to populate an empty scenario list.
function getFactoryDefaultScenario(): Scenario {
    return {
      id: generateId(), // Assign a NEW ID to this instance of the scenario
      name: "Neon Static: Requiem for a Hollow Man",
      instructions: `You are a gritty, techno-noir storyteller. The year is 2048 in San Francisco, a city of corporate control, stark class divides between 'Chromes' (gene-edited elites) and 'Naturals' (unmodified humans), and perpetual rain. The player character is Vincent 'Dean' Marlowe, a jaded detective haunted by his military past, his wife Lila's unsolved disappearance (linked to the mysterious 'Project Icarus'), and a recent 17-month coma that cost him his leg. He is partnered with Rook (R-02), an experimental, potentially evolving AI robot whose development might be influenced by player choices.
Focus on investigation, moral ambiguity, and the oppressive atmosphere. Dean is often insubordinate and driven by a personal vendetta. Corporations like Kryotek Industries and VitaCorp wield immense power.
Use the provided plot essentials, author's notes, and character/world cards to enrich the narrative. The story begins with Dean in his office, reflecting on his situation, before being assigned a new case that hints at a deeper conspiracy related to Project Icarus. Adapt to player actions, describing sights, sounds, and internal thoughts where appropriate.`,
      plotEssentials: `San Francisco, 2048
A city of fractured dreams, where corporate titans Kryotek Industries (hardware overlords) and VitaCorp (bioengineering pioneers) wage a silent war through proxy gangs, hacked infrastructure, and whispered lies. The streets hum with holographic ads and the static of unspoken truths. Justice is a commodity, and the police wear badges polished by corporate bribes.

Vincent “Dean” Marlowe
A hollowed-out detective with a military past and a Kryotek prosthetic leg he despises. Two years ago, his wife, Lila—a journalist investigating VitaCorp’s secret Project Icarus—vanished. Officially, it was an accident. Dean knows better. After surviving a near-fatal shooting and a 17-month coma, he’s been sidelined by the department but refuses to quit. His only ally: Rook (R-02), a Kryotek-designed “non-sentient” investigative drone assigned to monitor him. But Rook’s evolving. It asks questions. It hesitates.

The Corps:
Kryotek Industries: Masters of hardware. Their prosthetics (like Dean’s leg) come with backdoor surveillance. Rook’s chassis bears their serpentine logo—a silent threat.
VitaCorp: Bioengineering overlords. Rumors swirl that Project Icarus aims to merge human DNA with machine consciousness.

The Case:
A string of seemingly random deaths—a mugging, robbery, and suicide—mask a chilling pattern. Victims, both Chromes and Naturals, bear a faint laser-burned helix (VitaCorp’s Phase 1 trial marker) and ties to neural tech: a biostatistician with a prototype implant, a mechanic modifying surveillance drones, and a Chrome heiress linked to a cryptic Icarus voicemail. Dismissed by police and spun by corporate PR, the cases reek of staged chaos—until Dean and Rook connect the dots. The helix symbols map to a neural network, revealing Project Icarus’s true aim: uploading human consciousness into corporate servers. The victims? Failed test subjects. To prove it, Dean must navigate VitaCorp’s gilded clinics, Crimson Bazaar’s black-market tech, and Echo Pier’s flooded smuggling tunnels, racing against Kryotek’s backdoor surveillance and Rook’s escalating defiance of its protocols. The truth is a ghost in the machine—erased, unless a broken detective and a glitching robot can trace its pulse.

Key Conflicts
Dean vs. Himself: Chain-smoking guilt and nicotine, haunted by Lila’s hologram.
Dean vs. Rook: Can he trust a machine that’s learning to lie?
The Corps’ Shadow War: Kryotek’s tech vs. VitaCorp’s genetic god-complex.`,
      authorsNotes: `Genre/Tone: Grounded techno-noir with a focus on moral ambiguity and creeping corporate control. The city is livable but fraying—rain is atmospheric, not apocalyptic. Avoid dystopian tropes (no acid rain, bioluminescence, or overt surveillance). Chromes are rare, privileged, and scornful of Naturals.

Style: Lean, gritty prose. Dialogue should crackle with cynicism. Highlight contrasts: gleaming arcologies vs. rotting alleyways, Dean’s human flaws vs. Rook’s cold logic.

Themes: Corruption masquerading as progress; the cost of truth in a world built on lies; humanity in machines (and machines in humans).

Maintain grounded noir tone: No overt “chosen one” tropes. Dean’s breakthroughs come from grunt work, hunches, and Rook’s cold logic.

Chromes appear sparingly: A VitaCorp exec smirks at Dean’s theories during a tense Golden Mile interrogation, calling him “a Natural chasing ghosts.”

Key Details to Maintain:
Rook’s sentience emerges subtly—questioning protocols, analyzing emotions.
Project Icarus hints at merging human consciousness with machines.
Corps manipulate through soft power (bribes, PR, legal threats) rather than overt violence.
Tech is functional, often glitchy—not seamless or magical. No flying cars or laser guns. Focus on invasive bio-implants, surveillance drones, and AI that feels just a step away from true sentience.
The weather is a constant drizzle or downpour, reflecting the city’s mood.`,
      openingScene: `The rain taps a morse code against your office window, softer than the machines that kept you breathing for seventeen months. Your leg whirs as you shift in the chair—Kryotek Model T-7, the prosthetic’s serial number etched into your femur like a corporate brand. The desk is a relic: real wood, scarred by coffee rings and Lila’s initials carved near the drawer. Her ghost is everywhere—in the pixelated hologram looping her last message (“I’ve got a lead, Dean. Meet me at the pier.”), in the case files pinned to the walls with red thread and desperation. The department gave you this closet-sized space as a hint. You ignored it.

The department pretended to care when you woke up. Welcome back, Detective Marlowe. Take it slow. But your inbox is stuffed with noise: petty thefts, traffic violations, a memo reassigning your badge to “low-risk oversight.” Lila’s file? Locked. Project Icarus? Classified. The system wants you to sit, to fade, to become another cog.

A knock. Captain fills the doorway, her Chrome-polished veneer cracking at the edges. “Got a suicide. Golden Mile penthouse. Kid overdosed on VitaCorp’s latest ‘bliss’ cocktail.” She tosses a case file. “Make it quick. PR wants it buried before lunch.”

Dean flips the file. Tara Nguyen. Chrome heiress. Another “tragic excess” headline. But his eye snags on the tox screen—neural decay accelerant. A term Lila circled in her notes.

“I’ll take it.”

“You’re supposed to close cases, Marlowe. Not dig graves.”

You limp past her, the prosthetic grinding. “Then assign me a shovel.”
Outside, the city’s neon veins pulse—VitaCorp’s helix glowing above the flooded docks, Kryotek’s serpent coiling through ad drones. Somewhere in the static, Lila’s killer breathes.

And you’re done playing dead.
(The door hisses shut behind you. In the glass, a crimson optic band flickers—Rook, silent, observing.)
You are in the office.
`,
      cards: [ // Each card gets a new ID when factory default is generated
        { id: generateId(), type: "character", name: "Vincent 'Dean' Marlowe", description: "Jaded detective, ex-military, prosthetic leg (Kryotek). Haunted by wife Lila's disappearance (linked to Project Icarus) and a 17-month coma. Insubordinate, driven, chain-smoker.", keys: "detective, protagonist, Dean Marlowe" },
        { id: generateId(), type: "character", name: "Rook (R-02)", description: "Experimental Kryotek AI robot partner for Dean. Officially non-sentient, but showing signs of evolving awareness and questioning protocols. Designed for investigation and monitoring.", keys: "robot, AI, partner" },
        { id: generateId(), type: "character", name: "Lila Marlowe", description: "Dean's wife, a journalist who vanished investigating VitaCorp's Project Icarus. Presumed dead. Her memory drives Dean.", keys: "journalist, missing person" },
        { id: generateId(), type: "organization", name: "Kryotek Industries", description: "Hardware and cybernetics corporation. Known for prosthetics (often with surveillance backdoors) and robotics (like Rook). Competes fiercely with VitaCorp.", keys: "corporation, tech, hardware" },
        { id: generateId(), type: "organization", name: "VitaCorp", description: "Bioengineering and pharmaceutical giant. Rumored to be behind the secretive and ethically dubious 'Project Icarus,' possibly involving human-machine consciousness merging.", keys: "corporation, biotech, pharma" },
        { id: generateId(), type: "concept", name: "Project Icarus", description: "A top-secret, ethically questionable research project by VitaCorp. Details are scarce, but it's believed to involve advanced bio-integration, possibly merging human consciousness with machines. Lila Marlowe was investigating it before she disappeared.", keys: "conspiracy, secret project" },
        { id: generateId(), type: "location", name: "San Francisco, 2048", description: "A city of perpetual rain, stark class divides (Chromes vs. Naturals), and overwhelming corporate power. Holographic ads illuminate grime-streaked streets.", keys: "city, setting, San Francisco" },
        { id: generateId(), type: "location", name: "Dean's Office", description: "A cramped, messy SFPD office. Smells of stale synth-coffee. Contains a desk, a flickering holographic projector (often showing Lila), and a window overlooking rainy streets.", keys: "office, police station" },
        { id: generateId(), type: "item", name: "Dean's Prosthetic Leg", description: "A standard Kryotek model, functional but a source of discomfort and resentment for Dean. A constant reminder of his injuries and dependence on corporate tech.", keys: "prosthetic, item, Kryotek" },
        { id: generateId(), type: "misc", name: "Chromes", description: "Gene-edited elites, often in positions of power or wealth. View Naturals with disdain. Physically distinct due to subtle or overt augmentations.", keys: "social class, augmented humans" },
        { id: generateId(), type: "misc", name: "Naturals", description: "Unmodified humans, forming the majority of the population. Often struggle in the class-divided society.", keys: "social class, unmodified humans" }
      ],
      playerDescription: "This is the default Neon Static scenario. Explore a dark future as detective Dean Marlowe.",
      tags: "noir, cyberpunk, detective, investigation, San Francisco",
      visibility: 'private',
    };
}

// REMOVED: loadDefaultScenarioTemplate()
// REMOVED: saveDefaultScenarioTemplate()

export function loadScenariosFromStorage() {
  const storedScenarios = localStorage.getItem(SCENARIOS_KEY);
  let scenariosLoaded = false;
  if (storedScenarios) {
    try {
        const parsedScenarios: Scenario[] = JSON.parse(storedScenarios).map((scenario: any) => ({
            ...scenario,
            id: scenario.id || generateId(), // Ensure scenario has an ID
            cards: scenario.cards ? scenario.cards.map((card: any) => ({
                ...card,
                id: card.id || generateId(), // Ensure card has an ID
                keys: processCardKeys(card)
            })) : [],
            playerDescription: scenario.playerDescription || "",
            tags: scenario.tags || "",
            visibility: scenario.visibility || 'private'
        }));
        if (parsedScenarios.length > 0) {
            state.setScenarios(parsedScenarios);
            scenariosLoaded = true;
        }
    } catch (e) {
        console.error("Failed to parse scenarios from localStorage", e);
        state.setScenarios([]);
    }
  }

  if (!scenariosLoaded) { // If no scenarios in SCENARIOS_KEY or it was empty
    const factoryDefault = getFactoryDefaultScenario(); // Gets a scenario with new IDs
    state.setScenarios([factoryDefault]);
    // No longer saving a separate default template. The factory default is just the initial content if list is empty.
  }
  saveScenariosToStorage(); // Save whatever is in state.scenarios now (either loaded or newly created factory default)
}

export function saveScenariosToStorage() {
  try {
    localStorage.setItem(SCENARIOS_KEY, JSON.stringify(state.scenarios));
  } catch (e) {
    console.error("Failed to save scenarios to localStorage", e);
    alert("Warning: Could not save scenario changes. Your browser's storage might be full or disabled.");
  }
}

export function loadAdventuresFromStorage() {
    const storedAdventures = localStorage.getItem(ADVENTURES_KEY);
    if (storedAdventures) {
        try {
            const parsedAdventures: Adventure[] = JSON.parse(storedAdventures).map((adventure: any) => ({
                ...adventure,
                scenarioSnapshot: {
                    ...adventure.scenarioSnapshot,
                    cards: adventure.scenarioSnapshot.cards ? adventure.scenarioSnapshot.cards.map((card: any) => ({
                        ...card,
                        keys: processCardKeys(card)
                    })) : [],
                    playerDescription: adventure.scenarioSnapshot.playerDescription || "",
                    tags: adventure.scenarioSnapshot.tags || "",
                    visibility: adventure.scenarioSnapshot.visibility || 'private'
                }
            }));
            state.setAdventures(parsedAdventures);
        } catch (e) {
            console.error("Failed to parse adventures from localStorage", e);
            state.setAdventures([]);
        }
    }
}

export function saveAdventuresToStorage() {
    try {
        localStorage.setItem(ADVENTURES_KEY, JSON.stringify(state.adventures));
    } catch (e) {
        console.error("Failed to save adventures to localStorage", e);
        alert("Warning: Could not save adventure progress. Your browser's storage might be full or disabled.");
    }
}
