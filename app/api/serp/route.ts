import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    console.error("SERPAPI_API_KEY is not set");
    return NextResponse.json({ error: "SerpApi key not configured" }, { status: 500 });
  }

  try {
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 500 });
    }

    // Extract organic results and links
    const results = data.organic_results?.slice(0, 5).map((r: any) => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet,
    })) || [];

    return NextResponse.json({ results });
  } catch (error) {
    console.error("SerpApi error:", error);
    return NextResponse.json({ error: "Failed to fetch search results" }, { status: 500 });
  }
}
