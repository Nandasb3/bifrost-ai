import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient;

// ============================================================
// MARKDOWN EXPORT
// ============================================================
export async function generateMarkdownExport(
    supabase: Supabase,
    documentId: string
): Promise<string> {
    const { data: doc } = await supabase
        .from("documents")
        .select("*, projects(name, client_name, domain)")
        .eq("id", documentId)
        .single();

    if (!doc) throw new Error("Document not found");

    const { data: latestVersion } = await supabase
        .from("document_versions")
        .select("*")
        .eq("document_id", documentId)
        .order("version_number", { ascending: false })
        .limit(1)
        .single();

    const { data: epics } = await supabase
        .from("epics")
        .select("*")
        .eq("document_id", documentId)
        .order("sort_order");

    const epicIds = epics?.map((e) => e.id) ?? [];
    const { data: stories } = epicIds.length > 0
        ? await supabase
            .from("stories")
            .select("*")
            .in("epic_id", epicIds)
            .order("sort_order")
        : { data: [] };

    const storyIds = stories?.map((s) => s.id) ?? [];
    const { data: acs } = storyIds.length > 0
        ? await supabase
            .from("acceptance_criteria")
            .select("*")
            .in("story_id", storyIds)
            .order("sort_order")
        : { data: [] };

    const project = doc.projects as Record<string, string>;
    const content = latestVersion?.content_json as Record<string, unknown> | null;

    const lines: string[] = [];

    lines.push(`# ${doc.title}`);
    lines.push(`**Type:** ${doc.type} | **Status:** ${doc.status} | **Version:** ${latestVersion?.version_number ?? 1}`);
    lines.push(`**Project:** ${project?.name} | **Client:** ${project?.client_name || "N/A"} | **Domain:** ${project?.domain || "N/A"}`);
    lines.push("");

    if (content) {
        lines.push("---");
        lines.push("");
        renderJsonAsMarkdown(lines, content, 2);
    }

    if (epics && epics.length > 0) {
        lines.push("");
        lines.push("---");
        lines.push("");
        lines.push("## Epics");
        lines.push("");

        for (const epic of epics) {
            lines.push(`### ${epic.title}`);
            lines.push(`**Priority:** ${epic.priority} | **Business Value:** ${epic.business_value || "N/A"}`);
            if (epic.description) lines.push(`\n${epic.description}`);
            lines.push("");

            const epicStories = stories?.filter((s) => s.epic_id === epic.id) ?? [];
            if (epicStories.length > 0) {
                lines.push("#### Stories");
                lines.push("");

                for (const story of epicStories) {
                    lines.push(`##### ${story.title}`);
                    if (story.story_statement) lines.push(`> ${story.story_statement}`);
                    if (story.description) lines.push(`\n${story.description}`);

                    if (story.business_rules?.length > 0) {
                        lines.push("\n**Business Rules:**");
                        story.business_rules.forEach((r: string) => lines.push(`- ${r}`));
                    }
                    lines.push("");

                    const storyACs = acs?.filter((a) => a.story_id === story.id) ?? [];
                    if (storyACs.length > 0) {
                        lines.push("**Acceptance Criteria:**");
                        lines.push("");
                        storyACs.forEach((ac, i) => {
                            lines.push(`${i + 1}. **[${ac.type.toUpperCase()}]**`);
                            lines.push(`   - **Given:** ${ac.given}`);
                            lines.push(`   - **When:** ${ac.when}`);
                            lines.push(`   - **Then:** ${ac.then}`);
                            if (ac.notes) lines.push(`   - *Note: ${ac.notes}*`);
                        });
                    }
                    lines.push("");
                }
            }
        }
    }

    return lines.join("\n");
}

function renderJsonAsMarkdown(
    lines: string[],
    obj: Record<string, unknown>,
    depth: number
) {
    const heading = "#".repeat(Math.min(depth, 6));
    for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) continue;
        const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        if (Array.isArray(value)) {
            if (value.length === 0) continue;
            lines.push(`${heading} ${label}`);
            lines.push("");
            value.forEach((item, i) => {
                if (typeof item === "string") {
                    lines.push(`- ${item}`);
                } else if (typeof item === "object" && item !== null) {
                    lines.push(`${heading}# Item ${i + 1}`);
                    Object.entries(item as Record<string, unknown>).forEach(([k, v]) => {
                        if (v !== null && v !== undefined) {
                            lines.push(`**${k.replace(/_/g, " ")}:** ${String(v)}`);
                        }
                    });
                }
            });
            lines.push("");
        } else if (typeof value === "object") {
            lines.push(`${heading} ${label}`);
            lines.push("");
            renderJsonAsMarkdown(lines, value as Record<string, unknown>, depth + 1);
        } else {
            lines.push(`${heading} ${label}`);
            lines.push("");
            lines.push(String(value));
            lines.push("");
        }
    }
}

