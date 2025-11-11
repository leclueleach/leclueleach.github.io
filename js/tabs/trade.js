
import { supabase } from "../boot.js";
const GEO = {'CN':[35.0,103.0],'DE':[51.0,10.0],'IN':[21.0,78.0],'BR':[-10.0,-55.0],'NL':[52.1,5.3],'ZA':[-28.5,24.7]};
const map = L.map('map', { worldCopyJump:true }).setView([10,10], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:5, attribution:'© OpenStreetMap' }).addTo(map);
function addBubble(lat,lon,val,label){ const r=Math.max(6,Math.sqrt(val)/200); L.circleMarker([lat,lon],{radius:r,color:'#60a5fa',weight:1,fillOpacity:0.5}).addTo(map).bindTooltip(label); }
const imports = (await supabase.from('v_imports_by_country').select('*')).data||[];
imports.forEach(r=>{ const g=GEO[r.country_iso2]; if(!g) return; addBubble(g[0],g[1],Number(r.import_value_zar||0), `${r.country_iso2}: ZAR ${Math.round(r.import_value_zar).toLocaleString()}`); });
const exports = (await supabase.from('v_exports_by_country').select('*')).data||[];
exports.forEach(r=>{ const g=GEO[r.country_iso2]; if(!g) return; addBubble(g[0],g[1],Number(r.export_value_zar||0), `${r.country_iso2}: ZAR ${Math.round(r.export_value_zar).toLocaleString()}`); });
