// ─── Dashboard layout — async Server Component ───────────────────────────────
// Fetches the token balance once on the server and passes it to DashboardShell.
// This eliminates the /api/tokens client fetch that was firing on every page.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';
import { auth }            from '@clerk/nextjs/server';
import { redirect }        from 'next/navigation';
import { getOrCreateUser } from '@/lib/user';
import { prisma }          from '@/lib/db';
import DashboardShell      from './DashboardShell';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/sign-in')

  const user   = await getOrCreateUser(clerkId)
  const wallet = await prisma.tokenWallet.findUnique({
    where:  { userId: user.id },
    select: { balance: true },
  })

  return (
    <DashboardShell initialBalance={wallet?.balance ?? 0}>
      {children}
    </DashboardShell>
  )
}

