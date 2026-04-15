"use client"

import { Globe, Code2, Settings, Database, AppWindow } from "lucide-react"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface MainHeaderProps {
  handleDownload: () => void
  projectId: string
  isSplitScreen?: boolean
  onEnterSplit?: () => void
}

// Toggle this when the database section is ready
const DATABASE_ENABLED = true

export function MainHeader({
  handleDownload,
  projectId,
  isSplitScreen,
  onEnterSplit,
}: MainHeaderProps) {
  return (
    <div className="flex items-center justify-between pointer-events-none z-50">
      {/* Left side - Tab Navigation */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <TabsList className="w-full justify-start bg-transparent p-0 m-0 h-auto">
          <TabsTrigger
            value="preview"
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 transition-colors cursor-pointer text-black dark:text-white/80 hover:text-black/80 dark:hover:text-white BackgroundStyle border border-[#d6d4ce] dark:border-white/10 rounded-[0.25rem] data-[state=active]:bg-[#d6d4ce] dark:data-[state=active]:bg-white/10"
          >
            <Globe className="w-4 h-4 text-black dark:text-white/80" />
            Preview
          </TabsTrigger>

          <TabsTrigger
            value="code"
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 transition-colors cursor-pointer text-black dark:text-white/80 hover:text-black/80 dark:hover:text-white BackgroundStyle border border-[#d6d4ce] dark:border-white/10 rounded-[0.25rem] data-[state=active]:bg-[#d6d4ce] dark:data-[state=active]:bg-white/10"
          >
            <Code2 className="w-4 h-4 text-black dark:text-white/80" />
            Code
          </TabsTrigger>

          <TabsTrigger
            value="settings"
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 transition-colors cursor-pointer text-black dark:text-white/80 hover:text-black/80 dark:hover:text-white BackgroundStyle border border-[#d6d4ce] dark:border-white/10 rounded-[0.25rem] data-[state=active]:bg-[#d6d4ce] dark:data-[state=active]:bg-white/10"
          >
            <Settings className="w-4 h-4 text-black dark:text-white/80" />
            Settings
          </TabsTrigger>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger
                  value="database"
                  disabled={!DATABASE_ENABLED}
                  className={cn(
                    "flex items-center gap-1.5 text-sm px-3 py-1.5 transition-colors cursor-pointer text-black dark:text-white/80 hover:text-black/80 dark:hover:text-white BackgroundStyle border border-[#d6d4ce] dark:border-white/10 rounded-[0.25rem] data-[state=active]:bg-[#d6d4ce] dark:data-[state=active]:bg-white/10",
                    !DATABASE_ENABLED && "pointer-events-none opacity-50"
                  )}
                >
                  <Database className="w-4 h-4 text-black dark:text-white/80" />
                  Database
                </TabsTrigger>
              </TooltipTrigger>

              {!DATABASE_ENABLED && (
                <TooltipContent>
                  <p>Coming Soon</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </TabsList>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-3 pointer-events-auto">
        {/* Render split screen logic here later if needed, but the user requested it in the Navbar! So I'll hide it since it's already in the navbar now. */}
      </div>
    </div>
  )
}






// "use client"

// import { Globe, Code2, Settings, Database, ChevronRight, ChevronLeft } from "lucide-react"
// import { TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { cn } from "@/lib/utils"
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// interface MainHeaderProps {
//   handleDownload: () => void
//   projectId: string
//   isExpanded?: boolean
//   onToggleExpand?: () => void
// }

// // Toggle this when the database section is ready
// const DATABASE_ENABLED = false

// export function MainHeader({ handleDownload, projectId, isExpanded, onToggleExpand }: MainHeaderProps) {
//   return (
//     <div className="px-2 mt-2 flex items-center justify-between border-gray-200">
//       {/* Left side - Tab Navigation */}
//       <div className="flex items-center gap-2">
//         {onToggleExpand && (
//           <button
//             onClick={onToggleExpand}
//             className="ml-0.5 p-1.5 rounded hover:bg-gray-100 transition-colors"
//             title={isExpanded ? "Collapse preview" : "Expand preview"}
//           >
//             {isExpanded ? (
//               <ChevronRight className="w-4 h-4 text-black" />
//             ) : (
//               <ChevronLeft className="w-4 h-4 text-black" />
//             )}
//           </button>
//         )}
//         <TabsList className="w-full justify-start bg-transparent">
//           <TabsTrigger value="preview" className="gap-2">
//             <Globe className="w-4 h-4 text-black" />
//           </TabsTrigger>

//           <TabsTrigger value="code" className="gap-2">
//             <Code2 className="w-4 h-4 text-black" />
//           </TabsTrigger>

//           <TabsTrigger value="settings" className="gap-2">
//             <Settings className="w-4 h-4 text-black" />
//           </TabsTrigger>

//           <TooltipProvider>
//             <Tooltip>
//               <TooltipTrigger asChild>
//                 <div>
//                   <TabsTrigger
//                     value="database"
//                     disabled={!DATABASE_ENABLED}
//                     className={cn("gap-2", !DATABASE_ENABLED && "pointer-events-none opacity-50")}
//                   >
//                     <Database className="w-4 h-4 text-black" />
//                   </TabsTrigger>
//                 </div>
//               </TooltipTrigger>

//               {!DATABASE_ENABLED && (
//                 <TooltipContent>
//                   <p>Coming Soon</p>
//                 </TooltipContent>
//               )}
//             </Tooltip>
//           </TooltipProvider>
//         </TabsList>
//       </div>

//       {/* Right side - Actions */}
//       <div className="flex items-center gap-3">
//         {/* Deploy button (commented out as in your original) */}
//         {/* 
//         <button
//           onClick={handleDeploy}
//           disabled={isDeploying}
//           className={cn(
//             "flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-colors",
//             isDeploying
//               ? "bg-gray-300 text-gray-500 cursor-not-allowed"
//               : "bg-black text-white hover:bg-gray-800"
//           )}
//         >
//           {isDeploying ? "Publishing..." : "Publish"}
//           <Rocket className="w-4 h-4" />
//         </button>
//         */}

//         {/* Download button - only visible when signed in */}
//         {/* <SignedIn>
//           <TooltipProvider>
//             <Tooltip>
//               <TooltipTrigger asChild>
//                 <button
//                   id="download-button"
//                   onClick={handleDownload}
//                   className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors bg-black text-white hover:bg-gray-800"
//                   title="Download project as ZIP"
//                 >
//                   <Download className="w-4 h-4" />
//                   Download
//                 </button>
//               </TooltipTrigger>
//               <TooltipContent>
//                 <p>Download project as ZIP</p>
//               </TooltipContent>
//             </Tooltip>
//           </TooltipProvider>
//         </SignedIn> */}
//       </div>
//     </div>
//   )
// }
