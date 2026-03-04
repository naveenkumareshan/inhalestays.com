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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      adjustment_entries: {
        Row: {
          amount: number
          applied_at: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          partner_id: string
          settlement_id: string | null
          status: string
          type: string
        }
        Insert: {
          amount?: number
          applied_at?: string | null
          created_at?: string
          created_by: string
          description?: string
          id?: string
          partner_id: string
          settlement_id?: string | null
          status?: string
          type?: string
        }
        Update: {
          amount?: number
          applied_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          partner_id?: string
          settlement_id?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "adjustment_entries_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjustment_entries_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "partner_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_employees: {
        Row: {
          admin_user_id: string
          created_at: string
          email: string
          employee_user_id: string | null
          id: string
          name: string
          permissions: string[]
          phone: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          email?: string
          employee_user_id?: string | null
          id?: string
          name?: string
          permissions?: string[]
          phone?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          email?: string
          employee_user_id?: string | null
          id?: string
          name?: string
          permissions?: string[]
          phone?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      areas: {
        Row: {
          city_id: string
          created_at: string
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          pincode: string | null
        }
        Insert: {
          city_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          pincode?: string | null
        }
        Update: {
          city_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          pincode?: string | null
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
      banners: {
        Row: {
          created_at: string
          display_order: number
          expire_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          start_date: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          expire_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          start_date?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          expire_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          start_date?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_duration: string | null
          cabin_id: string | null
          check_in_documents: Json | null
          check_in_notes: string | null
          checked_in_at: string | null
          checked_in_by: string | null
          collected_by: string | null
          collected_by_name: string
          created_at: string | null
          customer_name: string
          discount_amount: number
          discount_reason: string
          duration_count: string | null
          end_date: string | null
          id: string
          locker_included: boolean
          locker_price: number
          locker_refund_amount: number
          locker_refund_date: string | null
          locker_refund_method: string
          locker_refund_transaction_id: string
          locker_refunded: boolean
          payment_method: string
          payment_proof_url: string | null
          payment_status: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          seat_id: string | null
          seat_number: number | null
          serial_number: string | null
          settlement_id: string | null
          settlement_status: string
          slot_id: string | null
          start_date: string | null
          total_price: number | null
          transaction_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booking_duration?: string | null
          cabin_id?: string | null
          check_in_documents?: Json | null
          check_in_notes?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          collected_by?: string | null
          collected_by_name?: string
          created_at?: string | null
          customer_name?: string
          discount_amount?: number
          discount_reason?: string
          duration_count?: string | null
          end_date?: string | null
          id?: string
          locker_included?: boolean
          locker_price?: number
          locker_refund_amount?: number
          locker_refund_date?: string | null
          locker_refund_method?: string
          locker_refund_transaction_id?: string
          locker_refunded?: boolean
          payment_method?: string
          payment_proof_url?: string | null
          payment_status?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          seat_id?: string | null
          seat_number?: number | null
          serial_number?: string | null
          settlement_id?: string | null
          settlement_status?: string
          slot_id?: string | null
          start_date?: string | null
          total_price?: number | null
          transaction_id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booking_duration?: string | null
          cabin_id?: string | null
          check_in_documents?: Json | null
          check_in_notes?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          collected_by?: string | null
          collected_by_name?: string
          created_at?: string | null
          customer_name?: string
          discount_amount?: number
          discount_reason?: string
          duration_count?: string | null
          end_date?: string | null
          id?: string
          locker_included?: boolean
          locker_price?: number
          locker_refund_amount?: number
          locker_refund_date?: string | null
          locker_refund_method?: string
          locker_refund_transaction_id?: string
          locker_refunded?: boolean
          payment_method?: string
          payment_proof_url?: string | null
          payment_status?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          seat_id?: string | null
          seat_number?: number | null
          serial_number?: string | null
          settlement_id?: string | null
          settlement_status?: string
          slot_id?: string | null
          start_date?: string | null
          total_price?: number | null
          transaction_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_cabin_id_fkey"
            columns: ["cabin_id"]
            isOneToOne: false
            referencedRelation: "cabins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "partner_settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "cabin_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cabin_slots: {
        Row: {
          cabin_id: string
          created_at: string
          end_time: string
          id: string
          is_active: boolean
          name: string
          price: number
          start_time: string
        }
        Insert: {
          cabin_id: string
          created_at?: string
          end_time: string
          id?: string
          is_active?: boolean
          name: string
          price?: number
          start_time: string
        }
        Update: {
          cabin_id?: string
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "cabin_slots_cabin_id_fkey"
            columns: ["cabin_id"]
            isOneToOne: false
            referencedRelation: "cabins"
            referencedColumns: ["id"]
          },
        ]
      }
      cabins: {
        Row: {
          advance_applicable_durations: Json
          advance_auto_cancel: boolean
          advance_booking_enabled: boolean
          advance_flat_amount: number | null
          advance_percentage: number
          advance_use_flat: boolean
          advance_validity_days: number
          allowed_durations: Json
          amenities: string[] | null
          area: string | null
          capacity: number | null
          category: string | null
          city: string | null
          closing_time: string
          created_at: string | null
          created_by: string | null
          description: string | null
          floors: Json | null
          full_address: string | null
          grid_size: number
          id: string
          image_url: string | null
          images: string[] | null
          is_24_hours: boolean
          is_active: boolean | null
          is_approved: boolean
          is_booking_active: boolean
          layout_image: string | null
          locker_available: boolean
          locker_mandatory: boolean
          locker_mandatory_durations: Json
          locker_price: number
          name: string
          opening_time: string
          payment_proof_required: boolean | null
          price: number | null
          room_elements: Json | null
          room_height: number
          room_width: number
          sections: Json
          serial_number: string | null
          slots_applicable_durations: Json
          slots_enabled: boolean
          state: string | null
          working_days: Json
        }
        Insert: {
          advance_applicable_durations?: Json
          advance_auto_cancel?: boolean
          advance_booking_enabled?: boolean
          advance_flat_amount?: number | null
          advance_percentage?: number
          advance_use_flat?: boolean
          advance_validity_days?: number
          allowed_durations?: Json
          amenities?: string[] | null
          area?: string | null
          capacity?: number | null
          category?: string | null
          city?: string | null
          closing_time?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          floors?: Json | null
          full_address?: string | null
          grid_size?: number
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_24_hours?: boolean
          is_active?: boolean | null
          is_approved?: boolean
          is_booking_active?: boolean
          layout_image?: string | null
          locker_available?: boolean
          locker_mandatory?: boolean
          locker_mandatory_durations?: Json
          locker_price?: number
          name: string
          opening_time?: string
          payment_proof_required?: boolean | null
          price?: number | null
          room_elements?: Json | null
          room_height?: number
          room_width?: number
          sections?: Json
          serial_number?: string | null
          slots_applicable_durations?: Json
          slots_enabled?: boolean
          state?: string | null
          working_days?: Json
        }
        Update: {
          advance_applicable_durations?: Json
          advance_auto_cancel?: boolean
          advance_booking_enabled?: boolean
          advance_flat_amount?: number | null
          advance_percentage?: number
          advance_use_flat?: boolean
          advance_validity_days?: number
          allowed_durations?: Json
          amenities?: string[] | null
          area?: string | null
          capacity?: number | null
          category?: string | null
          city?: string | null
          closing_time?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          floors?: Json | null
          full_address?: string | null
          grid_size?: number
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_24_hours?: boolean
          is_active?: boolean | null
          is_approved?: boolean
          is_booking_active?: boolean
          layout_image?: string | null
          locker_available?: boolean
          locker_mandatory?: boolean
          locker_mandatory_durations?: Json
          locker_price?: number
          name?: string
          opening_time?: string
          payment_proof_required?: boolean | null
          price?: number | null
          room_elements?: Json | null
          room_height?: number
          room_width?: number
          sections?: Json
          serial_number?: string | null
          slots_applicable_durations?: Json
          slots_enabled?: boolean
          state?: string | null
          working_days?: Json
        }
        Relationships: []
      }
      cities: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          state_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          state_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          state_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          booking_id: string | null
          cabin_id: string | null
          category: string
          created_at: string
          description: string
          hostel_id: string | null
          id: string
          module: string | null
          priority: string
          responded_at: string | null
          responded_by: string | null
          response: string | null
          serial_number: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          cabin_id?: string | null
          category?: string
          created_at?: string
          description: string
          hostel_id?: string | null
          id?: string
          module?: string | null
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          serial_number?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          cabin_id?: string | null
          category?: string
          created_at?: string
          description?: string
          hostel_id?: string | null
          id?: string
          module?: string | null
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          serial_number?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_cabin_id_fkey"
            columns: ["cabin_id"]
            isOneToOne: false
            referencedRelation: "cabins"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_for: string[] | null
          applies_to: string
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string
          exclude_users: string[] | null
          first_time_user_only: boolean | null
          generated_by: string | null
          id: string
          is_active: boolean | null
          is_referral_coupon: boolean | null
          max_discount_amount: number | null
          min_order_amount: number | null
          name: string
          partner_id: string | null
          referral_type: string | null
          scope: string | null
          specific_users: string[] | null
          start_date: string
          type: string
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          used_by: Json | null
          user_usage_limit: number | null
          value: number
        }
        Insert: {
          applicable_for?: string[] | null
          applies_to?: string
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date: string
          exclude_users?: string[] | null
          first_time_user_only?: boolean | null
          generated_by?: string | null
          id?: string
          is_active?: boolean | null
          is_referral_coupon?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          name: string
          partner_id?: string | null
          referral_type?: string | null
          scope?: string | null
          specific_users?: string[] | null
          start_date: string
          type: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          used_by?: Json | null
          user_usage_limit?: number | null
          value: number
        }
        Update: {
          applicable_for?: string[] | null
          applies_to?: string
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string
          exclude_users?: string[] | null
          first_time_user_only?: boolean | null
          generated_by?: string | null
          id?: string
          is_active?: boolean | null
          is_referral_coupon?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          name?: string
          partner_id?: string | null
          referral_type?: string | null
          scope?: string | null
          specific_users?: string[] | null
          start_date?: string
          type?: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          used_by?: Json | null
          user_usage_limit?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      due_payments: {
        Row: {
          amount: number
          collected_by: string | null
          collected_by_name: string
          created_at: string
          due_id: string
          id: string
          notes: string
          payment_method: string
          payment_proof_url: string | null
          transaction_id: string
        }
        Insert: {
          amount?: number
          collected_by?: string | null
          collected_by_name?: string
          created_at?: string
          due_id: string
          id?: string
          notes?: string
          payment_method?: string
          payment_proof_url?: string | null
          transaction_id?: string
        }
        Update: {
          amount?: number
          collected_by?: string | null
          collected_by_name?: string
          created_at?: string
          due_id?: string
          id?: string
          notes?: string
          payment_method?: string
          payment_proof_url?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "due_payments_due_id_fkey"
            columns: ["due_id"]
            isOneToOne: false
            referencedRelation: "dues"
            referencedColumns: ["id"]
          },
        ]
      }
      dues: {
        Row: {
          advance_paid: number
          booking_id: string | null
          cabin_id: string | null
          created_at: string
          due_amount: number
          due_date: string
          id: string
          paid_amount: number
          proportional_end_date: string | null
          seat_id: string | null
          serial_number: string | null
          status: string
          total_fee: number
          updated_at: string
          user_id: string
        }
        Insert: {
          advance_paid?: number
          booking_id?: string | null
          cabin_id?: string | null
          created_at?: string
          due_amount?: number
          due_date: string
          id?: string
          paid_amount?: number
          proportional_end_date?: string | null
          seat_id?: string | null
          serial_number?: string | null
          status?: string
          total_fee?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          advance_paid?: number
          booking_id?: string | null
          cabin_id?: string | null
          created_at?: string
          due_amount?: number
          due_date?: string
          id?: string
          paid_amount?: number
          proportional_end_date?: string | null
          seat_id?: string | null
          serial_number?: string | null
          status?: string
          total_fee?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dues_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dues_cabin_id_fkey"
            columns: ["cabin_id"]
            isOneToOne: false
            referencedRelation: "cabins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dues_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dues_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_bed_categories: {
        Row: {
          created_at: string
          hostel_id: string
          id: string
          name: string
          price_adjustment: number
        }
        Insert: {
          created_at?: string
          hostel_id: string
          id?: string
          name: string
          price_adjustment?: number
        }
        Update: {
          created_at?: string
          hostel_id?: string
          id?: string
          name?: string
          price_adjustment?: number
        }
        Relationships: [
          {
            foreignKeyName: "hostel_bed_categories_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_beds: {
        Row: {
          amenities: string[]
          bed_number: number
          block_reason: string | null
          category: string | null
          created_at: string
          id: string
          is_available: boolean
          is_blocked: boolean
          position_x: number
          position_y: number
          price_override: number | null
          room_id: string
          rotation: number
          sharing_option_id: string
          sharing_type_id: string | null
        }
        Insert: {
          amenities?: string[]
          bed_number?: number
          block_reason?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_available?: boolean
          is_blocked?: boolean
          position_x?: number
          position_y?: number
          price_override?: number | null
          room_id: string
          rotation?: number
          sharing_option_id: string
          sharing_type_id?: string | null
        }
        Update: {
          amenities?: string[]
          bed_number?: number
          block_reason?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_available?: boolean
          is_blocked?: boolean
          position_x?: number
          position_y?: number
          price_override?: number | null
          room_id?: string
          rotation?: number
          sharing_option_id?: string
          sharing_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hostel_beds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hostel_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_beds_sharing_option_id_fkey"
            columns: ["sharing_option_id"]
            isOneToOne: false
            referencedRelation: "hostel_sharing_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_beds_sharing_type_id_fkey"
            columns: ["sharing_type_id"]
            isOneToOne: false
            referencedRelation: "hostel_sharing_types"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_bookings: {
        Row: {
          advance_amount: number
          bed_id: string
          booking_duration: string
          cancellation_reason: string | null
          cancelled_at: string | null
          check_in_documents: Json | null
          check_in_notes: string | null
          checked_in_at: string | null
          checked_in_by: string | null
          collected_by: string | null
          collected_by_name: string | null
          created_at: string
          duration_count: number
          end_date: string
          food_amount: number
          food_opted: boolean
          food_policy_type: string
          food_price_snapshot: number
          hostel_id: string
          id: string
          payment_method: string | null
          payment_proof_url: string | null
          payment_status: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          remaining_amount: number
          room_id: string
          security_deposit: number
          serial_number: string | null
          settlement_id: string | null
          settlement_status: string
          sharing_option_id: string
          start_date: string
          status: string
          total_amount_snapshot: number
          total_price: number
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          advance_amount?: number
          bed_id: string
          booking_duration?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          check_in_documents?: Json | null
          check_in_notes?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          collected_by?: string | null
          collected_by_name?: string | null
          created_at?: string
          duration_count?: number
          end_date: string
          food_amount?: number
          food_opted?: boolean
          food_policy_type?: string
          food_price_snapshot?: number
          hostel_id: string
          id?: string
          payment_method?: string | null
          payment_proof_url?: string | null
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          remaining_amount?: number
          room_id: string
          security_deposit?: number
          serial_number?: string | null
          settlement_id?: string | null
          settlement_status?: string
          sharing_option_id: string
          start_date: string
          status?: string
          total_amount_snapshot?: number
          total_price?: number
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          advance_amount?: number
          bed_id?: string
          booking_duration?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          check_in_documents?: Json | null
          check_in_notes?: string | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          collected_by?: string | null
          collected_by_name?: string | null
          created_at?: string
          duration_count?: number
          end_date?: string
          food_amount?: number
          food_opted?: boolean
          food_policy_type?: string
          food_price_snapshot?: number
          hostel_id?: string
          id?: string
          payment_method?: string | null
          payment_proof_url?: string | null
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          remaining_amount?: number
          room_id?: string
          security_deposit?: number
          serial_number?: string | null
          settlement_id?: string | null
          settlement_status?: string
          sharing_option_id?: string
          start_date?: string
          status?: string
          total_amount_snapshot?: number
          total_price?: number
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hostel_bookings_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "hostel_beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_bookings_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hostel_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_bookings_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "partner_settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_bookings_sharing_option_id_fkey"
            columns: ["sharing_option_id"]
            isOneToOne: false
            referencedRelation: "hostel_sharing_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_due_payments: {
        Row: {
          amount: number
          collected_by: string | null
          collected_by_name: string
          created_at: string
          due_id: string
          id: string
          notes: string
          payment_method: string
          payment_proof_url: string | null
          transaction_id: string
        }
        Insert: {
          amount?: number
          collected_by?: string | null
          collected_by_name?: string
          created_at?: string
          due_id: string
          id?: string
          notes?: string
          payment_method?: string
          payment_proof_url?: string | null
          transaction_id?: string
        }
        Update: {
          amount?: number
          collected_by?: string | null
          collected_by_name?: string
          created_at?: string
          due_id?: string
          id?: string
          notes?: string
          payment_method?: string
          payment_proof_url?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hostel_due_payments_due_id_fkey"
            columns: ["due_id"]
            isOneToOne: false
            referencedRelation: "hostel_dues"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_dues: {
        Row: {
          advance_paid: number
          bed_id: string | null
          booking_id: string | null
          created_at: string
          due_amount: number
          due_date: string
          food_amount: number
          hostel_id: string
          id: string
          paid_amount: number
          proportional_end_date: string | null
          room_id: string | null
          serial_number: string | null
          status: string
          total_fee: number
          updated_at: string
          user_id: string
        }
        Insert: {
          advance_paid?: number
          bed_id?: string | null
          booking_id?: string | null
          created_at?: string
          due_amount?: number
          due_date: string
          food_amount?: number
          hostel_id: string
          id?: string
          paid_amount?: number
          proportional_end_date?: string | null
          room_id?: string | null
          serial_number?: string | null
          status?: string
          total_fee?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          advance_paid?: number
          bed_id?: string | null
          booking_id?: string | null
          created_at?: string
          due_amount?: number
          due_date?: string
          food_amount?: number
          hostel_id?: string
          id?: string
          paid_amount?: number
          proportional_end_date?: string | null
          room_id?: string | null
          serial_number?: string | null
          status?: string
          total_fee?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_hostel_dues_bed"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "hostel_beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_hostel_dues_booking"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hostel_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_hostel_dues_hostel"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_hostel_dues_room"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hostel_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_hostel_dues_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_floors: {
        Row: {
          created_at: string
          floor_order: number
          hostel_id: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          floor_order?: number
          hostel_id: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          floor_order?: number
          hostel_id?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "hostel_floors_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_food_menu: {
        Row: {
          created_at: string
          day_of_week: string
          display_order: number
          hostel_id: string
          id: string
          is_active: boolean
          item_name: string
          meal_type: string
        }
        Insert: {
          created_at?: string
          day_of_week?: string
          display_order?: number
          hostel_id: string
          id?: string
          is_active?: boolean
          item_name: string
          meal_type?: string
        }
        Update: {
          created_at?: string
          day_of_week?: string
          display_order?: number
          hostel_id?: string
          id?: string
          is_active?: boolean
          item_name?: string
          meal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hostel_food_menu_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_receipts: {
        Row: {
          amount: number
          booking_id: string | null
          collected_by: string | null
          collected_by_name: string | null
          created_at: string
          hostel_id: string
          id: string
          notes: string | null
          payment_method: string
          payment_proof_url: string | null
          receipt_type: string
          serial_number: string | null
          settlement_id: string | null
          settlement_status: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          booking_id?: string | null
          collected_by?: string | null
          collected_by_name?: string | null
          created_at?: string
          hostel_id: string
          id?: string
          notes?: string | null
          payment_method?: string
          payment_proof_url?: string | null
          receipt_type?: string
          serial_number?: string | null
          settlement_id?: string | null
          settlement_status?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          collected_by?: string | null
          collected_by_name?: string | null
          created_at?: string
          hostel_id?: string
          id?: string
          notes?: string | null
          payment_method?: string
          payment_proof_url?: string | null
          receipt_type?: string
          serial_number?: string | null
          settlement_id?: string | null
          settlement_status?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hostel_receipts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hostel_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_receipts_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_receipts_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "partner_settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_receipts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_rooms: {
        Row: {
          amenities: string[] | null
          category: string
          category_id: string | null
          created_at: string
          description: string | null
          floor: number
          floor_id: string | null
          hostel_id: string
          id: string
          image_url: string | null
          images: string[] | null
          is_active: boolean
          layout_image: string | null
          layout_image_opacity: number
          room_height: number
          room_number: string
          room_width: number
          sharing_type_id: string | null
        }
        Insert: {
          amenities?: string[] | null
          category?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          floor?: number
          floor_id?: string | null
          hostel_id: string
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean
          layout_image?: string | null
          layout_image_opacity?: number
          room_height?: number
          room_number?: string
          room_width?: number
          sharing_type_id?: string | null
        }
        Update: {
          amenities?: string[] | null
          category?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          floor?: number
          floor_id?: string | null
          hostel_id?: string
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean
          layout_image?: string | null
          layout_image_opacity?: number
          room_height?: number
          room_number?: string
          room_width?: number
          sharing_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hostel_rooms_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "hostel_bed_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_rooms_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "hostel_floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_rooms_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_rooms_sharing_type_id_fkey"
            columns: ["sharing_type_id"]
            isOneToOne: false
            referencedRelation: "hostel_sharing_types"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_sharing_options: {
        Row: {
          capacity: number
          created_at: string
          food_policy_override: string
          food_price_override: number | null
          id: string
          is_active: boolean
          price_daily: number
          price_monthly: number
          room_id: string
          total_beds: number
          type: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          food_policy_override?: string
          food_price_override?: number | null
          id?: string
          is_active?: boolean
          price_daily?: number
          price_monthly?: number
          room_id: string
          total_beds?: number
          type?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          food_policy_override?: string
          food_price_override?: number | null
          id?: string
          is_active?: boolean
          price_daily?: number
          price_monthly?: number
          room_id?: string
          total_beds?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hostel_sharing_options_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hostel_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_sharing_types: {
        Row: {
          capacity: number
          created_at: string
          hostel_id: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          hostel_id: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          capacity?: number
          created_at?: string
          hostel_id?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "hostel_sharing_types_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_stay_packages: {
        Row: {
          created_at: string
          deposit_months: number
          description: string | null
          discount_percentage: number
          display_order: number
          duration_type: string
          hostel_id: string
          id: string
          is_active: boolean
          lock_in_months: number
          min_months: number
          name: string
          notice_months: number
        }
        Insert: {
          created_at?: string
          deposit_months?: number
          description?: string | null
          discount_percentage?: number
          display_order?: number
          duration_type?: string
          hostel_id: string
          id?: string
          is_active?: boolean
          lock_in_months?: number
          min_months?: number
          name?: string
          notice_months?: number
        }
        Update: {
          created_at?: string
          deposit_months?: number
          description?: string | null
          discount_percentage?: number
          display_order?: number
          duration_type?: string
          hostel_id?: string
          id?: string
          is_active?: boolean
          lock_in_months?: number
          min_months?: number
          name?: string
          notice_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "hostel_stay_packages_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      hostels: {
        Row: {
          advance_applicable_durations: Json
          advance_booking_enabled: boolean
          advance_flat_amount: number | null
          advance_percentage: number
          advance_use_flat: boolean
          allowed_durations: Json
          amenities: string[] | null
          area_id: string | null
          average_rating: number
          cancellation_window_hours: number
          city_id: string | null
          commission_percentage: number
          contact_email: string | null
          contact_phone: string | null
          coordinates_lat: number | null
          coordinates_lng: number | null
          created_at: string
          created_by: string | null
          description: string | null
          food_enabled: boolean
          food_menu_image: string | null
          food_policy_type: string
          food_price_monthly: number
          gender: string
          id: string
          images: string[] | null
          is_active: boolean
          is_approved: boolean
          is_booking_active: boolean
          locality: string | null
          location: string | null
          logo_image: string | null
          max_advance_booking_days: number
          name: string
          payment_proof_required: boolean | null
          refund_policy: string | null
          review_count: number
          security_deposit: number
          serial_number: string | null
          show_food_price: boolean
          state_id: string | null
          stay_type: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          advance_applicable_durations?: Json
          advance_booking_enabled?: boolean
          advance_flat_amount?: number | null
          advance_percentage?: number
          advance_use_flat?: boolean
          allowed_durations?: Json
          amenities?: string[] | null
          area_id?: string | null
          average_rating?: number
          cancellation_window_hours?: number
          city_id?: string | null
          commission_percentage?: number
          contact_email?: string | null
          contact_phone?: string | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          food_enabled?: boolean
          food_menu_image?: string | null
          food_policy_type?: string
          food_price_monthly?: number
          gender?: string
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_approved?: boolean
          is_booking_active?: boolean
          locality?: string | null
          location?: string | null
          logo_image?: string | null
          max_advance_booking_days?: number
          name: string
          payment_proof_required?: boolean | null
          refund_policy?: string | null
          review_count?: number
          security_deposit?: number
          serial_number?: string | null
          show_food_price?: boolean
          state_id?: string | null
          stay_type?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          advance_applicable_durations?: Json
          advance_booking_enabled?: boolean
          advance_flat_amount?: number | null
          advance_percentage?: number
          advance_use_flat?: boolean
          allowed_durations?: Json
          amenities?: string[] | null
          area_id?: string | null
          average_rating?: number
          cancellation_window_hours?: number
          city_id?: string | null
          commission_percentage?: number
          contact_email?: string | null
          contact_phone?: string | null
          coordinates_lat?: number | null
          coordinates_lng?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          food_enabled?: boolean
          food_menu_image?: string | null
          food_policy_type?: string
          food_price_monthly?: number
          gender?: string
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_approved?: boolean
          is_booking_active?: boolean
          locality?: string | null
          location?: string | null
          logo_image?: string | null
          max_advance_booking_days?: number
          name?: string
          payment_proof_required?: boolean | null
          refund_policy?: string | null
          review_count?: number
          security_deposit?: number
          serial_number?: string | null
          show_food_price?: boolean
          state_id?: string | null
          stay_type?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hostels_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostels_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostels_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      laundry_complaints: {
        Row: {
          created_at: string
          description: string
          id: string
          order_id: string | null
          responded_at: string | null
          responded_by: string | null
          response: string | null
          serial_number: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          order_id?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          serial_number?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          order_id?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          serial_number?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "laundry_complaints_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "laundry_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      laundry_items: {
        Row: {
          category: string
          created_at: string
          display_order: number
          icon: string
          id: string
          is_active: boolean
          name: string
          price: number
        }
        Insert: {
          category?: string
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          price?: number
        }
        Update: {
          category?: string
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
        }
        Relationships: []
      }
      laundry_order_items: {
        Row: {
          id: string
          item_id: string | null
          item_name: string
          item_price: number
          order_id: string
          quantity: number
          subtotal: number
        }
        Insert: {
          id?: string
          item_id?: string | null
          item_name: string
          item_price?: number
          order_id: string
          quantity?: number
          subtotal?: number
        }
        Update: {
          id?: string
          item_id?: string | null
          item_name?: string
          item_price?: number
          order_id?: string
          quantity?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "laundry_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "laundry_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laundry_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "laundry_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      laundry_orders: {
        Row: {
          created_at: string
          delivery_date: string | null
          delivery_otp: string
          delivery_otp_verified: boolean
          delivery_time_slot: string | null
          id: string
          notes: string | null
          partner_id: string | null
          payment_method: string
          payment_status: string
          pickup_address: Json | null
          pickup_date: string | null
          pickup_otp: string
          pickup_otp_verified: boolean
          pickup_time_slot: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          serial_number: string | null
          settlement_id: string | null
          settlement_status: string
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_date?: string | null
          delivery_otp?: string
          delivery_otp_verified?: boolean
          delivery_time_slot?: string | null
          id?: string
          notes?: string | null
          partner_id?: string | null
          payment_method?: string
          payment_status?: string
          pickup_address?: Json | null
          pickup_date?: string | null
          pickup_otp?: string
          pickup_otp_verified?: boolean
          pickup_time_slot?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          serial_number?: string | null
          settlement_id?: string | null
          settlement_status?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_date?: string | null
          delivery_otp?: string
          delivery_otp_verified?: boolean
          delivery_time_slot?: string | null
          id?: string
          notes?: string | null
          partner_id?: string | null
          payment_method?: string
          payment_status?: string
          pickup_address?: Json | null
          pickup_date?: string | null
          pickup_otp?: string
          pickup_otp_verified?: boolean
          pickup_time_slot?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          serial_number?: string | null
          settlement_id?: string | null
          settlement_status?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "laundry_orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "laundry_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      laundry_partners: {
        Row: {
          bank_details: Json | null
          business_name: string
          commission_percentage: number
          contact_person: string
          created_at: string
          email: string
          id: string
          is_active: boolean
          phone: string
          serial_number: string | null
          service_area: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_details?: Json | null
          business_name?: string
          commission_percentage?: number
          contact_person?: string
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          phone?: string
          serial_number?: string | null
          service_area?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_details?: Json | null
          business_name?: string
          commission_percentage?: number
          contact_person?: string
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          phone?: string
          serial_number?: string | null
          service_area?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      laundry_pickup_slots: {
        Row: {
          created_at: string
          end_time: string
          id: string
          is_active: boolean
          max_orders: number
          slot_name: string
          start_time: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          is_active?: boolean
          max_orders?: number
          slot_name: string
          start_time: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          max_orders?: number
          slot_name?: string
          start_time?: string
        }
        Relationships: []
      }
      laundry_receipts: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string | null
          partner_id: string | null
          payment_method: string
          receipt_type: string
          serial_number: string | null
          settlement_id: string | null
          settlement_status: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string | null
          partner_id?: string | null
          payment_method?: string
          receipt_type?: string
          serial_number?: string | null
          settlement_id?: string | null
          settlement_status?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string | null
          partner_id?: string | null
          payment_method?: string
          receipt_type?: string
          serial_number?: string | null
          settlement_id?: string | null
          settlement_status?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "laundry_receipts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "laundry_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laundry_receipts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "laundry_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_ledger: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          entry_type: string
          id: string
          partner_id: string
          property_id: string | null
          property_type: string
          reference_id: string | null
          reference_type: string | null
          running_balance: number
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          description?: string
          entry_type: string
          id?: string
          partner_id: string
          property_id?: string | null
          property_type?: string
          reference_id?: string | null
          reference_type?: string | null
          running_balance?: number
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          entry_type?: string
          id?: string
          partner_id?: string
          property_id?: string | null
          property_type?: string
          reference_id?: string | null
          reference_type?: string | null
          running_balance?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_ledger_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payment_modes: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          label: string
          mode_type: string
          partner_user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          label: string
          mode_type?: string
          partner_user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          label?: string
          mode_type?: string
          partner_user_id?: string
        }
        Relationships: []
      }
      partner_payout_settings: {
        Row: {
          commission_fixed: number
          commission_on: string
          commission_percentage: number
          commission_type: string
          created_at: string
          custom_cycle_days: number | null
          gateway_charge_mode: string
          gateway_split_percentage: number
          id: string
          minimum_payout_amount: number
          partner_id: string
          security_hold_days: number
          security_hold_enabled: boolean
          security_hold_percentage: number
          settlement_cycle: string
          tds_enabled: boolean
          tds_percentage: number
          updated_at: string
        }
        Insert: {
          commission_fixed?: number
          commission_on?: string
          commission_percentage?: number
          commission_type?: string
          created_at?: string
          custom_cycle_days?: number | null
          gateway_charge_mode?: string
          gateway_split_percentage?: number
          id?: string
          minimum_payout_amount?: number
          partner_id: string
          security_hold_days?: number
          security_hold_enabled?: boolean
          security_hold_percentage?: number
          settlement_cycle?: string
          tds_enabled?: boolean
          tds_percentage?: number
          updated_at?: string
        }
        Update: {
          commission_fixed?: number
          commission_on?: string
          commission_percentage?: number
          commission_type?: string
          created_at?: string
          custom_cycle_days?: number | null
          gateway_charge_mode?: string
          gateway_split_percentage?: number
          id?: string
          minimum_payout_amount?: number
          partner_id?: string
          security_hold_days?: number
          security_hold_enabled?: boolean
          security_hold_percentage?: number
          settlement_cycle?: string
          tds_enabled?: boolean
          tds_percentage?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_payout_settings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_settlements: {
        Row: {
          adjustment_amount: number
          approved_at: string | null
          approved_by: string | null
          commission_amount: number
          created_at: string
          gateway_fees: number
          id: string
          locked_at: string | null
          locked_by: string | null
          net_payable: number
          notes: string | null
          partner_id: string
          payment_date: string | null
          payment_mode: string | null
          payment_reference: string | null
          period_end: string
          period_start: string
          refund_amount: number
          security_hold_amount: number
          serial_number: string | null
          status: string
          tds_amount: number
          total_bookings: number
          total_collected: number
          updated_at: string
          utr_number: string | null
        }
        Insert: {
          adjustment_amount?: number
          approved_at?: string | null
          approved_by?: string | null
          commission_amount?: number
          created_at?: string
          gateway_fees?: number
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          net_payable?: number
          notes?: string | null
          partner_id: string
          payment_date?: string | null
          payment_mode?: string | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          refund_amount?: number
          security_hold_amount?: number
          serial_number?: string | null
          status?: string
          tds_amount?: number
          total_bookings?: number
          total_collected?: number
          updated_at?: string
          utr_number?: string | null
        }
        Update: {
          adjustment_amount?: number
          approved_at?: string | null
          approved_by?: string | null
          commission_amount?: number
          created_at?: string
          gateway_fees?: number
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          net_payable?: number
          notes?: string | null
          partner_id?: string
          payment_date?: string | null
          payment_mode?: string | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          refund_amount?: number
          security_hold_amount?: number
          serial_number?: string | null
          status?: string
          tds_amount?: number
          total_bookings?: number
          total_collected?: number
          updated_at?: string
          utr_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_settlements_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          address: Json
          bank_details: Json
          business_details: Json
          business_name: string
          business_type: string
          commission_settings: Json
          contact_person: string
          created_at: string
          document_approvals: Json | null
          email: string
          id: string
          is_active: boolean
          phone: string
          serial_number: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: Json
          bank_details?: Json
          business_details?: Json
          business_name?: string
          business_type?: string
          commission_settings?: Json
          contact_person?: string
          created_at?: string
          document_approvals?: Json | null
          email?: string
          id?: string
          is_active?: boolean
          phone?: string
          serial_number?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: Json
          bank_details?: Json
          business_details?: Json
          business_name?: string
          business_type?: string
          commission_settings?: Json
          contact_person?: string
          created_at?: string
          document_approvals?: Json | null
          email?: string
          id?: string
          is_active?: boolean
          phone?: string
          serial_number?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          partner_id: string
          payment_date: string
          payment_mode: string
          payment_reference: string
          processed_by: string
          settlement_id: string
          status: string
          utr_number: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          partner_id: string
          payment_date?: string
          payment_mode?: string
          payment_reference?: string
          processed_by: string
          settlement_id: string
          status?: string
          utr_number?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          partner_id?: string
          payment_date?: string
          payment_mode?: string
          payment_reference?: string
          processed_by?: string
          settlement_id?: string
          status?: string
          utr_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_transactions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_transactions_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "partner_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          alternate_phone: string | null
          bio: string | null
          city: string | null
          college_studied: string | null
          course_preparing_for: string | null
          course_studying: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          gender: string | null
          id: string
          is_active: boolean
          name: string | null
          parent_mobile_number: string | null
          phone: string | null
          pincode: string | null
          profile_edit_count: number | null
          profile_picture: string | null
          serial_number: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          alternate_phone?: string | null
          bio?: string | null
          city?: string | null
          college_studied?: string | null
          course_preparing_for?: string | null
          course_studying?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          gender?: string | null
          id: string
          is_active?: boolean
          name?: string | null
          parent_mobile_number?: string | null
          phone?: string | null
          pincode?: string | null
          profile_edit_count?: number | null
          profile_picture?: string | null
          serial_number?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          alternate_phone?: string | null
          bio?: string | null
          city?: string | null
          college_studied?: string | null
          course_preparing_for?: string | null
          course_studying?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          parent_mobile_number?: string | null
          phone?: string | null
          pincode?: string | null
          profile_edit_count?: number | null
          profile_picture?: string | null
          serial_number?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      property_subscriptions: {
        Row: {
          amount_paid: number
          capacity_upgrade_amount: number
          capacity_upgrades: number
          coupon_discount: number
          coupon_id: string | null
          created_at: string
          end_date: string | null
          id: string
          partner_id: string
          payment_status: string
          plan_id: string
          previous_plan_id: string | null
          property_id: string | null
          property_type: string
          razorpay_order_id: string
          razorpay_payment_id: string
          serial_number: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          capacity_upgrade_amount?: number
          capacity_upgrades?: number
          coupon_discount?: number
          coupon_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          partner_id: string
          payment_status?: string
          plan_id: string
          previous_plan_id?: string | null
          property_id?: string | null
          property_type?: string
          razorpay_order_id?: string
          razorpay_payment_id?: string
          serial_number?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          capacity_upgrade_amount?: number
          capacity_upgrades?: number
          coupon_discount?: number
          coupon_id?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          partner_id?: string
          payment_status?: string
          plan_id?: string
          previous_plan_id?: string | null
          property_id?: string | null
          property_type?: string
          razorpay_order_id?: string
          razorpay_payment_id?: string
          serial_number?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_subscriptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_subscriptions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_subscriptions_previous_plan_id_fkey"
            columns: ["previous_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          booking_id: string | null
          cabin_id: string | null
          collected_by: string | null
          collected_by_name: string
          created_at: string
          due_id: string | null
          id: string
          notes: string
          payment_method: string
          payment_proof_url: string | null
          receipt_type: string
          seat_id: string | null
          serial_number: string | null
          settlement_id: string | null
          settlement_status: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          amount?: number
          booking_id?: string | null
          cabin_id?: string | null
          collected_by?: string | null
          collected_by_name?: string
          created_at?: string
          due_id?: string | null
          id?: string
          notes?: string
          payment_method?: string
          payment_proof_url?: string | null
          receipt_type?: string
          seat_id?: string | null
          serial_number?: string | null
          settlement_id?: string | null
          settlement_status?: string
          transaction_id?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          cabin_id?: string | null
          collected_by?: string | null
          collected_by_name?: string
          created_at?: string
          due_id?: string | null
          id?: string
          notes?: string
          payment_method?: string
          payment_proof_url?: string | null
          receipt_type?: string
          seat_id?: string | null
          serial_number?: string | null
          settlement_id?: string | null
          settlement_status?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_due_id_fkey"
            columns: ["due_id"]
            isOneToOne: false
            referencedRelation: "dues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "partner_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_clicks: {
        Row: {
          booking_id: string | null
          clicked_at: string
          id: string
          property_id: string
          property_type: string
          referred_user_id: string | null
          referrer_user_id: string
          signed_up: boolean
        }
        Insert: {
          booking_id?: string | null
          clicked_at?: string
          id?: string
          property_id: string
          property_type?: string
          referred_user_id?: string | null
          referrer_user_id: string
          signed_up?: boolean
        }
        Update: {
          booking_id?: string | null
          clicked_at?: string
          id?: string
          property_id?: string
          property_type?: string
          referred_user_id?: string | null
          referrer_user_id?: string
          signed_up?: boolean
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          cabin_id: string
          comment: string
          created_at: string
          id: string
          rating: number
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id: string
          cabin_id: string
          comment: string
          created_at?: string
          id?: string
          rating: number
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string
          cabin_id?: string
          comment?: string
          created_at?: string
          id?: string
          rating?: number
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reviews_booking"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reviews_cabin"
            columns: ["cabin_id"]
            isOneToOne: false
            referencedRelation: "cabins"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_block_history: {
        Row: {
          action: string
          block_from: string | null
          block_to: string | null
          created_at: string
          id: string
          performed_by: string | null
          reason: string
          seat_id: string
        }
        Insert: {
          action: string
          block_from?: string | null
          block_to?: string | null
          created_at?: string
          id?: string
          performed_by?: string | null
          reason?: string
          seat_id: string
        }
        Update: {
          action?: string
          block_from?: string | null
          block_to?: string | null
          created_at?: string
          id?: string
          performed_by?: string | null
          reason?: string
          seat_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_block_history_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_categories: {
        Row: {
          cabin_id: string | null
          created_at: string
          id: string
          name: string
          price: number
        }
        Insert: {
          cabin_id?: string | null
          created_at?: string
          id?: string
          name: string
          price?: number
        }
        Update: {
          cabin_id?: string | null
          created_at?: string
          id?: string
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "seat_categories_cabin_id_fkey"
            columns: ["cabin_id"]
            isOneToOne: false
            referencedRelation: "cabins"
            referencedColumns: ["id"]
          },
        ]
      }
      seats: {
        Row: {
          cabin_id: string
          category: string
          col_index: number
          created_at: string
          floor: number
          id: string
          is_available: boolean
          is_hot_selling: boolean
          number: number
          position_x: number
          position_y: number
          price: number
          row_index: number
          sharing_capacity: number
          sharing_type: string
          unavailable_until: string | null
        }
        Insert: {
          cabin_id: string
          category?: string
          col_index?: number
          created_at?: string
          floor?: number
          id?: string
          is_available?: boolean
          is_hot_selling?: boolean
          number: number
          position_x?: number
          position_y?: number
          price?: number
          row_index?: number
          sharing_capacity?: number
          sharing_type?: string
          unavailable_until?: string | null
        }
        Update: {
          cabin_id?: string
          category?: string
          col_index?: number
          created_at?: string
          floor?: number
          id?: string
          is_available?: boolean
          is_hot_selling?: boolean
          number?: number
          position_x?: number
          position_y?: number
          price?: number
          row_index?: number
          sharing_capacity?: number
          sharing_type?: string
          unavailable_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seats_cabin_id_fkey"
            columns: ["cabin_id"]
            isOneToOne: false
            referencedRelation: "cabins"
            referencedColumns: ["id"]
          },
        ]
      }
      serial_counters: {
        Row: {
          current_seq: number
          entity_type: string
          year: number
        }
        Insert: {
          current_seq?: number
          entity_type: string
          year: number
        }
        Update: {
          current_seq?: number
          entity_type?: string
          year?: number
        }
        Relationships: []
      }
      settlement_items: {
        Row: {
          booking_id: string | null
          booking_type: string
          commission_amount: number
          created_at: string
          food_amount: number
          gateway_fee: number
          hostel_booking_id: string | null
          hostel_receipt_id: string | null
          id: string
          net_amount: number
          payment_date: string | null
          property_name: string
          receipt_id: string | null
          receipt_serial: string
          receipt_type: string
          room_rent: number
          settlement_id: string
          student_name: string
          total_amount: number
        }
        Insert: {
          booking_id?: string | null
          booking_type?: string
          commission_amount?: number
          created_at?: string
          food_amount?: number
          gateway_fee?: number
          hostel_booking_id?: string | null
          hostel_receipt_id?: string | null
          id?: string
          net_amount?: number
          payment_date?: string | null
          property_name?: string
          receipt_id?: string | null
          receipt_serial?: string
          receipt_type?: string
          room_rent?: number
          settlement_id: string
          student_name?: string
          total_amount?: number
        }
        Update: {
          booking_id?: string | null
          booking_type?: string
          commission_amount?: number
          created_at?: string
          food_amount?: number
          gateway_fee?: number
          hostel_booking_id?: string | null
          hostel_receipt_id?: string | null
          id?: string
          net_amount?: number
          payment_date?: string | null
          property_name?: string
          receipt_id?: string | null
          receipt_serial?: string
          receipt_type?: string
          room_rent?: number
          settlement_id?: string
          student_name?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "settlement_items_hostel_receipt_id_fkey"
            columns: ["hostel_receipt_id"]
            isOneToOne: false
            referencedRelation: "hostel_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_items_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "partner_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsored_listing_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          sponsored_listing_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          sponsored_listing_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          sponsored_listing_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsored_listing_events_sponsored_listing_id_fkey"
            columns: ["sponsored_listing_id"]
            isOneToOne: false
            referencedRelation: "sponsored_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsored_listings: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          package_id: string | null
          partner_id: string
          payment_status: string
          priority_rank: number
          property_id: string
          property_type: string
          serial_number: string | null
          start_date: string
          status: string
          target_area_ids: string[] | null
          target_city_id: string
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          package_id?: string | null
          partner_id: string
          payment_status?: string
          priority_rank?: number
          property_id: string
          property_type?: string
          serial_number?: string | null
          start_date: string
          status?: string
          target_area_ids?: string[] | null
          target_city_id: string
          tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          package_id?: string | null
          partner_id?: string
          payment_status?: string
          priority_rank?: number
          property_id?: string
          property_type?: string
          serial_number?: string | null
          start_date?: string
          status?: string
          target_area_ids?: string[] | null
          target_city_id?: string
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsored_listings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "sponsored_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsored_listings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsored_listings_target_city_id_fkey"
            columns: ["target_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsored_packages: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          duration_days: number
          id: string
          is_active: boolean
          name: string
          price: number
          serial_number: string | null
          tier: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          duration_days?: number
          id?: string
          is_active?: boolean
          name: string
          price?: number
          serial_number?: string | null
          tier?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          duration_days?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          serial_number?: string | null
          tier?: string
        }
        Relationships: []
      }
      states: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          capacity_upgrade_enabled: boolean
          capacity_upgrade_price: number
          capacity_upgrade_slab_beds: number
          capacity_upgrade_slab_seats: number
          created_at: string
          description: string
          discount_active: boolean
          discount_label: string
          discount_percentage: number
          display_order: number
          features: Json
          hostel_bed_limit: number
          id: string
          is_active: boolean
          is_universal: boolean
          name: string
          price_monthly_display: number
          price_yearly: number
          reading_room_seat_limit: number
          serial_number: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          capacity_upgrade_enabled?: boolean
          capacity_upgrade_price?: number
          capacity_upgrade_slab_beds?: number
          capacity_upgrade_slab_seats?: number
          created_at?: string
          description?: string
          discount_active?: boolean
          discount_label?: string
          discount_percentage?: number
          display_order?: number
          features?: Json
          hostel_bed_limit?: number
          id?: string
          is_active?: boolean
          is_universal?: boolean
          name: string
          price_monthly_display?: number
          price_yearly?: number
          reading_room_seat_limit?: number
          serial_number?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          capacity_upgrade_enabled?: boolean
          capacity_upgrade_price?: number
          capacity_upgrade_slab_beds?: number
          capacity_upgrade_slab_seats?: number
          created_at?: string
          description?: string
          discount_active?: boolean
          discount_label?: string
          discount_percentage?: number
          display_order?: number
          features?: Json
          hostel_bed_limit?: number
          id?: string
          is_active?: boolean
          is_universal?: boolean
          name?: string
          price_monthly_display?: number
          price_yearly?: number
          reading_room_seat_limit?: number
          serial_number?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          description: string
          id: string
          responded_at: string | null
          responded_by: string | null
          serial_number: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          category?: string
          created_at?: string
          description: string
          id?: string
          responded_at?: string | null
          responded_by?: string | null
          serial_number?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          responded_at?: string | null
          responded_by?: string | null
          serial_number?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_id: string
          sender_role: string
          ticket_id: string
          ticket_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_id: string
          sender_role?: string
          ticket_id: string
          ticket_type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          sender_role?: string
          ticket_id?: string
          ticket_type?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_employees: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          partner_user_id: string
          permissions: string[]
          phone: string
          role: string
          salary: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          partner_user_id: string
          permissions?: string[]
          phone?: string
          role?: string
          salary?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          partner_user_id?: string
          permissions?: string[]
          phone?: string
          role?: string
          salary?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_hostel_bed_available: {
        Args: { p_bed_id: string; p_end_date: string; p_start_date: string }
        Returns: boolean
      }
      check_seat_available: {
        Args: { p_end_date: string; p_seat_id: string; p_start_date: string }
        Returns: boolean
      }
      generate_serial_number: {
        Args: { p_entity_type: string }
        Returns: string
      }
      get_cabin_rating_stats: {
        Args: { p_cabin_id: string }
        Returns: {
          average_rating: number
          review_count: number
        }[]
      }
      get_conflicting_hostel_bookings: {
        Args: {
          p_end_date?: string
          p_hostel_id: string
          p_start_date?: string
        }
        Returns: {
          bed_id: string
          payment_status: string
          user_name: string
        }[]
      }
      get_conflicting_seat_bookings: {
        Args: {
          p_cabin_id: string
          p_end_date: string
          p_slot_id?: string
          p_start_date: string
        }
        Returns: {
          seat_id: string
          slot_id: string
        }[]
      }
      get_dashboard_stats: { Args: never; Returns: Json }
      get_partner_dashboard_stats: {
        Args: { p_user_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "student"
        | "vendor"
        | "vendor_employee"
        | "hostel_manager"
        | "super_admin"
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
      app_role: [
        "admin",
        "student",
        "vendor",
        "vendor_employee",
        "hostel_manager",
        "super_admin",
      ],
    },
  },
} as const
