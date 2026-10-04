import {Router} from 'express';import {config} from '../config.js';import {exchangeCode,syncEvent,verifyState} from '../services/zoho.js';
const r=Router();
r.get('/callback',async(req,res,next)=>{try{if(!verifyState(req.query.state))return res.status(400).send('Invalid or expired OAuth state');await exchangeCode(req.query.code);res.redirect(`${config.clientUrl}/zoho?connected=1`)}catch(e){next(e)}})
r.post('/webhook',async(req,res,next)=>{try{const secret=req.headers['x-business-deck-secret']||req.query.secret;if(!config.zoho.webhookSecret||secret!==config.zoho.webhookSecret)return res.status(401).json({error:'Invalid webhook secret'});const result=await syncEvent(req.body);res.json({ok:true,result})}catch(e){next(e)}})
export default r;
