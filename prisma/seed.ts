import { PrismaClient, SourceType, ChannelTarget, PostStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Athar Hub initial data...");

  // 1. Seed Default Sources
  const quranSource = await prisma.source.upsert({
    where: { id: "source-quran-default" },
    update: {},
    create: {
      id: "source-quran-default",
      name: "بوابة التلاوات القرآنية العطرة (API)",
      type: SourceType.QURAN_API,
      handleOrUrl: "https://api.alquran.cloud/v1",
      targetChannel: ChannelTarget.BOTH,
      active: true,
    },
  });

  const poetrySource = await prisma.source.upsert({
    where: { id: "source-poetry-default" },
    update: {},
    create: {
      id: "source-poetry-default",
      name: "موسوعة روائع الشعر العربي والحكم",
      type: SourceType.POETRY_COLLECTION,
      handleOrUrl: "classical_arabic_poetry",
      targetChannel: ChannelTarget.NASMAT,
      active: true,
    },
  });

  const tgNatharatSource = await prisma.source.upsert({
    where: { id: "source-tg-natharat" },
    update: {},
    create: {
      id: "source-tg-natharat",
      name: "قناة نَـظَـرَات (@natharat06)",
      type: SourceType.TELEGRAM_CHANNEL,
      handleOrUrl: "@natharat06",
      targetChannel: ChannelTarget.NATHARAT,
      active: true,
    },
  });

  const tgNasmatSource = await prisma.source.upsert({
    where: { id: "source-tg-nasmat" },
    update: {},
    create: {
      id: "source-tg-nasmat",
      name: "قناة نَسَمَات دَعَوِيَّة (@nasmat1448)",
      type: SourceType.TELEGRAM_CHANNEL,
      handleOrUrl: "@nasmat1448",
      targetChannel: ChannelTarget.NASMAT,
      active: true,
    },
  });

  const xSource = await prisma.source.upsert({
    where: { id: "source-x-adab" },
    update: {},
    create: {
      id: "source-x-adab",
      name: "حساب روائع الأدب والحكمة (منصة X)",
      type: SourceType.TWITTER_ACCOUNT,
      handleOrUrl: "ArabicLiterature",
      targetChannel: ChannelTarget.BOTH,
      active: true,
    },
  });

  // 2. Seed Default Daily Schedule Slots
  const slots = [
    {
      id: "slot-fajr-0500",
      timeSlot: "05:00",
      contentType: SourceType.QURAN_API,
      targetChannel: ChannelTarget.BOTH,
      enabled: true,
    },
    {
      id: "slot-duha-1000",
      timeSlot: "10:00",
      contentType: SourceType.TELEGRAM_CHANNEL,
      targetChannel: ChannelTarget.NATHARAT,
      enabled: true,
    },
    {
      id: "slot-asr-1630",
      timeSlot: "16:30",
      contentType: SourceType.POETRY_COLLECTION,
      targetChannel: ChannelTarget.NASMAT,
      enabled: true,
    },
    {
      id: "slot-night-2130",
      timeSlot: "21:30",
      contentType: SourceType.QURAN_API,
      targetChannel: ChannelTarget.BOTH,
      enabled: true,
    },
  ];

  for (const s of slots) {
    await prisma.scheduleSlot.upsert({
      where: { id: s.id },
      update: {},
      create: s,
    });
  }

  // 3. Seed Initial Sample Posts in APPROVED & DRAFT states
  const samplePosts = [
    {
      id: "post-sample-quran-1",
      content: `﷽\n\n﴿ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ﴾\n\nسورة البَقَرَة - الآية [255]\n🎙️ تلاوة خاشعة بصوت: الشيخ مشاري بن راشد العفاسي`,
      mediaUrl: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/262.mp3",
      isAudio: true,
      audioTitle: "سورة البقرة - آية الكرسي",
      audioPerformer: "مشاري راشد العفاسي",
      status: PostStatus.APPROVED,
      targetChannel: ChannelTarget.BOTH,
      sourceId: quranSource.id,
    },
    {
      id: "post-sample-poetry-1",
      content: `📜 <b>من روائع المتنبي في العزم والشرف:</b>\n\nعَـلَى قَـدْرِ أَهـلِ العَـزمِ تَأتِي العَزائِمُ\nوتَـأتِي عَـلَى قَـدْرِ الكِـرامِ المَكـارِمُ\n\nوتَعظُـمُ فـي عَيـنِ الصّغِـيرِ صِغارُها\nوتَصغُـر فـي عَيـنِ العَظِيـمِ العَظائِمُ\n\n— <i>أبو الطيب المتنبي</i>`,
      isAudio: false,
      status: PostStatus.APPROVED,
      targetChannel: ChannelTarget.NASMAT,
      sourceId: poetrySource.id,
    },
    {
      id: "post-sample-tg-1",
      content: `🍃 «إذا أردتَ أن تدومَ لكَ النِّعمة؛ فاحفظها بدوامِ الشُّكر، وإذا أردتَ أن يزولَ عنكَ البلاء؛ فاستقبلهُ بجميلِ الصَّبر وحسن الظن برب العالمين.»`,
      isAudio: false,
      status: PostStatus.DRAFT,
      targetChannel: ChannelTarget.NATHARAT,
      sourceId: tgNatharatSource.id,
    },
  ];

  for (const p of samplePosts) {
    await prisma.post.upsert({
      where: { id: p.id },
      update: {},
      create: p,
    });
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
