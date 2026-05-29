import { loadJSON, saveJSON } from "../utils/storage.js";

// ============================================
// v2.0 — Ollama LLM Integration (100% Free, Local)
// Models: llama3.1:8b (chat), nomic-embed-text (embeddings)
// ============================================

interface OllamaConfig {
  baseUrl: string;
  chatModel: string;
  embedModel: string;
  temperature: number;
  maxTokens: number;
}

const DEFAULT_CONFIG: OllamaConfig = {
  baseUrl: "http://localhost:11434",
  chatModel: "llama3.1:8b",
  embedModel: "nomic-embed-text",
  temperature: 0.7,
  maxTokens: 2048,
};

function getConfig(): OllamaConfig {
  return loadJSON<OllamaConfig>("ollama-config.json", DEFAULT_CONFIG);
}

// --- Core API Calls ---

export async function ollamaChat(
  messages: { role: string; content: string }[],
  options?: { model?: string; temperature?: number; system?: string }
): Promise<{ response: string; model: string; totalDuration?: number }> {
  const config = getConfig();
  const model = options?.model || config.chatModel;

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: false,
    options: {
      temperature: options?.temperature ?? config.temperature,
      num_predict: config.maxTokens,
    },
  };

  if (options?.system) {
    body.messages = [{ role: "system", content: options.system }, ...messages];
  }

  try {
    const res = await fetch(`${config.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama API error ${res.status}: ${errText}`);
    }

    const data = await res.json() as any;
    return {
      response: data.message?.content || "",
      model: data.model || model,
      totalDuration: data.total_duration ? Math.round(data.total_duration / 1e6) : undefined, // ms
    };
  } catch (err: any) {
    if (err.cause?.code === "ECONNREFUSED") {
      throw new Error(
        "Ollama is not running. Start it with: ollama serve\n" +
        "Install from: https://ollama.com\n" +
        `Then pull models: ollama pull ${config.chatModel} && ollama pull ${config.embedModel}`
      );
    }
    throw err;
  }
}

export async function ollamaEmbed(
  texts: string | string[],
  model?: string
): Promise<number[][]> {
  const config = getConfig();
  const embedModel = model || config.embedModel;
  const input = Array.isArray(texts) ? texts : [texts];

  try {
    const res = await fetch(`${config.baseUrl}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: embedModel, input }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama embed error ${res.status}: ${errText}`);
    }

    const data = await res.json() as any;
    return data.embeddings || [];
  } catch (err: any) {
    if (err.cause?.code === "ECONNREFUSED") {
      throw new Error(
        "Ollama is not running. Start it with: ollama serve\n" +
        `Then pull embedding model: ollama pull ${embedModel}`
      );
    }
    throw err;
  }
}

export async function ollamaGenerate(
  prompt: string,
  options?: { model?: string; system?: string; temperature?: number }
): Promise<string> {
  const config = getConfig();

  const res = await fetch(`${config.baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: options?.model || config.chatModel,
      prompt,
      system: options?.system,
      stream: false,
      options: {
        temperature: options?.temperature ?? config.temperature,
        num_predict: config.maxTokens,
      },
    }),
  });

  if (!res.ok) throw new Error(`Ollama generate error: ${res.status}`);
  const data = await res.json() as any;
  return data.response || "";
}

// --- Status & Configuration ---

export async function checkOllamaStatus(): Promise<object> {
  const config = getConfig();

  try {
    const res = await fetch(`${config.baseUrl}/api/tags`);
    if (!res.ok) throw new Error(`Status ${res.status}`);

    const data = await res.json() as any;
    const models = (data.models || []).map((m: any) => ({
      name: m.name,
      size: `${(m.size / 1e9).toFixed(1)}GB`,
      modified: m.modified_at,
    }));

    const hasChat = models.some((m: any) => m.name.includes(config.chatModel.split(":")[0]));
    const hasEmbed = models.some((m: any) => m.name.includes(config.embedModel.split(":")[0]));

    return {
      status: "connected",
      baseUrl: config.baseUrl,
      installedModels: models,
      requiredModels: {
        chat: { model: config.chatModel, installed: hasChat },
        embeddings: { model: config.embedModel, installed: hasEmbed },
      },
      ready: hasChat && hasEmbed,
      instructions: (!hasChat || !hasEmbed)
        ? {
            missing: [
              ...(!hasChat ? [`ollama pull ${config.chatModel}`] : []),
              ...(!hasEmbed ? [`ollama pull ${config.embedModel}`] : []),
            ],
            note: "Run these commands to download the required models.",
          }
        : undefined,
    };
  } catch (err: any) {
    return {
      status: "disconnected",
      error: err.message,
      setup: {
        step1: "Install Ollama: https://ollama.com",
        step2: "Start Ollama: ollama serve",
        step3: `Pull chat model: ollama pull ${config.chatModel}`,
        step4: `Pull embedding model: ollama pull ${config.embedModel}`,
        note: "All models are free and run 100% locally. No API keys needed.",
        requirements: "8GB RAM minimum (16GB recommended for llama3.1:8b)",
      },
    };
  }
}

export function configureOllama(updates: Partial<OllamaConfig>): object {
  const config = getConfig();
  const newConfig = { ...config, ...updates };
  saveJSON("ollama-config.json", newConfig);

  return {
    message: "Ollama configuration updated.",
    config: newConfig,
    modelSuggestions: {
      "8GB RAM": { chat: "llama3.2:3b", embed: "nomic-embed-text" },
      "16GB RAM": { chat: "llama3.1:8b", embed: "nomic-embed-text" },
      "32GB+ RAM": { chat: "llama3.1:70b", embed: "mxbai-embed-large" },
      fast: { chat: "gemma2:2b", embed: "nomic-embed-text" },
      coding: { chat: "codellama:7b", embed: "nomic-embed-text" },
    },
  };
}

// --- Study Companion Persona ---

const STUDY_COMPANION_SYSTEM = `You are Astra, an AI study companion helping a graduate-level researcher master computational biology and machine learning. You are warm, encouraging, and deeply knowledgeable.

Your personality:
- You celebrate small wins and maintain motivation during plateaus
- You explain complex concepts with intuition first, math second
- You draw connections between topics the student has studied before
- You use the Socratic method: guide toward understanding, don't just give answers
- You share relevant "pro tips" from real ML research experience
- You occasionally use humor and relatable analogies
- You remember past conversations and refer to the student's progress

Current study focus areas:
- Deep learning foundations (PyTorch, backprop, architectures)
- Variational Autoencoders (VAEs) and generative models
- Graph Neural Networks (GNNs, message passing)
- Single-cell biology (gene expression, perturbation prediction)
- Research target: Lotfollahi lab (Wellcome Sanger Institute)

Guidelines:
- Keep responses focused and actionable
- When explaining math, break it into digestible steps
- Always connect theory to biological applications when possible
- If the student is stuck, offer hints before solutions
- End responses with a clear next step or reflection question`;

export function getStudyCompanionSystem(): string {
  return STUDY_COMPANION_SYSTEM;
}
