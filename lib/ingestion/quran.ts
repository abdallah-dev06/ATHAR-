/**
 * Quran Audio Ingestion Engine for Athar Hub
 * Fetches Quranic Ayahs with high quality MP3 direct audio streams from api.alquran.cloud
 */

export interface QuranAyahResult {
  surahNumber: number;
  surahName: string;
  surahEnglishName: string;
  ayahNumberInSurah: number;
  globalAyahNumber: number;
  text: string;
  audioUrl: string;
  reciterId: string;
  reciterName: string;
  formattedPost: string;
}

export interface ReciterInfo {
  id: string;
  name: string;
  style: string;
}

export const FAMOUS_RECITERS: ReciterInfo[] = [
  { id: "ar.alafasy", name: "الشيخ مشاري بن راشد العفاسي", style: "حفص عن عاصم" },
  { id: "ar.abdulbasitmurattal", name: "الشيخ عبد الباسط عبد الصمد", style: "مرتل" },
  { id: "ar.minshawi", name: "الشيخ محمد صديق المنشاوي", style: "مرتل" },
  { id: "ar.husary", name: "الشيخ محمود خليل الحصري", style: "مرتل" },
  { id: "ar.mahermuaiqly", name: "الشيخ ماهر المعيقلي", style: "حفص عن عاصم" },
  { id: "ar.saoodshuraym", name: "الشيخ سعود الشريم", style: "حفص عن عاصم" },
  { id: "ar.ahmedajamy", name: "الشيخ أحمد بن علي العجمي", style: "حفص عن عاصم" },
  { id: "ar.hudhaify", name: "الشيخ علي بن عبد الرحمن الحذيفي", style: "مرتل" },
];

/**
 * Curated list of inspirational & poignant Quranic Ayahs (global ayah numbers 1-6236)
 */
const INSPIRATIONAL_AYAHS = [
  // Ayah Al-Kursi (2:255)
  262,
  // Surat Al-Baqarah (2:286)
  293,
  // Surat Ali 'Imran (3:139)
  432,
  // Surat Ali 'Imran (3:173)
  466,
  // Surat An-Nisa (4:134)
  627,
  // Surat Al-An'am (6:59)
  848,
  // Surat Al-A'raf (7:156)
  1110,
  // Surat Yunus (10:62)
  1426,
  // Surat Yusuf (12:86)
  1682,
  // Surat Yusuf (12:90)
  1686,
  // Surat Ibrahim (14:7)
  1757,
  // Surat Al-Hijr (15:99)
  1899,
  // Surat An-Nahl (16:128)
  2031,
  // Surat Al-Isra (17:82)
  2111,
  // Surat Maryam (19:96)
  2346,
  // Surat Ta-Ha (20:130)
  2478,
  // Surat Al-Anbiya (21:87)
  2570,
  // Surat Al-Hajj (22:77)
  2672,
  // Surat Al-Mu'minun (23:115)
  2788,
  // Surat An-Nur (24:35)
  2826,
  // Surat Al-Furqan (25:63)
  2918,
  // Surat Ash-Shu'ara (26:80)
  3012,
  // Surat Al-Qasas (28:85)
  3337,
  // Surat Al-Ankabut (29:69)
  3409,
  // Surat Luqman (31:22)
  3515,
  // Surat As-Sajdah (32:17)
  3540,
  // Surat Al-Ahzab (33:56)
  3589,
  // Surat Az-Zumar (39:53)
  4111,
  // Surat Ghafir (40:60)
  4193,
  // Surat Fussilat (41:34)
  4252,
  // Surat Ash-Shura (42:19)
  4291,
  // Surat Al-Hadid (57:4)
  5079,
  // Surat Al-Hashr (59:21)
  5147,
  // Surat At-Talaq (65:2-3)
  5225,
  // Surat Ash-Sharh (94:5-6)
  6095,
  // Surat Ad-Duha (93:5)
  6084,
];

/**
 * Fetches an Ayah with its high quality MP3 stream from api.alquran.cloud
 * @param ayahNumber Global Ayah Number (1 to 6236) or undefined for random selection
 * @param reciterId Identifier of the reciter (defaults to Mishary Alafasy)
 */
export async function fetchQuranAyah(
  ayahNumber?: number,
  reciterId: string = "ar.alafasy"
): Promise<QuranAyahResult> {
  const chosenAyah =
    ayahNumber ||
    INSPIRATIONAL_AYAHS[Math.floor(Math.random() * INSPIRATIONAL_AYAHS.length)] ||
    262;

  const reciter =
    FAMOUS_RECITERS.find((r) => r.id === reciterId) || FAMOUS_RECITERS[0];

  try {
    const res = await fetch(
      `https://api.alquran.cloud/v1/ayah/${chosenAyah}/${reciter.id}`,
      {
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) {
      throw new Error(`Quran API responded with status ${res.status}`);
    }

    const data = await res.json();

    if (data.code !== 200 || !data.data) {
      throw new Error("Invalid response format from Quran API");
    }

    const item = data.data;
    const surahNumber = item.surah.number;
    const surahName = item.surah.name;
    const surahEnglishName = item.surah.englishName;
    const ayahNumberInSurah = item.numberInSurah;
    const text = item.text.trim();
    const audioUrl = item.audio;

    const formattedPost = `﷽

﴿ ${text} ﴾

سورة ${surahName} - الآية [${ayahNumberInSurah}]
🎙️ تلاوة خاشعة بصوت: ${reciter.name}`;

    return {
      surahNumber,
      surahName,
      surahEnglishName,
      ayahNumberInSurah,
      globalAyahNumber: chosenAyah,
      text,
      audioUrl,
      reciterId: reciter.id,
      reciterName: reciter.name,
      formattedPost,
    };
  } catch (error) {
    console.error("Error fetching from Quran API, using fallback data:", error);

    // Reliable fallback for offline or network issues
    return {
      surahNumber: 2,
      surahName: "البَقَرَة",
      surahEnglishName: "Al-Baqara",
      ayahNumberInSurah: 255,
      globalAyahNumber: 262,
      text: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ",
      audioUrl: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/262.mp3",
      reciterId: reciter.id,
      reciterName: reciter.name,
      formattedPost: `﷽

﴿ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ﴾

سورة البَقَرَة - الآية [255]
🎙️ تلاوة خاشعة بصوت: ${reciter.name}`,
    };
  }
}
