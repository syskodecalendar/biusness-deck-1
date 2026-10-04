import React,{useState} from 'react'
import {Outlet,NavLink} from 'react-router-dom'
import {LayoutDashboard,FolderKanban,Building2,Handshake,ReceiptText,ChartNoAxesCombined,CloudCog,ShieldCheck,LogOut,Menu,X,UsersRound,KeyRound} from 'lucide-react'
import {useAuth} from '../lib/auth'

const navItems=[
  [LayoutDashboard,'Dashboard','/','dashboard'],
  [FolderKanban,'Projects','/projects','projects'],
  [Building2,'Clients','/clients','clients'],
  [Handshake,'Subcontractors','/vendors','vendors'],
  [ReceiptText,'Transactions','/transactions','transactions'],
  [ChartNoAxesCombined,'Reports','/reports','reports'],
  [CloudCog,'Zoho Books','/zoho','zoho'],
  [ShieldCheck,'Audit Log','/audit','audit'],
  [UsersRound,'Users','/users','users'],
  [KeyRound,'Roles & Access','/roles','roles']
]
export default function Layout(){
  const{user,profile,access,canView,signOut}=useAuth(),[open,setOpen]=useState(false)
  const nav=navItems.filter(([, , , resource])=>canView(resource))
  return <div className="shell"><aside className={`sidebar ${open?'open':''}`}><div className="brand"><div className="brand-mark">S</div><div><strong>SYSKODE</strong><span>BUSINESS DECK</span></div><button className="mobile-close" onClick={()=>setOpen(false)}><X/></button></div><nav>{nav.map(([I,t,p])=><NavLink key={p} to={p} end={p==='/'} onClick={()=>setOpen(false)}><I size={18}/><span>{t}</span></NavLink>)}</nav><div className="sidebar-foot"><div className="user-mini"><div className="avatar">{user?.email?.[0]?.toUpperCase()}</div><div><b>{profile?.full_name||user?.email?.split('@')[0]}</b><small>{access?.role?.name||String(profile?.role||'viewer').replaceAll('_',' ')}</small></div></div><button className="icon-btn" onClick={signOut} title="Sign out"><LogOut size={18}/></button></div></aside><main><header className="topbar"><button className="menu-btn" onClick={()=>setOpen(true)}><Menu/></button><div><span className="crumb">SYSKODE / INTERNAL OPERATIONS</span></div><div className="top-pill">BHD · Bahrain</div></header><section className="content"><Outlet/></section></main></div>
}
