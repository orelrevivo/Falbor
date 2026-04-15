"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sparkles, Monitor, Globe } from "lucide-react"; // Matching the visual style of your icons

export function HomeTabs() {
  const pathname = usePathname();
  const router = useRouter();

  // Mapping the UI labels to your routes
  const isSecurity = pathname?.startsWith("/super-security");
  const activeTab = isSecurity ? "security" : "websites";

  const handleTabChange = (tab: "websites" | "security") => {
    if (tab === "websites") {
      router.push("/");
    } else {
      router.push("/super-security");
    }
  };

  return (
    <div className="flex flex-col w-full">
      {/* The Main Container: Dark, rounded, and compact */}
      <div className="flex flex-col p-1 bg-[#e7e5df] border border-[#e7e5df] dark:bg-muted/50 dark:border-border rounded-md min-w-[140px]">

        {/* Search / Super Security Button */}
        <button
          onClick={() => handleTabChange("websites")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium rounded-sm w-full",
            activeTab === "websites"
              ? "bg-background text-foreground shadow-xs" // Active state
              : "text-muted-foreground" // Inactive state
          )}
        >
          <Globe className={cn("w-3.5 h-3.5", activeTab === "websites" ? "text-foreground" : "text-muted-foreground")} />
          <span>Websites</span>
        </button>
        {/* Computer / Websites Button */}
        <button
          onClick={() => handleTabChange("security")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium rounded-sm w-full",
            activeTab === "security"
              ? "bg-background text-foreground shadow-xs" // Active state
              : "text-muted-foreground" // Inactive state
          )}
        >
          <Monitor className={cn("w-3.5 h-3.5", activeTab === "security" ? "text-foreground" : "text-muted-foreground")} />
          <span>Super Security</span>
        </button>
      </div>
    </div>
  );
}