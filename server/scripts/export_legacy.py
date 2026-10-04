#!/usr/bin/env python3
"""Parse the supplied phpMyAdmin/MariaDB dump into a sanitized JSON migration package.
Legacy user passwords are intentionally excluded.
"""
import re, json, pathlib, sys
ROOT=pathlib.Path(__file__).resolve().parents[2]
SQL=ROOT/'legacy'/'syskodet_syskode_project.sql'
OUT=ROOT/'legacy'/'legacy-export.json'
text=SQL.read_text(errors='ignore')

def decode(s):
    out=[];i=0;mp={'0':'\0','n':'\n','r':'\r','t':'\t','b':'\b','Z':'\x1a'}
    while i<len(s):
        if s[i]=='\\' and i+1<len(s):
            c=s[i+1];out.append(c if c in "'\\\"" else mp.get(c,c));i+=2
        else:out.append(s[i]);i+=1
    return ''.join(out)

def split_values(body):
    rows=[];i=0;n=len(body)
    while i<n:
        while i<n and body[i] in ' \r\n\t,':i+=1
        if i>=n:break
        if body[i]!='(':raise ValueError(f'Expected row tuple at {i}')
        i+=1;vals=[];token=[];inq=False
        while i<n:
            c=body[i]
            if inq:
                if c=='\\' and i+1<n:token.extend([c,body[i+1]]);i+=2;continue
                if c=="'":inq=False;token.append(c);i+=1;continue
                token.append(c);i+=1;continue
            if c=="'":inq=True;token.append(c);i+=1;continue
            if c==',':vals.append(''.join(token).strip());token=[];i+=1;continue
            if c==')':vals.append(''.join(token).strip());i+=1;break
            token.append(c);i+=1
        rows.append(vals)
    return rows

def parse_val(v):
    if not v or v.upper()=='NULL':return None
    if len(v)>=2 and v[0]=="'" and v[-1]=="'":return decode(v[1:-1])
    try:
        if re.fullmatch(r'-?\d+',v):return int(v)
        if re.fullmatch(r'-?\d+(\.\d+)?([eE][+-]?\d+)?',v):return float(v)
    except ValueError:pass
    return v

def table(name):
    pat=re.compile(rf"INSERT INTO `{re.escape(name)}` \((.*?)\) VALUES\n(.*?);\n",re.S)
    out=[]
    for m in pat.finditer(text):
        cols=[x.strip().strip('`') for x in m.group(1).split(',')]
        for values in split_values(m.group(2)):
            if len(values)==len(cols):out.append(dict(zip(cols,map(parse_val,values))))
    return out

payload={
  'meta':{'source':'syskodet_syskode_project.sql','users_excluded':True},
  'clients':table('company_details'),
  'projects':table('project_details'),
  'vendors':table('subcontract_details'),
  'project_vendors':table('subwork_transaction_details'),
  'transactions':table('transaction_details'),
  'account_heads':table('account_head_details')
}
payload['meta']['counts']={k:len(v) for k,v in payload.items() if isinstance(v,list)}
OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2))
print(json.dumps(payload['meta'],indent=2))
print('Wrote',OUT)
