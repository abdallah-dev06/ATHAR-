import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchPost, ChannelTargetType } from "@/lib/telegram";
import { fetchQuranAyah } from "@/lib/ingestion/quran";
import { getRandomPoetryPiece } from "@/lib/ingestion/poetry";
import { PostStatus, SourceType } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Helper to get current HH:mm in Riyadh timezone (UTC+3) or local server time
 */
function getCurrentTimeSlot(): string {
  const now = new Date();
  // Using Intl format to get HH:mm in Asia/Riyadh (standard for Arabic Telegram channels)
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(now);
}

export async function GET(req: NextRequest) {
  return handleCronDispatch(req);
}

export async function POST(req: NextRequest) {
  return handleCronDispatch(req);
}

async function handleCronDispatch(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const authHeader = req.headers.get("authorization");
    const secretQuery = url.searchParams.get("secret");
    const forceDispatch = url.searchParams.get("force") === "true";
    const expectedSecret = process.env.CRON_SECRET;

    // Optional secret verification
    if (expectedSecret && expectedSecret !== "athar_hub_cron_secret_key") {
      const token = authHeader?.replace("Bearer ", "") || secretQuery;
      if (token !== expectedSecret && !forceDispatch) {
        return NextResponse.json(
          { error: "Unauthorized access to cron endpoint" },
          { status: 401 }
        );
      }
    }

    const currentSlotTime = getCurrentTimeSlot();

    // 1. Check if there are active ScheduleSlots matching current time (or force dispatch)
    let activeSlots = await prisma.scheduleSlot.findMany({
      where: { enabled: true },
    });

    let matchedSlot = activeSlots.find(
      (slot) => slot.timeSlot === currentSlotTime
    );

    // If force dispatch is requested or no exact minute match, use the first slot or proceed
    if (!matchedSlot && forceDispatch && activeSlots.length > 0) {
      matchedSlot = activeSlots[0];
    }

    if (!matchedSlot && !forceDispatch) {
      return NextResponse.json({
        dispatched: false,
        message: `No active schedule slots matching current time (${currentSlotTime} Riyadh time).`,
        activeSlots: activeSlots.map((s) => s.timeSlot),
      });
    }

    const preferredContentType = matchedSlot?.contentType;
    const targetChannel = matchedSlot?.targetChannel || "BOTH";

    // 2. Pick next APPROVED or SCHEDULED post from DB
    let postToPublish = await prisma.post.findFirst({
      where: {
        status: { in: [PostStatus.APPROVED, PostStatus.SCHEDULED] },
        ...(matchedSlot?.contentType
          ? {
              source: {
                type: matchedSlot.contentType,
              },
            }
          : {}),
      },
      orderBy: { createdAt: "asc" },
      include: { source: true },
    });

    // If no post found matching contentType, try any approved post
    if (!postToPublish) {
      postToPublish = await prisma.post.findFirst({
        where: {
          status: { in: [PostStatus.APPROVED, PostStatus.SCHEDULED] },
        },
        orderBy: { createdAt: "asc" },
        include: { source: true },
      });
    }

    // 3. Fallback on-the-fly generation if Queue is empty!
    let fallbackGenerated = false;
    let contentToDispatch = "";
    let isAudio = false;
    let mediaUrl: string | null = null;
    let audioTitle: string | null = null;
    let audioPerformer: string | null = null;
    let postDbId: string | null = null;

    if (postToPublish) {
      contentToDispatch = postToPublish.content;
      isAudio = postToPublish.isAudio;
      mediaUrl = postToPublish.mediaUrl;
      audioTitle = postToPublish.audioTitle;
      audioPerformer = postToPublish.audioPerformer;
      postDbId = postToPublish.id;
    } else {
      fallbackGenerated = true;
      // On-the-fly generation
      if (preferredContentType === SourceType.POETRY_COLLECTION) {
        const poem = getRandomPoetryPiece();
        contentToDispatch = poem.formattedText;
        isAudio = false;
      } else {
        // Default to Quran Audio track
        const quran = await fetchQuranAyah();
        contentToDispatch = quran.formattedPost;
        isAudio = true;
        mediaUrl = quran.audioUrl;
        audioTitle = `سورة ${quran.surahName} - الآية [${quran.ayahNumberInSurah}]`;
        audioPerformer = quran.reciterName;
      }

      // Save this generated post to DB
      const newPost = await prisma.post.create({
        data: {
          content: contentToDispatch,
          isAudio,
          mediaUrl,
          audioTitle,
          audioPerformer,
          targetChannel,
          status: PostStatus.APPROVED,
        },
      });
      postDbId = newPost.id;
    }

    // 4. Dispatch via Telegram Bot Core
    const dispatchResult = await dispatchPost({
      content: contentToDispatch,
      isAudio,
      mediaUrl,
      audioTitle,
      audioPerformer,
      targetChannel: (postToPublish?.targetChannel || targetChannel) as ChannelTargetType,
    });

    // 5. Update Post status to PUBLISHED
    if (postDbId) {
      await prisma.post.update({
        where: { id: postDbId },
        data: {
          status: PostStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      dispatched: true,
      timeSlot: matchedSlot?.timeSlot || currentSlotTime,
      fallbackGenerated,
      postId: postDbId,
      telegramResult: dispatchResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("Cron Dispatch failed:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal dispatch error", details: msg },
      { status: 500 }
    );
  }
}
