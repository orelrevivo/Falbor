export default function ChatLoading() {
    return (
        <div className="absolute inset-0 bg-[#FAF9F5] flex flex-col items-center justify-center z-[50] overflow-hidden">
            <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
                {/* Professional Falbor Spinner */}
                <div className="relative flex items-center justify-center w-20 h-20">
                    <div className="w-10 h-10 border-2 border-[#0099ff] border-t-[#0099ff]/30 rounded-full animate-spin" />
                </div>

                <div className="flex flex-col items-center gap-2">
                    <span className="text-gray-800 font-bold tracking-widest text-sm uppercase">Loading</span>
                    <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>

            </div>
        </div>
    )
}