"use client";

import { useState } from "react";
import PostCard from "./PostCard";
import ScheduleSlotRow from "./ScheduleSlotRow";
import SourceCard from "./SourceCard";
import CreatePostModal from "./CreatePostModal";
import AddSourceModal from "./AddSourceModal";
import AddScheduleSlotModal from "./AddScheduleSlotModal";
import {
  Sparkles,
  Layers,
  Inbox,
  Clock,
  Radio,
  Plus,
  RefreshCw,
  Send,
  Zap,
  CheckCircle2,
  AlertCircle,
  Share2,
  Calendar,
  Settings,
  BookOpen,
  Scroll,
  Hash,
  Check,
  Bot,
} from "lucide-react";
import {
  fetchAllActiveSourcesAction,
  addSourceAction,
  addScheduleSlotAction,
  createManualPostAction,
  logoutAction,
} from "@/app/actions";
import { LogOut } from "lucide-react";
import { fetchQuranAyah } from "@/lib/ingestion/quran";
import { getRandomPoetryPiece } from "@/lib/ingestion/poetry";
import { useRouter } from "next/navigation";
import { ChannelTarget, PostStatus, SourceType } from "@prisma/client";

interface DashboardClientProps {
  initialPosts: Array<{
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
  }>;
  initialSources: Array<{
    id: string;
    name: string;
    type: SourceType;
    handleOrUrl: string;
    active: boolean;
    targetChannel: ChannelTarget;
    createdAt: Date | string;
    _count?: {
      posts: number;
    };
  }>;
  initialSlots: Array<{
    id: string;
    timeSlot: string;
    contentType: SourceType | null;
    targetChannel: ChannelTarget;
    enabled: boolean;
  }>;
  channelInfo: {
    natharat: string;
    nasmat: string;
  };
}

