"use client"

import React, { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, MapPin, Search, Star, Globe, Check, ChevronDown, RotateCcw, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface GoogleMapsModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (business: any) => void
}

const COUNTRIES = [
  { name: "United States", code: "US", cities: ["New York", "Los Angeles", "Chicago", "Miami", "Houston"] },
  { name: "Canada", code: "CA", cities: ["Toronto", "Vancouver", "Montreal"] },
  { name: "Iceland", code: "IS", cities: ["Reykjavik"] },
  { name: "India", code: "IN", cities: ["Mumbai", "Delhi", "Bangalore"] },
  { name: "Indonesia", code: "ID", cities: ["Jakarta", "Bali"] },
  { name: "Iran", code: "IR", cities: ["Tehran"] },
  { name: "Iraq", code: "IQ", cities: ["Baghdad"] },
  { name: "Ireland", code: "IE", cities: ["Dublin"] },
  { name: "Israel", code: "IL", cities: ["Tel Aviv", "Jerusalem", "Beersheba", "Eilat"] },
  { name: "Italy", code: "IT", cities: ["Rome", "Milan", "Venice"] },
  { name: "Jamaica", code: "JM", cities: ["Kingston"] },
  { name: "Japan", code: "JP", cities: ["Tokyo", "Osaka", "Kyoto"] },
  { name: "Jordan", code: "JO", cities: ["Amman"] },
  { name: "Kazakhstan", code: "KZ", cities: ["Almaty", "Astana"] },
  { name: "Kenya", code: "KE", cities: ["Nairobi"] },
  { name: "Kiribati", code: "KI", cities: ["Tarawa"] },
  { name: "Kuwait", code: "KW", cities: ["Kuwait City"] },
  { name: "Kyrgyzstan", code: "KG", cities: ["Bishkek"] },
  { name: "Laos", code: "LA", cities: ["Vientiane"] },
  { name: "Latvia", code: "LV", cities: ["Riga"] },
  { name: "Lebanon", code: "LB", cities: ["Beirut"] },
  { name: "Lesotho", code: "LS", cities: ["Maseru"] },
  { name: "Liberia", code: "LR", cities: ["Monrovia"] },
  { name: "Libya", code: "LY", cities: ["Tripoli"] },
  { name: "Liechtenstein", code: "LI", cities: ["Vaduz"] },
  { name: "Lithuania", code: "LT", cities: ["Vilnius"] },
  { name: "Luxembourg", code: "LU", cities: ["Luxembourg City"] },
  { name: "Madagascar", code: "MG", cities: ["Antananarivo"] },
  { name: "Malawi", code: "MW", cities: ["Lilongwe"] },
  { name: "Malaysia", code: "MY", cities: ["Kuala Lumpur"] },
  { name: "Maldives", code: "MV", cities: ["Male"] },
  { name: "Mali", code: "ML", cities: ["Bamako"] },
  { name: "Malta", code: "MT", cities: ["Valletta"] },
  { name: "Marshall Islands", code: "MH", cities: ["Majuro"] },
  { name: "Mauritania", code: "MR", cities: ["Nouakchott"] },
  { name: "Mauritius", code: "MU", cities: ["Port Louis"] },
  { name: "Mexico", code: "MX", cities: ["Mexico City", "Cancun"] },
  { name: "Micronesia", code: "FM", cities: ["Palikir"] },
  { name: "Moldova", code: "MD", cities: ["Chisinau"] },
  { name: "Monaco", code: "MC", cities: ["Monaco"] },
  { name: "Mongolia", code: "MN", cities: ["Ulaanbaatar"] },
  { name: "Montenegro", code: "ME", cities: ["Podgorica"] },
  { name: "Morocco", code: "MA", cities: ["Casablanca", "Marrakesh"] },
  { name: "Mozambique", code: "MZ", cities: ["Maputo"] },
  { name: "Myanmar", code: "MM", cities: ["Yangon"] },
  { name: "Namibia", code: "NA", cities: ["Windhoek"] },
  { name: "Nauru", code: "NR", cities: ["Yaren"] },
  { name: "Nepal", code: "NP", cities: ["Kathmandu"] },
  { name: "Netherlands", code: "NL", cities: ["Amsterdam", "Rotterdam"] },
  { name: "New Zealand", code: "NZ", cities: ["Auckland", "Wellington"] },
  { name: "Nicaragua", code: "NI", cities: ["Managua"] },
  { name: "Niger", code: "NE", cities: ["Niamey"] },
  { name: "Nigeria", code: "NG", cities: ["Lagos", "Abuja"] },
  { name: "North Korea", code: "KP", cities: ["Pyongyang"] },
  { name: "North Macedonia", code: "MK", cities: ["Skopje"] },
  { name: "Norway", code: "NO", cities: ["Oslo"] },
  { name: "Oman", code: "OM", cities: ["Muscat"] },
  { name: "Pakistan", code: "PK", cities: ["Karachi", "Lahore"] },
  { name: "Palau", code: "PW", cities: ["Ngerulmud"] },
  { name: "Panama", code: "PA", cities: ["Panama City"] },
  { name: "Papua New Guinea", code: "PG", cities: ["Port Moresby"] },
  { name: "Paraguay", code: "PY", cities: ["Asuncion"] },
  { name: "Peru", code: "PE", cities: ["Lima"] },
  { name: "Philippines", code: "PH", cities: ["Manila"] },
  { name: "Poland", code: "PL", cities: ["Warsaw"] },
  { name: "Portugal", code: "PT", cities: ["Lisbon"] },
  { name: "Qatar", code: "QA", cities: ["Doha"] },
  { name: "Romania", code: "RO", cities: ["Bucharest"] },
  { name: "Russia", code: "RU", cities: ["Moscow", "Saint Petersburg"] },
  { name: "Rwanda", code: "RW", cities: ["Kigali"] },
  { name: "Saint Kitts and Nevis", code: "KN", cities: ["Basseterre"] },
  { name: "Saint Lucia", code: "LC", cities: ["Castries"] },
  { name: "Saint Vincent and the Grenadines", code: "VC", cities: ["Kingstown"] },
  { name: "Samoa", code: "WS", cities: ["Apia"] },
  { name: "San Marino", code: "SM", cities: ["San Marino"] },
  { name: "Sao Tome and Principe", code: "ST", cities: ["Sao Tome"] },
  { name: "Saudi Arabia", code: "SA", cities: ["Riyadh", "Jeddah"] },
  { name: "Senegal", code: "SN", cities: ["Dakar"] },
  { name: "Serbia", code: "RS", cities: ["Belgrade"] },
  { name: "Seychelles", code: "SC", cities: ["Victoria"] },
  { name: "Sierra Leone", code: "SL", cities: ["Freetown"] },
  { name: "Singapore", code: "SG", cities: ["Singapore"] },
  { name: "Slovakia", code: "SK", cities: ["Bratislava"] },
  { name: "Slovenia", code: "SI", cities: ["Ljubljana"] },
  { name: "Solomon Islands", code: "SB", cities: ["Honiara"] },
  { name: "Somalia", code: "SO", cities: ["Mogadishu"] },
  { name: "South Africa", code: "ZA", cities: ["Cape Town", "Johannesburg"] },
  { name: "South Korea", code: "KR", cities: ["Seoul"] },
  { name: "South Sudan", code: "SS", cities: ["Juba"] },
  { name: "Spain", code: "ES", cities: ["Madrid", "Barcelona"] },
  { name: "Sri Lanka", code: "LK", cities: ["Colombo"] },
  { name: "Sudan", code: "SD", cities: ["Khartoum"] },
  { name: "Suriname", code: "SR", cities: ["Paramaribo"] },
  { name: "Sweden", code: "SE", cities: ["Stockholm"] },
  { name: "Switzerland", code: "CH", cities: ["Zurich", "Geneva"] },
  { name: "Syria", code: "SY", cities: ["Damascus"] },
  { name: "Taiwan", code: "TW", cities: ["Taipei"] },
  { name: "Tajikistan", code: "TJ", cities: ["Dushanbe"] },
  { name: "Tanzania", code: "TZ", cities: ["Dar es Salaam"] },
  { name: "Thailand", code: "TH", cities: ["Bangkok"] },
  { name: "Timor-Leste", code: "TL", cities: ["Dili"] },
  { name: "Togo", code: "TG", cities: ["Lome"] },
  { name: "Tonga", code: "TO", cities: ["Nuku'alofa"] },
  { name: "Trinidad and Tobago", code: "TT", cities: ["Port of Spain"] },
  { name: "Tunisia", code: "TN", cities: ["Tunis"] },
  { name: "Turkey", code: "TR", cities: ["Istanbul", "Ankara"] },
  { name: "Turkmenistan", code: "TM", cities: ["Ashgabat"] },
  { name: "Tuvalu", code: "TV", cities: ["Funafuti"] },
  { name: "Uganda", code: "UG", cities: ["Kampala"] },
  { name: "Ukraine", code: "UA", cities: ["Kyiv"] },
  { name: "United Arab Emirates", code: "AE", cities: ["Dubai", "Abu Dhabi"] },
  { name: "United Kingdom", code: "GB", cities: ["London", "Manchester"] },
  { name: "Uruguay", code: "UY", cities: ["Montevideo"] },
  { name: "Uzbekistan", code: "UZ", cities: ["Tashkent"] },
  { name: "Vanuatu", code: "VU", cities: ["Port Vila"] },
  { name: "Vatican City", code: "VA", cities: ["Vatican City"] },
  { name: "Venezuela", code: "VE", cities: ["Caracas"] },
  { name: "Vietnam", code: "VN", cities: ["Hanoi", "Ho Chi Minh City"] },
  { name: "Yemen", code: "YE", cities: ["Sanaa"] },
  { name: "Zambia", code: "ZM", cities: ["Lusaka"] },
  { name: "Zimbabwe", code: "ZW", cities: ["Harare"] }
]

