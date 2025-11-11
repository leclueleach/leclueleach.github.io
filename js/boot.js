
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const status = document.getElementById('status');
if(status){
  try{
    const { error } = await supabase.from('v_profit_monthly').select('*').limit(1);
    status.textContent = error ? 'Error' : 'Connected';
    status.className = 'badge' + (error ? ' err' : '');
  }catch(e){
    status.textContent = 'Error';
    status.className = 'badge err';
  }
}
export const fmtZAR = (n) => n == null ? '—' : new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR',maximumFractionDigits:0}).format(Number(n));
