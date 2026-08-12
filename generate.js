import OpenAI from "openai";

const TYPES = ["start", "end", "process", "decision", "data", "document", "predefined", "internalStorage", "database", "externalData", "punchedTape", "merge", "display", "extract", "manualOperation", "sort", "sequentialData", "preparation", "summingJunction", "manualInput", "offpageConnector", "or", "punchedCard", "loopLimit", "connector", "comment"];

const schema = {
  type:"object", additionalProperties:false,
  required:["title","lanes","nodes","edges","warnings"],
  properties:{
    title:{type:"string"},
    lanes:{type:"array",items:{type:"string"}},
    nodes:{type:"array",items:{
      type:"object",additionalProperties:false,
      required:["id","label","type","lane","description"],
      properties:{
        id:{type:"string"},label:{type:"string"},
        type:{type:"string",enum:TYPES},
        lane:{type:"string"},description:{type:"string"}
      }
    }},
    edges:{type:"array",items:{
      type:"object",additionalProperties:false,
      required:["id","source","target","label"],
      properties:{id:{type:"string"},source:{type:"string"},target:{type:"string"},label:{type:"string"}}
    }},
    warnings:{type:"array",items:{type:"string"}}
  }
};

const instructions = `你是企業 SOP 流程圖助手。依使用者提供的流程建立標準 SOP 或泳道圖。
可用圖形：
start 開始、end 結束、process 流程、decision 判定、data 數據、document 文件、
predefined 子流程、internalStorage 內部存儲、database 資料庫、externalData 外部數據、
punchedTape 條帶、merge 合併、display 展示、extract 摘錄、manualOperation 人工操作、
sort 排序、sequentialData 行列數據、preparation 預備、summingJunction 求和、
manualInput 人工輸入、offpageConnector 跨頁引用、or 或者、punchedCard 卡片、
loopLimit 迴圈限值、connector 頁面內引用／連接、comment 註解。
comment 是附註說明用的虛線註解框，不是一般流程步驟。
流程方向一致；判定分支用簡短標籤；泳道依負責角色／部門建立。
不得自行捏造公司政策、金額、期限、核准層級。資訊不足放 warnings 標示待確認。
修改既有流程時保留未被要求修改的內容與 ID。`;

export default async function handler(req,res){
  res.setHeader("Content-Type","application/json; charset=utf-8");
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const key=process.env.OPENAI_API_KEY;
  if(!key)return res.status(503).json({error:"AI API 尚未設定"});
  try{
    const client=new OpenAI({apiKey:key});
    const {instruction,currentDiagram,mode}=req.body||{};
    if(!instruction)return res.status(400).json({error:"請輸入流程內容"});
    const input=mode==="modify"&&currentDiagram
      ? `目前流程：\n${JSON.stringify(currentDiagram)}\n\n修改指令：\n${instruction}`
      : `建立新的 SOP：\n${instruction}`;
    const r=await client.responses.create({
      model:process.env.OPENAI_MODEL||"gpt-5",
      store:false,instructions,input,
      text:{format:{type:"json_schema",name:"sop_diagram",strict:true,schema}}
    });
    return res.status(200).json({diagram:JSON.parse(r.output_text)});
  }catch(e){
    console.error(e);
    return res.status(500).json({error:e?.message||"AI 產生失敗"});
  }
}
