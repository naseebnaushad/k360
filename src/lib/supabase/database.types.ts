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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      areas: {
        Row: {
          city_id: string
          created_at: string
          id: string
          kind: string
          lat: number
          lng: number
          local_name: string | null
          location: unknown
          name: string
          osm_id: number | null
          osm_type: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          city_id: string
          created_at?: string
          id?: string
          kind: string
          lat: number
          lng: number
          local_name?: string | null
          location?: unknown
          name: string
          osm_id?: number | null
          osm_type?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          city_id?: string
          created_at?: string
          id?: string
          kind?: string
          lat?: number
          lng?: number
          local_name?: string | null
          location?: unknown
          name?: string
          osm_id?: number | null
          osm_type?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          center_lat: number
          center_lng: number
          country_code: string
          created_at: string
          default_zoom: number
          id: string
          languages: string[]
          local_name: string | null
          name: string
          region: string
          service_radius_m: number
          slug: string
          status: Database["public"]["Enums"]["city_status"]
          tagline: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          center_lat: number
          center_lng: number
          country_code: string
          created_at?: string
          default_zoom?: number
          id?: string
          languages?: string[]
          local_name?: string | null
          name: string
          region: string
          service_radius_m?: number
          slug: string
          status?: Database["public"]["Enums"]["city_status"]
          tagline?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          center_lat?: number
          center_lng?: number
          country_code?: string
          created_at?: string
          default_zoom?: number
          id?: string
          languages?: string[]
          local_name?: string | null
          name?: string
          region?: string
          service_radius_m?: number
          slug?: string
          status?: Database["public"]["Enums"]["city_status"]
          tagline?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          city_id: string | null
          country_code: string
          created_at: string
          description: string | null
          id: string
          kind: string
          label: string
          number: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          city_id?: string | null
          country_code: string
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          label: string
          number: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          city_id?: string | null
          country_code?: string
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          label?: string
          number?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      place_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          keywords: string[]
          name: string
          osm_tags: string[]
          slug: string
          sort_order: number
          unnamed_label: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[]
          name: string
          osm_tags?: string[]
          slug: string
          sort_order?: number
          unnamed_label?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[]
          name?: string
          osm_tags?: string[]
          slug?: string
          sort_order?: number
          unnamed_label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      place_reports: {
        Row: {
          created_at: string
          id: string
          note: string | null
          place_id: string
          reason: Database["public"]["Enums"]["place_report_reason"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["place_report_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          place_id: string
          reason: Database["public"]["Enums"]["place_report_reason"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["place_report_status"]
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          place_id?: string
          reason?: Database["public"]["Enums"]["place_report_reason"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["place_report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "place_reports_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          address: string | null
          area_id: string | null
          category_id: string | null
          city_id: string
          created_at: string
          description: string | null
          id: string
          lat: number
          lng: number
          local_name: string | null
          location: unknown
          name: string
          opening_hours: string | null
          osm_id: number | null
          osm_type: string | null
          phone: string | null
          slug: string
          source: Database["public"]["Enums"]["place_source"]
          status: Database["public"]["Enums"]["place_status"]
          updated_at: string
          website: string | null
          weekly_hours: unknown
        }
        Insert: {
          address?: string | null
          area_id?: string | null
          category_id?: string | null
          city_id: string
          created_at?: string
          description?: string | null
          id?: string
          lat: number
          lng: number
          local_name?: string | null
          location?: unknown
          name: string
          opening_hours?: string | null
          osm_id?: number | null
          osm_type?: string | null
          phone?: string | null
          slug: string
          source?: Database["public"]["Enums"]["place_source"]
          status?: Database["public"]["Enums"]["place_status"]
          updated_at?: string
          website?: string | null
          weekly_hours?: unknown
        }
        Update: {
          address?: string | null
          area_id?: string | null
          category_id?: string | null
          city_id?: string
          created_at?: string
          description?: string | null
          id?: string
          lat?: number
          lng?: number
          local_name?: string | null
          location?: unknown
          name?: string
          opening_hours?: string | null
          osm_id?: number | null
          osm_type?: string | null
          phone?: string | null
          slug?: string
          source?: Database["public"]["Enums"]["place_source"]
          status?: Database["public"]["Enums"]["place_status"]
          updated_at?: string
          website?: string | null
          weekly_hours?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "places_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "places_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "place_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "places_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      city_area_counts: {
        Row: {
          area_id: string | null
          city_id: string | null
          place_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "places_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "places_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      city_category_counts: {
        Row: {
          category_id: string | null
          city_id: string | null
          place_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "places_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "place_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "places_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      find_places: {
        Args: {
          p_area_id?: string
          p_category_ids?: string[]
          p_city_id: string
          p_has_hours?: boolean
          p_has_phone?: boolean
          p_has_website?: boolean
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_offset?: number
          p_open_at?: number
          p_query?: string
          p_radius_m?: number
          p_sort?: string
        }
        Returns: {
          address: string
          area_name: string
          category_name: string
          category_slug: string
          distance_m: number
          has_hours: boolean
          has_phone: boolean
          has_website: boolean
          id: string
          lat: number
          lng: number
          local_name: string
          name: string
          opening_hours: string
          rank: number
          slug: string
          total_count: number
        }[]
      }
      places_near: {
        Args: {
          p_city_id: string
          p_exclude_id?: string
          p_lat: number
          p_limit?: number
          p_lng: number
          p_radius_m?: number
        }
        Returns: {
          address: string
          category_name: string
          category_slug: string
          distance_m: number
          id: string
          lat: number
          lng: number
          local_name: string
          name: string
          slug: string
        }[]
      }
    }
    Enums: {
      city_status: "draft" | "live" | "archived"
      place_report_reason:
        | "closed"
        | "wrong_location"
        | "wrong_contact"
        | "wrong_hours"
        | "duplicate"
        | "other"
      place_report_status: "open" | "resolved" | "dismissed"
      place_source: "community" | "osm"
      place_status: "published" | "hidden"
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
      city_status: ["draft", "live", "archived"],
      place_report_reason: [
        "closed",
        "wrong_location",
        "wrong_contact",
        "wrong_hours",
        "duplicate",
        "other",
      ],
      place_report_status: ["open", "resolved", "dismissed"],
      place_source: ["community", "osm"],
      place_status: ["published", "hidden"],
    },
  },
} as const
