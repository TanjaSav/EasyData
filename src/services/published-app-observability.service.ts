import fs from "fs";
import path from "path";
import { getAppMeta } from "./app.service.js";
import { getAppSchema } from "./table.service.js";

const GENERATED_ROOT = path.join("public", "generated");

function appDir(appId: string) {
  return path.join(GENERATED_ROOT, appId);
}

function appIndexPath(appId: string) {
  return path.join(appDir(appId), "index.html");
}

function versionsDir(appId: string) {
  return path.join(appDir(appId), ".versions");
}

function ensurePublishedApp(appId: string) {
  const indexPath = appIndexPath(appId);
  if (!fs.existsSync(indexPath)) {
    throw new Error("Published app index.html not found");
  }
  return indexPath;
}

function readMtimeIso(filePath: string) {
  return fs.statSync(filePath).mtime.toISOString();
}

function createVersionId(date = new Date()) {
  return date.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function extractEndpoints(html: string) {
  const endpoints = new Set<string>();
  const patterns = [
    /fetch\(\s*([`'"])(.*?)\1/gms,
    /(?:const|let|var)\s+\w*(?:url|Url|URL|endpoint|Endpoint|api|Api|API)\w*\s*=\s*([`'"])(.*?)\1/gms,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const endpoint = match[2]?.trim();
      if (endpoint && /\/(apps|api|uploads)\//.test(endpoint)) {
        endpoints.add(endpoint);
      }
    }
  }

  return Array.from(endpoints).sort();
}

function extractDetectedTables(html: string, appId: string) {
  const tables = new Set<string>();
  const literal = new RegExp(`/apps/${appId}/tables/([A-Za-z_][A-Za-z0-9_]*)/rows`, "g");
  for (const match of html.matchAll(literal)) {
    if (match[1]) tables.add(match[1]);
  }

  const generic = /\/tables\/([A-Za-z_][A-Za-z0-9_]*)\/rows/g;
  for (const match of html.matchAll(generic)) {
    if (match[1]) tables.add(match[1]);
  }

  const tableNames = /(?:tableName|TABLE_NAME|table)\s*=\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g;
  for (const match of html.matchAll(tableNames)) {
    if (match[1]) tables.add(match[1]);
  }

  return Array.from(tables).sort();
}

function extractObjectKeys(objectSource: string) {
  const keys = new Set<string>();
  for (const match of objectSource.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:/g)) {
    if (match[1]) keys.add(match[1]);
  }
  for (const match of objectSource.matchAll(/["']([A-Za-z_][A-Za-z0-9_]*)["']\s*:/g)) {
    if (match[1]) keys.add(match[1]);
  }
  return Array.from(keys);
}

function schemaLookup(appId: string) {
  const schema = getAppSchema(appId);
  const lookup = new Map<string, Set<string>>();
  for (const table of schema) {
    lookup.set(
      table.table,
      new Set(table.columns.map((column: any) => column.name as string))
    );
  }
  return { schema, lookup };
}

export function getPublishedAppSource(appId: string) {
  const indexPath = ensurePublishedApp(appId);
  const html = fs.readFileSync(indexPath, "utf8");
  return {
    appId,
    html,
    updatedAt: readMtimeIso(indexPath),
    size: Buffer.byteLength(html, "utf8"),
  };
}

export function savePublishedAppVersion(appId: string, reason = "manual") {
  const indexPath = ensurePublishedApp(appId);
  const versionId = createVersionId();
  const outputDir = versionsDir(appId);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${versionId}.html`);
  fs.copyFileSync(indexPath, outputPath);
  fs.writeFileSync(
    path.join(outputDir, `${versionId}.json`),
    JSON.stringify({ versionId, appId, reason, createdAt: new Date().toISOString() }, null, 2),
    "utf8"
  );
  return { versionId, path: outputPath, reason };
}

export function listPublishedAppVersions(appId: string) {
  const outputDir = versionsDir(appId);
  if (!fs.existsSync(outputDir)) {
    return { appId, versions: [] };
  }

  const versions = fs
    .readdirSync(outputDir)
    .filter((file) => file.endsWith(".html"))
    .map((file) => {
      const versionId = file.replace(/\.html$/, "");
      const htmlPath = path.join(outputDir, file);
      const metaPath = path.join(outputDir, `${versionId}.json`);
      let meta: Record<string, unknown> = {};
      if (fs.existsSync(metaPath)) {
        meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      }
      return {
        versionId,
        createdAt: meta.createdAt ?? readMtimeIso(htmlPath),
        reason: meta.reason ?? null,
        size: fs.statSync(htmlPath).size,
      };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  return { appId, versions };
}

export function rollbackPublishedApp(appId: string, versionId: string) {
  const versionPath = path.join(versionsDir(appId), `${versionId}.html`);
  if (!fs.existsSync(versionPath)) {
    throw new Error("Published app version not found");
  }
  savePublishedAppVersion(appId, "before rollback");
  const indexPath = appIndexPath(appId);
  fs.copyFileSync(versionPath, indexPath);
  return getPublishedAppSource(appId);
}

export function patchPublishedApp(
  appId: string,
  replacements: Array<{ find: string; replace: string }>
) {
  if (replacements.length === 0) {
    throw new Error("No replacements provided");
  }

  const indexPath = ensurePublishedApp(appId);
  let html = fs.readFileSync(indexPath, "utf8");
  const applied: Array<{ find: string; count: number }> = [];

  for (const replacement of replacements) {
    if (!replacement.find) {
      throw new Error("Replacement find text cannot be empty");
    }
    const count = html.split(replacement.find).length - 1;
    if (count === 0) {
      throw new Error(`Patch target text not found: ${replacement.find.slice(0, 120)}`);
    }
    html = html.split(replacement.find).join(replacement.replace);
    applied.push({ find: replacement.find, count });
  }

  const version = savePublishedAppVersion(appId, "before patch");
  fs.writeFileSync(indexPath, html, "utf8");

  return {
    appId,
    updatedAt: readMtimeIso(indexPath),
    size: Buffer.byteLength(html, "utf8"),
    backupVersionId: version.versionId,
    applied,
  };
}

export function validateEasyDataHtml(appId: string, html: string) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const detectedEndpoints = extractEndpoints(html);
  const detectedTables = extractDetectedTables(html, appId);
  const { lookup } = schemaLookup(appId);
  const app = getAppMeta(appId);

  if (!html.includes(`/apps/${appId}/tables/`) && !html.includes("/apps/")) {
    warnings.push("No canonical /apps/{appId}/tables/{table}/rows endpoint was detected.");
  }

  if (/easydata\.just-build\.it|\.easydata\.app/i.test(html)) {
    errors.push("HTML uses an invented EasyData host. Use relative /apps/... URLs or https://easydata.is/generated/{appId}/ only for the public app URL.");
  }

  if (/https?:\/\/(?!easydata\.is)([^'"`\s]+)\/apps\//i.test(html)) {
    errors.push("HTML uses an unknown absolute API host. Browser fetch calls must use relative /apps/... URLs.");
  }

  if (/\/api\/(apps|rows|[0-9a-f-]{36}|\$\{)/i.test(html)) {
    errors.push("HTML uses unsupported /api routes. Use /apps/{appId}/tables/{table}/rows.");
  }

  if (/method\s*:\s*['"]PATCH['"]/i.test(html)) {
    errors.push("HTML uses PATCH. EasyData generated apps should use PUT for row updates.");
  }

  if (html.includes("/uploads/")) {
    errors.push("HTML uses public /uploads URLs. Use /apps/{appId}/files and signed view URLs.");
  }

  if (html.includes(`Bearer ${app.apiToken}`) === false && !/Authorization\s*:\s*[`'"]Bearer\s+\$\{/.test(html)) {
    warnings.push("No Authorization: Bearer app token was detected. Browser API requests may fail with 401.");
  }

  if (/readAsDataURL|toDataURL|data:image\//i.test(html)) {
    errors.push("HTML embeds image files as base64/data URLs. EasyData generated apps should upload photos to /apps/{appId}/files and store the returned fileName, not the binary payload.");
  }

  if (/\/apps\/[^`'"\s]+\/upload\b/.test(html) || html.includes(`/${appId}/upload`) || html.includes("/storage/upload")) {
    errors.push("HTML uses /upload or /storage/upload. EasyData file uploads must POST multipart data to /apps/{appId}/files.");
  }

  if (/body\s*:\s*JSON\.stringify\(\s*\{\s*(data|row|fields)\s*:/.test(html)) {
    errors.push("HTML wraps row payloads in { data: ... }, { row: ... }, or { fields: ... }. EasyData row APIs expect column fields directly.");
  }

  if (/row\.data\b|item\.data\b|\w+\.data\.[A-Za-z_]/.test(html)) {
    warnings.push("HTML reads row.data.*. EasyData rows are returned as direct row fields, e.g. row.student_name.");
  }

  for (const tableName of detectedTables) {
    if (!lookup.has(tableName)) {
      errors.push(`HTML references unknown table '${tableName}'.`);
    }
  }

  const postBodies = html.matchAll(/JSON\.stringify\(\s*\{([\s\S]*?)\}\s*\)/g);
  const knownColumns = new Set<string>();
  for (const columns of lookup.values()) {
    for (const column of columns) knownColumns.add(column);
  }
  for (const match of postBodies) {
    const keys = extractObjectKeys(match[1] ?? "");
    for (const key of keys) {
      if (["headers", "method", "body", "data"].includes(key)) continue;
      if (!knownColumns.has(key)) {
        warnings.push(`Possible unknown row field '${key}' in JSON.stringify body.`);
      }
    }
  }

  return {
    appId,
    valid: errors.length === 0,
    errors: Array.from(new Set(errors)),
    warnings: Array.from(new Set(warnings)),
    detectedTables,
    detectedEndpoints,
  };
}

export function runPublishedAppHealthCheck(appId: string) {
  const source = getPublishedAppSource(appId);
  const validation = validateEasyDataHtml(appId, source.html);
  const htmlWarnings = [...validation.warnings];
  const failedRequests: Array<{ url: string; method: string; status: number; responseText?: string }> = [];

  for (const endpoint of validation.detectedEndpoints) {
    if (endpoint.includes("/api/") || endpoint.includes("/upload") || endpoint.includes("/uploads/")) {
      failedRequests.push({
        url: endpoint,
        method: "UNKNOWN",
        status: 0,
        responseText: "Static validation detected a likely unsupported EasyData endpoint.",
      });
    }
  }

  if (!/<script[\s>]/i.test(source.html)) {
    htmlWarnings.push("No script tag detected; app may not load or save dynamic data.");
  }

  const openBraces = (source.html.match(/\{/g) ?? []).length;
  const closeBraces = (source.html.match(/\}/g) ?? []).length;
  if (Math.abs(openBraces - closeBraces) > 2) {
    htmlWarnings.push("Brace counts look imbalanced; possible malformed JavaScript or template string.");
  }

  return {
    appId,
    ok: validation.valid && failedRequests.length === 0,
    status: 200,
    consoleErrors: validation.errors,
    failedRequests,
    htmlWarnings: Array.from(new Set(htmlWarnings)),
    source: {
      updatedAt: source.updatedAt,
      size: source.size,
    },
  };
}

export function getTemplate(kind: string) {
  if (kind !== "shared-highscore-game" && kind !== "canvas-shooter-highscores") {
    throw new Error("Unknown template kind. Supported: shared-highscore-game, canvas-shooter-highscores");
  }

  return {
    kind,
    description: "Single-file responsive canvas click game with EasyData-backed high scores.",
    requiredTable: {
      tableName: "scores",
      columns: [
        { name: "player_name", type: "TEXT" },
        { name: "score", type: "INTEGER" },
        { name: "played_at", type: "TEXT" },
      ],
    },
    notes: [
      "Create the scores table first.",
      "Use create_game_template with the real appId, tableName, and apiToken to generate final HTML.",
      "Publish with publish_app_versioned, then run run_app_health_check.",
    ],
  };
}

export function createGameTemplate(input: {
  appId: string;
  tableName?: string;
  apiToken?: string;
  template?: string;
}) {
  const tableName = input.tableName ?? "scores";
  const app = getAppMeta(input.appId);
  const apiToken = input.apiToken ?? app.apiToken;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>High Score Dash</title>
<style>
:root{font-family:Arial,Helvetica,sans-serif;color:#172033;background:#f6f7fb}*{box-sizing:border-box}body{margin:0;padding:18px}.wrap{max-width:980px;margin:0 auto}header{display:flex;justify-content:space-between;gap:12px;align-items:end;flex-wrap:wrap;margin-bottom:14px}h1{margin:0;font-size:30px}.panel{background:#fff;border:1px solid #d9deea;border-radius:8px;padding:14px;box-shadow:0 1px 3px #0001}.setup{display:flex;gap:10px;flex-wrap:wrap;align-items:end}label{display:grid;gap:5px;font-weight:700;font-size:14px}input{font:inherit;padding:10px 12px;border:1px solid #b8c0cf;border-radius:6px;min-width:220px}button{font:inherit;font-weight:700;border:0;border-radius:6px;padding:10px 14px;background:#1957d2;color:#fff;cursor:pointer}button.secondary{background:#45546f}button:disabled{background:#9aa4b5;cursor:not-allowed}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0}.stat{background:#fff;border:1px solid #d9deea;border-radius:8px;padding:12px;text-align:center}.stat b{display:block;font-size:28px}.game{position:relative;height:420px;border:2px solid #26334d;border-radius:8px;background:linear-gradient(#fbfcff,#edf2fb);overflow:hidden;touch-action:manipulation}.target{position:absolute;width:58px;height:58px;border-radius:50%;border:4px solid #fff;background:#e9334f;box-shadow:0 6px 18px #0004;display:none;transform:translate(-50%,-50%)}.target:after{content:"";position:absolute;inset:13px;border-radius:50%;background:#ffd647}.message{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;font-size:22px;font-weight:800;color:#26334d;pointer-events:none}.bottom{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}.leader ol{margin:8px 0 0;padding-left:28px}.leader li{padding:7px 0;border-bottom:1px solid #edf0f6}.muted{color:#60708c;font-size:14px}.saveRow{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:10px}@media(max-width:720px){body{padding:10px}.bottom{grid-template-columns:1fr}.stats{grid-template-columns:1fr 1fr 1fr}.game{height:360px}h1{font-size:25px}input{min-width:0;width:100%}}
</style>
</head>
<body><div class="wrap"><header><div><h1>High Score Dash</h1><div class="muted">Click the moving target for 30 seconds.</div></div><button class="secondary" id="refreshBtn">Refresh Leaderboard</button></header><section class="panel setup"><label>Player name<input id="nameInput" maxlength="32" autocomplete="name" placeholder="Type your name"></label><button id="startBtn">Start 30 Second Game</button></section><section class="stats"><div class="stat"><span>Score</span><b id="scoreOut">0</b></div><div class="stat"><span>Time</span><b id="timeOut">30</b></div><div class="stat"><span>Streak</span><b id="streakOut">0</b></div></section><main class="game" id="game"><div class="message" id="message">Enter your name, then start.</div><button class="target" id="target" aria-label="Click target"></button></main><div class="bottom"><section class="panel"><h2>Save Score</h2><div id="resultText" class="muted">Finish a game to save your score.</div><div class="saveRow"><button id="saveBtn" disabled>Save High Score</button><span id="saveStatus" class="muted"></span></div></section><section class="panel leader"><h2>Leaderboard</h2><ol id="leaderboard"><li class="muted">Loading...</li></ol></section></div></div><script>
const appId=${JSON.stringify(input.appId)};const apiToken=${JSON.stringify(apiToken)};const tableName=${JSON.stringify(tableName)};const rowsUrl='/apps/'+appId+'/tables/'+tableName+'/rows';const headers={'Content-Type':'application/json','Authorization':'Bearer '+apiToken};const $=id=>document.getElementById(id);const game=$('game'),target=$('target'),msg=$('message');let score=0,streak=0,bestStreak=0,timeLeft=30,running=false,timer=null,lastSavedKey='';function cleanName(){return $('nameInput').value.trim().replace(/\s+/g,' ').slice(0,32)}function updateStats(){$('scoreOut').textContent=score;$('timeOut').textContent=timeLeft;$('streakOut').textContent=streak}function moveTarget(){const r=game.getBoundingClientRect();const pad=42;const x=pad+Math.random()*Math.max(1,r.width-pad*2);const y=pad+Math.random()*Math.max(1,r.height-pad*2);target.style.left=x+'px';target.style.top=y+'px'}function startGame(){const name=cleanName();if(!name){$('nameInput').focus();msg.textContent='Type your name first.';return}score=0;streak=0;bestStreak=0;timeLeft=30;running=true;lastSavedKey='';$('saveBtn').disabled=true;$('saveStatus').textContent='';$('resultText').textContent='Game in progress.';msg.textContent='';msg.style.display='none';target.style.display='block';updateStats();moveTarget();clearInterval(timer);timer=setInterval(()=>{timeLeft--;updateStats();if(timeLeft<=0)endGame()},1000)}function endGame(){running=false;clearInterval(timer);target.style.display='none';msg.style.display='flex';msg.textContent='Time! Score: '+score+' | Best streak: '+bestStreak;$('resultText').textContent='Ready to save '+cleanName()+': '+score+' points.';$('saveBtn').disabled=false}target.addEventListener('click',e=>{e.stopPropagation();if(!running)return;score++;streak++;bestStreak=Math.max(bestStreak,streak);updateStats();moveTarget()});game.addEventListener('click',()=>{if(running){streak=0;updateStats()}});$('startBtn').addEventListener('click',startGame);$('saveBtn').addEventListener('click',async()=>{const name=cleanName();if(!name||running||timeLeft>0)return;const key=name+'|'+score;if(key===lastSavedKey)return;$('saveBtn').disabled=true;$('saveStatus').textContent='Saving...';try{const body={player_name:name,score:score,played_at:new Date().toISOString()};const res=await fetch(rowsUrl,{method:'POST',headers,body:JSON.stringify(body)});if(!res.ok)throw new Error('Save failed');lastSavedKey=key;$('saveStatus').textContent='Saved.';await loadLeaderboard()}catch(err){$('saveStatus').textContent='Could not save. Try again.';$('saveBtn').disabled=false}});function rowsFrom(data){if(Array.isArray(data))return data;if(Array.isArray(data.rows))return data.rows;return []}async function loadLeaderboard(){const list=$('leaderboard');list.innerHTML='<li class="muted">Loading...</li>';try{const res=await fetch(rowsUrl+'?order=score:desc&limit=50',{headers});if(!res.ok)throw new Error('Load failed');const rows=rowsFrom(await res.json()).sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)).slice(0,20);if(!rows.length){list.innerHTML='<li class="muted">No scores yet.</li>';return}list.innerHTML='';rows.forEach(row=>{const li=document.createElement('li');const date=row.played_at?new Date(row.played_at).toLocaleString():'';li.textContent=(row.player_name||'Player')+' - '+(Number(row.score)||0)+' points'+(date?' - '+date:'');list.appendChild(li)})}catch(err){list.innerHTML='<li class="muted">Leaderboard unavailable.</li>'}}$('refreshBtn').addEventListener('click',loadLeaderboard);updateStats();loadLeaderboard();
</script></body></html>`;

  return {
    template: input.template ?? "shared-highscore-game",
    appId: input.appId,
    tableName,
    html,
    validation: validateEasyDataHtml(input.appId, html),
  };
}
