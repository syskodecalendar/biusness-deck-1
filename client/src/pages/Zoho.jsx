import React,{useEffect,useMemo,useState} from 'react'
import {api} from '../lib/api'
import {PageHead,SearchBox,SortableTh,Status} from '../components/UI'
import {RefreshCw,ExternalLink,CheckCircle2,AlertTriangle} from 'lucide-react'
import {useAuth} from '../lib/auth'
import {useSubmitGuard} from '../lib/forms'
import {matchesSearch,sortRows} from '../lib/table'
export default function Zoho(){
  const{can,showColumn}=useAuth()
  const[data,setData]=useState(null),[result,setResult]=useState(null),[q,setQ]=useState(''),[sort,setSort]=useState({key:'created_at',direction:'desc'}),[error,setError]=useState('')
  const syncGuard=useSubmitGuard()
  const load=()=>api.get('/zoho/status').then(r=>setData(r.data)).catch(e=>setError(e.response?.data?.error||e.message))
  useEffect(()=>{void load()},[])
  const logs=useMemo(()=>sortRows((data?.logs||[]).filter(x=>matchesSearch(x,q)),sort),[data,q,sort])
  const toggleSort=key=>setSort(s=>s.key===key?{key,direction:s.direction==='asc'?'desc':'asc'}:{key,direction:'asc'})
  async function connect(){const r=await api.get('/zoho/auth-url');window.location.href=r.data.url}
  async function sync(){setError('');await syncGuard.run(async()=>{const r=await api.post('/zoho/sync');setResult(r.data);await load()}).catch(e=>setError(e.response?.data?.error||e.message))}
  const col=k=>showColumn('zoho_logs',k)
  return <><PageHead eyebrow="INTEGRATIONS" title="Zoho Books" desc="Sync invoices/payments and vendor bills/payments with Business Deck."/>{error&&<div className="alert error">{error}</div>}<div className="integration-card"><div className="integration-logo">Z</div><div className="integration-copy"><h3>Zoho Books Connection</h3><p>{data?.connected?'Connected to your configured Zoho Books organization.':'Connect using OAuth 2.0. No Zoho password is stored in Business Deck.'}</p><div className="integration-status">{data?.connected?<><CheckCircle2 size={16}/> Connected</>:<><AlertTriangle size={16}/> Not connected</>}</div></div><div className="integration-actions">{can('zoho','sync')&&(!data?.connected?<button className="btn primary" onClick={connect}>Connect Zoho <ExternalLink size={16}/></button>:<button className="btn primary" disabled={syncGuard.saving} onClick={sync}><RefreshCw size={16}/>{syncGuard.saving?'Syncing…':'Sync Now'}</button>)}</div></div>{result&&<div className="alert success">Sync complete: {JSON.stringify(result)}</div>}<div className="panel table-panel"><div className="panel-head"><div><span className="eyebrow">RECONCILIATION</span><h3>Recent sync activity</h3></div></div><div className="toolbar compact-toolbar"><SearchBox value={q} onChange={setQ} placeholder="Search sync logs…"/><span className="record-count">{logs.length} events</span></div><div className="table-scroll"><table><thead><tr>{col('created_at')&&<SortableTh label="Time" sortKey="created_at" sort={sort} onSort={toggleSort}/>} {col('entity_type')&&<SortableTh label="Entity" sortKey="entity_type" sort={sort} onSort={toggleSort}/>} {col('zoho_id')&&<SortableTh label="Zoho ID" sortKey="zoho_id" sort={sort} onSort={toggleSort}/>} {col('status')&&<SortableTh label="Status" sortKey="status" sort={sort} onSort={toggleSort}/>} {col('message')&&<SortableTh label="Message" sortKey="message" sort={sort} onSort={toggleSort}/>}</tr></thead><tbody>{logs.map(x=><tr key={x.id}>{col('created_at')&&<td>{new Date(x.created_at).toLocaleString()}</td>}{col('entity_type')&&<td>{x.entity_type}</td>}{col('zoho_id')&&<td>{x.zoho_id}</td>}{col('status')&&<td><Status value={x.status}/></td>}{col('message')&&<td>{x.message}</td>}</tr>)}</tbody></table></div></div><div className="note-box"><b>Project mapping rule</b><p>Use a Zoho Books custom field named <code>Project Code</code> or invoice <code>P.O.#</code> with a Business Deck code such as <code>SK-2026-001</code>. Customer payments inherit the project from their linked invoice.</p></div></>
}
