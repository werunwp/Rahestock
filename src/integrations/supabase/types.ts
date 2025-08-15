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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      business_settings: {
        Row: {
          address: string | null
          address_line1: string | null
          address_line2: string | null
          brand_color: string | null
          business_hours: string | null
          business_name: string
          created_at: string
          created_by: string | null
          email: string | null
          facebook: string | null
          id: string
          invoice_footer_message: string | null
          invoice_prefix: string | null
          logo_url: string | null
          phone: string | null
          primary_email: string | null
          secondary_email: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          brand_color?: string | null
          business_hours?: string | null
          business_name?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          invoice_footer_message?: string | null
          invoice_prefix?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_email?: string | null
          secondary_email?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          brand_color?: string | null
          business_hours?: string | null
          business_name?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          invoice_footer_message?: string | null
          invoice_prefix?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_email?: string | null
          secondary_email?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string | null
          created_by: string | null
          id: string
          last_purchase_date: string | null
          name: string
          order_count: number | null
          phone: string | null
          status: string | null
          tags: string[] | null
          total_spent: number | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_purchase_date?: string | null
          name: string
          order_count?: number | null
          phone?: string | null
          status?: string | null
          tags?: string[] | null
          total_spent?: number | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          last_purchase_date?: string | null
          name?: string
          order_count?: number | null
          phone?: string | null
          status?: string | null
          tags?: string[] | null
          total_spent?: number | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      dismissed_alerts: {
        Row: {
          alert_id: string
          created_at: string
          dismissed_at: string
          id: string
          user_id: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          dismissed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          dismissed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          product_id: string
          quantity: number
          reason: string | null
          type: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          product_id: string
          quantity: number
          reason?: string | null
          type: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          type?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attribute_values: {
        Row: {
          attribute_id: string
          created_at: string
          id: string
          value: string
        }
        Insert: {
          attribute_id: string
          created_at?: string
          id?: string
          value: string
        }
        Update: {
          attribute_id?: string
          created_at?: string
          id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "product_attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attributes: {
        Row: {
          created_at: string
          id: string
          name: string
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json
          cost: number | null
          created_at: string
          id: string
          image_url: string | null
          low_stock_threshold: number | null
          product_id: string
          rate: number | null
          sku: string | null
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          attributes: Json
          cost?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          low_stock_threshold?: number | null
          product_id: string
          rate?: number | null
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          attributes?: Json
          cost?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          low_stock_threshold?: number | null
          product_id?: string
          rate?: number | null
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          color: string | null
          cost: number | null
          created_at: string | null
          created_by: string | null
          has_variants: boolean
          id: string
          image_url: string | null
          low_stock_threshold: number | null
          name: string
          rate: number
          size: string | null
          sku: string | null
          stock_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          has_variants?: boolean
          id?: string
          image_url?: string | null
          low_stock_threshold?: number | null
          name: string
          rate: number
          size?: string | null
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          has_variants?: boolean
          id?: string
          image_url?: string | null
          low_stock_threshold?: number | null
          name?: string
          rate?: number
          size?: string | null
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount_due: number | null
          amount_paid: number | null
          created_at: string | null
          created_by: string | null
          customer_address: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          customer_whatsapp: string | null
          discount_amount: number | null
          discount_percent: number | null
          grand_total: number
          id: string
          invoice_number: string
          payment_method: string
          payment_status: string | null
          subtotal: number
          updated_at: string | null
        }
        Insert: {
          amount_due?: number | null
          amount_paid?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_address?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_whatsapp?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          grand_total: number
          id?: string
          invoice_number: string
          payment_method: string
          payment_status?: string | null
          subtotal: number
          updated_at?: string | null
        }
        Update: {
          amount_due?: number | null
          amount_paid?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_address?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_whatsapp?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          grand_total?: number
          id?: string
          invoice_number?: string
          payment_method?: string
          payment_status?: string | null
          subtotal?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          product_name: string
          quantity: number
          rate: number
          sale_id: string
          total: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          product_name: string
          quantity: number
          rate: number
          sale_id: string
          total: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          rate?: number
          sale_id?: string
          total?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          currency_code: string
          currency_symbol: string
          date_format: string
          id: string
          time_format: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          date_format?: string
          id?: string
          time_format?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          date_format?: string
          id?: string
          time_format?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          compact_view: boolean
          created_at: string
          dark_mode: boolean
          email_notifications: boolean
          id: string
          low_stock_alerts: boolean
          sales_reports: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          compact_view?: boolean
          created_at?: string
          dark_mode?: boolean
          email_notifications?: boolean
          id?: string
          low_stock_alerts?: boolean
          sales_reports?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          compact_view?: boolean
          created_at?: string
          dark_mode?: boolean
          email_notifications?: boolean
          id?: string
          low_stock_alerts?: boolean
          sales_reports?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      woocommerce_connections: {
        Row: {
          consumer_key: string
          consumer_secret: string
          created_at: string
          id: string
          is_active: boolean
          last_import_at: string | null
          site_name: string
          site_url: string
          total_products_imported: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          consumer_key: string
          consumer_secret: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_import_at?: string | null
          site_name: string
          site_url: string
          total_products_imported?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          consumer_key?: string
          consumer_secret?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_import_at?: string | null
          site_name?: string
          site_url?: string
          total_products_imported?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      woocommerce_import_logs: {
        Row: {
          completed_at: string | null
          connection_id: string
          created_at: string
          error_message: string | null
          failed_products: number | null
          id: string
          imported_products: number | null
          started_at: string
          status: string
          total_products: number | null
        }
        Insert: {
          completed_at?: string | null
          connection_id: string
          created_at?: string
          error_message?: string | null
          failed_products?: number | null
          id?: string
          imported_products?: number | null
          started_at?: string
          status: string
          total_products?: number | null
        }
        Update: {
          completed_at?: string | null
          connection_id?: string
          created_at?: string
          error_message?: string | null
          failed_products?: number | null
          id?: string
          imported_products?: number | null
          started_at?: string
          status?: string
          total_products?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "woocommerce_import_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "woocommerce_connections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      begin_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      commit_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_invoice_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      rollback_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      user_role: "admin" | "manager" | "staff" | "viewer"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      user_role: ["admin", "manager", "staff", "viewer"],
    },
  },
} as const
