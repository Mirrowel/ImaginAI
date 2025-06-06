# ImaginAI [![License](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png)](https://creativecommons.org/licenses/by-nc-sa/4.0/) [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/C0C0UZS4P)

> Web-based interactive fiction powered by AI  
> “AI Dungeon at Home” Edition  

ImaginAI (aka Taleon.ai, imagin.ai) lets you craft rich story worlds with **Scenario Templates** and embark on unique **Adventures**. Powered by large language models, the narrative evolves based on your actions and dialogue.

## Key Features

- **Scenario Templates**  
    Define your world, characters, tags and opening scenes—then save, edit, import/export or duplicate them.  
- **Adventures**  
    Launch playthroughs from a template snapshot. Enjoy persistent history, editable turns, retry/continue controls and dynamic in-game settings.  
- **AI-Driven Storytelling**  
    Experience branching narratives as the AI adapts to every choice.  
- **Data Portability**  
    Backup and share templates or cards via JSON.  
- **Local Persistence**  
    All scenarios, adventures and global settings are stored in the browser for offline access.  

## Table of Contents

- [ImaginAI  ](#imaginai--)
  - [Key Features](#key-features)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
    - [Scenario Creation \& Management](#scenario-creation--management)
    - [Adventure Gameplay](#adventure-gameplay)
    - [Gameplay Interface](#gameplay-interface)
    - [AI Interaction \& Customization](#ai-interaction--customization)
    - [Data Persistence \& Portability](#data-persistence--portability)
    - [Global Settings](#global-settings)
  - [Technology Stack](#technology-stack)
  - [Project Structure](#project-structure)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [API Key Setup](#api-key-setup)
    - [Running the Application](#running-the-application)
  - [How to Use](#how-to-use)
    - [Creating a Scenario Template](#creating-a-scenario-template)
    - [Starting an Adventure](#starting-an-adventure)
    - [Playing the Game](#playing-the-game)
    - [Managing Cards](#managing-cards)
    - [Importing/Exporting Scenarios](#importingexporting-scenarios)
    - [Using Global Settings](#using-global-settings)

## Features

### Scenario Creation & Management

Scenario Templates are the blueprints for your stories.

-   **Rich Customization**:
    -   **Name**: A title for your scenario.
    -   **AI Instructions (System Prompt)**: Detailed instructions for the AI on how to behave, the tone to adopt, and specific rules for the story.
    -   **Plot Essentials**: Key background information, major plot points, or world-building details.
    -   **Author's Notes**: Personal notes or reminders for the scenario creator.
    -   **Opening Scene**: The initial text the AI will present when an adventure starts.
    -   **Player Description**: A brief description shown to players before they start an adventure from this template.
    -   **Tags**: Comma-separated tags for organization and potential future discovery (e.g., fantasy, sci-fi, mystery).
    -   **Visibility**: Control who can see/use the scenario (Private, Unlisted, Public - currently for organizational purposes).
-   **"Cards" System**:
    -   Define key entities like characters, locations, items, factions, or concepts.
    -   Each card has a **Type**, **Name**, **Description**, and **Keys** (comma-separated keywords).
    -   Cards are formatted and sent to the AI to provide rich context for its generations.
    -   Cards can be managed within the scenario editor: added, edited, deleted, duplicated.
-   **CRUD Operations**: Create new templates, edit existing ones, duplicate templates to create variations, and delete unneeded templates.
-   **Individual Scenario Import/Export**:
    -   **Export Scenario**: Each scenario template can be exported as a self-contained JSON file, including all its details (name, instructions, plot, cards, etc.). This is useful for backups or sharing.
    -   **Import Scenario**: Import a scenario from a previously exported JSON file. The imported scenario will be given a new unique ID (and its cards will also receive new unique IDs) to prevent conflicts with existing scenarios.
-   **Card Import/Export (within Editor)**:
    -   **Standard JSON Format**: Export your scenario's cards to a JSON file or import cards from a compatible JSON file, replacing existing cards within the current scenario being edited.
    -   **AI Dungeon Compatible JSON Format**: Export cards in a format compatible with AI Dungeon's JSON structure, or import cards from such a file, within the current scenario being edited.
-   **Initial Scenario**: If no scenarios exist, a default "Neon Static" scenario is automatically provided to get you started.

### Adventure Gameplay

Adventures are individual playthroughs based on a Scenario Template.

-   **Snapshot System**: When an adventure starts, it takes a "snapshot" of the source scenario. Changes to the original template later will not affect ongoing adventures.
-   **Unique Naming**: Give each adventure its own distinct name.
-   **Persistent History**: All player actions and AI responses are saved, creating a complete story log.
-   **Turn Management**:
    -   **Edit Turns**: Modify the text of any previous player or AI turn. The subsequent story will adapt based on these changes upon the next AI interaction.
    -   **Delete Turns**: Remove any turn from the history. The story will adjust accordingly. If all turns are deleted, the adventure can be restarted from its opening scene.
-   **Player Actions**:
    -   **Do**: Describe an action your character takes.
    -   **Say**: Input dialogue for your character.
    -   **Story**: Narrate a piece of the story from an out-of-character perspective, guiding the AI.
-   **AI Controls**:
    -   **Retry**: If unsatisfied with the AI's last response, you can ask it to regenerate.
    -   **Continue**: Prompt the AI to continue the story without specific player input.
-   **Dynamic Adventure Settings**:
    -   During gameplay, modify the adventure's snapshot of AI instructions, plot essentials, author's notes, and cards via the sidebar. These changes affect only the current adventure.
-   **Adventure Management**:
    -   View a list of all your adventures, sorted by the last played date.
    -   Continue any adventure.
    -   Edit the high-level settings of an adventure (name, and its scenario snapshot details via the editor).
    -   Duplicate existing adventures to explore different story branches.
    -   Delete adventures.

### Gameplay Interface

-   **Main Story Log**: Displays the chronological history of player and AI turns, with clear distinction between them.
-   **Action Input Area**: Dynamically shows the appropriate input field (textarea) based on the selected action type (Do, Say, Story) or can be hidden.
-   **Responsive Sidebar**: Provides access to crucial adventure information and editing tools, and can be toggled:
    -   **Plot Tab**: View and edit the adventure's current AI Instructions, Plot Essentials, and Author's Notes (changes are auto-saved on blur).
    -   **Cards Tab**: View, add, edit, delete, and duplicate cards within the current adventure's snapshot.
    -   **Info Tab**: Read-only display of the adventure's name, source scenario name, player description, tags, and visibility.
    -   **Full Settings Edit**: A button to open the full editor interface for the current adventure's settings (snapshot).

### AI Interaction & Customization

-   **Powered by Gemini API**: Utilizes Google's `@google/genai` SDK to interact with powerful language models.
-   **Flexible Model Selection**: Choose from a range of Gemini and Gemma models through the Global Settings.
-   **Sophisticated Prompt Engineering**:
    -   A **Base System Instruction** is always prepended to ensure consistent AI behavior and seamless turn continuation.
    -   Scenario-specific instructions further guide the AI.
    -   Formatted "Cards" are included in the context sent to the AI.
    -   Chat history is appropriately managed for coherent storytelling.
-   **Response Handling**:
    -   **Truncate**: If an AI response exceeds the token limit, it's intelligently cut off at the nearest sentence end.
    -   **Summarize**: (Optional) If a response is too long, the AI can be prompted to summarize it, aiming for the token limit.
-   **"Allow AI Thinking" Option**:
    -   For specific models (e.g., `gemini-2.5-flash-preview-04-17`), this enables/disables a dedicated thinking budget (`thinkingConfig: { thinkingBudget: 0 }` when off).
    -   For other models, this setting primarily influences output token limits. Enabling it may lead to higher quality but potentially slower responses. Disabling it prioritizes lower latency.
-   **Configurable Token Limits**: Set a global maximum output token limit for AI responses.

### Data Persistence & Portability

-   **Local Storage**: All Scenarios, Adventures, and Global Settings are saved in the browser's `localStorage`, enabling offline access and data persistence across sessions.
-   **JSON Export/Import for Scenarios**: Backup, share, and manage entire scenario templates via JSON files.
-   **JSON Export/Import for Cards (within Editor)**: Facilitates backup, sharing, and migration of card data between scenarios or with other compatible applications.

### Global Settings

Accessible via a "Settings" button in the main header.

-   **AI Model Selection**: Choose the preferred Gemini/Gemma model for generating story content. The list of models dynamically updates if "Allow AI Thinking" is enabled, showing only models compatible with explicit thinking control.
-   **Response Handling Strategy**: Select either "Truncate" or "Summarize" for long AI responses.
-   **Allow AI Thinking**: Toggle the AI thinking time/latency preference.
-   **Global Max Output Tokens**: Define the target length for AI-generated text (50-800 tokens).
-   **Base System Instruction Display**: View the read-only base instruction that guides the AI's core behavior.

## Technology Stack

-   **Frontend**: HTML5, CSS3, TypeScript (compiled to ES6 modules in the browser)
-   **AI**: Google Gemini API via `@google/genai` SDK
-   **Markdown Rendering**: `marked` library for parsing Markdown in AI responses.
-   **HTML Sanitization**: `DOMPurify` for sanitizing HTML output from Markdown.
-   **State Management**: Custom, lightweight state module (`src/state.ts`).
-   **Storage**: Browser `localStorage`.
-   **UI**: No major UI framework; direct DOM manipulation with a focus on vanilla JS/TS patterns and good component-like organization of render functions.

## Project Structure

The `index.html` file may contain hidden file input elements for import functionalities.
```
.
├── index.html                # Main HTML file, application host
├── index.tsx                 # Main TypeScript entry point
├── metadata.json             # Project metadata for the hosting environment
├── README.md                 # This file
└── src/
    ├── config.ts             # API key and Gemini AI client initialization
    ├── domElements.ts        # Centralized DOM element selectors
    ├── geminiService.ts      # Logic for interacting with the Gemini API
    ├── state.ts              # Application state management
    ├── storage.ts            # localStorage interaction logic
    ├── types.ts              # TypeScript interfaces and type definitions
    ├── utils.ts              # Utility functions (ID generation, sanitization, etc.)
    ├── viewManager.ts        # Controls view rendering and navigation logic
    │
    ├── eventHandlers/          # Directory for event handling modules
    │   ├── index.ts            # Barrel file for event handlers
    │   ├── adventureEventHandlers.ts
    │   ├── cardEventHandlers.ts
    │   ├── gameplayEventHandlers.ts
    │   ├── globalSettingsEventHandlers.ts
    │   ├── scenarioEventHandlers.ts
    │   └── unifiedSaveHandler.ts 
    │   └── modalEventHandlers.ts
    │
    └── ui/                     # UI rendering modules
        ├── index.ts            # Barrel file for all UI modules
        ├── adventureListRenderer.ts
        ├── scenarioListRenderer.ts
        ├── settingsRenderer.ts
        ├── confirmationModalRenderer.ts
        │
        ├── gameplay/           # Directory for gameplay view components
        │   ├── index.ts        # Barrel file for gameplay UI
        │   ├── gameplayMainRenderer.ts
        │   ├── gameplayHeaderRenderer.ts
        │   ├── gameplayHistoryRenderer.ts
        │   ├── gameplayActionAreaRenderer.ts
        │   ├── gameplaySidebarRenderer.ts
        │   ├── gameplaySidebarPlotTabRenderer.ts
        │   ├── gameplaySidebarCardsTabRenderer.ts
        │   └── gameplaySidebarInfoTabRenderer.ts
        │
        └── scenarioEditor/     # Directory for scenario editor components
            ├── index.ts        # Barrel file for scenario editor UI
            ├── scenarioEditorMainRenderer.ts
            ├── scenarioEditorPlotTabRenderer.ts
            ├── scenarioEditorCardsTabRenderer.ts
            └── scenarioEditorDetailsTabRenderer.ts
```

## Getting Started

### Prerequisites

-   A modern web browser (e.g., Chrome, Firefox, Edge, Safari).
-   No Node.js or build step is strictly required to run the application as-is, as it uses ES modules directly in the browser.

### API Key Setup

This application requires a Google Gemini API key to function.

1.  Obtain an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  The application is hardcoded to look for the API key in `process.env.API_KEY`. **Since this is a client-side application, you cannot directly use Node.js-style environment variables in the browser without a build step or a server.**
    For local development or direct browser use without a build process, you would typically need to:
    *   **Manually insert your API key**:
        *   Open `src/config.ts`.
        *   Modify the line `export const API_KEY = process.env.API_KEY;`
        *   Replace `process.env.API_KEY` with your actual API key string:
            ```typescript
            // src/config.ts
            // ...
            export const API_KEY = "YOUR_GEMINI_API_KEY_HERE"; // Replace with your key
            // ...
            ```
    *   **Warning**: Be extremely careful not to commit your API key to a public repository if you make this manual change. It's best to use a `.env` file and a build tool (like Vite, Webpack, Parcel) for actual deployments or shared projects to properly manage environment variables. The current setup assumes `process.env.API_KEY` will be made available by the specific environment it's deployed to (e.g., a preview environment that injects it).

### Running the Application

1.  Clone the repository (if applicable) or download the files.
2.  Ensure you have set up your API key as described above.
3.  Open the `index.html` file directly in your web browser.

## How to Use

### Creating a Scenario Template

1.  From the "Scenario Templates" view, click "Create New Template".
2.  You'll be taken to the Scenario Editor.
3.  Fill in the details under the **Plot** tab:
    -   Opening Scene
    -   Instructions for AI (System Prompt)
    -   Plot Essentials
    -   Author's Notes
4.  Switch to the **Cards** tab to add, edit, or import characters, locations, items, etc.
    -   Use the "Add New Card" form or import from JSON.
    -   Manage existing cards (edit, duplicate, delete).
    -   Utilize filter and search options to manage large sets of cards.
    -   Change display style (grid, list, compact).
5.  Switch to the **Details** tab:
    -   Set the Scenario Name.
    -   Add a Player Description, Tags, and set Visibility.
6.  Click "Create Scenario" (or "Save Changes" if editing).

### Starting an Adventure

1.  Go to the "Scenario Templates" view.
2.  Find the scenario you want to use.
3.  Click "Start New Adventure".
4.  This will take you directly into the Gameplay view for your new adventure.

### Playing the Game

-   **Read the Story**: The AI's narration will appear in the main content area.
-   **Choose an Action Type**: Click "Do", "Say", or "Story" buttons. This will reveal a textarea.
    -   Clicking an active button again will hide the textarea.
-   **Enter Your Action**: Type your input into the textarea and press `Enter` (or click a submit button if one were present).
-   **AI Responds**: The AI will generate the next part of the story.
-   **Use Sidebar**:
    -   Toggle the sidebar using the "☰" button.
    -   Navigate tabs ("Plot", "Cards", "Info") to view or edit adventure-specific details. Changes in "Plot" are saved when you click away from the field. Card changes require explicit save actions.
-   **Manage Turns**: Hover over any turn in the history to reveal "Edit" and "Delete" buttons.
-   **AI Controls**: Use "Retry" to get a new AI response for the last turn, or "Continue" to have the AI narrate without specific input.

### Managing Cards

-   **Scenario Editor**: Extensive card management tools available under the "Cards" tab, including import/export for *just the cards within that scenario*.
-   **Gameplay Sidebar**: Under the "Cards" tab in the sidebar, you can view, add, edit, duplicate, and delete cards that are part of the current adventure's *snapshot*. These changes only affect the current adventure, not the original scenario template.

### Importing/Exporting Scenarios

-   **Exporting**: From the "Scenario Templates" list, each scenario will have an "Export" button. Clicking this will download a JSON file containing the entire scenario template (all details and cards).
-   **Importing**:
    1.  From the "Scenario Templates" list, click the "Import Scenario" button.
    2.  Select a scenario JSON file (previously exported from this app or a compatible one).
    3.  The scenario will be imported, given new unique IDs, and added to your list.

### Using Global Settings

1.  Click the "Settings" button in the header.
2.  A modal will appear allowing you to:
    -   Select your preferred AI Model.
    -   Choose the Response Handling Strategy (Truncate/Summarize).
    -   Toggle "Allow AI Thinking".
    -   Set the Global Max Output Tokens.
3.  Click "Save Settings" to apply and store your preferences, or "Cancel" to discard changes for your ImaginAI experience.