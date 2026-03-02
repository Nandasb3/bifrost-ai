# Bifrost — AI-First BA Documentation Platform

A production-quality MVP for automating BA documentation using AI.  
Generates **BRDs, PRDs, Epics, User Stories, and Gherkin Acceptance Criteria** via a structured pipeline.

---

## What It Does

1. **Project Context** — Set up project metadata (client, domain, tech stack, DoD)
2. **Context Library** — Add constraints, API specs, compliance rules, or upload reference files
3. **Document Generation** — AI generates structured BRD / PRD JSON, schema-validated via Zod
4. **Epic Generation** — AI derives epics from PRD content
5. **Story + AC Generation** — AI generates user stories with minimum 3 Gherkin ACs each
6. **Refinement** — Chat-based targeted updates using a diff/patch approach
7. **Quality Gate** — Validates NFRs, AC counts, and warns on vague language
8. **Export** — Markdown, CSV (3 files), Jira Cloud JSON

---

## Tech Stack

- **Next.js 14+** (App Router) + TypeScript
- **Tailwind CSS** + **shadcn/ui** (Radix)
- **Supabase** (Postgres + Auth + Storage + RLS)
- **Zod** schema validation for all AI outputs
- **OpenAI-compatible** LLM client

---

## Setup

### 1. Clone and Install

```bash
git clone <repo>
cd bifrost
npm install
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy your project URL and anon key from **Settings → API**
3. Copy your service role key from the same page

### 3. Configure Environment Variables

Copy `.env.local` and fill in your values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI / Azure OpenAI
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1   # or your Azure endpoint
OPENAI_MODEL=gpt-4o                          # or gpt-4-turbo, etc.

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Supabase Migrations

In the Supabase Dashboard:
1. Go to **SQL Editor**
2. Paste and run the contents of `supabase/migrations/001_initial_schema.sql`

### 5. Create Storage Bucket

In the Supabase Dashboard:
1. Go to **Storage** → **New Bucket**
2. Name: `context-files`
3. Public: **No** (keep private)

### 6. Configure Auth

In the Supabase Dashboard:
1. Go to **Authentication → Providers**
2. Email provider is enabled by default
3. For local dev, disable "Confirm email" in **Auth → Settings** if you want immediate login

### 7. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Where to Add the LLM Key

In `.env.local`:
```env
OPENAI_API_KEY=sk-your-key-here
```

For **Azure OpenAI**, set:
```env
OPENAI_API_KEY=your-azure-api-key
OPENAI_BASE_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment
OPENAI_MODEL=gpt-4o
```

If `OPENAI_API_KEY` is not set, a placeholder client is used that returns errors on generation.

---

## App Structure

```
src/
├── app/
│   ├── (app)/                    # Protected routes (requires auth)
│   │   ├── dashboard/
│   │   └── projects/
│   │       ├── [projectId]/
│   │       │   ├── page.tsx          # Project overview
│   │       │   ├── context/          # Context items + upload
│   │       │   ├── documents/        # BRD/PRD list + new
│   │       │   ├── builder/[id]/     # 3-panel document builder
│   │       │   ├── epics/            # Epics list
│   │       │   ├── stories/          # Stories + story detail
│   │       │   ├── exports/          # Export hub + Jira preview
│   │       │   └── settings/         # Project settings
│   ├── api/
│   │   ├── documents/[documentId]/
│   │   │   ├── generate/             # BRD/PRD generation
│   │   │   ├── generate-epics/       # Epic generation
│   │   │   ├── generate-stories/     # Story + AC generation
│   │   │   ├── refine/               # Chat refinement (patch)
│   │   │   ├── export-markdown/      # Markdown export
│   │   │   ├── export-csv/           # CSV export
│   │   │   └── export-jira/          # Jira JSON export
│   │   └── stories/[storyId]/
│   │       └── improve-ac/           # AI-improve acceptance criteria
│   ├── auth/callback/                # Supabase auth callback
│   └── sign-in/
├── lib/
│   ├── llm-client.ts                 # LLM abstraction + OpenAI client
│   ├── schemas.ts                    # Zod schemas + quality gate
│   ├── patch.ts                      # JSON patch utility
│   ├── export-generators.ts          # Markdown/CSV/Jira generators
│   └── supabase/                     # Server/client/types
└── components/
    ├── app-shell.tsx                 # Sidebar navigation
    ├── improve-ac-button.tsx
    └── ui/                           # shadcn/ui components
```

---

## AI Quality Gate

Before saving AI outputs, the system checks:

| Check | Severity |
|-------|----------|
| PRD missing NFR section | ❌ Error |
| Story has < 3 AC | ❌ Error |
| AC contains vague words (user-friendly, fast, etc.) | ⚠️ Warning |
| Requirements contain "etc." or "and more" | ⚠️ Warning |

If AI output fails Zod validation, a single repair call is made automatically. If repair also fails, the error is returned to the UI.

---

## Export Formats

| Format | Contents |
|--------|----------|
| **Markdown** | Single `.md` with full BRD/PRD + Epics + Stories + AC |
| **CSV** | `epics.csv` + `stories.csv` + `acceptance_criteria.csv` |
| **Jira JSON** | Jira Cloud bulk import payload (Epics + Stories, AC in description) |

---

## License

MIT
