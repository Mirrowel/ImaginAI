# Frontend Documentation

## Overview

The ImaginAI frontend is built with **React 19** + **TypeScript** + **Vite**, using modern patterns for state management and real-time streaming interactions.

---

## Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | React 19 | UI library |
| **Build Tool** | Vite | Fast dev server & bundling |
| **Language** | TypeScript | Type safety |
| **State Management** | Zustand | Lightweight global state |
| **Routing** | React Router v7 | Client-side routing |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **UI Components** | shadcn/ui + Radix UI | Accessible component library |
| **Forms** | React Hook Form | Form state management |
| **Markdown** | react-markdown + remark-gfm | Rich text rendering |
| **Notifications** | Sonner | Toast notifications |

---

## Project Structure

```
src/
├── assets/          # Static assets (images, fonts)
├── components/      # React components
│   ├── common/      # Shared components (modals, buttons)
│   ├── editor/      # Scenario editor components
│   ├── gameplay/    # Gameplay page components
│   ├── layout/      # Layout components (header, sidebar)
│   └── ui/          # shadcn/ui components (primitives)
├── hooks/           # Custom React hooks
│   └── useLLMStream.ts    # SSE streaming hook
├── lib/             # Utility functions
│   ├── sse.ts       # SSE client implementation
│   └── utils.ts     # General utilities
├── pages/           # Page components
│   ├── Editor.tsx   # Scenario editor page
│   ├── Gameplay.tsx # Gameplay/adventure page
│   └── Home.tsx     # Home/scenario list page
├── stores/          # Zustand stores
│   ├── useDataStore.ts      # Scenarios & adventures data
│   ├── useGameplayStore.ts  # Gameplay state & messages
│   └── useUIStore.ts        # UI state (modals, theme)
├── types/           # TypeScript type definitions
├── App.tsx          # Root component
├── main.tsx         # Entry point
└── index.css        # Global styles
```

---

## State Management

### Zustand Stores

#### 1. **useDataStore** - Data Persistence
Manages scenarios and adventures with localStorage persistence.

```typescript
import { useDataStore } from '@/stores/useDataStore'

function Component() {
  const { scenarios, adventures, addScenario, setScenarios } = useDataStore()
  
  // Automatically persisted to localStorage
  addScenario(newScenario)
}
```

**State:**
- `scenarios: Scenario[]` - List of available scenarios
- `adventures: Adventure[]` - List of saved adventures

**Actions:**
- `setScenarios(scenarios)` - Replace all scenarios
- `setAdventures(adventures)` - Replace all adventures
- `addScenario(scenario)` - Add single scenario
- `addAdventure(adventure)` - Add single adventure

#### 2. **useGameplayStore** - Gameplay State
Manages active adventure gameplay and streaming content.

```typescript
import { useGameplayStore } from '@/stores/useGameplayStore'

function GameplayComponent() {
  const { 
    activeAdventureId, 
    messages, 
    isGenerating,
    streamingContent,
    addMessage,
    appendStreamingContent 
  } = useGameplayStore()
}
```

**State:**
- `activeAdventureId: number | null` - Currently active adventure
- `messages: Message[]` - Chat-style message history
- `isGenerating: boolean` - AI generation in progress
- `streamingContent: string` - Real-time streaming accumulator

**Actions:**
- `setActiveAdventure(id)` - Set active adventure
- `setMessages(messages)` - Replace message history
- `addMessage(message)` - Add single message
- `setIsGenerating(bool)` - Toggle generation state
- `setStreamingContent(content)` - Reset streaming content
- `appendStreamingContent(chunk)` - Append chunk to streaming content

#### 3. **useUIStore** - UI State
Manages UI-specific state like theme, modals, sidebar.

```typescript
import { useUIStore } from '@/stores/useUIStore'

function Component() {
  const { settingsOpen, setSettingsOpen } = useUIStore()
}
```

---

## Custom Hooks

### useLLMStream

Hook for streaming AI responses via Server-Sent Events.

**Usage:**
```typescript
import { useLLMStream } from '@/hooks/useLLMStream'
import { useGameplayStore } from '@/stores/useGameplayStore'

function GameplayPage() {
  const { startStream, stopStream, isStreaming, error } = useLLMStream()
  const { streamingContent } = useGameplayStore()
  
  const handleSubmit = async (text: string) => {
    await startStream(
      `/api/adventures/${adventureId}/stream/`,
      {
        text: text,
        selected_model: 'gemini/gemini-1.5-flash',
        max_tokens: 200,
        action_type: 'do'
      }
    )
  }
  
  return (
    <div>
      {isStreaming && <p>Generating: {streamingContent}</p>}
      {error && <p>Error: {error.message}</p>}
      <button onClick={handleSubmit}>Submit</button>
      <button onClick={stopStream}>Stop</button>
    </div>
  )
}
```