export function GoogleMapsModal({ isOpen, onClose, onSelect }: GoogleMapsModalProps) {
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0])
  const [selectedCity, setSelectedCity] = useState(COUNTRIES[0].cities?.[0] || "")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [countryFilter, setCountryFilter] = useState("")
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [view, setView] = useState<'selection' | 'results'>('selection')

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countryFilter.toLowerCase())
  )

  const handleCountrySelect = (country: typeof COUNTRIES[0]) => {
    setSelectedCountry(country)
    setSelectedCity(country.cities?.[0] || "")
    setResults([])
    setError(null)
    setCountryFilter("")
    setNextPageToken(null)
  }

  const handleScan = async (useToken = false) => {
    setIsLoading(true)
    setError(null)
    if (!useToken) {
      setResults([])
      setNextPageToken(null)
    }

    try {
      let url = `/api/maps/search?city=${encodeURIComponent(selectedCity)}&country=${encodeURIComponent(selectedCountry.name)}&query=${encodeURIComponent(searchQuery)}`
      if (useToken && nextPageToken) {
        url += `&pagetoken=${nextPageToken}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch businesses")
      }

      setResults(data.results || [])
      setNextPageToken(data.nextPageToken || null)

      if (!useToken && data.results?.length > 0) {
        setView('results')
      }

      if (data.results?.length === 0) {
        setError("No businesses found in this area.")
      }
    } catch (err) {
      console.error("Maps scan failed:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectBusiness = (business: any) => {
    const info = `
Business Information (Source: Google Maps):
- Name: ${business.name}
- Address: ${business.address}
- Rating: ${business.rating} (${business.user_ratings_total} reviews)
- Types: ${business.types?.join(", ")}
- Location: ${business.location?.lat}, ${business.location?.lng}
${business.photoUrl ? `\n![Business View](${business.photoUrl})` : ""}

[INSTRUCTION]: Build a professional, fully-designed, full-stack website for this specific business. 
Include features relevant to its type (${business.types?.[0] || 'business'}). 
For example, if it's a salon, add scheduling. If it's a restaurant, add menus and reservations.
Ensure premium aesthetics and modern logic.
`
    onSelect(info)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col p-0 z-[10000] dark:bg-[#0F0F0F] dark:border-white/10">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="flex items-center gap-2 dark:text-white text-lg bg-zinc-900 dark:from-white dark:to-white/70 bg-clip-text text-transparent font-bold">
            <img src="/icons/business-report-dark.png" className="w-5 h-5 shrink-0 hidden dark:block" alt="" />
            <img src="/icons/business-report.png" className="w-5 h-5 shrink-0 dark:hidden" alt="" />
            Find Business
          </DialogTitle>
          <p className="text-[11px] text-zinc-500 dark:text-white/50 leading-none mt-1">
            Select a location to discover prospects.
          </p>
        </DialogHeader>

        <div className="px-3 mb-3 mt-3">
          <div className="flex-1 overflow-y-auto px-4 pb-3 pt-3 space-y-3 border dark:border-white/10 rounded-md chat-messages-scroll dark:bg-[#1E1E21]">
            {view === 'selection' ? (
              <>
                {/* Country Selection */}
                <div className="space-y-1.5 relative">
                  <label className="text-[12px] text-gray-900 dark:text-white/80">1. Country</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="w-full h-9 flex items-center justify-between px-3 rounded-sm cursor-pointer border dark:border-white/10 bg-white dark:bg-black/20 hover:border-[#0099ff] dark:hover:border-[#0099ff] transition-all"
                      >
                        <div className="flex items-center">
                          <img
                            src={`https://flag.vercel.app/l/${selectedCountry.code}.svg`}
                            alt={selectedCountry.name}
                            className="w-4 h-2.5 object-cover rounded-[1px] shadow-sm"
                          />
                          <span className="ml-2 text-[13px] text-zinc-700 dark:text-white/90">{selectedCountry.name}</span>
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 dark:text-white/30" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-[var(--radix-dropdown-menu-trigger-width)] z-[10001] max-h-[300px] 
                  overflow-hidden flex flex-col
                  w-48 max-h-[400px] overflow-y-auto bg-white dark:bg-[#1E1E21] border border-gray-200 dark:border-white/10 shadow-md">
                      <div className="p-2 border-b dark:border-white/5 bg-zinc-50/50 dark:bg-black/20">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 dark:text-white/30" />
                          <input
                            placeholder="Search country..."
                            value={countryFilter}
                            onChange={(e) => setCountryFilter(e.target.value)}
                            className={cn(
                              "file:text-foreground bg-none placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:placeholder:text-white/20 h-9 w-full min-w-0 bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                              "pl-7 h-8 bg-white dark:bg-black/40 border-zinc-200 dark:border-white/10 rounded-lg text-xs focus:outline-none dark:text-white"
                            )}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto pt-1">
                        {filteredCountries.map((country) => (
                          <DropdownMenuItem
                            key={country.code}
                            onClick={() => handleCountrySelect(country)}
                            className={cn(
                              "flex items-center px-3 py-1.5 text-gray-900 dark:text-white/80 transition-colors cursor-pointer text-xs hover:bg-[#e7e7e7] dark:hover:bg-[#2C2C30]",
                              selectedCountry.code === country.code && "bg-[#e7e7e7] dark:bg-[#2C2C30] text-gray-900 dark:text-white"
                            )}
                          >
                            <img
                              src={`https://flag.vercel.app/l/${country.code}.svg`}
                              alt={country.name}
                              className="w-4 h-2.5 object-cover rounded-[1px] border border-zinc-100"
                            />
                            <span className="ml-1.5">{country.name}</span>
                            {selectedCountry.code === country.code && <Check className="ml-auto w-3 h-3" />}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* City Selection */}
                <div className="space-y-1.5">
                  <label className="text-[12px] text-gray-900 dark:text-white/80">2. City</label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCountry.cities?.map((city) => (
                      <Badge
                        key={city}
                        onClick={() => setSelectedCity(city)}
                        className={cn(
                          "text-[11px] font-normal cursor-pointer transition-all",
                          selectedCity === city
                            ? "bg-[#0099ff]/20 text-[#0099ff] border-[#0099ff]/10 dark:bg-[#0099ff]/30 dark:text-[#0099ff] dark:border-white/10"
                            : "bg-white dark:bg-black/20 border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-white/50 hover:border-zinc-300 dark:hover:border-white/20"
                        )}
                      >
                        {city}
                      </Badge>
                    ))}
                    <div className="w-full mt-0.5">
                      <input
                        placeholder="Target city..."
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className={cn(
                          "file:text-foreground bg-none placeholder:text-muted-foreground dark:placeholder:text-white/20 selection:bg-primary selection:text-primary-foreground dark:text-white h-9 w-full min-w-0 bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm shadow-sm",
                          "h-8 bg-white dark:bg-black/30 border-zinc-200 dark:border-white/10 rounded-lg text-xs focus:outline-none",
                          "border border-gray-200 dark:border-white/10 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                        )} />
                    </div>
                  </div>
                </div>

                {/* Search Query */}
                <div className="space-y-1.5">
                  <label className="text-[12px] text-gray-900 dark:text-white/80">3. Niche</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 dark:text-white/30" />
                    <input
                      placeholder="e.g. Italian Restaurant..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn(
                        "file:text-foreground bg-none placeholder:text-muted-foreground dark:placeholder:text-white/20 selection:bg-primary selection:text-primary-foreground dark:text-white h-9 w-full min-w-0 bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm shadow-sm",
                        "pl-7 h-8 bg-white dark:bg-black/30 border-zinc-200 dark:border-white/10 rounded-lg text-xs focus:outline-none",
                        "border border-gray-200 dark:border-white/10 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                      )}
                    />
                  </div>
                </div>

                {/* Scan Button */}
                <Button
                  onClick={() => handleScan(false)}
                  disabled={isLoading}
                  className="w-full h-8 bg-[#0099ff]/20 hover:bg-[#0099ff]/30 text-[#0099ff] transition-all rounded-sm font-bold gap-2 text-xs"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-3.5 h-3.5" />
                      Scan Area
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                {/* Results View */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center px-1">
                    <label className="text-[13px] text-gray-900 dark:text-white/80">Potential Leads</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="text-[9px] dark:bg-white/10 dark:text-white">
                      {results.length} Found
                    </Badge>
                    {(results.length > 0 || nextPageToken) && (
                      <button
                        onClick={() => handleScan(true)}
                        disabled={isLoading}
                        className="p-1 hover:bg-zinc-100 dark:hover:bg-[#2C2C30] rounded-full transition-colors"
                        title="Refresh Results"
                      >
                        <RotateCcw className={cn("w-3.5 h-3.5 text-zinc-500 dark:text-white/50", isLoading && "animate-spin")} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {results.slice(0, 5).map((business) => (
                    <div
                      key={business.id}
                      onClick={() => handleSelectBusiness(business)}
                      className="group relative flex gap-3 p-3 rounded-xl border border-zinc-100 dark:border-white/10 bg-white dark:bg-black/20 hover:border-[#0099ff] dark:hover:border-[#0099ff] hover:shadow-md transition-all duration-300 cursor-pointer"
                    >
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-zinc-50 dark:bg-black/40 flex-shrink-0 border border-zinc-100 dark:border-white/5">
                        {business.photoUrl ? (
                          <img src={business.photoUrl} alt={business.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-zinc-300 dark:text-white/20" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-xs truncate group-hover:text-[#0099ff] transition-colors uppercase tracking-tight text-zinc-800 dark:text-white/90">{business.name}</h3>
                        <p className="text-[10px] text-zinc-500 dark:text-white/50 line-clamp-1 mt-0.5 leading-tight">{business.address}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-0.5 text-amber-500">
                            <Star className="w-3 h-3 fill-current" />
                            <span className="text-[10px] font-bold">{business.rating || "N/A"}</span>
                          </div>
                          <span className="text-[10px] text-zinc-300 dark:text-white/10">•</span>
                          <span className="text-[10px] font-medium text-zinc-400 dark:text-white/40 tracking-tight">{business.user_ratings_total || 0} reviews</span>
                        </div>
                      </div>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 bg-[#0099ff] text-white p-1.5 rounded-full shadow-lg">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => setView('selection')}
                  variant="outline"
                  className="w-full h-8 bg-[#0099ff]/20 hover:bg-[#0099ff]/30 text-[#0099ff] transition-all rounded-sm font-bold gap-2 text-xs"
                >
                  <ArrowLeft className="w-3 h-3 mr-2" />
                  Search Different Location
                </Button>
              </>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-[10px] flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-red-600" />
                {error}
              </div>
            )}
          </div>
        </div>

        {results.length > 0 && view === 'results' && (
          <div className="p-2 border-t dark:border-white/10 bg-zinc-50 dark:bg-black/40 text-center">
            <p className="text-[11px] text-gray-900 dark:text-white/60">Powered by Google Cloud Vision</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
