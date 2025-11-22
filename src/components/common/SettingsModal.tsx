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
import { useUIStore } from '@/stores/useUIStore'

export function SettingsModal() {
  const { activeModal, closeModal, openModal } = useUIStore()
  const isOpen = activeModal === 'settings'

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
            <Input id="model" value="Gemini 1.5 Flash" disabled className="col-span-3" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={closeModal}>Save changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
