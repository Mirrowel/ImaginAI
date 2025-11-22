import * as React from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface TagInputProps {
  placeholder?: string
  tags: string[]
  setTags: (tags: string[]) => void
}

export function TagInput({ placeholder, tags, setTags }: TagInputProps) {
  const [inputValue, setInputValue] = React.useState("")

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      const newTag = inputValue.trim()
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag])
        setInputValue("")
      }
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      setTags(tags.slice(0, -1))
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  return (
    <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1">
          {tag}
          <Button
            variant="ghost"
            size="icon"
            className="h-3 w-3 p-0 hover:bg-transparent"
            onClick={() => removeTag(tag)}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove {tag}</span>
          </Button>
        </Badge>
      ))}
      <Input
        className="flex-1 border-none focus-visible:ring-0 p-0 h-auto min-w-[120px]"
        placeholder={tags.length === 0 ? placeholder : ""}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
}
