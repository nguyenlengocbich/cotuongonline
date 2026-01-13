
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.48.1';

// Các biến môi trường sẽ được hệ thống cung cấp tự động
const supabaseUrl = (process.env as any).SUPABASE_URL || 'https://qsqtzqyuvtmsddzhpscv.supabase.co';
const supabaseAnonKey = (process.env as any).SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzcXR6cXl1dnRtc2Rkemhwc2N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NDY1NTcsImV4cCI6MjA4MzIyMjU1N30.3LWeiXwIr9IAWIUiKvZKzDd_W_gQhRZraE5JFHXSkv4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
