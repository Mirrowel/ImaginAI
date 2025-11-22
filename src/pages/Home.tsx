import { Link } from "react-router-dom"
import { Plus, Play, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useDataStore } from "@/stores/useDataStore"

export default function Home() {
  const { scenarios } = useDataStore()

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/10 p-10 text-center md:text-left md:flex md:items-center md:justify-between">
        <div className="space-y-4 max-w-2xl relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            Your Stories, Reimagined.
          </h1>
          <p className="text-lg text-muted-foreground">
            Craft immersive adventures, define unique worlds, and let AI bring your imagination to life.
          </p>
        </div>
        <div className="mt-8 md:mt-0 relative z-10">
          <Button asChild size="lg" className="shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <Link to="/editor/new">
              <Plus className="mr-2 h-5 w-5" /> Create New Scenario
            </Link>
          </Button>
        </div>
        
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="flex items-center justify-between pt-4">
        <h2 className="text-2xl font-bold tracking-tight">Available Scenarios</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scenarios.map((scenario) => (
          <Card key={scenario.id} className="flex flex-col group hover:shadow-lg transition-all duration-300 border-primary/10 hover:border-primary/30 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl group-hover:text-primary transition-colors">{scenario.name}</CardTitle>
              <CardDescription className="line-clamp-2 mt-2">{scenario.instructions}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {/* Additional metadata could go here */}
              <div className="flex gap-2 mt-2">
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                  Scenario
                </span>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-4 border-t bg-muted/20">
              <Button variant="ghost" size="sm" asChild className="hover:bg-background">
                <Link to={`/editor/${scenario.id}`}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Link>
              </Button>
              <Button size="sm" asChild className="shadow-sm">
                <Link to={`/play/${scenario.id}`}>
                  <Play className="mr-2 h-4 w-4" /> Play
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
        
        {scenarios.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl bg-muted/30 text-center animate-in fade-in zoom-in duration-500">
            <div className="bg-background p-4 rounded-full shadow-sm mb-4">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No scenarios found</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              Your adventure begins here. Create your first scenario to start crafting immersive stories.
            </p>
            <Button asChild size="lg" className="shadow-md hover:shadow-lg transition-all">
              <Link to="/editor/new">Create Scenario</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
