
import { supabase } from "../boot.js";
const veh = await supabase.from('v_cost_per_km').select('*').order('zar_per_km',{ascending:true});
const tb = document.querySelector('#vehTbl tbody');
(veh.data||[]).forEach(v=>{ const tr=document.createElement('tr'); [v.reg_no,v.km,v.vehicle_cost_zar,v.zar_per_km].forEach(x=>{ const td=document.createElement('td'); td.textContent=x??'—'; tr.appendChild(td); }); tb.appendChild(tr); });
const trips = await supabase.from('trips').select('trip_date,distance_km');
if(trips.data&&trips.data.length){ const by={}; trips.data.forEach(t=>{ const m=new Date(t.trip_date).toISOString().slice(0,7); by[m]=(by[m]||0)+Number(t.distance_km||0); }); const latest=Object.keys(by).sort().pop(); document.getElementById('kpiKm').textContent=(by[latest]||0).toLocaleString(); }
const delivered = await supabase.from('shipments').select('scheduled_date,delivered_at').eq('status','delivered');
if(delivered.data&&delivered.data.length){ const hrs=delivered.data.filter(d=>d.delivered_at).map(d=>(new Date(d.delivered_at)-new Date(d.scheduled_date))/36e5); const avg=hrs.length?(hrs.reduce((a,b)=>a+b,0)/hrs.length):0; document.getElementById('kpiAvgTime').textContent=avg.toFixed(1); }
