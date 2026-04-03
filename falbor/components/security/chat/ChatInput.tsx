"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// --- Integrated Textarea Primitive ---
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex w-full rounded-md border-none bg-transparent px-2 py-1 text-[11px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

// --- Main ChatInput Component ---
interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void | Promise<void>;
  onAIRiskScan?: () => void;
  disabled?: boolean;
}

export function ChatInput({
  input,
  setInput,
  onSend,
  onAIRiskScan,
  disabled,
}: ChatInputProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Taller default height as requested (3x the standard compact height)
  const minHeight = 120;
  const maxHeight = 300;

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustHeight]);

  const handleSubmit = async () => {
    if (!input.trim() || isSubmitting || disabled) return;
    setIsSubmitting(true);
    await onSend();
    setInput("");
    setIsSubmitting(false);
    setTimeout(() => adjustHeight(true), 0);
  };

  return (
    <div className="shrink-0 p-4 bg-white fixed bottom-0 w-full z-50 shadow-2xl">
      <div className="max-w-2xl mx-auto">
        <div className={cn(
          "relative flex flex-col bg-white border border-zinc-400 rounded-md transition-all duration-200 shadow-sm",
          "focus-within:ring-2 focus-within:ring-zinc-800/20 focus-within:border-zinc-800"
        )}>

          {/* Main Input Area - Shrunken Text, Taller Height */}
          <Textarea
            ref={textareaRef}
            placeholder="How can we help you with project security?"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              adjustHeight();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={disabled || isSubmitting}
            className="flex-1 p-3 text-[13px] resize-none text-gray-800 placeholder:text-gray-800"
            style={{ height: `${minHeight}px` }}
          />

          {/* Action Bar - Internalized buttons */}
          <div className="flex rounded-b-md items-center justify-end gap-1.5 p-2 bg-zinc-50/50">

            {/* AI Risk Scan - Now inside and smaller */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onAIRiskScan}
              disabled={disabled || isSubmitting}
              className="h-7 px-2.5 rounded-sm border hover:bg-white border-zinc-200 cursor-pointer bg-white hover:text-black flex items-center gap-1.5"
            >
              <ShieldAlert className="w-3 h-3" />
              <span className="text-[12px]">AI Scan</span>
            </Button>

            {/* Send Button - Shrunken */}
            <Button
              onClick={handleSubmit}
              disabled={disabled || isSubmitting || !input.trim()}
              className={cn(
                "h-7 w-7 rounded-sm flex items-center justify-center p-0 transition-all",
                isSubmitting ? "bg-zinc-100" : "bg-black hover:bg-zinc-800 text-white"
              )}
            >
              {isSubmitting ? (
                <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
              ) : (
                <Send className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}