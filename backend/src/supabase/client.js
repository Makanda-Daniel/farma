const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false }
})

module.exports = supabase
