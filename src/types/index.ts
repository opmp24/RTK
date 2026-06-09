export interface Category {
  id: string
  name: string
  slug: string
  icon: string
  color: string
}

export interface Report {
  id: string
  user_id: string
  category_id: string
  lat: number
  lng: number
  address: string | null
  description: string | null
  photo_url: string | null
  created_at: string
  category?: Category
  user_email?: string
  vote_count?: { up: number; down: number }
  user_vote?: 'up' | 'down' | null
}

export interface ReportFormData {
  category_id: string
  lat: number
  lng: number
  address?: string
  description?: string
  photo?: File | null
}

export interface UpdateReportData {
  description?: string
  photo?: File | null
  category_id?: string
}
