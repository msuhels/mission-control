
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { SkillHealthToast } from "@/components/skill-health-toast"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <span className="text-sm font-medium text-muted-foreground">
                        Mission Control
                    </span>
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
                    {children}
                </main>
            </SidebarInset>
            {/* Global toast: warns when agents are missing the MC skill */}
            <SkillHealthToast />
        </SidebarProvider>
    )
}