**API:**
- `startStream(url, body?)` - Start SSE stream with optional request body
- `stopStream()` - Cancel active stream
- `isStreaming` - Boolean indicating stream active
- `error` - Error object if stream failed

**Internal Flow:**
1. Calls `streamSSE()` from `lib/sse.ts`
2. Streams chunks to `useGameplayStore.appendStreamingContent()`
3. Updates `isGenerating` state automatically
4. Handles completion and errors

---

## Routing

Routes are defined in `App.tsx` using React Router v7.

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'

<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/editor/:id" element={<Editor />} />
  <Route path="/gameplay/:id" element={<Gameplay />} />
</Routes>
```

**Routes:**
- `/` - Home page (scenario list)
- `/editor/new` - Create new scenario
- `/editor/:id` - Edit existing scenario
- `/gameplay/:id` - Play adventure

---

## UI Components (shadcn/ui)

The project uses **shadcn/ui** components built on **Radix UI** primitives.

**Available Components:**
- `Button` - Button with variants
- `Card` - Content container
- `Dialog` - Modal dialogs
- `Input` - Text input
- `Label` - Form label
- `Textarea` - Multiline text input
- `ScrollArea` - Custom scrollbars
- `Separator` - Divider line
- `Avatar` - User avatar
- `DropdownMenu` - Dropdown menus

**Usage Example:**
```tsx
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="default">Click Me</Button>
      </CardContent>
    </Card>
  )
}
```

**Variants:**
```tsx
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
```

---

## Styling

### Tailwind CSS v4

Uses utility classes for styling:

```tsx
<div className="flex items-center gap-4 p-6 bg-card rounded-lg shadow-md">
  <h1 className="text-3xl font-bold tracking-tight">Title</h1>
</div>
```

### Theme Variables

Defined in `index.css`:
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --primary: 221.2 83.2% 53.3%;
  /* ... */
}
```

### Dark Mode

Uses `next-themes` for theme switching:
```tsx
import { useTheme } from 'next-themes'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Theme
    </button>
  )
}
```

---

## API Integration

### Base URL Configuration

Update in `vite.config.ts` or environment variables:
```typescript
// vite.config.ts
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
}
```

### Example: Fetch Scenarios

```typescript
const fetchScenarios = async () => {
  const response = await fetch('/api/scenarios/')
  if (!response.ok) throw new Error('Failed to fetch')
  const data = await response.json()
  setScenarios(data)
}
```

### Example: Create Adventure

```typescript
const createAdventure = async (scenarioId: number) => {
  const response = await fetch('/api/adventures/start/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenario_id: scenarioId,
      adventure_name: 'My Adventure'
    })
  })
  const adventure = await response.json()
  return adventure
}
```

---

## Development

### Run Dev Server
```bash
npm run dev
```
Starts Vite dev server at `http://localhost:5173`

### Build for Production
```bash
npm run build
```
Outputs to `dist/` directory

### Lint
```bash
npm run lint
```

### Type Check
```bash
tsc --noEmit
```

---

## Best Practices

### 1. **Component Organization**
- Keep components small and focused
- Use composition over inheritance
- Extract reusable logic to custom hooks

### 2. **State Management**
- Use Zustand for global state
- Use `useState` for local component state
- Don't duplicate server data in global state (use React Query instead)

### 3. **Type Safety**
- Define interfaces for all data structures
- Avoid `any` types
- Use discriminated unions for state variants

### 4. **Performance**
- Use `React.memo()` for expensive components
- Implement optimistic updates for better UX
- Lazy load routes with `React.lazy()`

### 5. **Error Handling**
- Always wrap async operations in try/catch
- Show user-friendly error messages
- Log errors for debugging

---

## Common Patterns

### Loading States
```tsx
function MyComponent() {
  const [loading, setLoading] = useState(false)
  
  const handleAction = async () => {
    setLoading(true)
    try {
      await someAsyncOperation()
    } finally {
      setLoading(false)
    }
  }
  
  return <Button disabled={loading}>{loading ? 'Loading...' : 'Submit'}</Button>
}
```

### Form Handling
```tsx
function Form() {
  const [formData, setFormData] = useState({ name: '', description: '' })
  
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Submit logic
  }
}
```

### Conditional Rendering
```tsx
{isLoading ? (
  <Spinner />
) : error ? (
  <ErrorMessage error={error} />
) : (
  <DataDisplay data={data} />
)}
```

---

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5173
npx kill-port 5173
```

### Module Not Found
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors
```bash
# Restart TypeScript server in VSCode
Ctrl+Shift+P > "TypeScript: Restart TS Server"
```

---

## Additional Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [React Router](https://reactrouter.com)
