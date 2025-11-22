import { Link } from "react-router-dom"
import { Plus, Play, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useDataStore } from "@/stores/useDataStore"

export default function Home() {
  const { scenarios } = useDataStore()

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Scenarios</h1>
          <p className="text-muted-foreground mt-2">Choose a scenario to start your adventure.</p>
        </div>
        <Button asChild>
          <Link to="/editor/new">
            <Plus className="mr-2 h-4 w-4" /> Create Scenario
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scenarios.map((scenario) => (
          <Card key={scenario.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{scenario.name}</CardTitle>
              <CardDescription className="line-clamp-2">{scenario.instructions}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {/* Additional metadata could go here */}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
                <Link to={`/editor/${scenario.id}`}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Link>
              </Button>
              <Button asChild>
                <Link to={`/play/${scenario.id}`}>
                  <Play className="mr-2 h-4 w-4" /> Play
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
        
        {scenarios.length === 0 && (
          <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg">
            <h3 className="text-lg font-medium">No scenarios found</h3>
            <p className="text-muted-foreground mb-4">Create your first scenario to get started.</p>
            <Button asChild>
              <Link to="/editor/new">Create Scenario</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
