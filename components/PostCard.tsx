"use client";

import { useState } from "react";
import AudioPlayerPreview from "./AudioPlayerPreview";
import {
  Send,
  Calendar,
  CheckCircle,
  XCircle,
  Edit3,
  Clock,
  Radio,
  Share2,
  Trash2,
  FileText,
  Bookmark,
  Volume2,
  Check,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import {
  publishPostNowAction,
  approvePostAction,
  dismissPostAction,
  schedulePostAction,
  editPostAction,
} from "@/app/actions";
import { ChannelTarget, PostStatus } from "@prisma/client";

interface PostCardProps {
  post: {
    id: string;
    content: string;
    mediaUrl: string | null;
    isAudio: boolean;
    audioTitle: string | null;
    audioPerformer: string | null;
    status: PostStatus;
    targetChannel: ChannelTarget;
    scheduledFor: Date | string | null;
    publishedAt: Date | string | null;
    createdAt: Date | string;
    source?: {
      name: string;
      type: string;
    } | null;
  };
  onRefresh?: () => void;
}

export default function PostCard({ post, onRefresh }: PostCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [content, setContent] = useState(post.content);
  const [targetChannel, setTargetChannel] = useState<ChannelTarget>(post.targetChannel);
  const [audioTitle, setAudioTitle] = useState(post.audioTitle || "");
  const [audioPerformer, setAudioPerformer] = useState(post.audioPerformer || "");

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Clear feedback after 4 seconds
  const showFeedback = (type: "success" | "error", msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handlePublishNow = async () => {
    if (!confirm("هل أنت متأكد من رغبتك في النشر الفوري المباشر الآن على القناة؟")) return;
    setLoadingAction("publish");
    try {
      const res = await publishPostNowAction(post.id);
      if (res.success) {
        showFeedback("success", `تم النشر بنجاح إلى: ${res.channels?.join(" و ")}`);
        if (onRefresh) onRefresh();
      } else {
        showFeedback("error", res.error || "تعذر النشر");
      }
    } catch {
      showFeedback("error", "حدث خطأ غير متوقع أثناء النشر");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleApprove = async () => {
    setLoadingAction("approve");
    try {
      const res = await approvePostAction(post.id);
      if (res.success) {
        showFeedback("success", "تم اعتماد المنشور ونقله إلى طابور النشر الجاهز");
        if (onRefresh) onRefresh();
      } else {
        showFeedback("error", res.error || "حدث خطأ");
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDismiss = async () => {
    if (!confirm("هل تريد تجاهل وأرشفة هذا المنشور؟")) return;
    setLoadingAction("dismiss");
    try {
      const res = await dismissPostAction(post.id);
      if (res.success) {
        showFeedback("success", "تم نقل المنشور إلى الأرشيف");
        if (onRefresh) onRefresh();
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleTime) return;
    setLoadingAction("schedule");
    try {
      const res = await schedulePostAction(post.id, scheduleTime);
      if (res.success) {
        showFeedback("success", "تم تعيين موعد الجدولة بنجاح");
        setIsScheduling(false);
        if (onRefresh) onRefresh();
      } else {
        showFeedback("error", res.error || "خطأ في الجدولة");
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSaveEdit = async () => {
    setLoadingAction("edit");
    try {
      const res = await editPostAction(post.id, {
        content,
        targetChannel,
        audioTitle: post.isAudio ? audioTitle : null,
        audioPerformer: post.isAudio ? audioPerformer : null,
      });
      if (res.success) {
        showFeedback("success", "تم حفظ التعديلات");
        setIsEditing(false);
        if (onRefresh) onRefresh();
      } else {
        showFeedback("error", res.error || "خطأ في التعديل");
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const getTargetBadge = (target: ChannelTarget) => {
    switch (target) {
      case "NATHARAT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <Radio className="w-3 h-3 text-emerald-400" />
            @natharat06
          </span>
        );
      case "NASMAT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Radio className="w-3 h-3 text-amber-400" />
            @nasmat1448
          </span>
        );
      case "BOTH":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <Share2 className="w-3 h-3 text-sky-400" />
            كلتا القناتين (@natharat06 + @nasmat1448)
          </span>
        );
    }
  };

  const getStatusBadge = (status: PostStatus) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle className="w-3 h-3" />
            جاهز للنشر
          </span>
        );
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            <FileText className="w-3 h-3" />
            مسودة واردة
          </span>
        );
      case "SCHEDULED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
            <Clock className="w-3 h-3" />
            مجدول
          </span>
        );
      case "PUBLISHED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/40">
            <Sparkles className="w-3 h-3" />
            تم النشر
          </span>
        );
      case "ARCHIVED":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-700/50 text-slate-400 border border-slate-600/40">
            <XCircle className="w-3 h-3" />
            مؤرشف
          </span>
        );
    }
  };

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-5 relative overflow-hidden transition-all duration-300">
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`mb-4 px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between animate-fadeIn ${
            feedback.type === "success"
              ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40"
              : "bg-rose-500/20 text-rose-200 border border-rose-500/40"
          }`}
        >
          <span>{feedback.msg}</span>
          <button onClick={() => setFeedback(null)}>
            <XCircle className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* Header bar: badges and source */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          {getStatusBadge(post.status)}
          {getTargetBadge(post.targetChannel)}
          {post.isAudio && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Volume2 className="w-3 h-3" />
              مقطع صوتي MP3
            </span>
          )}
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
          {post.source && (
            <span className="bg-slate-800/80 px-2 py-0.5 rounded-md border border-white/5">
              {post.source.name}
            </span>
          )}
          <span>
            {new Date(post.createdAt).toLocaleDateString("ar-SA", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
      </div>

      {/* Main Content View or Inline Edit Mode */}
      {isEditing ? (
        <div className="space-y-3 mb-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            className="w-full bg-slate-900/90 border border-white/10 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors font-sans resize-y"
            placeholder="نص المنشور..."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">القناة المستهدفة</label>
              <select
                value={targetChannel}
                onChange={(e) => setTargetChannel(e.target.value as ChannelTarget)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="BOTH">كلتا القناتين (@natharat06 + @nasmat1448)</option>
                <option value="NATHARAT">قناة نَـظَـرَات (@natharat06)</option>
                <option value="NASMAT">قناة نَسَمَات (@nasmat1448)</option>
              </select>
            </div>

            {post.isAudio && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">عنوان المقطع الصوتي</label>
                  <input
                    type="text"
                    value={audioTitle}
                    onChange={(e) => setAudioTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    placeholder="مثال: سورة الرحمن"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">اسم القارئ / المؤدي</label>
                  <input
                    type="text"
                    value={audioPerformer}
                    onChange={(e) => setAudioPerformer(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    placeholder="مثال: الشيخ مشاري العفاسي"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-slate-800 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={loadingAction === "edit"}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <Check className="w-3.5 h-3.5" />
              حفظ التعديلات
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {/* Audio Player if Audio file attached */}
          {post.isAudio && post.mediaUrl && (
            <div className="mb-3">
              <AudioPlayerPreview
                src={post.mediaUrl}
                title={post.audioTitle || "تلاوة صوتية"}
                performer={post.audioPerformer || "أَثَر"}
              />
            </div>
          )}

          {/* Text preview with Arabic typography */}
          <div className="bg-slate-950/40 rounded-xl p-4 border border-white/5">
            <p className="text-slate-200 text-sm md:text-base leading-relaxed whitespace-pre-line font-amiri tracking-wide select-text">
              {post.content}
            </p>
          </div>
        </div>
      )}

      {/* Scheduling inline picker */}
      {isScheduling && (
        <div className="mb-4 p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl space-y-2">
          <label className="text-xs font-semibold text-purple-300 block">
            حدد تاريخ ووقت الإرسال التلقائي:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="bg-slate-900 border border-purple-500/40 rounded-lg px-3 py-1.5 text-xs text-purple-200 focus:outline-none flex-1"
            />
            <button
              type="button"
              onClick={handleSaveSchedule}
              disabled={loadingAction === "schedule" || !scheduleTime}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500 hover:bg-purple-400 text-slate-950 transition-colors disabled:opacity-50"
            >
              تأكيد الجدولة
            </button>
            <button
              type="button"
              onClick={() => setIsScheduling(false)}
              className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Actions Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          {/* Quick Edit */}
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="px-2.5 py-1.5 rounded-xl text-xs text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-white/5 transition-colors flex items-center gap-1"
            title="تعديل المنشور"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تعديل</span>
          </button>

          {/* Quick Schedule */}
          <button
            type="button"
            onClick={() => setIsScheduling(!isScheduling)}
            className="px-2.5 py-1.5 rounded-xl text-xs text-purple-300 hover:text-purple-200 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/20 transition-colors flex items-center gap-1"
            title="جدولة المنشور"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">جدولة</span>
          </button>

          {/* Dismiss / Archive */}
          {post.status !== "ARCHIVED" && (
            <button
              type="button"
              onClick={handleDismiss}
              disabled={loadingAction === "dismiss"}
              className="px-2.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors flex items-center gap-1"
              title="تجاهل وأرشفة"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تجاهل</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* If DRAFT: Approve button */}
          {post.status === "DRAFT" && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={loadingAction === "approve"}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>اعتماد إلى الطابور</span>
            </button>
          )}

          {/* Primary Action: Publish Now (نشر فوري الآن) */}
          <button
            type="button"
            onClick={handlePublishNow}
            disabled={loadingAction === "publish"}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-l from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 active:scale-95 disabled:opacity-50"
          >
            {loadingAction === "publish" ? (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                جاري النشر...
              </span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 fill-current" />
                <span>نشر فوري الآن</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
