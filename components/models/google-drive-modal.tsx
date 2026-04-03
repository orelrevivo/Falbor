"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

// Types for Google API window globals
declare global {
  interface Window {
    gapi: any
    google: any
  }
}

interface GoogleDriveModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (files: any[]) => void
}

/**
 * Modal to handle Google Drive file selection using the Google Picker API.
 */
export function GoogleDriveModal({ isOpen, onClose, onSelect }: GoogleDriveModalProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // Configuration - Fetched from public environment variables
  const DEVELOPER_KEY = process.env.NEXT_PUBLIC_GOOGLE_DEVELOPER_KEY || ""
  const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""
  const APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID || ""
  const SCOPES = "https://www.googleapis.com/auth/drive.readonly"

  useEffect(() => {
    // Load token from session storage on mount
    const savedToken = sessionStorage.getItem("google_drive_token")
    if (savedToken) {
      setAccessToken(savedToken)
    }

    if (isOpen && !isLoaded) {
      loadScripts()
    }
  }, [isOpen, isLoaded])

  // Auto-trigger picker if already authenticated when modal opens
  useEffect(() => {
    if (isOpen && isLoaded && accessToken && !error) {
      createPicker(accessToken)
    }
  }, [isOpen, isLoaded, accessToken])

  const loadScripts = () => {
    // ... same script loading logic
    if (!document.getElementById("google-api-js")) {
      const apiScript = document.createElement("script")
      apiScript.id = "google-api-js"
      apiScript.src = "https://apis.google.com/js/api.js"
      apiScript.onload = () => setIsLoaded(true)
      document.body.appendChild(apiScript)
    } else {
      setIsLoaded(true)
    }

    if (!document.getElementById("google-gsi-js")) {
      const gsiScript = document.createElement("script")
      gsiScript.id = "google-gsi-js"
      gsiScript.src = "https://accounts.google.com/gsi/client"
      document.body.appendChild(gsiScript)
    }
  }

  const handleAuth = () => {
    if (!CLIENT_ID) {
      setError("Google Client ID is missing. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment.")
      return
    }

    // If we already have a token, just use it
    if (accessToken) {
      createPicker(accessToken)
      return
    }

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.error !== undefined) {
            setError(`Auth Error: ${response.error}`)
            return
          }
          setAccessToken(response.access_token)
          sessionStorage.setItem("google_drive_token", response.access_token)
          createPicker(response.access_token)
        },
      })
      tokenClient.requestAccessToken()
    } catch (err) {
      console.error("Auth initialization failed:", err)
      setError("Failed to initialize Google Auth. Check your Client ID.")
    }
  }

  const createPicker = (token: string) => {
    if (!window.gapi) return

    window.gapi.load("picker", () => {
      try {
        const picker = new window.google.picker.PickerBuilder()
          .addView(window.google.picker.ViewId.DOCS)
          .addView(new window.google.picker.DocsView().setIncludeFolders(true))
          .addView(window.google.picker.ViewId.FOLDERS)
          .addView(window.google.picker.ViewId.PHOTOS)
          .addView(window.google.picker.ViewId.RECENTLY_PICKED)
          .setOAuthToken(token)
          .setDeveloperKey(DEVELOPER_KEY)
          .setAppId(APP_ID)
          .setCallback((data: any) => {
            if (data.action === window.google.picker.Action.PICKED) {
              onSelect(data.docs)
              onClose()
            } else if (data.action === window.google.picker.Action.CANCEL) {
              // User closed the picker
            }
          })
          .build()
        picker.setVisible(true)
      } catch (err) {
        console.error("Picker creation failed:", err)
        setError("Failed to open Google Picker. Check your API Key and App ID.")
        // If it failed, maybe the token expired?
        sessionStorage.removeItem("google_drive_token")
        setAccessToken(null)
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md z-[10000]">
        <DialogTitle className="text-center flex flex-col items-center gap-2">
          <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" className="w-8 h-8" alt="" />
          Add from Google Drive
        </DialogTitle>
        <div className="flex flex-col items-center justify-center p-4 space-y-4">
          <p className="text-sm text-center text-gray-600">
            {accessToken 
              ? "You are connected! Use the button below to browse your files." 
              : "Import your documents and assets directly from your Google account."}
          </p>

          {error && (
            <div className="w-full p-3 bg-red-50 text-red-600 text-[11px] rounded-md border border-red-100 leading-tight">
              {error}
            </div>
          )}

          <Button 
            className="w-full bg-[#4285F4] hover:bg-[#357ae8] text-white gap-2 font-semibold h-11"
            onClick={handleAuth}
            disabled={!isLoaded}
          >
            {!isLoaded ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Initializing...
              </>
            ) : accessToken ? (
              "Browse My Drive"
            ) : (
              "Connect Google Drive"
            )}
          </Button>

          <div className="text-[11px] text-gray-500 bg-blue-50/50 p-3 rounded-md border border-blue-100/50 w-full mt-2">
            <p className="font-bold mb-1.5 text-blue-700">Setup Instructions for Admin:</p>
            <ol className="list-decimal list-outside ml-4 space-y-1.5">
              <li>Visit <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="underline hover:text-blue-800">Google Cloud Console</a>.</li>
              <li>Enable: <strong>Google Drive API</strong> & <strong>Google Picker API</strong>.</li>
              <li>Credentials: Create an <strong>API Key</strong> and an <strong>OAuth 2.0 Client ID</strong> (Web Application).</li>
              <li>Authorized Origins: Add your website domain (e.g., <code>https://falbor.com</code>).</li>
              <li>Update your <code>.env.local</code> with the keys.</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
