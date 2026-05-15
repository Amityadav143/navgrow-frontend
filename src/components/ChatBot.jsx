/**
 * NavBot — Professional AI Chat Assistant for Navgrow Engineering
 *
 * Features:
 *  - rAF-based streaming simulation (buttery smooth, no re-render flood)
 *  - Smart contextual follow-up suggestions (topic-aware)
 *  - Lead capture on purchase/project intent
 *  - Page-context tip (shows hint based on current route)
 *  - AbortController for instant cancel
 *  - Safe markdown renderer (zero dangerouslySetInnerHTML)
 *  - Per-message copy + feedback
 *  - Retry on error, offline detection
 *  - Full keyboard + screen-reader accessibility
 */
import React, {
  useState, useEffect, useRef, useCallback, useMemo, memo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, X, Send, Bot, User, RefreshCw, ChevronDown,
  Sparkles, Phone, ShoppingBag, Briefcase, Calculator, Package,
  Minimize2, Copy, Check, WifiOff, RotateCcw, ArrowRight,
  ExternalLink, Star, AlertTriangle, Zap,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import NavbotIcon from "@/components/NavbotIcon";
import api from "@/lib/api";

// ─── constants ───────────────────────────────────────────────────────────────
const STORAGE_KEY  = "navgrow_chat_v5";
const MAX_STORED   = 60;
const MAX_INPUT    = 1200;
const STREAM_MS    = 12;

const WELCOME = {
  id: "welcome", role: "assistant", ts: Date.now(), done: true,
  content: `Hi! 👋 I\'m **NavBot**, Navgrow\'s AI assistant.\n\nI can help you with:\n• Engineering services & project quotes\n• Safety products & shop orders\n• Order tracking & support\n• Career opportunities\n• Certifications & company info\n\nWhat can I help you with today?`,
};

const STARTERS = [
  { e:"🔧", label:"Services",       text:"What engineering services do you offer?" },
  { e:"🛒", label:"Products",       text:"What safety products do you sell?" },
  { e:"📋", label:"Get a Quote",    text:"How do I get a quote for a project?" },
  { e:"📦", label:"Track Order",    text:"How do I track my order?" },
  { e:"💼", label:"Open Jobs",      text:"What jobs are currently open?" },
  { e:"📞", label:"Contact",        text:"What are your contact details?" },
  { e:"🏆", label:"Certifications", text:"What certifications does Navgrow hold?" },
  { e:"🎟", label:"Discounts",      text:"Are there any discount codes available?" },
];

const FOLLOW_UPS = {
  shop:    ["What are your bestselling products?","Do you offer bulk discounts?","What is your return policy?"],
  service: ["What is the project cost range?","How long does a project take?","Are you empanelled with Indian Railways?"],
  career:  ["How do I apply?","What qualifications are required?","Is relocation required?"],
  quote:   ["What details do I need to provide?","How soon do you respond?","Can I call to discuss?"],
  track:   ["What is my order number format?","What is the delivery time?","Can I change delivery address?"],
  contact: ["What are your business hours?","Can I visit your office?","Is WhatsApp support available?"],
  payment: ["What payment methods do you accept?","Is GST invoice provided?","Is payment secure?"],
};

const PAGE_TIPS = {
  "/shop":             "🛒 Browsing our shop! I can help you find the right product.",
  "/quote-calculator": "📋 Working on a quote? Ask me about pricing or scope.",
  "/careers":          "💼 Interested in joining us? Ask me about any open role.",
  "/contact":          "📞 Need to reach us? I can help or give you direct contacts.",
  "/track-order":      "📦 Tracking an order? Share the order number and I\'ll guide you.",
  "/services":         "🔧 Exploring our services? Ask me anything about what we offer.",
  "/projects":         "🏗 Looking at our portfolio? Ask about any specific project.",
};

const QUICK_NAV = [
  { Icon: ShoppingBag, label:"Shop",  to:"/shop",             cls:"hover:bg-blue-900/50 hover:text-blue-300" },
  { Icon: Calculator,  label:"Quote", to:"/quote-calculator", cls:"hover:bg-violet-900/50 hover:text-violet-300" },
  { Icon: Package,     label:"Track", to:"/track-order",      cls:"hover:bg-green-900/50 hover:text-green-300" },
  { Icon: Briefcase,   label:"Jobs",  to:"/careers",          cls:"hover:bg-amber-900/50 hover:text-amber-300" },
];

const LEAD_KEYS = ["quote","project","contract","tender","railway","maintenance","amc","hire","consulting","audit","bulk order","budget"];

// ─── helpers ─────────────────────────────────────────────────────────────────
function detectTopic(text) {
  const t = text.toLowerCase();
  if (t.match(/shop|product|₹|price|order/))               return "shop";
  if (t.match(/service|railway|infrastructure|loco/))      return "service";
  if (t.match(/career|job|position|hiring|vacancy/))       return "career";
  if (t.match(/quote|estimate|cost|budget/))               return "quote";
  if (t.match(/track|delivery|shipping|dispatch/))         return "track";
  if (t.match(/contact|email|phone|whatsapp|call/))        return "contact";
  if (t.match(/payment|upi|razorpay|invoice|gst/))         return "payment";
  return null;
}

function hasLeadIntent(text) {
  const t = text.toLowerCase();
  return LEAD_KEYS.some(k => t.includes(k));
}

// ─── safe markdown ────────────────────────────────────────────────────────────
function parseBold(text) {
  if (!text?.includes("**")) return text;
  return text.split(/(\*\*[^*]+\*\*)/g).map((p,i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} className="font-semibold">{p.slice(2,-2)}</strong>
      : <span key={i}>{p}</span>
  );
}

const MdLine = memo(({ line, isUser }) => {
  const m = line.match(/^(\d+)\.\s(.+)/);
  if (m) return (
    <div className="flex gap-2 items-start">
      <span className={`shrink-0 text-xs font-bold mt-0.5 ${isUser?"text-blue-200":"text-blue-400"}`}>{m[1]}.</span>
      <span>{parseBold(m[2])}</span>
    </div>
  );
  if (/^[•\-\*]\s/.test(line)) return (
    <div className="flex gap-2 items-start">
      <span className={`mt-[7px] w-1.5 h-1.5 rounded-full shrink-0 ${isUser?"bg-blue-200":"bg-blue-400"}`}/>
      <span>{parseBold(line.slice(2))}</span>
    </div>
  );
  if (line.startsWith("## ")) return (
    <p className={`font-bold ${isUser?"text-white":"text-blue-300"}`}>{parseBold(line.slice(3))}</p>
  );
  return <p>{parseBold(line)}</p>;
});

const MdText = memo(({ text, isUser }) => {
  if (!text) return null;
  return (
    <div className={`text-sm leading-relaxed space-y-1.5 ${isUser?"text-white":"text-gray-100"}`}>
      {text.split("\n").map((line, i) =>
        !line.trim() ? <div key={i} className="h-1"/> : <MdLine key={i} line={line} isUser={isUser}/>
      )}
    </div>
  );
});

// ─── sub-components ───────────────────────────────────────────────────────────
const Dots = memo(() => (
  <div className="flex items-center gap-1.5 py-2 px-1">
    {[0,1,2].map(i=>(
      <span key={i} className="w-2 h-2 rounded-full bg-blue-400"
        style={{animation:`nb-dot 1s ${i*.18}s ease-in-out infinite alternate`}}/>
    ))}
    <style>{`@keyframes nb-dot{from{transform:translateY(0);opacity:.4}to{transform:translateY(-5px);opacity:1}}`}</style>
  </div>
));

const Bubble = memo(({ msg, streaming }) => {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";
  const copy = useCallback(async () => {
    try { await navigator.clipboard.writeText(msg.content); setCopied(true); setTimeout(()=>setCopied(false),2000); } catch {}
  }, [msg.content]);
  const time = useMemo(()=> new Date(msg.ts).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}),[msg.ts]);
  return (
    <motion.div initial={{opacity:0,y:10,scale:.97}} animate={{opacity:1,y:0,scale:1}} transition={{duration:.2,ease:"easeOut"}}
      className={`flex gap-2 items-end ${isUser?"flex-row-reverse":"flex-row"}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mb-[22px] ${isUser?"bg-blue-600":"bg-transparent"}`}>
        {isUser?<User className="h-3.5 w-3.5 text-white"/>:<NavbotIcon size={28} />}
      </div>
      <div className={`flex flex-col gap-1 max-w-[82%] ${isUser?"items-end":"items-start"}`}>
        <div className={`group relative rounded-2xl px-3.5 py-2.5 ${isUser?"bg-blue-600 rounded-br-sm":msg.isError?"bg-red-950/60 border border-red-800/50 rounded-bl-sm":"bg-gray-800 border border-gray-700/30 rounded-bl-sm"}`}>
          {msg.isError && <AlertTriangle className="h-3.5 w-3.5 text-red-400 mb-1"/>}
          <MdText text={streaming ? msg.content+"▌" : msg.content} isUser={isUser}/>
          {!isUser && !streaming && (
            <button onClick={copy} className="absolute -top-2.5 -right-2.5 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center hover:bg-gray-600 transition-all" title="Copy" aria-label="Copy message">
              {copied?<Check className="h-3 w-3 text-green-400"/>:<Copy className="h-3 w-3 text-gray-300"/>}
            </button>
          )}
        </div>
        <span className="text-[10px] text-gray-600 px-1">{time}</span>
      </div>
    </motion.div>
  );
});

