import type { ParsedVoiceCommand, ShopCategory } from "./types";
import { parseVoiceCommand as parseLocalVoiceCommand } from "./voiceParser";

export async function parseVoiceCommandWithAI(text: string, category: ShopCategory) {
  try {
    const response = await fetch("/api/parseVoiceCommand", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, category }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string; details?: string } | null;
      throw new Error(payload?.details || payload?.error || `AI API failed with ${response.status}`);
    }

    const command = (await response.json()) as ParsedVoiceCommand;
    return {
      command,
      source: "ai" as const,
      error: "",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI parser unavailable.";
    return {
      command: parseLocalVoiceCommand(text),
      source: "local" as const,
      error: message,
    };
  }
}
