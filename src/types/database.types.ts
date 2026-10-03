export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      asset_licenses: {
        Row: {
          asset_id: string
          attribution_text: string | null
          commercial_use_allowed: boolean | null
          license_name: string | null
          license_url: string | null
          modification_allowed: boolean | null
          notes: string | null
          redistribution_allowed: boolean | null
          source_url: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          asset_id: string
          attribution_text?: string | null
          commercial_use_allowed?: boolean | null
          license_name?: string | null
          license_url?: string | null
          modification_allowed?: boolean | null
          notes?: string | null
          redistribution_allowed?: boolean | null
          source_url?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          asset_id?: string
          attribution_text?: string | null
          commercial_use_allowed?: boolean | null
          license_name?: string | null
          license_url?: string | null
          modification_allowed?: boolean | null
          notes?: string | null
          redistribution_allowed?: boolean | null
          source_url?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_licenses_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          bucket_id: string
          byte_size: number | null
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["asset_kind"]
          mime_type: string | null
          object_path: string
          original_filename: string | null
          owner_user_id: string | null
          scope: Database["public"]["Enums"]["asset_scope"]
          sha256: string | null
          status: Database["public"]["Enums"]["asset_status"]
          updated_at: string
          visibility: Database["public"]["Enums"]["asset_visibility"]
        }
        Insert: {
          bucket_id: string
          byte_size?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["asset_kind"]
          mime_type?: string | null
          object_path: string
          original_filename?: string | null
          owner_user_id?: string | null
          scope: Database["public"]["Enums"]["asset_scope"]
          sha256?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["asset_visibility"]
        }
        Update: {
          bucket_id?: string
          byte_size?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["asset_kind"]
          mime_type?: string | null
          object_path?: string
          original_filename?: string | null
          owner_user_id?: string | null
          scope?: Database["public"]["Enums"]["asset_scope"]
          sha256?: string | null
          status?: Database["public"]["Enums"]["asset_status"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["asset_visibility"]
        }
        Relationships: []
      }
      attempt_step_results: {
        Row: {
          attempt_id: string
          checks_count: number
          geometry_fingerprint: string | null
          status: Database["public"]["Enums"]["step_result_status"]
          step_slug: string
          updated_at: string
          validation_results: Json
        }
        Insert: {
          attempt_id: string
          checks_count?: number
          geometry_fingerprint?: string | null
          status: Database["public"]["Enums"]["step_result_status"]
          step_slug: string
          updated_at?: string
          validation_results?: Json
        }
        Update: {
          attempt_id?: string
          checks_count?: number
          geometry_fingerprint?: string | null
          status?: Database["public"]["Enums"]["step_result_status"]
          step_slug?: string
          updated_at?: string
          validation_results?: Json
        }
        Relationships: [
          {
            foreignKeyName: "attempt_step_results_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "practice_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      case_checkpoints: {
        Row: {
          case_id: string
          created_at: string
          id: string
          name: string
          revision_id: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          name: string
          revision_id: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          name?: string
          revision_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_checkpoints_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "user_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_checkpoints_revision_fk"
            columns: ["case_id", "revision_id"]
            isOneToOne: false
            referencedRelation: "case_revisions"
            referencedColumns: ["case_id", "id"]
          },
        ]
      }
      case_heads: {
        Row: {
          case_id: string
          revision_id: string
          updated_at: string
        }
        Insert: {
          case_id: string
          revision_id: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          revision_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_heads_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "user_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_heads_revision_fk"
            columns: ["case_id", "revision_id"]
            isOneToOne: false
            referencedRelation: "case_revisions"
            referencedColumns: ["case_id", "id"]
          },
        ]
      }
      case_object_versions: {
        Row: {
          case_object_id: string
          created_at: string
          created_by: string
          geometry_asset_id: string
          geometry_hash: string | null
          id: string
          triangle_count: number | null
          version_number: number
          vertex_count: number | null
        }
        Insert: {
          case_object_id: string
          created_at?: string
          created_by: string
          geometry_asset_id: string
          geometry_hash?: string | null
          id?: string
          triangle_count?: number | null
          version_number: number
          vertex_count?: number | null
        }
        Update: {
          case_object_id?: string
          created_at?: string
          created_by?: string
          geometry_asset_id?: string
          geometry_hash?: string | null
          id?: string
          triangle_count?: number | null
          version_number?: number
          vertex_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "case_object_versions_case_object_id_fkey"
            columns: ["case_object_id"]
            isOneToOne: false
            referencedRelation: "case_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_object_versions_geometry_asset_id_fkey"
            columns: ["geometry_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      case_objects: {
        Row: {
          case_id: string
          created_at: string
          id: string
          name: string
          retired_at: string | null
          role: Database["public"]["Enums"]["cad_object_role"]
          runtime_id: string
          source_asset_id: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          name: string
          retired_at?: string | null
          role: Database["public"]["Enums"]["cad_object_role"]
          runtime_id: string
          source_asset_id?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          name?: string
          retired_at?: string | null
          role?: Database["public"]["Enums"]["cad_object_role"]
          runtime_id?: string
          source_asset_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_objects_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "user_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_objects_source_asset_id_fkey"
            columns: ["source_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      case_revision_objects: {
        Row: {
          case_object_id: string
          object_state: Json
          object_version_id: string
          position: number[]
          revision_id: string
          rotation_quaternion: number[]
          scale: number[]
          visible: boolean
        }
        Insert: {
          case_object_id: string
          object_state?: Json
          object_version_id: string
          position?: number[]
          revision_id: string
          rotation_quaternion?: number[]
          scale?: number[]
          visible?: boolean
        }
        Update: {
          case_object_id?: string
          object_state?: Json
          object_version_id?: string
          position?: number[]
          revision_id?: string
          rotation_quaternion?: number[]
          scale?: number[]
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "case_revision_objects_case_object_id_fkey"
            columns: ["case_object_id"]
            isOneToOne: false
            referencedRelation: "case_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_revision_objects_object_version_id_fkey"
            columns: ["object_version_id"]
            isOneToOne: false
            referencedRelation: "case_object_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_revision_objects_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "case_revisions"
            referencedColumns: ["id"]
          },
        ]
      }
        case_revisions: {
        Row: {
          case_id: string
          change_summary: string | null
          created_at: string
          created_by: string
          id: string
          revision_number: number
          source_revision_id: string | null
          workspace_state: Json
        }
        Insert: {
          case_id: string
          change_summary?: string | null
          created_at?: string
          created_by: string
          id?: string
          revision_number: number
          source_revision_id?: string | null
          workspace_state?: Json
        }
        Update: {
          case_id?: string
          change_summary?: string | null
          created_at?: string
          created_by?: string
          id?: string
          revision_number?: number
          source_revision_id?: string | null
          workspace_state?: Json
        }
        Relationships: [
          {
            foreignKeyName: "case_revisions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "user_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_revisions_source_revision_id_fkey"
            columns: ["source_revision_id"]
            isOneToOne: false
            referencedRelation: "case_revisions"
            referencedColumns: ["id"]
          },
          ]
        }
        case_screenshots: {
          Row: { asset_id: string; camera_state: Json; case_id: string; created_at: string; id: string; revision_id: string | null; user_id: string }
          Insert: { asset_id: string; camera_state?: Json; case_id: string; created_at?: string; id?: string; revision_id?: string | null; user_id: string }
          Update: { asset_id?: string; camera_state?: Json; case_id?: string; created_at?: string; id?: string; revision_id?: string | null; user_id?: string }
          Relationships: [
            { foreignKeyName: "case_screenshots_asset_id_fkey"; columns: ["asset_id"]; isOneToOne: false; referencedRelation: "assets"; referencedColumns: ["id"] },
            { foreignKeyName: "case_screenshots_case_id_fkey"; columns: ["case_id"]; isOneToOne: false; referencedRelation: "user_cases"; referencedColumns: ["id"] },
            { foreignKeyName: "case_screenshots_revision_id_fkey"; columns: ["revision_id"]; isOneToOne: false; referencedRelation: "case_revisions"; referencedColumns: ["id"] },
          ]
        }
        screenshot_annotations: {
          Row: { annotation_type: Database["public"]["Enums"]["annotation_type"]; created_at: string; id: string; payload: Json; screenshot_id: string; sort_order: number; updated_at: string }
          Insert: { annotation_type: Database["public"]["Enums"]["annotation_type"]; created_at?: string; id?: string; payload: Json; screenshot_id: string; sort_order?: number; updated_at?: string }
          Update: { annotation_type?: Database["public"]["Enums"]["annotation_type"]; created_at?: string; id?: string; payload?: Json; screenshot_id?: string; sort_order?: number; updated_at?: string }
          Relationships: [
            { foreignKeyName: "screenshot_annotations_screenshot_id_fkey"; columns: ["screenshot_id"]; isOneToOne: false; referencedRelation: "case_screenshots"; referencedColumns: ["id"] },
          ]
        }
        content_domains: {
        Row: {
          created_at: string
          description_en: string | null
          description_sr: string | null
          id: string
          name_en: string
          name_sr: string
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_en?: string | null
          description_sr?: string | null
          id?: string
          name_en: string
          name_sr: string
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_en?: string | null
          description_sr?: string | null
          id?: string
          name_en?: string
          name_sr?: string
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Relationships: []
      }
      model_assets: {
        Row: {
          asset_id: string
          bbox_max: number[] | null
          bbox_min: number[] | null
          created_at: string
          default_role: Database["public"]["Enums"]["cad_object_role"] | null
          format: Database["public"]["Enums"]["model_format"]
          has_normals: boolean | null
          is_manifold: boolean | null
          original_to_canonical: Json | null
          source_unit: Database["public"]["Enums"]["model_unit"]
          technical_metadata: Json
          triangle_count: number | null
          vertex_count: number | null
        }
        Insert: {
          asset_id: string
          bbox_max?: number[] | null
          bbox_min?: number[] | null
          created_at?: string
          default_role?: Database["public"]["Enums"]["cad_object_role"] | null
          format: Database["public"]["Enums"]["model_format"]
          has_normals?: boolean | null
          is_manifold?: boolean | null
          original_to_canonical?: Json | null
          source_unit?: Database["public"]["Enums"]["model_unit"]
          technical_metadata?: Json
          triangle_count?: number | null
          vertex_count?: number | null
        }
        Update: {
          asset_id?: string
          bbox_max?: number[] | null
          bbox_min?: number[] | null
          created_at?: string
          default_role?: Database["public"]["Enums"]["cad_object_role"] | null
          format?: Database["public"]["Enums"]["model_format"]
          has_normals?: boolean | null
          is_manifold?: boolean | null
          original_to_canonical?: Json | null
          source_unit?: Database["public"]["Enums"]["model_unit"]
          technical_metadata?: Json
          triangle_count?: number | null
          vertex_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "model_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_attempts: {
        Row: {
          checks_count: number
          completed_at: string | null
          completed_step_ids: string[]
          created_at: string
          id: string
          last_activity_at: string
          lesson_id: string
          result_summary: Json
          score: number | null
          started_at: string
          status: Database["public"]["Enums"]["attempt_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          checks_count?: number
          completed_at?: string | null
          completed_step_ids?: string[]
          created_at?: string
          id: string
          last_activity_at?: string
          lesson_id: string
          result_summary?: Json
          score?: number | null
          started_at: string
          status?: Database["public"]["Enums"]["attempt_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          checks_count?: number
          completed_at?: string | null
          completed_step_ids?: string[]
          created_at?: string
          id?: string
          last_activity_at?: string
          lesson_id?: string
          result_summary?: Json
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_attempts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "practice_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_hints: {
        Row: {
          body_en: string
          body_sr: string
          demo_asset_id: string | null
          id: string
          slug: string
          sort_order: number
          step_id: string
          title_en: string
          title_sr: string
        }
        Insert: {
          body_en: string
          body_sr: string
          demo_asset_id?: string | null
          id?: string
          slug: string
          sort_order: number
          step_id: string
          title_en: string
          title_sr: string
        }
        Update: {
          body_en?: string
          body_sr?: string
          demo_asset_id?: string | null
          id?: string
          slug?: string
          sort_order?: number
          step_id?: string
          title_en?: string
          title_sr?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_hints_demo_asset_id_fkey"
            columns: ["demo_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_hints_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "practice_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_lesson_assets: {
        Row: {
          asset_id: string
          is_reference: boolean
          lesson_id: string
          object_role: Database["public"]["Enums"]["cad_object_role"]
          sort_order: number
        }
        Insert: {
          asset_id: string
          is_reference?: boolean
          lesson_id: string
          object_role: Database["public"]["Enums"]["cad_object_role"]
          sort_order?: number
        }
        Update: {
          asset_id?: string
          is_reference?: boolean
          lesson_id?: string
          object_role?: Database["public"]["Enums"]["cad_object_role"]
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "practice_lesson_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_lesson_assets_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "practice_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_lesson_skills: {
        Row: {
          lesson_id: string
          skill_id: string
        }
        Insert: {
          lesson_id: string
          skill_id: string
        }
        Update: {
          lesson_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_lesson_skills_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "practice_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_lesson_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_lessons: {
        Row: {
          case_setup: Json
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          estimated_minutes: number
          goal_en: string
          goal_sr: string
          id: string
          module_id: string
          recommended_prerequisites: Json
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          summary_en: string
          summary_sr: string
          title_en: string
          title_sr: string
          updated_at: string
        }
        Insert: {
          case_setup?: Json
          created_at?: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          estimated_minutes: number
          goal_en: string
          goal_sr: string
          id?: string
          module_id: string
          recommended_prerequisites?: Json
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          summary_en: string
          summary_sr: string
          title_en: string
          title_sr: string
          updated_at?: string
        }
        Update: {
          case_setup?: Json
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          estimated_minutes?: number
          goal_en?: string
          goal_sr?: string
          id?: string
          module_id?: string
          recommended_prerequisites?: Json
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          summary_en?: string
          summary_sr?: string
          title_en?: string
          title_sr?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "practice_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_modules: {
        Row: {
          created_at: string
          id: string
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          summary_en: string | null
          summary_sr: string | null
          title_en: string
          title_sr: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          summary_en?: string | null
          summary_sr?: string | null
          title_en: string
          title_sr: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          summary_en?: string | null
          summary_sr?: string | null
          title_en?: string
          title_sr?: string
          updated_at?: string
        }
        Relationships: []
      }
      practice_step_tools: {
        Row: {
          step_id: string
          tool_id: string
        }
        Insert: {
          step_id: string
          tool_id: string
        }
        Update: {
          step_id?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_step_tools_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "practice_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_step_validations: {
        Row: {
          sort_order: number
          step_id: string
          validation_config_id: string
        }
        Insert: {
          sort_order?: number
          step_id: string
          validation_config_id: string
        }
        Update: {
          sort_order?: number
          step_id?: string
          validation_config_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_step_validations_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "practice_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_step_validations_validation_config_id_fkey"
            columns: ["validation_config_id"]
            isOneToOne: false
            referencedRelation: "validation_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_steps: {
        Row: {
          created_at: string
          example_config: Json | null
          id: string
          instructions_en: string
          instructions_sr: string
          lesson_id: string
          reference_config: Json | null
          reference_modes: string[]
          required: boolean
          slug: string
          sort_order: number
          target_object_ids: string[]
          theory_en: string | null
          theory_sr: string | null
          title_en: string
          title_sr: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          example_config?: Json | null
          id?: string
          instructions_en: string
          instructions_sr: string
          lesson_id: string
          reference_config?: Json | null
          reference_modes?: string[]
          required?: boolean
          slug: string
          sort_order: number
          target_object_ids?: string[]
          theory_en?: string | null
          theory_sr?: string | null
          title_en: string
          title_sr: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          example_config?: Json | null
          id?: string
          instructions_en?: string
          instructions_sr?: string
          lesson_id?: string
          reference_config?: Json | null
          reference_modes?: string[]
          required?: boolean
          slug?: string
          sort_order?: number
          target_object_ids?: string[]
          theory_en?: string | null
          theory_sr?: string | null
          title_en?: string
          title_sr?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_steps_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "practice_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          locale: Database["public"]["Enums"]["app_locale"]
          theme: Database["public"]["Enums"]["app_theme"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          locale?: Database["public"]["Enums"]["app_locale"]
          theme?: Database["public"]["Enums"]["app_theme"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: Database["public"]["Enums"]["app_locale"]
          theme?: Database["public"]["Enums"]["app_theme"]
          updated_at?: string
        }
        Relationships: []
      }
      scenario_assets: {
        Row: {
          asset_id: string
          object_role: Database["public"]["Enums"]["cad_object_role"]
          required: boolean
          scenario_id: string
          sort_order: number
        }
        Insert: {
          asset_id: string
          object_role: Database["public"]["Enums"]["cad_object_role"]
          required?: boolean
          scenario_id: string
          sort_order?: number
        }
        Update: {
          asset_id?: string
          object_role?: Database["public"]["Enums"]["cad_object_role"]
          required?: boolean
          scenario_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "scenario_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_assets_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          additional_metadata: Json
          created_at: string
          created_by: string | null
          description_en: string | null
          description_sr: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          domain_id: string
          id: string
          indication_en: string | null
          indication_sr: string | null
          patient_age: number | null
          patient_code: string | null
          published_at: string | null
          random_eligible: boolean
          requirements_en: string[]
          requirements_sr: string[]
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          title_en: string
          title_sr: string
          tooth_numbers: number[] | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          additional_metadata?: Json
          created_at?: string
          created_by?: string | null
          description_en?: string | null
          description_sr?: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          domain_id: string
          id?: string
          indication_en?: string | null
          indication_sr?: string | null
          patient_age?: number | null
          patient_code?: string | null
          published_at?: string | null
          random_eligible?: boolean
          requirements_en?: string[]
          requirements_sr?: string[]
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          title_en: string
          title_sr: string
          tooth_numbers?: number[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          additional_metadata?: Json
          created_at?: string
          created_by?: string | null
          description_en?: string | null
          description_sr?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          domain_id?: string
          id?: string
          indication_en?: string | null
          indication_sr?: string | null
          patient_age?: number | null
          patient_code?: string | null
          published_at?: string | null
          random_eligible?: boolean
          requirements_en?: string[]
          requirements_sr?: string[]
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title_en?: string
          title_sr?: string
          tooth_numbers?: number[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "content_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          description_en: string | null
          description_sr: string | null
          id: string
          name_en: string
          name_sr: string
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_en?: string | null
          description_sr?: string | null
          id?: string
          name_en: string
          name_sr: string
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_en?: string | null
          description_sr?: string | null
          id?: string
          name_en?: string
          name_sr?: string
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Relationships: []
      }
      tool_definitions: {
        Row: {
          category: Database["public"]["Enums"]["tool_category"]
          common_mistakes_en: string[]
          common_mistakes_sr: string[]
          created_at: string
          default_shortcut: string | null
          explanation_en: string | null
          explanation_sr: string | null
          id: string
          label_en: string
          label_sr: string
          short_description_en: string
          short_description_sr: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          why_it_matters_en: string | null
          why_it_matters_sr: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["tool_category"]
          common_mistakes_en?: string[]
          common_mistakes_sr?: string[]
          created_at?: string
          default_shortcut?: string | null
          explanation_en?: string | null
          explanation_sr?: string | null
          id: string
          label_en: string
          label_sr: string
          short_description_en: string
          short_description_sr: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          why_it_matters_en?: string | null
          why_it_matters_sr?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["tool_category"]
          common_mistakes_en?: string[]
          common_mistakes_sr?: string[]
          created_at?: string
          default_shortcut?: string | null
          explanation_en?: string | null
          explanation_sr?: string | null
          id?: string
          label_en?: string
          label_sr?: string
          short_description_en?: string
          short_description_sr?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          why_it_matters_en?: string | null
          why_it_matters_sr?: string | null
        }
        Relationships: []
      }
      tool_object_roles: {
        Row: {
          object_role: Database["public"]["Enums"]["cad_object_role"]
          tool_id: string
        }
        Insert: {
          object_role: Database["public"]["Enums"]["cad_object_role"]
          tool_id: string
        }
        Update: {
          object_role?: Database["public"]["Enums"]["cad_object_role"]
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_object_roles_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tool_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_cases: {
        Row: {
          created_at: string
          domain_id: string | null
          duplicated_from_case_id: string | null
          id: string
          last_opened_at: string | null
          practice_lesson_id: string | null
          scenario_id: string | null
          source_snapshot: Json
          source_type: Database["public"]["Enums"]["case_source_type"]
          status: Database["public"]["Enums"]["case_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          domain_id?: string | null
          duplicated_from_case_id?: string | null
          id?: string
          last_opened_at?: string | null
          practice_lesson_id?: string | null
          scenario_id?: string | null
          source_snapshot?: Json
          source_type: Database["public"]["Enums"]["case_source_type"]
          status?: Database["public"]["Enums"]["case_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          domain_id?: string | null
          duplicated_from_case_id?: string | null
          id?: string
          last_opened_at?: string | null
          practice_lesson_id?: string | null
          scenario_id?: string | null
          source_snapshot?: Json
          source_type?: Database["public"]["Enums"]["case_source_type"]
          status?: Database["public"]["Enums"]["case_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cases_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "content_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_cases_duplicated_from_case_id_fkey"
            columns: ["duplicated_from_case_id"]
            isOneToOne: false
            referencedRelation: "user_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_cases_practice_lesson_id_fkey"
            columns: ["practice_lesson_id"]
            isOneToOne: false
            referencedRelation: "practice_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_configs: {
        Row: {
          config: Json
          created_at: string
          id: string
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          validator_type: Database["public"]["Enums"]["validator_type"]
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          validator_type: Database["public"]["Enums"]["validator_type"]
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          validator_type?: Database["public"]["Enums"]["validator_type"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      commit_case_revision: {
        Args: {
          p_case_id: string
          p_duplicated_from_case_id?: string
          p_expected_head_id: string
          p_objects: Json
          p_practice_lesson_id?: string
          p_scenario_id?: string
          p_source_revision_id?: string
          p_source_snapshot: Json
          p_source_type: Database["public"]["Enums"]["case_source_type"]
          p_title: string
          p_workspace_state: Json
        }
        Returns: Json
      }
      copy_case: {
        Args: {
          p_source_case_id: string
          p_source_revision_id: string
          p_title: string
        }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      save_admin_lesson: { Args: { p_payload: Json }; Returns: string }
      save_admin_scenario: { Args: { p_payload: Json }; Returns: string }
      publish_practice_lesson: {
        Args: { p_lesson_id: string }
        Returns: undefined
      }
      publish_scenario: { Args: { p_scenario_id: string }; Returns: undefined }
      record_admin_content_audit: {
        Args: {
          p_action:
            | "create"
            | "update"
            | "publish"
            | "archive"
            | "delete"
            | "restore"
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      annotation_type: "arrow" | "circle" | "text" | "highlight"
      app_locale: "en" | "sr"
      app_theme: "system" | "light" | "dark"
      asset_kind:
        | "model"
        | "reference_model"
        | "thumbnail"
        | "tool_demo"
        | "screenshot"
        | "marketing"
        | "other"
      asset_scope: "platform" | "user"
      asset_status: "uploading" | "processing" | "ready" | "failed" | "archived"
      asset_visibility: "private" | "authenticated"
      attempt_status: "in_progress" | "completed" | "abandoned"
      cad_object_role:
        | "maxilla"
        | "mandible"
        | "antagonist"
        | "preop"
        | "prepared_tooth"
        | "tooth"
        | "crown"
        | "bridge"
        | "pontic"
        | "denture_tooth"
        | "denture_base"
        | "framework"
        | "splint"
        | "implant"
        | "abutment"
        | "model_base"
        | "reference"
        | "scan"
        | "other"
      case_source_type: "practice" | "scenario" | "import" | "blank"
      case_status: "draft" | "in_progress" | "completed" | "archived"
      content_status: "draft" | "published" | "archived"
      demo_kind: "interactive_3d" | "animation" | "image"
      difficulty_level: "foundation" | "beginner" | "intermediate" | "advanced"
      domain_reference_type:
        | "official_documentation"
        | "textbook"
        | "journal"
        | "course_material"
        | "expert_review"
        | "other"
      model_format: "stl" | "obj" | "ply" | "glb"
      model_unit: "mm" | "cm" | "m" | "unknown"
      reference_access_mode:
        | "always"
        | "after_first_attempt"
        | "after_submission"
        | "never"
      step_result_status: "not_started" | "in_progress" | "passed" | "failed"
      tool_category:
        | "navigation"
        | "scene"
        | "transform"
        | "mesh"
        | "sculpt"
        | "curve"
        | "analysis"
        | "occlusion"
        | "workflow"
        | "export"
      validation_outcome: "pass" | "warning" | "fail" | "not_applicable"
      validation_severity: "info" | "warning" | "error"
      validator_type:
        | "required_object"
        | "required_step"
        | "transform_range"
        | "no_intersection"
        | "max_deviation"
        | "contact_range"
        | "thickness_range"
        | "margin_complete"
        | "custom"
      verification_status: "unverified" | "source_reviewed" | "expert_verified"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      annotation_type: ["arrow", "circle", "text", "highlight"],
      app_locale: ["en", "sr"],
      app_theme: ["system", "light", "dark"],
      asset_kind: [
        "model",
        "reference_model",
        "thumbnail",
        "tool_demo",
        "screenshot",
        "marketing",
        "other",
      ],
      asset_scope: ["platform", "user"],
      asset_status: ["uploading", "processing", "ready", "failed", "archived"],
      asset_visibility: ["private", "authenticated"],
      attempt_status: ["in_progress", "completed", "abandoned"],
      cad_object_role: [
        "maxilla",
        "mandible",
        "antagonist",
        "preop",
        "prepared_tooth",
        "tooth",
        "crown",
        "bridge",
        "pontic",
        "denture_tooth",
        "denture_base",
        "framework",
        "splint",
        "implant",
        "abutment",
        "model_base",
        "reference",
        "scan",
        "other",
      ],
      case_source_type: ["practice", "scenario", "import", "blank"],
      case_status: ["draft", "in_progress", "completed", "archived"],
      content_status: ["draft", "published", "archived"],
      demo_kind: ["interactive_3d", "animation", "image"],
      difficulty_level: ["foundation", "beginner", "intermediate", "advanced"],
      domain_reference_type: [
        "official_documentation",
        "textbook",
        "journal",
        "course_material",
        "expert_review",
        "other",
      ],
      model_format: ["stl", "obj", "ply", "glb"],
      model_unit: ["mm", "cm", "m", "unknown"],
      reference_access_mode: [
        "always",
        "after_first_attempt",
        "after_submission",
        "never",
      ],
      step_result_status: ["not_started", "in_progress", "passed", "failed"],
      tool_category: [
        "navigation",
        "scene",
        "transform",
        "mesh",
        "sculpt",
        "curve",
        "analysis",
        "occlusion",
        "workflow",
        "export",
      ],
      validation_outcome: ["pass", "warning", "fail", "not_applicable"],
      validation_severity: ["info", "warning", "error"],
      validator_type: [
        "required_object",
        "required_step",
        "transform_range",
        "no_intersection",
        "max_deviation",
        "contact_range",
        "thickness_range",
        "margin_complete",
        "custom",
      ],
      verification_status: ["unverified", "source_reviewed", "expert_verified"],
    },
  },
} as const
