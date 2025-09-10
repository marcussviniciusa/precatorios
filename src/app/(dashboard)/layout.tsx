import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="ml-64 flex flex-col h-screen">
        <Header />
        <main className="flex-1 p-6 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}