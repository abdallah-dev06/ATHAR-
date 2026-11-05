"use client";

import { useState } from "react";
import { X, Plus, Radio, Send, BookOpen, Scroll, Hash } from "lucide-react";
import { addSourceAction } from "@/app/actions";
import { ChannelTarget, SourceType } from "@prisma/client";

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSourceModal({
  isOpen,
  onClose,
  onSuccess,
}: AddSourceModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<SourceType>(SourceType.TELEGRAM_CHANNEL);
  const [handleOrUrl, setHandleOrUrl] = useState("");
  const [targetChannel, setTargetChannel] = useState<ChannelTarget>(ChannelTarget.BOTH);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !handleOrUrl.trim()) return;

    setLoading(true);
    try {
      const res = await addSourceAction({
        name,
        type,
        handleOrUrl,
        targetChannel,
      });

      if (res.success) {
        onSuccess();
        onClose();
        setName("");
        setHandleOrUrl("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholder = () => {
    switch (type) {
      case "TELEGRAM_CHANNEL":
        return "@channel_name أو https://t.me/channel_name";
      case "TWITTER_ACCOUNT":
        return "@handle أو username";
      case "QURAN_API":
        return "https://api.alquran.cloud/v1";
      case "POETRY_COLLECTION":
        return "classical_arabic_poetry";
      default:
        return "اسم المعرف أو الرابط";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-modal rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-white/10 relative">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">إضافة مصدر محتوى جديد</h2>
              <p className="text-xs text-slate-400">
                تتبع قنوات تليجرام أو حسابات تويتر أو واجهات برمجية
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
              اسم المصدر (لتمييزه في لوحة التحكم):
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: قناة جواهر الأدب والفكر"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              نوع المصدر:
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as SourceType)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="TELEGRAM_CHANNEL">قناة تليجرام عامة (Telegram Public Channel)</option>
              <option value="TWITTER_ACCOUNT">حساب منصة X / تويتر (Twitter Feed)</option>
              <option value="QURAN_API">بوابة التلاوات القرآنية الصوتية (Quran Cloud API)</option>
              <option value="POETRY_COLLECTION">موسوعة الشعر العربي والحكم الأصيلة</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              المعرّف أو الرابط:
            </label>
            <input
              type="text"
              required
              dir="ltr"
              value={handleOrUrl}
              onChange={(e) => setHandleOrUrl(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              القناة المستهدفة لبث محتويات هذا المصدر:
            </label>
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
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50"
            >
              {loading ? "جاري الإضافة..." : "إضافة المصدر وتفعيله"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
