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
      <div className="flex flex-col p-1 bg-[#e7e5df] border border-[#e7e5df] rounded-md min-w-[140px]">

        {/* Search / Super Security Button */}
        <button
          onClick={() => handleTabChange("websites")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium rounded-sm w-full",
            activeTab === "websites"
              ? "bg-white text-gray-800 shadow-xs" // Active state
              : "text-[#878782]" // Inactive state
          )}
        >
          <Globe className={cn("w-3.5 h-3.5", activeTab === "websites" ? "text-gray-800" : "text-[#878782]")} />
          <span>Websites</span>
        </button>
        {/* Computer / Websites Button */}
        <button
          onClick={() => handleTabChange("security")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium rounded-sm w-full",
            activeTab === "security"
              ? "bg-white text-gray-800 shadow-xs" // Active state
              : "text-[#878782]" // Inactive state
          )}
        >
          <Monitor className={cn("w-3.5 h-3.5", activeTab === "security" ? "text-gray-800" : "text-[#878782]")} />
          <span>Super Security</span>
        </button>
      </div>
    </div>
  );
}