export default function DashboardClient({
  initialPosts,
  initialSources,
  initialSlots,
  channelInfo,
}: DashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "ready-queue" | "source-feeds" | "schedules" | "sources-mgr"
  >("ready-queue");

  // Modals state
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);

  // Filter for ready queue
  const [channelFilter, setChannelFilter] = useState<string>("ALL");

  // Quick inline add states
  const [quickSourceType, setQuickSourceType] = useState<SourceType>(SourceType.TELEGRAM_CHANNEL);
  const [quickSourceName, setQuickSourceName] = useState("");
  const [quickSourceHandle, setQuickSourceHandle] = useState("");
  const [quickSourceTarget, setQuickSourceTarget] = useState<ChannelTarget>(ChannelTarget.BOTH);
  const [quickSourceLoading, setQuickSourceLoading] = useState(false);

  const [quickSlotTime, setQuickSlotTime] = useState("06:00");
  const [quickSlotType, setQuickSlotType] = useState<string>("ANY");
  const [quickSlotTarget, setQuickSlotTarget] = useState<ChannelTarget>(ChannelTarget.BOTH);
  const [quickSlotLoading, setQuickSlotLoading] = useState(false);

  // Global action indicators
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingAll, setIsFetchingAll] = useState(false);
  const [isTestingCron, setIsTestingCron] = useState(false);
  const [generatingQuick, setGeneratingQuick] = useState<string | null>(null);

  const [bannerAlert, setBannerAlert] = useState<{
    type: "success" | "error" | "info";
    msg: string;
  } | null>(null);

  const showBanner = (type: "success" | "error" | "info", msg: string) => {
    setBannerAlert({ type, msg });
    setTimeout(() => setBannerAlert(null), 6000);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleQuickAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSourceName.trim() || !quickSourceHandle.trim()) return;

    setQuickSourceLoading(true);
    try {
      const res = await addSourceAction({
        name: quickSourceName,
        type: quickSourceType,
        handleOrUrl: quickSourceHandle,
        targetChannel: quickSourceTarget,
      });

      if (res.success) {
        showBanner("success", `تمت إضافة المصدر [${quickSourceName}] بنجاح`);
        setQuickSourceName("");
        setQuickSourceHandle("");
        router.refresh();
      } else {
        showBanner("error", res.error || "فشل إضافة المصدر");
      }
    } catch {
      showBanner("error", "حدث خطأ أثناء إضافة المصدر");
    } finally {
      setQuickSourceLoading(false);
    }
  };

  const handleQuickAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSlotTime) return;

    setQuickSlotLoading(true);
    try {
      const res = await addScheduleSlotAction({
        timeSlot: quickSlotTime,
        contentType: quickSlotType === "ANY" ? null : (quickSlotType as SourceType),
        targetChannel: quickSlotTarget,
        enabled: true,
      });

      if (res.success) {
        showBanner("success", `تمت إضافة موعد النشر [${quickSlotTime}] إلى الجدول اليومي`);
        router.refresh();
      } else {
        showBanner("error", res.error || "فشل إضافة الموعد");
      }
    } catch {
      showBanner("error", "حدث خطأ أثناء إضافة الموعد");
    } finally {
      setQuickSlotLoading(false);
    }
  };

  const handleGenerateInstantQuran = async () => {
    setGeneratingQuick("quran");
    try {
      const quran = await fetchQuranAyah();
      const res = await createManualPostAction({
        content: quran.formattedPost,
        targetChannel: ChannelTarget.BOTH,
        isAudio: true,
        mediaUrl: quran.audioUrl,
        audioTitle: `سورة ${quran.surahName} [${quran.ayahNumberInSurah}]`,
        audioPerformer: quran.reciterName,
        status: PostStatus.APPROVED,
      });

      if (res.success) {
        showBanner("success", "تم توليد تلاوة قرآنية صوتية جديدة وإدراجها فوراً في طابور النشر الجاهز!");
        router.refresh();
      }
    } catch {
      showBanner("error", "فشل توليد التلاوة");
    } finally {
      setGeneratingQuick(null);
    }
  };

  const handleGenerateInstantPoetry = async () => {
    setGeneratingQuick("poetry");
    try {
      const poem = getRandomPoetryPiece();
      const res = await createManualPostAction({
        content: poem.formattedText,
        targetChannel: ChannelTarget.NASMAT,
        isAudio: false,
        status: PostStatus.APPROVED,
      });

      if (res.success) {
        showBanner("success", "تم توليد بيت شعر عربي أصيل وإدراجه في طابور النشر الجاهز!");
        router.refresh();
      }
    } catch {
      showBanner("error", "فشل توليد الأبيات");
    } finally {
      setGeneratingQuick(null);
    }
  };

  const handleFetchAllSources = async () => {
    setIsFetchingAll(true);
    try {
      const res = await fetchAllActiveSourcesAction();
      if (res.success) {
        showBanner("success", `تم جلب ${res.total} منشورات جديدة من المصادر النشطة`);
        router.refresh();
      } else {
        showBanner("error", res.error || "فشل الجلب الجماعي");
      }
    } catch {
      showBanner("error", "حدث خطأ أثناء الاتصال بالمصادر");
    } finally {
      setIsFetchingAll(false);
    }
  };

  const handleTestCronDispatch = async () => {
    setIsTestingCron(true);
    try {
      const res = await fetch("/api/cron/dispatch?force=true", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.dispatched) {
        showBanner(
          "success",
          `تم تنفيذ التشغيل الآلي بنجاح! تم النشر إلى: ${data.telegramResult?.dispatchedChannels?.join(" و ")}`
        );
        router.refresh();
      } else {
        showBanner("error", data.message || data.error || "لم يتم تنفيذ البث الآلي");
      }
    } catch {
      showBanner("error", "خطأ في الاتصال بواجهة البث الآلي /api/cron/dispatch");
    } finally {
      setIsTestingCron(false);
    }
  };

  // Filter posts
  const readyQueuePosts = initialPosts.filter(
    (p) => p.status === PostStatus.APPROVED || p.status === PostStatus.SCHEDULED
  ).filter((p) => {
    if (channelFilter === "ALL") return true;
    return p.targetChannel === channelFilter || p.targetChannel === "BOTH";
  });

  const draftPosts = initialPosts.filter((p) => p.status === PostStatus.DRAFT);
  const publishedCount = initialPosts.filter((p) => p.status === PostStatus.PUBLISHED).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header & Branding */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-bold text-2xl shadow-lg shadow-emerald-500/25">
              أَ
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>مَنَصَّة أَثَـر</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  Athar Hub v2.0
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                نظام إدارة المحتوى وجدولة النشر الآلي عبر التلجرام
              </p>
            </div>
          </div>
        </div>

        {/* Telegram Bot & Channels Live Status Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Bot Verified Pill */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-900 border border-emerald-500/30 text-xs text-emerald-300">
            <Bot className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold" dir="ltr">@aydevautopost_bot</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
          </div>

          <a
            href={`https://t.me/${channelInfo.natharat.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl glass-panel text-xs text-emerald-300 border-emerald-500/30 hover:border-emerald-400 transition-colors"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold" dir="ltr">{channelInfo.natharat}</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">نَـظَـرَات</span>
          </a>

          <a
            href={`https://t.me/${channelInfo.nasmat.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl glass-panel text-xs text-amber-300 border-amber-500/30 hover:border-amber-400 transition-colors"
          >
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold" dir="ltr">{channelInfo.nasmat}</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">نَسَمَات</span>
          </a>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-2xl glass-panel text-slate-400 hover:text-white transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`}
            />
          </button>

          <form action={logoutAction}>
            <button
              type="submit"
              className="p-2.5 rounded-2xl glass-panel text-rose-400/80 hover:text-rose-300 hover:bg-rose-950/30 border-rose-500/20 transition-colors"
              title="تسجيل الخروج من المنصة"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Banner Notifications */}
      {bannerAlert && (
        <div
          className={`mb-6 p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border shadow-lg animate-fadeIn ${
            bannerAlert.type === "success"
              ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/30"
              : bannerAlert.type === "error"
              ? "bg-rose-500/15 text-rose-200 border-rose-500/30"
              : "bg-sky-500/15 text-sky-200 border-sky-500/30"
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerAlert.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{bannerAlert.msg}</span>
          </div>
          <button onClick={() => setBannerAlert(null)} className="text-slate-400 hover:text-white">
            إغلاق
          </button>
        </div>
      )}

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => setActiveTab("ready-queue")}
          className={`glass-panel rounded-2xl p-4 flex items-center gap-3 transition-all text-right ${
            activeTab === "ready-queue" ? "border-emerald-500/50 bg-emerald-950/20" : "hover:border-white/20"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400">المنشورات الجاهزة للنشر</p>
            <p className="text-xl font-extrabold text-white">{readyQueuePosts.length}</p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("schedules")}
          className={`glass-panel rounded-2xl p-4 flex items-center gap-3 transition-all text-right ${
            activeTab === "schedules" ? "border-purple-500/50 bg-purple-950/20" : "hover:border-white/20"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400">أوقات النشر اليومية</p>
            <p className="text-xl font-extrabold text-white">
              {initialSlots.filter((s) => s.enabled).length} أوقات
            </p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("sources-mgr")}
          className={`glass-panel rounded-2xl p-4 flex items-center gap-3 transition-all text-right ${
            activeTab === "sources-mgr" ? "border-amber-500/50 bg-amber-950/20" : "hover:border-white/20"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400">مصادر تليجرام وتويتر</p>
            <p className="text-xl font-extrabold text-white">{initialSources.length}</p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("source-feeds")}
          className={`glass-panel rounded-2xl p-4 flex items-center gap-3 transition-all text-right ${
            activeTab === "source-feeds" ? "border-blue-500/50 bg-blue-950/20" : "hover:border-white/20"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400">مسودات واردة للمراجعة</p>
            <p className="text-xl font-extrabold text-white">{draftPosts.length}</p>
          </div>
        </button>
      </div>

      {/* Tabs Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab("ready-queue")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "ready-queue"
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25"
                : "glass-panel text-slate-300 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>قائمة المنشورات الجاهزة للنشر</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === "ready-queue"
                  ? "bg-slate-950 text-emerald-400 font-bold"
                  : "bg-white/10 text-slate-300"
              }`}
            >
              {readyQueuePosts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("schedules")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "schedules"
                ? "bg-purple-500 text-slate-950 shadow-lg shadow-purple-500/25"
                : "glass-panel text-slate-300 hover:text-white"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>قائمة أوقات النشر والجدولة</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === "schedules"
                  ? "bg-slate-950 text-purple-400 font-bold"
                  : "bg-white/10 text-slate-300"
              }`}
            >
              {initialSlots.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sources-mgr")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "sources-mgr"
                ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25"
                : "glass-panel text-slate-300 hover:text-white"
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>إدارة المصادر (قنوات تلجرام وحسابات تويتر)</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === "sources-mgr"
                  ? "bg-slate-950 text-amber-400 font-bold"
                  : "bg-white/10 text-slate-300"
              }`}
            >
              {initialSources.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("source-feeds")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "source-feeds"
                ? "bg-blue-500 text-slate-950 shadow-lg shadow-blue-500/25"
                : "glass-panel text-slate-300 hover:text-white"
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>المسودات الواردة للمراجعة</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === "source-feeds"
                  ? "bg-slate-950 text-blue-400 font-bold"
                  : "bg-white/10 text-slate-300"
              }`}
            >
              {draftPosts.length}
            </span>
          </button>
        </div>

        {/* Global Action Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreatePostOpen(true)}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-l from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/25"
          >
            <Plus className="w-4 h-4" />
            <span>صياغة منشور جاهز جديد</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Tab 1: قائمة المنشورات الجاهزة للنشر (Ready Queue) */}
      {/* ========================================================================= */}
      {activeTab === "ready-queue" && (
        <section className="space-y-6">
          {/* Quick Generators & Filter Toolbar */}
          <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400">تصفية القنوات:</span>
              <button
                type="button"
                onClick={() => setChannelFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  channelFilter === "ALL"
                    ? "bg-white/20 text-white font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                جميع القنوات ({readyQueuePosts.length})
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter("NATHARAT")}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  channelFilter === "NATHARAT"
                    ? "bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40"
                    : "text-slate-400 hover:text-emerald-300"
                }`}
              >
                @natharat06
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter("NASMAT")}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  channelFilter === "NASMAT"
                    ? "bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40"
                    : "text-slate-400 hover:text-amber-300"
                }`}
              >
                @nasmat1448
              </button>
            </div>

            {/* 1-Click Instant Generators */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400">توليد فوري للطابور:</span>
              <button
                type="button"
                onClick={handleGenerateInstantQuran}
                disabled={generatingQuick === "quran"}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{generatingQuick === "quran" ? "جاري التوليد..." : "+ تلاوة صوتية جاهزة"}</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateInstantPoetry}
                disabled={generatingQuick === "poetry"}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Scroll className="w-3.5 h-3.5" />
                <span>{generatingQuick === "poetry" ? "جاري التوليد..." : "+ روائع شعر جاهزة"}</span>
              </button>
            </div>
          </div>

          {/* Posts Grid */}
          {readyQueuePosts.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">لا توجد منشورات في طابور النشر حالياً</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                اضغط على أزرار التوليد السريع بالأعلى لإضافة تلاوة صوتية مباركة أو بيتاً شعرياً أصيلاً
                فوراً، أو اضغط على "صياغة منشور جاهز جديد" لكتابة نص مخصص.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleGenerateInstantQuran}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>توليد تلاوة صوتية الآن</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatePostOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>كتابة منشور يدوي</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {readyQueuePosts.map((post) => (
                <PostCard key={post.id} post={post} onRefresh={handleRefresh} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* Tab 2: قائمة أوقات النشر والجدولة (Publishing Times & Schedules) */}
      {/* ========================================================================= */}
      {activeTab === "schedules" && (
        <section className="space-y-6">
          {/* Quick Inline Form to Add New Publishing Time */}
          <div className="glass-panel p-5 rounded-3xl border border-purple-500/30">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">تحديد موعد نشر يومي جديد</h3>
                  <p className="text-[11px] text-slate-400">
                    أدخل التوقيت اليومي لاختيار المنشور وبثه تلقائياً للقنوات
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestCronDispatch}
                disabled={isTestingCron}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all flex items-center gap-1.5"
                title="بث تجريبي فوري الآن"
              >
                <Zap className={`w-3.5 h-3.5 text-emerald-400 ${isTestingCron ? "animate-spin" : ""}`} />
                <span>{isTestingCron ? "جاري البث التجريبي..." : "تجربة البث الآلي الآن"}</span>
              </button>
            </div>

            <form onSubmit={handleQuickAddSlot} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-xs text-slate-300 block mb-1">وقت النشر اليومي:</label>
                <input
                  type="time"
                  required
                  value={quickSlotTime}
                  onChange={(e) => setQuickSlotTime(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-center text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">نوع المحتوى المفضل:</label>
                <select
                  value={quickSlotType}
                  onChange={(e) => setQuickSlotType(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="ANY">أي محتوى معتمد متاح</option>
                  <option value="QURAN_API">تلاوة قرآنية صوتية (MP3)</option>
                  <option value="POETRY_COLLECTION">روائع الشعر العربي والحكم</option>
                  <option value="TELEGRAM_CHANNEL">مقتطفات قنوات تليجرام</option>
                  <option value="TWITTER_ACCOUNT">تغريدات منصة X</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">القناة المستهدفة:</label>
                <select
                  value={quickSlotTarget}
                  onChange={(e) => setQuickSlotTarget(e.target.value as ChannelTarget)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="BOTH">كلتا القناتين (@natharat06 + @nasmat1448)</option>
                  <option value="NATHARAT">قناة نَـظَـرَات (@natharat06)</option>
                  <option value="NASMAT">قناة نَسَمَات (@nasmat1448)</option>
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={quickSlotLoading}
                  className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-500 hover:bg-purple-400 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{quickSlotLoading ? "جاري الحفظ..." : "إضافة موعد النشر"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Slots List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-2">
              <span>المواعيد اليومية المبرمجة ({initialSlots.length} أوقات):</span>
              <span className="font-mono text-purple-300">بتوقيت مكة المكرمة</span>
            </div>
            {initialSlots.map((slot) => (
              <ScheduleSlotRow key={slot.id} slot={slot} onRefresh={handleRefresh} />
            ))}
          </div>

          {/* Webhook & Cron URL info */}
          <div className="glass-panel p-5 rounded-2xl border-white/5 space-y-2.5 text-xs text-slate-400">
            <h4 className="font-bold text-slate-200 flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-400" />
              <span>طريقة عمل الجدولة الآلية التلقائية:</span>
            </h4>
            <p className="leading-relaxed">
              عند حلول أي وقت محدد في القائمة بالأعلى، يقوم النظام بالتقاط المنشور الجاهز التالي وبثه
              مباشرة عبر البوت <span className="text-emerald-300 font-mono" dir="ltr">@aydevautopost_bot</span> إلى القناة المستهدفة.
            </p>
            <div className="bg-slate-950 p-3 rounded-xl font-mono text-emerald-300 text-xs overflow-x-auto" dir="ltr">
              POST /api/cron/dispatch?secret=athar_hub_cron_secret_key
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* Tab 3: إدارة المصادر (إضافة وتتبع قنوات تلجرام وحسابات تويتر) */}
      {/* ========================================================================= */}
      {activeTab === "sources-mgr" && (
        <section className="space-y-6">
          {/* Quick Inline Form to Add Telegram Channel or Twitter Account */}
          <div className="glass-panel p-5 rounded-3xl border border-amber-500/30">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">إضافة مصدر محتوى جديد (تلجرام أو تويتر)</h3>
                  <p className="text-[11px] text-slate-400">
                    أضف قناة تلجرام عامة أو حساب منصة X / تويتر لجلب محتواه آلياً
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFetchAllSources}
                disabled={isFetchingAll}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingAll ? "animate-spin" : ""}`} />
                <span>{isFetchingAll ? "جاري السحب..." : "جلب التحديثات من كل المصادر"}</span>
              </button>
            </div>

            <form onSubmit={handleQuickAddSource} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              <div>
                <label className="text-xs text-slate-300 block mb-1">نوع المصدر:</label>
                <select
                  value={quickSourceType}
                  onChange={(e) => setQuickSourceType(e.target.value as SourceType)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="TELEGRAM_CHANNEL">قناة تلجرام عامة (Telegram)</option>
                  <option value="TWITTER_ACCOUNT">حساب منصة X / تويتر</option>
                  <option value="QURAN_API">بوابة التلاوات القرآنية (API)</option>
                  <option value="POETRY_COLLECTION">موسوعة الشعر العربي</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">اسم المصدر للتعريف:</label>
                <input
                  type="text"
                  required
                  value={quickSourceName}
                  onChange={(e) => setQuickSourceName(e.target.value)}
                  placeholder="مثال: قناة جواهر الأدب"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">المعرف أو الرابط:</label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={quickSourceHandle}
                  onChange={(e) => setQuickSourceHandle(e.target.value)}
                  placeholder={
                    quickSourceType === "TELEGRAM_CHANNEL"
                      ? "@channel_name أو t.me/..."
                      : "@username"
                  }
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">القناة المستهدفة للبث:</label>
                <select
                  value={quickSourceTarget}
                  onChange={(e) => setQuickSourceTarget(e.target.value as ChannelTarget)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="BOTH">كلتا القناتين (@natharat06 + @nasmat1448)</option>
                  <option value="NATHARAT">قناة نَـظَـرَات (@natharat06)</option>
                  <option value="NASMAT">قناة نَسَمَات (@nasmat1448)</option>
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={quickSourceLoading}
                  className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{quickSourceLoading ? "جاري الإضافة..." : "إضافة المصدر"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Sources Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {initialSources.map((source) => (
              <SourceCard key={source.id} source={source} onRefresh={handleRefresh} />
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* Tab 4: المسودات الواردة للمراجعة (Drafts Pool) */}
      {/* ========================================================================= */}
      {activeTab === "source-feeds" && (
        <section className="space-y-6">
          <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white">المسودات المقترحة المسحوبة من المصادر</h3>
              <p className="text-xs text-slate-400">
                يمكنك مراجعة المنشورات، تعديلها، واعتمادها لنقلها إلى قائمة المنشورات الجاهزة للنشر
              </p>
            </div>

            <button
              type="button"
              onClick={handleFetchAllSources}
              disabled={isFetchingAll}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-slate-950 transition-all flex items-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingAll ? "animate-spin" : ""}`} />
              <span>{isFetchingAll ? "جاري سحب المحتوى..." : "جلب محتوى جديد من كل المصادر"}</span>
            </button>
          </div>

          {draftPosts.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-400 mx-auto flex items-center justify-center">
                <Inbox className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">لا توجد مسودات واردة بانتظار المراجعة</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                اضغط على زر "جلب محتوى جديد من كل المصادر" لجلب أحدث المنشورات من قنوات التلجرام وحسابات تويتر النشطة.
              </p>
              <button
                type="button"
                onClick={handleFetchAllSources}
                disabled={isFetchingAll}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-slate-950 inline-flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isFetchingAll ? "animate-spin" : ""}`} />
                <span>جلب عناصر جديدة الآن</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {draftPosts.map((post) => (
                <PostCard key={post.id} post={post} onRefresh={handleRefresh} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modals */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onSuccess={handleRefresh}
      />

      <AddSourceModal
        isOpen={isAddSourceOpen}
        onClose={() => setIsAddSourceOpen(false)}
        onSuccess={handleRefresh}
      />

      <AddScheduleSlotModal
        isOpen={isAddSlotOpen}
        onClose={() => setIsAddSlotOpen(false)}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
