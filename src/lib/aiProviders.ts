export type ApiMode = 'chat_completions' | 'anthropic_messages' | 'openai_responses' | 'gemini_native';

export type ThinkingPattern =
  | 'reasoning_effort'
  | 'thinking_object'
  | 'enable_thinking'
  | 'thinking_config'
  | 'budget_tokens'
  | 'adaptive'
  | 'builtin';

export type ProviderCategory = 'api' | 'mainland' | 'aggregator' | 'coding-plan' | 'custom';

export type SupportedParam =
  | 'maxTokens'
  | 'temperature'
  | 'topP'
  | 'topK'
  | 'frequencyPenalty'
  | 'presencePenalty'
  | 'repetitionPenalty'
  | 'thinkingBudget';

export interface SubOption {
  id: string;
  labelKey: string;
  options: { value: string; labelKey: string }[];
  defaultValue: string;
  affectsUrl?: boolean;
  affectsModels?: boolean;
}

export interface AiModel {
  id: string;
  displayName: string;
  contextWindow?: number;
  maxOutput?: number;
  thinkingSupport: boolean;
  thinkingPattern?: ThinkingPattern;
  thinkingLevels?: string[];
  supportedParams?: SupportedParam[];
  subOptionFilter?: Record<string, string>;
}

export interface AiProvider {
  id: string;
  displayNameKey: string;
  iconKey: string;
  baseUrl: string;
  apiMode: ApiMode;
  urlEditable: boolean;
  categories: ProviderCategory[];
  protocols?: ('openai' | 'anthropic')[];
  models: AiModel[];
  notesKey?: string;
  subOptions?: SubOption[];
  urlMap?: Record<string, string>;
}

const DEFAULT_PARAMS: SupportedParam[] = ['maxTokens', 'temperature', 'topP'];
const FULL_PARAMS: SupportedParam[] = [
  'maxTokens',
  'temperature',
  'topP',
  'topK',
  'frequencyPenalty',
  'presencePenalty',
  'repetitionPenalty',
];
const THINKING_PARAMS: SupportedParam[] = [...FULL_PARAMS, 'thinkingBudget'];

