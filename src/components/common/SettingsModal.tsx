import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useEffect, useState } from 'react'
import { useUIStore } from '@/stores/useUIStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import api from '@/lib/api'

export function SettingsModal() {
  const { activeModal, closeModal, openModal } = useUIStore()
  const { selectedModel, setSelectedModel } = useSettingsStore()
  const [models, setModels] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const isOpen = activeModal === 'settings'

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      api.models.list()
        .then(setModels)
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => open ? openModal('settings') : closeModal()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your global preferences and API keys.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="apiKey" className="text-right">
              API Key
            </Label>
            <Input id="apiKey" type="password" value="••••••••" disabled className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="model" className="text-right">
              Model
            </Label>
            <select
              id="model"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            >
              {models.length === 0 && <option value={selectedModel}>{selectedModel}</option>}
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={closeModal}>Save changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
