import { z } from 'zod'

// ============================================================
// BRD Schema
// ============================================================
export const BRDSchema = z.object({
    title: z.string(),
    version: z.string().default('1.0'),
    status: z.string().default('draft'),
    executive_summary: z.string(),
    problem_statement: z.string(),
    objectives: z.array(z.string()),
    scope: z.object({
        in_scope: z.array(z.string()),
        out_of_scope: z.array(z.string()),
    }),
    stakeholders: z.array(z.object({
        name: z.string(),
        role: z.string(),
        interest: z.string(),
    })),
    business_requirements: z.array(z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        priority: z.enum(['low', 'medium', 'high', 'critical']),
        rationale: z.string(),
    })),
    constraints: z.array(z.object({
        type: z.string(),
        description: z.string(),
    })),
    assumptions: z.array(z.string()),
    risks: z.array(z.object({
        description: z.string(),
        likelihood: z.enum(['low', 'medium', 'high']),
        impact: z.enum(['low', 'medium', 'high']),
        mitigation: z.string(),
    })),
    success_metrics: z.array(z.object({
        metric: z.string(),
        target: z.string(),
        measurement: z.string(),
    })),
    glossary: z.array(z.object({
        term: z.string(),
        definition: z.string(),
    })).optional().default([]),
})

export type BRD = z.infer<typeof BRDSchema>

// ============================================================
// PRD Schema
// ============================================================
export const PRDSchema = z.object({
    title: z.string(),
    version: z.string().default('1.0'),
    status: z.string().default('draft'),
    product_vision: z.string(),
    problem_statement: z.string(),
    target_users: z.array(z.object({
        persona: z.string(),
        description: z.string(),
        needs: z.array(z.string()),
    })),
    success_metrics: z.array(z.object({
        metric: z.string(),
        target: z.string(),
        measurement: z.string(),
    })),
    functional_requirements: z.array(z.object({
        id: z.string(),
        feature: z.string(),
        description: z.string(),
        priority: z.enum(['low', 'medium', 'high', 'must-have']),
        acceptance_criteria_summary: z.string(),
    })),
    non_functional_requirements: z.array(z.object({
        category: z.string(),
        requirement: z.string(),
        target: z.string(),
    })),
    technical_considerations: z.array(z.string()),
    dependencies: z.array(z.object({
        name: z.string(),
        type: z.string(),
        description: z.string(),
    })),
    release_plan: z.object({
        target_date: z.string().optional(),
        milestones: z.array(z.object({
            name: z.string(),
            description: z.string(),
            target_date: z.string().optional(),
        })),
    }),
    out_of_scope: z.array(z.string()),
    open_questions: z.array(z.object({
        question: z.string(),
        owner: z.string().optional(),
        status: z.string().optional(),
    })).optional().default([]),
})

export type PRD = z.infer<typeof PRDSchema>

// ============================================================
// Epic Schema
// ============================================================
export const EpicSchema = z.object({
    title: z.string(),
    description: z.string(),
    business_value: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    target_release: z.string().optional(),
    dependencies: z.array(z.string()).default([]),
})

export const EpicsArraySchema = z.array(EpicSchema)

export type Epic = z.infer<typeof EpicSchema>

// ============================================================
// Story Schema
// ============================================================
export const AcceptanceCriterionSchema = z.object({
    type: z.enum(['functional', 'validation', 'error', 'edge', 'nfr']),
    given: z.string(),
    when: z.string(),
    then: z.string(),
    notes: z.string().optional(),
})

export const StorySchema = z.object({
    title: z.string(),
    story_statement: z.string(),
    description: z.string(),
    business_rules: z.array(z.string()).default([]),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    dependencies: z.array(z.string()).default([]),
    acceptance_criteria: z.array(AcceptanceCriterionSchema).min(3),
})

export const StoriesArraySchema = z.array(StorySchema)

export type Story = z.infer<typeof StorySchema>
export type AcceptanceCriterion = z.infer<typeof AcceptanceCriterionSchema>

// ============================================================
// Refinement Patch Schema
// ============================================================
export const RefinementOperationSchema = z.discriminatedUnion('op', [
    z.object({
        op: z.literal('update'),
        path: z.string(),
        value: z.unknown(),
        reason: z.string(),
    }),
    z.object({
        op: z.literal('append'),
        path: z.string(),
        value: z.unknown(),
        reason: z.string(),
    }),
    z.object({
        op: z.literal('remove'),
        path: z.string(),
        reason: z.string(),
    }),
])

export const RefinementPatchSchema = z.object({
    summary: z.string(),
    operations: z.array(RefinementOperationSchema),
})

export type RefinementPatch = z.infer<typeof RefinementPatchSchema>

// ============================================================
// Quality Gate
// ============================================================
export interface QualityGateResult {
    passed: boolean
    errors: string[]
    warnings: string[]
}

const VAGUE_WORDS = ['user-friendly', 'fast', 'intuitive', 'easy', 'simple', 'quickly', 'efficiently', 'robust', 'scalable', 'modern']

export function runQualityGate(data: {
    prd?: unknown
    stories?: Story[]
}): QualityGateResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (data.prd) {
        const prd = data.prd as Partial<PRD>
        if (!prd.non_functional_requirements || prd.non_functional_requirements.length === 0) {
            errors.push('PRD is missing Non-Functional Requirements (NFR) section')
        }
    }

    if (data.stories) {
        for (const story of data.stories) {
            if (!story.acceptance_criteria || story.acceptance_criteria.length < 3) {
                errors.push(`Story "${story.title}" has fewer than 3 acceptance criteria`)
            }

            const storyText = JSON.stringify(story)
            for (const vague of VAGUE_WORDS) {
                if (storyText.toLowerCase().includes(vague)) {
                    warnings.push(`Story "${story.title}" contains vague word: "${vague}"`)
                    break
                }
            }

            if (storyText.includes('etc.') || storyText.includes('and more')) {
                warnings.push(`Story "${story.title}" contains vague phrase ("etc." or "and more")`)
            }
        }
    }

    return {
        passed: errors.length === 0,
        errors,
        warnings,
    }
}
