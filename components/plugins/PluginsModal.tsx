import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Compass, HardDrive, FileTerminal, FileSpreadsheet, Workflow, X, Package } from "lucide-react"

export function PluginsModal({
    isOpen,
    onClose,
    onSelectPlugin
}: {
    isOpen: boolean;
    onClose: () => void;
    onSelectPlugin: (pluginId: string) => void;
}) {
    const [search, setSearch] = useState("")
    const [plugins, setPlugins] = useState<any[]>([])
    const [recentIds, setRecentIds] = useState<string[]>([])

    // Fetch real plugins
    useEffect(() => {
        if (!isOpen) return;

        // Load recents from localStorage
        try {
            const saved = localStorage.getItem("falbor_recent_plugins")
            if (saved) {
                setRecentIds(JSON.parse(saved))
            }
        } catch (e) { }

        const fetchPlugins = async () => {
            try {
                const res = await fetch("/api/plugins")
                if (res.ok) {
                    const data = await res.json()
                    setPlugins(data)
                }
            } catch (e) {
                console.error(e)
            }
        }
        fetchPlugins()
    }, [isOpen])

    if (!isOpen) return null;

    // Filter plugins
    const hasSearch = search.trim().length > 0;

    let displayPlugins: any[] = [];
    if (hasSearch) {
        displayPlugins = plugins.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    } else {
        // Find recent plugins in order from the DB data
        displayPlugins = recentIds
            .map(id => plugins.find(p => p.id === id))
            .filter(Boolean)

        // If no recents, just show top 3 as fallback initially so menu isn't empty
        if (displayPlugins.length === 0) {
            displayPlugins = plugins.slice(0, 3)
        }
    }

    const handleSelectPlugin = (pluginId: string) => {
        // Save to local storage
        try {
            const newRecents = [pluginId, ...recentIds.filter(id => id !== pluginId)].slice(0, 5)
            localStorage.setItem("falbor_recent_plugins", JSON.stringify(newRecents))
            setRecentIds(newRecents)
        } catch (e) { }

        onSelectPlugin(pluginId)
    }

    return (
        <AnimatePresence>
            <div className="fixed bottom-[25px] left-1/2 -translate-x-1/2 z-[999] pointer-events-none flex items-end justify-center">

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative w-full min-w-[320px] max-w-[400px] bg-white border rounded-md shadow-xs overflow-hidden flex flex-col pointer-events-auto"
                >
                    {/* Search Bar */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b">
                        <button onClick={onClose} className="p-1 BackgroundStyle rounded-md cursor-pointer text-black/50 hover:text-black shrink-0">
                            <X className="w-4 h-4" />
                        </button>
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search Plugins..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-transparent border-none text-black/90 text-sm w-full outline-none placeholder:text-black/40"
                        />
                    </div>

                    {/* Content List */}
                    <div className="flex-1 overflow-y-auto max-h-[300px] p-1 space-y-1 text-sm">

                        {!search.trim() && (
                            <div className="space-y-1">
                                <div className="px-3 py-1.5 text-[11.5px] font-semibold text-black/70">Marketplace</div>
                                <button
                                    onClick={() => {
                                        onClose()
                                        window.open('/templates', '_blank')
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-1.5 rounded-sm BackgroundStyle cursor-pointer text-black/90 group"
                                >
                                    <div className="w-5 h-5 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
                                        <Compass className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="font-semibold text-[13px] flex-1 text-left">Browse Plugins</span>
                                    <span className="text-[10px] text-white/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                        <span>↵</span> to Open
                                    </span>
                                </button>
                            </div>
                        )}

                        {/* Recents / Search Results */}
                        <div className="space-y-1">
                            <div className="px-3 py-1.5 text-[11.5px] font-semibold text-black/70">
                                {search.trim() ? "Search Results" : "Recents"}
                            </div>

                            {displayPlugins.length === 0 ? (
                                <div className="px-3 py-4 text-center text-black/70 text-xs italic">
                                    No plugins found
                                </div>
                            ) : (
                                displayPlugins.map(plugin => (
                                    <button
                                        key={plugin.id}
                                        onClick={() => handleSelectPlugin(plugin.id)}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-sm BackgroundStyle cursor-pointer s-black/90 text-[13px] font-medium text-left"
                                    >
                                        <div className="w-5 h-5 bg-[#313131] border border-[#444] rounded-md flex items-center justify-center shrink-0">
                                            {/* We can use native lucide icon or fallback */}
                                            <Package className="w-3.5 h-3.5 text-white/70" />
                                        </div>
                                        <div className="flex-1 truncate">
                                            <span>{plugin.name}</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
