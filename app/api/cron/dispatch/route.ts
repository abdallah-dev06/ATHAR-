import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchPost, ChannelTargetType } from "@/lib/telegram";
import { sanitizePostContent } from "@/lib/sanitizer";
import { fetchQuranAyah } from "@/lib/ingestion/quran";
import { getRandomPoetryPiece } from "@/lib/ingestion/poetry";
import { PostStatus, SourceType, ChannelTarget } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Helper to get current HH:mm in Riyadh timezone (UTC+3)
 */
function getCurrentRiyadhTime(): { timeString: string; totalMinutes: number } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const timeString = formatter.format(now);
  const [h, m] = timeString.split(":").map(Number);
  return { timeString, totalMinutes: h * 60 + m };
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
    const expectedSecret = process.env.CRON_SECRET || "athar_hub_cron_secret_key";

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

    const now = new Date();
    const { timeString: currentSlotTime, totalMinutes: currentRiyadhMinutes } =
      getCurrentRiyadhTime();

    // =========================================================================
    // STEP 1: Check for individual posts scheduled for a specific timestamp
    // (status = SCHEDULED and scheduledFor <= now)
    // =========================================================================
    const dueScheduledPost = await prisma.post.findFirst({
      where: {
        status: PostStatus.SCHEDULED,
        scheduledFor: { lte: now },
      },
      orderBy: { scheduledFor: "asc" },
      include: { source: true },
    });

    if (dueScheduledPost) {
      const cleanContent = sanitizePostContent(dueScheduledPost.content);
      const dispatchResult = await dispatchPost({
        content: cleanContent,
        isAudio: dueScheduledPost.isAudio,
        mediaUrl: dueScheduledPost.mediaUrl,
        audioTitle: dueScheduledPost.audioTitle,
        audioPerformer: dueScheduledPost.audioPerformer,
        targetChannel: dueScheduledPost.targetChannel as ChannelTargetType,
      });

      await prisma.post.update({
        where: { id: dueScheduledPost.id },
        data: {
          status: PostStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });

      return NextResponse.json({
        dispatched: true,
        type: "SCHEDULED_POST",
        postId: dueScheduledPost.id,
        scheduledFor: dueScheduledPost.scheduledFor,
        targetChannel: dueScheduledPost.targetChannel,
        telegramResult: dispatchResult,
        timestamp: new Date().toISOString(),
      });
    }

    // =========================================================================
    // STEP 2: Check for daily ScheduleSlots (e.g. 21:00, 05:00, etc.)
    // =========================================================================
    const activeSlots = await prisma.scheduleSlot.findMany({
      where: { enabled: true },
    });

    let matchedSlot: (typeof activeSlots)[0] | null = null;

    if (!forceDispatch) {
      for (const slot of activeSlots) {
        const [slotH, slotM] = slot.timeSlot.split(":").map(Number);
        const slotTotalMinutes = slotH * 60 + slotM;
        const diff = currentRiyadhMinutes - slotTotalMinutes;

        // Window: matches if current time is within 0 to 45 minutes past slot time
        // (Handles crons that run periodically e.g. every 10-15 minutes)
        if (diff >= 0 && diff <= 45) {
          // Check if we already published a post for this target channel in the last 40 minutes
          const recentPublishCutoff = new Date(Date.now() - 40 * 60 * 1000);
          const alreadyPublishedRecently = await prisma.post.findFirst({
            where: {
              status: PostStatus.PUBLISHED,
              publishedAt: { gte: recentPublishCutoff },
              targetChannel: slot.targetChannel,
            },
          });

          if (!alreadyPublishedRecently) {
            matchedSlot = slot;
            break;
          }
        }
      }
    } else {
      matchedSlot = activeSlots[0] || null;
    }

    if (!matchedSlot && !forceDispatch) {
      return NextResponse.json({
        dispatched: false,
        message: `No due schedule slots matching current time (${currentSlotTime} Riyadh time).`,
        currentRiyadhTime: currentSlotTime,
        activeSlots: activeSlots.map((s) => s.timeSlot),
      });
    }

    const preferredContentType = matchedSlot?.contentType;
    const targetChannel = (matchedSlot?.targetChannel || ChannelTarget.BOTH) as ChannelTarget;

    // =========================================================================
    // STEP 3: Pick next APPROVED post from Queue, or generate fallback on the fly
    // =========================================================================
    let postToPublish = await prisma.post.findFirst({
      where: {
        status: PostStatus.APPROVED,
        ...(preferredContentType
          ? {
              source: {
                type: preferredContentType,
              },
            }
          : {}),
      },
      orderBy: { createdAt: "asc" },
      include: { source: true },
    });

    // If no post matches specific contentType, pick any APPROVED post
    if (!postToPublish) {
      postToPublish = await prisma.post.findFirst({
        where: {
          status: PostStatus.APPROVED,
        },
        orderBy: { createdAt: "asc" },
        include: { source: true },
      });
    }

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
      // On-the-fly generation if queue is empty
      if (preferredContentType === SourceType.POETRY_COLLECTION) {
        const poem = getRandomPoetryPiece();
        contentToDispatch = poem.formattedText;
        isAudio = false;
      } else {
        const quran = await fetchQuranAyah();
        contentToDispatch = quran.formattedPost;
        isAudio = true;
        mediaUrl = quran.audioUrl;
        audioTitle = `سورة ${quran.surahName} - الآية [${quran.ayahNumberInSurah}]`;
        audioPerformer = quran.reciterName;
      }

      // Save generated fallback post to DB
      const newPost = await prisma.post.create({
        data: {
          content: sanitizePostContent(contentToDispatch),
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

    // =========================================================================
    // STEP 4: Dispatch via Telegram Core
    // =========================================================================
    const sanitizedDispatchContent = sanitizePostContent(contentToDispatch);
    const dispatchResult = await dispatchPost({
      content: sanitizedDispatchContent,
      isAudio,
      mediaUrl,
      audioTitle,
      audioPerformer,
      targetChannel: (postToPublish?.targetChannel || targetChannel) as ChannelTargetType,
    });

    // =========================================================================
    // STEP 5: Mark Post as PUBLISHED
    // =========================================================================
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
      type: "SCHEDULE_SLOT",
      timeSlot: matchedSlot?.timeSlot || currentSlotTime,
      currentRiyadhTime: currentSlotTime,
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
