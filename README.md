# ImaginAI [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/C0C0UZS4P)

![ImaginAI Logo](/Pics/1.png)

> Full-stack interactive fiction platform powered by AI  
> "AI Dungeon at Home" Edition  

ImaginAI (aka Taleon.ai, imagin.ai) is a web-based interactive storytelling application that lets you craft rich story worlds with **Scenario Templates** and embark on unique **Adventures**. Powered by AI models with intelligent API key rotation, the narrative dynamically evolves based on your actions and dialogue.

**Note:** This is a development prototype currently undergoing refactoring.

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

- [ImaginAI ](#imaginai-)
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
    - [Backend](#backend)
    - [Frontend](#frontend)
    - [Data Management](#data-management)
    - [Development Tools](#development-tools)
  - [Rotator Library Integration](#rotator-library-integration)
    - [Key Features](#key-features-1)
    - [Quick Start](#quick-start)
    - [Setup](#setup)
  - [Project Structure](#project-structure)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
      - [1. Clone the Repository](#1-clone-the-repository)
      - [2. Backend Setup](#2-backend-setup)
      - [3. Frontend Setup](#3-frontend-setup)
      - [4. Environment Configuration](#4-environment-configuration)
    - [Running the Application](#running-the-application)
    - [API Documentation](#api-documentation)
  - [How to Use](#how-to-use)
    - [Creating a Scenario Template](#creating-a-scenario-template)
    - [Starting an Adventure](#starting-an-adventure)
    - [Playing the Game](#playing-the-game)
    - [Managing Cards](#managing-cards)
    - [Importing/Exporting Scenarios](#importingexporting-scenarios)
    - [Using Global Settings](#using-global-settings)
  - [Contributing](#contributing)
  - [License](#license)
  - [Support](#support)

## Features

### Scenario Creation & Management

Scenario Templates are the blueprints for your stories.

- **Rich Customization**:
  - **Name**: A title for your scenario.
  - **AI Instructions (System Prompt)**: Detailed instructions for the AI on how to behave, the tone to adopt, and specific rules for the story.
  - **Plot Essentials**: Key background information, major plot points, or world-building details.
  - **Author's Notes**: Personal notes or reminders for the scenario creator.
  - **Opening Scene**: The initial text the AI will present when an adventure starts.
  - **Player Description**: A brief description shown to players before they start an adventure from this template.
  - **Tags**: Comma-separated tags for organization and potential future discovery (e.g., fantasy, sci-fi, mystery).
  - **Visibility**: Control who can see/use the scenario (Private, Unlisted, Public - currently for organizational purposes).
- **"Cards" System**:
  - Define key entities like characters, locations, items, factions, or concepts.
  - Each card has a **Type**, **Name**, **Description**, and **Keys** (comma-separated keywords).
  - Cards are formatted and sent to the AI to provide rich context for its generations.
  - Cards can be managed within the scenario editor: added, edited, deleted, duplicated.
- **CRUD Operations**: Create new templates, edit existing ones, duplicate templates to create variations, and delete unneeded templates.
- **Individual Scenario Import/Export**:
  - **Export Scenario**: Each scenario template can be exported as a self-contained JSON file, including all its details (name, instructions, plot, cards, etc.). This is useful for backups or sharing.
  - **Import Scenario**: Import a scenario from a previously exported JSON file. The imported scenario will be given a new unique ID (and its cards will also receive new unique IDs) to prevent conflicts with existing scenarios.
- **Card Import/Export (within Editor)**:
  - **Standard JSON Format**: Export your scenario's cards to a JSON file or import cards from a compatible JSON file, replacing existing cards within the current scenario being edited.
  - **AI Dungeon Compatible JSON Format**: Export cards in a format compatible with AI Dungeon's JSON structure, or import cards from such a file, within the current scenario being edited.
- **Initial Scenario**: If no scenarios exist, a default "Neon Static" scenario is automatically provided to get you started.

### Adventure Gameplay

Adventures are individual playthroughs based on a Scenario Template.

- **Snapshot System**: When an adventure starts, it takes a "snapshot" of the source scenario. Changes to the original template later will not affect ongoing adventures.
- **Unique Naming**: Give each adventure its own distinct name.
- **Persistent History**: All player actions and AI responses are saved, creating a complete story log.
- **Turn Management**:
  - **Edit Turns**: Modify the text of any previous player or AI turn. The subsequent story will adapt based on these changes upon the next AI interaction.
  - **Delete Turns**: Remove any turn from the history. The story will adjust accordingly. If all turns are deleted, the adventure can be restarted from its opening scene.
- **Player Actions**:
  - **Do**: Describe an action your character takes.
  - **Say**: Input dialogue for your character.
  - **Story**: Narrate a piece of the story from an out-of-character perspective, guiding the AI.
- **AI Controls**:
  - **Retry**: If unsatisfied with the AI's last response, you can ask it to regenerate.
  - **Continue**: Prompt the AI to continue the story without specific player input.
- **Dynamic Adventure Settings**:
  - During gameplay, modify the adventure's snapshot of AI instructions, plot essentials, author's notes, and cards via the sidebar. These changes affect only the current adventure.
- **Adventure Management**:
  - View a list of all your adventures, sorted by the last played date.
  - Continue any adventure.
  - Edit the high-level settings of an adventure (name, and its scenario snapshot details via the editor).
  - Duplicate existing adventures to explore different story branches.
  - Delete adventures.

### Gameplay Interface

- **Main Story Log**: Displays the chronological history of player and AI turns, with clear distinction between them.
- **Action Input Area**: Dynamically shows the appropriate input field (textarea) based on the selected action type (Do, Say, Story) or can be hidden.
- **Responsive Sidebar**: Provides access to crucial adventure information and editing tools, and can be toggled:
  - **Plot Tab**: View and edit the adventure's current AI Instructions, Plot Essentials, and Author's Notes (changes are auto-saved on blur).
  - **Cards Tab**: View, add, edit, delete, and duplicate cards within the current adventure's snapshot.
  - **Info Tab**: Read-only display of the adventure's name, source scenario name, player description, tags, and visibility.
  - **Full Settings Edit**: A button to open the full editor interface for the current adventure's settings (snapshot).

### AI Interaction & Customization

- **Powered by Gemini API**: Utilizes Google's `@google/genai` SDK to interact with powerful language models.
- **Flexible Model Selection**: Choose from a range of Gemini and Gemma models through the Global Settings.
- **Sophisticated Prompt Engineering**:
  - A **Base System Instruction** is always prepended to ensure consistent AI behavior and seamless turn continuation.
  - Scenario-specific instructions further guide the AI.
  - Formatted "Cards" are included in the context sent to the AI.
  - Chat history is appropriately managed for coherent storytelling.
- **Response Handling**:
  - **Truncate**: If an AI response exceeds the token limit, it's intelligently cut off at the nearest sentence end.
  - **Summarize**: (Optional) If a response is too long, the AI can be prompted to summarize it, aiming for the token limit.
- **"Allow AI Thinking" Option**:
  - For specific models (e.g., `gemini-2.5-flash-preview-04-17`), this enables/disables a dedicated thinking budget (`thinkingConfig: { thinkingBudget: 0 }` when off).
  - For other models, this setting primarily influences output token limits. Enabling it may lead to higher quality but potentially slower responses. Disabling it prioritizes lower latency.
- **Configurable Token Limits**: Set a global maximum output token limit for AI responses.

### Data Persistence & Portability

- **PostgreSQL Database**: All scenarios, adventures, and game state are stored server-side in PostgreSQL for reliable persistence
- **Redis Caching**: Frequently accessed data is cached in Redis for improved performance
- **RESTful API**: Django REST Framework provides a robust API for all data operations
- **JSON Export/Import for Scenarios**: Backup, share, and manage entire scenario templates via JSON files
- **JSON Export/Import for Cards**: Facilitates backup, sharing, and migration of card data between scenarios or with other compatible applications

### Global Settings

Accessible via a "Settings" button in the main header.

- **AI Model Selection**: Choose the preferred Gemini/Gemma model for generating story content. The list of models dynamically updates if "Allow AI Thinking" is enabled, showing only models compatible with explicit thinking control.
- **Response Handling Strategy**: Select either "Truncate" or "Summarize" for long AI responses.
- **Allow AI Thinking**: Toggle the AI thinking time/latency preference.
- **Global Max Output Tokens**: Define the target length for AI-generated text (50-800 tokens).
- **Base System Instruction Display**: View the read-only base instruction that guides the AI's core behavior.

## Technology Stack

### Backend
- **Python 3.x** with **Django 5.2+** web framework
- **Django REST Framework** for RESTful API
- **PostgreSQL** database for persistent storage
- **Redis** for caching and session management
- **Google Generative AI SDK** (`google-generativeai`) for AI model interaction
- **Rotator Library** ([LLM-API-Key-Proxy](https://github.com/Mirrowel/LLM-API-Key-Proxy)) for intelligent API key rotation and retry logic

### Frontend
- **Vite** - Modern build tool and development server
- **TypeScript** - Type-safe JavaScript
- **HTML5, CSS3** - Modern web standards
- **Google Gemini SDK** (`@google/genai`) for client-side AI interactions
- **marked** - Markdown parsing for AI-generated content
- **DOMPurify** - HTML sanitization for security

### Data Management
- **PostgreSQL** - Primary database for scenarios, adventures, and user data
- **Redis** - Caching layer for improved performance
- **JSON Export/Import** - Data portability for scenarios and cards

### Development Tools
- **npm** - Frontend package management
- **pip** - Python package management
- **Git** - Version control


## Rotator Library Integration

ImaginAI integrates the **rotator_library** from the [LLM-API-Key-Proxy](https://github.com/Mirrowel/LLM-API-Key-Proxy) project for intelligent API key rotation and advanced retry logic when calling AI models.

### Key Features

- **Smart API Key Rotation**: Automatically cycles through multiple API keys with intelligent failover
- **Dual-Mode Support**: Works in development (local `lib/`) or production (pip-installed package)
- **Multi-Provider Support**: Compatible with OpenAI, Anthropic, Google Gemini, and more
- **OAuth Support**: Built-in OAuth flows for providers like Gemini CLI, Qwen, and iFlow
- **Automatic Retry Logic**: Exponential backoff with rate limit detection
- **Usage Tracking**: Detailed per-key statistics and cost monitoring

### Quick Start

The library is automatically available via the import shim in `backend/lib_imports/`:

```python
from backend.lib_imports.rotator_library import RotatingClient

async with RotatingClient(api_keys={"gemini": [api_key]}) as client:
    response = await client.acompletion(
        model="gemini/gemini-1.5-flash",
        messages=[{"role": "user", "content": "Hello!"}]
    )
```

### Setup

**Production Mode** (recommended):
```bash
pip install -r requirements.txt
# Installs from GitHub automatically
```

**Development Mode** (local lib/ folder):
```bash
cd lib
git clone https://github.com/Mirrowel/LLM-API-Key-Proxy.git
cp -r LLM-API-Key-Proxy/src/rotator_library .
cd ..
```

For comprehensive setup instructions, see [`docs/ROTATOR_LIBRARY_SETUP.md`](docs/ROTATOR_LIBRARY_SETUP.md).

## Project Structure

```
.
├── backend/                      # Django backend
│   ├── imaginai_backend/         # Django project settings
│   │   ├── __init__.py
│   │   ├── settings.py          # Main Django settings
│   │   ├── urls.py              # URL routing
│   │   ├── wsgi.py              # WSGI config
│   │   └── asgi.py              # ASGI config
│   ├── api/                      # Django REST API app
│   │   ├── models.py            # Database models (Scenario, Adventure, etc.)
│   │   ├── views.py             # API view logic
│   │   ├── serializers.py       # DRF serializers
│   │   ├── urls.py              # API URL routing
│   │   ├── default_scenario.json # Default scenario template
│   │   └── migrations/          # Database migrations
│   ├── lib_imports/              # Import shim for rotator_library
│   │   └── __init__.py          # Dual-mode import logic
│   ├── examples/                 # Example usage scripts
│   ├── tests/                    # Backend tests
│   └── manage.py                 # Django management script
├── src/                          # Frontend TypeScript source
│   ├── config.ts                 # API key and client initialization
│   ├── domElements.ts            # DOM element selectors
│   ├── geminiService.ts          # Gemini API interaction logic
│   ├── state.ts                  # Application state management
│   ├── storage.ts               # localStorage utilities (legacy/client-side)
│   ├── types.ts                  # TypeScript type definitions
│   ├── utils.ts                  # Utility functions
│   ├── viewManager.ts            # View rendering and navigation
│   ├── eventHandlers/            # Event handling modules
│   │   ├── index.ts
│   │   ├── adventureEventHandlers.ts
│   │   ├── cardEventHandlers.ts
│   │   ├── gameplayEventHandlers.ts
│   │   ├── globalSettingsEventHandlers.ts
│   │   ├── scenarioEventHandlers.ts
│   │   ├── unifiedSaveHandler.ts
│   │   └── modalEventHandlers.ts
│   └── ui/                       # UI rendering modules
│       ├── index.ts
│       ├── adventureListRenderer.ts
│       ├── scenarioListRenderer.ts
│       ├── settingsRenderer.ts
│       ├── confirmationModalRenderer.ts
│       ├── gameplay/             # Gameplay view components
│       │   ├── index.ts
│       │   ├── gameplayMainRenderer.ts
│       │   ├── gameplayHeaderRenderer.ts
│       │   ├── gameplayHistoryRenderer.ts
│       │   ├── gameplayActionAreaRenderer.ts
│       │   ├── gameplaySidebarRenderer.ts
│       │   ├── gameplaySidebarPlotTabRenderer.ts
│       │   ├── gameplaySidebarCardsTabRenderer.ts
│       │   └── gameplaySidebarInfoTabRenderer.ts
│       └── scenarioEditor/       # Scenario editor components
│           ├── index.ts
│           ├── scenarioEditorMainRenderer.ts
│           ├── scenarioEditorPlotTabRenderer.ts
│           ├── scenarioEditorCardsTabRenderer.ts
│           └── scenarioEditorDetailsTabRenderer.ts
├── docs/                         # Documentation
│   └── ROTATOR_LIBRARY_SETUP.md # Rotator library setup guide
├── lib/                          # Local libraries (gitignored)
│   └── rotator_library/         # Local copy (optional dev mode)
├── logs/                         # Application logs
├── oauth_creds/                  # OAuth credentials (gitignored)
├── node_modules/                 # Frontend dependencies (gitignored)
├── .env                          # Environment variables (gitignored)
├── .env.example                  # Example environment configuration
├── .gitignore                    # Git ignore rules
├── index.html                    # Frontend entry HTML
├── index.tsx                     # Frontend TypeScript entry point
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Frontend dependencies
├── requirements.txt              # Backend Python dependencies
├── API_DOCUMENTATION.md          # API endpoint documentation
└── README.md                     # This file
```


## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 16+** and **npm** - [Download Node.js](https://nodejs.org/)
- **PostgreSQL 12+** - [Download PostgreSQL](https://www.postgresql.org/download/)
- **Redis 6+** - [Download Redis](https://redis.io/download/)
- **Git** - [Download Git](https://git-scm.com/downloads)

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ImaginAI.git
cd ImaginAI
```

#### 2. Backend Setup

**Create a Python virtual environment:**

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

**Install Python dependencies:**

```bash
pip install -r requirements.txt
```

**Set up PostgreSQL database:**

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE imaginai_db;
CREATE USER imaginai_user WITH PASSWORD '762533';
GRANT ALL PRIVILEGES ON DATABASE imaginai_db TO imaginai_user;
\q
```

**Run database migrations:**

```bash
cd backend
python manage.py migrate
cd ..
```

**Set up Rotator Library (optional for development):**

For detailed rotator library setup, see [`docs/ROTATOR_LIBRARY_SETUP.md`](docs/ROTATOR_LIBRARY_SETUP.md). 

Quick setup - install from GitHub:
```bash
pip install -r requirements.txt
```

Or use local development mode:
```bash
cd lib
git clone https://github.com/Mirrowel/LLM-API-Key-Proxy.git
cp -r LLM-API-Key-Proxy/src/rotator_library .
cd ..
```

#### 3. Frontend Setup

**Install npm dependencies:**

```bash
npm install
```

#### 4. Environment Configuration

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

> **Security Note**: Never commit your `.env` file to version control. It's already included in `.gitignore`.

### Running the Application

You need to run both the backend and frontend servers:

**1. Start Redis (in a separate terminal):**

```bash
# Windows (if installed as service, it auto-starts)
redis-server

# macOS (via Homebrew)
brew services start redis

# Linux
sudo systemctl start redis
# or
redis-server
```

**2. Start Django Backend (in a separate terminal):**

```bash
# Activate virtual environment if not already active
cd backend
python manage.py runserver
```

The backend API will be available at `http://127.0.0.1:8000`

**3. Start Vite Frontend Dev Server:**

```bash
# In the project root directory
npm run dev
```

The frontend will be available at `http://localhost:3000`

**4. Open your browser:**

Navigate to `http://localhost:3000` to start using ImaginAI!

### API Documentation

For detailed information about available API endpoints, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md).


## How to Use

### Creating a Scenario Template

1. From the "Scenario Templates" view, click "Create New Template".
2. You'll be taken to the Scenario Editor.
3. Fill in the details under the **Plot** tab:
    - Opening Scene
    - Instructions for AI (System Prompt)
    - Plot Essentials
    - Author's Notes
4. Switch to the **Cards** tab to add, edit, or import characters, locations, items, etc.
    - Use the "Add New Card" form or import from JSON.
    - Manage existing cards (edit, duplicate, delete).
    - Utilize filter and search options to manage large sets of cards.
    - Change display style (grid, list, compact).
5. Switch to the **Details** tab:
    - Set the Scenario Name.
    - Add a Player Description, Tags, and set Visibility.
6. Click "Create Scenario" (or "Save Changes" if editing).

### Starting an Adventure

1. Go to the "Scenario Templates" view.
2. Find the scenario you want to use.
3. Click "Start New Adventure".
4. This will take you directly into the Gameplay view for your new adventure.

### Playing the Game

- **Read the Story**: The AI's narration will appear in the main content area.
- **Choose an Action Type**: Click "Do", "Say", or "Story" buttons. This will reveal a textarea.
  - Clicking an active button again will hide the textarea.
- **Enter Your Action**: Type your input into the textarea and press `Enter` (or click a submit button if one were present).
- **AI Responds**: The AI will generate the next part of the story.
- **Use Sidebar**:
  - Toggle the sidebar using the "☰" button.
  - Navigate tabs ("Plot", "Cards", "Info") to view or edit adventure-specific details. Changes in "Plot" are saved when you click away from the field. Card changes require explicit save actions.
- **Manage Turns**: Hover over any turn in the history to reveal "Edit" and "Delete" buttons.
- **AI Controls**: Use "Retry" to get a new AI response for the last turn, or "Continue" to have the AI narrate without specific input.

### Managing Cards

- **Scenario Editor**: Extensive card management tools available under the "Cards" tab, including import/export for *just the cards within that scenario*.
- **Gameplay Sidebar**: Under the "Cards" tab in the sidebar, you can view, add, edit, duplicate, and delete cards that are part of the current adventure's *snapshot*. These changes only affect the current adventure, not the original scenario template.

### Importing/Exporting Scenarios

- **Exporting**: From the "Scenario Templates" list, each scenario will have an "Export" button. Clicking this will download a JSON file containing the entire scenario template (all details and cards).
- **Importing**:
    1. From the "Scenario Templates" list, click the "Import Scenario" button.
    2. Select a scenario JSON file (previously exported from this app or a compatible one).
    3. The scenario will be imported, given new unique IDs, and added to your list.

### Using Global Settings

1. Click the "Settings" button in the header.
2. A modal will appear allowing you to:
    - Select your preferred AI Model.
    - Choose the Response Handling Strategy (Truncate/Summarize).
    - Toggle "Allow AI Thinking".
    - Set the Global Max Output Tokens.
3. Click "Save Settings" to apply and store your preferences, or "Cancel" to discard changes for your ImaginAI experience.

## Contributing

This project is currently in active development and undergoing refactoring. Contributions, issues, and feature requests are welcome!

## License

See [LICENSE.MD](LICENSE.MD) for details.

## Support

If you find this project useful, consider supporting development:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/C0C0UZS4P)

---

**ImaginAI** - AI-Powered Interactive Fiction at Home

