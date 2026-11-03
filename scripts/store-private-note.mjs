// Owner-directed local import. Input is private process stdin; never command arguments.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,createCipheriv,createDecipheriv,timingSafeEqual} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const privateDir=path.join(root,'.vault');
let db;
try{
  const chunks=[];let length=0;
  for await(const chunk of process.stdin){length+=chunk.length;if(length>16384)throw Error('Input too large');chunks.push(chunk);}
  const input=Buffer.concat(chunks);const data=JSON.parse(input.toString('utf8'));
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Expected private record');
  const cfg=JSON.parse(fs.readFileSync(path.join(privateDir,'runtime.json'),'utf8'));
  if(!/^[a-f0-9]{64}$/.test(cfg.masterKey))throw Error('Private vault key unavailable');
  const key=Buffer.from(cfg.masterKey,'hex');const id='secret:'+randomUUID();const iv=randomBytes(12);
  const value={name:'Private contact details',kind:'note',value:JSON.stringify(data),updatedAt:new Date().toISOString()};
  const plaintext=Buffer.from(JSON.stringify(value));const cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(id));
  const ciphertext=Buffer.concat([cipher.update(plaintext),cipher.final(),cipher.getAuthTag()]);
  const payload=JSON.stringify({iv:iv.toString('hex'),ciphertext:ciphertext.toString('hex')});
  db=new DatabaseSync(path.join(privateDir,'vault.sqlite'));db.exec(fs.readFileSync(path.join(root,'migrations','0001.sql'),'utf8'));
  db.prepare('INSERT INTO vault_records(id,data) VALUES(?,?)').run(id,payload);
  const row=JSON.parse(db.prepare('SELECT data FROM vault_records WHERE id=?').get(id).data);
  const stored=Buffer.from(row.ciphertext,'hex');const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(row.iv,'hex'));decipher.setAAD(Buffer.from(id));decipher.setAuthTag(stored.subarray(-16));
  const verified=Buffer.concat([decipher.update(stored.subarray(0,-16)),decipher.final()]);
  if(!timingSafeEqual(plaintext,verified))throw Error('Read-back failed');
  const literalFound=input.length>0&&Buffer.from(payload).includes(input);if(literalFound)throw Error('Unexpected plaintext in stored payload');
  input.fill(0);plaintext.fill(0);verified.fill(0);key.fill(0);
  console.log(JSON.stringify({stored:true,readBackVerified:true,encrypted:true,itemId:id.slice(7),plaintextPrinted:false,gitOrD1Upload:false}));
}catch{console.error('Private import was not verified. No personal values printed.');process.exitCode=1;}finally{db?.close();}
