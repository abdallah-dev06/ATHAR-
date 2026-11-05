"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { dispatchPost, ChannelTargetType } from "@/lib/telegram";
import { sanitizePostContent } from "@/lib/sanitizer";
import { fetchQuranAyah } from "@/lib/ingestion/quran";
import { getRandomPoetryPiece } from "@/lib/ingestion/poetry";
import { scrapeTelegramChannel } from "@/lib/ingestion/telegram";
import { scrapeTwitterAccount } from "@/lib/ingestion/twitter";
import { ChannelTarget, PostStatus, SourceType } from "@prisma/client";
import { setSession, clearSession, verifyCredentials, isAuthenticated, getSecretSlug } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Admin Login Action
 */
export async function loginAction(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { success: false, error: "يرجى إدخال اسم المستخدم وكلمة المرور" };
  }

  const isValid = verifyCredentials(username, password);
  if (!isValid) {
    return { success: false, error: "بيانات الدخول غير صحيحة. يرجى التأكد من اسم المستخدم وكلمة المرور." };
  }

  await setSession(username);
  const slug = getSecretSlug();
  return { success: true, redirectUrl: `/${slug}` };
}

/**
 * Admin Logout Action
 */
export async function logoutAction() {
  await clearSession();
  const slug = getSecretSlug();
  redirect(`/${slug}/login`);
}

/**
 * Publishes an approved or draft post immediately to Telegram
 */
export async function publishPostNowAction(postId: string) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { source: true },
    });

    if (!post) {
      return { success: false, error: "المنشور غير موجود" };
    }

    const dispatchResult = await dispatchPost({
      content: post.content,
      isAudio: post.isAudio,
      mediaUrl: post.mediaUrl,
      audioTitle: post.audioTitle,
      audioPerformer: post.audioPerformer,
      targetChannel: post.targetChannel as ChannelTargetType,
    });

    if (!dispatchResult.success && dispatchResult.results.every((r) => !r.success)) {
      return {
        success: false,
        error:
          dispatchResult.results[0]?.error ||
          "فشل الإرسال إلى قنوات التلجرام. تحقق من توكن البوت والصلاحيات.",
      };
    }

    // Mark as published in DB
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    revalidatePath("/");
    return {
      success: true,
      channels: dispatchResult.dispatchedChannels,
      details: dispatchResult.results,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `خطأ في النشر: ${msg}` };
  }
}

/**
 * Moves post to APPROVED status (Ready Queue)
 */
