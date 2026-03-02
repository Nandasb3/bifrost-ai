/**
 * LLMClient - Abstraction layer for AI providers
 * Supports any OpenAI-compatible HTTP API (OpenAI, Azure OpenAI, etc.)
 * Configure via env vars: OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
 */

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface LLMOptions {
    temperature?: number
    maxTokens?: number
}

export interface LLMClient {
    complete(messages: LLMMessage[], options?: LLMOptions): Promise<string>
    completeJSON<T>(
        messages: LLMMessage[],
        options?: LLMOptions
    ): Promise<T>
}

// ============================================================
// OpenAI-Compatible HTTP Client
// ============================================================
class OpenAICompatibleClient implements LLMClient {
    private readonly apiKey: string
    private readonly baseUrl: string
    private readonly model: string

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.OPENAI_API_KEY || ''
        this.baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
        this.model = process.env.OPENAI_MODEL || 'gpt-4o'
    }

    async complete(messages: LLMMessage[], options?: LLMOptions): Promise<string> {
        if (!this.apiKey) {
            throw new Error('OPENAI_API_KEY is not configured')
        }

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                messages,
                temperature: options?.temperature ?? 0.3,
                max_tokens: options?.maxTokens ?? 4096,
            }),
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`LLM API error ${response.status}: ${error}`)
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content
        if (!content) {
            throw new Error('LLM returned empty response')
        }
        return content
    }

    async completeJSON<T>(messages: LLMMessage[], options?: LLMOptions): Promise<T> {
        if (!this.apiKey) {
            throw new Error('OPENAI_API_KEY is not configured')
        }

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                messages,
                temperature: options?.temperature ?? 0.2,
                max_tokens: options?.maxTokens ?? 6000,
                response_format: { type: 'json_object' },
            }),
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`LLM API error ${response.status}: ${error}`)
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content
        if (!content) {
            throw new Error('LLM returned empty response')
        }

        try {
            return JSON.parse(content) as T
        } catch {
            throw new Error(`LLM returned invalid JSON: ${content.slice(0, 200)}`)
        }
    }
}

// ============================================================
// Placeholder / Mock Client (for development without API key)
// ============================================================
class PlaceholderClient implements LLMClient {
    async complete(messages: LLMMessage[]): Promise<string> {
        console.warn('[LLMClient] Using placeholder — set OPENAI_API_KEY to enable real AI')
        return 'AI response placeholder. Configure OPENAI_API_KEY to enable real generation.'
    }

    async completeJSON<T>(messages: LLMMessage[]): Promise<T> {
        console.warn('[LLMClient] Using placeholder — set OPENAI_API_KEY to enable real AI')
        throw new Error('AI generation requires OPENAI_API_KEY to be configured in .env.local')
    }
}

// ============================================================
// Factory — picks real or placeholder based on env
// ============================================================
export function getLLMClient(apiKey?: string): LLMClient {
    const key = apiKey || process.env.OPENAI_API_KEY
    if (key) {
        return new OpenAICompatibleClient(key)
    }
    return new PlaceholderClient()
}

/**
 * Helper to get LLM client with user's specific API key from profile
 */
export async function getUserLLMClient(supabase: any, userId: string): Promise<LLMClient> {
    const { data } = await supabase
        .from("profiles")
        .select("openai_api_key")
        .eq("id", userId)
        .single();

    return getLLMClient(data?.openai_api_key);
}

// ============================================================
// Validated JSON generation with auto-repair
// ============================================================
import { ZodSchema } from 'zod'

export async function generateAndValidate<T>(
    client: LLMClient,
    messages: LLMMessage[],
    schema: ZodSchema<T>,
    options?: LLMOptions
): Promise<{ data: T; repaired: boolean }> {
    const raw = await client.completeJSON<unknown>(messages, options)

    const firstParse = schema.safeParse(raw)
    if (firstParse.success) {
        return { data: firstParse.data, repaired: false }
    }

    // Attempt repair
    const repairMessages: LLMMessage[] = [
        ...messages,
        {
            role: 'assistant',
            content: JSON.stringify(raw),
        },
        {
            role: 'user',
            content: `The JSON you returned failed validation. Errors:\n${firstParse.error.message}\n\nPlease return a corrected, valid JSON object only. No explanation.`,
        },
    ]

    const repaired = await client.completeJSON<unknown>(repairMessages, options)
    const secondParse = schema.safeParse(repaired)

    if (secondParse.success) {
        return { data: secondParse.data, repaired: true }
    }

    throw new Error(
        `AI output failed schema validation after repair attempt.\nErrors: ${secondParse.error.message}`
    )
}
