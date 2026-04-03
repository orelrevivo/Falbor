import { auth } from "@clerk/nextjs/server"
import { InputArea } from "@/components/workbench/input-area"
import HeroText from "@/components/layout/hero"
import FeatureCards from "@/components/layout/features/FeatureCards"
import { redirect } from "next/navigation"

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AuthenticatedHomePage({ searchParams }: HomePageProps) {
  const { userId } = await auth()
  
  if (!userId) {
    redirect("/")
  }

  const params = await searchParams
  const initialMessage = typeof params.message === 'string' ? params.message : undefined

  return (
    <div className="flex flex-col items-center h-full justify-center top-[-100px] relative">
      <div className="z-10">
        <HeroText />
      </div>
      <img src="/bg/bg-text.png" alt="" className="absolute mt-[-160px] ml-25 w-[50%] pointer-events-none" />
      <div className="w-full flex flex-col items-center mt-6 z-10">
        <InputArea isAuthenticated initialMessage={initialMessage} />
        <div className="absolute bottom-[-130px]">
          <FeatureCards />
        </div>
      </div>
    </div>
  )
}
