import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Save, ArrowLeft, Book, FileText, Layers, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useDataStore, type Scenario } from "@/stores/useDataStore"
import { cn } from "@/lib/utils"

export default function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { scenarios, addScenario, setScenarios } = useDataStore()
  
  const isNew = id === "new"
  const [activeTab, setActiveTab] = useState<"general" | "story" | "world">("general")
  
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
        id: Date.now(),
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

  const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-md",
        activeTab === id 
          ? "bg-primary text-primary-foreground shadow-sm" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {isNew ? "Create New Scenario" : "Edit Scenario"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {formData.name || "Untitled Scenario"}
              </p>
            </div>
          </div>
          <Button onClick={handleSave} className="shadow-sm">
            <Save className="mr-2 h-4 w-4" /> Save Changes
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-5xl">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8 p-1 bg-muted/50 rounded-lg w-fit">
          <TabButton id="general" label="General" icon={Book} />
          <TabButton id="story" label="Story Context" icon={FileText} />
          <TabButton id="world" label="World Info" icon={Layers} />
        </div>

        {/* Content */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {activeTab === "general" && (
            <div className="grid gap-6">
              <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Core Information</CardTitle>
                  <CardDescription>Basic details about your scenario.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-base">Scenario Name</Label>
                    <Input 
                      id="name" 
                      value={formData.name} 
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="e.g., The Lost City of Gold"
                      className="text-lg font-medium h-12"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>System Instructions</CardTitle>
                  <CardDescription>Define the AI's role, tone, and rules of the world.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea 
                    id="instructions" 
                    value={formData.instructions}
                    onChange={(e) => handleChange("instructions", e.target.value)}
                    placeholder="You are a dungeon master..."
                    className="min-h-[300px] font-mono text-sm leading-relaxed resize-y p-4"
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "story" && (
            <div className="grid gap-6">
              <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Plot Essentials</CardTitle>
                  <CardDescription>Key plot points, secrets, and events the AI should know.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea 
                    id="plot" 
                    value={formData.plot_essentials}
                    onChange={(e) => handleChange("plot_essentials", e.target.value)}
                    placeholder="The king is secretly a dragon..."
                    className="min-h-[200px] resize-y p-4"
                  />
                </CardContent>
              </Card>

              <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Author's Notes</CardTitle>
                  <CardDescription>Private notes for yourself. These are not sent to the AI.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea 
                    id="notes" 
                    value={formData.authors_notes}
                    onChange={(e) => handleChange("authors_notes", e.target.value)}
                    placeholder="Remember to test the dragon encounter..."
                    className="min-h-[150px] resize-y p-4"
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "world" && (
            <div className="grid gap-6">
              <Card className="border-dashed border-2 shadow-none bg-transparent">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="bg-muted p-4 rounded-full mb-4">
                    <Layers className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">World Info Cards</h3>
                  <p className="text-muted-foreground max-w-md mb-6">
                    Create cards for characters, locations, and lore items to help the AI maintain consistency.
                  </p>
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" /> Add First Card
                  </Button>
                  <p className="text-xs text-muted-foreground mt-4 italic">
                    (Card management is fully available in Gameplay mode)
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
