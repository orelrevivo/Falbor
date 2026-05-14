/**
 * Ollama Model Warmup Endpoint
 * 
 * Pre-loads the local Ollama model into VRAM so the first real chat request
 * doesn't suffer a 30-60 second cold start. Called when the user selects
 * an Ollama model from the dropdown.
 */
export async function POST(request: Request) {
  const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "https://wad-animosity-pellet.ngrok-free.dev"

  try {
    const body = await request.json()
    const { model } = body

    if (!model) {
      return new Response(JSON.stringify({ error: "Missing model" }), { status: 400 })
    }

    console.log(`[Ollama/Warmup] Pre-loading model: ${model}`)

    // Send a minimal request to force model loading into VRAM
    // Using keep_alive: "30m" ensures it stays loaded
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "hi" }],
        stream: false,
        keep_alive: "30m",
        options: {
          num_predict: 1, // Generate only 1 token — just enough to force model load
        },
      }),
      signal: AbortSignal.timeout(120000), // 2 min timeout for initial load
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Ollama/Warmup] Failed: ${response.status} ${errorText}`)
      return new Response(JSON.stringify({ error: "Warmup failed", details: errorText }), { status: 502 })
    }

    console.log(`[Ollama/Warmup] Model ${model} is now hot in VRAM`)
    return new Response(JSON.stringify({ success: true, model }), { status: 200 })

  } catch (error: any) {
    console.error("[Ollama/Warmup] Error:", error)
    return new Response(JSON.stringify({ 
      error: "Cannot reach Ollama server",
      hint: "Make sure Ollama is running (ollama serve)"
    }), { status: 502 })
  }
}
