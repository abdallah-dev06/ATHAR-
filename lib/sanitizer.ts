/**
 * Intelligent Post Sanitizer & Beautification Engine for Athar (أَثَر)
 *
 * Automatically removes:
 * 1. All external links/URLs (http, https, t.me, bit.ly, etc.)
 * 2. Frames, decorative borders, box-drawing characters, and noisy symbols
 * 3. Any signature or footer mentioning "منصة أثر" or "Athar Hub"
 * 4. External promotional signatures and channel handles
 *
 * Normalizes and beautifies classical Arabic typography.
 */

// Regex for URLs (http, https, ftp, www, t.me, x.com, twitter.com, etc.)
const URL_REGEX =
  /(?:https?:\/\/|www\.)[^\s<>"')]+|(?:t\.me|telegram\.me|x\.com|twitter\.com)\/[a-zA-Z0-9_+/]+/gi;

// Promotional prefixes or lines often preceding links or channel handles
const PROMOTIONAL_PREFIXES = [
  /^(?:للمزيد|تابعونا|للاشتراك|انضم(?:وا)?(?:\s+إلينا)?|قناتنا(?:\s+على\s+التلجرام|\s+على\s+تليجرام)?|رابط\s+(?:القناة|المجموعة|الحساب|الموقع)|موقعنا|حسابنا|تويتر|المصدر|للتواصل(?:\s+والاستفسار)?|للإعلانات)[\s:：—\-–]*$/i,
  /^(?:للمزيد|تابعونا|للاشتراك|انضم(?:وا)?(?:\s+إلينا)?|قناتنا|رابط\s+(?:القناة|المجموعة))[\s:：—\-–]+(?:على|في)?\s*$/i,
  /.*(?:تابعونا|للمزيد|انضم|للاشتراك|اشترك|قناتنا|حسابنا|للتواصل|موقعنا|رابط\s+(?:القناة|المجموعة)).*(?:على|في|عبر)?[\s:：—\-–]*$/i,
  /^.*(?:للتواصل|للاستفسار|للإعلانات).*@\w+.*$/i,
];

// Box-drawing, block elements, and decorative border characters
const BORDER_CHAR_REGEX =
  /[\u2500-\u257F\u2580-\u259F\u25A0-\u25FF┈┈━━──══───〰━─═│┃┌┐└┘├┤┬┴┼╔╗╚╝╠╣╦╩╬║╒╓╕╖╘╙╛╜╞╟╡╢╤╥╧╨╪╫╭╮╯╰╱╲╳░▒▓▪▫■□▲▼◆◇◈◉◊○◌◍◎●✦✧★☆✿❀❖»«]/g;

/**
 * Checks if a line is a border / frame separator line
 */
function isBorderLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Strip all recognized border and symbol characters
  const withoutBorders = trimmed
    .replace(BORDER_CHAR_REGEX, "")
    .replace(/[-_—=~*•·#.\s]+/g, "");

  return withoutBorders.length === 0;
}

/**
 * Strips borders wrapping a line (e.g. "║ النص ║" -> "النص", "【 العنوان 】" -> "العنوان")
 */
function stripLineWrappingBorders(line: string): string {
  let cleaned = line.trim();

  // Strip leading border characters and brackets
  cleaned = cleaned.replace(
    /^[\u2500-\u257F\u2580-\u259F\u25A0-\u25FF┈┈━━──══───〰━─═│┃┌┐└┘├┤┬┴┼╔╗╚╝╠╣╦╩╬║╒╓╕╖╘╙╛╜╞╟╡╢╤╥╧╨╪╫╭╮╯╰【『［\[|║│]+\s*/g,
    ""
  );

  // Strip trailing border characters and brackets
  cleaned = cleaned.replace(
    /\s*[\u2500-\u257F\u2580-\u259F\u25A0-\u25FF┈┈━━──══───〰━─═│┃┌┐└┘├┤┬┴┼╔╗╚╝╠╣╦╩╬║╒╓╕╖╘╙╛╜╞╟╡╢╤╥╧╨╪╫╭╮╯╰】』］\]|║│]+$/g,
    ""
  );

  return cleaned.trim();
}

/**
 * Removes any signatures, footers, or mentions of "منصة أثر" or "Athar Hub"
 */
function isAtharSignatureOrFooter(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  const atharPatterns = [
    /مَنَصَّة\s*أَثَر/i,
    /منصة\s*أثر/i,
    /منصة\s*اثر/i,
    /athar\s*hub/i,
    /atharhub/i,
    /✨\s*مَنَصَّة\s*أَثَر/i,
    /—\s*المصدر:\s*(?:منصة\s*أثر|Athar Hub)/i,
  ];

  return atharPatterns.some((pattern) => pattern.test(trimmed));
}

/**
 * Checks if a line is a promotional or channel handle signature
 */
function isPromotionalOrHandleLine(line: string): boolean {
  // Strip leading bullets/symbols like •, -, *, etc.
  const coreText = line
    .replace(/^[•·\-\*—–▫▪]+\s*/g, "")
    .trim();

  if (!coreText) return false;

  // Standalone telegram username or handle
  if (/^@\w{3,}[\s]*$/i.test(coreText)) {
    return true;
  }

  // Promotional prefixes
  for (const regex of PROMOTIONAL_PREFIXES) {
    if (regex.test(coreText)) {
      return true;
    }
  }

  return false;
}

/**
 * Strips HTML anchor tags while preserving legitimate inner text
 */
function cleanHtmlAnchors(text: string): string {
  return text.replace(
    /<a\b[^>]*href=["']?([^"'>]*)["']?[^>]*>([\s\S]*?)<\/a>/gi,
    (match, href, innerText) => {
      const cleanInner = innerText
        .replace(/<\/?[^>]+(>|$)/g, "")
        .trim();

      if (
        !cleanInner ||
        URL_REGEX.test(cleanInner) ||
        cleanInner.startsWith("@") ||
        isPromotionalOrHandleLine(cleanInner)
      ) {
        return "";
      }

      return cleanInner;
    }
  );
}

/**
 * Removes layout tags like <div>, <p>, <span> while keeping Telegram-supported styling
 */
function cleanNonTelegramHtmlTags(text: string): string {
  return text
    .replace(/<\/?(?:div|p|section|article|font|header|footer)[^>]*>/gi, "\n")
    .replace(/<span\s*(?!class=["']tg-spoiler["'])[^>]*>/gi, "")
    .replace(/<\/span>/gi, "");
}

/**
 * Core Sanitizer: Takes raw incoming/draft post text and returns clean, elegant, link-free text
 */
export function sanitizePostContent(rawText: string): string {
  if (!rawText) return "";

  // 1. Convert <br> tags to standard newlines
  let text = rawText.replace(/<br\s*\/?>/gi, "\n");

  // 2. Clean HTML anchor tags and layout containers
  text = cleanHtmlAnchors(text);
  text = cleanNonTelegramHtmlTags(text);

  // 3. Remove all remaining direct URLs
  text = text.replace(URL_REGEX, "");

  // 4. Split into lines and process each line
  const lines = text.split(/\r?\n/);
  const cleanedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Remove any trailing or leading border wrapping around the line
    line = stripLineWrappingBorders(line);

    // Filter out border lines
    if (isBorderLine(line)) {
      continue;
    }

    // Filter out "منصة أثر" or "Athar Hub" lines
    if (isAtharSignatureOrFooter(line)) {
      continue;
    }

    // Filter out promotional or handle lines
    if (isPromotionalOrHandleLine(line)) {
      continue;
    }

    // Clean empty brackets left behind after URL removal, e.g. "()", "[]", "{}"
    line = line
      .replace(/\(\s*\)/g, "")
      .replace(/\[\s*\]/g, "")
      .replace(/\{\s*\}/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Re-check after bracket/URL cleanup: if it became a promotional label ending with colon
    if (isPromotionalOrHandleLine(line)) {
      continue;
    }

    // If line became an orphan bullet/dash, skip it
    if (/^[•·\-\*—–:▫▪]+$/.test(line)) {
      continue;
    }

    cleanedLines.push(line);
  }

  // 5. Join lines and normalize excessive blank lines
  let result = cleanedLines.join("\n");

  // Collapse 3 or more consecutive newlines into 2 (one blank line between paragraphs)
  result = result.replace(/\n{3,}/g, "\n\n");

  // Trim leading and trailing whitespace
  result = result.trim();

  // If the result ends with an orphan source tag (e.g. "— المصدر:"), clean it
  result = result.replace(/\n*—\s*<b>المصدر:<\/b>\s*<i><\/i>\s*$/gi, "");
  result = result.replace(/\n*—\s*المصدر:\s*$/gi, "");

  return result.trim();
}
