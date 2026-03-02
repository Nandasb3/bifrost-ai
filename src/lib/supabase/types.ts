export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            projects: {
                Row: {
                    id: string
                    owner_user_id: string
                    name: string
                    client_name: string | null
                    domain: string | null
                    tech_stack: Json
                    jira_project_key: string | null
                    release_cadence: string | null
                    story_format: string
                    definition_of_done: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'> & {
                    id?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: Partial<Database['public']['Tables']['projects']['Insert']>
            }
            context_items: {
                Row: {
                    id: string
                    project_id: string
                    type: string
                    title: string
                    content: string
                    tags: string[]
                    source_type: string
                    storage_path: string | null
                    file_name: string | null
                    file_size: number | null
                    notes: string | null
                    created_by: string
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['context_items']['Row'], 'id' | 'created_at'> & {
                    id?: string
                    created_at?: string
                }
                Update: Partial<Database['public']['Tables']['context_items']['Insert']>
            }
            documents: {
                Row: {
                    id: string
                    project_id: string
                    type: 'BRD' | 'PRD'
                    title: string
                    status: 'draft' | 'review' | 'approved'
                    target_release: string | null
                    seed_input: string | null
                    context_item_ids: string[]
                    created_by: string
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'created_at' | 'updated_at'> & {
                    id?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: Partial<Database['public']['Tables']['documents']['Insert']>
            }
            document_versions: {
                Row: {
                    id: string
                    document_id: string
                    version_number: number
                    content_json: Json
                    change_summary: string | null
                    created_by: string
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['document_versions']['Row'], 'id' | 'created_at'> & {
                    id?: string
                    created_at?: string
                }
                Update: Partial<Database['public']['Tables']['document_versions']['Insert']>
            }
            epics: {
                Row: {
                    id: string
                    document_id: string
                    title: string
                    description: string | null
                    business_value: string | null
                    priority: string
                    target_release: string | null
                    dependencies: string[]
                    sort_order: number
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['epics']['Row'], 'id' | 'created_at' | 'updated_at'> & {
                    id?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: Partial<Database['public']['Tables']['epics']['Insert']>
            }
            stories: {
                Row: {
                    id: string
                    epic_id: string
                    title: string
                    story_statement: string | null
                    description: string | null
                    business_rules: string[]
                    priority: string
                    dependencies: string[]
                    status: string
                    sort_order: number
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['stories']['Row'], 'id' | 'created_at' | 'updated_at'> & {
                    id?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: Partial<Database['public']['Tables']['stories']['Insert']>
            }
            acceptance_criteria: {
                Row: {
                    id: string
                    story_id: string
                    type: 'functional' | 'validation' | 'error' | 'edge' | 'nfr'
                    given: string
                    when: string
                    then: string
                    notes: string | null
                    sort_order: number
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['acceptance_criteria']['Row'], 'id' | 'created_at'> & {
                    id?: string
                    created_at?: string
                }
                Update: Partial<Database['public']['Tables']['acceptance_criteria']['Insert']>
            }
            chat_messages: {
                Row: {
                    id: string
                    document_id: string
                    role: 'user' | 'assistant' | 'system'
                    content_text: string
                    metadata: Json
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['chat_messages']['Row'], 'id' | 'created_at'> & {
                    id?: string
                    created_at?: string
                }
                Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>
            }
            export_jobs: {
                Row: {
                    id: string
                    document_id: string
                    type: 'markdown' | 'csv' | 'jira_json'
                    status: 'queued' | 'running' | 'failed' | 'completed'
                    artifact_path: string | null
                    artifact_content: string | null
                    error_text: string | null
                    created_by: string
                    created_at: string
                    completed_at: string | null
                }
                Insert: Omit<Database['public']['Tables']['export_jobs']['Row'], 'id' | 'created_at'> & {
                    id?: string
                    created_at?: string
                }
                Update: Partial<Database['public']['Tables']['export_jobs']['Insert']>
            }
        }
    }
}
