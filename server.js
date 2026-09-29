const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const UPLOADS = path.join(ROOT, "uploads");
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

const db = new Database(path.join(ROOT, "codm.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS guns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT,
  image TEXT,
  description TEXT DEFAULT '',
  attachments TEXT NOT NULL DEFAULT '[]',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS callouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  map TEXT NOT NULL,
  image TEXT,
  description TEXT DEFAULT '',
  featured INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

const seedCount = db.prepare("SELECT COUNT(*) AS n FROM guns").get().n;
if (!seedCount) {
  const insert = db.prepare(`INSERT INTO guns (name,category,icon,image,description,attachments)
    VALUES (?,?,?,?,?,?)`);
  insert.run("M4", "Assault Rifle", "https://placehold.co/160x160/111827/ffffff?text=M4",
    "https://placehold.co/900x500/111827/ffffff?text=M4",
    "Balanced assault rifle setup.", JSON.stringify([
      {name:"Monolithic Suppressor",image:"https://placehold.co/500x300/1f2937/ffffff?text=Suppressor"},
      {name:"OWC Ranger",image:"https://placehold.co/500x300/1f2937/ffffff?text=Barrel"},
      {name:"No Stock",image:"https://placehold.co/500x300/1f2937/ffffff?text=Stock"},
      {name:"OWC Laser - Tactical",image:"https://placehold.co/500x300/1f2937/ffffff?text=Laser"},
      {name:"Granulated Grip Tape",image:"https://placehold.co/500x300/1f2937/ffffff?text=Grip"}
    ]));
  insert.run("QQ9", "SMG", "https://placehold.co/160x160/111827/ffffff?text=QQ9",
    "https://placehold.co/900x500/111827/ffffff?text=QQ9",
    "Fast close-range SMG setup.", JSON.stringify([
      {name:"Monolithic Suppressor",image:"https://placehold.co/500x300/1f2937/ffffff?text=Suppressor"},
      {name:"RTC Recon Tac Long",image:"https://placehold.co/500x300/1f2937/ffffff?text=Barrel"},
      {name:"No Stock",image:"https://placehold.co/500x300/1f2937/ffffff?text=Stock"},
      {name:"OWC Laser - Tactical",image:"https://placehold.co/500x300/1f2937/ffffff?text=Laser"},
      {name:"Stippled Grip Tape",image:"https://placehold.co/500x300/1f2937/ffffff?text=Grip"}
    ]));
}

const storage = multer.diskStorage({
  destination: (_,__,cb)=>cb(null,UPLOADS),
  filename: (_,file,cb)=>{
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g,"_");
    cb(null, Date.now()+"-"+safe);
  }
});
const upload = multer({storage, limits:{fileSize:8*1024*1024}});

app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({extended:true}));
app.use("/uploads", express.static(UPLOADS));
app.use(express.static(path.join(ROOT,"public")));

function admin(req,res,next){
  if(req.headers["x-admin-key"] !== "codm-admin-2026")
    return res.status(401).json({error:"Unauthorized. Admin access required."});
  next();
}

app.get("/api/guns",(req,res)=>{
  const rows=db.prepare("SELECT * FROM guns ORDER BY name").all();
  res.json(rows.map(r=>({...r,attachments:JSON.parse(r.attachments||"[]")})));
});
app.get("/api/callouts",(req,res)=>{
  res.json(db.prepare("SELECT * FROM callouts ORDER BY featured DESC, id DESC").all());
});

app.post("/api/login",(req,res)=>{
  const {username,password}=req.body||{};
  if(username==="admin" && password==="admin123"){
    return res.json({ok:true,key:"codm-admin-2026"});
  }
  res.status(401).json({error:"Invalid admin username or password."});
});

app.post("/api/guns",admin,upload.fields([{name:"icon",maxCount:1},{name:"image",maxCount:1},{name:"attachmentImages",maxCount:20}]),(req,res)=>{
  try{
    const b=req.body;
    const icon=req.files?.icon?.[0] ? "/uploads/"+req.files.icon[0].filename : (b.icon||"");
    const image=req.files?.image?.[0] ? "/uploads/"+req.files.image[0].filename : (b.image||"");
    let attachments=[];
    try { attachments=JSON.parse(b.attachments||"[]"); } catch {}
    const uploaded=req.files?.attachmentImages||[];
    uploaded.forEach((f,i)=>{ if(attachments[i]) attachments[i].image="/uploads/"+f.filename; });
    const info=db.prepare(`INSERT INTO guns(name,category,icon,image,description,attachments) VALUES(?,?,?,?,?,?)`)
      .run(b.name,b.category,icon,image,b.description||"",JSON.stringify(attachments));
    res.json({ok:true,id:info.lastInsertRowid});
  }catch(e){res.status(400).json({error:e.message});}
});

app.put("/api/guns/:id",admin,(req,res)=>{
  const {name,category,icon,image,description,attachments}=req.body;
  db.prepare(`UPDATE guns SET name=?,category=?,icon=?,image=?,description=?,attachments=? WHERE id=?`)
    .run(name,category,icon||"",image||"",description||"",JSON.stringify(attachments||[]),req.params.id);
  res.json({ok:true});
});
app.delete("/api/guns/:id",admin,(req,res)=>{
  db.prepare("DELETE FROM guns WHERE id=?").run(req.params.id);
  res.json({ok:true});
});

app.post("/api/callouts",admin,upload.single("image"),(req,res)=>{
  const b=req.body;
  const image=req.file?"/uploads/"+req.file.filename:(b.image||"");
  const info=db.prepare(`INSERT INTO callouts(title,map,image,description,featured) VALUES(?,?,?,?,?)`)
    .run(b.title,b.map,image,b.description||"",b.featured==="1"?1:0);
  res.json({ok:true,id:info.lastInsertRowid});
});
app.delete("/api/callouts/:id",admin,(req,res)=>{
  db.prepare("DELETE FROM callouts WHERE id=?").run(req.params.id);
  res.json({ok:true});
});

app.use((req,res)=>res.sendFile(path.join(ROOT,"public","index.html")));
app.listen(PORT,()=>console.log(`CODM Attachments running at http://localhost:${PORT}`));
