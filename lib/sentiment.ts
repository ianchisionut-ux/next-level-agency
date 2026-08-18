/**
 * Clasificator simplu de sentiment (pozitiv/neutru/negativ), bazat pe
 * cuvinte-cheie și emoji, română + engleză. Nu folosește niciun API extern
 * de AI - rulează instant, gratuit, direct pe server.
 *
 * Nu e la fel de precis ca un model de NLP antrenat, dar oferă un semnal
 * util și rapid pentru "temperatura" generală a comentariilor de sub o
 * postare, fără costuri suplimentare sau latență.
 */

const POSITIVE_WORDS = [
  // română
  "super", "excelent", "minunat", "genial", "perfect", "bravo", "felicitari",
  "felicitări", "iubesc", "adorabil", "frumos", "frumoasa", "frumoasă",
  "misto", "tare", "fain", "faina", "fantastic", "uau", "wow", "multumesc",
  "mulțumesc", "recomand", "top", "cel mai bun", "cea mai buna", "senzational",
  "senzațional", "impresionant", "😍", "❤️", "🔥", "👏", "😻", "🥰", "💯",
  // engleză
  "amazing", "awesome", "great", "love", "perfect", "excellent", "best",
  "fantastic", "beautiful", "incredible", "wonderful", "nice",
];

const NEGATIVE_WORDS = [
  // română
  "prost", "urat", "urât", "dezamagit", "dezamăgit", "dezamagire",
  "dezamăgire", "rusine", "rușine", "jale", "vai", "groaznic", "oribil",
  "scump", "teapa", "țeapă", "fraier", "fraieri", "reclamatie", "reclamație",
  "plangere", "plângere", "nasol", "nasoala", "nasoală", "dezastru", "😡",
  "😠", "👎", "🤮", "😤", "💩",
  // engleză
  "bad", "worst", "terrible", "awful", "hate", "scam", "disappointed",
  "horrible", "waste", "poor", "never again",
];

export type SentimentLabel = "positive" | "neutral" | "negative";

export function classifySentiment(text: string): SentimentLabel {
  const normalized = text.toLowerCase();

  let positiveHits = 0;
  let negativeHits = 0;

  for (const word of POSITIVE_WORDS) {
    if (normalized.includes(word)) positiveHits++;
  }
  for (const word of NEGATIVE_WORDS) {
    if (normalized.includes(word)) negativeHits++;
  }

  if (positiveHits === 0 && negativeHits === 0) return "neutral";
  if (positiveHits > negativeHits) return "positive";
  if (negativeHits > positiveHits) return "negative";
  return "neutral";
}

export function classifyComments(comments: string[]): {
  positive: number;
  neutral: number;
  negative: number;
} {
  const result = { positive: 0, neutral: 0, negative: 0 };
  for (const comment of comments) {
    const label = classifySentiment(comment);
    result[label]++;
  }
  return result;
}
