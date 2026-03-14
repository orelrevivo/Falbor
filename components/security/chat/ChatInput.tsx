"use client";

import { Send, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onAIRiskScan?: () => void;
  disabled?: boolean;
}

export function ChatInput({ input, setInput, onSend, onAIRiskScan, disabled }: ChatInputProps) {
  return (
    <div className="shrink-0 p-6 bg-white fixed bottom-0 w-full border-t border-zinc-100 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
      <div className="max-w-4xl mx-auto flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onAIRiskScan}
            disabled={disabled}
            className="h-8 rounded-full border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 text-[10px] font-black uppercase tracking-widest gap-2 px-4 shadow-sm"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Scan for AI-Introduced Risks
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              className="w-full bg-zinc-50 border-none rounded-[1.2rem] text-sm h-12 px-6 focus:ring-2 focus:ring-teal-500/10 placeholder:text-zinc-400 font-medium"
              placeholder="Type a security command or question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSend()}
              disabled={disabled}
            />
          </div>
          <Button
            onClick={onSend}
            size="icon"
            disabled={disabled || !input.trim()}
            className="h-12 w-12 bg-teal-600 hover:bg-teal-700 rounded-[1.2rem] shadow-lg shadow-teal-100"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
