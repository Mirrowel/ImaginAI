import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Save, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useDataStore, type Scenario } from "@/stores/useDataStore"

export default function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { scenarios, addScenario, setScenarios } = useDataStore()
  // const { toast } = useToast()

  const isNew = id === "new"
  
  const [formData, setFormData] = useState<Partial<Scenario>>({
    name: "",
    instructions: "",
    plot_essentials: "",
    authors_notes: "",
  })

  useEffect(() => {
    if (!isNew && id) {
      const scenario = scenarios.find(s => s.id === parseInt(id))
      if (scenario) {
        setFormData(scenario)
      }
    }
  }, [id, isNew, scenarios])

  const handleChange = (field: keyof Scenario, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    if (!formData.name) return

    if (isNew) {
      const newScenario: Scenario = {
        ...formData as Scenario,
        id: Date.now(), // Temporary ID generation
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      addScenario(newScenario)
    } else {
      const updatedScenarios = scenarios.map(s => 
        s.id === parseInt(id!) ? { ...s, ...formData, updated_at: new Date().toISOString() } as Scenario : s
      )
      setScenarios(updatedScenarios)
    }
    
    navigate("/")
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            {isNew ? "Create Scenario" : "Edit Scenario"}
          </h1>
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" /> Save Scenario
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Core Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Scenario Name</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="e.g., The Lost City of Gold"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="instructions">System Instructions</Label>
                <Textarea 
                  id="instructions" 
                  value={formData.instructions}
                  onChange={(e) => handleChange("instructions", e.target.value)}
                  placeholder="Define the AI's role, tone, and world rules..."
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  These instructions guide the AI's behavior throughout the adventure.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Story Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plot">Plot Essentials</Label>
                <Textarea 
                  id="plot" 
                  value={formData.plot_essentials}
                  onChange={(e) => handleChange("plot_essentials", e.target.value)}
                  placeholder="Key plot points, secrets, or events..."
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Author's Notes</Label>
                <Textarea 
                  id="notes" 
                  value={formData.authors_notes}
                  onChange={(e) => handleChange("authors_notes", e.target.value)}
                  placeholder="Private notes for yourself..."
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Placeholder for Story Cards Manager */}
          <Card>
            <CardHeader>
              <CardTitle>Story Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Story Cards management coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