const FollowUps = memo(({ chips, onSend }) => {
  if (!chips?.length) return null;
  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.1}}
      className="ml-9 flex flex-wrap gap-1.5 mt-1.5">
      {chips.map((c,i)=>(
        <button key={i} onClick={()=>onSend(c)}
          className="flex items-center gap-1 px-2.5 py-1 bg-gray-800/80 hover:bg-blue-900/60 border border-gray-700 hover:border-blue-600/60 text-gray-400 hover:text-blue-300 rounded-full text-[11px] font-medium transition-all group">
          {c}<ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"/>
        </button>
      ))}
    </motion.div>
  );
});

const FeedbackRow = memo(({ onRate }) => {
  const [r, setR] = useState(null);
  if (r) return <p className="ml-9 mt-1 text-[10px] text-gray-600">Thanks for your feedback!</p>;
  return (
    <div className="ml-9 mt-1 flex items-center gap-2">
      <span className="text-[10px] text-gray-600">Helpful?</span>
      {[["👍","yes"],["👎","no"]].map(([e,v])=>(
        <button key={v} onClick={()=>{setR(v);onRate?.(v);}} className="text-sm hover:scale-125 transition-transform leading-none" aria-label={v==="yes"?"Helpful":"Not helpful"}>{e}</button>
      ))}
    </div>
  );
});

