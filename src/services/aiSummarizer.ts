// AI summarizer service — calls OpenRouter's free small model for page summaries

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = "mistralai/mistral-7b-instruct:free"

export interface SummaryResult {
  summary: string
  model: string
}

/**
 * Summarize the given page text using a free OpenRouter model.
 * Returns a concise summary in plain text.
 */
export async function summarizePage(
  title: string,
  plainText: string,
): Promise<SummaryResult> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error(
      "OpenRouter API key is not configured. Set VITE_OPENROUTER_API_KEY in .env",
    )
  }

  // Truncate text to avoid hitting token limits on small models
  const maxChars = 8000
  const truncated =
    plainText.length > maxChars
      ? plainText.slice(0, maxChars) + "\n\n[...content truncated]"
      : plainText

  const prompt = `Summarize the following Wikipedia article in 3-5 concise bullet points. Focus on the most important facts and key takeaways.

Article title: ${title}

Content:
${truncated}

Summary (3-5 bullet points):`

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "AskWiki",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error")
    throw new Error(
      `OpenRouter API error (${response.status}): ${errorBody}`,
    )
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content

  if (!content) {
    throw new Error("OpenRouter returned an empty response")
  }

  return {
    summary: content.trim(),
    model: data?.model ?? MODEL,
  }
}