export async function approvePostAction(postId: string) {
  try {
    await prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.APPROVED },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

/**
 * Dismisses / archives post
 */
export async function dismissPostAction(postId: string) {
  try {
    await prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.ARCHIVED },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

/**
 * Schedules a post for a specific date and time
 */
export async function schedulePostAction(postId: string, scheduledForIso: string) {
  try {
    const scheduledDate = new Date(scheduledForIso);
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: PostStatus.SCHEDULED,
        scheduledFor: scheduledDate,
      },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

/**
 * Edits post content and targets
 */
export async function editPostAction(
  postId: string,
  data: {
    content: string;
    targetChannel: ChannelTarget;
    isAudio?: boolean;
    mediaUrl?: string | null;
    audioTitle?: string | null;
    audioPerformer?: string | null;
    status?: PostStatus;
  }
) {
  try {
    const cleanedContent = sanitizePostContent(data.content);
    await prisma.post.update({
      where: { id: postId },
      data: {
        content: cleanedContent,
        targetChannel: data.targetChannel,
        isAudio: data.isAudio ?? false,
        mediaUrl: data.mediaUrl || null,
        audioTitle: data.audioTitle || null,
        audioPerformer: data.audioPerformer || null,
        ...(data.status ? { status: data.status } : {}),
      },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

/**
 * Creates a brand new post manually
 */
export async function createManualPostAction(data: {
  content: string;
  targetChannel: ChannelTarget;
  isAudio?: boolean;
  mediaUrl?: string;
  audioTitle?: string;
  audioPerformer?: string;
  status?: PostStatus;
}) {
  try {
    const cleanedContent = sanitizePostContent(data.content);
    await prisma.post.create({
      data: {
        content: cleanedContent,
        targetChannel: data.targetChannel,
        isAudio: !!data.isAudio,
        mediaUrl: data.mediaUrl || null,
        audioTitle: data.audioTitle || null,
        audioPerformer: data.audioPerformer || null,
        status: data.status || PostStatus.APPROVED,
      },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

/**
 * Adds a new ingestion source
 */
export async function addSourceAction(data: {
  name: string;
  type: SourceType;
  handleOrUrl: string;
  targetChannel: ChannelTarget;
}) {
  try {
    const source = await prisma.source.create({
      data: {
        name: data.name,
        type: data.type,
        handleOrUrl: data.handleOrUrl,
        targetChannel: data.targetChannel,
        active: true,
      },
    });
    revalidatePath("/");
    return { success: true, source };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

/**
 * Toggles a source active/inactive
 */
export async function toggleSourceAction(sourceId: string, active: boolean) {
  try {
    await prisma.source.update({
      where: { id: sourceId },
      data: { active },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

/**
 * Deletes a source
 */
export async function deleteSourceAction(sourceId: string) {
  try {
    await prisma.source.delete({
      where: { id: sourceId },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

/**
 * Ingests content from a specific source into the DRAFT pool
 */
export async function fetchFromSourceAction(sourceId: string) {
  try {
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      return { success: false, error: "المصدر غير موجود" };
    }

    let createdCount = 0;

    switch (source.type) {
      case SourceType.QURAN_API: {
        const quranResult = await fetchQuranAyah();
        await prisma.post.create({
          data: {
            content: sanitizePostContent(quranResult.formattedPost),
            mediaUrl: quranResult.audioUrl,
            isAudio: true,
            audioTitle: `سورة ${quranResult.surahName} [${quranResult.ayahNumberInSurah}]`,
            audioPerformer: quranResult.reciterName,
            status: PostStatus.DRAFT,
            targetChannel: source.targetChannel,
            sourceId: source.id,
          },
        });
        createdCount = 1;
        break;
      }

      case SourceType.POETRY_COLLECTION: {
        const poem = getRandomPoetryPiece();
        await prisma.post.create({
          data: {
            content: sanitizePostContent(poem.formattedText),
            isAudio: false,
            status: PostStatus.DRAFT,
            targetChannel: source.targetChannel,
            sourceId: source.id,
          },
        });
        createdCount = 1;
        break;
      }

      case SourceType.TELEGRAM_CHANNEL: {
        const posts = await scrapeTelegramChannel(source.handleOrUrl);
        for (const item of posts) {
          const cleanText = sanitizePostContent(item.text);
          if (cleanText) {
            await prisma.post.create({
              data: {
                content: cleanText,
                mediaUrl: item.mediaUrl,
                isAudio: false,
                status: PostStatus.DRAFT,
                targetChannel: source.targetChannel,
                sourceId: source.id,
              },
            });
            createdCount++;
          }
        }
        break;
      }

      case SourceType.TWITTER_ACCOUNT: {
        const tweets = await scrapeTwitterAccount(source.handleOrUrl);
        for (const tweet of tweets) {
          const cleanTweet = sanitizePostContent(tweet.text);
          if (cleanTweet) {
            await prisma.post.create({
              data: {
                content: cleanTweet,
                mediaUrl: tweet.mediaUrl,
                isAudio: false,
                status: PostStatus.DRAFT,
                targetChannel: source.targetChannel,
                sourceId: source.id,
              },
            });
            createdCount++;
          }
        }
        break;
      }

      default:
        break;
    }

    revalidatePath("/");
    return { success: true, count: createdCount };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

/**
 * Triggers ingestion for all active sources
 */
export async function fetchAllActiveSourcesAction() {
  try {
    const activeSources = await prisma.source.findMany({
      where: { active: true },
    });

    let totalFetched = 0;
    for (const source of activeSources) {
      const res = await fetchFromSourceAction(source.id);
      if (res.success && res.count) {
        totalFetched += res.count;
      }
    }

    revalidatePath("/");
    return { success: true, total: totalFetched };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

/**
 * Schedule Slots actions
 */
export async function addScheduleSlotAction(data: {
  timeSlot: string;
  contentType?: SourceType | null;
  targetChannel: ChannelTarget;
  enabled?: boolean;
}) {
  try {
    const slot = await prisma.scheduleSlot.create({
      data: {
        timeSlot: data.timeSlot,
        contentType: data.contentType || null,
        targetChannel: data.targetChannel,
        enabled: data.enabled ?? true,
      },
    });
    revalidatePath("/");
    return { success: true, slot };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

export async function toggleScheduleSlotAction(slotId: string, enabled: boolean) {
  try {
    await prisma.scheduleSlot.update({
      where: { id: slotId },
      data: { enabled },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

export async function deleteScheduleSlotAction(slotId: string) {
  try {
    await prisma.scheduleSlot.delete({
      where: { id: slotId },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

/**
 * Bulk cleans and sanitizes all existing posts in DB
 * Removes links, borders, frames, and Athar signatures from all drafts and approved posts.
 */
export async function sanitizeExistingPostsAction() {
  try {
    const posts = await prisma.post.findMany({
      where: {
        status: { in: [PostStatus.DRAFT, PostStatus.APPROVED, PostStatus.SCHEDULED] },
      },
    });

    let cleanedCount = 0;
    for (const post of posts) {
      const sanitized = sanitizePostContent(post.content);
      if (sanitized !== post.content) {
        await prisma.post.update({
          where: { id: post.id },
          data: { content: sanitized },
        });
        cleanedCount++;
      }
    }

    revalidatePath("/");
    return { success: true, count: cleanedCount, total: posts.length };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}
