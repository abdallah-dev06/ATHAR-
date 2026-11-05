import { prisma } from "@/lib/prisma";
import DashboardClient from "@/components/DashboardClient";
import { isAuthenticated, getSecretSlug } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const authed = await isAuthenticated();
  if (!authed) {
    const slug = getSecretSlug();
    redirect(`/${slug}/login`);
  }

  const [posts, sources, slots] = await Promise.all([
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        source: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    }),
    prisma.source.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            posts: true,
          },
        },
      },
    }),
    prisma.scheduleSlot.findMany({
      orderBy: { timeSlot: "asc" },
    }),
  ]);

  const channelInfo = {
    natharat: process.env.TELEGRAM_CHANNEL_NATHARAT || "@natharat06",
    nasmat: process.env.TELEGRAM_CHANNEL_NASMAT || "@nasmat1448",
  };

  return (
    <main className="min-h-screen">
      <DashboardClient
        initialPosts={posts}
        initialSources={sources}
        initialSlots={slots}
        channelInfo={channelInfo}
      />
    </main>
  );
}
