import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Card } from '@/lib/api'

interface CardModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (card: Partial<Card>) => void
  initialCard?: Card | null
}

export function CardModal({ isOpen, onClose, onSave, initialCard }: CardModalProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('person')
  const [triggerWords, setTriggerWords] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [fullContent, setFullContent] = useState('')

  useEffect(() => {
    if (initialCard) {
      setTitle(initialCard.title)
      setType(initialCard.card_type)
      setTriggerWords(initialCard.trigger_words)
      setShortDescription(initialCard.short_description)
      setFullContent(initialCard.full_content)
    } else {
      setTitle('')
      setType('person')
      setTriggerWords('')
      setShortDescription('')
      setFullContent('')
    }
  }, [initialCard, isOpen])

  const handleSubmit = () => {
    onSave({
      title,
      card_type: type,
      trigger_words: triggerWords,
      short_description: shortDescription,
      full_content: fullContent,
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialCard ? 'Edit Card' : 'Add New Card'}</DialogTitle>
          <DialogDescription>
            Cards provide context to the AI when trigger words are mentioned.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
              placeholder="e.g. King Arthur"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <div className="col-span-3">
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="person">Person</option>
                <option value="location">Location</option>
                <option value="lore">Lore</option>
                <option value="item">Item</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="triggers" className="text-right">
              Triggers
            </Label>
            <Input
              id="triggers"
              value={triggerWords}
              onChange={(e) => setTriggerWords(e.target.value)}
              className="col-span-3"
              placeholder="comma, separated, words"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="short" className="text-right">
              Short Desc
            </Label>
            <Input
              id="short"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="col-span-3"
              placeholder="Brief summary for quick reference"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="full">Full Content (AI Context)</Label>
            <Textarea
              id="full"
              value={fullContent}
              onChange={(e) => setFullContent(e.target.value)}
              className="h-32"
              placeholder="Detailed description injected into AI context when triggered..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
