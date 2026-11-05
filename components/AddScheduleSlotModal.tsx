"use client";

import { useState } from "react";
import { X, Clock, Plus } from "lucide-react";
import { addScheduleSlotAction } from "@/app/actions";
import { ChannelTarget, SourceType } from "@prisma/client";

interface AddScheduleSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddScheduleSlotModal({
  isOpen,
  onClose,
  onSuccess,
}: AddScheduleSlotModalProps) {
  const [timeSlot, setTimeSlot] = useState("05:00");
  const [contentType, setContentType] = useState<string>("ANY");
  const [targetChannel, setTargetChannel] = useState<ChannelTarget>(ChannelTarget.BOTH);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeSlot) return;

    setLoading(true);
    try {
      const res = await addScheduleSlotAction({
        timeSlot,
        contentType: contentType === "ANY" ? null : (contentType as SourceType),
        targetChannel,
        enabled: true,
      });

      if (res.success) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-modal rounded-3xl w-full max-w-md p-6 shadow-2xl border border-white/10 relative">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">إضافة موعد نشر يومي</h2>
              <p className="text-xs text-slate-400">
                برمجة وقت محدد للبث الآلي الدوري
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              وقت الإرسال اليومي (توقيت مكة المكرمة 24 ساعة):
            </label>
            <input
              type="time"
              required
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-base font-mono text-center text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              نوع المحتوى المفضل لهذا الموعد:
            </label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="ANY">أي محتوى معتمد متاح في الطابور</option>
              <option value="QURAN_API">تلاوة قرآنية صوتية (MP3)</option>
              <option value="POETRY_COLLECTION">روائع الشعر العربي والحكم</option>
              <option value="TELEGRAM_CHANNEL">مقتطفات قنوات التلجرام</option>
              <option value="TWITTER_ACCOUNT">تغريدات منصة X</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              القناة المستهدفة:
            </label>
            <select
              value={targetChannel}
              onChange={(e) => setTargetChannel(e.target.value as ChannelTarget)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="BOTH">كلتا القناتين (@natharat06 + @nasmat1448)</option>
              <option value="NATHARAT">قناة نَـظَـرَات (@natharat06)</option>
              <option value="NASMAT">قناة نَسَمَات (@nasmat1448)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-500 hover:bg-purple-400 text-slate-950 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
            >
              {loading ? "جاري الإضافة..." : "حفظ الموعد في الجدول"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
