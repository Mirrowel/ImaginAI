import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatLog } from '@/components/gameplay/ChatLog'
import { InputArea } from '@/components/gameplay/InputArea'
import { Sidebar } from '@/components/gameplay/Sidebar'
import { useUIStore } from '@/stores/useUIStore'
import { useGameplayStore } from '@/stores/useGameplayStore'

export default function Gameplay() {
  const { id } = useParams()
  const { toggleSidebar, isSidebarOpen } = useUIStore()
  const { setActiveAdventure, addMessage } = useGameplayStore()

  useEffect(() => {
    if (id) {
      const adventureId = parseInt(id)
      setActiveAdventure(adventureId)
      
      // Mock initial message if empty
      // In real app, fetch from backend
      addMessage({
        id: 'init',
        role: 'assistant',
        content: 'Welcome to your adventure! What would you like to do?',
        timestamp: new Date().toISOString()
      })
    }
    
    return () => setActiveAdventure(null)
  }, [id, setActiveAdventure, addMessage])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b flex items-center px-4 gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className={isSidebarOpen ? 'md:hidden' : ''}>
            <Menu size={20} />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          <div className="font-semibold md:hidden">ImaginAI</div>
        </header>

        <main className="flex-1 flex flex-col min-h-0 relative">
          <ChatLog />
          <InputArea />
        </main>
      </div>
    </div>
  )
}
