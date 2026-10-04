import React,{useEffect,useMemo,useState} from 'react'
import {api} from '../lib/api'
import {PageHead,SearchBox,SortableTh} from '../components/UI'
import {useAuth} from '../lib/auth'
import {matchesSearch,sortRows} from '../lib/table'
export default function Audit(){
  const{showColumn}=useAuth()
  const[rows,setRows]=useState([]),[q,setQ]=useState(''),[sort,setSort]=useState({key:'created_at',direction:'desc'}),[error,setError]=useState('')
  useEffect(()=>{api.get('/audit').then(r=>setRows(r.data)).catch(e=>setError(e.response?.data?.error||e.message))},[])
  const list=useMemo(()=>sortRows(rows.filter(x=>matchesSearch(x,q)),sort),[rows,q,sort])
  const toggleSort=key=>setSort(s=>s.key===key?{key,direction:s.direction==='asc'?'desc':'asc'}:{key,direction:'asc'})
  const col=k=>showColumn('audit',k)
  return <><PageHead eyebrow="SECURITY & CONTROL" title="Audit Log" desc="Search and sort important creates, updates, deletes and document events."/>{error&&<div className="alert error">{error}</div>}<div className="toolbar"><SearchBox value={q} onChange={setQ} placeholder="Search user, action, entity, record or IP…"/><span className="record-count">{list.length} events</span></div><div className="panel table-panel"><div className="table-scroll"><table><thead><tr>{col('created_at')&&<SortableTh label="Time" sortKey="created_at" sort={sort} onSort={toggleSort}/>} {col('user_name')&&<SortableTh label="User" sortKey="profiles.full_name" sort={sort} onSort={toggleSort}/>} {col('action')&&<SortableTh label="Action" sortKey="action" sort={sort} onSort={toggleSort}/>} {col('entity_type')&&<SortableTh label="Entity" sortKey="entity_type" sort={sort} onSort={toggleSort}/>} {col('entity_id')&&<SortableTh label="Record" sortKey="entity_id" sort={sort} onSort={toggleSort}/>} {col('ip_address')&&<SortableTh label="IP" sortKey="ip_address" sort={sort} onSort={toggleSort}/>}</tr></thead><tbody>{list.map(x=><tr key={x.id}>{col('created_at')&&<td>{new Date(x.created_at).toLocaleString()}</td>}{col('user_name')&&<td>{x.profiles?.full_name||'System'}</td>}{col('action')&&<td>{x.action}</td>}{col('entity_type')&&<td>{x.entity_type}</td>}{col('entity_id')&&<td>{x.entity_id}</td>}{col('ip_address')&&<td>{x.ip_address}</td>}</tr>)}</tbody></table></div></div></>
}
