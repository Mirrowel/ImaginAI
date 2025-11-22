import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "@/components/ui/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import Home from "@/pages/Home"
import Editor from "@/pages/Editor"
import Gameplay from "@/pages/Gameplay"
import { SettingsModal } from "@/components/common/SettingsModal"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/editor/new" element={<Editor />} />
          <Route path="/editor/:id" element={<Editor />} />
          <Route path="/play/:id" element={<Gameplay />} />
        </Routes>
        <SettingsModal />
        <Toaster />
      </Router>
    </ThemeProvider>
  )
}

export default App