// ============================================================
// CSV EXPORT
// ============================================================
export async function generateCSVExport(
    supabase: Supabase,
    documentId: string
): Promise<{ epics: string; stories: string; acceptance_criteria: string }> {
    const { data: epics } = await supabase
        .from("epics")
        .select("*")
        .eq("document_id", documentId)
        .order("sort_order");

    const epicIds = epics?.map((e) => e.id) ?? [];

    const { data: stories } = epicIds.length > 0
        ? await supabase.from("stories").select("*").in("epic_id", epicIds).order("sort_order")
        : { data: [] };

    const storyIds = stories?.map((s) => s.id) ?? [];
    const { data: acs } = storyIds.length > 0
        ? await supabase.from("acceptance_criteria").select("*").in("story_id", storyIds).order("sort_order")
        : { data: [] };

    const csvEpics = toCSV(
        ["id", "title", "description", "business_value", "priority", "target_release"],
        epics ?? []
    );

    const csvStories = toCSV(
        ["id", "epic_id", "title", "story_statement", "description", "priority", "status"],
        stories ?? []
    );

    const csvACs = toCSV(
        ["id", "story_id", "type", "given", "when", "then", "notes"],
        acs ?? []
    );

    return { epics: csvEpics, stories: csvStories, acceptance_criteria: csvACs };
}

function toCSV(headers: string[], rows: Record<string, unknown>[]): string {
    const escape = (v: unknown): string => {
        const s = v === null || v === undefined ? "" : String(v);
        return `"${s.replace(/"/g, '""')}"`;
    };
    const headerRow = headers.join(",");
    const dataRows = rows.map((row) => headers.map((h) => escape(row[h])).join(","));
    return [headerRow, ...dataRows].join("\n");
}

// ============================================================
// JIRA JSON EXPORT
// ============================================================
export interface JiraPayload {
    projects: JiraProject[];
}

interface JiraProject {
    key: string;
    name: string;
    issues: JiraIssue[];
}

interface JiraIssue {
    summary: string;
    description: string;
    issuetype: { name: string };
    priority: { name: string };
    labels: string[];
    components?: { name: string }[];
    customfield_10014?: string; // Epic link
}

export async function generateJiraExport(
    supabase: Supabase,
    documentId: string
): Promise<JiraPayload> {
    const { data: doc } = await supabase
        .from("documents")
        .select("*, projects(name, jira_project_key)")
        .eq("id", documentId)
        .single();

    if (!doc) throw new Error("Document not found");

    const project = doc.projects as Record<string, string>;
    const jiraKey = project?.jira_project_key || "PROJ";
    const projectName = project?.name || "Project";

    const { data: epics } = await supabase
        .from("epics")
        .select("*")
        .eq("document_id", documentId)
        .order("sort_order");

    const epicIds = epics?.map((e) => e.id) ?? [];
    const { data: stories } = epicIds.length > 0
        ? await supabase.from("stories").select("*").in("epic_id", epicIds).order("sort_order")
        : { data: [] };

    const storyIds = stories?.map((s) => s.id) ?? [];
    const { data: acs } = storyIds.length > 0
        ? await supabase.from("acceptance_criteria").select("*").in("story_id", storyIds).order("sort_order")
        : { data: [] };

    const priorityMap: Record<string, string> = {
        critical: "Highest",
        high: "High",
        medium: "Medium",
        low: "Low",
    };

    const issues: JiraIssue[] = [];

    for (const epic of epics ?? []) {
        issues.push({
            summary: epic.title,
            description: [
                epic.description || "",
                epic.business_value ? `\nBusiness Value: ${epic.business_value}` : "",
                epic.dependencies?.length > 0 ? `\nDependencies: ${epic.dependencies.join(", ")}` : "",
            ].join(""),
            issuetype: { name: "Epic" },
            priority: { name: priorityMap[epic.priority] || "Medium" },
            labels: ["generated-by-bifrost"],
        });

        const epicStories = stories?.filter((s) => s.epic_id === epic.id) ?? [];
        for (const story of epicStories) {
            const storyACs = acs?.filter((a) => a.story_id === story.id) ?? [];
            const acDescription = storyACs
                .map(
                    (ac, i) =>
                        `${i + 1}. [${ac.type.toUpperCase()}]\n   Given: ${ac.given}\n   When: ${ac.when}\n   Then: ${ac.then}`
                )
                .join("\n\n");

            issues.push({
                summary: story.title,
                description: [
                    story.story_statement ? `h3. ${story.story_statement}\n` : "",
                    story.description || "",
                    story.business_rules?.length > 0
                        ? `\nh4. Business Rules\n${story.business_rules.map((r: string) => `* ${r}`).join("\n")}`
                        : "",
                    storyACs.length > 0
                        ? `\nh4. Acceptance Criteria\n{code}\n${acDescription}\n{code}`
                        : "",
                ]
                    .filter(Boolean)
                    .join("\n"),
                issuetype: { name: "Story" },
                priority: { name: priorityMap[story.priority] || "Medium" },
                labels: ["generated-by-bifrost"],
                customfield_10014: epic.title, // Epic link
            });
        }
    }

    return {
        projects: [
            {
                key: jiraKey,
                name: projectName,
                issues,
            },
        ],
    };
}
