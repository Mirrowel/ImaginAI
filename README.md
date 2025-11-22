# ImaginAI [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/C0C0UZS4P)

![ImaginAI Logo](/Pics/1.png)

> Full-stack interactive fiction platform powered by AI  
> "AI Dungeon at Home" Edition  

**Status**: Active prototype — core backend features working, frontend UI refactoring in progress

ImaginAI (aka Taleon.ai, imagin.ai) is a web-based interactive storytelling application that lets you craft rich story worlds with **Scenario Templates** and embark on unique **Adventures**. Powered by advanced AI integration with intelligent trigger word detection, real-time streaming responses, and async architecture, the narrative dynamically evolves based on your actions and dialogue.

**Built with modern tech**: Django REST backend with PostgreSQL/Redis, React 19 frontend, and full AI Dungeon compatibility for seamless scenario migration.

## Key Features

- **Scenario Templates**  
    Define your world, characters, tags and opening scenes—then save, edit, import/export or duplicate them.  
- **Adventures with Snapshots**  
    Launch playthroughs from frozen scenario states. Enjoy persistent history, editable turns, retry/continue controls and dynamic in-game settings.  
- **Intelligent AI Integration**  
    Advanced trigger word detection, real-time SSE streaming, and async architecture for superior performance.  
- **AI Dungeon Compatible**  
    Import/export scenarios and cards in AI Dungeon format for seamless content migration.  
- **Server-Side Persistence**  
    PostgreSQL database with Redis caching for reliable, scalable data storage.  

## Table of Contents