const LeadCapture = memo(({ onSubmit, onDismiss }) => {
  const [name,setName]=useState(""); const [phone,setPhone]=useState(""); const [sent,setSent]=useState(false);
  if (sent) return (
    <motion.div initial={{opacity:0,scale:.95}} animate={{opacity:1,scale:1}}
      className="mx-2 my-3 p-3.5 bg-green-950/60 border border-green-800/50 rounded-2xl text-center">
      <p className="text-green-400 font-semibold text-sm">✓ We&apos;ll reach out shortly!</p>
      <p className="text-green-600 text-xs mt-0.5">Usually within 2 business hours</p>
    </motion.div>
  );
  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
      className="mx-2 my-3 p-3.5 bg-blue-950/60 border border-blue-800/40 rounded-2xl">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-blue-300 font-semibold text-xs flex items-center gap-1.5"><Zap className="h-3.5 w-3.5"/>Quick Connect</p>
          <p className="text-gray-400 text-[11px] mt-0.5">Get a callback within 2 hours</p>
        </div>
        <button onClick={onDismiss} className="text-gray-600 hover:text-gray-400 transition-colors"><X className="h-3.5 w-3.5"/></button>
      </div>
      <div className="space-y-2">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" className="w-full bg-gray-800 text-gray-100 placeholder-gray-500 rounded-xl px-3 py-2 text-xs border border-gray-700 focus:outline-none focus:border-blue-500"/>
        <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" type="tel" className="w-full bg-gray-800 text-gray-100 placeholder-gray-500 rounded-xl px-3 py-2 text-xs border border-gray-700 focus:outline-none focus:border-blue-500"/>
        <button onClick={()=>{ if(name.trim()&&phone.trim()){onSubmit({name:name.trim(),phone:phone.trim()});setSent(true);}}}
          disabled={!name.trim()||!phone.trim()}
          className="w-full py-2 brand-gradient text-white rounded-xl text-xs font-bold disabled:opacity-40 hover:opacity-90 transition-opacity">
          Request Callback
        </button>
      </div>
    </motion.div>
  );
});

