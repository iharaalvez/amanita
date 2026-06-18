import { NextResponse } from "next/server";
import {
  appendOrderingAssistEvent,
  getOrderingAssistEventsAfter,
  type OrderingAssistDetection,
  type OrderingAssistIncomingEvent,
} from "@/lib/orderingAssist";

const EVENT_TYPES = new Set([
  "detected",
  "confirm-current",
  "mark-ordered",
  "clear",
  "pause-changed",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseIncomingEvent(value: unknown): OrderingAssistIncomingEvent | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;
  if (!EVENT_TYPES.has(value.type)) return null;

  const detection: OrderingAssistDetection | null = isRecord(value.detection)
    ? {
        name:
          typeof value.detection.name === "string"
            ? value.detection.name
            : "",
        confidence:
          typeof value.detection.confidence === "number"
            ? value.detection.confidence
            : 0,
        source: value.detection.source === "ocr" ? "ocr" : "mock",
        rawText:
          typeof value.detection.rawText === "string"
            ? value.detection.rawText
            : null,
        isShiny:
          typeof value.detection.isShiny === "boolean"
            ? value.detection.isShiny
            : null,
        gender:
          value.detection.gender === "male" ||
          value.detection.gender === "female"
            ? value.detection.gender
            : null,
      }
    : null;

  return {
    type: value.type as OrderingAssistIncomingEvent["type"],
    detection: detection?.name ? detection : null,
    paused: typeof value.paused === "boolean" ? value.paused : null,
    createdAt:
      typeof value.createdAt === "string" ? value.createdAt : undefined,
  };
}

export async function POST(request: Request) {
  const parsed = parseIncomingEvent(await request.json().catch(() => null));
  if (!parsed) {
    return NextResponse.json({ error: "Invalid assist event." }, { status: 400 });
  }

  const event = appendOrderingAssistEvent(parsed);
  return NextResponse.json({ event });
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const after = Number(url.searchParams.get("after") ?? "0");
  const events = getOrderingAssistEventsAfter(Number.isFinite(after) ? after : 0);
  return NextResponse.json({ events });
}
