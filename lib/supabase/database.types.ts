// Types for the tables in supabase/migrations, in the shape the Supabase CLI
// generates (`supabase gen types typescript`). Written by hand until the
// project exists; regenerate and replace this file once it does.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      beta_readers: {
        Row: { email: string; added_at: string };
        Insert: { email: string; added_at?: string };
        Update: { email?: string; added_at?: string };
        Relationships: [];
      };
      states: {
        Row: { code: string; name: string; enabled: boolean };
        Insert: { code: string; name: string; enabled?: boolean };
        Update: { code?: string; name?: string; enabled?: boolean };
        Relationships: [];
      };
      elections: {
        Row: {
          id: string;
          state_code: string;
          slug: string;
          name: string;
          election_date: string;
          type: string;
        };
        Insert: {
          id?: string;
          state_code: string;
          slug: string;
          name: string;
          election_date: string;
          type: string;
        };
        Update: {
          id?: string;
          state_code?: string;
          slug?: string;
          name?: string;
          election_date?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "elections_state_code_fkey";
            columns: ["state_code"];
            isOneToOne: false;
            referencedRelation: "states";
            referencedColumns: ["code"];
          },
        ];
      };
      races: {
        Row: {
          id: string;
          election_id: string;
          slug: string;
          office: string;
          district: number | null;
          level: string;
          partisan: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          election_id: string;
          slug: string;
          office: string;
          district?: number | null;
          level: string;
          partisan?: boolean;
          sort_order?: number;
        };
        Update: {
          id?: string;
          election_id?: string;
          slug?: string;
          office?: string;
          district?: number | null;
          level?: string;
          partisan?: boolean;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "races_election_id_fkey";
            columns: ["election_id"];
            isOneToOne: false;
            referencedRelation: "elections";
            referencedColumns: ["id"];
          },
        ];
      };
      candidates: {
        Row: {
          id: string;
          race_id: string;
          slug: string;
          name: string;
          party: string | null;
          ballot_designation: string | null;
          incumbent: boolean;
          photo_url: string | null;
          search_terms: string[];
          sort_order: number;
        };
        Insert: {
          id?: string;
          race_id: string;
          slug: string;
          name: string;
          party?: string | null;
          ballot_designation?: string | null;
          incumbent?: boolean;
          photo_url?: string | null;
          search_terms?: string[];
          sort_order?: number;
        };
        Update: {
          id?: string;
          race_id?: string;
          slug?: string;
          name?: string;
          party?: string | null;
          ballot_designation?: string | null;
          incumbent?: boolean;
          photo_url?: string | null;
          search_terms?: string[];
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "candidates_race_id_fkey";
            columns: ["race_id"];
            isOneToOne: false;
            referencedRelation: "races";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          home_state: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          home_state?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          home_state?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_home_state_fkey";
            columns: ["home_state"];
            isOneToOne: false;
            referencedRelation: "states";
            referencedColumns: ["code"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_beta_reader: {
        Args: never;
        Returns: boolean;
      };
      set_home_state: {
        Args: { state_code: string };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