// ─── main component ───────────────────────────────────────────────────────────
const ChatBot = () => {
  const location = useLocation();
  const pageTip  = PAGE_TIPS[location.pathname] || null;

  const [open,       setOpen]      = useState(false);
  const [min,        setMin]       = useState(false);
  const [messages,   setMessages]  = useState(()=>{
    try{const r=localStorage.getItem(STORAGE_KEY);const p=r?JSON.parse(r):null;return Array.isArray(p)&&p.length?p:[WELCOME];}catch{return[WELCOME];}
  });
  const [input,      setInput]     = useState("");
  const [loading,    setLoading]   = useState(false);
  const [badge,      setBadge]     = useState(false);
  const [online,     setOnline]    = useState(true);
  const [followUps,  setFollowUps] = useState([]);
  const [showDown,   setShowDown]  = useState(false);
  const [retryText,  setRetryText] = useState("");
  const [showLead,   setShowLead]  = useState(false);
  const [leadShown,  setLeadShown] = useState(false);

  /* ── Proactive opener — auto-suggest after 45s if not interacted ── */
  useEffect(() => {
    const sessionKey = 'ng_chat_proactive';
    if (sessionStorage.getItem(sessionKey)) return;
    const timer = setTimeout(() => {
      if (!open && messages.length <= 1) {
        setBadge(true);
        sessionStorage.setItem(sessionKey, '1');
      }
    }, 45000);
    return () => clearTimeout(timer);
  }, [open, messages.length]);

  const streamBufRef=useRef(""); const streamIdRef=useRef(null); const streamIdxRef=useRef(0);
  const rafRef=useRef(null); const timerRef=useRef(null);
  const bottomRef=useRef(null); const scrollRef=useRef(null); const inputRef=useRef(null); const abortRef=useRef(null);

  useEffect(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(messages.slice(-MAX_STORED)));}catch{}},[messages]);
  useEffect(()=>{const on=()=>setOnline(true),off=()=>setOnline(false);window.addEventListener("online",on);window.addEventListener("offline",off);return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off);};},[]);

  const scrollDown=useCallback((s=true)=>{ bottomRef.current?.scrollIntoView({behavior:s?"smooth":"instant"}); },[]);
  const onScroll=useCallback(()=>{ const el=scrollRef.current; if(el)setShowDown(el.scrollTop<el.scrollHeight-el.clientHeight-80); },[]);

  useEffect(()=>{
    if(open&&!min){setBadge(false);setTimeout(()=>{inputRef.current?.focus();scrollDown(false);},150);}
    if(!open){abortRef.current?.abort();abortRef.current=null;setLoading(false);clearTimers();}
  },[open,min,scrollDown]);

  useEffect(()=>{
    if(!open){const last=messages[messages.length-1];if(last?.role==="assistant"&&last.id!=="welcome")setBadge(true);}
  },[messages,open]);

  useEffect(()=>{ if(open&&!min)scrollDown(); },[messages.length,loading,open,min,scrollDown]);

  const clearTimers=useCallback(()=>{if(rafRef.current)cancelAnimationFrame(rafRef.current);if(timerRef.current)clearTimeout(timerRef.current);rafRef.current=null;timerRef.current=null;},[]);

  const startStream=useCallback((botId,text)=>{
    streamBufRef.current=text;streamIdRef.current=botId;streamIdxRef.current=0;clearTimers();
    const CHUNK=text.length>800?5:text.length>300?3:2;
    const tick=()=>{
      const idx=streamIdxRef.current,full=streamBufRef.current;
      if(idx>=full.length){
        setMessages(prev=>prev.map(m=>m.id===streamIdRef.current?{...m,content:full,done:true}:m));
        const topic=detectTopic(full);
        setFollowUps(topic?FOLLOW_UPS[topic].slice(0,3):[]);
        streamIdRef.current=null;streamBufRef.current="";
        return;
      }
      const next=Math.min(idx+CHUNK,full.length);
      setMessages(prev=>prev.map(m=>m.id===streamIdRef.current?{...m,content:full.slice(0,next)}:m));
      streamIdxRef.current=next;
      if(next%(CHUNK*10)===0)scrollDown();
      timerRef.current=setTimeout(()=>{rafRef.current=requestAnimationFrame(tick);},STREAM_MS);
    };
    timerRef.current=setTimeout(()=>{rafRef.current=requestAnimationFrame(tick);},STREAM_MS);
  },[clearTimers,scrollDown]);

  const addError=useCallback((content)=>{
    setMessages(prev=>[...prev,{id:`err-${Date.now()}`,role:"assistant",content,ts:Date.now(),isError:true,done:true}]);
  },[]);

  const doSend=useCallback(async(rawText)=>{
    const text=rawText.trim();if(!text||loading)return;
    setInput("");setFollowUps([]);
    if(inputRef.current)inputRef.current.style.height="42px";
    if(hasLeadIntent(text)&&!leadShown){setLeadShown(true);setTimeout(()=>setShowLead(true),2000);}
    const userMsg={id:`u-${Date.now()}`,role:"user",content:text,ts:Date.now(),done:true};
    const history=[...messages,userMsg];
    setMessages(history);setRetryText(text);setLoading(true);
    const payload=history.filter(m=>m.id!=="welcome"&&(m.role==="user"||m.role==="assistant")).map(m=>({role:m.role,content:m.content}));
    abortRef.current?.abort();abortRef.current=new AbortController();
    try{
      const{data}=await api.post("/chat",{messages:payload},{signal:abortRef.current.signal,timeout:45000});
      const reply=(data?.reply||data?.message||"").trim();
      if(!reply){addError("I received an empty response. Please try again.");return;}
      const botId=`bot-${Date.now()}`;
      setMessages(prev=>[...prev,{id:botId,role:"assistant",content:"",ts:Date.now(),done:false}]);
      startStream(botId,reply);
    }catch(err){
      if(err?.name==="AbortError"||err?.code==="ERR_CANCELED")return;
      const s=err?.response?.status;
      let msg;
      if(s===429)msg="Too many messages. Please wait a few minutes.\n\n**Contact:** info@navgrow.org · +91 89270 70972";
      else if(!err.response)msg="Connection issue. Check your internet.\n\n**Reach us:** info@navgrow.org · +91 89270 70972";
      else msg="Something went wrong. Please try again.\n\n**Help:** info@navgrow.org";
      addError(msg);
    }finally{
      setLoading(false);abortRef.current=null;
      setTimeout(()=>inputRef.current?.focus(),80);scrollDown();
    }
  },[loading,messages,leadShown,addError,startStream,scrollDown]);

  const sendMessage=useCallback((ov)=>doSend(ov??input),[doSend,input]);
  const retry=useCallback(()=>retryText&&doSend(retryText),[doSend,retryText]);
  const cancel=useCallback(()=>{
    abortRef.current?.abort();abortRef.current=null;clearTimers();setLoading(false);
    setMessages(prev=>{const last=prev[prev.length-1];if(last&&!last.done)return[...prev.slice(0,-1),{...last,content:last.content+"  _(cancelled)_",done:true}];return prev;});
  },[clearTimers]);
  const clearChat=useCallback(()=>{
    cancel();setMessages([WELCOME]);setFollowUps([]);setRetryText("");setShowLead(false);setLeadShown(false);
    try{localStorage.removeItem(STORAGE_KEY);}catch{}
  },[cancel]);

  const handleKey=useCallback((e)=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();} },[sendMessage]);
  const handleInput=useCallback((e)=>{
    const val=e.target.value.slice(0,MAX_INPUT);setInput(val);
    e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,116)+"px";
  },[]);
  const handleLeadSubmit=useCallback(({name,phone})=>{
    doSend(`My name is ${name} and I can be reached at ${phone}. Please have someone call me.`);
    setTimeout(()=>setShowLead(false),500);
  },[doSend]);

  const lastMsg=messages[messages.length-1];
  const lastIsDone=lastMsg?.done&&lastMsg?.role==="assistant"&&lastMsg.id!=="welcome";
  const showStarters=messages.length<=1&&!loading;
  const userCount=useMemo(()=>messages.filter(m=>m.role==="user").length,[messages]);
  const charLeft=MAX_INPUT-input.length;
  const currentlyStreaming=(id)=>id===streamIdRef.current||(id==="streaming"&&streamIdRef.current!==null);

  return (
    <>
      <motion.button onClick={()=>{setOpen(o=>!o);setMin(false);}} aria-label={open?"Close NavBot":"Open NavBot AI"} title="NavBot AI"
        className="fixed bottom-6 left-6 z-[90] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center brand-gradient text-white focus-visible:ring-4 focus-visible:ring-blue-400 focus:outline-none"
        whileHover={{scale:1.1}} whileTap={{scale:.9}}>
        <AnimatePresence mode="wait">
          {open
            ?<motion.span key="x" initial={{rotate:-90,opacity:0}} animate={{rotate:0,opacity:1}} exit={{rotate:90,opacity:0}} transition={{duration:.15}}><X className="h-6 w-6"/></motion.span>
            :<motion.span key="c" initial={{scale:.5,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.5,opacity:0}} transition={{duration:.15}} className="relative">
              <MessageCircle className="h-6 w-6"/>
              {badge&&<motion.span initial={{scale:0}} animate={{scale:1}} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-white flex items-center justify-center"><span className="text-[8px] text-white font-black">!</span></motion.span>}
            </motion.span>
          }
        </AnimatePresence>
      </motion.button>
      {!open&&<span className="fixed bottom-6 left-6 z-[89] w-14 h-14 rounded-full brand-gradient opacity-20 pointer-events-none" style={{animation:"nb-ping 3s cubic-bezier(0,0,.2,1) infinite"}}/>}
      <style>{`@keyframes nb-ping{0%{transform:scale(1);opacity:.2}75%,100%{transform:scale(2.1);opacity:0}}`}</style>

      <AnimatePresence>
        {open&&(
          <motion.div initial={{opacity:0,y:30,scale:.92}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:30,scale:.92}}
            transition={{type:"spring",stiffness:340,damping:32}}
            className="fixed bottom-24 left-4 z-[91] w-[calc(100vw-2rem)] sm:w-[390px] flex flex-col rounded-3xl overflow-hidden border border-white/5"
            style={{maxHeight:min?"auto":"min(86vh, 620px)",boxShadow:"0 32px 80px rgba(0,0,0,.65),0 0 0 1px rgba(255,255,255,.05)"}}
            role="dialog" aria-modal="true" aria-label="NavBot AI chat">

            {/* header */}
            <div className="brand-gradient px-4 py-3 flex items-center gap-3 shrink-0">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-white/15 border border-white/25 flex items-center justify-center"><Bot className="h-5 w-5 text-white"/></div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-blue-700 ${online?"bg-green-400":"bg-gray-400"}`}/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><span className="font-bold text-white text-sm">NavBot</span><span className="text-[9px] px-1.5 py-0.5 bg-white/20 text-blue-100 rounded-full font-bold tracking-widest">AI</span></div>
                <p className="text-[11px] text-blue-200 mt-0.5 flex items-center gap-1.5 truncate">
                  {loading?<><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0"/>Thinking…</>
                   :online?<><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0"/>Online · Navgrow Engineering</>
                   :<><WifiOff className="h-3 w-3 shrink-0 text-red-400"/>Offline</>}
                </p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={()=>setMin(m=>!m)} title={min?"Expand":"Minimise"} className="p-1.5 rounded-xl hover:bg-white/15 text-white/70 hover:text-white transition-colors"><ChevronDown className={`h-4 w-4 transition-transform duration-200 ${min?"":"rotate-180"}`}/></button>
                <button onClick={clearChat} title="New conversation" className="p-1.5 rounded-xl hover:bg-white/15 text-white/70 hover:text-white transition-colors"><RefreshCw className="h-4 w-4"/></button>
                <button onClick={()=>setOpen(false)} title="Close" className="p-1.5 rounded-xl hover:bg-red-500/25 text-white/70 hover:text-white transition-colors"><X className="h-4 w-4"/></button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {!min&&(
                <motion.div key="body" initial={{height:0}} animate={{height:"auto"}} exit={{height:0}} className="flex flex-col overflow-hidden">
                  {/* messages */}
                  <div ref={scrollRef} onScroll={onScroll} className="overflow-y-auto bg-gray-950 px-3 py-4 space-y-3"
                    style={{minHeight:"240px",maxHeight:"380px"}} role="log" aria-live="polite" aria-label="Chat messages">

                    {pageTip&&userCount===0&&(
                      <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:.5}}
                        className="mx-1 px-3.5 py-2.5 bg-blue-950/60 border border-blue-800/40 rounded-2xl text-xs text-blue-300 flex items-start gap-2">
                        <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-400"/>{pageTip}
                      </motion.div>
                    )}
                    {userCount>0&&<div className="flex items-center justify-center"><span className="text-[10px] text-gray-700 bg-gray-900/80 px-3 py-1 rounded-full border border-gray-800">Today</span></div>}

                    {messages.map((msg,idx)=>{
                      const isLast=idx===messages.length-1;
                      const streaming=isLast&&!msg.done&&msg.role==="assistant";
                      return(
                        <div key={msg.id}>
                          <Bubble msg={msg} streaming={streaming}/>
                          {msg.role==="assistant"&&isLast&&msg.done&&idx>0&&(
                            <>
                              <FollowUps chips={followUps} onSend={sendMessage}/>
                              {!msg.isError&&<FeedbackRow onRate={()=>{}}/>}
                              {msg.isError&&<div className="ml-9 mt-1"><button onClick={retry} className="flex items-center gap-1.5 text-[11px] text-gray-600 hover:text-blue-400 transition-colors"><RotateCcw className="h-3 w-3"/>Try again</button></div>}
                            </>
                          )}
                        </div>
                      );
                    })}

                    {loading&&(
                      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="flex gap-2 items-end">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center shrink-0"><Bot className="h-3.5 w-3.5 text-blue-200"/></div>
                        <div className="bg-gray-800 border border-gray-700/30 rounded-2xl rounded-bl-sm px-3 flex items-center gap-3">
                          <Dots/>
                          <button onClick={cancel} className="text-[10px] text-gray-600 hover:text-red-400 transition-colors pb-1 flex items-center gap-1" aria-label="Cancel"><X className="h-2.5 w-2.5"/>Stop</button>
                        </div>
                      </motion.div>
                    )}

                    {showLead&&<LeadCapture onSubmit={handleLeadSubmit} onDismiss={()=>setShowLead(false)}/>}

                    {showStarters&&(
                      <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.25}}>
                        <p className="text-[10px] text-gray-600 mb-2.5 ml-9 flex items-center gap-1"><Star className="h-3 w-3 text-blue-500 shrink-0"/>Quick topics to explore:</p>
                        <div className="flex flex-wrap gap-1.5 ml-9">
                          {STARTERS.map((s,i)=>(
                            <motion.button key={i} initial={{opacity:0,scale:.9}} animate={{opacity:1,scale:1}} transition={{delay:.3+i*.04}}
                              onClick={()=>sendMessage(s.text)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-blue-900/60 border border-gray-700 hover:border-blue-600/50 text-gray-300 hover:text-blue-200 rounded-full text-xs font-medium transition-all hover:shadow-md hover:shadow-blue-900/20">
                              <span>{s.e}</span>{s.label}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                    <div ref={bottomRef} aria-hidden="true"/>
                  </div>

                  <AnimatePresence>
                    {showDown&&<motion.button initial={{opacity:0,scale:.7}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.7}} onClick={()=>scrollDown()}
                      className="absolute bottom-32 right-5 w-8 h-8 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center shadow-xl hover:bg-gray-600 z-10" aria-label="Scroll to latest">
                      <ChevronDown className="h-4 w-4 text-gray-300"/>
                    </motion.button>}
                  </AnimatePresence>

                  {/* quick nav */}
                  <div className="bg-gray-900 border-t border-gray-800/50 px-3 py-2 flex items-center gap-1.5 shrink-0 overflow-x-auto">
                    <span className="text-[10px] text-gray-700 shrink-0 font-medium">Go to:</span>
                    {QUICK_NAV.map(({Icon,label,to,cls})=>(
                      <Link key={to} to={to} onClick={()=>setOpen(false)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-800 text-gray-400 text-[11px] font-semibold shrink-0 transition-all ${cls}`}>
                        <Icon className="h-3 w-3"/>{label}
                      </Link>
                    ))}
                    <a href="tel:+918927070972" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-green-900/30 hover:bg-green-900/60 text-green-400 text-[11px] font-bold shrink-0 transition-all border border-green-800/30 ml-auto">
                      <Phone className="h-3 w-3"/>Call
                    </a>
                  </div>

                  {!online&&<div className="bg-amber-950/60 border-t border-amber-800/40 px-4 py-2 flex items-center gap-2 shrink-0"><WifiOff className="h-3.5 w-3.5 text-amber-400 shrink-0"/><p className="text-xs text-amber-300">Offline — will send when reconnected.</p></div>}

                  {/* input */}
                  <div className="bg-gray-900 border-t border-gray-800/50 p-3 shrink-0">
                    <div className="flex items-end gap-2">
                      <div className="flex-1 relative">
                        <textarea ref={inputRef} value={input} onChange={handleInput} onKeyDown={handleKey}
                          placeholder="Ask anything about Navgrow…" rows={1}
                          disabled={loading||!online} aria-label="Type your message"
                          className="w-full bg-gray-800 text-gray-100 placeholder-gray-500 rounded-2xl pl-4 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed border border-gray-700/40 hover:border-gray-600/40 transition-all"
                          style={{minHeight:"42px",maxHeight:"116px"}}/>
                        {charLeft<300&&<span className={`absolute bottom-2.5 right-3 text-[9px] pointer-events-none ${charLeft<80?"text-red-400":"text-gray-600"}`}>{charLeft}</span>}
                      </div>
                      <motion.button onClick={()=>sendMessage()} disabled={!input.trim()||loading||!online}
                        whileHover={{scale:1.07}} whileTap={{scale:.9}} aria-label="Send message"
                        className="w-10 h-10 rounded-2xl brand-gradient text-white flex items-center justify-center shrink-0 disabled:opacity-35 disabled:cursor-not-allowed shadow-lg shadow-blue-900/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                        {loading?<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin block"/>:<Send className="h-4 w-4"/>}
                      </motion.button>
                    </div>
                    <div className="flex items-center justify-between mt-2 px-0.5">
                      <span className="text-[10px] text-gray-700">Enter to send · Shift+Enter new line</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1"><Sparkles className="h-2.5 w-2.5 text-blue-500"/><span className="text-[10px] text-gray-700">Claude AI</span></div>
                        <a href="/privacy" onClick={()=>setOpen(false)} className="text-[10px] text-gray-700 hover:text-gray-500 flex items-center gap-0.5 transition-colors">Privacy<ExternalLink className="h-2 w-2"/></a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;