export const PROVIDERS: AiProvider[] = [
  // ─── OpenAI (Chat Completions) ────────────────────────────────────────────
  {
    id: 'openai',
    displayNameKey: 'ai.p.openai',
    iconKey: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['api'],
    models: [
      { id: 'gpt-5.5', displayName: 'GPT-5.5', contextWindow: 1_000_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'gpt-5.4', displayName: 'GPT-5.4', contextWindow: 1_000_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'gpt-5.4-mini', displayName: 'GPT-5.4 Mini', contextWindow: 1_000_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'gpt-5.4-nano', displayName: 'GPT-5.4 Nano', contextWindow: 1_000_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'gpt-5.3-codex', displayName: 'GPT-5.3 Codex', contextWindow: 1_000_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'gpt-5.2', displayName: 'GPT-5.2', contextWindow: 1_000_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
    ],
  },

  // ─── OpenAI (Responses API) ──────────────────────────────────────────────
  {
    id: 'openai-responses',
    displayNameKey: 'ai.p.openai-responses',
    iconKey: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiMode: 'openai_responses',
    urlEditable: false,
    categories: ['api'],
    models: [
      { id: 'gpt-5.5', displayName: 'GPT-5.5', contextWindow: 1_000_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'gpt-5.4', displayName: 'GPT-5.4', contextWindow: 1_000_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'gpt-5.4-mini', displayName: 'GPT-5.4 Mini', contextWindow: 1_000_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'gpt-5.4-nano', displayName: 'GPT-5.4 Nano', contextWindow: 1_000_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'gpt-5.3-codex', displayName: 'GPT-5.3 Codex', contextWindow: 1_000_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'gpt-5.2', displayName: 'GPT-5.2', contextWindow: 1_000_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
    ],
  },

  // ─── OpenAI Compatible ────────────────────────────────────────────────
  {
    id: 'openai-compatible',
    displayNameKey: 'ai.p.openai-compatible',
    iconKey: 'openai',
    baseUrl: '',
    apiMode: 'chat_completions',
    urlEditable: true,
    categories: ['api', 'custom'],
    models: [],
    notesKey: 'ai.p.notes.customUrl',
  },

  // ─── ChatGPT Plus (Coding Plan) ───────────────────────────────────────
  {
    id: 'chatgpt-plus',
    displayNameKey: 'ai.p.chatgpt-plus',
    iconKey: 'openai',
    baseUrl: 'https://chatgpt.com/backend-api/codex',
    apiMode: 'openai_responses',
    urlEditable: false,
    categories: ['coding-plan'],
    protocols: ['openai'],
    models: [],
    notesKey: 'ai.p.notes.openaiCodex',
    subOptions: [
      {
        id: 'loginMethod',
        labelKey: 'ai.sub.loginMethod',
        options: [
          { value: 'url', labelKey: 'ai.sub.loginMethod.url' },
          { value: 'device', labelKey: 'ai.sub.loginMethod.device' },
          { value: 'api', labelKey: 'ai.sub.loginMethod.api' },
        ],
        defaultValue: 'url',
        affectsUrl: false,
      },
    ],
  },

  // ─── Anthropic Claude ───────────────────────────────────────────────────
  {
    id: 'anthropic',
    displayNameKey: 'ai.p.anthropic',
    iconKey: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiMode: 'anthropic_messages',
    urlEditable: false,
    categories: ['api'],
    models: [
      {
        id: 'claude-opus-4-7',
        displayName: 'Claude Opus 4.7',
        contextWindow: 1_000_000,
        maxOutput: 64_000,
        thinkingSupport: true,
        thinkingPattern: 'adaptive',
        thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
        supportedParams: THINKING_PARAMS,
      },
      {
        id: 'claude-opus-4-6',
        displayName: 'Claude Opus 4.6',
        contextWindow: 200_000,
        maxOutput: 64_000,
        thinkingSupport: true,
        thinkingPattern: 'budget_tokens',
        thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
        supportedParams: THINKING_PARAMS,
      },
      {
        id: 'claude-opus-4-5',
        displayName: 'Claude Opus 4.5',
        contextWindow: 200_000,
        maxOutput: 64_000,
        thinkingSupport: true,
        thinkingPattern: 'budget_tokens',
        thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
        supportedParams: THINKING_PARAMS,
      },
      {
        id: 'claude-sonnet-4-6',
        displayName: 'Claude Sonnet 4.6',
        contextWindow: 200_000,
        maxOutput: 64_000,
        thinkingSupport: true,
        thinkingPattern: 'budget_tokens',
        thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
        supportedParams: THINKING_PARAMS,
      },
      {
        id: 'claude-sonnet-4-5',
        displayName: 'Claude Sonnet 4.5',
        contextWindow: 200_000,
        maxOutput: 64_000,
        thinkingSupport: true,
        thinkingPattern: 'budget_tokens',
        thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
        supportedParams: THINKING_PARAMS,
      },
      {
        id: 'claude-haiku-4-5',
        displayName: 'Claude Haiku 4.5',
        contextWindow: 200_000,
        maxOutput: 8_192,
        thinkingSupport: false,
        supportedParams: DEFAULT_PARAMS,
      },
      {
        id: 'claude-opus-4-1',
        displayName: 'Claude Opus 4.1',
        contextWindow: 200_000,
        maxOutput: 64_000,
        thinkingSupport: true,
        thinkingPattern: 'budget_tokens',
        thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
        supportedParams: THINKING_PARAMS,
      },
      {
        id: 'claude-opus-4',
        displayName: 'Claude Opus 4',
        contextWindow: 200_000,
        maxOutput: 32_000,
        thinkingSupport: true,
        thinkingPattern: 'budget_tokens',
        thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
        supportedParams: THINKING_PARAMS,
      },
      {
        id: 'claude-sonnet-4',
        displayName: 'Claude Sonnet 4',
        contextWindow: 200_000,
        maxOutput: 16_000,
        thinkingSupport: true,
        thinkingPattern: 'budget_tokens',
        thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
        supportedParams: THINKING_PARAMS,
      },
    ],
  },

  // ─── Anthropic Compatible ───────────────────────────────────────────────
  {
    id: 'anthropic-compatible',
    displayNameKey: 'ai.p.anthropic-compatible',
    iconKey: 'anthropic',
    baseUrl: '',
    apiMode: 'anthropic_messages',
    urlEditable: true,
    categories: ['api', 'custom'],
    models: [],
    notesKey: 'ai.p.notes.customUrl',
  },

  // ─── Fully Custom (完全自定义) ──────────────────────────────────────────
  {
    id: 'fully-custom',
    displayNameKey: 'ai.p.fully-custom',
    iconKey: 'custom',
    baseUrl: '',
    apiMode: 'chat_completions',
    urlEditable: true,
    categories: ['custom'],
    models: [],
    notesKey: 'ai.p.notes.fullyCustom',
    subOptions: [
      {
        id: 'apiMode',
        labelKey: 'ai.sub.apiMode',
        options: [
          { value: 'openai', labelKey: 'ai.sub.apiMode.openai' },
          { value: 'anthropic', labelKey: 'ai.sub.apiMode.anthropic' },
        ],
        defaultValue: 'openai',
        affectsUrl: false,
      },
    ],
  },

  // ─── Google Gemini ─────────────────────────────────────────────────────
  {
    id: 'gemini',
    displayNameKey: 'ai.p.gemini',
    iconKey: 'google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['api'],
    models: [
      {
        id: 'gemini-3.1-pro-preview',
        displayName: 'Gemini 3.1 Pro Preview',
        contextWindow: 1_000_000,
        thinkingSupport: true,
        thinkingPattern: 'thinking_config',
        thinkingLevels: ['low', 'medium', 'high'],
        supportedParams: THINKING_PARAMS,
      },
      {
        id: 'gemini-3.1-flash-preview',
        displayName: 'Gemini 3.1 Flash Preview',
        contextWindow: 1_000_000,
        thinkingSupport: true,
        thinkingPattern: 'thinking_config',
        thinkingLevels: ['low', 'medium', 'high'],
        supportedParams: THINKING_PARAMS,
      },
      {
        id: 'gemini-3-flash-preview',
        displayName: 'Gemini 3 Flash Preview',
        contextWindow: 1_000_000,
        thinkingSupport: true,
        thinkingPattern: 'thinking_config',
        thinkingLevels: ['low', 'medium', 'high'],
        supportedParams: THINKING_PARAMS,
      },
      {
        id: 'gemini-2.5-pro',
        displayName: 'Gemini 2.5 Pro',
        contextWindow: 1_000_000,
        thinkingSupport: true,
        thinkingPattern: 'budget_tokens',
        supportedParams: THINKING_PARAMS,
      },
      {
        id: 'gemini-2.5-flash',
        displayName: 'Gemini 2.5 Flash',
        contextWindow: 1_000_000,
        thinkingSupport: true,
        thinkingPattern: 'budget_tokens',
        supportedParams: THINKING_PARAMS,
      },
      {
        id: 'gemini-2.5-flash-lite',
        displayName: 'Gemini 2.5 Flash Lite',
        contextWindow: 1_000_000,
        thinkingSupport: true,
        thinkingPattern: 'budget_tokens',
        supportedParams: THINKING_PARAMS,
      },
    ],
  },

  // ─── Vertex AI (Google) ─────────────────────────────────────────────────
  {
    id: 'vertexai-google',
    displayNameKey: 'ai.p.vertexai-google',
    iconKey: 'vertexai',
    baseUrl: 'https://{region}-aiplatform.googleapis.com/v1/projects/{project}/locations/{region}/endpoints/openapi',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['aggregator'],
    notesKey: 'ai.p.notes.vertexai',
    models: [
      { id: 'gemini-3.1-pro-preview', displayName: 'Gemini 3.1 Pro Preview', contextWindow: 1_000_000, thinkingSupport: true, thinkingPattern: 'thinking_config', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'gemini-3.1-flash-preview', displayName: 'Gemini 3.1 Flash Preview', contextWindow: 1_000_000, thinkingSupport: true, thinkingPattern: 'thinking_config', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'gemini-3-flash-preview', displayName: 'Gemini 3 Flash Preview', contextWindow: 1_000_000, thinkingSupport: true, thinkingPattern: 'thinking_config', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', contextWindow: 1_000_000, thinkingSupport: true, thinkingPattern: 'budget_tokens', supportedParams: THINKING_PARAMS },
      { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', contextWindow: 1_000_000, thinkingSupport: true, thinkingPattern: 'budget_tokens', supportedParams: THINKING_PARAMS },
      { id: 'gemini-2.5-flash-lite', displayName: 'Gemini 2.5 Flash Lite', contextWindow: 1_000_000, thinkingSupport: true, thinkingPattern: 'budget_tokens', supportedParams: THINKING_PARAMS },
    ],
  },

  // ─── Vertex AI (Anthropic) ──────────────────────────────────────────────
  {
    id: 'vertexai-anthropic',
    displayNameKey: 'ai.p.vertexai-anthropic',
    iconKey: 'vertexai',
    baseUrl: 'https://{region}-aiplatform.googleapis.com/v1/projects/{project}/locations/{region}/endpoints/openapi',
    apiMode: 'anthropic_messages',
    urlEditable: false,
    categories: ['aggregator'],
    notesKey: 'ai.p.notes.vertexai',
    models: [
      { id: 'claude-opus-4-7', displayName: 'Claude Opus 4.7', contextWindow: 1_000_000, maxOutput: 64_000, thinkingSupport: true, thinkingPattern: 'adaptive', thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'], supportedParams: THINKING_PARAMS },
      { id: 'claude-opus-4-6', displayName: 'Claude Opus 4.6', contextWindow: 200_000, maxOutput: 64_000, thinkingSupport: true, thinkingPattern: 'budget_tokens', thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'], supportedParams: THINKING_PARAMS },
      { id: 'claude-opus-4-5', displayName: 'Claude Opus 4.5', contextWindow: 200_000, maxOutput: 64_000, thinkingSupport: true, thinkingPattern: 'budget_tokens', thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'], supportedParams: THINKING_PARAMS },
      { id: 'claude-sonnet-4-6', displayName: 'Claude Sonnet 4.6', contextWindow: 200_000, maxOutput: 64_000, thinkingSupport: true, thinkingPattern: 'budget_tokens', thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'], supportedParams: THINKING_PARAMS },
      { id: 'claude-sonnet-4-5', displayName: 'Claude Sonnet 4.5', contextWindow: 200_000, maxOutput: 64_000, thinkingSupport: true, thinkingPattern: 'budget_tokens', thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'], supportedParams: THINKING_PARAMS },
      { id: 'claude-haiku-4-5', displayName: 'Claude Haiku 4.5', contextWindow: 200_000, maxOutput: 8_192, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'claude-opus-4-1', displayName: 'Claude Opus 4.1', contextWindow: 200_000, maxOutput: 64_000, thinkingSupport: true, thinkingPattern: 'budget_tokens', thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'], supportedParams: THINKING_PARAMS },
      { id: 'claude-opus-4', displayName: 'Claude Opus 4', contextWindow: 200_000, maxOutput: 32_000, thinkingSupport: true, thinkingPattern: 'budget_tokens', thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'], supportedParams: THINKING_PARAMS },
      { id: 'claude-sonnet-4', displayName: 'Claude Sonnet 4', contextWindow: 200_000, maxOutput: 16_000, thinkingSupport: true, thinkingPattern: 'budget_tokens', thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'], supportedParams: THINKING_PARAMS },
    ],
  },

  // ─── Grok (xAI) ───────────────────────────────────────────────────────
  {
    id: 'grok',
    displayNameKey: 'ai.p.grok',
    iconKey: 'xai',
    baseUrl: 'https://api.x.ai/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['api'],
    models: [
      { id: 'grok-4', displayName: 'Grok 4', contextWindow: 131_072, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'grok-420-reasoning', displayName: 'Grok 420 Reasoning', contextWindow: 131_072, thinkingSupport: true, thinkingPattern: 'builtin', supportedParams: DEFAULT_PARAMS },
    ],
  },

  // ─── GitHub Copilot ───────────────────────────────────────────────────
  {
    id: 'github-copilot',
    displayNameKey: 'ai.p.github-copilot',
    iconKey: 'github',
    baseUrl: 'https://api.githubcopilot.com',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['aggregator'],
    protocols: ['openai'],
    models: [
      { id: 'gpt-5.5', displayName: 'GPT-5.5', contextWindow: 1_000_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'gpt-5.4', displayName: 'GPT-5.4', contextWindow: 1_000_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'gpt-5.4-mini', displayName: 'GPT-5.4 Mini', contextWindow: 1_000_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'gpt-5.4-nano', displayName: 'GPT-5.4 Nano', contextWindow: 1_000_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'gpt-5.3-codex', displayName: 'GPT-5.3 Codex', contextWindow: 1_000_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'claude-opus-4-8', displayName: 'Claude Opus 4.8', contextWindow: 200_000, thinkingSupport: true, thinkingPattern: 'adaptive', thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'], supportedParams: THINKING_PARAMS },
      { id: 'claude-opus-4-7', displayName: 'Claude Opus 4.7', contextWindow: 1_000_000, thinkingSupport: true, thinkingPattern: 'adaptive', thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'], supportedParams: THINKING_PARAMS },
      { id: 'claude-opus-4-6', displayName: 'Claude Opus 4.6', contextWindow: 200_000, thinkingSupport: true, thinkingPattern: 'budget_tokens', thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'], supportedParams: THINKING_PARAMS },
      { id: 'claude-sonnet-4-6', displayName: 'Claude Sonnet 4.6', contextWindow: 200_000, thinkingSupport: true, thinkingPattern: 'budget_tokens', thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'], supportedParams: THINKING_PARAMS },
      { id: 'claude-sonnet-4-5', displayName: 'Claude Sonnet 4.5', contextWindow: 200_000, thinkingSupport: true, thinkingPattern: 'budget_tokens', thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'], supportedParams: THINKING_PARAMS },
      { id: 'claude-haiku-4-5', displayName: 'Claude Haiku 4.5', contextWindow: 200_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', contextWindow: 1_000_000, thinkingSupport: true, thinkingPattern: 'budget_tokens', supportedParams: THINKING_PARAMS },
      { id: 'o3', displayName: 'o3', contextWindow: 200_000, thinkingSupport: true, thinkingPattern: 'builtin', supportedParams: DEFAULT_PARAMS },
      { id: 'o4-mini', displayName: 'o4-mini', contextWindow: 200_000, thinkingSupport: true, thinkingPattern: 'builtin', supportedParams: DEFAULT_PARAMS },
    ],
  },

  // ─── OpenCode Zen ─────────────────────────────────────────────────────
  {
    id: 'opencode-zen',
    displayNameKey: 'ai.p.opencode-zen',
    iconKey: 'opencode',
    baseUrl: 'https://opencode.ai/zen/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['aggregator'],
    models: [],
    notesKey: 'ai.p.notes.dynamicModels',
  },

  // ─── OpenCode Go (Coding Plan) ────────────────────────────────────────
  {
    id: 'opencode-go',
    displayNameKey: 'ai.p.opencode-go',
    iconKey: 'opencode',
    baseUrl: 'https://opencode.ai/zen/go/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['aggregator', 'coding-plan'],
    protocols: ['openai'],
    models: [],
    notesKey: 'ai.p.notes.dynamicModels',
  },

  // ─── DeepSeek ─────────────────────────────────────────────────────────
  {
    id: 'deepseek',
    displayNameKey: 'ai.p.deepseek',
    iconKey: 'deepseek',
    baseUrl: 'https://api.deepseek.com',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['api'],
    models: [
      {
        id: 'deepseek-v4-pro',
        displayName: 'DeepSeek V4 Pro',
        contextWindow: 1_000_000,
        thinkingSupport: true,
        thinkingPattern: 'thinking_object',
        thinkingLevels: ['low', 'medium', 'high', 'max'],
        supportedParams: THINKING_PARAMS,
      },
      {
        id: 'deepseek-v4-flash',
        displayName: 'DeepSeek V4 Flash',
        contextWindow: 1_000_000,
        thinkingSupport: true,
        thinkingPattern: 'thinking_object',
        thinkingLevels: ['low', 'medium', 'high', 'max'],
        supportedParams: THINKING_PARAMS,
      },
    ],
  },

  // ─── Kimi API (China) ─────────────────────────────────────────────────
  {
    id: 'kimi',
    displayNameKey: 'ai.p.kimi',
    iconKey: 'moonshot',
    baseUrl: 'https://api.moonshot.cn/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['mainland', 'api'],
    protocols: ['openai'],
    models: [
      {
        id: 'kimi-k2.6',
        displayName: 'Kimi K2.6',
        contextWindow: 256_000,
        thinkingSupport: true,
        thinkingPattern: 'thinking_object',
        thinkingLevels: ['low', 'medium', 'high'],
        supportedParams: THINKING_PARAMS,
      },
      {
        id: 'kimi-k2.5',
        displayName: 'Kimi K2.5',
        contextWindow: 256_000,
        thinkingSupport: true,
        thinkingPattern: 'thinking_object',
        thinkingLevels: ['low', 'medium', 'high'],
        supportedParams: THINKING_PARAMS,
      },
    ],
  },

  // ─── Kimi API (International) ────────────────────────────────────────
  {
    id: 'kimi-intl',
    displayNameKey: 'ai.p.kimi-intl',
    iconKey: 'moonshot',
    baseUrl: 'https://api.moonshot.ai/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['api'],
    protocols: ['openai'],
    models: [
      {
        id: 'kimi-k2.6',
        displayName: 'Kimi K2.6',
        contextWindow: 256_000,
        thinkingSupport: true,
        thinkingPattern: 'thinking_object',
        thinkingLevels: ['low', 'medium', 'high'],
        supportedParams: THINKING_PARAMS,
      },
      {
        id: 'kimi-k2.5',
        displayName: 'Kimi K2.5',
        contextWindow: 256_000,
        thinkingSupport: true,
        thinkingPattern: 'thinking_object',
        thinkingLevels: ['low', 'medium', 'high'],
        supportedParams: THINKING_PARAMS,
      },
    ],
  },

  // ─── Kimi Code (Coding Plan) ─────────────────────────────────────────
  {
    id: 'kimi-code',
    displayNameKey: 'ai.p.kimi-code',
    iconKey: 'moonshot',
    baseUrl: 'https://api.kimi.com/coding/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['mainland', 'coding-plan'],
    protocols: ['openai'],
    models: [
      {
        id: 'kimi-for-coding',
        displayName: 'Kimi for Coding',
        contextWindow: 256_000,
        thinkingSupport: true,
        thinkingPattern: 'thinking_object',
        thinkingLevels: ['low', 'medium', 'high'],
        supportedParams: THINKING_PARAMS,
      },
    ],
  },

  // ─── Mistral ──────────────────────────────────────────────────────────
  {
    id: 'mistral',
    displayNameKey: 'ai.p.mistral',
    iconKey: 'mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['api'],
    models: [
      { id: 'mistral-large-latest', displayName: 'Mistral Large', contextWindow: 128_000, thinkingSupport: false, supportedParams: FULL_PARAMS },
      { id: 'mistral-medium-latest', displayName: 'Mistral Medium', contextWindow: 128_000, thinkingSupport: false, supportedParams: FULL_PARAMS },
      { id: 'mistral-small-latest', displayName: 'Mistral Small', contextWindow: 128_000, thinkingSupport: false, supportedParams: FULL_PARAMS },
      { id: 'magistral-medium-latest', displayName: 'Magistral Medium', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'builtin', supportedParams: DEFAULT_PARAMS },
      { id: 'magistral-small-latest', displayName: 'Magistral Small', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'builtin', supportedParams: DEFAULT_PARAMS },
      { id: 'devstral-small-latest', displayName: 'Devstral Small', contextWindow: 128_000, thinkingSupport: false, supportedParams: FULL_PARAMS },
      { id: 'codestral-latest', displayName: 'Codestral', contextWindow: 256_000, thinkingSupport: false, supportedParams: FULL_PARAMS },
      { id: 'pixtral-large-latest', displayName: 'Pixtral Large', contextWindow: 128_000, thinkingSupport: false, supportedParams: FULL_PARAMS },
    ],
  },

  // ─── Perplexity ───────────────────────────────────────────────────────
  {
    id: 'perplexity',
    displayNameKey: 'ai.p.perplexity',
    iconKey: 'perplexity',
    baseUrl: 'https://api.perplexity.ai',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['api'],
    models: [
      { id: 'sonar', displayName: 'Sonar', contextWindow: 127_072, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'sonar-pro', displayName: 'Sonar Pro', contextWindow: 200_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'sonar-reasoning', displayName: 'Sonar Reasoning', contextWindow: 127_072, thinkingSupport: true, thinkingPattern: 'builtin', supportedParams: DEFAULT_PARAMS },
      { id: 'sonar-reasoning-pro', displayName: 'Sonar Reasoning Pro', contextWindow: 200_000, thinkingSupport: true, thinkingPattern: 'builtin', supportedParams: DEFAULT_PARAMS },
      { id: 'sonar-deep-research', displayName: 'Sonar Deep Research', contextWindow: 200_000, thinkingSupport: true, thinkingPattern: 'builtin', supportedParams: DEFAULT_PARAMS },
    ],
  },

  // ─── HuggingFace ──────────────────────────────────────────────────────
  {
    id: 'huggingface',
    displayNameKey: 'ai.p.huggingface',
    iconKey: 'huggingface',
    baseUrl: 'https://api-inference.huggingface.co/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['aggregator'],
    models: [],
    notesKey: 'ai.p.notes.dynamicModels',
  },

  // ─── Azure OpenAI ─────────────────────────────────────────────────────
  {
    id: 'azure',
    displayNameKey: 'ai.p.azure',
    iconKey: 'azure',
    baseUrl: 'https://{resource}.openai.azure.com',
    apiMode: 'chat_completions',
    urlEditable: true,
    categories: ['aggregator'],
    models: [],
    notesKey: 'ai.p.notes.azure',
  },

  // ─── OpenRouter ───────────────────────────────────────────────────────
  {
    id: 'openrouter',
    displayNameKey: 'ai.p.openrouter',
    iconKey: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['aggregator'],
    models: [],
    notesKey: 'ai.p.notes.openrouter',
  },

  // ─── LMStudio ─────────────────────────────────────────────────────────
  {
    id: 'lmstudio',
    displayNameKey: 'ai.p.lmstudio',
    iconKey: 'lmstudio',
    baseUrl: 'http://localhost:1234/v1',
    apiMode: 'chat_completions',
    urlEditable: true,
    categories: ['aggregator'],
    models: [],
    notesKey: 'ai.p.notes.localModels',
  },

  // ─── ModelScope ───────────────────────────────────────────────────────
  {
    id: 'modelscope',
    displayNameKey: 'ai.p.modelscope',
    iconKey: 'modelscope',
    baseUrl: 'https://api-inference.modelscope.cn/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['aggregator'],
    models: [],
    notesKey: 'ai.p.notes.dynamicModels',
  },

  // ─── Poe ──────────────────────────────────────────────────────────────
  {
    id: 'poe',
    displayNameKey: 'ai.p.poe',
    iconKey: 'poe',
    baseUrl: 'https://api.poe.com/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['aggregator'],
    models: [],
    notesKey: 'ai.p.notes.dynamicModels',
  },

  // ─── NVIDIA NIM ───────────────────────────────────────────────────────
  {
    id: 'nvidia',
    displayNameKey: 'ai.p.nvidia',
    iconKey: 'nvidia',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['aggregator'],
    models: [],
    notesKey: 'ai.p.notes.dynamicModels',
  },

  // ─── Ollama ───────────────────────────────────────────────────────────
  {
    id: 'ollama',
    displayNameKey: 'ai.p.ollama',
    iconKey: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    apiMode: 'chat_completions',
    urlEditable: true,
    categories: ['aggregator'],
    models: [],
    notesKey: 'ai.p.notes.localModels',
  },

  // ─── Cloudflare Workers AI ────────────────────────────────────────────
  {
    id: 'cloudflare',
    displayNameKey: 'ai.p.cloudflare',
    iconKey: 'cloudflare',
    baseUrl: 'https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1',
    apiMode: 'chat_completions',
    urlEditable: true,
    categories: ['aggregator'],
    models: [

      { id: 'glm-4.7-flash', displayName: 'GLM-4.7 Flash', contextWindow: 128_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'gpt-oss-120b', displayName: 'GPT-OSS 120B', contextWindow: 128_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'gpt-oss-20b', displayName: 'GPT-OSS 20B', contextWindow: 128_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'llama-4-scout-17b', displayName: 'Llama 4 Scout 17B', contextWindow: 128_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'gemma-4-26b', displayName: 'Gemma 4 26B', contextWindow: 128_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'nemotron-3-120b', displayName: 'Nemotron 3 120B', contextWindow: 128_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'qwen3-30b', displayName: 'Qwen3 30B', contextWindow: 128_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'deepseek-r1-distill-qwen-32b', displayName: 'DeepSeek R1 Distill Qwen 32B', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'builtin', supportedParams: DEFAULT_PARAMS },
      { id: 'llama-3.3-70b', displayName: 'Llama 3.3 70B', contextWindow: 128_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
    ],
  },

  // ─── Amazon Bedrock ───────────────────────────────────────────────────
  {
    id: 'bedrock',
    displayNameKey: 'ai.p.bedrock',
    iconKey: 'bedrock',
    baseUrl: 'https://bedrock-runtime.{region}.amazonaws.com',
    apiMode: 'chat_completions',
    urlEditable: true,
    categories: ['aggregator'],
    models: [
      { id: 'anthropic.claude-opus-4-7', displayName: 'Claude Opus 4.7', contextWindow: 1_000_000, thinkingSupport: true, thinkingPattern: 'adaptive', thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'], supportedParams: THINKING_PARAMS },
      { id: 'anthropic.claude-sonnet-4-6', displayName: 'Claude Sonnet 4.6', contextWindow: 200_000, thinkingSupport: true, thinkingPattern: 'budget_tokens', thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'], supportedParams: THINKING_PARAMS },
      { id: 'anthropic.claude-haiku-4-5', displayName: 'Claude Haiku 4.5', contextWindow: 200_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'deepseek.v3.2', displayName: 'DeepSeek V3.2', contextWindow: 128_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'meta.llama3-3-70b', displayName: 'Llama 3.3 70B', contextWindow: 128_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'meta.llama4-scout-17b', displayName: 'Llama 4 Scout 17B', contextWindow: 128_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'mistral.mistral-large-3', displayName: 'Mistral Large 3', contextWindow: 128_000, thinkingSupport: false, supportedParams: FULL_PARAMS },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 中国大陆供应商
  // ═══════════════════════════════════════════════════════════════════════

  // ─── Alibaba DashScope / 阿里百炼中国版 ──────────────────────────────
  {
    id: 'alibaba',
    displayNameKey: 'ai.p.alibaba',
    iconKey: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['mainland', 'api', 'coding-plan'],
    protocols: ['openai'],
    subOptions: [
      {
        id: 'planType',
        labelKey: 'ai.sub.planType',
        options: [
          { value: 'api', labelKey: 'ai.sub.planType.api' },
          { value: 'token', labelKey: 'ai.sub.planType.token' },
          { value: 'coding', labelKey: 'ai.sub.planType.coding' },
        ],
        defaultValue: 'api',
        affectsUrl: true,
      },
    ],
    urlMap: {
      'api': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      'token': 'https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',
      'coding': 'https://coding.dashscope.aliyuncs.com/v1',
    },
    models: [
      { id: 'qwen3.7-max', displayName: 'Qwen3.7 Max', contextWindow: 1_000_000, maxOutput: 64_000, thinkingSupport: true, thinkingPattern: 'enable_thinking', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'qwen3.6-plus', displayName: 'Qwen3.6 Plus', contextWindow: 1_000_000, maxOutput: 64_000, thinkingSupport: true, thinkingPattern: 'enable_thinking', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'qwen3.6-flash', displayName: 'Qwen3.6 Flash', contextWindow: 1_000_000, maxOutput: 64_000, thinkingSupport: true, thinkingPattern: 'enable_thinking', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'deepseek-v4-pro', displayName: 'DeepSeek V4 Pro', contextWindow: 1_000_000, maxOutput: 384_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high', 'max'], supportedParams: THINKING_PARAMS },
      { id: 'deepseek-v4-flash', displayName: 'DeepSeek V4 Flash', contextWindow: 1_000_000, maxOutput: 384_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high', 'max'], supportedParams: THINKING_PARAMS },
      { id: 'deepseek-v3.2', displayName: 'DeepSeek V3.2', contextWindow: 128_000, maxOutput: 32_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'kimi-k2.6', displayName: 'Kimi K2.6', contextWindow: 262_144, maxOutput: 98_304, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'kimi-k2.5', displayName: 'Kimi K2.5', contextWindow: 262_144, maxOutput: 98_304, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-5.1', displayName: 'GLM-5.1', contextWindow: 202_752, maxOutput: 131_072, thinkingSupport: true, thinkingPattern: 'enable_thinking', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-5', displayName: 'GLM-5', contextWindow: 202_752, maxOutput: 16_384, thinkingSupport: true, thinkingPattern: 'enable_thinking', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'MiniMax-M2.5', displayName: 'MiniMax M2.5', contextWindow: 196_608, maxOutput: 32_768, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
    ],
  },

  // ─── Alibaba DashScope International / 阿里百炼国际版 ────────────────
  {
    id: 'alibaba-intl',
    displayNameKey: 'ai.p.alibaba-intl',
    iconKey: 'qwen',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['api', 'coding-plan'],
    protocols: ['openai'],
    subOptions: [
      {
        id: 'region',
        labelKey: 'ai.sub.region',
        options: [
          { value: 'sg', labelKey: 'ai.sub.region.sg' },
          { value: 'us', labelKey: 'ai.sub.region.us' },
        ],
        defaultValue: 'sg',
        affectsUrl: true,
      },
      {
        id: 'planType',
        labelKey: 'ai.sub.planType',
        options: [
          { value: 'api', labelKey: 'ai.sub.planType.api' },
          { value: 'token', labelKey: 'ai.sub.planType.token' },
          { value: 'coding', labelKey: 'ai.sub.planType.coding' },
        ],
        defaultValue: 'api',
        affectsUrl: true,
      },
    ],
    urlMap: {
      'sg+api': 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      'sg+token': 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1',
      'sg+coding': 'https://coding-intl.dashscope.aliyuncs.com/v1',
      'us+api': 'https://dashscope-us.aliyuncs.com/compatible-mode/v1',
      'us+token': 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1',
      'us+coding': 'https://coding-intl.dashscope.aliyuncs.com/v1',
      'sg': 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      'us': 'https://dashscope-us.aliyuncs.com/compatible-mode/v1',
      'api': 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      'token': 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1',
      'coding': 'https://coding-intl.dashscope.aliyuncs.com/v1',
    },
    models: [
      { id: 'qwen3.7-max', displayName: 'Qwen3.7 Max', contextWindow: 1_000_000, maxOutput: 64_000, thinkingSupport: true, thinkingPattern: 'enable_thinking', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'qwen3.6-plus', displayName: 'Qwen3.6 Plus', contextWindow: 1_000_000, maxOutput: 64_000, thinkingSupport: true, thinkingPattern: 'enable_thinking', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'qwen3.6-flash', displayName: 'Qwen3.6 Flash', contextWindow: 1_000_000, maxOutput: 64_000, thinkingSupport: true, thinkingPattern: 'enable_thinking', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'deepseek-v4-pro', displayName: 'DeepSeek V4 Pro', contextWindow: 1_000_000, maxOutput: 384_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high', 'max'], supportedParams: THINKING_PARAMS },
      { id: 'deepseek-v4-flash', displayName: 'DeepSeek V4 Flash', contextWindow: 1_000_000, maxOutput: 384_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high', 'max'], supportedParams: THINKING_PARAMS },
      { id: 'deepseek-v3.2', displayName: 'DeepSeek V3.2', contextWindow: 128_000, maxOutput: 32_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'kimi-k2.6', displayName: 'Kimi K2.6', contextWindow: 262_144, maxOutput: 98_304, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'kimi-k2.5', displayName: 'Kimi K2.5', contextWindow: 262_144, maxOutput: 98_304, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-5.1', displayName: 'GLM-5.1', contextWindow: 202_752, maxOutput: 131_072, thinkingSupport: true, thinkingPattern: 'enable_thinking', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-5', displayName: 'GLM-5', contextWindow: 202_752, maxOutput: 16_384, thinkingSupport: true, thinkingPattern: 'enable_thinking', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'MiniMax-M2.5', displayName: 'MiniMax M2.5', contextWindow: 196_608, maxOutput: 32_768, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
    ],
  },

  // ─── MiniMax 中国版 ───────────────────────────────────────────────────
  {
    id: 'minimax-cn',
    displayNameKey: 'ai.p.minimax-cn',
    iconKey: 'minimax',
    baseUrl: 'https://api.minimaxi.com/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['mainland', 'coding-plan'],
    protocols: ['openai', 'anthropic'],
    subOptions: [
      {
        id: 'planType',
        labelKey: 'ai.sub.planType',
        options: [
          { value: 'api', labelKey: 'ai.sub.planType.api' },
          { value: 'token', labelKey: 'ai.sub.planType.token' },
        ],
        defaultValue: 'api',
        affectsUrl: true,
      },
    ],
    urlMap: {
      'api': 'https://api.minimaxi.com/v1',
      'token': 'https://api.minimaxi.com/v1',
    },
    models: [
      { id: 'MiniMax-M3', displayName: 'MiniMax-M3', contextWindow: 1_000_000, thinkingSupport: true, thinkingPattern: 'adaptive', supportedParams: THINKING_PARAMS },
      { id: 'MiniMax-M2.7', displayName: 'MiniMax M2.7', contextWindow: 256_000, thinkingSupport: false, supportedParams: FULL_PARAMS },
      { id: 'MiniMax-M2.7-highspeed', displayName: 'MiniMax M2.7 高速版', contextWindow: 256_000, thinkingSupport: false, supportedParams: FULL_PARAMS },
      { id: 'MiniMax-M2.5', displayName: 'MiniMax M2.5', contextWindow: 256_000, thinkingSupport: false, supportedParams: FULL_PARAMS },
      { id: 'MiniMax-M2.5-highspeed', displayName: 'MiniMax M2.5 高速版', contextWindow: 256_000, thinkingSupport: false, supportedParams: FULL_PARAMS },
      { id: 'MiniMax-M2.1', displayName: 'MiniMax M2.1', contextWindow: 256_000, thinkingSupport: false, supportedParams: FULL_PARAMS },
      { id: 'MiniMax-M2', displayName: 'MiniMax M2', contextWindow: 256_000, thinkingSupport: false, supportedParams: FULL_PARAMS },
      { id: 'M2-her', displayName: 'M2 Her', contextWindow: 256_000, thinkingSupport: false, supportedParams: FULL_PARAMS },
    ],
  },

  // ─── MiniMax 国际版 ──────────────────────────────────────────────────
  {
    id: 'minimax',
    displayNameKey: 'ai.p.minimax',
    iconKey: 'minimax',
    baseUrl: 'https://api.minimax.io/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['api', 'coding-plan'],
    protocols: ['openai', 'anthropic'],
    subOptions: [
      {
        id: 'planType',
        labelKey: 'ai.sub.planType',
        options: [
          { value: 'api', labelKey: 'ai.sub.planType.api' },
          { value: 'token', labelKey: 'ai.sub.planType.token' },
        ],
        defaultValue: 'api',
        affectsUrl: true,
      },
    ],
    urlMap: {
      'api': 'https://api.minimax.io/v1',
      'token': 'https://api.minimax.io/v1',
    },
    models: [
      { id: 'MiniMax-M3', displayName: 'MiniMax-M3', contextWindow: 1_000_000, thinkingSupport: true, thinkingPattern: 'adaptive', supportedParams: THINKING_PARAMS },
      { id: 'MiniMax-M2.7', displayName: 'MiniMax M2.7', contextWindow: 256_000, thinkingSupport: false, supportedParams: FULL_PARAMS },
      { id: 'MiniMax-M2.7-highspeed', displayName: 'MiniMax M2.7 高速版', contextWindow: 256_000, thinkingSupport: false, supportedParams: FULL_PARAMS },
      { id: 'MiniMax-M2.5', displayName: 'MiniMax M2.5', contextWindow: 256_000, thinkingSupport: false, supportedParams: FULL_PARAMS },
      { id: 'MiniMax-M2.5-highspeed', displayName: 'MiniMax M2.5 高速版', contextWindow: 256_000, thinkingSupport: false, supportedParams: FULL_PARAMS },
      { id: 'MiniMax-M2.1', displayName: 'MiniMax M2.1', contextWindow: 256_000, thinkingSupport: false, supportedParams: FULL_PARAMS },
      { id: 'MiniMax-M2', displayName: 'MiniMax M2', contextWindow: 256_000, thinkingSupport: false, supportedParams: FULL_PARAMS },
      { id: 'M2-her', displayName: 'M2 Her', contextWindow: 256_000, thinkingSupport: false, supportedParams: FULL_PARAMS },
    ],
  },

  // ─── Xiaomi MiMo (按量付费) ────────────────────────────────────────────
  {
    id: 'xiaomi',
    displayNameKey: 'ai.p.xiaomi',
    iconKey: 'xiaomimimo',
    baseUrl: 'https://api.xiaomimimo.com/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['mainland'],
    protocols: ['openai', 'anthropic'],
    models: [
      { id: 'mimo-v2.5-pro', displayName: 'MiMo V2.5 Pro', contextWindow: 1_000_000, maxOutput: 128_000, thinkingSupport: true, thinkingPattern: 'builtin', supportedParams: DEFAULT_PARAMS },
      { id: 'mimo-v2.5', displayName: 'MiMo V2.5', contextWindow: 1_000_000, maxOutput: 128_000, thinkingSupport: true, thinkingPattern: 'builtin', supportedParams: DEFAULT_PARAMS },
    ],
  },

  // ─── Xiaomi MiMo Token Plan ───────────────────────────────────────────
  {
    id: 'xiaomi-token-plan',
    displayNameKey: 'ai.p.xiaomi-token-plan',
    iconKey: 'xiaomimimo',
    baseUrl: 'https://token-plan-cn.xiaomimimo.com/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['mainland', 'coding-plan'],
    protocols: ['openai'],
    models: [
      { id: 'mimo-v2.5-pro', displayName: 'MiMo V2.5 Pro', contextWindow: 1_000_000, maxOutput: 128_000, thinkingSupport: true, thinkingPattern: 'builtin', supportedParams: DEFAULT_PARAMS },
      { id: 'mimo-v2.5', displayName: 'MiMo V2.5 Flash', contextWindow: 1_000_000, maxOutput: 128_000, thinkingSupport: true, thinkingPattern: 'builtin', supportedParams: DEFAULT_PARAMS },
    ],
    subOptions: [
      {
        id: 'region',
        labelKey: 'ai.sub.region',
        options: [
          { value: 'cn', labelKey: 'ai.sub.region.cn' },
          { value: 'sgp', labelKey: 'ai.sub.region.sgp' },
          { value: 'ams', labelKey: 'ai.sub.region.ams' },
        ],
        defaultValue: 'cn',
        affectsUrl: true,
      },
    ],
    urlMap: {
      cn: 'https://token-plan-cn.xiaomimimo.com/v1',
      sgp: 'https://token-plan-sgp.xiaomimimo.com/v1',
      ams: 'https://token-plan-ams.xiaomimimo.com/v1',
    },
  },

  // ─── Zhipu GLM API ───────────────────────────────────────────────────
  {
    id: 'zhipu',
    displayNameKey: 'ai.p.zhipu',
    iconKey: 'zhipu',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['mainland'],
    protocols: ['openai'],
    models: [
      { id: 'glm-5.1', displayName: 'GLM-5.1', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-5', displayName: 'GLM-5', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-5-turbo', displayName: 'GLM-5 Turbo (高速版)', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-4.7', displayName: 'GLM-4.7', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-4.7-flash', displayName: 'GLM-4.7 Flash (快享版)', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-4.7-flashx', displayName: 'GLM-4.7 FlashX (快享加速版)', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
    ],
  },

  // ─── Zhipu GLM Coding Plan ───────────────────────────────────────────
  {
    id: 'zhipu-coding',
    displayNameKey: 'ai.p.zhipu-coding',
    iconKey: 'zhipu',
    baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['mainland', 'coding-plan'],
    protocols: ['openai'],
    models: [
      { id: 'glm-5.1', displayName: 'GLM-5.1', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-5', displayName: 'GLM-5', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-5-turbo', displayName: 'GLM-5 Turbo (高速版)', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-4.7', displayName: 'GLM-4.7', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-4.7-flash', displayName: 'GLM-4.7 Flash (快享版)', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-4.7-flashx', displayName: 'GLM-4.7 FlashX (快享加速版)', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
    ],
  },

  // ─── Z.AI API ─────────────────────────────────────────────────────────
  {
    id: 'zai',
    displayNameKey: 'ai.p.zai',
    iconKey: 'zhipu',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['api'],
    protocols: ['openai'],
    models: [
      { id: 'glm-5.1', displayName: 'GLM-5.1', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-5', displayName: 'GLM-5', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-5-turbo', displayName: 'GLM-5 Turbo (高速版)', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-4.7', displayName: 'GLM-4.7', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-4.7-flash', displayName: 'GLM-4.7 Flash (快享版)', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-4.7-flashx', displayName: 'GLM-4.7 FlashX (快享加速版)', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
    ],
  },

  // ─── Z.AI Coding Plan ─────────────────────────────────────────────────
  {
    id: 'zai-coding',
    displayNameKey: 'ai.p.zai-coding',
    iconKey: 'zhipu',
    baseUrl: 'https://api.z.ai/api/coding/paas/v4',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['coding-plan'],
    protocols: ['openai'],
    models: [
      { id: 'glm-5.1', displayName: 'GLM-5.1', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-5', displayName: 'GLM-5', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-5-turbo', displayName: 'GLM-5 Turbo (高速版)', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-4.7', displayName: 'GLM-4.7', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-4.7-flash', displayName: 'GLM-4.7 Flash (快享版)', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-4.7-flashx', displayName: 'GLM-4.7 FlashX (快享加速版)', contextWindow: 128_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
    ],
  },

  // ─── StepFun (阶跃星辰) ───────────────────────────────────────────────
  {
    id: 'stepfun',
    displayNameKey: 'ai.p.stepfun',
    iconKey: 'stepfun',
    baseUrl: 'https://api.stepfun.com/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['mainland', 'api'],
    protocols: ['openai'],
    subOptions: [
      {
        id: 'region',
        labelKey: 'ai.sub.region',
        options: [
          { value: 'cn', labelKey: 'ai.sub.region.cn' },
          { value: 'intl', labelKey: 'ai.sub.region.intl' },
        ],
        defaultValue: 'cn',
        affectsUrl: true,
      },
      {
        id: 'planType',
        labelKey: 'ai.sub.planType',
        options: [
          { value: 'api', labelKey: 'ai.sub.planType.api' },
          { value: 'step-plan', labelKey: 'ai.sub.planType.step-plan' },
        ],
        defaultValue: 'api',
        affectsUrl: true,
      },
    ],
    urlMap: {
      'cn+api': 'https://api.stepfun.com/v1',
      'cn+step-plan': 'https://api.stepfun.com/step_plan/v1',
      'intl+api': 'https://api.stepfun.ai/v1',
      'intl+step-plan': 'https://api.stepfun.ai/step_plan/v1',
    },
    models: [
      { id: 'step-3.7-flash', displayName: 'Step 3.7 Flash', contextWindow: 256_000, thinkingSupport: true, thinkingPattern: 'thinking_config', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'step-3.5-flash', displayName: 'Step 3.5 Flash', contextWindow: 256_000, thinkingSupport: true, thinkingPattern: 'thinking_config', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'step-3.5-flash-2603', displayName: 'Step 3.5 Flash (2603)', contextWindow: 128_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'step-router', displayName: 'Step Router', contextWindow: 128_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
    ],
  },

  // ─── Tencent Hunyuan ──────────────────────────────────────────────────
  {
    id: 'tencent-hunyuan',
    displayNameKey: 'ai.p.tencent-hunyuan',
    iconKey: 'hunyuan',
    baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['mainland', 'api'],
    protocols: ['openai'],
    subOptions: [
      {
        id: 'region',
        labelKey: 'ai.sub.region',
        options: [
          { value: 'cn', labelKey: 'ai.sub.region.cn' },
          { value: 'intl', labelKey: 'ai.sub.region.intl' },
        ],
        defaultValue: 'cn',
        affectsUrl: false,
      },
      {
        id: 'modelType',
        labelKey: 'ai.sub.modelType',
        options: [
          { value: 'chat', labelKey: 'ai.sub.modelType.chat' },
          { value: 'translate', labelKey: 'ai.sub.modelType.translate' },
        ],
        defaultValue: 'chat',
        affectsModels: true,
      },
    ],
    models: [
      { id: 'hunyuan-turbos-20250416', displayName: '混元 Turbo S', contextWindow: 32_768, thinkingSupport: false, supportedParams: DEFAULT_PARAMS, subOptionFilter: { modelType: 'chat' } },
      { id: 'hunyuan-large-20250226', displayName: '混元 Large', contextWindow: 32_768, thinkingSupport: false, supportedParams: DEFAULT_PARAMS, subOptionFilter: { modelType: 'chat' } },
      { id: 'hunyuan-t1-20250416', displayName: '混元 T1', contextWindow: 32_768, thinkingSupport: true, thinkingPattern: 'builtin', supportedParams: THINKING_PARAMS, subOptionFilter: { modelType: 'chat' } },
      { id: 'hunyuan-mt-20250226', displayName: '混元 MT', contextWindow: 8_192, thinkingSupport: false, supportedParams: DEFAULT_PARAMS, subOptionFilter: { modelType: 'translate' } },
      { id: 'hunyuan-mt-20250107', displayName: '混元 MT (旧版)', contextWindow: 8_192, thinkingSupport: false, supportedParams: DEFAULT_PARAMS, subOptionFilter: { modelType: 'translate' } },
    ],
  },

  // ─── Tencent Token Plan ──────────────────────────────────────────────
  {
    id: 'tencent-token-plan',
    displayNameKey: 'ai.p.tencent-token-plan',
    iconKey: 'hunyuan',
    baseUrl: 'https://api.lkeap.cloud.tencent.com/plan/v3',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['aggregator', 'coding-plan'],
    protocols: ['openai'],
    subOptions: [
      {
        id: 'region',
        labelKey: 'ai.sub.region',
        options: [
          { value: 'cn', labelKey: 'ai.sub.region.cn' },
          { value: 'intl-sg', labelKey: 'ai.sub.region.intl-sg' },
          { value: 'intl-gz', labelKey: 'ai.sub.region.intl-gz' },
        ],
        defaultValue: 'cn',
        affectsUrl: true,
      },
    ],
    urlMap: {
      'cn': 'https://api.lkeap.cloud.tencent.com/plan/v3',
      'intl-sg': 'https://lkeap.cloud.tencent.com/plan/v3',
      'intl-gz': 'https://lkeap.gz.cloud.tencent.com/plan/v3',
    },
    models: [
      { id: 'tc-code-latest', displayName: 'Auto', thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'minimax-m2.5', displayName: 'MiniMax-M2.5', contextWindow: 200_000, maxOutput: 128_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'minimax-m2.7', displayName: 'MiniMax-M2.7', contextWindow: 200_000, maxOutput: 128_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'glm-5', displayName: 'GLM-5', contextWindow: 200_000, maxOutput: 128_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'glm-5.1', displayName: 'GLM-5.1', contextWindow: 200_000, maxOutput: 128_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'kimi-k2.5', displayName: 'Kimi-K2.5', contextWindow: 256_000, maxOutput: 256_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'hunyuan-2.0-instruct', displayName: 'Tencent HY 2.0 Instruct', contextWindow: 144_000, maxOutput: 16_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'hunyuan-2.0-thinking', displayName: 'Tencent HY 2.0 Think', contextWindow: 192_000, maxOutput: 64_000, thinkingSupport: true, thinkingPattern: 'builtin', supportedParams: THINKING_PARAMS },
      { id: 'hunyuan-t1', displayName: 'Hunyuan-T1', contextWindow: 96_000, maxOutput: 64_000, thinkingSupport: true, thinkingPattern: 'builtin', supportedParams: THINKING_PARAMS },
      { id: 'hunyuan-turbos', displayName: 'Hunyuan-TurboS', contextWindow: 48_000, maxOutput: 16_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'hunyuan-turbo', displayName: 'Hunyuan-TurboS (Legacy ID)', contextWindow: 48_000, maxOutput: 16_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
    ],
  },

  // ─── Volcengine/火山方舟 (China) ────────────────────────────────────────
  {
    id: 'volcengine',
    displayNameKey: 'ai.p.volcengine',
    iconKey: 'volcengine',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['mainland', 'aggregator', 'coding-plan'],
    protocols: ['openai'],
    subOptions: [
      {
        id: 'planType',
        labelKey: 'ai.sub.planType',
        options: [
          { value: 'api', labelKey: 'ai.sub.planType.api' },
          { value: 'coding', labelKey: 'ai.sub.planType.coding' },
          { value: 'agent', labelKey: 'ai.sub.planType.agent' },
        ],
        defaultValue: 'api',
        affectsUrl: true,
      },
    ],
    urlMap: {
      'api': 'https://ark.cn-beijing.volces.com/api/v3',
      'coding': 'https://ark.cn-beijing.volces.com/api/coding/v3',
      'agent': 'https://ark.cn-beijing.volces.com/api/plan/v3',
    },
    models: [
      { id: 'doubao-seed-2.0-pro', displayName: 'Doubao Seed 2.0 Pro', contextWindow: 256_000, maxOutput: 32_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS, subOptionFilter: { planType: 'api' } },
      { id: 'doubao-seed-2.0-lite', displayName: 'Doubao Seed 2.0 Lite', contextWindow: 256_000, maxOutput: 32_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS, subOptionFilter: { planType: 'api' } },
      { id: 'doubao-seed-2.0-code', displayName: 'Doubao Seed 2.0 Code', contextWindow: 256_000, maxOutput: 32_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS, subOptionFilter: { planType: 'api' } },
      { id: 'ark-code-latest', displayName: 'Auto', contextWindow: 256_000, maxOutput: 32_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS, subOptionFilter: { planType: 'coding|agent' } },
      { id: 'glm-5.1', displayName: 'GLM 5.1', contextWindow: 200_000, maxOutput: 4_096, thinkingSupport: false, supportedParams: DEFAULT_PARAMS, subOptionFilter: { planType: 'coding|agent' } },
      { id: 'kimi-k2.6', displayName: 'Kimi K2.6', contextWindow: 256_000, maxOutput: 4_096, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS, subOptionFilter: { planType: 'coding|agent' } },
      { id: 'deepseek-v4-pro', displayName: 'DeepSeek V4 Pro', contextWindow: 256_000, maxOutput: 32_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high', 'max'], supportedParams: THINKING_PARAMS, subOptionFilter: { planType: 'coding|agent' } },
      { id: 'deepseek-v4-flash', displayName: 'DeepSeek V4 Flash', contextWindow: 256_000, maxOutput: 32_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high', 'max'], supportedParams: THINKING_PARAMS, subOptionFilter: { planType: 'coding|agent' } },
      { id: 'minimax-m2.7', displayName: 'MiniMax M2.7', contextWindow: 200_000, maxOutput: 128_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS, subOptionFilter: { planType: 'coding|agent' } },
    ],
  },

  // ─── Volcengine/火山方舟 International ─────────────────────────────────
  {
    id: 'volcengine-intl',
    displayNameKey: 'ai.p.volcengine-intl',
    iconKey: 'volcengine',
    baseUrl: 'https://ark.ap-southeast-1.byteplus.com/api/v3',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['aggregator', 'coding-plan'],
    protocols: ['openai'],
    subOptions: [
      {
        id: 'planType',
        labelKey: 'ai.sub.planType',
        options: [
          { value: 'api', labelKey: 'ai.sub.planType.api' },
          { value: 'coding', labelKey: 'ai.sub.planType.coding' },
        ],
        defaultValue: 'api',
        affectsUrl: true,
      },
    ],
    urlMap: {
      'api': 'https://ark.ap-southeast-1.byteplus.com/api/v3',
      'coding': 'https://ark.ap-southeast-1.byteplus.com/api/coding/v3',
    },
    models: [
      { id: 'dola-seed-2.0-pro', displayName: 'Dola Seed 2.0 Pro', contextWindow: 256_000, maxOutput: 32_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS, subOptionFilter: { planType: 'api' } },
      { id: 'dola-seed-2.0-lite', displayName: 'Dola Seed 2.0 Lite', contextWindow: 256_000, maxOutput: 32_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS, subOptionFilter: { planType: 'api' } },
      { id: 'dola-seed-2.0-code', displayName: 'Dola Seed 2.0 Code', contextWindow: 256_000, maxOutput: 32_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS, subOptionFilter: { planType: 'api' } },
      { id: 'ark-code-latest', displayName: 'Auto', contextWindow: 256_000, maxOutput: 32_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS, subOptionFilter: { planType: 'coding' } },
      { id: 'glm-5.1', displayName: 'GLM 5.1 Coding', contextWindow: 200_000, maxOutput: 32_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS, subOptionFilter: { planType: 'coding' } },
      { id: 'glm-4.7', displayName: 'GLM 4.7 Coding', contextWindow: 200_000, maxOutput: 4_096, thinkingSupport: false, supportedParams: DEFAULT_PARAMS, subOptionFilter: { planType: 'coding' } },
      { id: 'kimi-k2.5', displayName: 'Kimi K2.5 Coding', contextWindow: 256_000, maxOutput: 32_768, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS, subOptionFilter: { planType: 'coding' } },
      { id: 'gpt-oss-120b', displayName: 'GPT-OSS 120B', contextWindow: 128_000, maxOutput: 32_000, thinkingSupport: false, supportedParams: DEFAULT_PARAMS, subOptionFilter: { planType: 'coding' } },
    ],
  },

  // ─── SiliconFlow (China) ──────────────────────────────────────────────
  {
    id: 'siliconflow-cn',
    displayNameKey: 'ai.p.siliconflow-cn',
    iconKey: 'siliconcloud',
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['mainland', 'aggregator'],
    models: [],
    notesKey: 'ai.p.notes.siliconflow',
  },

  // ─── SiliconFlow (International) ──────────────────────────────────────
  {
    id: 'siliconflow-intl',
    displayNameKey: 'ai.p.siliconflow-intl',
    iconKey: 'siliconcloud',
    baseUrl: 'https://api.siliconflow.com/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['aggregator'],
    models: [],
    notesKey: 'ai.p.notes.siliconflow',
  },

  // ─── Baidu Qianfan / 百度千帆 (China) ────────────────────────────────
  {
    id: 'baidu',
    displayNameKey: 'ai.p.baidu',
    iconKey: 'baidu',
    baseUrl: 'https://qianfan.baidubce.com/v2',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['mainland', 'coding-plan'],
    protocols: ['openai'],
    subOptions: [
      {
        id: 'planType',
        labelKey: 'ai.sub.planType',
        options: [
          { value: 'api', labelKey: 'ai.sub.planType.api' },
          { value: 'coding', labelKey: 'ai.sub.planType.coding' },
        ],
        defaultValue: 'api',
        affectsUrl: true,
      },
    ],
    urlMap: {
      'api': 'https://qianfan.baidubce.com/v2',
      'coding': 'https://qianfan.baidubce.com/v2/coding',
    },
    models: [
      { id: 'ernie-5.0', displayName: 'ERNIE 5.0', contextWindow: 128_000, maxOutput: 65_536, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'ernie-4.5-turbo-128k', displayName: 'ERNIE 4.5 Turbo', contextWindow: 128_000, maxOutput: 12_288, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'deepseek-v4-pro', displayName: 'DeepSeek V4 Pro', contextWindow: 1_000_000, maxOutput: 131_072, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high', 'max'], supportedParams: THINKING_PARAMS },
      { id: 'deepseek-v4-flash', displayName: 'DeepSeek V4 Flash', contextWindow: 1_000_000, maxOutput: 131_072, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high', 'max'], supportedParams: THINKING_PARAMS },
      { id: 'glm-5.1', displayName: 'GLM-5.1', contextWindow: 202_752, maxOutput: 131_072, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-5', displayName: 'GLM-5', contextWindow: 202_752, maxOutput: 131_072, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'kimi-k2.5', displayName: 'Kimi K2.5', contextWindow: 262_144, maxOutput: 65_536, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'minimax-m2.5', displayName: 'MiniMax M2.5', contextWindow: 196_608, maxOutput: 131_072, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
    ],
  },

  // ─── Baidu Qianfan International / 百度千帆国际版 ────────────────────
  {
    id: 'baidu-intl',
    displayNameKey: 'ai.p.baidu-intl',
    iconKey: 'baidu',
    baseUrl: 'https://api.baiduqianfan.ai/v1',
    apiMode: 'chat_completions',
    urlEditable: false,
    categories: ['api', 'coding-plan'],
    protocols: ['openai'],
    subOptions: [
      {
        id: 'planType',
        labelKey: 'ai.sub.planType',
        options: [
          { value: 'api', labelKey: 'ai.sub.planType.api' },
          { value: 'coding', labelKey: 'ai.sub.planType.coding' },
        ],
        defaultValue: 'api',
        affectsUrl: true,
      },
    ],
    urlMap: {
      'api': 'https://api.baiduqianfan.ai/v1',
      'coding': 'https://api.baiduqianfan.ai/coding/v1',
    },
    models: [
      { id: 'ernie-5.0', displayName: 'ERNIE 5.0', contextWindow: 128_000, maxOutput: 65_536, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
      { id: 'deepseek-v3.2', displayName: 'DeepSeek V3.2', contextWindow: 128_000, maxOutput: 32_000, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'glm-5', displayName: 'GLM-5', contextWindow: 202_752, maxOutput: 131_072, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'kimi-k2.5', displayName: 'Kimi K2.5', contextWindow: 262_144, maxOutput: 65_536, thinkingSupport: true, thinkingPattern: 'thinking_object', thinkingLevels: ['low', 'medium', 'high'], supportedParams: THINKING_PARAMS },
      { id: 'minimax-m2.5', displayName: 'MiniMax M2.5', contextWindow: 196_608, maxOutput: 131_072, thinkingSupport: false, supportedParams: DEFAULT_PARAMS },
    ],
  },
];

// ─── Helper Functions ───────────────────────────────────────────────────

export function getProviderById(id: string): AiProvider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function getProvidersByFilter(filter: {
  category?: ProviderCategory;
}): AiProvider[] {
  return PROVIDERS.filter((p) => {
    if (filter.category && !p.categories.includes(filter.category)) return false;
    return true;
  });
}

export function getModelsForProvider(providerId: string): AiModel[] {
  const provider = getProviderById(providerId);
  return provider?.models ?? [];
}

export function getModelById(providerId: string, modelId: string): AiModel | undefined {
  const provider = getProviderById(providerId);
  return provider?.models.find((m) => m.id === modelId);
}

export function getDefaultUrl(provider: AiProvider): string {
  return provider.baseUrl;
}

export function isUrlEditable(provider: AiProvider): boolean {
  return provider.urlEditable;
}

export function getEffectiveUrl(provider: AiProvider, subOptionValues: Record<string, string>): string {
  if (!provider.urlMap) return provider.baseUrl;

  const subOpts = provider.subOptions ?? [];
  const affectingUrl = subOpts.filter((so) => so.affectsUrl);

  if (affectingUrl.length === 0) return provider.baseUrl;

  // Try composite key first (e.g., "paid+cn")
  if (affectingUrl.length > 1) {
    const compositeKey = affectingUrl.map((so) => subOptionValues[so.id] ?? so.defaultValue).join('+');
    if (provider.urlMap[compositeKey]) return provider.urlMap[compositeKey];
  }

  // Try single key (e.g., "cn")
  for (const so of affectingUrl) {
    const val = subOptionValues[so.id] ?? so.defaultValue;
    if (provider.urlMap[val]) return provider.urlMap[val];
  }

  return provider.baseUrl;
}

export function getFilteredModels(provider: AiProvider, subOptionValues: Record<string, string>): AiModel[] {
  return provider.models.filter((model) => {
    if (!model.subOptionFilter) return true;
    for (const [key, filterVal] of Object.entries(model.subOptionFilter)) {
      const currentVal = subOptionValues[key];
      if (!currentVal) continue;
      // Support pipe-separated multi-values (e.g., "paid|coding")
      const allowedValues = filterVal.split('|');
      if (!allowedValues.includes(currentVal)) return false;
    }
    return true;
  });
}
