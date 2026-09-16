import AppSidebar from "@/components/app/AppSidebar";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col bg-ink-50 lg:flex-row">
      <AppSidebar user={{ name: user.name, email: user.email, company: user.company }} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
