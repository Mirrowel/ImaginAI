import { useState } from 'react'
import { BookOpen, Settings, Map, Users, Plus, Edit2, Trash2, FileText, Box } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useUIStore } from '@/stores/useUIStore'
import { useDataStore } from '@/stores/useDataStore'
import { useGameplayStore } from '@/stores/useGameplayStore'
import { CardModal } from './CardModal'
import { api, type Card } from '@/lib/api'
import { toast } from 'sonner'

export function Sidebar() {
  const { isSidebarOpen } = useUIStore()
  const { activeAdventure, setActiveAdventure } = useGameplayStore()
  const [isCardModalOpen, setIsCardModalOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | null>(null)

  if (!isSidebarOpen) return null

  const handleAddCard = async (cardData: Partial<Card>) => {
    if (!activeAdventure) return
    try {
      const result = await api.adventures.addCard(activeAdventure.id, cardData)
      // Refresh adventure to get updated cards
      const updatedAdventure = await api.adventures.get(activeAdventure.id)
      setActiveAdventure(updatedAdventure)
      toast.success('Card added successfully')
    } catch (error) {
      console.error('Failed to add card:', error)
      toast.error('Failed to add card')
    }
  }

  const handleEditCard = async (cardData: Partial<Card>) => {
    if (!activeAdventure || !editingCard) return
    try {
      await api.adventures.editCard(activeAdventure.id, editingCard.id, cardData)
      const updatedAdventure = await api.adventures.get(activeAdventure.id)
      setActiveAdventure(updatedAdventure)
      toast.success('Card updated successfully')
    } catch (error) {
      console.error('Failed to update card:', error)
      toast.error('Failed to update card')
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!activeAdventure) return
    if (!confirm('Are you sure you want to delete this card?')) return
    try {
      await api.adventures.deleteCard(activeAdventure.id, cardId)
      const updatedAdventure = await api.adventures.get(activeAdventure.id)
      setActiveAdventure(updatedAdventure)
      toast.success('Card deleted successfully')
    } catch (error) {
      console.error('Failed to delete card:', error)
      toast.error('Failed to delete card')
    }
  }

  const openAddModal = () => {
    setEditingCard(null)
    setIsCardModalOpen(true)
  }

  const openEditModal = (card: Card) => {
    setEditingCard(card)
    setIsCardModalOpen(true)
  }

  const renderCardList = (type: string, icon: React.ReactNode, title: string) => {
    const cards = activeAdventure?.scenarioSnapshot.cards.filter(c => c.card_type === type) || []
    
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon} {title}
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={openAddModal}>
            <Plus size={14} />
          </Button>
        </h3>
        <div className="space-y-2">
          {cards.length === 0 ? (
            <p className="text-xs text-muted-foreground italic pl-6">No {title.toLowerCase()} yet.</p>
          ) : (
            cards.map(card => (
              <div key={card.id} className="group flex items-start justify-between p-2 rounded-md hover:bg-muted/50 text-sm">
                <div className="space-y-1">
                  <div className="font-medium">{card.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{card.short_description}</div>
                </div>
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditModal(card)}>
                    <Edit2 size={12} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDeleteCard(card.id)}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 border-r bg-muted/10 flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold truncate">{activeAdventure?.adventureName || 'Adventure Details'}</h2>
        <p className="text-xs text-muted-foreground truncate">{activeAdventure?.sourceScenarioName}</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <BookOpen size={16} /> Story Context
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {activeAdventure?.scenarioSnapshot.plotEssentials || 'No plot details available.'}
            </p>
          </div>

          <Separator />

          {renderCardList('person', <Users size={16} />, 'Characters')}
          <Separator />
          {renderCardList('location', <Map size={16} />, 'Locations')}
          <Separator />
          {renderCardList('lore', <FileText size={16} />, 'Lore')}
          <Separator />
          {renderCardList('item', <Box size={16} />, 'Items')}
          
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <Button variant="outline" className="w-full justify-start gap-2">
          <Settings size={16} /> Adventure Settings
        </Button>
      </div>

      <CardModal 
        isOpen={isCardModalOpen} 
        onClose={() => setIsCardModalOpen(false)} 
        onSave={editingCard ? handleEditCard : handleAddCard}
        initialCard={editingCard}
      />
    </div>
  )
}
