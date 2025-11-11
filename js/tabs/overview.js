
import { supabase, fmtZAR } from "../boot.js";
import "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js";
const { data: pm } = await supabase.from('v_profit_monthly').select('*').order('month');
if(pm && pm.length){
  const latest = pm[pm.length-1];
  const inc = Number(latest.income_zar||0), exp = Number(latest.expense_zar||0);
  document.getElementById('kpiRev').textContent = fmtZAR(inc);
  document.getElementById('kpiExp').textContent = fmtZAR(exp);
  document.getElementById('kpiProf').textContent = fmtZAR(inc-exp);
  const labels = pm.map(r => new Date(r.month).toISOString().slice(0,7));
  const incs = pm.map(r => Number(r.income_zar||0));
  const exps = pm.map(r => Number(r.expense_zar||0));
  const prof = pm.map(r => Number((r.income_zar||0)-(r.expense_zar||0)));
  new Chart(document.getElementById('lineSalesCOGS').getContext('2d'), { type:'line', data:{ labels, datasets:[
    { label:'Income', data:incs }, { label:'Expenses', data:exps }, { label:'Profit', data:prof }
  ]}, options:{ responsive:true, scales:{ y:{ beginAtZero:true } } } });
  const start = new Date(latest.month);
  const next = new Date(start.getFullYear(), start.getMonth()+1, 1).toISOString();
  const delivered = await supabase.from('shipments').select('id', { count:'exact', head:true })
     .gte('delivered_at', start.toISOString()).lt('delivered_at', next).eq('status','delivered');
  document.getElementById('kpiDeliv').textContent = delivered.count ?? '—';
}
const { data: statusRows } = await supabase.from('v_shipments_status_counts').select('*');
if(statusRows){
  new Chart(document.getElementById('donutShip').getContext('2d'), { type:'doughnut', data:{ labels: statusRows.map(r=>r.status), datasets:[{ data: statusRows.map(r=>r.cnt) }] } });
}
