"use client";

import { useState } from "react";
import { X, Sparkles, BookOpen, Scroll, Send, Check } from "lucide-react";
import { createManualPostAction } from "@/app/actions";
import { fetchQuranAyah } from "@/lib/ingestion/quran";
import { getRandomPoetryPiece } from "@/lib/ingestion/poetry";
import { ChannelTarget, PostStatus } from "@prisma/client";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePostModal({
  isOpen,
  onClose,
  onSuccess,
}: CreatePostModalProps) {
  const [content, setContent] = useState("");
  const [targetChannel, setTargetChannel] = useState<ChannelTarget>(ChannelTarget.BOTH);
  const [status, setStatus] = useState<PostStatus>(PostStatus.APPROVED);
  const [isAudio, setIsAudio] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const [audioTitle, setAudioTitle] = useState("");
  const [audioPerformer, setAudioPerformer] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      const res = await createManualPostAction({
        content,
        targetChannel,
        status,
        isAudio,
        mediaUrl: isAudio ? mediaUrl : undefined,
        audioTitle: isAudio ? audioTitle : undefined,
        audioPerformer: isAudio ? audioPerformer : undefined,
      });

      if (res.success) {
        onSuccess();
        onClose();
        setContent("");
        setMediaUrl("");
        setAudioTitle("");
        setAudioPerformer("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuran = async () => {
    setGenerating(true);
    try {
      const quran = await fetchQuranAyah();
      setContent(quran.formattedPost);
      setIsAudio(true);
      setMediaUrl(quran.audioUrl);
      setAudioTitle(`سورة ${quran.surahName} [${quran.ayahNumberInSurah}]`);
      setAudioPerformer(quran.reciterName);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleGeneratePoetry = () => {
    const poem = getRandomPoetryPiece();
    setContent(poem.formattedText);
    setIsAudio(false);
    setMediaUrl("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-modal rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-white/10 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">صياغة منشور جديد</h2>
              <p className="text-xs text-slate-400">
                إضافة محتوى يدوي أو توليد تلاوة وأبيات شعرية فوراً
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

        {/* Quick Generation Accelerators */}
        <div className="flex flex-wrap items-center gap-2 mb-5 p-3 bg-slate-900/60 rounded-2xl border border-white/5">
          <span className="text-xs text-slate-400 ml-1">توليد تلقائي فوري:</span>
          <button
            type="button"
            onClick={handleGenerateQuran}
            disabled={generating}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>تلاوة قرآنية عذبة + صوت</span>
          </button>

          <button
            type="button"
            onClick={handleGeneratePoetry}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-colors"
          >
            <Scroll className="w-3.5 h-3.5" />
            <span>روائع الشعر العربي</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              نص المنشور (يدعم التنسيق والرموز التعبيرية):
            </label>
            <textarea
              required
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors font-amiri leading-relaxed"
              placeholder="اكتب المحتوى أو اضغط على أحد أزرار التوليد التلقائي بالأعلى..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                القناة المستهدفة:
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

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                حالة الإدراج الأولية:
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PostStatus)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="APPROVED">طابور النشر المعتمد (جاهز للبث)</option>
                <option value="DRAFT">مسودة واردة (للمراجعة لاحقاً)</option>
              </select>
            </div>
          </div>

          {/* Audio options toggle */}
          <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
              <input
                type="checkbox"
                checked={isAudio}
                onChange={(e) => setIsAudio(e.target.checked)}
                className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
              />
              <span>تضمين ملف صوتي MP3 عبر Telegram sendAudio</span>
            </label>

            {isAudio && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    رابط ملف الصوت المباشر (Direct MP3 URL):
                  </label>
                  <input
                    type="url"
                    dir="ltr"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://example.com/audio.mp3"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      عنوان المقطع الصوتي (Title):
                    </label>
                    <input
                      type="text"
                      value={audioTitle}
                      onChange={(e) => setAudioTitle(e.target.value)}
                      placeholder="مثال: سورة الكهف كاملة"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      اسم القارئ / المؤدي (Performer):
                    </label>
                    <input
                      type="text"
                      value={audioPerformer}
                      onChange={(e) => setAudioPerformer(e.target.value)}
                      placeholder="مثال: الشيخ مشاري العفاسي"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
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
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-l from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/25 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? "جاري الحفظ..." : "حفظ وإدراج في المنصة"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
