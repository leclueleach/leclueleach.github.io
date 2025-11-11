
import { supabase } from "../boot.js";
function td(t){ const d=document.createElement('td'); d.textContent=t??'—'; return d; }
const s1 = await supabase.from('v_stock_status').select('*');
const tb = document.querySelector('#stockTbl tbody');
(s1.data||[]).forEach(r=>{ const tr=document.createElement('tr'); tr.append(td(r.sku),td(r.name),td(r.category),td(r.qty_on_hand),td(r.reorder_level),td(r.needs_reorder?'Yes':'No'),td(r.soonest_expiry),td(r.lots_expiring_60d)); tb.appendChild(tr); });
const s2 = await supabase.from('v_product_ageing').select('*').order('days_idle',{ascending:false}).limit(50);
const tb2 = document.querySelector('#idleTbl tbody');
(s2.data||[]).forEach(r=>{ const tr=document.createElement('tr'); tr.append(td(r.sku),td(r.name),td(r.category),td(r.last_movement_ts),td(r.days_idle)); tb2.appendChild(tr); });
