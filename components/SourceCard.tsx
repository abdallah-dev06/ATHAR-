"use client";

import { useState } from "react";
import {
  Send,
  BookOpen,
  Scroll,
  Download,
  Trash2,
  Power,
  Radio,
  Share2,
  ExternalLink,
  CheckCircle,
  Hash,
} from "lucide-react";
import {
  toggleSourceAction,
  deleteSourceAction,
  fetchFromSourceAction,
} from "@/app/actions";
import { ChannelTarget, SourceType } from "@prisma/client";

interface SourceCardProps {
  source: {
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
  };
  onRefresh?: () => void;
}

export default function SourceCard({ source, onRefresh }: SourceCardProps) {
  const [active, setActive] = useState(source.active);
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState<string | null>(null);

  const handleToggle = async () => {
    const newStatus = !active;
    setActive(newStatus);
    try {
      await toggleSourceAction(source.id, newStatus);
      if (onRefresh) onRefresh();
    } catch {
      setActive(!newStatus);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`هل أنت متأكد من حذف المصدر [${source.name}]؟`)) return;
    try {
      await deleteSourceAction(source.id);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFetchNow = async () => {
    setFetching(true);
    setFetchMsg(null);
    try {
      const res = await fetchFromSourceAction(source.id);
      if (res.success) {
        setFetchMsg(`تم جلب ${res.count ?? 1} عناصر جديدة بنجاح`);
        if (onRefresh) onRefresh();
      } else {
        setFetchMsg(res.error || "فشل الجلب");
      }
    } catch {
      setFetchMsg("حدث خطأ أثناء الجلب");
    } finally {
      setFetching(false);
      setTimeout(() => setFetchMsg(null), 4000);
    }
  };

  const getSourceTypeDetails = (type: SourceType) => {
    switch (type) {
      case "TELEGRAM_CHANNEL":
        return {
          icon: Send,
          label: "قناة تليجرام عامة",
          color: "text-sky-400 bg-sky-500/15 border-sky-500/30",
        };
      case "TWITTER_ACCOUNT":
        return {
          icon: Hash,
          label: "حساب منصة X / تويتر",
          color: "text-indigo-400 bg-indigo-500/15 border-indigo-500/30",
        };
      case "QURAN_API":
        return {
          icon: BookOpen,
          label: "بوابة تلاوات القرآن (API)",
          color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
        };
      case "POETRY_COLLECTION":
        return {
          icon: Scroll,
          label: "مستودع الشعر والحكم الأصيلة",
          color: "text-amber-400 bg-amber-500/15 border-amber-500/30",
        };
      default:
        return {
          icon: Send,
          label: "مصدر يدوي",
          color: "text-slate-300 bg-slate-800 border-white/10",
        };
    }
  };

  const typeDetails = getSourceTypeDetails(source.type);
  const TypeIcon = typeDetails.icon;

  return (
    <div
      className={`glass-panel glass-panel-hover rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 ${
        active ? "border-emerald-500/20" : "opacity-60 border-white/5"
      }`}
    >
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${typeDetails.color}`}
          >
            <TypeIcon className="w-3.5 h-3.5" />
            {typeDetails.label}
          </span>

          <span className="text-xs text-slate-400 font-mono bg-slate-900/60 px-2 py-0.5 rounded-lg border border-white/5">
            {source._count?.posts ?? 0} منشورات
          </span>
        </div>

        {/* Source Title & Handle */}
        <h3 className="text-base font-bold text-white mb-1">{source.name}</h3>
        <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mb-3" dir="ltr">
          <span className="truncate">{source.handleOrUrl}</span>
        </p>

        {/* Target Channel */}
        <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-4 bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
          <span className="text-slate-400">القناة المستهدفة:</span>
          <span className="font-semibold text-emerald-300">
            {source.targetChannel === "NATHARAT"
              ? "@natharat06"
              : source.targetChannel === "NASMAT"
              ? "@nasmat1448"
              : "كلتا القناتين (@natharat06 + @nasmat1448)"}
          </span>
        </div>

        {/* Feedback notification */}
        {fetchMsg && (
          <div className="mb-3 px-3 py-1.5 rounded-lg text-xs bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{fetchMsg}</span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Active Toggle */}
          <button
            type="button"
            onClick={handleToggle}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              active
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                : "bg-slate-800 text-slate-400 border border-white/5 hover:bg-slate-700"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{active ? "نشط" : "معطل"}</span>
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={handleDelete}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
            title="حذف المصدر"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Fetch Content Button */}
        <button
          type="button"
          onClick={handleFetchNow}
          disabled={fetching || !active}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-emerald-500/15"
        >
          {fetching ? (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
              جاري السحب...
            </span>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>جلب محتوى جديد</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
