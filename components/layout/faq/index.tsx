'use client'

import { Section } from '@/components/ui/section'
import { ReactNode, useEffect, useState } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion-raised'

interface FAQItemProps {
  question: string
  answer: ReactNode
  value?: string
}

interface FAQProps {
  title?: string
  items?: FAQItemProps[] | false
  className?: string
}

export default function FAQ({
  title = 'Frequently Asked Questions',
  items = [
    {
      question: 'What is Falbor?',
      answer: (
        <>
          <p className='text-muted-foreground mb-4 max-w-[640px] text-balance'>Falbor is a free AI-powered website builder that generates complete websites from a simple natural language description you provide in a message.</p>
        </>
      ),
    },
    {
      question: 'How does Falbor work?',
      answer: (
        <>
          <p className='text-muted-foreground mb-4 max-w-[600px]'>Just describe your desired website in plain text—Falbor uses advanced AI to automatically create the code, design, and functionality tailored to your needs.</p>
        </>
      ),
    },
    {
      question: 'What AI models does Falbor use?',
      answer: (
        <>
          <p className='text-muted-foreground mb-4 max-w-[580px]'>Falbor integrates Gemini 3 Flash, Claude 4.5 Opus and Sonnet, and ChatGPT 5.2 and GPT codex Max 5.1, and Grok 4.1 Fast and Grok 3 Mini to deliver high-quality, context-aware website generation across multiple modalities.</p>
        </>
      ),
    },
    {
      question: 'Can I import GitHub projects into Falbor?',
      answer: <p className='text-muted-foreground mb-4 max-w-[580px]'>Absolutely. Paste a single GitHub repository link, and Falbor will import the entire project to build, enhance, or refactor it seamlessly.</p>,
    },
    {
      question: 'What are streams and how often is Falbor updated?',
      answer: <p className='text-muted-foreground mb-4 max-w-[580px]'>Streams enable real-time, collaborative AI interactions for dynamic development. Falbor receives weekly updates from our small team to add features and refine performance.</p>,
    },
  ],
  className,
}: FAQProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <Section className={className}>
      <div className='max-w-container mx-auto flex flex-col items-center gap-8 mb-30'>
        <h2 className='text-center text-black text-3xl leading-tight font-sans font-light sm:text-5xl'>
          {title}
        </h2>
        {!mounted ? (
          items !== false && (
            <div className='w-full max-w-[800px] space-y-3'>
              {items.map((item, index) => (
                <div key={index} className='text-md text-black glass-4 bg-[#F7F7F2] rounded-lg px-4 py-4 font-medium flex items-center justify-between'>
                  <span>{item.question}</span>
                  <div className='icon bg-[#0099ff]/20 rounded-full p-2'>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className='text-[#0099ff] size-4 shrink-0'><path d="M8 2.75C8 2.33579 7.66421 2 7.25 2C6.83579 2 6.5 2.33579 6.5 2.75V6.5H2.75C2.33579 6.5 2 6.83579 2 7.25C2 7.66421 2.33579 8 2.75 8H6.5V11.75C6.5 12.1642 6.83579 12.5 7.25 12.5C7.66421 12.5 8 12.1642 8 11.75V8H11.75C12.1642 8 12.5 7.66421 12.5 7.25C12.5 6.83579 12.1642 6.5 11.75 6.5H8V2.75Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          items !== false && items.length > 0 && (
            <Accordion type='single' collapsible className='w-full max-w-[800px]'>
              {items.map((item, index) => (
                <AccordionItem key={index} value={item.value || `item-${index + 1}`}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )
        )}
      </div>
    </Section>
  )
}