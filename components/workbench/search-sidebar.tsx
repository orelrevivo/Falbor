// components/workbench/search-sidebar.tsx
import { Loader, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ProjectFile = {
  path: string
  content: string
}

interface SearchResult {
  path: string
  line: number
  content: string
  matches: { start: number; end: number }[]
}

interface SearchSidebarProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchResults: SearchResult[]
  isSearching: boolean
  highlightMatch: (text: string, matches: { start: number; end: number }[]) => any
  onResultClick: (path: string) => void
  files: ProjectFile[]
}

export function SearchSidebar({
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  highlightMatch,
  onResultClick,
  files,
}: SearchSidebarProps) {
  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files and code..."
          className="h-8 text-xs"
        />
      </div>

      <div className="flex-1 overflow-y-auto chat-messages-scroll">
        {isSearching ? (
          <div className="flex items-center justify-center p-4">
            <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : searchResults.length > 0 ? (
          <div className="p-2">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2 px-1">{searchResults.length} results</p>
            {searchResults.map((result, idx) => (
              <div
                key={idx}
                onClick={() => {
                  const file = files.find((f) => f.path === result.path)
                  if (file) onResultClick(result.path)
                }}
                className={cn(
                  "p-2 hover:bg-zinc-200/50 dark:hover:bg-white/5 cursor-pointer rounded-md text-xs mb-1 transition-colors border border-transparent hover:border-border dark:hover:border-white/10"
                )}
              >
                <div className="text-primary dark:text-[#0099ff] font-mono text-[10px] truncate mb-1">{result.path}</div>
                <div className="text-muted-foreground text-[10px] mb-1">Line {result.line}</div>
                <pre className="text-foreground/80 dark:text-white/80 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
                  {highlightMatch(result.content, result.matches)}
                </pre>
              </div>
            ))}
          </div>
        ) : searchQuery ? (
          <div className="p-4 text-center text-muted-foreground text-xs italic">No results found</div>
        ) : (
          <div className="p-4 text-center text-muted-foreground text-xs italic">Start typing to search</div>
        )}
      </div>
    </div>
  )
}