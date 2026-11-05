"use client";

import { useState } from "react";
import { Clock, Trash2, Power, Radio, BookOpen, Scroll, Send } from "lucide-react";
import { toggleScheduleSlotAction, deleteScheduleSlotAction } from "@/app/actions";
import { ChannelTarget, SourceType } from "@prisma/client";

interface ScheduleSlotRowProps {
  slot: {
    id: string;
    timeSlot: string;
    contentType: SourceType | null;
    targetChannel: ChannelTarget;
    enabled: boolean;
  };
  onRefresh?: () => void;
}

export default function ScheduleSlotRow({ slot, onRefresh }: ScheduleSlotRowProps) {
  const [enabled, setEnabled] = useState(slot.enabled);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    const newStatus = !enabled;
    setEnabled(newStatus);
    try {
      await toggleScheduleSlotAction(slot.id, newStatus);
      if (onRefresh) onRefresh();
    } catch {
      setEnabled(!newStatus); // revert
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`هل أنت متأكد من حذف موعد النشر [${slot.timeSlot}]؟`)) return;
    setLoading(true);
    try {
      await deleteScheduleSlotAction(slot.id);
      if (onRefresh) onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const getContentTypeInfo = (type: SourceType | null) => {
    switch (type) {
      case "QURAN_API":
        return {
          label: "تلاوة قرآنية صوتية (MP3)",
          icon: BookOpen,
          color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
        };
      case "POETRY_COLLECTION":
        return {
          label: "روائع الشعر العربي والحكم",
          icon: Scroll,
          color: "text-amber-400 bg-amber-500/15 border-amber-500/30",
        };
      case "TELEGRAM_CHANNEL":
        return {
          label: "مقتطفات قنوات تليجرام",
          icon: Send,
          color: "text-sky-400 bg-sky-500/15 border-sky-500/30",
        };
      case "TWITTER_ACCOUNT":
        return {
          label: "تغريدات منصة X",
          icon: Send,
          color: "text-indigo-400 bg-indigo-500/15 border-indigo-500/30",
        };
      default:
        return {
          label: "المحتوى المعتمد المتاح",
          icon: Clock,
          color: "text-slate-300 bg-slate-800 border-white/10",
        };
    }
  };

  const typeInfo = getContentTypeInfo(slot.contentType);
  const TypeIcon = typeInfo.icon;

  return (
    <div
      className={`glass-panel rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-200 ${
        enabled ? "border-emerald-500/20" : "opacity-60 border-white/5"
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Time Badge */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-white/10 px-4 py-2 rounded-xl">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-xl font-bold tracking-wider text-white">
            {slot.timeSlot}
          </span>
        </div>

        {/* Content Type Preference & Channel Target */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${typeInfo.color}`}
            >
              <TypeIcon className="w-3.5 h-3.5" />
              {typeInfo.label}
            </span>

            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-400" />
              {slot.targetChannel === "NATHARAT"
                ? "@natharat06"
                : slot.targetChannel === "NASMAT"
                ? "@nasmat1448"
                : "كلتا القناتين (@natharat06 + @nasmat1448)"}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {enabled ? "الموعد مفعّل ومدرج في جدول الإرسال الآلي" : "الموعد متوقف مؤقتاً"}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 self-end sm:self-center">
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            enabled
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
              : "bg-slate-800 text-slate-400 border border-white/5 hover:bg-slate-700"
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          <span>{enabled ? "نشط" : "معطل"}</span>
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
          title="حذف الموعد"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
