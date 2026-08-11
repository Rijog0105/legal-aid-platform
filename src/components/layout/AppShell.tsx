import { Outlet } from 'react-router-dom';
import { RightSidebar } from './RightSidebar';

/**
 * Main layout shell for faculty/admin — sidebar + content area.
 */
export function AppShell() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <div className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
      <RightSidebar />
    </div>
  );
}
