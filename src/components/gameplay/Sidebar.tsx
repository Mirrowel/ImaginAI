import { BookOpen, Settings, Map, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useUIStore } from '@/stores/useUIStore'
import { useDataStore } from '@/stores/useDataStore'
import { useGameplayStore } from '@/stores/useGameplayStore'

export function Sidebar() {
  const { isSidebarOpen } = useUIStore()
  const { activeAdventureId } = useGameplayStore()
  const { adventures, scenarios } = useDataStore()

  const adventure = adventures.find(a => a.id === activeAdventureId)
  const scenario = scenarios.find(s => s.name === adventure?.source_scenario_name)

  if (!isSidebarOpen) return null

  return (
    <div className="w-80 border-r bg-muted/10 flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold truncate">{adventure?.adventure_name || 'Adventure Details'}</h2>
        <p className="text-xs text-muted-foreground truncate">{adventure?.source_scenario_name}</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <BookOpen size={16} /> Story Context
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {scenario?.plot_essentials || 'No plot details available.'}
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Users size={16} /> Characters
            </h3>
            <div className="text-sm text-muted-foreground">
              {/* TODO: List active characters/cards */}
              <p className="italic">No active characters</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Map size={16} /> Locations
            </h3>
            <div className="text-sm text-muted-foreground">
              {/* TODO: List active locations */}
              <p className="italic">Unknown location</p>
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <Button variant="outline" className="w-full justify-start gap-2">
          <Settings size={16} /> Adventure Settings
        </Button>
      </div>
    </div>
  )
}
