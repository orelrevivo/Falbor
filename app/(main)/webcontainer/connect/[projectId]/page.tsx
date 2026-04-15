"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  params: Promise<{ projectId: string }>;
}

export default function Page({ params }: Props) {
  const router = useRouter();
  const { projectId } = use(params);

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!projectId) {
      console.error("No projectId param found");
      setStatus("error");
      return;
    }

    setStatus("loading");
    // Call your backend API to connect
    fetch("/api/webcontainer/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus("success");
          // Signal the opener window (the WebContainer preview tab)
          if (window.opener) {
            // Send both string and object messages for compatibility with various WebContainer versions
            window.opener.postMessage("connected", "*");
            window.opener.postMessage({ type: "connected", projectId }, "*");
            window.opener.postMessage({ type: "webcontainer:connected", projectId }, "*");
            
            // Small delay to ensure messages are processed before closing
            setTimeout(() => window.close(), 1500);
          } else {
            // If not a popup, just redirect to home after a delay
            setTimeout(() => router.replace("/"), 3000);
          }
        } else {
          setStatus("error");
          router.replace("/connect-error");
        }
      })
      .catch(err => {
        console.error("Error connecting:", err);
        setStatus("error");
        router.replace("/connect-error");
      });
  }, [projectId, router]);

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-[#f8faff]">
      <div className="p-8 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center gap-6 max-w-sm w-full text-center">
        {status === "loading" ? (
          <>
            <div className="h-12 w-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
            <h1 className="text-xl font-bold text-gray-800">Connecting project...</h1>
            <p className="text-sm text-gray-500">Establishing a secure connection with your preview environment.</p>
          </>
        ) : status === "success" ? (
          <>
            <div className="h-12 w-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-800">Successfully Connected!</h1>
            <p className="text-sm text-gray-500">You can now return to your preview tab. This window will close automatically.</p>
          </>
        ) : (
          <>
            <div className="h-12 w-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
               </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-800">Connection Failed</h1>
            <p className="text-sm text-gray-500">We couldn't verify the project connection. Please try again from the preview tab.</p>
          </>
        )}
        <div className="pt-4 border-t border-gray-50 w-full mt-2">
           <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">Project ID: {projectId}</p>
        </div>
      </div>
    </div>
  );
}
