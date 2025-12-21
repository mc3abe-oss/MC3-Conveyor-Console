/**
 * SUPABASE DATABASE TYPES
 *
 * Auto-generated types for Supabase tables
 * In production, generate these with: supabase gen types typescript
 *
 * For now, manually maintained to match schema.sql
 */

export type Json = string | number | boolean | null | { [key: string]: any } | any[];

export interface Database {
  public: {
    Tables: {
      model_versions: {
        Row: {
          id: string;
          model_key: string;
          version_number: number;
          status: 'draft' | 'published' | 'archived';
          formulas_hash: string;
          parameters: Json;
          created_by: string | null;
          created_at: string;
          published_at: string | null;
          published_by: string | null;
          archived_at: string | null;
          archived_by: string | null;
        };
        Insert: {
          id?: string;
          model_key: string;
          version_number: number;
          status: 'draft' | 'published' | 'archived';
          formulas_hash: string;
          parameters: Json;
          created_by?: string | null;
          created_at?: string;
          published_at?: string | null;
          published_by?: string | null;
          archived_at?: string | null;
          archived_by?: string | null;
        };
        Update: {
          id?: string;
          model_key?: string;
          version_number?: number;
          status?: 'draft' | 'published' | 'archived';
          formulas_hash?: string;
          parameters?: Json;
          created_by?: string | null;
          created_at?: string;
          published_at?: string | null;
          published_by?: string | null;
          archived_at?: string | null;
          archived_by?: string | null;
        };
      };
      calculation_runs: {
        Row: {
          id: string;
          model_version_id: string;
          inputs: Json;
          outputs: Json;
          warnings: Json | null;
          errors: Json | null;
          calculated_at: string;
          execution_time_ms: number | null;
          user_id: string | null;
          session_id: string | null;
          tags: string[] | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          model_version_id: string;
          inputs: Json;
          outputs: Json;
          warnings?: Json | null;
          errors?: Json | null;
          calculated_at?: string;
          execution_time_ms?: number | null;
          user_id?: string | null;
          session_id?: string | null;
          tags?: string[] | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          model_version_id?: string;
          inputs?: Json;
          outputs?: Json;
          warnings?: Json | null;
          errors?: Json | null;
          calculated_at?: string;
          execution_time_ms?: number | null;
          user_id?: string | null;
          session_id?: string | null;
          tags?: string[] | null;
          notes?: string | null;
        };
      };
      test_fixtures: {
        Row: {
          id: string;
          model_key: string;
          name: string;
          description: string | null;
          source: string | null;
          inputs: Json;
          expected_outputs: Json;
          tolerances: Json | null;
          active: boolean;
          created_at: string;
          created_by: string | null;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          model_key: string;
          name: string;
          description?: string | null;
          source?: string | null;
          inputs: Json;
          expected_outputs: Json;
          tolerances?: Json | null;
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          model_key?: string;
          name?: string;
          description?: string | null;
          source?: string | null;
          inputs?: Json;
          expected_outputs?: Json;
          tolerances?: Json | null;
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
      };
      fixture_validation_runs: {
        Row: {
          id: string;
          model_version_id: string;
          test_fixture_id: string;
          passed: boolean;
          failures: Json | null;
          actual_outputs: Json;
          validated_at: string;
          execution_time_ms: number | null;
        };
        Insert: {
          id?: string;
          model_version_id: string;
          test_fixture_id: string;
          passed: boolean;
          failures?: Json | null;
          actual_outputs: Json;
          validated_at?: string;
          execution_time_ms?: number | null;
        };
        Update: {
          id?: string;
          model_version_id?: string;
          test_fixture_id?: string;
          passed?: boolean;
          failures?: Json | null;
          actual_outputs?: Json;
          validated_at?: string;
          execution_time_ms?: number | null;
        };
      };
      parameter_override_presets: {
        Row: {
          id: string;
          model_key: string;
          name: string;
          description: string | null;
          parameters: Json;
          is_public: boolean;
          owner_id: string;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          model_key: string;
          name: string;
          description?: string | null;
          parameters: Json;
          is_public?: boolean;
          owner_id: string;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          model_key?: string;
          name?: string;
          description?: string | null;
          parameters?: Json;
          is_public?: boolean;
          owner_id?: string;
          created_at?: string;
          updated_at?: string | null;
        };
      };
    };
    Views: {};
    Functions: {
      get_published_version: {
        Args: { p_model_key: string };
        Returns: Database['public']['Tables']['model_versions']['Row'] | null;
      };
      get_next_version_number: {
        Args: { p_model_key: string };
        Returns: number;
      };
      all_fixtures_pass: {
        Args: { p_model_version_id: string };
        Returns: boolean;
      };
    };
    Enums: {};
  };
}
