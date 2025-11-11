
import { supabase } from "../boot.js";
import "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js";
const reps = await supabase.from('sales_reps').select('id, full_name').order('full_name');
const repSel = document.getElementById('rep');
repSel.innerHTML = '<option value="">All reps</option>';
(reps.data||[]).forEach(r=>{ const o=document.createElement('option'); o.value=r.id; o.textContent=r.full_name; repSel.appendChild(o); });
async function render(){
  const rep = repSel.value, from=document.getElementById('from').value, to=document.getElementById('to').value;
  let q = supabase.from('v_sales_vs_target').select('*');
  if(rep) q = q.eq('sales_rep_id', rep);
  if(from) q = q.gte('month', from+'-01');
  if(to) q = q.lte('month', to+'-01');
  const rows = (await q).data || [];
  const byRep={}; rows.forEach(r=>{ byRep[r.full_name] = Math.max(byRep[r.full_name]||0, Number(r.pct_to_target||0)); });
  const labels = Object.keys(byRep), pct = Object.values(byRep);
  if(window._chartTarget) window._chartTarget.destroy();
  window._chartTarget = new Chart(document.getElementById('barTarget').getContext('2d'), { type:'bar', data:{ labels, datasets:[{ label:'% to Target (best month)', data:pct }] }, options:{ responsive:true, scales:{ y:{ beginAtZero:true, max:150 } } } });
  // Top products (fallback from invoice_items)
  const r = await supabase.from('invoice_items').select('description, line_total_zar');
  const map={}; (r.data||[]).forEach(x=>{ map[x.description]=(map[x.description]||0)+Number(x.line_total_zar||0) });
  const prodRows = Object.entries(map).map(([name,val])=>({name,val})).sort((a,b)=>b.val-a.val).slice(0,10);
  if(window._chartProd) window._chartProd.destroy();
  window._chartProd = new Chart(document.getElementById('barTopProducts').getContext('2d'), { type:'bar', data:{ labels: prodRows.map(x=>x.name), datasets:[{ label:'Revenue (ZAR)', data: prodRows.map(x=>x.val) }] }, options:{ responsive:true, scales:{ y:{ beginAtZero:true } } } });
}
document.getElementById('apply').addEventListener('click', render);
render();
