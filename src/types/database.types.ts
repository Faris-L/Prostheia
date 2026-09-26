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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
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

