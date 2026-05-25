import Navbar from './Navbar'
import Sidebar from './Sidebar'

// App shell for logged-in pages: top navbar + left sidebar + content area.
export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
