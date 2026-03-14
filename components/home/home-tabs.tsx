"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Shield, Globe } from "lucide-react";
import { motion } from "framer-motion";

export function HomeTabs() {
  const pathname = usePathname();
  const router = useRouter();
  
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
    <div className="flex items-center justify-center mb-8">
      <div className="flex p-1 bg-[#F1F1EF] border border-[#E2E2E0] rounded-2xl w-fit">
        <button
          onClick={() => handleTabChange("websites")}
          className={cn(
            "relative flex items-center gap-2 px-6 py-2 text-sm font-medium transition-all duration-200 rounded-xl",
            activeTab === "websites" ? "bg-white text-black shadow-sm" : "text-[#878782] hover:text-[#5C5C57]"
          )}
        >
          <Globe className="relative z-10 w-4 h-4" />
          <span className="relative z-10">Websites</span>
        </button>
        <button
          onClick={() => handleTabChange("security")}
          className={cn(
            "relative flex items-center gap-2 px-6 py-2 text-sm font-medium transition-all duration-200 rounded-xl",
            activeTab === "security" ? "bg-white text-black shadow-sm" : "text-[#878782] hover:text-[#5C5C57]"
          )}
        >
          <Shield className="relative z-10 w-4 h-4" />
          <span className="relative z-10">Super Security Agent</span>
        </button>
      </div>
    </div>
  );
}
