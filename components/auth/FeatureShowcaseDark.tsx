/*
 * SPDX-License-Identifier: AGPL-3.0-only
 * FeatureShowcase.tsx
 * Copyright (C) 2025 Nextify Limited
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 */

'use client'

import { MultiStepLoader } from '@/components/multi-step-loader-dark'
import React, { useEffect, useState } from 'react'
import { LogoDark } from '../common/logo/LogoImageDark'

/**
 * FeatureShowcase component that uses a multi-step loader to cycle through 
 * feature highlights or real-time AI tasks.
 */
const getFeatureItems = () => [
  { id: 1, text: 'AI-Powered Development' },
  { id: 2, text: 'Cloud IDE Environment' },
  { id: 3, text: 'Open Source Core' },
  { id: 4, text: 'GitHub Integration' },
  { id: 5, text: 'Custom Domain Deployment' },
  { id: 6, text: 'Multi-Model AI Support' },
  { id: 7, text: 'Real-Time Preview' },
  { id: 8, text: 'Welcome' },
]

const getLoadingStates = () =>
  getFeatureItems().map((item) => ({
    text: item.text,
  }))

export default function FeatureShowcaseDark() {
  const [liveTasks, setLiveTasks] = useState<{ text: string; status: string }[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLive, setIsLive] = useState(false)
  
  const featureItems = getFeatureItems()
  const defaultLoadingStates = getLoadingStates()

  // 1. LISTEN for live AI tasks broadcasts from the chat stream
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (Array.isArray(detail?.tasks)) {
        setLiveTasks(detail.tasks)
        setIsLive(true)
      }
    }
    window.addEventListener('falbor-tasks-update', handler)
    return () => window.removeEventListener('falbor-tasks-update', handler)
  }, [])

  // 2. IDLE carousel (only when no live tasks)
  useEffect(() => {
    if (isLive) return

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % featureItems.length)
    }, 1500) // every 1.5 seconds

    return () => clearInterval(interval)
  }, [isLive, featureItems.length])

  // 3. LIVE task progression (follows the real-time AI status)
  useEffect(() => {
    if (!isLive || liveTasks.length === 0) return

    // Find the current active index: 
    // First task that is loading, or first task that is pending after the last success.
    let activeIndex = liveTasks.findIndex(t => t.status === 'loading')
    
    if (activeIndex === -1) {
      // If no loading task, look for the first pending task
      activeIndex = liveTasks.findIndex(t => t.status === 'pending')
    }

    if (activeIndex === -1) {
      // If everything is 'success', stick to the last one
      activeIndex = liveTasks.length - 1
    }

    setCurrentIndex(activeIndex)
  }, [isLive, liveTasks])

  // Final loading states: use real tasks if available, otherwise defaults
  const currentStates = isLive && liveTasks.length > 0
    ? liveTasks.map(t => ({ text: t.text }))
    : defaultLoadingStates

  return (
    <div className='relative w-full z-20 hidden lg:flex overflow-hidden bg-background-landing items-center justify-center flex-col'>
      {/* Logo section */}
      <div className='w-full flex flex-col items-center justify-center h-full'>
        <div className='h-[120px] lg:h-[150px] flex items-center justify-center'>
          <div className='flex justify-center drop-shadow-glowPrimary'>
            <LogoDark />
          </div>
        </div>

        {/* Feature presentation - use MultiStepLoader with externalValue for real-time control */}
        <div className='flex items-center justify-center backdrop-blur-2xl h-[300px] lg:h-[350px] w-full relative'>
          <div className='relative w-full max-w-md mx-auto flex justify-center'>
            <MultiStepLoader
              loadingStates={currentStates}
              loading={true}
              duration={1500}
              loop={!isLive}
              externalValue={currentIndex}
            />
          </div>

          {/* Enhance radial gradient mask effect */}
          <div
            className='absolute inset-x-0 top-0 bottom-0 z-20 pointer-events-none'
            style={{
              background:
                'linear-gradient(to bottom, hsl(var(--background-landing)) 0%, hsla(var(--background-landing), 0) 20%, hsla(var(--background-landing), 0) 80%, hsl(var(--background-landing)) 100%)',
            }}
          />
          <div className='bg-background-landing inset-x-0 z-10 bottom-0 h-full absolute [mask-image:radial-gradient(600px_at_center,transparent_30%,white)]' />
        </div>
      </div>
    </div>
  )
}