import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_DEVELOPER_KEY

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query")
  const city = searchParams.get("city")
  const country = searchParams.get("country")
  const pageToken = searchParams.get("pagetoken")

  if (!city || !country) {
    return NextResponse.json({ error: "City and Country are required" }, { status: 400 })
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return NextResponse.json({ error: "Google Maps API key is not configured. Please add GOOGLE_MAPS_API_KEY to your .env file." }, { status: 500 })
  }

  try {
    // 1. Search for places in the city/country
    const searchQuery = `${query || "business"} in ${city}, ${country}`
    let searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${GOOGLE_MAPS_API_KEY}`

    if (pageToken) {
      searchUrl += `&pagetoken=${pageToken}`
    }

    const searchResponse = await fetch(searchUrl)
    const searchData = await searchResponse.json()

    if (searchData.status !== "OK") {
      return NextResponse.json({ error: searchData.error_message || searchData.status }, { status: 400 })
    }

    // 2. Format the top results (up to 5)
    const results = await Promise.all(searchData.results.slice(0, 5).map(async (place: any) => {
      // Get photo URL if available
      let photoUrl = null
      if (place.photos && place.photos.length > 0) {
        photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
      }

      return {
        id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        types: place.types,
        photoUrl,
        location: place.geometry.location,
        // We could fetch more details here if needed
      }
    }))

    return NextResponse.json({ 
      results,
      nextPageToken: searchData.next_page_token 
    })
  } catch (error) {
    console.error("Google Maps Search Error:", error)
    return NextResponse.json({ error: "Failed to fetch data from Google Maps" }, { status: 500 })
  }
}
