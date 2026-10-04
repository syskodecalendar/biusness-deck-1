import React from 'react'
import {Navigate,Route,Routes} from 'react-router-dom'
import {useAuth} from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Clients from './pages/Clients'
import Vendors from './pages/Vendors'
import Transactions from './pages/Transactions'
import Reports from './pages/Reports'
import Zoho from './pages/Zoho'
import Audit from './pages/Audit'
import Users from './pages/Users'
import Roles from './pages/Roles'

function Secure(){const{session,loading}=useAuth();if(loading)return <div className="screen-center">Loading…</div>;return session?<Layout/>:<Navigate to="/login" replace/>}
function Gate({resource,children}){const{canView,loading}=useAuth();if(loading)return <div className="screen-center">Loading…</div>;return canView(resource)?children:<div className="panel access-denied"><h2>Access restricted</h2><p>Your assigned role does not allow this page. Ask a Super Admin to update your role or data scope.</p></div>}
export default function App(){return <Routes><Route path="/login" element={<Login/>}/><Route element={<Secure/>}><Route index element={<Gate resource="dashboard"><Dashboard/></Gate>}/><Route path="/projects" element={<Gate resource="projects"><Projects/></Gate>}/><Route path="/projects/:id" element={<Gate resource="projects"><ProjectDetail/></Gate>}/><Route path="/clients" element={<Gate resource="clients"><Clients/></Gate>}/><Route path="/vendors" element={<Gate resource="vendors"><Vendors/></Gate>}/><Route path="/transactions" element={<Gate resource="transactions"><Transactions/></Gate>}/><Route path="/reports" element={<Gate resource="reports"><Reports/></Gate>}/><Route path="/zoho" element={<Gate resource="zoho"><Zoho/></Gate>}/><Route path="/audit" element={<Gate resource="audit"><Audit/></Gate>}/><Route path="/users" element={<Gate resource="users"><Users/></Gate>}/><Route path="/roles" element={<Gate resource="roles"><Roles/></Gate>}/></Route><Route path="*" element={<Navigate to="/"/>}/></Routes>}