- [ImaginAI ](#imaginai-)
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

- **Scenario Snapshot System**: 
  - When an adventure starts, a frozen "snapshot" of the scenario is created
  - Changes to the original template later will not affect ongoing adventures
  - Each adventure maintains complete independence from its source
  - Snapshots include all scenario data: instructions, plot, cards, and settings
- **Real-Time Streaming Responses**: 
  - AI responses stream in real-time via Server-Sent Events (SSE)
  - See narrative generation as it happens with low latency
  - Smooth, progressive display for immersive storytelling
- **Intelligent Card Injection**: 
  - Story cards are automatically injected based on trigger word detection
  - Recent conversation context scanned for relevant keywords
  - Dynamic, context-aware world-building without manual card selection
- **Unique Naming**: Give each adventure its own distinct name
- **Persistent History**: All player actions and AI responses are saved server-side in PostgreSQL
- **Turn Management**:
  - **Edit Turns**: Modify any previous player or AI turn. The story adapts on next AI interaction
  - **Delete Turns**: Remove turns from history. Story adjusts accordingly
  - **Regenerate Opening**: If all turns deleted, adventure can restart from opening scene
- **Player Actions**:
  - **Do**: Describe an action your character takes
  - **Say**: Input dialogue for your character
  - **Story**: Narrate from an out-of-character perspective, guiding the AI
- **AI Controls**:
  - **Retry**: Regenerate the last AI response if unsatisfied
  - **Continue**: Prompt AI to continue story without specific player input
- **Dynamic Adventure Settings**:
  - Modify adventure snapshot: AI instructions, plot essentials, author's notes
  - Add, edit, delete, or duplicate cards within the snapshot
  - Changes affect only the current adventure, not the source template
- **Adventure Management**:
  - List view sorted by last played date
  - Continue, edit, duplicate, or delete adventures
  - Full CRUD operations on adventure snapshots

### Gameplay Interface

- **Main Story Log**: Displays the chronological history of player and AI turns, with clear distinction between them.
- **Action Input Area**: Dynamically shows the appropriate input field (textarea) based on the selected action type (Do, Say, Story) or can be hidden.
- **Responsive Sidebar**: Provides access to crucial adventure information and editing tools, and can be toggled:
  - **Plot Tab**: View and edit the adventure's current AI Instructions, Plot Essentials, and Author's Notes (changes are auto-saved on blur).
  - **Cards Tab**: View, add, edit, delete, and duplicate cards within the current adventure's snapshot.
  - **Info Tab**: Read-only display of the adventure's name, source scenario name, player description, tags, and visibility.
  - **Full Settings Edit**: A button to open the full editor interface for the current adventure's settings (snapshot).

### AI Interaction & Customization

- **Advanced AI Service Architecture**: Two-layer design with generic wrappers and project-specific helpers for maximum flexibility
- **Intelligent Trigger Word Detection**: 
  - Story cards are dynamically injected based on conversation context
  - Case-insensitive word boundary matching for natural trigger detection
  - Scans recent history and user input to provide relevant context
- **Real-Time Streaming Responses**: 
  - Server-Sent Events (SSE) for low-latency, real-time narrative generation
  - Stream endpoint: `POST /api/adventures/{id}/stream/`
  - Progressive response display as the AI generates content
- **Async Architecture**: 
  - Native async/await implementation throughout the backend
  - Non-blocking AI operations for superior performance
  - Concurrent request handling for scalability
- **Flexible Model Selection**: Choose from a range of Gemini and Gemma models through the Global Settings
- **Sophisticated Prompt Engineering**:
  - System instructions with scenario context, plot essentials, and author's notes
  - Triggered cards automatically formatted and injected into prompts
  - Token-aware context window management (planned enhancement)
- **Response Handling**:
  - **Truncate**: Intelligent cutoff at nearest sentence boundary when token limit reached
- **"Allow AI Thinking" Option**:
  - For specific models (e.g., `gemini-2.5-flash-preview-04-17`), enables/disables dedicated thinking budget
  - Influences output quality vs latency tradeoff
- **Configurable Token Limits**: Global maximum output token limit (50-800 tokens)
- **Detailed Token Usage Tracking**: 
  - Per-component breakdown (system, plot, history, cards, user message)
  - API-reported vs precise token accounting
  - Model usage statistics for optimization

### AI Dungeon Compatibility

- **Seamless Card Migration**: Import and export story cards in AI Dungeon's JSON format
- **Format Translation**: Automatic conversion between ImaginAI and AI Dungeon structures
- **Scenario Portability**: Bring your existing AI Dungeon scenarios to ImaginAI
- **API Endpoints**:
  - Export cards: `GET /api/scenarios/{id}/export-cards-aid/`
  - Import cards: `POST /api/scenarios/{id}/import-cards-aid/`

### Data Persistence & Portability

- **PostgreSQL Database**: All scenarios, adventures, and game state stored server-side for reliable, scalable persistence
- **Redis Caching**: Frequently accessed data cached for improved read performance
- **RESTful API**: Django REST Framework provides robust CRUD operations for all resources
- **Scenario Export/Import**: Backup and share complete scenario templates as JSON files
- **AI Dungeon Card Format**: Import/export cards in AI Dungeon format for seamless migration
- **Adventure Duplication**: Clone entire adventures with full history for branching storylines
- **Token Usage Tracking**: Detailed statistics on token consumption per turn with component breakdown

### Global Settings

Accessible via a "Settings" button in the main header.

- **AI Model Selection**: Choose the preferred Gemini/Gemma model for generating story content. The list of models dynamically updates if "Allow AI Thinking" is enabled, showing only models compatible with explicit thinking control.
- **Response Handling Strategy**: Select either "Truncate" or "Summarize" for long AI responses.
- **Allow AI Thinking**: Toggle the AI thinking time/latency preference.
- **Global Max Output Tokens**: Define the target length for AI-generated text (50-800 tokens).
- **Base System Instruction Display**: View the read-only base instruction that guides the AI's core behavior.

## Technology Stack

### Backend
- **Python 3.8+** with **Django 5.2+** web framework
- **Django REST Framework** for RESTful API
- **PostgreSQL** database for persistent storage
- **Redis** for caching and session management
- **Async Django Views** - Native async/await for all AI operations (no blocking)
- **Server-Sent Events (SSE)** - Real-time streaming AI responses
- **Google Generative AI SDK** (`google-generativeai`) for AI model interaction
- **Rotator Library** ([LLM-API-Key-Proxy](https://github.com/Mirrowel/LLM-API-Key-Proxy)) for intelligent API key rotation and retry logic

### Frontend
- **React 19** with **TypeScript** - Modern component-based UI
- **Vite** - Fast build tooling and dev server
- **Tailwind CSS** + **shadcn/ui** - Modern component library
- **Zustand** - Lightweight state management
- **React Router** - Client-side routing
- **React Markdown** - AI response rendering with GitHub Flavored Markdown

> **Note**: Frontend is currently undergoing refactoring to modernize the UI/UX experience.

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
├── backend/                      # Django REST backend
│   ├── imaginai_backend/         # Django project configuration
│   │   ├── settings.py          # Django settings (PostgreSQL, Redis, CORS)
│   │   ├── urls.py              # Main URL routing
│   │   ├── wsgi.py              # WSGI server config
│   │   └── asgi.py              # ASGI config for async views
│   ├── api/                      # Main Django app
│   │   ├── models/              # Domain models
│   │   │   ├── scenario.py      # Scenario & Card models
│   │   │   ├── adventure.py     # Adventure & AdventureTurn models
│   │   │   └── settings.py      # GlobalSettings & TokenUsageStats
│   │   ├── serializers/         # DRF serializers for API responses
│   │   ├── views/               # API endpoints
│   │   │   ├── adventure_views.py   # Adventure CRUD + AI generation
│   │   │   ├── scenario_views.py    # Scenario CRUD + AID import/export
│   │   │   └── settings_views.py    # Global settings management
│   │   ├── services/            # Business logic layer
│   │   │   └── ai_service.py    # AI integration (trigger words, streaming)
│   │   ├── utils/               # Utilities (AID translator, helpers)
│   │   ├── dependencies.py      # Dependency injection setup
│   │   └── migrations/          # Database migrations
│   ├── lib_imports/              # Import shim for rotator_library
│   └── manage.py                 # Django CLI
├── src/                          # React frontend
│   ├── pages/                    # Route pages
│   │   ├── Home.tsx             # Scenario list & adventure dashboard
│   │   ├── Editor.tsx           # Scenario creation/editing
│   │   └── Gameplay.tsx         # Interactive story gameplay
│   ├── components/               # React components
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── editor/              # Scenario editor components
│   │   ├── gameplay/            # Gameplay UI components
│   │   └── common/              # Shared components (modals, etc.)
│   ├── stores/                   # Zustand state management
│   │   ├── useDataStore.ts      # Scenarios & adventures state
│   │   ├── useGameplayStore.ts  # Active gameplay state
│   │   ├── useSettingsStore.ts  # Global settings
│   │   └── useUIStore.ts        # UI state (modals, sidebar, etc.)
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utilities and helpers
│   ├── App.tsx                   # App shell with routing
│   └── main.tsx                  # React entry point
├── docs/                         # Documentation
│   └── ROTATOR_LIBRARY_SETUP.md # Rotator library setup guide
├── lib/                          # Local libraries (gitignored)
│   └── rotator_library/         # Local copy (optional dev mode)
├── .env.backend                  # Backend environment config
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript config
├── tailwind.config.js            # Tailwind CSS config
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

**Key API Features:**
- RESTful endpoints for all resources (scenarios, adventures, cards, settings)
- Real-time SSE streaming: `POST /api/adventures/{id}/stream/`
- AI Dungeon format support: `GET/POST /api/scenarios/{id}/export-cards-aid/` and `/import-cards-aid/`
- Async Django views for superior performance
- Comprehensive error handling and validation


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

