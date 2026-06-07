import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';

import { join, resolve } from 'node:path';



const root = process.cwd();

const src = resolve(root, 'static-site');

const dist = resolve(root, 'dist');

const apiBase = 'https://api.sayupai.co.kr';



if (!existsSync(src)) {
  
  throw new Error('static-site directory is missing');
  
}



rmSync(dist, { recursive: true, force: true });

cpSync(src, dist, { recursive: true });



function walkFiles(dir) {
  
  return readdirSync(dir).flatMap((entry) => {
    
    const path = join(dir, entry);
    
    return statSync(path).isDirectory() ? walkFiles(path) : [path];
    
  });
  
}



let patchedFiles = 0;

for (const file of walkFiles(dist)) {
  
  if (!/\.(js|html)$/.test(file)) continue;
  
  const before = readFileSync(file, 'utf8');
  
  let after = before
  
    .replaceAll('url:"/api/trpc"', `url:"${apiBase}/api/trpc"`)
  
    .replaceAll('url:"/api/analysis/upload-file"', `url:"${apiBase}/api/analysis/upload-file"`)
  
    .replaceAll('/api/analysis/upload-file', `${apiBase}/api/analysis/upload-file`)
  
    .replaceAll('${window.location.protocol}//${window.location.host}/api/live/webrtc/signaling', '${window.location.protocol}//api.sayupai.co.kr/api/live/webrtc/signaling')
  
    .replaceAll('${window.location.host}/api/live/webrtc/signaling', 'api.sayupai.co.kr/api/live/webrtc/signaling');
  

  
  if (after !== before) {
    
    writeFileSync(file, after);
    
    patchedFiles += 1;
    
  }
  
}



console.log(`Static SayUpAI site copied to dist and patched for ${apiBase} (${patchedFiles} file(s))`);






















