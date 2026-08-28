import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── TOKENS ───────────────────────────────────────────────────────────────────
const T = {
  blue:"#4A9EFF", blueDim:"#2E7FE0", blueDeep:"#1A5FC8",
  blueGlow:"rgba(74,158,255,0.18)", blueGlowSm:"rgba(74,158,255,0.10)",
  gold:"#E8C46A", black:"#000000",
  glass:"rgba(255,255,255,0.05)", glassBorder:"rgba(255,255,255,0.08)",
  glassActive:"rgba(74,158,255,0.06)",
  text:"#F2F2F7", textSub:"rgba(242,242,247,0.52)",
  textMute:"rgba(242,242,247,0.28)", error:"#FF6058",
};
const SP = {
  gentle:{ type:"spring",stiffness:110,damping:20 },
  snappy:{ type:"spring",stiffness:300,damping:28 },
  bouncy:{ type:"spring",stiffness:360,damping:22 },
  micro:{ type:"spring",stiffness:520,damping:36 },
  slow:{ type:"spring",stiffness:70,damping:18 },
  island:{ type:"spring",stiffness:420,damping:32 },
};

const SALARY=Math.floor(Math.random()*(120000-35000)+35000);
const SPENT=Math.floor(SALARY*(Math.random()*0.15+0.05));
const BAL=SALARY-SPENT;
function fmt(n){ return n.toLocaleString("en-IN"); }

// ─── NOTIFICATION DATA ────────────────────────────────────────────────────────
const TX_CATS=[
  {name:"Fuel",cat:"Transport",col:"#F6AD55",via:"HDFC UPI"},
  {name:"Groceries",cat:"Daily Needs",col:"#68D391",via:"PhonePe"},
  {name:"Coffee",cat:"Food & Drink",col:"#D4A96A",via:"GPay"},
  {name:"Food Delivery",cat:"Food & Drink",col:"#FC8181",via:"Swiggy"},
  {name:"Netflix",cat:"OTT",col:"#E50914",via:"Auto Debit"},
  {name:"Spotify",cat:"Music",col:"#1DB954",via:"Auto Debit"},
  {name:"Shopping",cat:"Retail",col:"#8A5CF6",via:"Amazon Pay"},
  {name:"Medicine",cat:"Health",col:"#63B3ED",via:"PhonePe"},
  {name:"Electricity",cat:"Utilities",col:"#F6E05E",via:"BBPS"},
  {name:"Recharge",cat:"Telecom",col:"#76E4F7",via:"GPay"},
  {name:"Travel",cat:"Transport",col:"#FC8181",via:"IRCTC UPI"},
  {name:"Restaurant",cat:"Food & Drink",col:"#FBD38D",via:"Zomato Pay"},
];

function genTransaction(){
  const cat=TX_CATS[Math.floor(Math.random()*TX_CATS.length)];
  const amt=Math.floor(Math.random()*1990+10);
  return { id:Date.now()+Math.random(), ...cat, amt, coins:amt, ts:new Date(), type:"spend" };
}

// Special notification types for Dynamic Island
const SPECIAL_NOTIFS=[
  { type:"weekly",  title:"Weekly Progress Updated",   sub:"₹850 away from Power User tier",  nav:"weekly"  },
  { type:"monthly", title:"Monthly Tier Progress",      sub:"Keep spending to unlock Silver",   nav:"monthly" },
  { type:"store",   title:"New Reward Available",       sub:"Visit Reward Store to claim",      nav:"store"   },
  { type:"coin",    title:"Coin Milestone Reached",     sub:"First milestone unlocked",         nav:"wallet"  },
];
function genSpecial(){
  return { id:Date.now()+Math.random(), ...SPECIAL_NOTIFS[Math.floor(Math.random()*SPECIAL_NOTIFS.length)] };
}

// ─── LOGO ─────────────────────────────────────────────────────────────────────
function LogoMark({size=32}){
  return(
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M7 5H20C23.866 5 27 8.134 27 12C27 15.866 23.866 19 20 19H7V5Z" fill="white" fillOpacity="0.92"/>
      <rect x="7" y="19" width="5" height="8" rx="2.5" fill="white" fillOpacity="0.92"/>
      <circle cx="20" cy="12" r="3" fill={T.blue} fillOpacity="0.7"/>
    </svg>
  );
}
function LogoBadge({size=40}){
  return(
    <div style={{ width:size,height:size,borderRadius:size*0.28,flexShrink:0,
      background:`linear-gradient(145deg,${T.blue},${T.blueDeep})`,
      display:"flex",alignItems:"center",justifyContent:"center",
      boxShadow:`0 0 ${size*0.7}px rgba(74,158,255,0.3)` }}>
      <LogoMark size={size*0.56}/>
    </div>
  );
}

// ─── PARTICLES ────────────────────────────────────────────────────────────────
function ParticleField({count=22,colors}){
  const pts=useRef(Array.from({length:count},(_,i)=>({
    id:i,x:Math.random()*100,y:Math.random()*100,
    s:Math.random()*2.5+0.8,op:Math.random()*0.3+0.04,
    dur:Math.random()*9+6,del:Math.random()*5,
    col:colors?colors[i%colors.length]:T.blue,
  }))).current;
  return(
    <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:0}}>
      {pts.map(p=>(
        <motion.div key={p.id}
          style={{position:"absolute",left:`${p.x}%`,top:`${p.y}%`,
            width:p.s,height:p.s,borderRadius:"50%",background:p.col,filter:`blur(${p.s*0.5}px)`}}
          animate={{y:[0,-26,0,16,0],x:[0,10,-7,4,0],
            opacity:[0,p.op,p.op*0.55,p.op,0],scale:[0.8,1.2,0.9,1.1,0.8]}}
          transition={{duration:p.dur,delay:p.del,repeat:Infinity,ease:"easeInOut"}}/>
      ))}
    </div>
  );
}
function Glow({x=50,y=50,color=T.blueGlow,size=500,blur=40}){
  return(
    <div style={{position:"absolute",left:`${x}%`,top:`${y}%`,
      transform:"translate(-50%,-50%)",width:size,height:size,borderRadius:"50%",
      background:`radial-gradient(circle,${color} 0%,transparent 68%)`,
      filter:`blur(${blur}px)`,pointerEvents:"none",zIndex:0}}/>
  );
}

// ─── FLOATING INPUT ───────────────────────────────────────────────────────────
function FloatingInput({label,type="text",value,onChange,error}){
  const [focused,setFocused]=useState(false);
  const hasVal=value&&value.length>0;
  const floated=focused||hasVal;
  return(
    <div style={{position:"relative",marginBottom:16,width:"100%"}}>
      <motion.div
        animate={{
          borderColor:error?T.error:focused?T.blue:hasVal?"rgba(255,255,255,0.14)":T.glassBorder,
          background:focused?T.glassActive:T.glass,
          boxShadow:focused?`0 0 0 1px ${T.blue}3A,0 4px 20px rgba(74,158,255,0.07)`:error?`0 0 0 1px ${T.error}3A`:"none",
        }}
        transition={{duration:0.18}}
        style={{
          borderRadius:14, border:"1px solid",
          backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
          position:"relative", width:"100%",
          display:"flex", flexDirection:"column", justifyContent:"flex-end",
          height:58,
        }}>
        {/* Label floats inside the box — never outside */}
        <motion.label
          animate={{
            top: floated ? 8 : 19,
            fontSize: floated ? 10 : 15,
            color: error?T.error : focused?T.blue : T.textSub,
            letterSpacing: floated?"0.09em":"0",
            fontWeight: floated?600:400,
          }}
          transition={{duration:0.15, ease:[0.4,0,0.2,1]}}
          style={{
            position:"absolute", left:15, right:15,
            pointerEvents:"none", zIndex:2, lineHeight:1,
            textTransform: floated?"uppercase":"none",
          }}>
          {label}
        </motion.label>
        {/* Input sits at the bottom — cursor always inside the border */}
        <input
          type={type}
          value={value}
          onChange={onChange}
          onFocus={()=>setFocused(true)}
          onBlur={()=>setFocused(false)}
          autoComplete="off"
          style={{
            position:"relative", zIndex:1,
            background:"transparent", border:"none", outline:"none",
            width:"100%", padding:"0 15px 10px",
            fontSize:16, color:T.text, fontFamily:"inherit",
            caretColor:T.blue, boxSizing:"border-box",
            minWidth:0,
          }}/>
      </motion.div>
      <AnimatePresence>
        {error&&(
          <motion.p initial={{opacity:0,y:-3}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-3}}
            style={{color:T.error,fontSize:11,marginTop:4,marginLeft:3,fontWeight:500}}>
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── BUTTON ───────────────────────────────────────────────────────────────────
function Btn({children,onClick,full,large,disabled,variant="primary"}){
  const [ripples,setRipples]=useState([]);
  const fire=e=>{
    if(disabled)return;
    const r=e.currentTarget.getBoundingClientRect();
    const id=Date.now();
    setRipples(x=>[...x,{id,x:e.clientX-r.left,y:e.clientY-r.top}]);
    setTimeout(()=>setRipples(x=>x.filter(p=>p.id!==id)),650);
    onClick?.();
  };
  const pri=variant==="primary";
  return(
    <motion.button whileHover={disabled?{}:{scale:1.022}} whileTap={disabled?{}:{scale:0.972}}
      transition={SP.snappy} onClick={fire}
      style={{position:"relative",overflow:"hidden",width:full?"100%":"auto",
        padding:large?"17px 36px":"13px 28px",borderRadius:100,
        border:pri?"none":`1px solid ${T.glassBorder}`,
        background:pri?`linear-gradient(135deg,${T.blue},${T.blueDeep})`:T.glass,
        color:pri?"#fff":T.text,fontSize:large?16.5:15,fontWeight:700,letterSpacing:"0.015em",
        cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",opacity:disabled?0.42:1,
        boxShadow:pri?"0 0 32px rgba(74,158,255,0.3),0 4px 14px rgba(74,158,255,0.18)":"none",
        backdropFilter:!pri?"blur(16px)":"none",flexShrink:0}}>
      {ripples.map(rp=>(
        <motion.span key={rp.id} initial={{scale:0,opacity:0.3}} animate={{scale:6,opacity:0}}
          transition={{duration:0.6}}
          style={{position:"absolute",width:60,height:60,borderRadius:"50%",
            background:pri?"rgba(255,255,255,0.18)":"rgba(255,255,255,0.08)",
            left:rp.x-30,top:rp.y-30,pointerEvents:"none"}}/>
      ))}
      {children}
    </motion.button>
  );
}

function MiniHeader({step}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:26}}>
      <LogoBadge size={30}/>
      <span style={{fontSize:13,fontWeight:700,color:T.textSub,letterSpacing:"0.07em"}}>PAYMINT</span>
      {step&&<span style={{marginLeft:"auto",fontSize:12,color:T.textMute,fontWeight:500}}>Step {step} of 3</span>}
    </div>
  );
}

// ─── ANIMATED COUNT ───────────────────────────────────────────────────────────
function AnimatedCount({value,style}){
  const [display,setDisplay]=useState(value);
  const prev=useRef(value);
  useEffect(()=>{
    if(value===prev.current)return;
    const start=prev.current,end=value;
    const dur=Math.min(700,Math.abs(end-start)*2);
    const t0=Date.now();
    const tick=()=>{
      const p=Math.min((Date.now()-t0)/dur,1);
      const e=p<0.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
      setDisplay(Math.round(start+(end-start)*e));
      if(p<1)requestAnimationFrame(tick);
      else{setDisplay(end);prev.current=end;}
    };
    requestAnimationFrame(tick);
  },[value]);
  return <span style={style}>{fmt(display)}</span>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DYNAMIC ISLAND NOTIFICATION — Apple-grade centered pill
// ═══════════════════════════════════════════════════════════════════════════════
function DynamicIsland({notif, onDismiss, onNavigate}){
  const isSpend = notif?.type==="spend";
  // phase: pill → expand → content → contract → exit
  const [phase, setPhase] = useState("pill");
  const notifRef = useRef(null);

  useEffect(()=>{
    if(!notif){ setPhase("pill"); return; }
    notifRef.current = notif;
    setPhase("pill");
    const t1 = setTimeout(()=>setPhase("expand"), 60);
    const t2 = setTimeout(()=>setPhase("content"), 380);
    const t3 = setTimeout(()=>setPhase("contract"), 3600);
    const t4 = setTimeout(()=>{ setPhase("exit"); setTimeout(onDismiss, 300); }, 4000);
    return()=>{clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);clearTimeout(t4);};
  },[notif, onDismiss]);

  const handleTap=()=>{
    if(!notif)return;
    if(notif.nav) onNavigate?.(notif.nav);
    else if(isSpend) onNavigate?.("wallet");
    onDismiss();
  };

  const n = notif || notifRef.current;
  if(!n && phase==="pill") return null;

  // Width/height per phase
  const pillW = 126, pillH = 34;
  const expandW = 320, expandH = 72;
  const contentW = 360, contentH = 80;

  const widths  = { pill:pillW, expand:expandW, content:contentW, contract:pillW, exit:pillW };
  const heights = { pill:pillH, expand:expandH, content:contentH, contract:pillH, exit:pillH };
  const opacities= { pill:1, expand:1, content:1, contract:1, exit:0 };

  return(
    <AnimatePresence>
      {notif&&(
        <motion.div
          key={n?.id}
          style={{
            position:"absolute", top:14, left:"50%", x:"-50%",
            zIndex:500, cursor:"pointer",
          }}
          initial={{ y:-80, opacity:0, scale:0.7 }}
          animate={{ y:0, opacity:1, scale:1 }}
          exit={{ y:-70, opacity:0, scale:0.88 }}
          transition={{ ...SP.island }}
          onClick={handleTap}
        >
          {/* Island pill */}
          <motion.div
            animate={{
              width: widths[phase] ?? pillW,
              height: heights[phase] ?? pillH,
              borderRadius: phase==="pill"||phase==="contract"||phase==="exit" ? 100 : 26,
            }}
            transition={{ ...SP.island }}
            style={{
              background:"rgba(10,10,14,0.92)",
              backdropFilter:"blur(40px)",
              WebkitBackdropFilter:"blur(40px)",
              border:"1px solid rgba(255,255,255,0.1)",
              boxShadow:"0 0 0 1px rgba(255,255,255,0.05) inset, 0 12px 48px rgba(0,0,0,0.7), 0 4px 16px rgba(74,158,255,0.1)",
              overflow:"hidden",
              position:"relative",
            }}
          >
            {/* Pill state — just logo + dot */}
            <AnimatePresence>
              {(phase==="pill"||phase==="contract"||phase==="exit")&&(
                <motion.div
                  initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                  transition={{duration:0.18}}
                  style={{position:"absolute",inset:0,display:"flex",
                    alignItems:"center",justifyContent:"center",gap:8}}>
                  <div style={{width:16,height:16,borderRadius:5,
                    background:`linear-gradient(145deg,${T.blue},${T.blueDeep})`,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <LogoMark size={9}/>
                  </div>
                  <span style={{fontSize:12,fontWeight:700,color:T.text,letterSpacing:"0.04em"}}>
                    PAYMINT
                  </span>
                  {isSpend&&(
                    <motion.div
                      animate={{scale:[1,1.4,1],background:[T.gold,"#FFF599",T.gold]}}
                      transition={{duration:1.2,repeat:Infinity}}
                      style={{width:6,height:6,borderRadius:"50%",background:T.gold}}/>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Expanded content */}
            <AnimatePresence>
              {phase==="content"&&(
                <motion.div
                  initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}}
                  exit={{opacity:0,scale:0.92}} transition={{duration:0.22,...SP.snappy}}
                  style={{position:"absolute",inset:0,display:"flex",
                    alignItems:"center",padding:"0 14px",gap:12}}>

                  {/* Category icon */}
                  <motion.div
                    initial={{scale:0,rotate:-20}} animate={{scale:1,rotate:0}}
                    transition={{delay:0.06,...SP.bouncy}}
                    style={{width:46,height:46,borderRadius:14,flexShrink:0,
                      background:isSpend
                        ?`linear-gradient(145deg,${n.col}28,${n.col}12)`
                        :`linear-gradient(145deg,rgba(74,158,255,0.22),rgba(74,158,255,0.1))`,
                      border:`1px solid ${isSpend?n.col+"3A":"rgba(74,158,255,0.28)"}`,
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {isSpend?(
                      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                        <circle cx="11" cy="11" r="9" fill="none" stroke={n.col} strokeWidth="1.5"/>
                        <text x="11" y="15.5" textAnchor="middle" fill={n.col} fontSize="9.5" fontWeight="800"
                          fontFamily="Inter,-apple-system,sans-serif">P</text>
                      </svg>
                    ):n.type==="challenge"?(
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                        <path d="M10 2l2.5 5 5.5.8-4 3.9.95 5.5L10 14.5l-4.95 2.7.95-5.5L2 6.8l5.5-.8z"
                          fill={n.col||T.gold} fillOpacity="0.3" stroke={n.col||T.gold} strokeWidth="1.3" strokeLinejoin="round"/>
                      </svg>
                    ):(
                      n.type==="weekly"?(
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                          <path d="M10 2l2.5 5 5.5.8-4 3.9.95 5.5L10 14.5l-4.95 2.7.95-5.5L2 6.8l5.5-.8z"
                            fill={T.blue} fillOpacity="0.2" stroke={T.blue} strokeWidth="1.3" strokeLinejoin="round"/>
                        </svg>
                      ):n.type==="monthly"?(
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                          <circle cx="10" cy="10" r="8" fill="none" stroke={T.gold} strokeWidth="1.3"/>
                          <path d="M10 5v5l3 2" stroke={T.gold} strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                      ):n.type==="store"?(
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                          <rect x="2" y="8" width="16" height="11" rx="2.5" fill="none" stroke={T.blue} strokeWidth="1.3"/>
                          <path d="M6 8V6a4 4 0 018 0v2" stroke={T.blue} strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                      ):(
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                          <circle cx="10" cy="10" r="8" fill="none" stroke={T.gold} strokeWidth="1.4"/>
                          <text x="10" y="14.5" textAnchor="middle" fill={T.gold} fontSize="9" fontWeight="800"
                            fontFamily="Inter,-apple-system,sans-serif">P</text>
                        </svg>
                      )
                    )}
                  </motion.div>

                  {/* Text */}
                  <motion.div initial={{opacity:0,x:6}} animate={{opacity:1,x:0}}
                    transition={{delay:0.1,duration:0.22}} style={{flex:1,minWidth:0}}>
                    <p style={{margin:0,fontSize:12.5,fontWeight:700,color:T.text,
                      letterSpacing:"-0.01em",lineHeight:1.25,
                      whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {isSpend?`+${fmt(n.coins)} Coins Earned`:n.title}
                    </p>
                    <p style={{margin:"2px 0 0",fontSize:11,color:T.textSub,
                      whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {isSpend?`\u20B9${fmt(n.amt)} · ${n.via}`:n.sub}
                    </p>
                  </motion.div>

                  {/* Right badge */}
                  <motion.div
                    initial={{scale:0,opacity:0}} animate={{scale:1,opacity:1}}
                    transition={{delay:0.18,...SP.bouncy}}
                    style={{flexShrink:0,display:"flex",alignItems:"center",gap:5,
                      background:(isSpend||n.type==="challenge")?"rgba(232,196,106,0.12)":"rgba(74,158,255,0.12)",
                      border:`1px solid ${(isSpend||n.type==="challenge")?"rgba(232,196,106,0.25)":"rgba(74,158,255,0.25)"}`,
                      borderRadius:20,padding:"4px 9px"}}>
                    {(isSpend||n.type==="challenge")?(
                      <>
                        <motion.div
                          animate={{scale:[1,1.5,1],opacity:[0.8,1,0.8]}}
                          transition={{duration:0.9,repeat:Infinity}}
                          style={{width:6,height:6,borderRadius:"50%",background:T.gold}}/>
                        <span style={{fontSize:11.5,fontWeight:800,color:T.gold}}>
                          +{fmt(n.coins||n.reward||0)}
                        </span>
                      </>
                    ):(
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7l3 3 5-6" stroke={T.blue} strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Inner glow accent */}
            <motion.div
              animate={{opacity:phase==="content"?1:0}}
              transition={{duration:0.3}}
              style={{position:"absolute",bottom:-20,left:"50%",transform:"translateX(-50%)",
                width:200,height:40,borderRadius:"50%",
                background:isSpend?`rgba(232,196,106,0.12)`:`rgba(74,158,255,0.1)`,
                filter:"blur(14px)",pointerEvents:"none"}}/>
          </motion.div>

          {/* Coin fly-out particles on spend */}
          {isSpend&&phase==="content"&&(
            <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"visible"}}>
              {Array.from({length:5},(_,i)=>(
                <motion.div key={i}
                  initial={{opacity:0,x:contentW/2,y:contentH/2,scale:0}}
                  animate={{
                    opacity:[0,1,0],
                    x:contentW/2+(Math.cos((i/5)*Math.PI*2)*40),
                    y:contentH/2+(Math.sin((i/5)*Math.PI*2)*30)-20,
                    scale:[0,1.2,0],
                  }}
                  transition={{duration:0.8,delay:0.25+i*0.06,ease:"easeOut"}}
                  style={{position:"absolute",width:5,height:5,borderRadius:"50%",
                    background:T.gold,boxShadow:`0 0 6px ${T.gold}`,top:0,left:0}}/>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTRO SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function IntroScreen({onNext}){
  return(
    <div style={{position:"relative",width:"100%",height:"100%",background:T.black,
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
      <ParticleField count={28} colors={[T.blue,"rgba(74,158,255,0.4)","rgba(232,196,106,0.22)"]}/>
      <motion.div initial={{opacity:0,scale:0.5}} animate={{opacity:1,scale:1}} transition={{duration:2.5,ease:"easeOut"}}>
        <Glow x={50} y={44} color="rgba(74,158,255,0.11)" size={660}/>
        <Glow x={50} y={44} color="rgba(74,158,255,0.055)" size={880}/>
      </motion.div>
      {[340,490].map((sz,i)=>(
        <motion.div key={i}
          initial={{opacity:0,scale:0.55,rotate:i===0?-22:22}}
          animate={{opacity:i===0?0.07:0.04,scale:1,rotate:0}}
          transition={{duration:3+i*0.5,ease:"easeOut",delay:0.4+i*0.3}}
          style={{position:"absolute",width:sz,height:sz,borderRadius:"50%",
            border:`1px solid ${T.blue}`,pointerEvents:"none"}}/>
      ))}
      <div style={{textAlign:"center",position:"relative",zIndex:10}}>
        <motion.div initial={{opacity:0,scale:0.3}} animate={{opacity:1,scale:1}}
          transition={{duration:1.1,delay:0.5,...SP.gentle}} style={{marginBottom:22}}>
          <motion.div
            animate={{boxShadow:[`0 0 26px rgba(74,158,255,0.26)`,`0 0 52px rgba(74,158,255,0.48)`,`0 0 26px rgba(74,158,255,0.26)`]}}
            transition={{duration:3,repeat:Infinity,ease:"easeInOut"}}
            style={{width:68,height:68,borderRadius:20,
              background:`linear-gradient(145deg,${T.blue},${T.blueDeep})`,
              display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>
            <LogoMark size={36}/>
          </motion.div>
        </motion.div>
        <motion.h1 initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
          transition={{duration:0.85,delay:1,...SP.gentle}}
          style={{fontSize:54,fontWeight:800,letterSpacing:"-0.045em",color:T.text,margin:0,lineHeight:1}}>
          PAY<motion.span animate={{color:[T.blue,"#80BDFF",T.blue]}}
            transition={{duration:4,repeat:Infinity,ease:"easeInOut"}}>MINT</motion.span>
        </motion.h1>
        <motion.div initial={{scaleX:0,opacity:0}} animate={{scaleX:1,opacity:1}}
          transition={{duration:0.7,delay:1.5,ease:"easeOut"}}
          style={{width:34,height:1,background:`linear-gradient(90deg,transparent,${T.blue},transparent)`,margin:"16px auto"}}/>
        <motion.p initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.75,delay:1.6}}
          style={{fontSize:15.5,color:T.textSub,letterSpacing:"0.03em",fontWeight:400,margin:0,lineHeight:1.6}}>
          Every Rupee Deserves a Reward.
        </motion.p>
      </div>
      <motion.div initial={{opacity:0,y:42}} animate={{opacity:1,y:0}}
        transition={{duration:0.75,delay:2,...SP.gentle}}
        style={{position:"absolute",bottom:52,left:0,right:0,padding:"0 32px",zIndex:10}}>
        <Btn onClick={onNext} full large>Get Started</Btn>
      </motion.div>
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:110,
        background:"linear-gradient(to top,rgba(0,0,0,0.85),transparent)",pointerEvents:"none"}}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNT SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function AccountScreen({onNext}){
  const [form,setForm]=useState({name:"",email:"",mobile:"",dob:""});
  const [errors,setErrors]=useState({});
  const [touched,setTouched]=useState({});
  const validate=(f,v)=>{
    if(f==="name") return v.trim().length<2?"Enter your full name":null;
    if(f==="email") return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?"Enter a valid email":null;
    if(f==="mobile") return !/^\d{10}$/.test(v.replace(/\s/g,""))?"10-digit number required":null;
    if(f==="dob") return !v?"Date of birth required":null;
    return null;
  };
  const chg=f=>e=>{
    const v=e.target.value;setForm(x=>({...x,[f]:v}));
    if(touched[f])setErrors(x=>({...x,[f]:validate(f,v)}));
  };
  const submit=()=>{
    const errs={};let bad=false;
    Object.keys(form).forEach(k=>{const e=validate(k,form[k]);if(e){errs[k]=e;bad=true;}});
    setErrors(errs);setTouched({name:true,email:true,mobile:true,dob:true});
    if(!bad)onNext(form.name.trim().split(" ")[0]);
  };
  return(
    <div style={{position:"relative",width:"100%",height:"100%",background:T.black,
      display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <ParticleField count={12}/><Glow x={78} y={8} color="rgba(74,158,255,0.07)" size={360}/>
      <motion.div initial={{opacity:0,y:-16}} animate={{opacity:1,y:0}} transition={{duration:0.5,delay:0.1}}
        style={{padding:"52px 24px 0",flexShrink:0}}>
        <MiniHeader step={1}/>
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.25}}>
          <p style={{fontSize:12,color:T.blue,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>Basic Details</p>
          <h2 style={{fontSize:29,fontWeight:800,color:T.text,margin:"0 0 6px",letterSpacing:"-0.03em",lineHeight:1.18}}>Welcome to<br/>Paymint.</h2>
          <p style={{fontSize:14,color:T.textSub,margin:0,lineHeight:1.6}}>Set up your account in seconds.</p>
        </motion.div>
      </motion.div>
      <motion.div initial={{opacity:0,y:26}} animate={{opacity:1,y:0}} transition={{delay:0.35,...SP.gentle}}
        style={{padding:"24px 24px 0",flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>
        <FloatingInput label="Full Name" value={form.name} onChange={chg("name")} error={errors.name}/>
        <FloatingInput label="Email Address" type="email" value={form.email} onChange={chg("email")} error={errors.email}/>
        <FloatingInput label="Mobile Number" type="tel" value={form.mobile} onChange={chg("mobile")} error={errors.mobile}/>
        <FloatingInput label="Date of Birth" type="date" value={form.dob} onChange={chg("dob")} error={errors.dob}/>
        <div style={{display:"flex",gap:6,justifyContent:"center",margin:"4px 0 20px"}}>
          {["name","email","mobile","dob"].map(f=>(
            <motion.div key={f}
              animate={{background:form[f]&&!validate(f,form[f])?T.blue:T.glassBorder,
                scale:form[f]&&!validate(f,form[f])?1.3:1}}
              transition={SP.micro} style={{width:6,height:6,borderRadius:3}}/>
          ))}
        </div>
      </motion.div>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.5}}
        style={{padding:"12px 24px 44px",flexShrink:0}}>
        <Btn onClick={submit} full large>Continue</Btn>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECT BANK
// ═══════════════════════════════════════════════════════════════════════════════
const BANKS=[
  {id:"hdfc",name:"HDFC Bank",sub:"India's largest private bank",rgb:"66,153,225",fill:"#4299E1"},
  {id:"icici",name:"ICICI Bank",sub:"Facets of Life",rgb:"229,62,62",fill:"#E53E3E"},
  {id:"sbi",name:"State Bank of India",sub:"The Banker to Every Indian",rgb:"49,130,206",fill:"#3182CE"},
  {id:"axis",name:"Axis Bank",sub:"Badhte Ka Naam Zindagi",rgb:"237,137,54",fill:"#ED8936"},
];
function BankCard({bank,selected,onSelect}){
  return(
    <motion.div onClick={()=>onSelect(bank.id)} whileTap={{scale:0.975}}
      animate={{background:selected?`rgba(${bank.rgb},0.09)`:T.glass,
        borderColor:selected?bank.fill:T.glassBorder,
        boxShadow:selected?`0 0 0 1px rgba(${bank.rgb},0.22),0 8px 24px rgba(${bank.rgb},0.12)`:"0 2px 8px rgba(0,0,0,0.28)"}}
      transition={{duration:0.17}}
      style={{border:"1px solid",borderRadius:15,padding:"14px 15px",cursor:"pointer",
        backdropFilter:"blur(16px)",position:"relative",overflow:"hidden"}}>
      <AnimatePresence>
        {selected&&(
          <motion.div initial={{x:"-100%",opacity:0}} animate={{x:"220%",opacity:0.11}} exit={{opacity:0}}
            transition={{duration:0.42}}
            style={{position:"absolute",top:0,bottom:0,width:"55%",
              background:`linear-gradient(90deg,transparent,${bank.fill},transparent)`,pointerEvents:"none"}}/>
        )}
      </AnimatePresence>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <motion.div animate={{scale:selected?1.05:1}} transition={SP.micro}
          style={{width:42,height:42,borderRadius:12,flexShrink:0,
            background:`rgba(${bank.rgb},0.11)`,border:`1px solid rgba(${bank.rgb},0.2)`,
            display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="26" height="13" viewBox="0 0 26 13" fill="none">
            <rect width="26" height="13" rx="3" fill={bank.fill} fillOpacity="0.14"/>
            <text x="3" y="9.8" fill={bank.fill} fontSize="7" fontWeight="800" letterSpacing="0.4"
              fontFamily="Inter,-apple-system,sans-serif">{bank.id.toUpperCase()}</text>
          </svg>
        </motion.div>
        <div style={{flex:1,minWidth:0}}>
          <p style={{margin:0,fontSize:14.5,fontWeight:700,color:T.text}}>{bank.name}</p>
          <p style={{margin:0,fontSize:11.5,color:T.textSub,marginTop:2}}>{bank.sub}</p>
        </div>
        <motion.div animate={{scale:selected?1:0,opacity:selected?1:0}} transition={SP.bouncy}
          style={{width:20,height:20,borderRadius:"50%",background:T.blue,flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 7L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
}
function ConnectScreen({onNext}){
  const [sel,setSel]=useState(null);
  return(
    <div style={{position:"relative",width:"100%",height:"100%",background:T.black,
      display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <ParticleField count={10}/><Glow x={18} y={80} color="rgba(74,158,255,0.07)" size={360}/>
      <motion.div initial={{opacity:0,y:-16}} animate={{opacity:1,y:0}} transition={{duration:0.5,delay:0.1}}
        style={{padding:"52px 24px 0",flexShrink:0}}>
        <MiniHeader step={2}/>
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.25}}>
          <p style={{fontSize:12,color:T.blue,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>Connect Bank</p>
          <h2 style={{fontSize:27,fontWeight:800,color:T.text,margin:"0 0 6px",letterSpacing:"-0.03em",lineHeight:1.2}}>
            Connect Your<br/>Bank Account
          </h2>
          <p style={{fontSize:14,color:T.textSub,margin:0,lineHeight:1.6}}>Use UPI and your bank exactly as you do today.</p>
        </motion.div>
      </motion.div>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.38}}
        style={{padding:"20px 24px 0",flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
        {BANKS.map((b,i)=>(
          <motion.div key={b.id} initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}}
            transition={{delay:0.38+i*0.07,...SP.gentle}}>
            <BankCard bank={b} selected={sel===b.id} onSelect={setSel}/>
          </motion.div>
        ))}
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.78}}
          style={{marginTop:4,padding:"13px 15px",borderRadius:13,
            background:"rgba(74,158,255,0.04)",border:"1px solid rgba(74,158,255,0.1)"}}>
          {[
            {path:"M8 1L13 3.5V8C13 11.2 10.8 13.7 8 15C5.2 13.7 3 11.2 3 8V3.5L8 1Z",text:"Bank-grade 256-bit encryption"},
            {path:"M6 9a2.5 2.5 0 003.54.46L12 7a2.5 2.5 0 00-3.54-3.54L7 5",text:"Secure read-only access"},
            {path:"M3 8l3.5 3.5L13 4",text:"RBI compliant and certified"},
          ].map((item,i)=>(
            <motion.div key={i} initial={{opacity:0,x:-7}} animate={{opacity:1,x:0}}
              transition={{delay:0.86+i*0.06}}
              style={{display:"flex",alignItems:"center",gap:9,padding:"4px 0"}}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d={item.path} stroke={T.blue} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{fontSize:12,color:T.textSub,fontWeight:500}}>{item.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.55}}
        style={{padding:"12px 24px 44px",flexShrink:0}}>
        <Btn onClick={sel?onNext:undefined} full large disabled={!sel}>
          {sel?"Connect Account":"Select a Bank to Continue"}
        </Btn>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING
// ═══════════════════════════════════════════════════════════════════════════════
const LSTEPS=[
  {label:"Account Connected",sub:"Secure connection established"},
  {label:"Creating Your Rewards Profile",sub:"Personalising your experience…"},
  {label:"Preparing Your Dashboard",sub:"Cards are assembling…"},
  {label:"Almost Ready",sub:"Final touches in progress…"},
];
function LoadingScreen({onDone}){
  const [phase,setPhase]=useState("logo");
  const [step,setStep]=useState(0);
  const [progress,setProgress]=useState(0);
  useEffect(()=>{
    const t1=setTimeout(()=>setPhase("steps"),1600);
    let progTimer;const TOTAL=2800;
    const t2=setTimeout(()=>{
      const start=Date.now();
      const tick=()=>{const pct=Math.min(((Date.now()-start)/TOTAL)*100,100);setProgress(pct);if(pct<100)progTimer=requestAnimationFrame(tick);};
      progTimer=requestAnimationFrame(tick);
      [0,700,1400,2100].forEach((t,i)=>setTimeout(()=>setStep(i),t));
    },1600);
    const t3=setTimeout(()=>setPhase("coins"),1600+2900);
    const t4=setTimeout(()=>{setPhase("done");onDone();},1600+4200);
    return()=>{clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);clearTimeout(t4);if(progTimer)cancelAnimationFrame(progTimer);};
  },[onDone]);
  const txCards=[
    {del:0.1,label:"Salary Credit",amt:"+ 45,000",col:T.blue},
    {del:0.3,label:"Swiggy Order",amt:"- 342",col:"#E05D5D"},
    {del:0.55,label:"Amazon Pay",amt:"- 1,499",col:T.gold},
    {del:0.75,label:"PhonePe",amt:"+ 120",col:"#8A5CF6"},
  ];
  const coins=useMemo(()=>Array.from({length:20},(_,i)=>({angle:(i/20)*Math.PI*2,r:50+Math.random()*52,del:i*0.055})),[]);
  return(
    <div style={{position:"relative",width:"100%",height:"100%",background:T.black,
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
      <Glow x={50} y={50} color="rgba(74,158,255,0.1)" size={560}/><ParticleField count={16}/>
      <AnimatePresence mode="wait">
        {phase==="logo"&&(
          <motion.div key="lp" initial={{opacity:0,scale:0.7}} animate={{opacity:1,scale:1}}
            exit={{opacity:0,scale:1.15,filter:"blur(6px)"}} transition={{duration:0.6,...SP.gentle}}
            style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20,zIndex:10}}>
            <motion.div
              animate={{boxShadow:[`0 0 30px rgba(74,158,255,0.3)`,`0 0 70px rgba(74,158,255,0.55)`,`0 0 30px rgba(74,158,255,0.3)`]}}
              transition={{duration:2,repeat:Infinity,ease:"easeInOut"}}
              style={{width:80,height:80,borderRadius:22,background:`linear-gradient(145deg,${T.blue},${T.blueDeep})`,
                display:"flex",alignItems:"center",justifyContent:"center"}}>
              <LogoMark size={42}/>
            </motion.div>
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.3}}>
              <h2 style={{fontSize:26,fontWeight:800,color:T.text,letterSpacing:"-0.03em",margin:0,textAlign:"center"}}>PAYMINT</h2>
              <p style={{fontSize:13.5,color:T.textSub,margin:"6px 0 0",textAlign:"center"}}>Activating your account…</p>
            </motion.div>
          </motion.div>
        )}
        {phase==="steps"&&(
          <motion.div key="sp" initial={{opacity:0,scale:0.94}} animate={{opacity:1,scale:1}}
            exit={{opacity:0,scale:1.04,filter:"blur(4px)"}} transition={{duration:0.36}}
            style={{width:"100%",maxWidth:340,padding:"0 28px",
              display:"flex",flexDirection:"column",alignItems:"center",position:"relative",zIndex:10}}>
            <div style={{position:"relative",width:86,height:86,marginBottom:28,flexShrink:0}}>
              <motion.svg width="86" height="86" viewBox="0 0 86 86"
                animate={{rotate:360}} transition={{duration:2,repeat:Infinity,ease:"linear"}}
                style={{position:"absolute",inset:0}}>
                <circle cx="43" cy="43" r="36" fill="none" stroke="rgba(74,158,255,0.09)" strokeWidth="2.5"/>
                <circle cx="43" cy="43" r="36" fill="none" stroke={T.blue} strokeWidth="2.5"
                  strokeLinecap="round" strokeDasharray="54 172"/>
              </motion.svg>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <LogoBadge size={42}/>
              </div>
            </div>
            <div style={{textAlign:"center",minHeight:72,marginBottom:24}}>
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:0.28}}>
                  {step===0&&(
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:9,marginBottom:7}}>
                      <motion.svg width="18" height="18" viewBox="0 0 18 18" fill="none"
                        initial={{scale:0}} animate={{scale:1}} transition={{...SP.bouncy,delay:0.1}}>
                        <circle cx="9" cy="9" r="8" fill={T.blue} fillOpacity="0.14" stroke={T.blue} strokeWidth="1.3"/>
                        <motion.path d="M5 9l2.8 2.8 5.2-5.6" stroke={T.blue} strokeWidth="1.7"
                          strokeLinecap="round" strokeLinejoin="round"
                          initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:0.4,delay:0.2,ease:"easeOut"}}/>
                      </motion.svg>
                      <span style={{fontSize:17,fontWeight:800,color:T.text,letterSpacing:"-0.02em"}}>{LSTEPS[0].label}</span>
                    </div>
                  )}
                  {step>0&&<h3 style={{fontSize:20,fontWeight:800,color:T.text,margin:"0 0 7px",letterSpacing:"-0.025em",lineHeight:1.25}}>{LSTEPS[step].label}…</h3>}
                  <p style={{fontSize:13.5,color:T.textSub,margin:0}}>{LSTEPS[step].sub}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            <div style={{width:"100%",height:2,background:"rgba(255,255,255,0.05)",borderRadius:2,overflow:"hidden",marginBottom:12}}>
              <motion.div style={{height:"100%",background:`linear-gradient(90deg,${T.blue},#80C4FF)`,borderRadius:2}}
                animate={{width:`${progress}%`}} transition={{duration:0.22,ease:"easeOut"}}/>
            </div>
            <div style={{display:"flex",gap:7,justifyContent:"center",marginBottom:32}}>
              {LSTEPS.map((_,i)=>(
                <motion.div key={i} animate={{background:i<=step?T.blue:"rgba(255,255,255,0.1)",scale:i===step?1.4:1}}
                  transition={SP.micro} style={{width:5,height:5,borderRadius:2.5}}/>
              ))}
            </div>
            {step>=1&&(
              <div style={{position:"relative",width:"100%",height:100,overflow:"hidden"}}>
                {txCards.map((c,i)=>(
                  <motion.div key={i}
                    initial={{opacity:0,y:50,scale:0.85}}
                    animate={{opacity:[0,0.9,0.9,0],y:[50,0,0,-40],scale:[0.85,1,1,0.9]}}
                    transition={{duration:2.2,delay:c.del+i*0.12,ease:"easeInOut",repeat:Infinity,repeatDelay:0.6}}
                    style={{position:"absolute",left:i%2===0?"4%":"50%",top:i<2?0:40,
                      padding:"7px 13px",borderRadius:10,background:"rgba(255,255,255,0.05)",
                      border:"1px solid rgba(255,255,255,0.09)",backdropFilter:"blur(14px)",
                      display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap"}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:c.col,boxShadow:`0 0 7px ${c.col}`}}/>
                    <div>
                      <p style={{margin:0,fontSize:10,color:T.textSub}}>{c.label}</p>
                      <p style={{margin:0,fontSize:12,fontWeight:700,color:T.text}}>{`\u20B9 ${c.amt}`}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
        {phase==="coins"&&(
          <motion.div key="cp" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.28}}
            style={{position:"relative",width:190,height:190,display:"flex",alignItems:"center",justifyContent:"center",zIndex:10}}>
            {coins.map((c,i)=>(
              <motion.div key={i}
                initial={{opacity:0,x:Math.cos(c.angle)*c.r,y:Math.sin(c.angle)*c.r,scale:0}}
                animate={{opacity:[0,1,1,0],x:0,y:0,scale:[0,1.3,1,0]}}
                transition={{duration:1.05,delay:c.del,ease:[0.4,0,0.2,1]}}
                style={{position:"absolute",width:5,height:5,borderRadius:"50%",background:T.blue,boxShadow:`0 0 7px ${T.blue}`}}/>
            ))}
            <motion.div initial={{scale:0,opacity:0}} animate={{scale:[0,1.3,1],opacity:1}} transition={{duration:0.52,delay:0.72}}
              style={{width:70,height:70,borderRadius:20,background:`linear-gradient(145deg,${T.blue},${T.blueDeep})`,
                display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 60px rgba(74,158,255,0.58)`}}>
              <LogoMark size={34}/>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WELCOME
// ═══════════════════════════════════════════════════════════════════════════════
function WelcomeScreen({userName,onNext}){
  return(
    <div style={{position:"relative",width:"100%",height:"100%",background:T.black,
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
      <ParticleField count={34} colors={[T.blue,"rgba(74,158,255,0.42)",T.gold,"rgba(232,196,106,0.28)"]}/>
      <Glow x={50} y={50} color="rgba(74,158,255,0.14)" size={640}/>
      {[300,420,550].map((sz,i)=>(
        <motion.div key={i} initial={{opacity:0,scale:0.5}} animate={{opacity:[0,0.065,0.035],scale:1}}
          transition={{duration:1.5+i*0.3,delay:i*0.16,ease:"easeOut"}}
          style={{position:"absolute",width:sz,height:sz,borderRadius:"50%",border:`1px solid ${T.blue}`,pointerEvents:"none"}}/>
      ))}
      <motion.div initial={{scale:0,opacity:0}} animate={{scale:1,opacity:1}}
        transition={{duration:0.6,delay:0.18,...SP.bouncy}}
        style={{textAlign:"center",position:"relative",zIndex:10,padding:"0 30px"}}>
        <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.32,...SP.bouncy}}
          style={{width:78,height:78,borderRadius:"50%",background:`linear-gradient(145deg,${T.blue},${T.blueDeep})`,
            display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 26px",
            boxShadow:`0 0 52px rgba(74,158,255,0.48),0 0 100px rgba(74,158,255,0.18)`}}>
          <svg width="32" height="26" viewBox="0 0 32 26" fill="none">
            <motion.path d="M2 13L10.5 22L30 2" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
              initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:0.44,delay:0.52,ease:"easeOut"}}/>
          </svg>
        </motion.div>
        <motion.h1 initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.62}}
          style={{fontSize:34,fontWeight:800,color:T.text,margin:"0 0 11px",letterSpacing:"-0.035em",lineHeight:1.15}}>
          Welcome,<br/><span style={{color:T.blue}}>{userName}</span>.
        </motion.h1>
        <motion.p initial={{opacity:0,y:11}} animate={{opacity:1,y:0}} transition={{delay:0.76}}
          style={{fontSize:15,color:T.textSub,margin:"0 0 34px",lineHeight:1.65}}>
          Let's show you how Paymint works.
        </motion.p>
        <motion.div initial={{opacity:0,y:13}} animate={{opacity:1,y:0}} transition={{delay:0.9}}>
          <Btn onClick={onNext} full large>Continue</Btn>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ONBOARDING CARDS (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════
const CARDS=[
  {id:"coins",headline:"Earn Coins On Every Spend",
    body:"Every transaction earns coins automatically. Your coins accumulate in your wallet and can be redeemed for rewards.",
    visual:({active})=>(
      <div style={{position:"relative",height:152,display:"flex",alignItems:"center",justifyContent:"center"}}>
        {[{label:"Swiggy",amt:"342",del:0,col:"#E05D5D"},{label:"Amazon",amt:"1499",del:0.18,col:T.gold},{label:"Zomato",amt:"280",del:0.35,col:"#FF8C42"}].map((c,i)=>active&&(
          <motion.div key={i} initial={{y:0,opacity:1}} animate={{y:-65,opacity:0,scale:0.7}}
            transition={{duration:1,delay:c.del,repeat:Infinity,repeatDelay:1.3,ease:"easeIn"}}
            style={{position:"absolute",left:`${22+i*22}%`,bottom:18,padding:"5px 11px",borderRadius:9,
              background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",backdropFilter:"blur(12px)",whiteSpace:"nowrap"}}>
            <p style={{margin:0,fontSize:9,color:T.textSub}}>{c.label}</p>
            <p style={{margin:0,fontSize:11.5,fontWeight:700,color:T.text}}>{`\u20B9 ${c.amt}`}</p>
          </motion.div>
        ))}
        <motion.div animate={active?{scale:[1,1.1,1],boxShadow:[`0 0 18px rgba(74,158,255,0.28)`,`0 0 42px rgba(74,158,255,0.55)`,`0 0 18px rgba(74,158,255,0.28)`]}:{}}
          transition={{duration:2,repeat:Infinity,ease:"easeInOut"}}
          style={{width:62,height:62,borderRadius:"50%",background:`linear-gradient(145deg,${T.blue},${T.blueDeep})`,
            display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 26px rgba(74,158,255,0.38)`}}>
          <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="10" fill="none" stroke="white" strokeWidth="1.7" strokeOpacity="0.75"/>
            <text x="14" y="19" textAnchor="middle" fill="white" fontSize="11.5" fontWeight="800" fontFamily="Inter,-apple-system,sans-serif">P</text>
          </svg>
        </motion.div>
      </div>
    )},
  {id:"rewards",headline:"Unlock Weekly Rewards",
    body:"Your spending activity unlocks weekly rewards and bonus benefits tailored just for you.",
    visual:({active})=>(
      <div style={{height:152,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <motion.div animate={active?{rotateY:[0,8,-8,0]}:{}} transition={{duration:3.5,repeat:Infinity,ease:"easeInOut"}}
          style={{position:"relative",width:88,height:88}}>
          <div style={{width:88,height:56,borderRadius:"0 0 13px 13px",marginTop:32,
            background:"linear-gradient(160deg,#2A3B5A,#1A2840)",border:"1px solid rgba(74,158,255,0.24)",boxShadow:"0 8px 26px rgba(0,0,0,0.5)"}}/>
          <motion.div animate={active?{rotateX:[0,-18,0]}:{}} transition={{duration:3.5,repeat:Infinity,ease:"easeInOut"}}
            style={{position:"absolute",top:0,left:0,right:0,height:35,background:"linear-gradient(160deg,#3A5080,#2A3B5A)",
              borderRadius:"13px 13px 0 0",border:"1px solid rgba(74,158,255,0.28)",transformOrigin:"bottom center",transformStyle:"preserve-3d"}}/>
          <motion.div animate={active?{opacity:[0.28,0.75,0.28]}:{}} transition={{duration:3.5,repeat:Infinity}}
            style={{position:"absolute",bottom:7,left:"50%",transform:"translateX(-50%)",width:48,height:7,borderRadius:"50%",background:T.blue,filter:"blur(7px)"}}/>
          <div style={{position:"absolute",top:23,left:"50%",transform:"translateX(-50%)",width:17,height:17,borderRadius:"50%",
            background:`linear-gradient(145deg,#5AAFFF,#2E7FE0)`,border:"1.5px solid rgba(255,255,255,0.2)",
            display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:5.5,height:7.5,borderRadius:3,background:"rgba(255,255,255,0.82)"}}/>
          </div>
        </motion.div>
      </div>
    )},
  {id:"tiers",headline:"Monthly Rewards & Tiers",
    body:"Progress through tiers and unlock bigger monthly rewards with every spend.",
    visual:({active})=>{
      const tiers=[{name:"Bronze",col:"#CD7F32",h:46},{name:"Silver",col:"#A8A9AD",h:62},{name:"Gold",col:T.gold,h:78},{name:"Platinum",col:"#B0D4FF",h:98}];
      return(
        <div style={{height:152,display:"flex",alignItems:"flex-end",justifyContent:"center",gap:11,paddingBottom:18}}>
          {tiers.map((t,i)=>(
            <motion.div key={t.name} initial={{height:0,opacity:0}} animate={active?{height:t.h,opacity:1}:{height:0,opacity:0}}
              transition={{duration:0.52,delay:i*0.11,ease:[0.4,0,0.2,1]}}
              style={{width:50,borderRadius:"7px 7px 3px 3px",overflow:"hidden",display:"flex",flexDirection:"column",
                alignItems:"center",justifyContent:"flex-start",paddingTop:7,
                background:`linear-gradient(180deg,${t.col}26,${t.col}12)`,border:`1px solid ${t.col}3E`}}>
              <div style={{width:14,height:14,borderRadius:"50%",background:t.col,boxShadow:`0 0 7px ${t.col}75`,flexShrink:0}}/>
              <p style={{margin:"4px 0 0",fontSize:8,color:t.col,fontWeight:700,letterSpacing:"0.04em"}}>{t.name}</p>
            </motion.div>
          ))}
        </div>
      );
    }},
  {id:"apps",headline:"No Change In Behaviour",
    body:"Continue using the apps you already love. Paymint rewards your spending automatically.",
    visual:({active})=>{
      const apps=[{name:"GPay",col:"#4285F4"},{name:"PhonePe",col:"#5F259F"},{name:"Paytm",col:"#00B9F1"},{name:"Bank",col:"#38A169"}];
      return(
        <div style={{height:152,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
          {apps.map((a,i)=>{
            const angle=(i/apps.length)*Math.PI*2-Math.PI/2,r=56;
            return(
              <motion.div key={a.name}
                style={{position:"absolute",left:`calc(50% + ${Math.cos(angle)*r}px - 19px)`,
                  top:`calc(50% + ${Math.sin(angle)*r}px - 19px)`,width:38,height:38,borderRadius:11,
                  background:`${a.col}20`,border:`1px solid ${a.col}3E`,display:"flex",flexDirection:"column",
                  alignItems:"center",justifyContent:"center"}}>
                <div style={{width:9,height:9,borderRadius:"50%",background:a.col,marginBottom:2}}/>
                <p style={{margin:0,fontSize:7,color:a.col,fontWeight:700}}>{a.name}</p>
              </motion.div>
            );
          })}
          {active&&apps.map((a,i)=>{
            const angle=(i/apps.length)*Math.PI*2-Math.PI/2,r=56;
            return(
              <motion.div key={`ln-${a.name}`} initial={{scaleX:0,opacity:0}} animate={{scaleX:1,opacity:0.32}}
                transition={{duration:0.48,delay:0.08+i*0.08}}
                style={{position:"absolute",left:"50%",top:"50%",width:r-17,height:1,background:T.blue,
                  transformOrigin:"left center",transform:`rotate(${angle}rad) translateY(-0.5px)`}}/>
            );
          })}
          <div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",zIndex:2}}>
            <LogoBadge size={34}/>
          </div>
        </div>
      );
    }},
];
function OnboardingCards({onDone}){
  const [idx,setIdx]=useState(0);
  const card=CARDS[idx];const isLast=idx===CARDS.length-1;
  return(
    <div style={{position:"relative",width:"100%",height:"100%",background:T.black,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <Glow x={50} y={28} color="rgba(74,158,255,0.08)" size={480}/><ParticleField count={12}/>
      <div style={{padding:"48px 24px 0",position:"relative",zIndex:10,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <LogoBadge size={26}/>
          <span style={{fontSize:12.5,fontWeight:700,color:T.textSub,letterSpacing:"0.07em"}}>PAYMINT</span>
          <span style={{marginLeft:"auto",fontSize:11.5,color:T.textMute,fontWeight:500}}>{idx+1} of {CARDS.length}</span>
        </div>
        <div style={{height:2,background:"rgba(255,255,255,0.05)",borderRadius:2,overflow:"hidden"}}>
          <motion.div animate={{width:`${((idx+1)/CARDS.length)*100}%`}} transition={{duration:0.42,ease:"easeOut"}}
            style={{height:"100%",background:`linear-gradient(90deg,${T.blue},#90CAFF)`,borderRadius:2}}/>
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={card.id} initial={{opacity:0,x:48,scale:0.97}} animate={{opacity:1,x:0,scale:1}} exit={{opacity:0,x:-48,scale:0.97}}
          transition={{duration:0.36,ease:[0.4,0,0.2,1]}}
          style={{flex:1,display:"flex",flexDirection:"column",padding:"18px 24px 0",position:"relative",zIndex:10,minHeight:0}}>
          <motion.div initial={{opacity:0,y:13}} animate={{opacity:1,y:0}} transition={{delay:0.1}}
            style={{borderRadius:20,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",
              backdropFilter:"blur(18px)",overflow:"hidden",flexShrink:0,
              boxShadow:"inset 0 1px 0 rgba(255,255,255,0.05),0 8px 28px rgba(0,0,0,0.38)"}}>
            <card.visual active={true}/>
          </motion.div>
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.16}} style={{marginTop:22,flex:1}}>
            <p style={{fontSize:12,color:T.blue,fontWeight:600,letterSpacing:"0.09em",textTransform:"uppercase",marginBottom:8}}>
              {idx+1} of {CARDS.length}
            </p>
            <h2 style={{fontSize:24,fontWeight:800,color:T.text,margin:"0 0 11px",letterSpacing:"-0.03em",lineHeight:1.2}}>{card.headline}</h2>
            <p style={{fontSize:14,color:T.textSub,lineHeight:1.68,margin:0}}>{card.body}</p>
          </motion.div>
        </motion.div>
      </AnimatePresence>
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.26}}
        style={{padding:"14px 24px 44px",position:"relative",zIndex:10,flexShrink:0}}>
        <Btn onClick={()=>isLast?onDone():setIdx(i=>i+1)} full large>{isLast?"Enter Dashboard":"Next"}</Btn>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEEKLY REWARDS SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const WEEKLY_TIERS=[
  {id:"starter",rank:1,label:"Starter",    spend:500,
    col:"#CD7F32",grd:"linear-gradient(145deg,#3D2800,#1E1200)",
    border:"rgba(205,127,50,0.3)",
    perks:["Small reward chest","Bonus coins","Surprise reward"]},
  {id:"active", rank:2,label:"Active",     spend:1500,
    col:"#A8A9AD",grd:"linear-gradient(145deg,#252629,#131416)",
    border:"rgba(168,169,173,0.3)",
    perks:["Better reward chest","Bonus coins","Premium offers"]},
  {id:"power",  rank:3,label:"Power User", spend:3000,
    col:T.gold,   grd:"linear-gradient(145deg,#2A2000,#130F00)",
    border:"rgba(232,196,106,0.3)",
    perks:["Premium reward chest","High-value rewards","Exclusive offers"]},
];

function WeeklyRewardsScreen({onBack, weeklySpend}){
  const currentTier = WEEKLY_TIERS.filter(t=>weeklySpend>=t.spend).pop() || null;
  const nextTier    = WEEKLY_TIERS.find(t=>weeklySpend<t.spend) || null;
  const progressToNext = nextTier
    ? Math.min((weeklySpend / nextTier.spend)*100, 100)
    : 100;

  return(
    <div style={{position:"relative",width:"100%",height:"100%",background:T.black,
      display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <ParticleField count={12}/>
      <Glow x={60} y={15} color="rgba(232,196,106,0.07)" size={400}/>
      <Glow x={20} y={70} color="rgba(74,158,255,0.06)" size={350}/>

      {/* Header */}
      <motion.div initial={{opacity:0,y:-16}} animate={{opacity:1,y:0}} transition={{duration:0.45}}
        style={{padding:"52px 24px 0",flexShrink:0,position:"relative",zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
          <motion.button whileTap={{scale:0.88}} onClick={onBack}
            style={{width:36,height:36,borderRadius:11,background:T.glass,border:`1px solid ${T.glassBorder}`,
              display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
              <path d="M10 2L4 7l6 5" stroke={T.text} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>
          <div>
            <h2 style={{margin:0,fontSize:22,fontWeight:800,color:T.text,letterSpacing:"-0.03em"}}>Weekly Rewards</h2>
            <p style={{margin:0,fontSize:12.5,color:T.textSub,marginTop:2}}>Unlock better rewards through weekly spending</p>
          </div>
        </div>

        {/* Weekly spend summary */}
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.18}}
          style={{borderRadius:18,padding:"16px 18px",marginBottom:4,
            background:"linear-gradient(145deg,#0C1A2E,#070D1A)",
            border:"1px solid rgba(74,158,255,0.18)",
            boxShadow:"0 8px 28px rgba(74,158,255,0.1)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div>
              <p style={{margin:0,fontSize:11,color:"rgba(74,158,255,0.65)",fontWeight:600,letterSpacing:"0.09em",textTransform:"uppercase"}}>
                This Week's Spend
              </p>
              <motion.h3 key={weeklySpend}
                initial={{scale:1.1,color:"#80C4FF"}} animate={{scale:1,color:T.text}}
                transition={{duration:0.35,...SP.bouncy}}
                style={{margin:"3px 0 0",fontSize:26,fontWeight:800,letterSpacing:"-0.03em"}}>
                {`\u20B9 ${fmt(weeklySpend)}`}
              </motion.h3>
            </div>
            <div style={{textAlign:"right"}}>
              <p style={{margin:0,fontSize:11,color:T.textMute}}>Current Tier</p>
              <p style={{margin:"3px 0 0",fontSize:14,fontWeight:700,
                color:currentTier?currentTier.col:T.textMute}}>
                {currentTier?currentTier.label:"None yet"}
              </p>
            </div>
          </div>
          {nextTier&&(
            <>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <p style={{margin:0,fontSize:11,color:T.textMute}}>
                  {`\u20B9${fmt(Math.max(0,nextTier.spend-weeklySpend))} to ${nextTier.label}`}
                </p>
                <p style={{margin:0,fontSize:11,color:T.textMute}}>{Math.round(progressToNext)}%</p>
              </div>
              <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden"}}>
                <motion.div animate={{width:`${progressToNext}%`}} transition={{duration:0.7,ease:"easeOut"}}
                  style={{height:"100%",borderRadius:4,background:`linear-gradient(90deg,${T.blue},#90CAFF)`}}/>
              </div>
            </>
          )}
          {!nextTier&&(
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:T.gold,
                boxShadow:`0 0 10px ${T.gold}`}}/>
              <p style={{margin:0,fontSize:12,color:T.gold,fontWeight:600}}>Maximum tier reached</p>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Tier cards */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 24px 24px",position:"relative",zIndex:10}}>
        <p style={{margin:"0 0 14px",fontSize:12,color:T.textMute,fontWeight:600,
          letterSpacing:"0.09em",textTransform:"uppercase"}}>Tier Progression</p>

        {WEEKLY_TIERS.map((tier,i)=>{
          const isActive = currentTier?.id===tier.id;
          const isLocked = weeklySpend < tier.spend && !isActive;
          const isDone   = weeklySpend >= tier.spend;

          return(
            <motion.div key={tier.id}
              initial={{opacity:0,x:-22}} animate={{opacity:1,x:0}}
              transition={{delay:0.15+i*0.1,...SP.gentle}}
              style={{marginBottom:12,position:"relative"}}>

              {/* Connector line */}
              {i<WEEKLY_TIERS.length-1&&(
                <div style={{position:"absolute",left:27,top:"100%",width:2,height:12,
                  background:`linear-gradient(180deg,${isDone?tier.col:"rgba(255,255,255,0.08)"},transparent)`,
                  zIndex:1}}/>
              )}

              <motion.div
                animate={{
                  background:isActive?tier.grd:isDone?tier.grd:"rgba(255,255,255,0.03)",
                  borderColor:isActive?tier.col:isDone?tier.col+"55":T.glassBorder,
                  boxShadow:isActive
                    ?`0 0 0 1px ${tier.col}30,0 12px 32px ${tier.col}18,inset 0 1px 0 ${tier.col}15`
                    :isDone?`0 4px 16px ${tier.col}10`:"none",
                }}
                transition={{duration:0.3}}
                style={{borderRadius:18,border:"1px solid",backdropFilter:"blur(16px)",overflow:"hidden",
                  padding:"16px"}}>

                {/* Active glow sweep */}
                {isActive&&(
                  <motion.div
                    animate={{x:["-100%","200%"]}}
                    transition={{duration:2.5,repeat:Infinity,ease:"easeInOut",repeatDelay:1}}
                    style={{position:"absolute",top:0,bottom:0,width:"40%",
                      background:`linear-gradient(90deg,transparent,${tier.col}18,transparent)`,
                      pointerEvents:"none"}}/>
                )}

                <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                  {/* Badge */}
                  <motion.div
                    animate={isActive?{
                      boxShadow:[`0 0 12px ${tier.col}40`,`0 0 24px ${tier.col}60`,`0 0 12px ${tier.col}40`]
                    }:{}}
                    transition={{duration:2,repeat:Infinity}}
                    style={{width:46,height:46,borderRadius:14,flexShrink:0,
                      background:isLocked?"rgba(255,255,255,0.04)":`${tier.col}18`,
                      border:`1.5px solid ${isLocked?T.glassBorder:tier.col+"50"}`,
                      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}>
                    {isLocked?(
                      <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
                        <rect x="1" y="7" width="12" height="8.5" rx="2.5" stroke={T.textMute} strokeWidth="1.3"/>
                        <path d="M3.5 7V5a3.5 3.5 0 017 0v2" stroke={T.textMute} strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    ):(
                      <>
                        <div style={{width:10,height:10,borderRadius:"50%",background:tier.col,
                          boxShadow:isActive?`0 0 10px ${tier.col}`:"none"}}/>
                        <p style={{margin:0,fontSize:7.5,color:tier.col,fontWeight:700}}>{["B","S","P"][i]}</p>
                      </>
                    )}
                  </motion.div>

                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <h4 style={{margin:0,fontSize:15,fontWeight:800,
                        color:isLocked?T.textMute:T.text,letterSpacing:"-0.01em"}}>
                        {tier.label}
                      </h4>
                      {isActive&&(
                        <motion.span
                          animate={{opacity:[0.7,1,0.7]}} transition={{duration:1.5,repeat:Infinity}}
                          style={{fontSize:10,fontWeight:700,color:tier.col,
                            background:`${tier.col}18`,border:`1px solid ${tier.col}30`,
                            padding:"2px 8px",borderRadius:20}}>
                          ACTIVE
                        </motion.span>
                      )}
                      {isDone&&!isActive&&(
                        <span style={{fontSize:10,fontWeight:700,color:"rgba(74,158,255,0.8)",
                          background:"rgba(74,158,255,0.1)",border:"1px solid rgba(74,158,255,0.2)",
                          padding:"2px 8px",borderRadius:20}}>
                          DONE
                        </span>
                      )}
                    </div>
                    <p style={{margin:"0 0 10px",fontSize:12,
                      color:isLocked?T.textMute:T.textSub}}>
                      Spend {`\u20B9${fmt(tier.spend)}`}+ per week
                    </p>

                    {/* Perks */}
                    <div style={{display:"flex",flexDirection:"column",gap:5}}>
                      {tier.perks.map((perk,j)=>(
                        <motion.div key={perk} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}}
                          transition={{delay:0.25+i*0.1+j*0.05}}
                          style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:5,height:5,borderRadius:"50%",flexShrink:0,
                            background:isLocked?"rgba(255,255,255,0.15)":tier.col,
                            opacity:isLocked?0.4:1}}/>
                          <span style={{fontSize:12.5,color:isLocked?T.textMute:T.textSub}}>{perk}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MONTHLY REWARDS SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
const MONTHLY_TIERS=[
  {id:"bronze",   label:"Bronze",   min:0,     max:5000,
    col:"#CD7F32",grd:"linear-gradient(145deg,#3D2800,#1E1200)",
    border:"rgba(205,127,50,0.3)",
    perks:["Coin earning on every spend","Weekly rewards access"]},
  {id:"silver",   label:"Silver",   min:5000,  max:15000,
    col:"#A8A9AD",grd:"linear-gradient(145deg,#252629,#131416)",
    border:"rgba(168,169,173,0.3)",
    perks:["Better weekly rewards","Bonus coin opportunities"]},
  {id:"gold",     label:"Gold",     min:15000, max:30000,
    col:T.gold,   grd:"linear-gradient(145deg,#2A2000,#130F00)",
    border:"rgba(232,196,106,0.3)",
    perks:["Premium reward access","Enhanced rewards"]},
  {id:"platinum", label:"Platinum", min:30000, max:Infinity,
    col:"#B0D4FF",grd:"linear-gradient(145deg,#0C1828,#060E18)",
    border:"rgba(176,212,255,0.3)",
    perks:["Exclusive rewards","Highest reward tier"]},
];

function MonthlyRewardsScreen({onBack, monthlySpend}){
  const currentTier = [...MONTHLY_TIERS].reverse().find(t=>monthlySpend>=t.min) || MONTHLY_TIERS[0];
  const nextTier    = MONTHLY_TIERS.find(t=>t.min>monthlySpend);
  const progressInTier = nextTier
    ? Math.min(((monthlySpend-currentTier.min)/(currentTier.max-currentTier.min))*100,100)
    : 100;

  return(
    <div style={{position:"relative",width:"100%",height:"100%",background:T.black,
      display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <ParticleField count={12}/>
      <Glow x={75} y={10} color="rgba(232,196,106,0.07)" size={380}/>
      <Glow x={25} y={75} color="rgba(74,158,255,0.06)" size={320}/>

      {/* Header */}
      <motion.div initial={{opacity:0,y:-16}} animate={{opacity:1,y:0}} transition={{duration:0.45}}
        style={{padding:"52px 24px 0",flexShrink:0,position:"relative",zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
          <motion.button whileTap={{scale:0.88}} onClick={onBack}
            style={{width:36,height:36,borderRadius:11,background:T.glass,border:`1px solid ${T.glassBorder}`,
              display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
              <path d="M10 2L4 7l6 5" stroke={T.text} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>
          <div>
            <h2 style={{margin:0,fontSize:22,fontWeight:800,color:T.text,letterSpacing:"-0.03em"}}>Monthly Rewards</h2>
            <p style={{margin:0,fontSize:12.5,color:T.textSub,marginTop:2}}>The more active you are, the better your rewards</p>
          </div>
        </div>

        {/* Current tier hero */}
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.18}}
          style={{borderRadius:18,padding:"18px 18px 16px",marginBottom:4,
            background:currentTier.grd,border:`1px solid ${currentTier.border}`,
            boxShadow:`0 8px 32px ${currentTier.col}14`,position:"relative",overflow:"hidden"}}>
          {/* Tier shimmer */}
          <motion.div
            animate={{x:["-100%","200%"]}} transition={{duration:3,repeat:Infinity,ease:"easeInOut",repeatDelay:0.5}}
            style={{position:"absolute",top:0,bottom:0,width:"35%",
              background:`linear-gradient(90deg,transparent,${currentTier.col}12,transparent)`,pointerEvents:"none"}}/>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div>
              <p style={{margin:0,fontSize:11,color:`${currentTier.col}99`,fontWeight:600,letterSpacing:"0.09em",textTransform:"uppercase"}}>Current Tier</p>
              <div style={{display:"flex",alignItems:"center",gap:10,marginTop:4}}>
                <motion.div
                  animate={{boxShadow:[`0 0 10px ${currentTier.col}50`,`0 0 22px ${currentTier.col}80`,`0 0 10px ${currentTier.col}50`]}}
                  transition={{duration:2,repeat:Infinity}}
                  style={{width:32,height:32,borderRadius:10,background:`${currentTier.col}22`,
                    border:`1.5px solid ${currentTier.col}60`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{width:12,height:12,borderRadius:"50%",background:currentTier.col}}/>
                </motion.div>
                <h3 style={{margin:0,fontSize:24,fontWeight:800,color:currentTier.col,letterSpacing:"-0.03em"}}>
                  {currentTier.label}
                </h3>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <p style={{margin:0,fontSize:11,color:T.textMute}}>Monthly Spend</p>
              <motion.p key={monthlySpend}
                initial={{scale:1.08,color:`${currentTier.col}`}} animate={{scale:1,color:T.text}}
                transition={{duration:0.35,...SP.bouncy}}
                style={{margin:"3px 0 0",fontSize:18,fontWeight:800,letterSpacing:"-0.03em"}}>
                {`\u20B9${fmt(monthlySpend)}`}
              </motion.p>
            </div>
          </div>
          {nextTier&&(
            <>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <p style={{margin:0,fontSize:11.5,color:T.textSub}}>
                  {`\u20B9${fmt(Math.max(0,nextTier.min-monthlySpend))} to ${nextTier.label}`}
                </p>
                <p style={{margin:0,fontSize:11,color:T.textMute}}>{Math.round(progressInTier)}%</p>
              </div>
              <div style={{height:3.5,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden"}}>
                <motion.div animate={{width:`${progressInTier}%`}} transition={{duration:0.7,ease:"easeOut"}}
                  style={{height:"100%",borderRadius:4,
                    background:`linear-gradient(90deg,${currentTier.col},${nextTier.col})`}}/>
              </div>
            </>
          )}
          {!nextTier&&(
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
              <motion.div animate={{scale:[1,1.4,1]}} transition={{duration:1.5,repeat:Infinity}}
                style={{width:7,height:7,borderRadius:"50%",background:currentTier.col,
                  boxShadow:`0 0 10px ${currentTier.col}`}}/>
              <p style={{margin:0,fontSize:12.5,color:currentTier.col,fontWeight:700}}>Highest tier achieved</p>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Tier cards grid */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 24px 28px",position:"relative",zIndex:10}}>
        <p style={{margin:"0 0 14px",fontSize:12,color:T.textMute,fontWeight:600,
          letterSpacing:"0.09em",textTransform:"uppercase"}}>All Tiers</p>

        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {MONTHLY_TIERS.map((tier,i)=>{
            const isActive = currentTier.id===tier.id;
            const isDone   = monthlySpend>=tier.max && tier.max!==Infinity;
            const isLocked = monthlySpend<tier.min;

            return(
              <motion.div key={tier.id}
                initial={{opacity:0,y:18}} animate={{opacity:1,y:0}}
                transition={{delay:0.1+i*0.08,...SP.gentle}}>
                <motion.div
                  animate={{
                    background:isActive?tier.grd:isDone?tier.grd.replace("145deg","165deg"):"rgba(255,255,255,0.03)",
                    borderColor:isActive?tier.col:isDone?tier.col+"44":T.glassBorder,
                    boxShadow:isActive?`0 0 0 1px ${tier.col}22,0 10px 28px ${tier.col}14,inset 0 1px 0 ${tier.col}10`:"none",
                  }}
                  transition={{duration:0.3}}
                  style={{borderRadius:17,border:"1px solid",backdropFilter:"blur(16px)",
                    padding:"15px 16px",position:"relative",overflow:"hidden"}}>

                  {isActive&&(
                    <motion.div animate={{x:["-100%","200%"]}}
                      transition={{duration:3,repeat:Infinity,ease:"easeInOut",repeatDelay:1.5}}
                      style={{position:"absolute",top:0,bottom:0,width:"35%",
                        background:`linear-gradient(90deg,transparent,${tier.col}12,transparent)`,pointerEvents:"none"}}/>
                  )}

                  <div style={{display:"flex",alignItems:"center",gap:13}}>
                    {/* Tier medal */}
                    <motion.div
                      animate={isActive?{boxShadow:[`0 0 10px ${tier.col}40`,`0 0 20px ${tier.col}65`,`0 0 10px ${tier.col}40`]}:{}}
                      transition={{duration:2,repeat:Infinity}}
                      style={{width:44,height:44,borderRadius:13,flexShrink:0,
                        background:isLocked?"rgba(255,255,255,0.04)":`${tier.col}16`,
                        border:`1.5px solid ${isLocked?T.glassBorder:tier.col+"45"}`,
                        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}>
                      {isLocked?(
                        <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                          <rect x="1" y="6" width="10" height="7.5" rx="2" stroke={T.textMute} strokeWidth="1.2"/>
                          <path d="M3 6V4a3 3 0 016 0v2" stroke={T.textMute} strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                      ):(
                        <>
                          <div style={{width:12,height:12,borderRadius:"50%",background:tier.col,
                            boxShadow:isActive?`0 0 8px ${tier.col}`:"none"}}/>
                          <p style={{margin:0,fontSize:7.5,color:tier.col,fontWeight:800,letterSpacing:"0.04em"}}>
                            {tier.label.slice(0,2).toUpperCase()}
                          </p>
                        </>
                      )}
                    </motion.div>

                    {/* Info */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                        <h4 style={{margin:0,fontSize:14.5,fontWeight:800,
                          color:isLocked?T.textMute:T.text,letterSpacing:"-0.01em"}}>
                          {tier.label}
                        </h4>
                        {isActive&&(
                          <motion.span animate={{opacity:[0.7,1,0.7]}} transition={{duration:1.5,repeat:Infinity}}
                            style={{fontSize:9.5,fontWeight:700,color:tier.col,
                              background:`${tier.col}18`,border:`1px solid ${tier.col}30`,
                              padding:"1.5px 7px",borderRadius:20}}>ACTIVE</motion.span>
                        )}
                        {isDone&&(
                          <span style={{fontSize:9.5,fontWeight:700,color:"rgba(74,158,255,0.75)",
                            background:"rgba(74,158,255,0.1)",border:"1px solid rgba(74,158,255,0.2)",
                            padding:"1.5px 7px",borderRadius:20}}>DONE</span>
                        )}
                      </div>
                      <p style={{margin:"0 0 8px",fontSize:11.5,
                        color:isLocked?T.textMute:T.textSub}}>
                        {tier.max===Infinity
                          ?`\u20B9${fmt(tier.min)}+ per month`
                          :`\u20B9${fmt(tier.min)} – \u20B9${fmt(tier.max)} per month`}
                      </p>
                      <div style={{display:"flex",flexWrap:"wrap",gap:"4px 12px"}}>
                        {tier.perks.map(perk=>(
                          <div key={perk} style={{display:"flex",alignItems:"center",gap:5}}>
                            <div style={{width:4,height:4,borderRadius:"50%",flexShrink:0,
                              background:isLocked?"rgba(255,255,255,0.12)":tier.col,opacity:isLocked?0.4:0.85}}/>
                            <span style={{fontSize:11.5,color:isLocked?T.textMute:T.textSub}}>{perk}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHALLENGES DATA
// ═══════════════════════════════════════════════════════════════════════════════
const CHALLENGES_DATA = [
  {
    id:"blinkit",
    brand:"Blinkit",
    brandCol:"#FFCD00",
    brandBg:"linear-gradient(145deg,#1A1500,#0E0B00)",
    brandBorder:"rgba(255,205,0,0.22)",
    title:"Grocery Challenge",
    desc:"Spend ₹1,000 on Blinkit this week",
    reward:1000,
    rewardLabel:"+1,000 Bonus Coins",
    type:"spend",
    target:1000,
    unit:"spend",
    ctaActive:"Continue",
    ctaInactive:"Start Challenge",
    details:"Shop for groceries, daily essentials, or household items on Blinkit. Every rupee counts towards your goal.",
    breakdown:[{label:"Base Coins",val:"₹1,000 spend"},{label:"Bonus Coins",val:"+1,000"},{label:"Completion By",val:"Sunday, 11:59 PM"}],
    terms:"Valid on all Blinkit orders. Minimum order ₹99. Challenge resets weekly every Monday.",
    extraChallenges:[
      {id:"blinkit2",brand:"Blinkit",title:"Blinkit Power User",desc:"Place 5 orders this month",reward:2500,type:"count",target:5,unit:"orders",progress:1},
    ],
  },
  {
    id:"swiggy",
    brand:"Swiggy",
    brandCol:"#FC8019",
    brandBg:"linear-gradient(145deg,#1A0A00,#0E0500)",
    brandBorder:"rgba(252,128,25,0.22)",
    title:"Weekend Challenge",
    desc:"Place 3 orders this weekend",
    reward:750,
    rewardLabel:"+750 Bonus Coins",
    type:"count",
    target:3,
    unit:"orders",
    ctaActive:"1 Order Remaining",
    ctaInactive:"Start Challenge",
    details:"Order food, groceries, or Instamart items on Swiggy this weekend. Any category counts.",
    breakdown:[{label:"Orders Required",val:"3 orders"},{label:"Bonus Coins",val:"+750"},{label:"Valid Until",val:"Sunday midnight"}],
    terms:"Valid Sat–Sun only. Minimum order ₹149. Each unique order counts once.",
    extraChallenges:[
      {id:"swiggy2",brand:"Swiggy",title:"Swiggy Monthly Feast",desc:"Spend ₹3,000 this month",reward:1500,type:"spend",target:3000,unit:"spend",progress:800},
    ],
  },
  {
    id:"amazon",
    brand:"Amazon",
    brandCol:"#FF9900",
    brandBg:"linear-gradient(145deg,#1A0E00,#0E0800)",
    brandBorder:"rgba(255,153,0,0.22)",
    title:"Shopping Challenge",
    desc:"Spend ₹2,500 this month on Amazon",
    reward:2000,
    rewardLabel:"+2,000 Bonus Coins",
    type:"spend",
    target:2500,
    unit:"spend",
    ctaActive:"View Challenge",
    ctaInactive:"Start Challenge",
    details:"Shop anything on Amazon — electronics, fashion, home goods, or daily essentials.",
    breakdown:[{label:"Target Spend",val:"₹2,500"},{label:"Bonus Coins",val:"+2,000"},{label:"Valid Until",val:"Month end"}],
    terms:"Valid on all Amazon purchases via Amazon Pay UPI. Cashbacks and gift cards excluded.",
    extraChallenges:[
      {id:"amazon2",brand:"Amazon",title:"Amazon Prime Special",desc:"Watch 5 shows on Prime Video",reward:500,type:"count",target:5,unit:"shows",progress:0},
    ],
  },
];

const ALL_EXTRA_CHALLENGES = [
  {id:"zomato1",brand:"Zomato",brandCol:"#E23744",title:"Zomato Feast",desc:"Order 4 times this week",reward:600,type:"count",target:4,unit:"orders",progress:0},
  {id:"phonepe1",brand:"PhonePe",brandCol:"#5F259F",title:"PhonePe Pulse",desc:"Make 5 UPI payments",reward:300,type:"count",target:5,unit:"payments",progress:1},
  {id:"bigbasket1",brand:"BigBasket",brandCol:"#84C225",title:"BigBasket Weekly",desc:"Spend ₹800 on BigBasket",reward:800,type:"spend",target:800,unit:"spend",progress:200},
  {id:"myntra1",brand:"Myntra",brandCol:"#FF3F6C",title:"Fashion Friday",desc:"Make any fashion purchase",reward:400,type:"count",target:1,unit:"order",progress:0},
  {id:"bookmyshow1",brand:"BookMyShow",brandCol:"#E71A26",title:"Movie Night",desc:"Book 2 movie tickets",reward:500,type:"count",target:2,unit:"tickets",progress:0},
  {id:"ola1",brand:"Ola",brandCol:"#3DBE29",title:"Ride & Earn",desc:"Take 3 rides this week",reward:350,type:"count",target:3,unit:"rides",progress:1},
];

// ─── SPARKLE COMPONENT ────────────────────────────────────────────────────────
function Sparkle({x,y,delay,size=3}){
  return(
    <motion.div
      initial={{opacity:0,scale:0,rotate:0}}
      animate={{opacity:[0,1,0],scale:[0,1,0],rotate:[0,45,90]}}
      transition={{duration:1.8,delay,repeat:Infinity,repeatDelay:Math.random()*2+1,ease:"easeInOut"}}
      style={{position:"absolute",left:x,top:y,width:size,height:size,
        background:T.blue,borderRadius:"50%",
        boxShadow:`0 0 ${size*2}px ${T.blue}`,pointerEvents:"none"}}
    />
  );
}

// ─── CIRCULAR PROGRESS ────────────────────────────────────────────────────────
function CircularProgress({pct,col,size=44,stroke=3.5}){
  const r = (size-stroke*2)/2;
  const circ = 2*Math.PI*r;
  const dash = circ*(pct/100);
  return(
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke}/>
      <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={`${circ}`}
        initial={{strokeDashoffset:circ}}
        animate={{strokeDashoffset:circ-dash}}
        transition={{duration:0.8,ease:"easeOut"}}
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2+4} textAnchor="middle" fill={col} fontSize={size*0.22} fontWeight="800"
        fontFamily="Inter,-apple-system,sans-serif">{Math.round(pct)}%</text>
    </svg>
  );
}

// ─── CHALLENGE CARD ───────────────────────────────────────────────────────────
function ChallengeCard({ch,progress,isCompleted,onTap,onComplete,setTotalCoins,setNotif}){
  const [justDone,setJustDone]=useState(false);
  const pct = ch.type==="spend"
    ? Math.min((progress/ch.target)*100,100)
    : Math.min((progress/ch.target)*100,100);
  const displayProgress = ch.type==="spend"
    ? `\u20B9${fmt(progress)} / \u20B9${fmt(ch.target)}`
    : `${progress} / ${ch.target} ${ch.unit}`;
  const done = pct>=100;

  useEffect(()=>{
    if(done&&!isCompleted&&!justDone){
      setJustDone(true);
      setTimeout(()=>{
        onComplete(ch.id,ch.reward,ch.brand,ch.title);
        setTotalCoins(c=>c+ch.reward);
        setNotif({
          id:Date.now()+Math.random(),
          type:"challenge",
          title:`${ch.brand} Challenge Complete`,
          sub:`+${fmt(ch.reward)} Bonus Coins Added`,
          nav:"wallet",
          col:ch.brandCol,
          coins:ch.reward,
        });
      },600);
    }
  },[done,isCompleted]);

  return(
    <motion.div
      onClick={()=>onTap(ch.id)}
      whileTap={{scale:0.97}}
      style={{width:240,flexShrink:0,borderRadius:20,overflow:"hidden",
        background:done?`linear-gradient(145deg,rgba(74,158,255,0.12),rgba(74,158,255,0.05))`:ch.brandBg,
        border:`1px solid ${done?"rgba(74,158,255,0.35)":ch.brandBorder}`,
        boxShadow:done
          ?`0 0 0 1px rgba(74,158,255,0.2),0 12px 32px rgba(74,158,255,0.15)`
          :`0 8px 28px rgba(0,0,0,0.4),0 0 0 1px ${ch.brandCol}18`,
        cursor:"pointer",position:"relative"}}>

      {/* Animated glow sweep */}
      <motion.div
        animate={{x:["-100%","200%"]}}
        transition={{duration:3.5,repeat:Infinity,ease:"easeInOut",repeatDelay:2}}
        style={{position:"absolute",top:0,bottom:0,width:"40%",
          background:`linear-gradient(90deg,transparent,${ch.brandCol}10,transparent)`,
          pointerEvents:"none",zIndex:1}}/>

      <div style={{padding:"16px 16px 14px",position:"relative",zIndex:2}}>
        {/* Brand row */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:30,height:30,borderRadius:9,
              background:`${ch.brandCol}1A`,border:`1px solid ${ch.brandCol}30`,
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:ch.brandCol}}/>
            </div>
            <div>
              <p style={{margin:0,fontSize:10.5,fontWeight:700,color:ch.brandCol,letterSpacing:"0.04em"}}>{ch.brand.toUpperCase()}</p>
              <p style={{margin:0,fontSize:11.5,fontWeight:600,color:T.text,letterSpacing:"-0.01em"}}>{ch.title}</p>
            </div>
          </div>
          {/* Reward badge */}
          <div style={{background:`${ch.brandCol}14`,border:`1px solid ${ch.brandCol}28`,
            borderRadius:20,padding:"3px 9px",flexShrink:0}}>
            <p style={{margin:0,fontSize:10,fontWeight:800,color:ch.brandCol}}>{ch.rewardLabel}</p>
          </div>
        </div>

        {/* Description */}
        <p style={{margin:"0 0 12px",fontSize:12.5,color:T.textSub,lineHeight:1.5}}>{ch.desc}</p>

        {/* Progress */}
        <div style={{marginBottom:10}}>
          {ch.type==="count"?(
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <CircularProgress pct={pct} col={ch.brandCol} size={44}/>
              <div style={{flex:1}}>
                <p style={{margin:0,fontSize:11,color:T.textMute,marginBottom:3}}>Progress</p>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:T.text}}>{displayProgress}</p>
              </div>
            </div>
          ):(
            <>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <p style={{margin:0,fontSize:11,color:T.textMute}}>Progress</p>
                <p style={{margin:0,fontSize:11,fontWeight:600,color:ch.brandCol}}>{Math.round(pct)}%</p>
              </div>
              <div style={{height:5,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden"}}>
                <motion.div
                  animate={{width:`${pct}%`}} transition={{duration:0.8,ease:"easeOut"}}
                  style={{height:"100%",borderRadius:4,
                    background:`linear-gradient(90deg,${ch.brandCol},${ch.brandCol}CC)`,
                    boxShadow:`0 0 8px ${ch.brandCol}50`}}/>
              </div>
              <p style={{margin:"5px 0 0",fontSize:11.5,fontWeight:600,color:T.text}}>{displayProgress}</p>
            </>
          )}
        </div>

        {/* CTA */}
        <motion.div
          animate={done
            ?{background:`linear-gradient(135deg,${T.blue},${T.blueDeep})`}
            :{background:`linear-gradient(135deg,${ch.brandCol}CC,${ch.brandCol}88)`}}
          transition={{duration:0.4}}
          style={{borderRadius:100,padding:"9px 14px",textAlign:"center"}}>
          <p style={{margin:0,fontSize:12,fontWeight:700,color:"#fff"}}>
            {done?"Challenge Completed":isCompleted?"Done":ch.ctaActive}
          </p>
        </motion.div>
      </div>

      {/* Completion shimmer */}
      {done&&(
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.4}}
          style={{position:"absolute",inset:0,borderRadius:20,
            background:"linear-gradient(145deg,rgba(74,158,255,0.06),transparent)",
            pointerEvents:"none"}}/>
      )}
    </motion.div>
  );
}

// ─── CHALLENGE DETAIL BOTTOM SHEET ────────────────────────────────────────────
function ChallengeDetailSheet({chId,challengeProgress,onClose,onSimulate}){
  const ch = CHALLENGES_DATA.find(c=>c.id===chId);
  if(!ch) return null;
  const progress = challengeProgress[ch.id]||0;
  const pct = Math.min((progress/ch.target)*100,100);

  return(
    <motion.div initial={{opacity:0,y:"100%"}} animate={{opacity:1,y:0}} exit={{opacity:0,y:"100%"}}
      transition={{duration:0.42,...SP.gentle}}
      style={{position:"absolute",inset:0,zIndex:90,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      {/* Backdrop */}
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        onClick={onClose}
        style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)"}}/>

      {/* Sheet */}
      <motion.div style={{position:"relative",zIndex:2,background:"#0A0A0C",
        borderRadius:"24px 24px 0 0",border:"1px solid rgba(255,255,255,0.1)",
        maxHeight:"82vh",overflowY:"auto"}}>
        {/* Handle */}
        <div style={{display:"flex",justifyContent:"center",paddingTop:14,paddingBottom:4}}>
          <div style={{width:38,height:4,borderRadius:2,background:"rgba(255,255,255,0.14)"}}/>
        </div>

        <div style={{padding:"12px 22px 40px"}}>
          {/* Header */}
          <div style={{display:"flex",alignItems:"center",gap:13,marginBottom:20}}>
            <div style={{width:48,height:48,borderRadius:14,flexShrink:0,
              background:`${ch.brandCol}18`,border:`1px solid ${ch.brandCol}30`,
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{width:14,height:14,borderRadius:"50%",background:ch.brandCol,
                boxShadow:`0 0 12px ${ch.brandCol}`}}/>
            </div>
            <div style={{flex:1}}>
              <p style={{margin:0,fontSize:11,fontWeight:700,color:ch.brandCol,letterSpacing:"0.06em"}}>{ch.brand.toUpperCase()}</p>
              <h3 style={{margin:"2px 0 0",fontSize:19,fontWeight:800,color:T.text,letterSpacing:"-0.02em"}}>{ch.title}</h3>
            </div>
            <div style={{background:`${ch.brandCol}14`,border:`1px solid ${ch.brandCol}28`,
              borderRadius:22,padding:"5px 12px",flexShrink:0}}>
              <p style={{margin:0,fontSize:12,fontWeight:800,color:ch.brandCol}}>{ch.rewardLabel}</p>
            </div>
          </div>

          {/* Progress hero */}
          <div style={{borderRadius:18,padding:"18px",marginBottom:18,
            background:ch.brandBg,border:`1px solid ${ch.brandBorder}`}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              {ch.type==="count"?(
                <CircularProgress pct={pct} col={ch.brandCol} size={60} stroke={4}/>
              ):(
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                    <p style={{margin:0,fontSize:12,color:T.textMute}}>
                      {ch.type==="spend"
                        ?`\u20B9${fmt(progress)} of \u20B9${fmt(ch.target)}`
                        :`${progress} of ${ch.target} ${ch.unit}`}
                    </p>
                    <p style={{margin:0,fontSize:12,fontWeight:700,color:ch.brandCol}}>{Math.round(pct)}%</p>
                  </div>
                  <div style={{height:6,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden"}}>
                    <motion.div animate={{width:`${pct}%`}} transition={{duration:0.9,ease:"easeOut"}}
                      style={{height:"100%",borderRadius:4,
                        background:`linear-gradient(90deg,${ch.brandCol},${ch.brandCol}BB)`,
                        boxShadow:`0 0 10px ${ch.brandCol}50`}}/>
                  </div>
                </div>
              )}
              {ch.type==="count"&&(
                <div style={{flex:1}}>
                  <p style={{margin:0,fontSize:22,fontWeight:800,color:T.text,letterSpacing:"-0.03em"}}>
                    {progress}/{ch.target}
                  </p>
                  <p style={{margin:"3px 0 0",fontSize:12,color:T.textSub}}>{ch.unit} completed</p>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <p style={{margin:"0 0 14px",fontSize:14,color:T.textSub,lineHeight:1.65}}>{ch.details}</p>

          {/* Reward breakdown */}
          <p style={{margin:"0 0 10px",fontSize:12,color:T.textMute,fontWeight:600,
            letterSpacing:"0.08em",textTransform:"uppercase"}}>Reward Breakdown</p>
          <div style={{borderRadius:14,overflow:"hidden",marginBottom:18,
            border:"1px solid rgba(255,255,255,0.07)"}}>
            {ch.breakdown.map((row,i)=>(
              <div key={row.label} style={{display:"flex",justifyContent:"space-between",
                padding:"11px 14px",
                borderBottom:i<ch.breakdown.length-1?"1px solid rgba(255,255,255,0.05)":"none",
                background:i%2===0?"rgba(255,255,255,0.02)":"transparent"}}>
                <p style={{margin:0,fontSize:13,color:T.textSub}}>{row.label}</p>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:T.text}}>{row.val}</p>
              </div>
            ))}
          </div>

          {/* Simulate button */}
          <Btn onClick={()=>onSimulate(ch.id)} full large>Simulate Progress</Btn>

          {/* Terms */}
          <p style={{margin:"16px 0 0",fontSize:11,color:T.textMute,lineHeight:1.6,textAlign:"center"}}>
            {ch.terms}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── ALL CHALLENGES SCREEN ────────────────────────────────────────────────────
function AllChallengesScreen({onClose,challengeProgress}){
  const allCards = [...CHALLENGES_DATA, ...ALL_EXTRA_CHALLENGES.map(c=>({...c,brandBg:"rgba(255,255,255,0.03)",brandBorder:T.glassBorder}))];

  return(
    <motion.div initial={{opacity:0,y:60,scale:0.97}} animate={{opacity:1,y:0,scale:1}}
      exit={{opacity:0,y:40,scale:0.97}} transition={{duration:0.4,...SP.snappy}}
      style={{position:"absolute",inset:0,zIndex:85,background:T.black,
        display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <ParticleField count={8}/>
      <Glow x={70} y={10} color="rgba(74,158,255,0.06)" size={350}/>

      {/* Header */}
      <div style={{padding:"52px 22px 0",flexShrink:0,position:"relative",zIndex:5}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
          <motion.button whileTap={{scale:0.88}} onClick={onClose}
            style={{width:36,height:36,borderRadius:11,background:T.glass,
              border:`1px solid ${T.glassBorder}`,display:"flex",alignItems:"center",
              justifyContent:"center",cursor:"pointer",flexShrink:0}}>
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
              <path d="M10 2L4 7l6 5" stroke={T.text} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>
          <div>
            <h2 style={{margin:0,fontSize:22,fontWeight:800,color:T.text,letterSpacing:"-0.03em"}}>All Challenges</h2>
            <p style={{margin:0,fontSize:12.5,color:T.textSub,marginTop:2}}>Brand missions that reward your spending</p>
          </div>
        </div>
        {/* Active tag */}
        <div style={{display:"flex",gap:8,marginBottom:4}}>
          {["Active","Upcoming","Completed"].map((tag,i)=>(
            <div key={tag} style={{padding:"5px 14px",borderRadius:20,
              background:i===0?`rgba(74,158,255,0.14)`:"rgba(255,255,255,0.04)",
              border:`1px solid ${i===0?T.blue:T.glassBorder}`}}>
              <p style={{margin:0,fontSize:12,fontWeight:600,color:i===0?T.blue:T.textMute}}>{tag}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cards list */}
      <div style={{flex:1,overflowY:"auto",padding:"14px 20px 32px",position:"relative",zIndex:5}}>
        {CHALLENGES_DATA.map((ch,i)=>{
          const progress=challengeProgress[ch.id]||0;
          const pct=Math.min((progress/ch.target)*100,100);
          return(
            <motion.div key={ch.id} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
              transition={{delay:i*0.07,...SP.gentle}}
              style={{borderRadius:18,padding:"15px 16px",marginBottom:10,
                background:ch.brandBg,border:`1px solid ${ch.brandBorder}`,
                position:"relative",overflow:"hidden"}}>
              <motion.div animate={{x:["-100%","200%"]}}
                transition={{duration:4,repeat:Infinity,ease:"easeInOut",repeatDelay:2.5}}
                style={{position:"absolute",top:0,bottom:0,width:"35%",
                  background:`linear-gradient(90deg,transparent,${ch.brandCol}0C,transparent)`,pointerEvents:"none"}}/>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:42,height:42,borderRadius:12,flexShrink:0,
                  background:`${ch.brandCol}16`,border:`1px solid ${ch.brandCol}2A`,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{width:12,height:12,borderRadius:"50%",background:ch.brandCol,
                    boxShadow:`0 0 8px ${ch.brandCol}`}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{margin:0,fontSize:10.5,fontWeight:700,color:ch.brandCol,letterSpacing:"0.04em"}}>{ch.brand.toUpperCase()}</p>
                  <p style={{margin:"1px 0 4px",fontSize:14,fontWeight:700,color:T.text}}>{ch.title}</p>
                  <div style={{height:3.5,background:"rgba(255,255,255,0.06)",borderRadius:3,overflow:"hidden"}}>
                    <motion.div animate={{width:`${pct}%`}} transition={{duration:0.7,ease:"easeOut"}}
                      style={{height:"100%",borderRadius:3,background:ch.brandCol,
                        boxShadow:`0 0 6px ${ch.brandCol}60`}}/>
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                  <p style={{margin:0,fontSize:13,fontWeight:800,color:ch.brandCol}}>{ch.rewardLabel}</p>
                  <p style={{margin:"3px 0 0",fontSize:11,color:T.textMute}}>{Math.round(pct)}% done</p>
                </div>
              </div>
            </motion.div>
          );
        })}

        <p style={{margin:"8px 0 12px",fontSize:12,color:T.textMute,fontWeight:600,
          letterSpacing:"0.08em",textTransform:"uppercase"}}>More Challenges</p>

        {ALL_EXTRA_CHALLENGES.map((ch,i)=>(
          <motion.div key={ch.id} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}}
            transition={{delay:0.25+i*0.06,...SP.gentle}}
            style={{display:"flex",alignItems:"center",gap:12,padding:"13px 15px",
              borderRadius:15,background:T.glass,border:`1px solid ${T.glassBorder}`,
              backdropFilter:"blur(14px)",marginBottom:8}}>
            <div style={{width:38,height:38,borderRadius:11,flexShrink:0,
              background:`${ch.brandCol}14`,border:`1px solid ${ch.brandCol}22`,
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:ch.brandCol}}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <p style={{margin:0,fontSize:10,fontWeight:700,color:ch.brandCol,letterSpacing:"0.04em"}}>{ch.brand.toUpperCase()}</p>
              <p style={{margin:"1px 0 0",fontSize:13.5,fontWeight:700,color:T.text}}>{ch.title}</p>
              <p style={{margin:"2px 0 0",fontSize:11.5,color:T.textSub}}>{ch.desc}</p>
            </div>
            <div style={{background:`${ch.brandCol}12`,border:`1px solid ${ch.brandCol}24`,
              borderRadius:20,padding:"3px 10px",flexShrink:0}}>
              <p style={{margin:0,fontSize:11,fontWeight:800,color:ch.brandCol}}>+{fmt(ch.reward)}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── CHALLENGES SECTION (embedded in Home tab) ────────────────────────────────
function ChallengesSection({
  challengeProgress,setChallengeProgress,completedChallenges,setCompletedChallenges,
  totalCoins,setTotalCoins,setNotif,onOpenDetail,onOpenAll
}){
  const scrollRef=useRef(null);

  const handleSimulate=(chId)=>{
    const ch=CHALLENGES_DATA.find(c=>c.id===chId);
    if(!ch||completedChallenges[chId])return;
    setChallengeProgress(prev=>{
      const cur=prev[chId]||0;
      const step=ch.type==="spend"
        ?Math.floor(ch.target*0.25)
        :1;
      return{...prev,[chId]:Math.min(cur+step,ch.target)};
    });
  };

  const handleComplete=(chId,reward)=>{
    setCompletedChallenges(p=>({...p,[chId]:true}));
  };

  const sparklePositions=[
    {x:"68%",y:3},{x:"72%",y:8},{x:"66%",y:14},{x:"75%",y:5},{x:"70%",y:0},
  ];

  return(
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
      transition={{duration:0.5,...SP.gentle}} style={{marginTop:16}}>

      {/* Section header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        marginBottom:14,paddingLeft:0,position:"relative"}}>
        <div style={{position:"relative"}}>
          <p style={{margin:0,fontSize:13,fontWeight:800,color:T.text,letterSpacing:"-0.01em"}}>
            Challenges
          </p>
          <p style={{margin:"2px 0 0",fontSize:11.5,color:T.textSub}}>
            Complete brand missions, earn bonus coins.
          </p>
          {/* Sparkles near title */}
          <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"visible"}}>
            {sparklePositions.map((s,i)=>(
              <Sparkle key={i} x={s.x} y={s.y} delay={i*0.35} size={i%2===0?3:2}/>
            ))}
          </div>
        </div>
        <motion.button whileTap={{scale:0.92}} onClick={onOpenAll}
          style={{background:"none",border:"none",cursor:"pointer",padding:0}}>
          <p style={{margin:0,fontSize:12,fontWeight:600,color:T.blue}}>View All</p>
        </motion.button>
      </div>

      {/* Swipeable card rail */}
      <div ref={scrollRef}
        style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:4,
          scrollSnapType:"x mandatory",WebkitOverflowScrolling:"touch",
          msOverflowStyle:"none",scrollbarWidth:"none"}}>
        {CHALLENGES_DATA.map((ch,i)=>(
          <div key={ch.id} style={{scrollSnapAlign:"start",flexShrink:0}}>
            <motion.div initial={{opacity:0,x:30}} animate={{opacity:1,x:0}}
              transition={{delay:i*0.1,...SP.gentle}}>
              <ChallengeCard
                ch={ch}
                progress={challengeProgress[ch.id]||0}
                isCompleted={!!completedChallenges[ch.id]}
                onTap={onOpenDetail}
                onComplete={handleComplete}
                setTotalCoins={setTotalCoins}
                setNotif={setNotif}
              />
            </motion.div>
          </div>
        ))}
      </div>

      {/* Scroll indicator dots */}
      <div style={{display:"flex",gap:5,justifyContent:"center",marginTop:10}}>
        {CHALLENGES_DATA.map((_,i)=>(
          <motion.div key={i}
            animate={{
              width:i===0?16:6,
              background:i===0?T.blue:"rgba(255,255,255,0.15)",
            }}
            transition={{duration:0.3}}
            style={{height:4,borderRadius:4}}/>
        ))}
      </div>

      {/* Footer CTA */}
      <motion.button whileTap={{scale:0.97}} onClick={onOpenAll}
        style={{width:"100%",background:"none",border:`1px solid ${T.glassBorder}`,
          borderRadius:14,padding:"12px",cursor:"pointer",marginTop:10,
          backdropFilter:"blur(14px)",
          display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        <p style={{margin:0,fontSize:13,fontWeight:600,color:T.textSub}}>View All Challenges</p>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 3l4 4-4 4" stroke={T.textSub} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </motion.button>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function DashboardScreen({userName}){
  const [tab,        setTab]        = useState("home");
  const [subScreen,  setSubScreen]  = useState(null); // "weekly" | "monthly" | null
  const [plusOpen,   setPlusOpen]   = useState(false);
  const [builtStage, setBuiltStage] = useState(0);

  const [totalCoins,   setTotalCoins]   = useState(0);
  const [weeklySpend,  setWeeklySpend]  = useState(0);
  const [monthlySpend, setMonthlySpend] = useState(SPENT);
  const [activity,     setActivity]     = useState([]);
  const [notif,        setNotif]        = useState(null);
  const [plusPhase,    setPlusPhase]    = useState("idle");
  const [plusResult,   setPlusResult]   = useState(null);
  const [challengeProgress, setChallengeProgress] = useState({blinkit:650,swiggy:2,amazon:1250});
  const [challengeDetail,   setChallengeDetail]   = useState(null);
  const [allChallengesOpen, setAllChallengesOpen] = useState(false);
  const [completedChallenges, setCompletedChallenges] = useState({});

  useEffect(()=>{
    [0,280,520,760].forEach((t,i)=>setTimeout(()=>setBuiltStage(i+1),t+320));
  },[]);

  const dismissNotif = useCallback(()=>setNotif(null),[]);

  const fireTransaction = useCallback((tx)=>{
    setTotalCoins(c=>c+tx.coins);
    setWeeklySpend(w=>w+tx.amt);
    setMonthlySpend(m=>m+tx.amt);
    setActivity(a=>[tx,...a].slice(0,20));
    setNotif(tx);
  },[]);

  const fireSpecial = useCallback(()=>{ setNotif(genSpecial()); },[]);

  const handleNavigate = useCallback((dest)=>{
    if(dest==="wallet")     setTab("wallet");
    if(dest==="store")      setTab("store");
    if(dest==="weekly")     setSubScreen("weekly");
    if(dest==="monthly")    setSubScreen("monthly");
    if(dest==="challenges") setAllChallengesOpen(true);
  },[]);

  useEffect(()=>{
    let tid,counter=0;
    const schedule=()=>{
      const delay=(Math.random()*10+20)*1000;
      tid=setTimeout(()=>{
        counter++;
        if(counter%4===0) fireSpecial();
        else fireTransaction(genTransaction());
        schedule();
      },delay);
    };
    const fid=setTimeout(()=>{ fireTransaction(genTransaction()); schedule(); },8000);
    return()=>{ clearTimeout(fid); clearTimeout(tid); };
  },[fireTransaction,fireSpecial]);

  const handlePlusAction=()=>{
    setPlusPhase("scanning");
    setTimeout(()=>{
      const tx=genTransaction();
      setPlusResult(tx);setPlusPhase("done");
      fireTransaction(tx);
    },3000+Math.random()*2000);
  };
  const closePlus=()=>{ setPlusOpen(false);setPlusPhase("idle");setPlusResult(null); };

  const FIRST_REWARD=1000;
  const progressPct=Math.min((totalCoins/FIRST_REWARD)*100,100);
  const rewards=[
    {name:"Amazon",      discount:"10% off",      locked:totalCoins<1000,  col:"#FF9900",min:1000 },
    {name:"Swiggy",      discount:"Free Delivery", locked:totalCoins<3000,  col:"#E05D5D",min:3000 },
    {name:"Spotify",     discount:"1 Month Free",  locked:totalCoins<5000,  col:"#1DB954",min:5000 },
    {name:"Netflix",     discount:"30% off",       locked:totalCoins<8000,  col:"#E50914",min:8000 },
    {name:"Movie Ticket",discount:"Buy 1 Get 1",   locked:totalCoins<10000, col:"#8A5CF6",min:10000},
    {name:"Zomato",      discount:"Free Order",    locked:totalCoins<12000, col:"#FF4D00",min:12000},
  ];

  return(
    <div style={{position:"relative",width:"100%",height:"100%",background:T.black,overflow:"hidden"}}>

      {/* Dynamic Island — absolute, top center, highest z */}
      <DynamicIsland notif={notif} onDismiss={dismissNotif} onNavigate={handleNavigate}/>

      {/* Sub-screens: weekly + monthly */}
      <AnimatePresence>
        {subScreen==="weekly"&&(
          <motion.div key="weekly-sub"
            initial={{opacity:0,x:60,scale:0.97}} animate={{opacity:1,x:0,scale:1}}
            exit={{opacity:0,x:60,scale:0.97}} transition={{duration:0.38,...SP.snappy}}
            style={{position:"absolute",inset:0,zIndex:80}}>
            <WeeklyRewardsScreen onBack={()=>setSubScreen(null)} weeklySpend={weeklySpend}/>
          </motion.div>
        )}
        {subScreen==="monthly"&&(
          <motion.div key="monthly-sub"
            initial={{opacity:0,x:60,scale:0.97}} animate={{opacity:1,x:0,scale:1}}
            exit={{opacity:0,x:60,scale:0.97}} transition={{duration:0.38,...SP.snappy}}
            style={{position:"absolute",inset:0,zIndex:80}}>
            <MonthlyRewardsScreen onBack={()=>setSubScreen(null)} monthlySpend={monthlySpend}/>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Challenge detail bottom sheet */}
      <AnimatePresence>
        {challengeDetail&&(
          <ChallengeDetailSheet
            key="challenge-detail"
            chId={challengeDetail}
            challengeProgress={challengeProgress}
            onClose={()=>setChallengeDetail(null)}
            onSimulate={(chId)=>{
              const ch=CHALLENGES_DATA.find(c=>c.id===chId);
              if(!ch)return;
              setChallengeProgress(prev=>{
                const cur=prev[chId]||0;
                const step=ch.type==="spend"?Math.floor(ch.target*0.25):1;
                return{...prev,[chId]:Math.min(cur+step,ch.target)};
              });
            }}
          />
        )}
      </AnimatePresence>

      {/* All challenges screen */}
      <AnimatePresence>
        {allChallengesOpen&&(
          <AllChallengesScreen
            key="all-challenges"
            onClose={()=>setAllChallengesOpen(false)}
            challengeProgress={challengeProgress}
          />
        )}
      </AnimatePresence>

      {/* TOP BAR */}
      <motion.div initial={{opacity:0,y:-14}} animate={{opacity:1,y:0}} transition={{duration:0.5}}
        style={{position:"absolute",top:0,left:0,right:0,zIndex:30,padding:"48px 22px 14px",
          background:"linear-gradient(to bottom,rgba(0,0,0,0.95),rgba(0,0,0,0.7),transparent)",
          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <motion.button whileTap={{scale:0.9}}
          style={{width:38,height:38,borderRadius:12,background:T.glass,border:`1px solid ${T.glassBorder}`,
            display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
          <svg width="18" height="13" viewBox="0 0 18 13" fill="none">
            <path d="M1 1h16M1 6.5h12M1 12h16" stroke={T.text} strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </motion.button>
        <span style={{fontSize:17,fontWeight:800,letterSpacing:"-0.02em",color:T.text}}>
          PAY<span style={{color:T.blue}}>MINT</span>
        </span>
        <motion.button whileTap={{scale:0.92}} onClick={()=>setTab("wallet")}
          style={{display:"flex",alignItems:"center",gap:7,padding:"7px 13px",borderRadius:100,
            background:tab==="wallet"?"rgba(74,158,255,0.14)":T.glass,
            border:`1px solid ${tab==="wallet"?T.blue:T.glassBorder}`,cursor:"pointer"}}>
          <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7.5" fill="none" stroke={T.gold} strokeWidth="1.4"/>
            <text x="9" y="13.2" textAnchor="middle" fill={T.gold} fontSize="8" fontWeight="800"
              fontFamily="Inter,-apple-system,sans-serif">P</text>
          </svg>
          <motion.span key={totalCoins} initial={{y:-8,opacity:0}} animate={{y:0,opacity:1}}
            transition={{duration:0.25,...SP.bouncy}}
            style={{fontSize:12.5,fontWeight:700,color:T.gold}}>
            <AnimatedCount value={totalCoins}/> Coins
          </motion.span>
        </motion.button>
      </motion.div>

      {/* CONTENT */}
      <div style={{position:"absolute",inset:0,overflowY:"auto",paddingTop:106,paddingBottom:90}}>
        <ParticleField count={8}/>
        <Glow x={80} y={5} color="rgba(74,158,255,0.07)" size={320}/>

        <AnimatePresence mode="wait">
          {/* HOME */}
          {tab==="home"&&(
            <motion.div key="home" initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-30}}
              transition={{duration:0.32}} style={{padding:"0 20px 20px"}}>

              {builtStage>=1&&(
                <motion.div initial={{opacity:0,y:32,scale:0.94}} animate={{opacity:1,y:0,scale:1}}
                  transition={{duration:0.58,...SP.gentle}}
                  style={{borderRadius:24,padding:"22px 22px 20px",marginBottom:14,
                    background:"linear-gradient(145deg,#0C1A2E 0%,#070D1A 100%)",
                    border:"1px solid rgba(74,158,255,0.18)",
                    boxShadow:"0 12px 40px rgba(74,158,255,0.12),inset 0 1px 0 rgba(74,158,255,0.12)",
                    position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",right:-24,top:-24,width:150,height:150,
                    borderRadius:"50%",background:"rgba(74,158,255,0.05)",filter:"blur(28px)",pointerEvents:"none"}}/>
                  <p style={{margin:"0 0 4px",fontSize:11.5,color:"rgba(74,158,255,0.65)",
                    fontWeight:600,letterSpacing:"0.09em",textTransform:"uppercase"}}>Current Balance</p>
                  <h2 style={{fontSize:36,fontWeight:800,color:T.text,margin:"0 0 18px",letterSpacing:"-0.04em"}}>
                    {`\u20B9 ${fmt(BAL)}`}
                  </h2>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    {[{l:"Salary Received",v:`+${fmt(SALARY)}`,c:T.blue},{l:"Spent This Month",v:`-${fmt(SPENT)}`,c:"#F87171"}].map(x=>(
                      <div key={x.l} style={{padding:"10px 13px",borderRadius:12,
                        background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
                        <p style={{margin:0,fontSize:10.5,color:T.textMute,fontWeight:500}}>{x.l}</p>
                        <p style={{margin:"3px 0 0",fontSize:14.5,fontWeight:700,color:x.c}}>{`\u20B9 ${x.v}`}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {builtStage>=2&&(
                <motion.div initial={{opacity:0,y:24}} animate={{opacity:1,y:0}}
                  transition={{duration:0.5,...SP.gentle}}
                  style={{borderRadius:18,padding:"18px 18px 16px",marginBottom:12,
                    background:"linear-gradient(145deg,#100E00,#0A0800)",
                    border:"1px solid rgba(232,196,106,0.16)"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:9}}>
                      <div style={{width:34,height:34,borderRadius:10,
                        background:"rgba(232,196,106,0.1)",border:"1px solid rgba(232,196,106,0.18)",
                        display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                          <circle cx="9" cy="9" r="7.5" fill="none" stroke={T.gold} strokeWidth="1.4"/>
                          <text x="9" y="13.2" textAnchor="middle" fill={T.gold} fontSize="8" fontWeight="800"
                            fontFamily="Inter,-apple-system,sans-serif">P</text>
                        </svg>
                      </div>
                      <p style={{margin:0,fontSize:14,fontWeight:700,color:T.text}}>Coins</p>
                    </div>
                    <motion.span key={totalCoins} initial={{scale:1.25,color:"#FFE599"}} animate={{scale:1,color:T.gold}}
                      transition={{duration:0.4,...SP.bouncy}}
                      style={{fontSize:26,fontWeight:800,letterSpacing:"-0.03em"}}>
                      <AnimatedCount value={totalCoins}/>
                    </motion.span>
                  </div>
                  <p style={{margin:"0 0 10px",fontSize:12.5,color:T.textSub,lineHeight:1.55}}>
                    {totalCoins===0
                      ?"Make your next spend to start earning Paymint Coins."
                      :`Keep going — you're ${fmt(Math.max(0,FIRST_REWARD-totalCoins))} coins from your first reward.`}
                  </p>
                  <div style={{height:3.5,background:"rgba(255,255,255,0.05)",borderRadius:4,overflow:"hidden",marginBottom:5}}>
                    <motion.div animate={{width:`${progressPct}%`}} transition={{duration:0.6,ease:"easeOut"}}
                      style={{height:"100%",borderRadius:4,background:`linear-gradient(90deg,${T.gold},#FFE599)`}}/>
                  </div>
                  <p style={{margin:0,fontSize:11,color:T.textMute}}>{Math.round(progressPct)}% towards first reward</p>
                </motion.div>
              )}

              {/* Journey — now tappable to open sub-screens */}
              {builtStage>=3&&(
                <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.5,...SP.gentle}}>
                  <p style={{margin:"0 0 11px",fontSize:13,fontWeight:700,color:T.textSub,letterSpacing:"0.01em"}}>Your Journey</p>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {[
                      {title:"Earn Coins",     sub:"Earn coins on every spend",              col:T.blue,   nav:null       },
                      {title:"Weekly Rewards", sub:"Unlock rewards through weekly activity", col:"#8A5CF6", nav:"weekly"  },
                      {title:"Monthly Tiers",  sub:"Unlock larger monthly rewards",          col:T.gold,   nav:"monthly" },
                    ].map((j,i)=>(
                      <motion.div key={j.title} initial={{opacity:0,x:-14}} animate={{opacity:1,x:0}}
                        transition={{delay:i*0.07,duration:0.38}}
                        onClick={j.nav?()=>setSubScreen(j.nav):undefined}
                        whileTap={j.nav?{scale:0.97}:{}}
                        style={{display:"flex",alignItems:"center",gap:13,padding:"13px 15px",
                          borderRadius:14,background:T.glass,border:`1px solid ${T.glassBorder}`,
                          backdropFilter:"blur(16px)",cursor:j.nav?"pointer":"default"}}>
                        <div style={{width:36,height:36,borderRadius:10,flexShrink:0,
                          background:`${j.col}14`,border:`1px solid ${j.col}28`,
                          display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <div style={{width:10,height:10,borderRadius:"50%",background:j.col}}/>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{margin:0,fontSize:13.5,fontWeight:700,color:T.text}}>{j.title}</p>
                          <p style={{margin:0,fontSize:12,color:T.textSub,marginTop:2}}>{j.sub}</p>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M5 3l4 4-4 4" stroke={j.nav?T.textSub:T.textMute} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── CHALLENGES SECTION ── */}
              {builtStage>=3&&(
                <ChallengesSection
                  challengeProgress={challengeProgress}
                  setChallengeProgress={setChallengeProgress}
                  completedChallenges={completedChallenges}
                  setCompletedChallenges={setCompletedChallenges}
                  totalCoins={totalCoins}
                  setTotalCoins={setTotalCoins}
                  setNotif={setNotif}
                  onOpenDetail={setChallengeDetail}
                  onOpenAll={()=>setAllChallengesOpen(true)}
                />
              )}

              {/* Activity feed */}
              {builtStage>=4&&(
                <motion.div initial={{opacity:0,y:18}} animate={{opacity:1,y:0}}
                  transition={{duration:0.5,...SP.gentle}} style={{marginTop:16}}>
                  <p style={{margin:"0 0 11px",fontSize:13,fontWeight:700,color:T.textSub,letterSpacing:"0.01em"}}>
                    Recent Activity
                  </p>
                  <AnimatePresence initial={false}>
                    {activity.length===0&&(
                      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                        style={{padding:"16px",borderRadius:14,background:T.glass,
                          border:`1px solid ${T.glassBorder}`,textAlign:"center"}}>
                        <p style={{margin:0,fontSize:13,color:T.textMute}}>Activity will appear as you spend</p>
                      </motion.div>
                    )}
                    {activity.map((tx,i)=>(
                      <motion.div key={tx.id}
                        initial={{opacity:0,y:-20,scale:0.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,x:-20}}
                        transition={{duration:0.35,...SP.snappy}}
                        style={{display:"flex",alignItems:"center",gap:13,padding:"11px 0",
                          borderBottom:i<activity.length-1?"1px solid rgba(255,255,255,0.04)":"none"}}>
                        <div style={{width:38,height:38,borderRadius:11,flexShrink:0,
                          background:`${tx.col}16`,border:`1px solid ${tx.col}28`,
                          display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <div style={{width:10,height:10,borderRadius:"50%",background:tx.col}}/>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{margin:0,fontSize:14,fontWeight:600,color:T.text}}>{tx.name}</p>
                          <p style={{margin:0,fontSize:11.5,color:T.textMute,marginTop:1}}>{tx.cat} · {tx.via}</p>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <p style={{margin:0,fontSize:13.5,fontWeight:700,color:T.text}}>{`\u20B9 ${fmt(tx.amt)}`}</p>
                          <motion.p initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{delay:0.15}}
                            style={{margin:0,fontSize:11,fontWeight:600,color:T.gold,marginTop:1}}>
                            +{fmt(tx.coins)} coins
                          </motion.p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* WALLET */}
          {tab==="wallet"&&(
            <motion.div key="wallet" initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-30}}
              transition={{duration:0.32}} style={{padding:"0 20px 20px"}}>
              <Glow x={50} y={30} color="rgba(232,196,106,0.08)" size={400}/>
              <div style={{borderRadius:22,padding:"28px 22px",marginBottom:14,
                background:"linear-gradient(145deg,#100E00,#0A0800)",
                border:"1px solid rgba(232,196,106,0.2)",textAlign:"center"}}>
                <div style={{width:56,height:56,borderRadius:18,background:"rgba(232,196,106,0.1)",
                  border:"1px solid rgba(232,196,106,0.2)",display:"flex",alignItems:"center",
                  justifyContent:"center",margin:"0 auto 16px"}}>
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                    <circle cx="13" cy="13" r="11" fill="none" stroke={T.gold} strokeWidth="1.6"/>
                    <text x="13" y="18" textAnchor="middle" fill={T.gold} fontSize="11" fontWeight="800"
                      fontFamily="Inter,-apple-system,sans-serif">P</text>
                  </svg>
                </div>
                <p style={{margin:"0 0 4px",fontSize:12,color:T.textMute,fontWeight:500,
                  letterSpacing:"0.08em",textTransform:"uppercase"}}>Current Coins</p>
                <motion.h2 key={totalCoins} initial={{scale:1.1,color:"#FFE599"}} animate={{scale:1,color:T.gold}}
                  transition={{duration:0.4,...SP.bouncy}}
                  style={{fontSize:52,fontWeight:800,margin:"0 0 4px",letterSpacing:"-0.05em"}}>
                  <AnimatedCount value={totalCoins}/>
                </motion.h2>
                <p style={{margin:"0 0 20px",fontSize:12.5,color:T.textMute}}>Lifetime Coins: {fmt(totalCoins)}</p>
                <div style={{height:1,background:"rgba(232,196,106,0.1)",marginBottom:20}}/>
                <p style={{margin:0,fontSize:14,color:T.textSub,lineHeight:1.7}}>
                  {totalCoins===0?"Your rewards journey starts with your next spend.":`You've earned ${fmt(totalCoins)} coins so far. Keep going!`}
                </p>
              </div>
              <p style={{margin:"0 0 11px",fontSize:13,fontWeight:700,color:T.textSub}}>Upcoming Milestones</p>
              {[
                {label:"First Coins",  target:`Spend \u20B9 100`,    coins:"+10 coins",   done:totalCoins>=10  },
                {label:"Weekly Chest", target:`Spend \u20B9 5,000`,  coins:"+500 coins",  done:totalCoins>=500 },
                {label:"Silver Tier",  target:`Spend \u20B9 20,000`, coins:"+2000 coins", done:totalCoins>=2000},
              ].map((m,i)=>(
                <motion.div key={m.label}
                  animate={{background:m.done?"rgba(74,158,255,0.08)":T.glass,borderColor:m.done?T.blue:T.glassBorder}}
                  transition={{duration:0.3}}
                  style={{display:"flex",alignItems:"center",gap:13,padding:"12px 15px",borderRadius:14,
                    border:"1px solid",marginBottom:8,backdropFilter:"blur(14px)"}}>
                  <div style={{width:36,height:36,borderRadius:10,flexShrink:0,
                    background:m.done?"rgba(74,158,255,0.12)":"rgba(232,196,106,0.08)",
                    border:`1px solid ${m.done?"rgba(74,158,255,0.22)":"rgba(232,196,106,0.16)"}`,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {m.done?(
                      <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
                        <path d="M1 5.5l3.5 4L12 1" stroke={T.blue} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ):<span style={{fontSize:13,fontWeight:800,color:T.gold}}>{i+1}</span>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{margin:0,fontSize:13.5,fontWeight:700,color:m.done?T.blue:T.text}}>{m.label}</p>
                    <p style={{margin:0,fontSize:12,color:T.textSub,marginTop:2}}>{m.target}</p>
                  </div>
                  <span style={{fontSize:11.5,fontWeight:600,color:m.done?T.blue:T.gold,flexShrink:0,
                    background:m.done?"rgba(74,158,255,0.1)":"rgba(232,196,106,0.1)",
                    border:`1px solid ${m.done?"rgba(74,158,255,0.2)":"rgba(232,196,106,0.2)"}`,
                    padding:"3px 9px",borderRadius:20}}>
                    {m.done?"Done":m.coins}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* STORE */}
          {tab==="store"&&(
            <motion.div key="store" initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-30}}
              transition={{duration:0.32}} style={{padding:"0 20px 20px"}}>
              <Glow x={50} y={20} color="rgba(74,158,255,0.07)" size={400}/>
              <div style={{marginBottom:16}}>
                <h3 style={{fontSize:21,fontWeight:800,color:T.text,margin:"0 0 4px",letterSpacing:"-0.025em"}}>Reward Store</h3>
                <p style={{fontSize:13,color:T.textSub,margin:0}}>
                  {totalCoins===0?"Earn coins to unlock rewards.":`${fmt(totalCoins)} coins available.`}
                </p>
              </div>
              {rewards.filter(r=>!r.locked).length>0&&(
                <div style={{marginBottom:14}}>
                  <p style={{margin:"0 0 8px",fontSize:12,color:T.blue,fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase"}}>Unlocked</p>
                  {rewards.filter(r=>!r.locked).map((r,i)=>(
                    <motion.div key={r.name} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.06,duration:0.35}}
                      style={{borderRadius:16,padding:"14px",marginBottom:8,
                        background:`linear-gradient(135deg,${r.col}10,${r.col}06)`,
                        border:`1px solid ${r.col}30`}}>
                      <div style={{display:"flex",alignItems:"center",gap:12}}>
                        <div style={{width:44,height:44,borderRadius:12,background:`${r.col}14`,
                          border:`1px solid ${r.col}24`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <div style={{width:12,height:12,borderRadius:"50%",background:r.col}}/>
                        </div>
                        <div style={{flex:1}}>
                          <p style={{margin:0,fontSize:14.5,fontWeight:700,color:T.text}}>{r.name}</p>
                          <p style={{margin:0,fontSize:12,color:T.textSub,marginTop:2}}>{r.discount}</p>
                        </div>
                        <span style={{fontSize:11,fontWeight:600,color:r.col,background:`${r.col}14`,
                          border:`1px solid ${r.col}26`,padding:"4px 10px",borderRadius:20}}>Claim</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              <p style={{margin:"0 0 10px",fontSize:12,color:T.textMute,fontWeight:500,
                letterSpacing:"0.07em",textTransform:"uppercase"}}>Locked</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {rewards.filter(r=>r.locked).map((r,i)=>(
                  <motion.div key={r.name} initial={{opacity:0,y:16,scale:0.95}} animate={{opacity:1,y:0,scale:1}}
                    transition={{delay:i*0.06,duration:0.38}}
                    style={{borderRadius:16,padding:"15px 14px",background:"rgba(255,255,255,0.03)",
                      border:"1px solid rgba(255,255,255,0.07)",backdropFilter:"blur(14px)",position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:10,right:10}}>
                      <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                        <rect x="1" y="6" width="10" height="7.5" rx="2" stroke={T.textMute} strokeWidth="1.2"/>
                        <path d="M3 6V4a3 3 0 016 0v2" stroke={T.textMute} strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div style={{width:38,height:38,borderRadius:11,background:`${r.col}12`,
                      border:`1px solid ${r.col}22`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10}}>
                      <div style={{width:10,height:10,borderRadius:"50%",background:r.col,opacity:0.5}}/>
                    </div>
                    <p style={{margin:0,fontSize:13,fontWeight:700,color:"rgba(242,242,247,0.5)"}}>{r.name}</p>
                    <p style={{margin:"3px 0 0",fontSize:11,color:T.textMute}}>{r.discount}</p>
                    <p style={{margin:"7px 0 0",fontSize:10.5,color:T.textMute,
                      background:"rgba(255,255,255,0.04)",borderRadius:6,padding:"2px 7px",display:"inline-block"}}>
                      {fmt(r.min)} coins
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* PLUS OVERLAY */}
      <AnimatePresence>
        {plusOpen&&(
          <motion.div initial={{opacity:0,y:"100%"}} animate={{opacity:1,y:0}} exit={{opacity:0,y:"100%"}}
            transition={{duration:0.45,...SP.gentle}}
            style={{position:"absolute",inset:0,zIndex:60,background:"rgba(0,0,0,0.96)",
              backdropFilter:"blur(28px)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <Glow x={50} y={30} color="rgba(74,158,255,0.1)" size={480}/>
            <ParticleField count={14}/>
            <div style={{display:"flex",justifyContent:"center",paddingTop:16,marginBottom:8}}>
              <div style={{width:36,height:4,borderRadius:2,background:"rgba(255,255,255,0.12)"}}/>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"8px 24px 40px",position:"relative",zIndex:5}}>
              <motion.div initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{delay:0.12}}>
                <h2 style={{fontSize:26,fontWeight:800,color:T.text,margin:"0 0 8px",letterSpacing:"-0.03em",lineHeight:1.2}}>
                  Start Your<br/>Rewards Journey
                </h2>
                <p style={{fontSize:14,color:T.textSub,margin:"0 0 28px",lineHeight:1.65}}>
                  Continue using any UPI app or bank account you already use.
                </p>
              </motion.div>
              <AnimatePresence mode="wait">
                {plusPhase==="idle"&&(
                  <motion.div key="idle" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:0.28}}>
                    <motion.button onClick={handlePlusAction} whileTap={{scale:0.97}}
                      style={{width:"100%",padding:"18px",borderRadius:18,
                        background:`linear-gradient(135deg,${T.blue},${T.blueDeep})`,border:"none",cursor:"pointer",
                        marginBottom:24,display:"flex",alignItems:"center",justifyContent:"center",gap:12,
                        boxShadow:`0 0 32px rgba(74,158,255,0.3)`}}>
                      <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                        <circle cx="11" cy="11" r="9" fill="none" stroke="white" strokeWidth="1.6"/>
                        <path d="M11 6v10M6 11h10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                      <span style={{fontSize:16,fontWeight:700,color:"white"}}>Simulate Transaction</span>
                    </motion.button>
                  </motion.div>
                )}
                {plusPhase==="scanning"&&(
                  <motion.div key="scan" initial={{opacity:0,scale:0.94}} animate={{opacity:1,scale:1}}
                    exit={{opacity:0,scale:1.04}} transition={{duration:0.3}}
                    style={{textAlign:"center",padding:"24px 0",marginBottom:24}}>
                    <motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:"linear"}}
                      style={{width:56,height:56,margin:"0 auto 18px",borderRadius:"50%",
                        border:`2px solid ${T.blue}`,borderTopColor:"transparent"}}/>
                    <h3 style={{fontSize:17,fontWeight:700,color:T.text,margin:"0 0 6px"}}>Tracking Spending Activity…</h3>
                    <p style={{fontSize:13,color:T.textSub,margin:0}}>Detecting your latest transaction</p>
                  </motion.div>
                )}
                {plusPhase==="done"&&plusResult&&(
                  <motion.div key="done" initial={{opacity:0,scale:0.88,y:20}} animate={{opacity:1,scale:1,y:0}}
                    transition={{duration:0.45,...SP.bouncy}} style={{marginBottom:24}}>
                    <div style={{borderRadius:18,padding:"20px",textAlign:"center",
                      background:`linear-gradient(145deg,rgba(74,158,255,0.1),rgba(74,158,255,0.05))`,
                      border:"1px solid rgba(74,158,255,0.22)"}}>
                      <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.1,...SP.bouncy}}
                        style={{width:52,height:52,borderRadius:"50%",
                          background:`linear-gradient(145deg,${T.blue},${T.blueDeep})`,
                          display:"flex",alignItems:"center",justifyContent:"center",
                          margin:"0 auto 14px",boxShadow:`0 0 30px rgba(74,158,255,0.4)`}}>
                        <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
                          <path d="M1 9l6.5 8L21 1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </motion.div>
                      <h3 style={{fontSize:20,fontWeight:800,color:T.text,margin:"0 0 6px",letterSpacing:"-0.02em"}}>
                        +{fmt(plusResult.coins)} Coins Earned
                      </h3>
                      <p style={{fontSize:14,color:T.textSub,margin:"0 0 4px"}}>{`\u20B9${fmt(plusResult.amt)} spent via ${plusResult.via}`}</p>
                      <p style={{fontSize:12.5,color:T.textMute,margin:0}}>{plusResult.name} · {plusResult.cat}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <p style={{margin:"0 0 12px",fontSize:12,color:T.blue,fontWeight:600,letterSpacing:"0.09em",textTransform:"uppercase"}}>Milestones</p>
              {[
                {num:1,title:`Spend \u20B9 100`,   sub:"Earn your first Paymint Coins",  reward:"+10 coins"   },
                {num:2,title:`Spend \u20B9 5,000`, sub:"Unlock Weekly Reward Chest",      reward:"+500 coins"  },
                {num:3,title:`Spend \u20B9 20,000`,sub:"Unlock Silver Tier",              reward:"+2,000 coins"},
              ].map((m,i)=>(
                <motion.div key={m.num} initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:0.2+i*0.1}}
                  style={{display:"flex",gap:14,marginBottom:12,padding:"14px",borderRadius:15,
                    background:T.glass,border:`1px solid ${T.glassBorder}`,backdropFilter:"blur(14px)"}}>
                  <div style={{width:34,height:34,borderRadius:10,flexShrink:0,
                    background:"rgba(74,158,255,0.1)",border:"1px solid rgba(74,158,255,0.2)",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:T.blue}}>
                    {m.num}
                  </div>
                  <div style={{flex:1}}>
                    <p style={{margin:0,fontSize:14.5,fontWeight:700,color:T.text}}>{m.title}</p>
                    <p style={{margin:"2px 0 6px",fontSize:12.5,color:T.textSub}}>{m.sub}</p>
                    <span style={{fontSize:11.5,color:T.blue,fontWeight:600,
                      background:"rgba(74,158,255,0.1)",border:"1px solid rgba(74,158,255,0.18)",
                      padding:"2px 10px",borderRadius:20}}>{m.reward}</span>
                  </div>
                </motion.div>
              ))}
              <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:0.55}} style={{marginTop:12}}>
                <Btn onClick={closePlus} full large>{plusPhase==="done"?"Great, Got It!":"Got It"}</Btn>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM NAV */}
      <motion.div initial={{opacity:0,y:36}} animate={{opacity:1,y:0}} transition={{delay:0.9,duration:0.5}}
        style={{position:"absolute",bottom:0,left:0,right:0,zIndex:40,
          background:"rgba(0,0,0,0.9)",backdropFilter:"blur(22px)",
          borderTop:"1px solid rgba(255,255,255,0.07)",
          display:"flex",alignItems:"center",justifyContent:"space-around",padding:"10px 24px 22px"}}>
        <motion.button whileTap={{scale:0.88}} onClick={()=>setTab("home")}
          style={{background:"none",border:"none",cursor:"pointer",
            display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 12px",
            color:tab==="home"?T.blue:T.textMute,fontFamily:"inherit"}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
            <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
          </svg>
          <span style={{fontSize:9.5,fontWeight:600,letterSpacing:"0.04em"}}>Home</span>
        </motion.button>
        <motion.button whileTap={{scale:0.88}} onClick={()=>{ setPlusOpen(true); if(plusPhase==="done"){setPlusPhase("idle");setPlusResult(null);} }}
          style={{background:"none",border:"none",cursor:"pointer",padding:0,
            display:"flex",flexDirection:"column",alignItems:"center",fontFamily:"inherit"}}>
          <motion.div whileHover={{scale:1.07}} whileTap={{scale:0.9}}
            animate={{boxShadow:[`0 0 24px rgba(74,158,255,0.35)`,`0 0 40px rgba(74,158,255,0.55)`,`0 0 24px rgba(74,158,255,0.35)`]}}
            transition={{boxShadow:{duration:2.5,repeat:Infinity,ease:"easeInOut"},scale:SP.snappy}}
            style={{width:54,height:54,borderRadius:"50%",
              background:`linear-gradient(145deg,${T.blue},${T.blueDeep})`,
              display:"flex",alignItems:"center",justifyContent:"center",marginBottom:-4}}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 4v14M4 11h14" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </motion.div>
        </motion.button>
        <motion.button whileTap={{scale:0.88}} onClick={()=>setTab("store")}
          style={{background:"none",border:"none",cursor:"pointer",
            display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 12px",
            color:tab==="store"?T.blue:T.textMute,fontFamily:"inherit"}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
          </svg>
          <span style={{fontSize:9.5,fontWeight:600,letterSpacing:"0.04em"}}>Rewards</span>
        </motion.button>
      </motion.div>
    </div>
  );
}

// ─── STEP BAR ─────────────────────────────────────────────────────────────────
function StepBar({current}){
  if(current===0||current>3)return null;
  return(
    <div style={{position:"absolute",top:0,left:0,right:0,height:2,
      background:"rgba(255,255,255,0.04)",zIndex:100,overflow:"hidden"}}>
      <motion.div animate={{width:`${(current/3)*100}%`}} transition={{duration:0.5,ease:"easeOut"}}
        style={{height:"100%",background:`linear-gradient(90deg,${T.blue},#90CAFF)`}}/>
    </div>
  );
}

// PAYMINT API CLIENT — talks to Vercel serverless backend
// No database credentials in frontend. JWT token auth.
// ══════════════════════════════════════════════════════════════════════════════

const API = ''; // same-domain — /api/... routes handled by Vercel

// ── Token storage ─────────────────────────────────────────────────────────────
const tokenStore = {
  get: () => { try { return localStorage.getItem('pm_token'); } catch { return null; } },
  set: (t) => { try { localStorage.setItem('pm_token', t); } catch {} },
  del: () => { try { localStorage.removeItem('pm_token'); } catch {} },
};

// ── localStorage cache helper (UI speed — not source of truth) ────────────────
const lc = {
  get: async (k) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):null; } catch { return null; } },
  set: async (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del: async (k) => { try { localStorage.removeItem(k); } catch {} },
};

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function apiFetch(path, opts={}) {
  const token = tokenStore.get();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(opts.founderPw ? { 'x-founder-password': opts.founderPw } : {}),
    ...(opts.headers || {}),
  };
  try {
    const res  = await fetch(API + path, {
      method:  opts.method || 'GET',
      headers,
      ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { __apiError: true, status: res.status, message: data.error || 'Unknown error', data };
    return data;
  } catch (e) {
    console.error('[API]', path, e.message);
    return { __apiError: true, status: 0, message: e.message };
  }
}
const isErr = (r) => r && r.__apiError === true;

// ── User / Auth ───────────────────────────────────────────────────────────────
async function apiRegister(form) {
  const r = await apiFetch('/api/users/register', {
    method: 'POST',
    body: { email: form.email, name: form.name, age: form.age, occupation: form.occupation },
  });
  if (isErr(r)) return { error: true, message: r.message };
  tokenStore.set(r.token);
  return r.user;
}

async function apiGetMe() {
  const r = await apiFetch('/api/users/me');
  if (isErr(r)) return { error: true, message: r.message };
  return r;
}

// ── Transactions ──────────────────────────────────────────────────────────────
async function apiSaveTx(tx, screenshotUrl) {
  const r = await apiFetch('/api/transactions', {
    method: 'POST',
    body: {
      merchant:      tx.merchant,
      amount:        tx.amount,
      txnId:         tx.txnId    || null,
      txnDate:       tx.date     || null,
      txnTime:       tx.time     || null,
      paymentApp:    tx.app      || null,
      bank:          tx.bank     || null,
      screenshotUrl: screenshotUrl || null,
    },
  });
  if (isErr(r)) return { error: true, message: r.message, code: r.data?.error };
  return r; // { transaction, coin_balance, coins_earned }
}

async function apiGetTxns() {
  const r = await apiFetch('/api/transactions');
  if (isErr(r)) return [];
  return r;
}

async function apiSaveNote(transactionId, note) {
  const r = await apiFetch('/api/transactions/note', {
    method: 'PATCH',
    body: { transactionId, note },
  });
  if (isErr(r)) return { error: true, message: r.message };
  return r; // { bonus_awarded, bonus_coins, coin_balance }
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
async function apiGetLB() {
  const r = await apiFetch('/api/leaderboard');
  if (isErr(r)) return [];
  return r;
}

// ── Rewards ───────────────────────────────────────────────────────────────────
async function apiGetRewards() {
  const r = await apiFetch('/api/rewards');
  if (isErr(r)) return [];
  return r;
}

async function apiClaimReward(brand, label) {
  const r = await apiFetch('/api/rewards/claim', {
    method: 'POST',
    body: { brand, label },
  });
  if (isErr(r)) return { error: true, message: r.message };
  return r; // { code, coins_spent, coin_balance }
}

// ── Founder Dashboard API ─────────────────────────────────────────────────────
async function apiAdminAuth(pw) {
  const r = await apiFetch('/api/admin/auth', { method: 'POST', body: { password: pw } });
  return !isErr(r) && r.ok;
}

async function apiAdminOverview(pw) {
  const r = await apiFetch('/api/admin/overview', { founderPw: pw });
  if (isErr(r)) return null;
  return r;
}

async function apiAdminUsers(pw) {
  const r = await apiFetch('/api/admin/users', { founderPw: pw });
  if (isErr(r)) return [];
  return r;
}

async function apiAdminTxns(pw) {
  const r = await apiFetch('/api/admin/transactions', { founderPw: pw });
  if (isErr(r)) return [];
  return r;
}

async function apiAdminRedemptions(pw) {
  const r = await apiFetch('/api/admin/redemptions', { founderPw: pw });
  if (isErr(r)) return [];
  return r;
}

async function apiAdminGetRewards(pw) {
  const r = await apiFetch('/api/rewards', { founderPw: pw });
  if (isErr(r)) return [];
  return r;
}

async function apiAdminBulkAddCodes(brand, label, cost_coins, codes, pw) {
  const r = await apiFetch('/api/rewards', {
    method: 'POST', founderPw: pw,
    body: { brand, label, cost_coins, codes },
  });
  if (isErr(r)) return null;
  return r;
}

async function apiAdminManageReward(action, brand, label, data, pw) {
  const r = await apiFetch('/api/rewards/manage', {
    method: 'PATCH', founderPw: pw,
    body: { action, brand, label, ...data },
  });
  return !isErr(r);
}

// ── Screenshot upload via Cloudinary ─────────────────────────────────────────
async function apiUploadScreenshot(file) {
  // Get signed upload params from backend
  const sigRes = await apiFetch('/api/upload', { method: 'POST' });
  if (isErr(sigRes)) {
    console.warn('[UPLOAD] Could not get upload signature — skipping screenshot');
    return null;
  }
  try {
    const fd = new FormData();
    fd.append('file',      file);
    fd.append('api_key',   sigRes.api_key);
    fd.append('timestamp', sigRes.timestamp);
    fd.append('signature', sigRes.signature);
    fd.append('folder',    sigRes.folder);
    const uploadRes = await fetch(sigRes.url, { method: 'POST', body: fd });
    const uploadData = await uploadRes.json();
    return uploadData.secure_url || null;
  } catch (e) {
    console.warn('[UPLOAD] Cloudinary upload failed:', e.message);
    return null;
  }
}



// ══════════════════════════════════════════════════════════════════════════════
// EXPERIENCE SELECTION
// ══════════════════════════════════════════════════════════════════════════════
function ExperienceSelect({onBeta,onPrototype}){
  return(
    <div style={{position:"relative",width:"100%",height:"100%",background:T.black,
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      overflow:"hidden",padding:"0 24px"}}>
      <ParticleField count={22} colors={[T.blue,"rgba(74,158,255,0.35)","rgba(232,196,106,0.18)"]}/>
      <Glow x={50} y={40} color="rgba(74,158,255,0.12)" size={600}/>
      <motion.div initial={{opacity:0,y:-20,scale:0.85}} animate={{opacity:1,y:0,scale:1}}
        transition={{duration:0.6,...SP.bouncy}}
        style={{marginBottom:10,display:"flex",alignItems:"center",gap:12,position:"relative",zIndex:10}}>
        <LogoBadge size={40}/>
        <span style={{fontSize:22,fontWeight:800,letterSpacing:"-0.03em",color:T.text}}>
          PAY<span style={{color:T.blue}}>MINT</span>
        </span>
      </motion.div>
      <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.22}}
        style={{textAlign:"center",marginBottom:32,position:"relative",zIndex:10}}>
        <h2 style={{fontSize:25,fontWeight:800,color:T.text,margin:"0 0 7px",letterSpacing:"-0.03em"}}>
          Welcome to Paymint
        </h2>
        <p style={{fontSize:14,color:T.textSub,margin:0}}>Choose your experience</p>
      </motion.div>
      <div style={{width:"100%",display:"flex",flexDirection:"column",gap:12,position:"relative",zIndex:10}}>
        {/* Beta card */}
        <motion.div initial={{opacity:0,x:-28}} animate={{opacity:1,x:0}} transition={{delay:0.32,...SP.gentle}}>
          <div style={{borderRadius:22,padding:"20px 20px 18px",
            background:"linear-gradient(145deg,rgba(74,158,255,0.12),rgba(74,158,255,0.04))",
            border:"1px solid rgba(74,158,255,0.3)",
            boxShadow:"0 0 0 1px rgba(74,158,255,0.08),0 14px 40px rgba(74,158,255,0.12)",
            position:"relative",overflow:"hidden"}}>
            <motion.div animate={{x:["-100%","220%"]}} transition={{duration:3,repeat:Infinity,ease:"easeInOut",repeatDelay:2}}
              style={{position:"absolute",top:0,bottom:0,width:"40%",
                background:"linear-gradient(90deg,transparent,rgba(74,158,255,0.09),transparent)",pointerEvents:"none"}}/>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:11}}>
              <div style={{width:34,height:34,borderRadius:10,
                background:`linear-gradient(145deg,${T.blue},${T.blueDeep})`,
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                boxShadow:"0 0 18px rgba(74,158,255,0.4)"}}>
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2l2.5 5 5.5.8-4 3.9.95 5.5L10 14.5l-4.95 2.7.95-5.5L2 6.8l5.5-.8z"
                    stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p style={{margin:0,fontSize:10.5,color:T.blue,fontWeight:700,letterSpacing:"0.07em"}}>EARLY ACCESS</p>
                <h3 style={{margin:0,fontSize:17,fontWeight:800,color:T.text,letterSpacing:"-0.02em"}}>Beta Test</h3>
              </div>
            </div>
            <p style={{margin:"0 0 15px",fontSize:13,color:T.textSub,lineHeight:1.65}}>
              Help us build the future of rewards. Upload real UPI screenshots and earn coins from your everyday spending.
            </p>
            <motion.button whileTap={{scale:0.97}} onClick={onBeta}
              style={{width:"100%",padding:"12px",borderRadius:100,border:"none",cursor:"pointer",
                background:`linear-gradient(135deg,${T.blue},${T.blueDeep})`,color:"white",
                fontSize:14,fontWeight:700,fontFamily:"inherit",
                boxShadow:"0 0 22px rgba(74,158,255,0.35)"}}>
              Join Beta
            </motion.button>
          </div>
        </motion.div>
        {/* Prototype card */}
        <motion.div initial={{opacity:0,x:28}} animate={{opacity:1,x:0}} transition={{delay:0.42,...SP.gentle}}>
          <div style={{borderRadius:22,padding:"20px 20px 18px",background:T.glass,
            border:`1px solid ${T.glassBorder}`,backdropFilter:"blur(20px)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:11}}>
              <div style={{width:34,height:34,borderRadius:10,
                background:"rgba(232,196,106,0.1)",border:"1px solid rgba(232,196,106,0.25)",
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="3" width="14" height="14" rx="3" stroke={T.gold} strokeWidth="1.4"/>
                  <path d="M7 10h6M10 7v6" stroke={T.gold} strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p style={{margin:0,fontSize:10.5,color:T.gold,fontWeight:700,letterSpacing:"0.07em"}}>FULL VISION</p>
                <h3 style={{margin:0,fontSize:17,fontWeight:800,color:T.text,letterSpacing:"-0.02em"}}>Explore Prototype</h3>
              </div>
            </div>
            <p style={{margin:"0 0 15px",fontSize:13,color:T.textSub,lineHeight:1.65}}>
              Experience the complete Paymint vision — rewards, challenges, tiers and future features.
            </p>
            <motion.button whileTap={{scale:0.97}} onClick={onPrototype}
              style={{width:"100%",padding:"12px",borderRadius:100,cursor:"pointer",
                background:"rgba(232,196,106,0.08)",border:"1px solid rgba(232,196,106,0.28)",
                color:T.gold,fontSize:14,fontWeight:700,fontFamily:"inherit"}}>
              Explore Prototype
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BETA PROFILE SETUP
// ══════════════════════════════════════════════════════════════════════════════
function BetaProfileSetup({onDone}){
  const [form,setForm]=useState({name:"",age:"",occupation:"",email:""});
  const [errors,setErrors]=useState({});
  const [saving,setSaving]=useState(false);
  const [sbErr,setSbErr]=useState("");
  const validate=(f,v)=>{
    if(f==="name")       return v.trim().length<2?"Enter your name":null;
    if(f==="age")        return (isNaN(v)||Number(v)<10||Number(v)>100)?"Enter a valid age":null;
    if(f==="occupation") return v.trim().length<2?"Enter your occupation":null;
    if(f==="email")      return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?"Enter a valid email":null;
    return null;
  };
  const chg=f=>e=>{setForm(x=>({...x,[f]:e.target.value}));setErrors(x=>({...x,[f]:null}));setSbErr("");};
  const submit=async()=>{
    const errs={};let bad=false;
    Object.keys(form).forEach(k=>{const e=validate(k,form[k]);if(e){errs[k]=e;bad=true;}});
    setErrors(errs);if(bad)return;
    setSaving(true);setSbErr("");

    console.log("[BETA] Registering:", form.email);
    const user = await apiRegister(form);
    console.log("[BETA] Register result:", user);
    if(!user || user.error){
      setSbErr("Registration failed: "+(user?.message||"Could not connect")+"\n\nCheck your internet connection.");
      setSaving(false); return;
    }
    await lc.set("beta-profile", user);
    setSaving(false);
    onDone(user);
  };;
  return(
    <div style={{position:"relative",width:"100%",height:"100%",background:T.black,
      display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <ParticleField count={10}/>
      <Glow x={70} y={8} color="rgba(74,158,255,0.07)" size={360}/>
      <motion.div initial={{opacity:0,y:-16}} animate={{opacity:1,y:0}} transition={{duration:0.45}}
        style={{padding:"52px 24px 0",flexShrink:0}}>
        <LogoBadge size={30}/>
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.2}} style={{marginTop:20}}>
          <p style={{margin:"0 0 5px",fontSize:12,color:T.blue,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>Welcome</p>
          <h2 style={{margin:"0 0 6px",fontSize:26,fontWeight:800,color:T.text,letterSpacing:"-0.03em",lineHeight:1.2}}>
            Join the Paymint<br/>Beta Program
          </h2>
          <p style={{margin:0,fontSize:13,color:T.textSub,lineHeight:1.6}}>Tell us about yourself — we ask only once, ever.</p>
        </motion.div>
      </motion.div>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.28,...SP.gentle}}
        style={{flex:1,overflowY:"auto",padding:"22px 24px 0"}}>
        <FloatingInput label="Full Name"     value={form.name}       onChange={chg("name")}       error={errors.name}/>
        <FloatingInput label="Age"           type="number" value={form.age}  onChange={chg("age")}  error={errors.age}/>
        <FloatingInput label="Occupation"    value={form.occupation}  onChange={chg("occupation")}  error={errors.occupation}/>
        <FloatingInput label="Email Address" type="email"  value={form.email} onChange={chg("email")} error={errors.email}/>
        {sbErr&&(
          <motion.div initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}}
            style={{padding:"12px 14px",borderRadius:12,background:"rgba(255,96,88,0.08)",
              border:"1px solid rgba(255,96,88,0.25)",marginBottom:8}}>
            <p style={{margin:0,fontSize:12.5,color:T.error,lineHeight:1.55}}>{sbErr}</p>
          </motion.div>
        )}
      </motion.div>
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.45}}
        style={{padding:"14px 24px 44px",flexShrink:0}}>
        <Btn onClick={submit} disabled={saving} full large>
          {saving?"Saving profile…":"Join Beta"}
        </Btn>
      </motion.div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HOW IT WORKS CARDS
// ══════════════════════════════════════════════════════════════════════════════
const HOW_CARDS=[
  {id:"spend",title:"Spend Normally",
    body:"Continue using GPay, PhonePe, Paytm or any UPI app exactly as you normally do.",
    icon:(col)=>(<svg width="30" height="30" viewBox="0 0 30 30" fill="none"><rect x="3" y="8" width="24" height="15" rx="4" stroke={col} strokeWidth="1.7"/><path d="M3 13h24" stroke={col} strokeWidth="1.7"/><rect x="7" y="17" width="6" height="3" rx="1" fill={col} fillOpacity="0.5"/></svg>)},
  {id:"upload",title:"Upload Screenshot",
    body:"Upload your UPI transaction screenshot to Paymint within 30 minutes of completing the payment.",
    icon:(col)=>(<svg width="30" height="30" viewBox="0 0 30 30" fill="none"><path d="M15 22V11M11 15l4-4 4 4" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 25h16" stroke={col} strokeWidth="1.8" strokeLinecap="round"/></svg>)},
  {id:"earn",title:"Earn Coins",
    body:"We verify your screenshot with AI and award exactly 10% of your spend as coins.\n\n₹100 = 10 Coins  ·  ₹523 = 52.3 Coins\n\nNo rounding. Ever.",
    icon:(col)=>(<svg width="30" height="30" viewBox="0 0 30 30" fill="none"><circle cx="15" cy="15" r="11" stroke={col} strokeWidth="1.7"/><text x="15" y="20" textAnchor="middle" fill={col} fontSize="12" fontWeight="800" fontFamily="Inter,sans-serif">P</text></svg>)},
  {id:"redeem",title:"Redeem Rewards",
    body:"Use your coins to unlock vouchers, coupons and rewards from brands like Amazon, Swiggy and Netflix.",
    icon:(col)=>(<svg width="30" height="30" viewBox="0 0 30 30" fill="none"><rect x="5" y="13" width="20" height="13" rx="3" stroke={col} strokeWidth="1.7"/><path d="M5 17h20M15 13v13" stroke={col} strokeWidth="1.7"/><path d="M15 13c0 0-4-6 0-6s0 6 0 6M15 13c0 0 4-6 0-6" stroke={col} strokeWidth="1.5" strokeLinecap="round"/></svg>)},
];
function BetaHowCards({onStart}){
  const [idx,setIdx]=useState(0);
  const card=HOW_CARDS[idx];const isLast=idx===HOW_CARDS.length-1;
  return(
    <div style={{position:"relative",width:"100%",height:"100%",background:T.black,
      display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <ParticleField count={10}/>
      <Glow x={50} y={28} color="rgba(74,158,255,0.09)" size={460}/>
      <div style={{padding:"48px 24px 0",flexShrink:0,position:"relative",zIndex:5}}>
        <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:20}}>
          <LogoBadge size={26}/>
          <span style={{fontSize:12,fontWeight:700,color:T.textSub,letterSpacing:"0.07em"}}>PAYMINT BETA</span>
          <span style={{marginLeft:"auto",fontSize:11,color:T.textMute}}>{idx+1} of {HOW_CARDS.length}</span>
        </div>
        <div style={{height:2,background:"rgba(255,255,255,0.05)",borderRadius:2,overflow:"hidden"}}>
          <motion.div animate={{width:`${((idx+1)/HOW_CARDS.length)*100}%`}} transition={{duration:0.4,ease:"easeOut"}}
            style={{height:"100%",background:`linear-gradient(90deg,${T.blue},#90CAFF)`,borderRadius:2}}/>
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={card.id}
          initial={{opacity:0,x:40,scale:0.97}} animate={{opacity:1,x:0,scale:1}} exit={{opacity:0,x:-40,scale:0.97}}
          transition={{duration:0.32,ease:[0.4,0,0.2,1]}}
          style={{flex:1,display:"flex",flexDirection:"column",padding:"24px 24px 0",position:"relative",zIndex:5}}>
          <motion.div initial={{opacity:0,scale:0.85}} animate={{opacity:1,scale:1}} transition={{delay:0.1,...SP.bouncy}}
            style={{width:68,height:68,borderRadius:20,marginBottom:20,
              background:"linear-gradient(145deg,rgba(74,158,255,0.1),rgba(74,158,255,0.04))",
              border:"1px solid rgba(74,158,255,0.18)",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
            {card.icon(T.blue)}
          </motion.div>
          <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{delay:0.14}}>
            <p style={{margin:"0 0 7px",fontSize:11.5,color:T.blue,fontWeight:700,letterSpacing:"0.09em",textTransform:"uppercase"}}>Step {idx+1}</p>
            <h2 style={{margin:"0 0 14px",fontSize:25,fontWeight:800,color:T.text,letterSpacing:"-0.03em",lineHeight:1.2}}>{card.title}</h2>
            <p style={{margin:0,fontSize:14,color:T.textSub,lineHeight:1.72,whiteSpace:"pre-line"}}>{card.body}</p>
          </motion.div>
        </motion.div>
      </AnimatePresence>
      <div style={{padding:"14px 24px 44px",flexShrink:0,position:"relative",zIndex:5}}>
        <Btn onClick={isLast?onStart:()=>setIdx(i=>i+1)} full large>{isLast?"Start Beta":"Next"}</Btn>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BETA UPLOAD + OCR
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// UPI OCR — Canvas preprocessing + Tesseract.js + regex + review/edit flow
// 100% free, runs in browser, no API key needed
// ══════════════════════════════════════════════════════════════════════════════

// ── Canvas preprocessing ──────────────────────────────────────────────────────
async function preprocessImage(file, log) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale  = img.width < 800 ? 2 : img.width < 1200 ? 1.5 : 1;
      const W      = Math.round(img.width  * scale);
      const H      = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, W, H);
      URL.revokeObjectURL(url);
      const imageData = ctx.getImageData(0, 0, W, H);
      const d = imageData.data;
      // Detect dark mode
      let totalBright = 0, samples = 0;
      for (let i = 0; i < d.length; i += 4 * 20) { totalBright += d[i]*0.299+d[i+1]*0.587+d[i+2]*0.114; samples++; }
      const avgBright = totalBright / samples;
      const isDark = avgBright < 128;
      log('Canvas: brightness='+avgBright.toFixed(0)+' isDark='+isDark);
      // Convert to high-contrast greyscale
      for (let i = 0; i < d.length; i += 4) {
        let g = d[i]*0.299 + d[i+1]*0.587 + d[i+2]*0.114;
        if (isDark) g = 255 - g;
        g = g < 140 ? Math.max(0, g-30) : Math.min(255, g+30);
        d[i] = d[i+1] = d[i+2] = g < 160 ? 0 : 255;
        d[i+3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob(blob => {
        log('Canvas: '+W+'x'+H+' ('+(isDark?'dark→inverted':'light')+')');
        resolve(blob);
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); log('Canvas: fallback to original'); resolve(file); };
    img.src = url;
  });
}

// ── UPI data extraction ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
// OCR.space ENGINE 3 — PRODUCTION AMOUNT EXTRACTOR
// Uses word-level positions from OCR.space overlay data.
// Parses FIRST, rejects noise AFTER based on value — never strips formatting.
// ══════════════════════════════════════════════════════════════════════════════

// ── Amount parser: handles all Indian currency OCR variants ──────────────────
function ocrParseAmt(raw) {
  let s = raw.trim();
  // Strip currency prefix
  s = s.replace(/^(?:[₹%]|Rs\.?\s*|INR\s*)/i, '').trim();
  // Has decimal point — straightforward
  if (s.includes('.')) {
    const v = parseFloat(s.replace(/[,\s]/g, ''));
    return (!isNaN(v) && v > 0) ? v : null;
  }
  // No decimal — handle OCR space-splitting
  const parts = s.replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) {
    const v = parseFloat(parts[0]);
    return (!isNaN(v) && v > 0) ? v : null;
  }
  if (parts.length === 2) {
    const [L, R] = parts;
    // "5 00", "35 00", "500 00" → decimal (R = exactly 2 digits = paise)
    if (R.length === 2 && /^\d+$/.test(R) && /^\d+$/.test(L)) {
      const v = parseFloat(`${L}.${R}`);
      return (!isNaN(v) && v > 0) ? v : null;
    }
    // "1 000", "5 000" → thousands (R = exactly 3 digits)
    if (R.length === 3 && /^\d+$/.test(R) && /^\d+$/.test(L)) {
      const v = parseFloat(L + R);
      return (!isNaN(v) && v > 0) ? v : null;
    }
    const v = parseFloat(L + R);
    return (!isNaN(v) && v > 0) ? v : null;
  }
  if (parts.length === 3) {
    const [L, M, R] = parts;
    // "1 000 00" or "5 000 00" → thousands + paise
    if (M.length === 3 && /^\d+$/.test(M) && R.length === 2 && /^\d+$/.test(R) && /^\d+$/.test(L)) {
      const v = parseFloat(`${L}${M}.${R}`);
      return (!isNaN(v) && v > 0) ? v : null;
    }
  }
  return null;
}

// ── Noise rejection: based on VALUE + original word structure ─────────────────
function ocrIsNoise(val, rawWord, isMultiword) {
  if (val === null || val <= 0 || val >= 500000) return true;
  // Multi-word = OCR-split currency formatting — trust the parsed value
  if (isMultiword) return false;
  // Single word: check raw integer-part digit count
  const intPart  = rawWord.trim().split('.')[0];
  const digits   = intPart.replace(/[\s,]/g, '');
  if (digits.length >= 10) return true;                                    // UTR/ref
  if (digits.length === 10 && '6789'.includes(digits[0]) && !intPart.includes(',')) return true; // phone
  if (digits.length === 8  && digits.startsWith('20'))  return true;      // YYYYMMDD
  if (digits.length === 6  && !intPart.includes(',') && !rawWord.trim().includes('.')) return true; // pincode
  return false;
}

const OCR_CURR_SYM  = /^[₹%]$|^Rs\.?$|^INR$/i;
const OCR_CURR_ANY  = /[₹%]|Rs\.?|INR\b/i;
const OCR_AMT_KW    = /\b(?:paid|payment|successful|amount|total|sent|transferred|debited|money|charged)\b/i;
const OCR_NOISE_KW  = /\b(?:utr|ref(?:erence)?|txn|upi\s*ref|ac(?:count)?\s*no|ifsc|mobile|phone|order|receipt)\b/i;
const OCR_NUM_WORD  = /^[₹%]$|^Rs\.?$|^INR$|^\d[\d,]*(?:\.\d{1,2})?$/i;

// ── Yield consecutive numeric-word windows from a line ───────────────────────
function* lineWindows(words) {
  const n = words.length;
  for (let start = 0; start < n; start++) {
    let joined = '', numTokens = 0;
    for (let end = start; end < Math.min(start + 5, n); end++) {
      const wt = (words[end].text || '').trim();
      if (!OCR_NUM_WORD.test(wt) && !OCR_CURR_SYM.test(wt)) break;
      joined = joined ? `${joined} ${wt}` : wt;
      if (!OCR_CURR_SYM.test(joined.trim())) {
        numTokens = joined.split(/\s+/).filter(p => !OCR_CURR_SYM.test(p)).length;
        yield { raw: joined.trim(), start, end, numTokens };
      }
    }
  }
}

// ── Main extractor ────────────────────────────────────────────────────────────
function extractAmountOcrSpace(ocrLines, rawText, log) {
  const cands = [];  // {val, score, raw}

  // Compute image extent for normalisation
  let maxR = 1, maxB = 1;
  for (const ln of ocrLines) {
    for (const w of (ln.words || [])) {
      maxR = Math.max(maxR, (w.left || 0) + (w.width  || 0));
      maxB = Math.max(maxB, (w.top  || 0) + (w.height || 0));
    }
  }
  const nX = v => v / maxR;
  const nY = v => v / maxB;
  const total = ocrLines.length || 1;

  for (let li = 0; li < ocrLines.length; li++) {
    const line    = ocrLines[li];
    const lineTxt = (line.text || '').trim();
    const words   = line.words || [];
    const above   = li > 0          ? (ocrLines[li-1].text || '').trim() : '';
    const below   = li < total - 1  ? (ocrLines[li+1].text || '').trim() : '';

    // Skip pure noise lines
    if (OCR_NOISE_KW.test(lineTxt) && !OCR_AMT_KW.test(lineTxt)) continue;

    const lineY   = words.length ? nY(words[0].top + (words[0].height || 0) / 2) : li / total;
    const hasCurr = OCR_CURR_ANY.test(lineTxt);

    // Currency symbol centre-x for proximity scoring
    let symCx = null;
    for (const w of words) {
      if (OCR_CURR_ANY.test(w.text || '')) {
        symCx = nX((w.left || 0) + (w.width || 0) / 2); break;
      }
    }

    for (const { raw, start, end, numTokens } of lineWindows(words)) {
      const isMulti = numTokens > 1;
      const val     = ocrParseAmt(raw);
      if (val === null) continue;
      if (ocrIsNoise(val, raw, isMulti)) { log('  Noise: "'+raw+'" val='+val); continue; }

      let sc = 0;

      // Currency proximity (strongest signal)
      if (hasCurr && symCx !== null) {
        const wl   = words[start];
        const dist = Math.abs(nX((wl.left||0) + (wl.width||0)/2) - symCx);
        if (dist < 0.20)      sc += 60 + Math.round((0.20 - dist) * 100);
        else if (dist < 0.40) sc += 40;
        else                  sc += 20;
      } else if (hasCurr) {
        sc += 35;
      }

      // Payment keyword context
      if (OCR_AMT_KW.test(lineTxt) || OCR_AMT_KW.test(above) || OCR_AMT_KW.test(below)) sc += 20;
      if (OCR_NOISE_KW.test(lineTxt)) sc -= 40;

      // Screen position
      if (lineY < 0.50)      sc += 15;
      else if (lineY < 0.70) sc += 8;
      else if (lineY > 0.85) sc -= 10;

      // Font prominence
      const maxH = Math.max(...words.slice(start, end+1).map(w => w.height || 0), 0);
      const normH = nY(maxH);
      if (normH > 0.05)      sc += 20;
      else if (normH > 0.04) sc += 15;
      else if (normH > 0.025)sc += 8;
      else if (normH < 0.015)sc -= 5;

      // Formatting signals
      if (raw.includes('.'))             sc += 10;
      if (val < 10 && raw.includes('.')) sc += 12;
      if (raw.includes(','))             sc += 10;
      if (val >= 1 && val <= 50000)      sc += 6;

      // Longer window = more specific read
      sc += numTokens * 5;

      if (sc > 0) {
        log('  [P1] ₹'+val+' sc='+sc+' tokens='+numTokens+' raw="'+raw+'"');
        cands.push({ val, score: Math.max(sc, 0), raw });
      }
    }
  }

  // Pass 2: regex fallback on raw text
  if (!cands.length) {
    log('  Pass 2: regex fallback');
    for (const p of [
      /(?:[₹%]|Rs\.?|INR)\s*([\d,\s]+(?:\.\d{1,2})?)/gi,
      /(?:amount|paid|total|sent|debited)[^\d]{0,15}([\d,\s]+(?:\.\d{1,2})?)/gi,
    ]) {
      let m;
      while ((m = p.exec(rawText)) !== null) {
        const rawM = m[1].trim();
        const val  = ocrParseAmt(rawM);
        if (val && !ocrIsNoise(val, rawM, false)) {
          log('  [P2] ₹'+val);
          cands.push({ val, score: 30, raw: rawM });
        }
      }
    }
  }

  if (!cands.length) {
    log('  No candidates → Review');
    return { amount: null, score: 0, needsReview: true };
  }

  // Deduplicate: best score per value
  const best = {};
  for (const { val, score, raw } of cands) {
    if (!(val in best) || score > best[val].score) best[val] = { score, raw };
  }
  const ranked = Object.entries(best)
    .map(([v, { score, raw }]) => ({ val: Number(v), score, raw }))
    .sort((a, b) => b.score - a.score);

  log('  Ranked: ' + ranked.slice(0, 5).map(r => `₹${r.val}(${r.score})`).join(', '));

  const top = ranked[0];
  let needsReview = false;

  if (top.score < 25) {
    log('  Low conf (' + top.score + ') → Review');
    needsReview = true;
  } else if (ranked.length >= 2) {
    const sec = ranked[1];
    if (sec.val !== top.val && (top.score - sec.score) < 15) {
      // Superset check: runner-up is just a partial read of the winner's window
      const topNum = top.raw.replace(/\D/g, '');
      const secNum = sec.raw.replace(/\D/g, '');
      const isPrefix = topNum.startsWith(secNum) && topNum.length > secNum.length;
      if (isPrefix) {
        log('  Runner-up ₹'+sec.val+' is prefix of ₹'+top.val+' → not ambiguous');
      } else {
        log('  Ambiguous ₹'+top.val+'('+top.score+') vs ₹'+sec.val+'('+sec.score+') → Review');
        needsReview = true;
      }
    }
  }

  return { amount: needsReview ? null : top.val, score: top.score, needsReview };
}


function parse_ocr_number(raw) {
  // Handles Tesseract OCR noise: "5 00"→5.00, "35 00"→35.00, "5 000"→5000
  const s = raw.trim();
  if (s.includes('.')) {
    const v = parseFloat(s.replace(/[,\s]/g, ''));
    return isNaN(v) ? [null, false] : [v, false];
  }
  const parts = s.replace(/,/g, ' ').trim().split(/\s+/);
  if (parts.length === 1) {
    const v = parseFloat(parts[0]);
    return isNaN(v) ? [null, false] : [v, false];
  }
  if (parts.length === 2) {
    const [L, R] = parts;
    if (R.length === 2 && /^\d+$/.test(R)) {
      const v = parseFloat(`${L}.${R}`);
      return isNaN(v) ? [null, false] : [v, L.length === 1]; // ambiguous if single-digit prefix
    }
    if (R.length === 3 && /^\d+$/.test(R)) {
      const v = parseFloat(L + R);
      return isNaN(v) ? [null, false] : [v, false];
    }
    const v = parseFloat(L + R);
    return isNaN(v) ? [null, false] : [v, true];
  }
  if (parts.length === 3) {
    const [L, M, R] = parts;
    if (M.length === 3 && /^\d+$/.test(M) && R.length === 2 && /^\d+$/.test(R)) {
      const v = parseFloat(`${L}${M}.${R}`);
      return isNaN(v) ? [null, false] : [v, false];
    }
  }
  return [null, false];
}

function is_rejected(val, rawSpaced, lineCtx) {
  const digits = rawSpaced.replace(/[\s,.]/g, '');
  if (digits.length >= 10) return true;                              // UTR/ref
  if (digits.length === 10 && '6789'.includes(digits[0])) return true; // mobile
  if (digits.length === 8 && digits.startsWith('20')) return true;  // YYYYMMDD
  if (/^\d{6}$/.test(rawSpaced.trim())) return true;                // bare 6-digit pincode
  // Time: only reject if AM/PM on same line AND val < 2400
  if (/\b(?:am|pm)\b/i.test(lineCtx) && !rawSpaced.includes('.') && val < 2400 && digits.length <= 4) return true;
  return false;
}

const NOISE_RE   = /\b(?:utr|upi\s*ref|ref(?:erence)?(?:\s*no)?|txn(?:\s*id)?|transaction\s*(?:id|no|ref)|order|receipt|ac(?:count)?\.?\s*no|a\/c|acno|ifsc|mmid|mobile|phone|contact)\b/i;
const AMOUNT_RE  = /(?:[₹%]|rs\.?|inr\b|\bpaid\b|\bamount\b|\btotal\b|\bsent\b|\bdebited\b|\btransferred\b|\bcharged\b|\bcost\b|\bpayment\b)/i;
const CURRENCY_RE= /[₹%]|Rs\.?|INR\b/i;
const NUM_TOKEN  = /\d[\d\s,]*(?:\.\d{1,2})?/g;

function score_candidate(val, raw, line, li, total, hasSym, ctxB, ctxA, ambiguous) {
  if (is_rejected(val, raw, line)) return -1;
  if (val <= 0 || val > 500000)    return -1;
  let sc = 0;
  if (hasSym)                                            sc += 45;
  if ([line,ctxB,ctxA].some(x => AMOUNT_RE.test(x)))    sc += 20;
  if (NOISE_RE.test(line))                               sc -= 35;
  const pos = li / Math.max(total, 1);
  if (pos < 0.4)       sc += 12;
  else if (pos < 0.7)  sc += 6;
  else if (pos > 0.85) sc -= 8;
  const hasDec = raw.includes('.') || val !== Math.floor(val);
  if (hasDec)               sc += 12;
  if (val < 10 && hasDec)   sc += 10;
  if (val >= 1 && val <= 50000)  sc += 8;
  else if (val > 50000)          sc -= 5;
  if (val >= 1000 && /\d[\s,]\d{3}/.test(raw)) sc += 6;
  if (ambiguous)        sc -= 15;
  return Math.max(sc, 0);
}

function extractUPIData(text, log) {
  // Normalise: NFC compose, common rupee-symbol substitutes
  const t = text.normalize('NFC')
    .replace(/\r\n/g, '\n')
    .replace(/Rs\s*\./gi, 'Rs.');

  const lines  = t.split('\n');
  const total  = lines.length;
  const cands  = [];  // {val, raw, score}

  const addCand = (val, raw, score) => {
    if (val === null || score < 0) return;
    cands.push({val, raw, score});
  };

  for (let i = 0; i < lines.length; i++) {
    const s   = lines[i].trim();
    const ctxB = i > 0         ? lines[i-1].trim() : '';
    const ctxA = i < total-1   ? lines[i+1].trim() : '';

    // Pattern A: currency marker BEFORE number  (₹5.00, % 5 00, Rs.500)
    const patA = /(?:[₹%]|Rs\.?|INR)\s*(\d[\d\s,]*(?:\.\d{1,2})?)/gi;
    let mA;
    while ((mA = patA.exec(s)) !== null) {
      const raw = mA[1].trimEnd();
      const [val, amb] = parse_ocr_number(raw);
      if (val === null) continue;
      addCand(val, raw, score_candidate(val,raw,s,i,total,true,ctxB,ctxA,amb));
    }

    // Pattern B: number BEFORE currency marker
    const patB = /(\d[\d\s,]*(?:\.\d{1,2})?)\s*(?:[₹%]|Rs\.?|INR)/gi;
    let mB;
    while ((mB = patB.exec(s)) !== null) {
      const raw = mB[1].trimEnd();
      const [val, amb] = parse_ocr_number(raw);
      if (val === null) continue;
      addCand(val, raw, score_candidate(val,raw,s,i,total,true,ctxB,ctxA,amb));
    }

    // Pattern C: keyword label on same line (Amount: 500, Paid 1000)
    const patC = /(?:amount|paid|total|sent|debited|transferred|charged)[^\d]{0,20}(\d[\d\s,]*(?:\.\d{1,2})?)/gi;
    let mC;
    while ((mC = patC.exec(s)) !== null) {
      const raw = mC[1].trimEnd();
      const [val, amb] = parse_ocr_number(raw);
      if (val === null) continue;
      addCand(val, raw, score_candidate(val,raw,s,i,total,false,ctxB,ctxA,amb));
    }

    // Pattern D: keyword THIS line, standalone number PREVIOUS line
    if (AMOUNT_RE.test(s) && !NOISE_RE.test(s) && ctxB) {
      const mD = ctxB.match(/^(\d[\d\s,]*(?:\.\d{1,2})?)$/);
      if (mD) {
        const raw = mD[1];
        const [val, amb] = parse_ocr_number(raw);
        if (val !== null) {
          const sc = score_candidate(val,raw,ctxB,i-1,total,false,'',s,amb) + 15;
          addCand(val, raw, sc);
        }
      }
    }

    // Pattern E: standalone number on its own line
    const mE = s.match(/^(\d[\d\s,]*(?:\.\d{1,2})?)$/);
    if (mE) {
      const raw = mE[1];
      const [val, amb] = parse_ocr_number(raw);
      if (val !== null) {
        const hasSym = CURRENCY_RE.test(ctxB) || CURRENCY_RE.test(ctxA);
        addCand(val, raw, score_candidate(val,raw,s,i,total,hasSym,ctxB,ctxA,amb));
      }
    }

    // Pattern F: single-digit prefix + number → emit the numeric part
    // Handles "2 35" where "2" is misread ₹ symbol → real amount is 35
    const mF = s.match(/^(\d)\s+(\d[\d\s,]*(?:\.\d{1,2})?)$/);
    if (mF && mF[1].length === 1) {
      const raw = mF[2].trimEnd();
      const [val, amb] = parse_ocr_number(raw);
      if (val !== null) {
        const sc = score_candidate(val,raw,s,i,total,true,ctxB,ctxA,false) + 5;
        addCand(val, raw, sc);
      }
    }
  }

  // Deduplicate: best score per value
  const bestMap = {};
  for (const {val, raw, score} of cands) {
    if (!(val in bestMap) || score > bestMap[val].score) {
      bestMap[val] = {raw, score};
    }
  }
  const ranked = Object.entries(bestMap)
    .map(([v,{raw,score}]) => ({val:Number(v), raw, score}))
    .sort((a,b) => b.score - a.score);

  log('Candidates: ' + ranked.slice(0,5).map(c=>`₹${c.val}(${c.score})`).join(', '));

  if (!ranked.length) {
    log('No candidates → Review');
    return {amount:null, confidence:0, missingFields:['amount'],
            status:'success', app:'UPI', merchant:'UPI Payment',
            txnId:'', date:'', time:'', bank:''};
  }

  const top = ranked[0];
  let confidence = 100;
  const missing  = [];
  let needsReview = false;

  if (top.score < 25) {
    log(`Low confidence (${top.score}) → Review`);
    needsReview = true;
    confidence  = top.score;
  } else if (ranked.length >= 2) {
    const sec = ranked[1];
    if (sec.val !== top.val && (top.score - sec.score) < 12) {
      log(`Ambiguous ${top.val}(${top.score}) vs ${sec.val}(${sec.score}) → Review`);
      needsReview = true;
      confidence  = top.score;
    }
  }

  const amount = needsReview ? null : top.val;
  if (!amount) missing.push('amount');

  // ── Extract remaining fields using existing logic ──────────────────
  let status = 'success';
  if (/failed|declined|rejected|unsuccessful|could not|timed.?out|expired/i.test(t)) status='failed';
  else if (/pending|processing|in.?progress|initiated/i.test(t)) status='pending';

  let app = 'UPI';
  if      (/g[o0]{1,2}gle\s*pay|gpay|\btez\b/i.test(t))        app='GPay';
  else if (/ph[o0]ne\s*pe|phonepe/i.test(t))                    app='PhonePe';
  else if (/paytm/i.test(t))                                    app='Paytm';
  else if (/\bbhim\b/i.test(t))                                 app='BHIM';
  else if (/amazon\s*pay/i.test(t))                             app='Amazon Pay';
  else if (/\byono\b|state\s*bank/i.test(t))                    app='SBI';
  else if (/\bhdfc\b/i.test(t))                                 app='HDFC';
  else if (/\bicici\b/i.test(t))                                app='ICICI';
  else if (/\baxis\b/i.test(t))                                 app='Axis';
  else if (/\bkotak\b/i.test(t))                                app='Kotak';

  let merchant = '';
  for (const p of [
    /(?:paid\s+to|sent\s+to|money\s+sent\s+to|transferred\s+to)[:\s]+([A-Za-z0-9\s&._@-]{2,50})/i,
    /(?:to|payee|beneficiary|recipient)[:\s]+([A-Za-z0-9\s&._@-]{2,50})/i,
    /(?:merchant|vendor|store)[:\s]+([A-Za-z0-9\s&._@-]{2,50})/i,
  ]) {
    const m = t.match(p);
    if (m) { const raw=m[1].split(/[\n\r:|,]/)[0].trim(); if(raw.length>1){merchant=raw.slice(0,40);break;} }
  }

  let txnId = '';
  for (const p of [
    /(?:upi\s*ref(?:erence)?|utr(?:\s*no)?|txn\s*(?:id|no)|transaction\s*(?:id|no)|ref(?:erence)?\s*(?:no|id|#)?)[:\s#]*([A-Z0-9]{8,30})/i,
    /\b([0-9]{10,15})\b/,
  ]) {
    const m = t.match(p); if(m){txnId=m[1].trim();break;}
  }

  let date='';
  const mths={jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
  for (const{re,fn}of[
    {re:/(\d{4})[-/](\d{2})[-/](\d{2})/,        fn:m=>`${m[1]}-${m[2]}-${m[3]}`},
    {re:/(\d{2})[-/](\d{2})[-/](\d{4})/,        fn:m=>`${m[3]}-${m[2]}-${m[1]}`},
    {re:/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*[,.]?\s+(\d{4})/i,
      fn:m=>`${m[3]}-${mths[m[2].toLowerCase().slice(0,3)]||'01'}-${m[1].padStart(2,'0')}`},
    {re:/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*[,.]?\s+(\d{1,2})[,.]?\s+(\d{4})/i,
      fn:m=>`${m[3]}-${mths[m[1].toLowerCase().slice(0,3)]||'01'}-${m[2].padStart(2,'0')}`},
  ]){const m=t.match(re);if(m){try{date=fn(m);}catch(e){date='';}if(date)break;}}

  let time='';
  const tM=t.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?/i);
  if(tM){let hh=parseInt(tM[1]),mm=parseInt(tM[2]);const p=tM[3];
    if(p){if(/pm/i.test(p)&&hh<12)hh+=12;if(/am/i.test(p)&&hh===12)hh=0;}
    if(hh>=0&&hh<=23&&mm>=0&&mm<=59)time=`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;}

  let bank='';
  const bM=t.match(/(?:sbi|state bank|hdfc|icici|axis|kotak|pnb|bob|union bank|yes bank|idbi|federal|canara)[^\n]*/i);
  if(bM)bank=bM[0].trim().slice(0,30);

  // Confidence scoring for non-amount fields
  if(!merchant)  {confidence-=20; missing.push('merchant');}
  if(!date)      {confidence-=15; missing.push('date');}
  if(!time)      {confidence-=10; missing.push('time');}
  if(!txnId)     {confidence-=5;  missing.push('txnId');}

  log(`amount=${amount} conf=${confidence} missing=[${missing}]`);

  return {amount, status, app, merchant:merchant||'UPI Payment',
          txnId, date, time, bank, confidence, missingFields:missing};
}


function BetaUpload({profile,onDone,onClose}){
  const [phase,     setPhase]     = useState('idle');
  const [result,    setResult]    = useState(null);
  const [errMsg,    setErrMsg]    = useState('');
  const [debugLog,  setDebugLog]  = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [review,    setReview]    = useState(null);
  const [submitting,setSubmitting]= useState(false);
  const fileRef  = useRef();
  const savedFile= useRef();

  const log=(...args)=>{
    console.log('[OCR]',...args);
    setDebugLog(prev=>[...prev,args.map(a=>typeof a==='object'?JSON.stringify(a):String(a)).join(' ')]);
  };

  const finaliseTx=async(parsed,file)=>{
    setSubmitting(true);
    const amount=parseFloat(Number(parsed.amount).toFixed(2));
    const coins =parseFloat((amount*0.10).toFixed(1));
    const tx={
      id:       Date.now()+Math.random(),
      merchant: (parsed.merchant||'UPI Payment').trim(),
      amount, coins,
      txnId:    parsed.txnId ||'',
      date:     parsed.date  ||'',
      time:     parsed.time  ||'',
      app:      parsed.app   ||'UPI',
      bank:     parsed.bank  ||'',
      ts:       new Date().toISOString(),
    };
    log('Finalising tx:',JSON.stringify(tx));
    let ssUrl=null;
    try{
      const safeName   =file.name.replace(/[^a-z0-9._-]/gi,'_');
      const storagePath=`${profile.email.replace(/[^a-z0-9]/gi,'_')}/${Date.now()}_${safeName}`;
      ssUrl=await apiUploadScreenshot(file);
      log('Screenshot:',ssUrl||'upload failed (non-critical)');
    }catch(e){log('Upload error (non-critical):',e.message);}
    setResult(tx);
    setReviewing(false);
    setSubmitting(false);
    setPhase('success');
    onDone(tx,ssUrl);
  };

  const handleFile=async(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    // Reset input so same file can be re-uploaded if needed, but clear AFTER capturing file
    if(fileRef.current) fileRef.current.value='';
    setPhase('processing');setDebugLog([]);setReviewing(false);
    log('File:',file.name,file.type,file.size,'bytes');

    // STEP 1: Canvas preprocessing
    let blob=file;
    try{
      log('Step 1: Canvas preprocessing…');
      blob=await preprocessImage(file,log);
      log('Step 1 OK');
    }catch(e){log('Step 1 warn (using original):',e.message);}

    // STEP 2: Convert preprocessed blob to base64 for OCR.space API
    let ocrBase64 = '';
    let ocrMediaType = 'image/png';
    try {
      log('Step 2: Converting image to base64…');
      ocrBase64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload  = () => res(reader.result.split(',')[1]);
        reader.onerror = () => rej(new Error('FileReader failed'));
        reader.readAsDataURL(blob instanceof Blob ? blob : file);
      });
      ocrMediaType = blob instanceof Blob ? 'image/png' : (file.type || 'image/png');
      log('Step 2 OK: base64 length=' + ocrBase64.length);
    } catch(e) {
      log('Step 2 FAILED:', e.message);
      setPhase('error');
      setErrMsg('Could not prepare image for OCR. Please try again.');
      return;
    }

    // STEP 3: Call OCR.space Engine 3 via /api/ocr (API key stays server-side)
    let ocrText  = '';
    let ocrLines = [];  // [{text, words:[{text,left,top,width,height}]}]
    try {
      log('Step 3: Calling OCR.space Engine 3…');
      const ocrRes = await fetch('/api/ocr', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + (tokenStore.get() || ''),
        },
        body: JSON.stringify({ base64: ocrBase64, mediaType: ocrMediaType }),
      });
      const ocrData = await ocrRes.json();
      if (!ocrRes.ok) {
        const msg = ocrData.error || 'OCR service error';
        log('Step 3 FAILED:', msg);
        // Fallback to manual Review — never block the user
        log('Falling back to manual Review entry');
        savedFile.current = file;
        setReview({ amount:'', merchant:'', date:'', time:'', txnId:'',
                    app:'UPI', confidence:0,
                    missingFields:['amount','merchant','date','time','txnId'] });
        setReviewing(true);
        setPhase('review');
        return;
      }
      ocrText  = ocrData.text  || '';
      ocrLines = ocrData.lines || [];
      log('Step 3 OK: ' + ocrText.length + ' chars, ' + ocrLines.length + ' lines');
      log('OCR text preview:\n' + ocrText.slice(0, 400));
    } catch(e) {
      log('Step 3 network error:', e.message);
      savedFile.current = file;
      setReview({ amount:'', merchant:'', date:'', time:'', txnId:'',
                  app:'UPI', confidence:0,
                  missingFields:['amount','merchant','date','time','txnId'] });
      setReviewing(true);
      setPhase('review');
      return;
    }

    if (!ocrText.trim() && ocrLines.length === 0) {
      log('No text extracted — showing manual entry');
      savedFile.current = file;
      setReview({ amount:'', merchant:'', date:'', time:'', txnId:'',
                  app:'UPI', confidence:0,
                  missingFields:['amount','merchant','date','time','txnId'] });
      setReviewing(true);
      setPhase('review');
      return;
    }

    // STEP 4: Extract amount using line-position scoring, other fields from raw text
    log('Step 4: Extracting fields…');

    // Amount: scored extraction using OCR.space line/word positions
    const amtResult = extractAmountOcrSpace(ocrLines, ocrText, log);
    log('Amount result: val=' + amtResult.amount + ' score=' + amtResult.score
        + ' review=' + amtResult.needsReview);

    // Other fields: raw text (merchant, date, time, UTR, app, bank, status)
    const extracted = extractUPIData(ocrText, log);

    // Amount from scored extraction overrides raw-text guess
    extracted.amount     = amtResult.amount;
    extracted.confidence = amtResult.needsReview
      ? Math.min(extracted.confidence || 50, 40)
      : Math.max(amtResult.score, 50);

    // STEP 5: Hard validation
    if(extracted.status==='failed'){
      setPhase('error');
      setErrMsg('This transaction failed. Only successful payments earn coins.');
      return;
    }
    if(extracted.status==='pending'){
      setPhase('error');
      setErrMsg('Payment still pending. Upload screenshot once payment is confirmed.');
      return;
    }

    // STEP 5b: 30-minute window check (lenient — skip if date/time not found)
    if(extracted.date && extracted.time){
      try{
        const txTime=new Date(`${extracted.date}T${extracted.time}:00`);
        if(!isNaN(txTime.getTime())){
          const diffMin=(Date.now()-txTime)/(1000*60);
          log('60-min check: tx at '+extracted.date+' '+extracted.time+', diff='+diffMin.toFixed(1)+'min');
          if(diffMin>60){
            log('EXPIRED: '+diffMin.toFixed(1)+' minutes since transaction (limit: 60 min)');
            setPhase('expired');
            return;
          }
        }else{
          log('30-min check: invalid date/time format, skipping (lenient)');
        }
      }catch(e){
        log('30-min check: parse error, skipping —',e.message);
      }
    }else{
      log('30-min check: no date/time extracted, skipping (lenient mode)');
    }

    // STEP 6: Route by confidence
    savedFile.current=file;
    const needsReview=!extracted.amount||extracted.confidence<80;
    log('Step 6: confidence='+extracted.confidence+'% needsReview='+needsReview);

    if(!needsReview){
      await finaliseTx(extracted,file);
    }else{
      setReview({
        amount:   extracted.amount?String(extracted.amount):'',
        merchant: extracted.merchant!=='UPI Payment'?extracted.merchant:'',
        date:     extracted.date ||'',
        time:     extracted.time ||'',
        txnId:    extracted.txnId||'',
        app:      extracted.app  ||'UPI',
        confidence:    extracted.confidence,
        missingFields: extracted.missingFields,
      });
      setReviewing(true);
      setPhase('review');
    }
  };

  return(
    <motion.div initial={{opacity:0,y:"100%"}} animate={{opacity:1,y:0}} exit={{opacity:0,y:"100%"}}
      transition={{duration:0.4,...SP.gentle}}
      style={{position:"absolute",inset:0,zIndex:90,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}
        style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(10px)"}}/>
      <motion.div style={{position:"relative",zIndex:2,background:"#0A0A0C",
        borderRadius:"24px 24px 0 0",border:"1px solid rgba(255,255,255,0.1)",
        maxHeight:"88vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"center",paddingTop:14,paddingBottom:6}}>
          <div style={{width:36,height:4,borderRadius:2,background:"rgba(255,255,255,0.14)"}}/>
        </div>
        <div style={{padding:"10px 24px 44px"}}>
          <AnimatePresence mode="wait">

            {phase==="idle"&&(
              <motion.div key="idle" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                <h3 style={{margin:"0 0 6px",fontSize:20,fontWeight:800,color:T.text}}>Upload UPI Screenshot</h3>
                <p style={{margin:"0 0 18px",fontSize:13,color:T.textSub,lineHeight:1.6}}>
                  Upload within 30 minutes of payment to earn coins.
                </p>
                <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:20}}>
                  {["Google Pay (GPay)","PhonePe","Paytm","BHIM","Bank UPI Apps"].map(app=>(
                    <div key={app} style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:5,height:5,borderRadius:"50%",background:T.blue,flexShrink:0}}/>
                      <p style={{margin:0,fontSize:13,color:T.textSub}}>{app}</p>
                    </div>
                  ))}
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>
                <Btn onClick={()=>fileRef.current?.click()} full large>Choose Screenshot</Btn>
              </motion.div>
            )}

            {phase==="processing"&&(
              <motion.div key="proc" initial={{opacity:0,scale:0.94}} animate={{opacity:1,scale:1}} exit={{opacity:0}}
                style={{textAlign:"center",padding:"22px 0"}}>
                <motion.div animate={{rotate:360}} transition={{duration:1.4,repeat:Infinity,ease:"linear"}}
                  style={{width:54,height:54,borderRadius:"50%",border:`2.5px solid ${T.blue}`,
                    borderTopColor:"transparent",margin:"0 auto 18px"}}/>
                <h3 style={{margin:"0 0 5px",fontSize:18,fontWeight:800,color:T.text}}>Verifying Transaction</h3>
                <p style={{margin:0,fontSize:13,color:T.textSub}}>AI is reading your screenshot…</p>
                {debugLog.length>0&&(
                  <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:2}}
                    style={{marginTop:16,textAlign:"left",background:"rgba(74,158,255,0.05)",
                      borderRadius:10,padding:"10px 12px",maxHeight:120,overflowY:"auto"}}>
                    {debugLog.slice(-6).map((l,i)=>(
                      <p key={i} style={{margin:0,fontSize:10,color:T.textMute,fontFamily:"monospace",lineHeight:1.6}}>
                        {l}
                      </p>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}

            {phase==="success"&&result&&(
              <motion.div key="succ" initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}}
                exit={{opacity:0}} transition={{...SP.bouncy}} style={{padding:"10px 0"}}>
                <div style={{textAlign:"center",marginBottom:20}}>
                  <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.1,...SP.bouncy}}
                    style={{width:62,height:62,borderRadius:"50%",
                      background:`linear-gradient(145deg,${T.blue},${T.blueDeep})`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      margin:"0 auto 14px",boxShadow:"0 0 40px rgba(74,158,255,0.45)"}}>
                    <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
                      <path d="M2 10L8.5 17L24 2" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </motion.div>
                  <h3 style={{margin:"0 0 4px",fontSize:19,fontWeight:800,color:T.text}}>Transaction Verified</h3>
                  <p style={{margin:"0 0 14px",fontSize:13.5,color:T.textSub}}>{result.merchant} · ₹{fmt(result.amount)}</p>
                  <div style={{background:"rgba(232,196,106,0.1)",border:"1px solid rgba(232,196,106,0.25)",
                    borderRadius:16,padding:"14px",marginBottom:18}}>
                    <p style={{margin:0,fontSize:30,fontWeight:800,color:T.gold,letterSpacing:"-0.04em"}}>+{result.coins} Coins</p>
                    <p style={{margin:"3px 0 0",fontSize:12,color:T.textMute}}>10% of ₹{fmt(result.amount)}</p>
                  </div>
                  {/* Details */}
                  <div style={{textAlign:"left",background:T.glass,borderRadius:14,padding:"12px 14px",marginBottom:18}}>
                    {[
                      ["Merchant",result.merchant],
                      ["Amount",`₹${fmt(result.amount)}`],
                      ["App",result.app||"UPI"],
                      result.txnId?["Ref ID",result.txnId]:null,
                    ].filter(Boolean).map(([k,v])=>(
                      <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",
                        borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                        <p style={{margin:0,fontSize:12,color:T.textMute}}>{k}</p>
                        <p style={{margin:0,fontSize:12,fontWeight:600,color:T.text}}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <Btn onClick={onClose} full large>Done</Btn>
                {debugLog.length>0&&(
                  <motion.button onClick={()=>setShowDebug(d=>!d)}
                    style={{width:"100%",background:"none",border:"none",cursor:"pointer",
                      marginTop:12,fontSize:11,color:T.textMute,fontFamily:"inherit"}}>
                    {showDebug?"Hide":"Show"} OCR Debug Log
                  </motion.button>
                )}
                {showDebug&&(
                  <div style={{marginTop:8,background:"rgba(0,0,0,0.4)",borderRadius:10,
                    padding:"10px 12px",maxHeight:160,overflowY:"auto"}}>
                    {debugLog.map((l,i)=>(
                      <p key={i} style={{margin:0,fontSize:9.5,color:T.textMute,fontFamily:"monospace",lineHeight:1.6}}>{l}</p>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {phase==="expired"&&(
              <motion.div key="exp" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                style={{textAlign:"center",padding:"20px 0"}}>
                <div style={{width:54,height:54,borderRadius:"50%",background:"rgba(255,96,88,0.1)",
                  border:"1px solid rgba(255,96,88,0.25)",display:"flex",alignItems:"center",
                  justifyContent:"center",margin:"0 auto 14px"}}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <circle cx="11" cy="11" r="9" stroke={T.error} strokeWidth="1.6"/>
                    <path d="M11 6v5.5l3 2" stroke={T.error} strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3 style={{margin:"0 0 6px",fontSize:18,fontWeight:800,color:T.error}}>Upload Window Expired</h3>
                <p style={{margin:"0 0 20px",fontSize:13,color:T.textSub,lineHeight:1.6}}>
                  You must upload within 30 minutes of the transaction. This screenshot is too old.
                </p>
                <Btn onClick={()=>setPhase("idle")} full>Try Another</Btn>
              </motion.div>
            )}

            {phase==="error"&&(
              <motion.div key="err" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                style={{padding:"20px 0"}}>
                <div style={{textAlign:"center",marginBottom:20}}>
                  <div style={{width:54,height:54,borderRadius:"50%",background:"rgba(255,96,88,0.1)",
                    border:"1px solid rgba(255,96,88,0.25)",display:"flex",alignItems:"center",
                    justifyContent:"center",margin:"0 auto 14px"}}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <path d="M11 7v6M11 15v1" stroke={T.error} strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="11" cy="11" r="9" stroke={T.error} strokeWidth="1.6"/>
                    </svg>
                  </div>
                  <h3 style={{margin:"0 0 6px",fontSize:18,fontWeight:800,color:T.text}}>Verification Failed</h3>
                </div>
                <div style={{background:"rgba(255,96,88,0.06)",border:"1px solid rgba(255,96,88,0.2)",
                  borderRadius:12,padding:"12px 14px",marginBottom:20}}>
                  <p style={{margin:0,fontSize:13,color:"#FF9A9A",lineHeight:1.65}}>{errMsg}</p>
                </div>
                {debugLog.length>0&&(
                  <>
                    <motion.button onClick={()=>setShowDebug(d=>!d)}
                      style={{width:"100%",background:"none",border:"none",cursor:"pointer",
                        marginBottom:8,fontSize:11,color:T.textMute,fontFamily:"inherit"}}>
                      {showDebug?"Hide":"Show"} Debug Log
                    </motion.button>
                    {showDebug&&(
                      <div style={{background:"rgba(0,0,0,0.4)",borderRadius:10,padding:"10px 12px",
                        maxHeight:140,overflowY:"auto",marginBottom:16}}>
                        {debugLog.map((l,i)=>(
                          <p key={i} style={{margin:0,fontSize:9.5,color:T.textMute,fontFamily:"monospace",lineHeight:1.6}}>{l}</p>
                        ))}
                      </div>
                    )}
                  </>
                )}
                <div style={{display:"flex",gap:10}}>
                  <Btn onClick={()=>setPhase("idle")} full>Try Again</Btn>
                </div>
              </motion.div>
            )}

            {/* ── REVIEW / MANUAL ENTRY PHASE ───────────────────────────── */}
            {(phase==="review"||reviewing)&&review&&(
              <motion.div key="review" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
                exit={{opacity:0}} transition={{...SP.gentle}} style={{padding:"4px 0 12px"}}>
                {/* Header */}
                <div style={{marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                    <div style={{width:36,height:36,borderRadius:10,flexShrink:0,
                      background:"rgba(232,196,106,0.12)",border:"1px solid rgba(232,196,106,0.3)",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                        <path d="M10 2v8l4 2" stroke={T.gold} strokeWidth="1.8" strokeLinecap="round"/>
                        <circle cx="10" cy="10" r="8" stroke={T.gold} strokeWidth="1.5"/>
                      </svg>
                    </div>
                    <div>
                      <p style={{margin:0,fontSize:14,fontWeight:800,color:T.text}}>
                        {review.confidence===0?"Enter Transaction Details":"Verify & Confirm"}
                      </p>
                      <p style={{margin:"1px 0 0",fontSize:11,color:T.gold}}>
                        {review.confidence===0
                          ?"Could not read screenshot — please enter manually"
                          :`${review.confidence}% confident · missing: ${review.missingFields.join(', ')}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form fields */}
                {[
                  {key:"amount",   label:"Amount (₹)",        type:"number", required:true,  placeholder:"e.g. 250"},
                  {key:"merchant", label:"Paid To / Merchant", type:"text",   required:true,  placeholder:"e.g. Swiggy"},
                  {key:"txnId",    label:"Transaction / UTR ID",type:"text",  required:false, placeholder:"e.g. 508123456789"},
                  {key:"date",     label:"Date",               type:"date",   required:false, placeholder:"YYYY-MM-DD"},
                  {key:"time",     label:"Time",               type:"time",   required:false, placeholder:"HH:MM"},
                ].map(({key,label,type,required,placeholder})=>(
                  <div key={key} style={{marginBottom:11}}>
                    <p style={{margin:"0 0 5px",fontSize:11,fontWeight:600,
                      color:required&&!review[key]?T.error:T.textMute,
                      textTransform:"uppercase",letterSpacing:"0.07em"}}>
                      {label}{required?" *":""}
                    </p>
                    <input
                      type={type}
                      value={review[key]||""}
                      onChange={e=>setReview(r=>({...r,[key]:e.target.value}))}
                      placeholder={placeholder}
                      style={{width:"100%",padding:"11px 13px",borderRadius:12,
                        border:`1.5px solid ${required&&!review[key]?"rgba(255,96,88,0.4)":T.glassBorder}`,
                        background:T.glass,color:T.text,fontSize:14,fontFamily:"inherit",
                        outline:"none",caretColor:T.blue,boxSizing:"border-box",
                        WebkitAppearance:"none"}}
                    />
                  </div>
                ))}

                {/* App selector */}
                <div style={{marginBottom:16}}>
                  <p style={{margin:"0 0 7px",fontSize:11,fontWeight:600,color:T.textMute,
                    textTransform:"uppercase",letterSpacing:"0.07em"}}>Payment App</p>
                  <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                    {["GPay","PhonePe","Paytm","BHIM","UPI","Other"].map(a=>(
                      <motion.button key={a} whileTap={{scale:0.94}}
                        onClick={()=>setReview(r=>({...r,app:a}))}
                        style={{padding:"7px 13px",borderRadius:20,
                          background:review.app===a?"rgba(74,158,255,0.15)":T.glass,
                          border:`1px solid ${review.app===a?T.blue:T.glassBorder}`,
                          color:review.app===a?T.blue:T.textSub,
                          fontSize:12,fontWeight:600,fontFamily:"inherit",cursor:"pointer"}}>
                        {a}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Coins preview */}
                {review.amount&&!isNaN(Number(review.amount))&&Number(review.amount)>0&&(
                  <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}
                    style={{padding:"11px 14px",borderRadius:12,marginBottom:14,
                      background:"rgba(232,196,106,0.07)",border:"1px solid rgba(232,196,106,0.2)"}}>
                    <p style={{margin:0,fontSize:13,fontWeight:700,color:T.gold}}>
                      You will earn: {parseFloat((Number(review.amount)*0.10).toFixed(1))} coins
                    </p>
                    <p style={{margin:"2px 0 0",fontSize:11,color:"rgba(232,196,106,0.6)"}}>
                      10% of ₹{review.amount}
                    </p>
                  </motion.div>
                )}

                {/* Submit / Cancel */}
                <div style={{display:"flex",gap:10}}>
                  <motion.button whileTap={{scale:0.96}}
                    onClick={()=>{setPhase("idle");setReviewing(false);setReview(null);}}
                    style={{flex:1,padding:"13px",borderRadius:100,
                      background:T.glass,border:`1px solid ${T.glassBorder}`,
                      color:T.textSub,fontSize:14,fontWeight:600,
                      fontFamily:"inherit",cursor:"pointer"}}>
                    Cancel
                  </motion.button>
                  <motion.button
                    disabled={!review.amount||isNaN(Number(review.amount))||Number(review.amount)<=0||!review.merchant||submitting}
                    onClick={async()=>{
                      if(!review.amount||isNaN(Number(review.amount))||Number(review.amount)<=0){return;}
                      if(!review.merchant){return;}
                      await finaliseTx({
                        amount:   Number(review.amount),
                        merchant: review.merchant,
                        date:     review.date ||'',
                        time:     review.time ||'',
                        txnId:    review.txnId||'',
                        app:      review.app  ||'UPI',
                        bank:     '',
                        status:   'success',
                      }, savedFile.current||{name:'screenshot.jpg'});
                    }}
                    whileTap={review.amount&&!submitting?{scale:0.97}:{}}
                    style={{flex:2,padding:"13px",borderRadius:100,border:"none",
                      cursor:review.amount&&!submitting?"pointer":"not-allowed",
                      background:review.amount&&review.merchant&&!submitting
                        ?`linear-gradient(135deg,${T.blue},${T.blueDeep})`
                        :"rgba(255,255,255,0.07)",
                      color:review.amount&&review.merchant&&!submitting?"white":"rgba(255,255,255,0.25)",
                      fontSize:14,fontWeight:700,fontFamily:"inherit"}}>
                    {submitting?"Processing…":"Confirm & Earn Coins"}
                  </motion.button>
                </div>
              </motion.div>
            )}


          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FOUNDER DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function FounderDashboard({onClose}){
  const [tab,setTab]=useState("overview");
  const [data,setData]=useState({users:[],txns:[],redemptions:[]});
  const [loading,setLoading]=useState(true);
  const [selUser,setSelUser]=useState(null);
  const [search,setSearch]=useState("");
  const [editUser,setEditUser]=useState(null);
  const [editForm,setEditForm]=useState({});
  const [actionMsg,setActionMsg]=useState("");
  const [refreshKey,setRefreshKey]=useState(0);
  // Rewards manager state
  const [rewards,setRewards]=useState([]);
  const [rewardsLoading,setRewardsLoading]=useState(false);
  const [showAddReward,setShowAddReward]=useState(false);
  const [editReward,setEditReward]=useState(null);
  const [newReward,setNewReward]=useState({brand:"",label:"",cost_coins:"",codes:""});
  const [editRwForm,setEditRwForm]=useState({});

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      setActionMsg("");
      const [overview, allUsers, txns, redemptions, rw] = await Promise.all([
        apiAdminOverview(founderPw),
        apiAdminUsers(founderPw),
        apiAdminTxns(founderPw),
        apiAdminRedemptions(founderPw),
        apiAdminGetRewards(founderPw),
      ]);
      setData({ overview, users:allUsers, transactions:txns, redemptions });
      setUsers(allUsers||[]);
      setRewards(rw||[]);
      setLoading(false);
    })();
  },[refreshKey]);

  const refresh=()=>setRefreshKey(k=>k+1);

  const {users,txns,redemptions}=data;
  const filtered=users.filter(u=>
    !search||
    u.name?.toLowerCase().includes(search.toLowerCase())||
    u.email?.toLowerCase().includes(search.toLowerCase())||
    u.occupation?.toLowerCase().includes(search.toLowerCase())
  );
  const totalSpend=txns.reduce((s,t)=>s+Number(t.amount||0),0);
  const totalCoins=txns.reduce((s,t)=>s+Number(t.coins||0),0);
  const merchantMap=txns.reduce((a,t)=>{const m=t.merchant||"Unknown";a[m]=(a[m]||0)+1;return a;},{});
  const topMerchants=Object.entries(merchantMap).sort((a,b)=>b[1]-a[1]).slice(0,6);

  const TABS=["overview","users","transactions","redemptions","rewards"];
  const handleTabChange=async(t)=>{
    setTab(t);
    if(t==="rewards"){
      setRewardsLoading(true);
      const rw=await apiAdminGetRewards(founderPw); setRewards(rw);
      setRewardsLoading(false);
    }
  };

  const Stat=({label,value,col,sub})=>(
    <div style={{borderRadius:15,padding:"14px 16px",background:T.glass,border:`1px solid ${T.glassBorder}`}}>
      <p style={{margin:"0 0 4px",fontSize:10,color:T.textMute,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</p>
      <p style={{margin:0,fontSize:21,fontWeight:800,color:col||T.text,letterSpacing:"-0.03em"}}>{value}</p>
      {sub&&<p style={{margin:"3px 0 0",fontSize:10.5,color:T.textMute}}>{sub}</p>}
    </div>
  );

  const Tag=({label,col,bg})=>(
    <span style={{fontSize:10,fontWeight:700,color:col,background:bg,
      border:`1px solid ${col}44`,borderRadius:20,padding:"2px 8px",flexShrink:0}}>{label}</span>
  );

  // Ban / unban
  const handleBan=async(u)=>{
    const banned=!u.is_banned;
    await apiFetch("/api/admin/users",{method:"PATCH",founderPw,body:{action:"ban",userId:u.id,is_banned:banned}});
    setActionMsg(`${u.name} ${banned?"banned":"unbanned"}.`);
    refresh();
    setSelUser(null);
  };

  // Mark / unmark demo
  const handleDemo=async(u)=>{
    const demo=!u.is_demo;
    await apiFetch("/api/admin/users",{method:"PATCH",founderPw,body:{action:"demo",userId:u.id,is_demo:demo}});
    setActionMsg(`${u.name} marked as ${demo?"demo":"real"} user.`);
    refresh();
    setSelUser(null);
  };

  // Delete user
  const handleDelete=async(u)=>{
    if(!window.confirm(`Delete ${u.name} and all their data? This cannot be undone.`))return;
    await apiFetch("/api/admin/users",{method:"DELETE",founderPw,body:{userId:u.id}});
    setActionMsg(`${u.name} deleted.`);
    refresh();
    setSelUser(null);
  };

  // Save edit
  const handleSaveEdit=async()=>{
    if(!editUser)return;
    await apiFetch("/api/admin/users",{method:"PATCH",founderPw,body:{
      action:"edit",userId:editUser.id,
      name:editForm.name,age:editForm.age,occupation:editForm.occupation,
    }});
    setActionMsg(`${editForm.name} updated.`);
    setEditUser(null);
    refresh();
  };

  const timeAgo=(iso)=>{
    if(!iso)return"";
    const d=(Date.now()-new Date(iso))/1000;
    if(d<60)return"just now";if(d<3600)return`${Math.floor(d/60)}m ago`;
    if(d<86400)return`${Math.floor(d/3600)}h ago`;return`${Math.floor(d/86400)}d ago`;
  };

  return(
    <motion.div initial={{opacity:0,scale:0.96,filter:"blur(6px)"}}
      animate={{opacity:1,scale:1,filter:"blur(0px)"}}
      exit={{opacity:0,scale:0.96,filter:"blur(6px)"}}
      transition={{duration:0.4,...SP.gentle}}
      style={{position:"absolute",inset:0,zIndex:200,background:T.black,
        display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* Edit modal */}
      <AnimatePresence>
        {editUser&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:"absolute",inset:0,zIndex:10,background:"rgba(0,0,0,0.85)",
              backdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 24px"}}>
            <motion.div initial={{scale:0.9,y:20}} animate={{scale:1,y:0}} transition={SP.bouncy}
              style={{width:"100%",borderRadius:20,background:"#0A0A0C",
                border:"1px solid rgba(255,255,255,0.1)",padding:"24px 20px"}}>
              <h3 style={{margin:"0 0 16px",fontSize:18,fontWeight:800,color:T.text}}>Edit User</h3>
              {[["Name","name"],["Age","age"],["Occupation","occupation"]].map(([label,key])=>(
                <div key={key} style={{marginBottom:12}}>
                  <p style={{margin:"0 0 5px",fontSize:11,color:T.textMute,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em"}}>{label}</p>
                  <input value={editForm[key]||""} onChange={e=>setEditForm(f=>({...f,[key]:e.target.value}))}
                    style={{width:"100%",padding:"10px 13px",borderRadius:10,border:`1px solid ${T.glassBorder}`,
                      background:T.glass,color:T.text,fontSize:14,fontFamily:"inherit",
                      outline:"none",caretColor:T.blue,boxSizing:"border-box"}}/>
                </div>
              ))}
              <div style={{display:"flex",gap:10,marginTop:16}}>
                <Btn onClick={()=>setEditUser(null)} variant="ghost">Cancel</Btn>
                <Btn onClick={handleSaveEdit} full>Save Changes</Btn>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{padding:"52px 20px 0",flexShrink:0,
        background:"linear-gradient(to bottom,rgba(0,0,0,0.97),rgba(0,0,0,0.7),transparent)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
          <motion.button whileTap={{scale:0.88}} onClick={onClose}
            style={{width:34,height:34,borderRadius:10,background:T.glass,
              border:`1px solid ${T.glassBorder}`,display:"flex",
              alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
            <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
              <path d="M8 2L3 5.5l5 3.5" stroke={T.text} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>
          <div style={{flex:1}}>
            <p style={{margin:0,fontSize:10,color:T.error,fontWeight:700,letterSpacing:"0.1em"}}>FOUNDER ONLY</p>
            <h2 style={{margin:0,fontSize:18,fontWeight:800,color:T.text}}>Admin Dashboard</h2>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <motion.button whileTap={{scale:0.9}} onClick={refresh}
              style={{width:32,height:32,borderRadius:9,background:T.glass,border:`1px solid ${T.glassBorder}`,
                display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M14 8A6 6 0 102 8M2 4v4h4" stroke={T.textSub} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.button>
            <motion.div animate={{opacity:[0.5,1,0.5]}} transition={{duration:1.5,repeat:Infinity}}
              style={{width:7,height:7,borderRadius:"50%",background:"#00FF88",boxShadow:"0 0 8px #00FF88"}}/>
          </div>
        </div>

        {/* Action message */}
        <AnimatePresence>
          {actionMsg&&(
            <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
              style={{padding:"8px 12px",borderRadius:10,background:"rgba(0,255,136,0.08)",
                border:"1px solid rgba(0,255,136,0.2)",marginBottom:10}}>
              <p style={{margin:0,fontSize:12,color:"#00FF88",fontWeight:600}}>{actionMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab bar */}
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2,scrollbarWidth:"none"}}>
          {TABS.map(t=>(
            <motion.button key={t} whileTap={{scale:0.95}} onClick={()=>handleTabChange(t)}
              style={{padding:"5px 13px",borderRadius:20,cursor:"pointer",flexShrink:0,
                background:tab===t?"rgba(74,158,255,0.18)":T.glass,
                border:`1px solid ${tab===t?T.blue:T.glassBorder}`,
                color:tab===t?T.blue:T.textSub,
                fontSize:12,fontWeight:600,fontFamily:"inherit",textTransform:"capitalize"}}>
              {t}{t==="users"?` (${users.length})`:t==="transactions"?` (${txns.length})`:""}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"14px 20px 32px"}}>
        {loading?(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",paddingTop:60}}>
            <motion.div animate={{rotate:360}} transition={{duration:1.4,repeat:Infinity,ease:"linear"}}
              style={{width:40,height:40,borderRadius:"50%",border:`2px solid ${T.blue}`,borderTopColor:"transparent"}}/>
          </div>
        ):(
          <AnimatePresence mode="wait">

            {/* OVERVIEW */}
            {tab==="overview"&&(
              <motion.div key="ov" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:0.22}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:16}}>
                  <Stat label="Total Users"  value={users.length}                      col={T.blue}  sub={`${users.filter(u=>!u.is_demo).length} real`}/>
                  <Stat label="Transactions" value={txns.length}                       col={T.text}/>
                  <Stat label="Total Spend"  value={`₹${fmt(Math.round(totalSpend))}`} col="#68D391"/>
                  <Stat label="Coins Issued" value={totalCoins.toFixed(1)}             col={T.gold}/>
                  <Stat label="Redemptions"  value={redemptions.length}                 col="#FC8181"/>
                  <Stat label="Avg Spend"    value={users.filter(u=>!u.is_demo).length?`₹${fmt(Math.round(totalSpend/Math.max(users.filter(u=>!u.is_demo).length,1)))}`:"-"} col={T.textSub} sub="per real user"/>
                </div>
                {topMerchants.length>0&&(
                  <>
                    <p style={{margin:"0 0 10px",fontSize:11,color:T.textMute,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase"}}>Top Merchants</p>
                    {topMerchants.map(([merchant,count],i)=>(
                      <div key={merchant} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",
                        borderBottom:i<topMerchants.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
                        <div style={{width:22,height:22,borderRadius:6,background:"rgba(74,158,255,0.1)",
                          display:"flex",alignItems:"center",justifyContent:"center",
                          fontSize:10.5,fontWeight:800,color:T.blue,flexShrink:0}}>{i+1}</div>
                        <p style={{margin:0,fontSize:13,fontWeight:600,color:T.text,flex:1}}>{merchant}</p>
                        <p style={{margin:0,fontSize:11.5,color:T.textSub,flexShrink:0}}>{count} txn{count!==1?"s":""}</p>
                      </div>
                    ))}
                  </>
                )}
              </motion.div>
            )}

            {/* USERS */}
            {tab==="users"&&(
              <motion.div key="us" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:0.22}}>
                {selUser?(
                  /* User detail view */
                  <div>
                    <motion.button whileTap={{scale:0.92}} onClick={()=>setSelUser(null)}
                      style={{background:"none",border:"none",cursor:"pointer",
                        fontSize:12,fontWeight:600,color:T.blue,fontFamily:"inherit",
                        display:"flex",alignItems:"center",gap:5,marginBottom:16}}>
                      <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
                        <path d="M8 2L3 5.5l5 3.5" stroke={T.blue} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      All Users
                    </motion.button>

                    {/* Profile card */}
                    <div style={{borderRadius:18,padding:"18px",marginBottom:14,
                      background:T.glass,border:`1px solid ${T.glassBorder}`}}>
                      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                        <div style={{width:46,height:46,borderRadius:"50%",
                          background:`linear-gradient(145deg,${T.blue},${T.blueDeep})`,
                          display:"flex",alignItems:"center",justifyContent:"center",
                          fontSize:20,fontWeight:800,color:"white",flexShrink:0}}>
                          {selUser.name?.[0]?.toUpperCase()||"?"}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                            <h3 style={{margin:0,fontSize:16,fontWeight:800,color:T.text}}>{selUser.name}</h3>
                            {selUser.is_banned&&<Tag label="BANNED" col="#FF6058" bg="rgba(255,96,88,0.12)"/>}
                            {selUser.is_demo&&<Tag label="DEMO" col={T.textSub} bg="rgba(255,255,255,0.06)"/>}
                          </div>
                          <p style={{margin:0,fontSize:12,color:T.textSub}}>{selUser.email}</p>
                        </div>
                      </div>
                      {[
                        ["Occupation",selUser.occupation],["Age",selUser.age],
                        ["Coins",Number(selUser.coin_balance||0).toFixed(1)],
                        ["Joined",selUser.joined_at?new Date(selUser.joined_at).toLocaleDateString("en-IN",{year:"numeric",month:"short",day:"numeric"}):"—"],
                      ].map((row,i)=>(
                        <div key={row[0]} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",
                          borderBottom:i<3?"1px solid rgba(255,255,255,0.05)":"none"}}>
                          <p style={{margin:0,fontSize:12.5,color:T.textMute}}>{row[0]}</p>
                          <p style={{margin:0,fontSize:12.5,fontWeight:600,color:T.text}}>{row[1]||"—"}</p>
                        </div>
                      ))}
                    </div>

                    {/* Action buttons */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
                      <motion.button whileTap={{scale:0.96}}
                        onClick={()=>{setEditForm({name:selUser.name,age:selUser.age,occupation:selUser.occupation});setEditUser(selUser);}}
                        style={{padding:"11px",borderRadius:12,background:"rgba(74,158,255,0.1)",
                          border:"1px solid rgba(74,158,255,0.25)",cursor:"pointer",
                          fontSize:13,fontWeight:600,color:T.blue,fontFamily:"inherit"}}>
                        Edit Profile
                      </motion.button>
                      <motion.button whileTap={{scale:0.96}} onClick={()=>handleBan(selUser)}
                        style={{padding:"11px",borderRadius:12,cursor:"pointer",fontFamily:"inherit",
                          background:selUser.is_banned?"rgba(0,255,136,0.08)":"rgba(255,96,88,0.08)",
                          border:`1px solid ${selUser.is_banned?"rgba(0,255,136,0.25)":"rgba(255,96,88,0.25)"}`,
                          fontSize:13,fontWeight:600,color:selUser.is_banned?"#00FF88":T.error}}>
                        {selUser.is_banned?"Unban":"Ban User"}
                      </motion.button>
                      <motion.button whileTap={{scale:0.96}} onClick={()=>handleDemo(selUser)}
                        style={{padding:"11px",borderRadius:12,background:"rgba(255,255,255,0.04)",
                          border:"1px solid rgba(255,255,255,0.1)",cursor:"pointer",
                          fontSize:13,fontWeight:600,color:T.textSub,fontFamily:"inherit"}}>
                        {selUser.is_demo?"Mark Real":"Mark Demo"}
                      </motion.button>
                      <motion.button whileTap={{scale:0.96}} onClick={()=>handleDelete(selUser)}
                        style={{padding:"11px",borderRadius:12,background:"rgba(255,96,88,0.08)",
                          border:"1px solid rgba(255,96,88,0.2)",cursor:"pointer",
                          fontSize:13,fontWeight:600,color:T.error,fontFamily:"inherit"}}>
                        Delete User
                      </motion.button>
                    </div>

                    {/* Their transactions */}
                    <p style={{margin:"0 0 10px",fontSize:11,color:T.textMute,fontWeight:600,
                      letterSpacing:"0.08em",textTransform:"uppercase"}}>
                      Transactions ({txns.filter(t=>t.user_email===selUser.email).length})
                    </p>
                    {txns.filter(t=>t.user_email===selUser.email).length===0
                      ?<p style={{color:T.textMute,fontSize:13}}>No transactions yet</p>
                      :txns.filter(t=>t.user_email===selUser.email).map((tx,i,arr)=>(
                        <div key={tx.id} style={{padding:"10px 0",
                          borderBottom:i<arr.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <div style={{flex:1}}>
                              <p style={{margin:0,fontSize:13.5,fontWeight:600,color:T.text}}>{tx.merchant}</p>
                              <p style={{margin:0,fontSize:11,color:T.textMute}}>{timeAgo(tx.created_at)}</p>
                            </div>
                            <div style={{textAlign:"right"}}>
                              <p style={{margin:0,fontSize:13,fontWeight:700,color:T.text}}>₹{fmt(tx.amount)}</p>
                              <p style={{margin:0,fontSize:11,fontWeight:700,color:T.gold}}>+{tx.coins}</p>
                            </div>
                          </div>
                          {tx.screenshot_url&&(
                            <a href={tx.screenshot_url} target="_blank" rel="noreferrer"
                              style={{fontSize:10.5,color:T.blue,textDecoration:"none",
                                display:"inline-block",marginTop:4,
                                background:"rgba(74,158,255,0.1)",borderRadius:5,padding:"2px 8px"}}>
                              View Screenshot ↗
                            </a>
                          )}
                        </div>
                      ))
                    }
                  </div>
                ):(
                  /* User list */
                  <>
                    {/* Search */}
                    <div style={{position:"relative",marginBottom:12}}>
                      <input value={search} onChange={e=>setSearch(e.target.value)}
                        placeholder="Search users…"
                        style={{width:"100%",padding:"10px 14px 10px 36px",borderRadius:12,
                          border:`1px solid ${T.glassBorder}`,background:T.glass,
                          color:T.text,fontSize:13.5,fontFamily:"inherit",
                          outline:"none",caretColor:T.blue,boxSizing:"border-box"}}/>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                        style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}>
                        <circle cx="7" cy="7" r="5" stroke={T.textMute} strokeWidth="1.5"/>
                        <path d="M11 11l3 3" stroke={T.textMute} strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    {filtered.length===0
                      ?<p style={{color:T.textMute,fontSize:13,textAlign:"center",paddingTop:20}}>No users found</p>
                      :filtered.map(u=>(
                        <motion.div key={u.id} whileTap={{scale:0.98}} onClick={()=>setSelUser(u)}
                          style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",
                            borderRadius:14,marginBottom:7,cursor:"pointer",
                            background:u.is_banned?"rgba(255,96,88,0.05)":u.is_demo?"rgba(255,255,255,0.02)":T.glass,
                            border:`1px solid ${u.is_banned?"rgba(255,96,88,0.2)":T.glassBorder}`}}>
                          <div style={{width:36,height:36,borderRadius:"50%",flexShrink:0,
                            background:`linear-gradient(145deg,${T.blue},${T.blueDeep})`,
                            display:"flex",alignItems:"center",justifyContent:"center",
                            fontSize:15,fontWeight:800,color:"white",opacity:u.is_banned?0.5:1}}>
                            {u.name?.[0]?.toUpperCase()||"?"}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                              <p style={{margin:0,fontSize:13.5,fontWeight:700,
                                color:u.is_banned?"rgba(242,242,247,0.4)":T.text}}>{u.name}</p>
                              {u.is_banned&&<Tag label="BAN" col="#FF6058" bg="rgba(255,96,88,0.12)"/>}
                              {u.is_demo&&<Tag label="DEMO" col={T.textMute} bg="rgba(255,255,255,0.06)"/>}
                            </div>
                            <p style={{margin:0,fontSize:11,color:T.textMute}}>{u.occupation||u.email}</p>
                          </div>
                          <div style={{textAlign:"right",flexShrink:0}}>
                            <p style={{margin:0,fontSize:13,fontWeight:800,color:T.gold}}>
                              {Number(u.coin_balance||0).toFixed(1)}
                            </p>
                            <p style={{margin:0,fontSize:10,color:T.textMute}}>coins</p>
                          </div>
                        </motion.div>
                      ))
                    }
                  </>
                )}
              </motion.div>
            )}

            {/* TRANSACTIONS */}
            {tab==="transactions"&&(
              <motion.div key="tx" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:0.22}}>
                <p style={{margin:"0 0 12px",fontSize:12,color:T.textMute}}>
                  {txns.length} total · ₹{fmt(Math.round(totalSpend))} total spend · {totalCoins.toFixed(1)} coins issued
                </p>
                {txns.length===0
                  ?<p style={{color:T.textMute,fontSize:13,textAlign:"center",paddingTop:32}}>No transactions yet</p>
                  :txns.map((tx,i)=>(
                    <div key={tx.id} style={{padding:"11px 0",
                      borderBottom:i<txns.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{margin:0,fontSize:13.5,fontWeight:700,color:T.text}}>{tx.merchant}</p>
                          <p style={{margin:0,fontSize:11,color:T.textSub,marginTop:1}}>{tx.user_name} · {tx.user_email}</p>
                          <p style={{margin:"2px 0 0",fontSize:10.5,color:T.textMute}}>{timeAgo(tx.created_at)}</p>
                          {tx.screenshot_url&&(
                            <a href={tx.screenshot_url} target="_blank" rel="noreferrer"
                              style={{fontSize:10.5,color:T.blue,textDecoration:"none",
                                background:"rgba(74,158,255,0.1)",borderRadius:5,
                                padding:"2px 8px",display:"inline-block",marginTop:4}}>
                              Screenshot ↗
                            </a>
                          )}
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <p style={{margin:0,fontSize:13.5,fontWeight:700,color:T.text}}>₹{fmt(tx.amount)}</p>
                          <p style={{margin:0,fontSize:11,fontWeight:700,color:T.gold}}>+{tx.coins}</p>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </motion.div>
            )}

            {/* REDEMPTIONS */}
            {tab==="redemptions"&&(
              <motion.div key="rd" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:0.22}}>
                <p style={{margin:"0 0 12px",fontSize:12,color:T.textMute}}>{redemptions.length} redemptions</p>
                {redemptions.length===0
                  ?<p style={{color:T.textMute,fontSize:13,textAlign:"center",paddingTop:32}}>No redemptions yet</p>
                  :redemptions.map((rd,i)=>(
                    <div key={rd.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",
                      borderBottom:i<redemptions.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{margin:0,fontSize:13.5,fontWeight:700,color:T.text}}>{rd.brand} — {rd.label}</p>
                        <p style={{margin:0,fontSize:11,color:T.textSub}}>{rd.user_email}</p>
                        <p style={{margin:"4px 0 0",fontSize:10.5,color:T.blue,fontWeight:700,
                          background:"rgba(74,158,255,0.08)",borderRadius:5,
                          padding:"2px 7px",display:"inline-block"}}>{rd.code}</p>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <p style={{margin:0,fontSize:13,fontWeight:700,color:"#FC8181"}}>-{rd.coins_spent}</p>
                        <p style={{margin:0,fontSize:10,color:T.textMute}}>{timeAgo(rd.redeemed_at)}</p>
                      </div>
                    </div>
                  ))
                }
              </motion.div>
            )}

            {/* REWARDS MANAGER */}
            {tab==="rewards"&&(
              <motion.div key="rw" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:0.22}}>

                {/* Add / Edit modal */}
                <AnimatePresence>
                  {(showAddReward||editReward)&&(
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                      style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.88)",
                        backdropFilter:"blur(16px)",display:"flex",alignItems:"center",
                        justifyContent:"center",padding:"0 20px"}}>
                      <motion.div initial={{scale:0.9,y:20}} animate={{scale:1,y:0}} transition={SP.bouncy}
                        style={{width:"100%",maxWidth:400,borderRadius:20,background:"#0A0A0C",
                          border:"1px solid rgba(255,255,255,0.1)",padding:"24px 20px",
                          maxHeight:"85vh",overflowY:"auto"}}>
                        <h3 style={{margin:"0 0 16px",fontSize:18,fontWeight:800,color:T.text}}>
                          {editReward?"Edit Reward":"Add Reward"}
                        </h3>
                        {editReward?(
                          // Edit form
                          <>
                            {[["Brand",      "brand"],
                              ["Label",      "label"],
                              ["Coins Cost", "cost_coins"],
                            ].map(([lbl,key])=>(
                              <div key={key} style={{marginBottom:12}}>
                                <p style={{margin:"0 0 5px",fontSize:11,color:T.textMute,fontWeight:600,
                                  textTransform:"uppercase",letterSpacing:"0.07em"}}>{lbl}</p>
                                <input value={editRwForm[key]||""} onChange={e=>setEditRwForm(f=>({...f,[key]:e.target.value}))}
                                  style={{width:"100%",padding:"10px 13px",borderRadius:10,
                                    border:`1px solid ${T.glassBorder}`,background:T.glass,
                                    color:T.text,fontSize:14,fontFamily:"inherit",
                                    outline:"none",caretColor:T.blue,boxSizing:"border-box"}}/>
                              </div>
                            ))}
                            <div style={{marginBottom:12}}>
                              <p style={{margin:"0 0 5px",fontSize:11,color:T.textMute,fontWeight:600,
                                textTransform:"uppercase",letterSpacing:"0.07em"}}>Add More Codes (one per line)</p>
                              <textarea value={editRwForm.newCodes||""} onChange={e=>setEditRwForm(f=>({...f,newCodes:e.target.value}))}
                                rows={4} placeholder={"CODE1\nCODE2\nCODE3"}
                                style={{width:"100%",padding:"10px 13px",borderRadius:10,
                                  border:`1px solid ${T.glassBorder}`,background:T.glass,
                                  color:T.text,fontSize:13,fontFamily:"monospace",resize:"vertical",
                                  outline:"none",caretColor:T.blue,boxSizing:"border-box"}}/>
                            </div>
                            <div style={{display:"flex",gap:10,marginTop:16}}>
                              <motion.button whileTap={{scale:0.96}} onClick={()=>{setEditReward(null);setEditRwForm({});}}
                                style={{flex:1,padding:"11px",borderRadius:12,background:T.glass,
                                  border:`1px solid ${T.glassBorder}`,color:T.textSub,
                                  fontSize:13,fontWeight:600,fontFamily:"inherit",cursor:"pointer"}}>
                                Cancel
                              </motion.button>
                              <motion.button whileTap={{scale:0.96}} onClick={async()=>{
                                  setRewardsLoading(true);
                                  // Update all codes in this group (same brand+label)
                                  const allForGroup = await apiAdminGetRewards(founderPw);
                                  const groupRows = allForGroup.filter(r=>
                                    r.brand===editReward.brand && r.label===editReward.label
                                  );
                                  await apiAdminManageReward("update",editReward.brand,editReward.label,{newBrand:editRwForm.brand,newLabel:editRwForm.label,newCost:Number(editRwForm.cost_coins)},founderPw);
                                  if(editRwForm.newCodes&&editRwForm.newCodes.trim()){
                                    const codes=editRwForm.newCodes.split("\n").map(c=>c.trim()).filter(Boolean);
                                    if(codes.length>0) await apiAdminBulkAddCodes(editRwForm.brand,editRwForm.label,Number(editRwForm.cost_coins),codes,founderPw);
                                  }
                                  const rw=await apiAdminGetRewards(founderPw); setRewards(rw);
                                  setEditReward(null); setEditRwForm({}); setRewardsLoading(false);
                                  setActionMsg("Reward updated.");
                                }}
                                style={{flex:2,padding:"11px",borderRadius:12,
                                  background:`linear-gradient(135deg,${T.blue},${T.blueDeep})`,
                                  border:"none",color:"white",fontSize:13,fontWeight:700,
                                  fontFamily:"inherit",cursor:"pointer"}}>
                                Save Changes
                              </motion.button>
                            </div>
                          </>
                        ):(
                          // Add form
                          <>
                            {[["Brand (e.g. Amazon)","brand"],
                              ["Label (e.g. ₹100 Voucher)","label"],
                              ["Cost in Coins","cost_coins"],
                            ].map(([lbl,key])=>(
                              <div key={key} style={{marginBottom:12}}>
                                <p style={{margin:"0 0 5px",fontSize:11,color:T.textMute,fontWeight:600,
                                  textTransform:"uppercase",letterSpacing:"0.07em"}}>{lbl}</p>
                                <input value={newReward[key]||""} onChange={e=>setNewReward(f=>({...f,[key]:e.target.value}))}
                                  style={{width:"100%",padding:"10px 13px",borderRadius:10,
                                    border:`1px solid ${T.glassBorder}`,background:T.glass,
                                    color:T.text,fontSize:14,fontFamily:"inherit",
                                    outline:"none",caretColor:T.blue,boxSizing:"border-box"}}/>
                              </div>
                            ))}
                            <div style={{marginBottom:12}}>
                              <p style={{margin:"0 0 5px",fontSize:11,color:T.textMute,fontWeight:600,
                                textTransform:"uppercase",letterSpacing:"0.07em"}}>Coupon Codes (one per line)</p>
                              <textarea value={newReward.codes} onChange={e=>setNewReward(f=>({...f,codes:e.target.value}))}
                                rows={5} placeholder={"AMZN-XXXX-1\nAMZN-XXXX-2\nAMZN-XXXX-3"}
                                style={{width:"100%",padding:"10px 13px",borderRadius:10,
                                  border:`1px solid ${T.glassBorder}`,background:T.glass,
                                  color:T.text,fontSize:13,fontFamily:"monospace",resize:"vertical",
                                  outline:"none",caretColor:T.blue,boxSizing:"border-box"}}/>
                              <p style={{margin:"5px 0 0",fontSize:11,color:T.textMute}}>
                                Each line = one code. Stock = number of codes pasted.
                              </p>
                            </div>
                            <div style={{display:"flex",gap:10,marginTop:16}}>
                              <motion.button whileTap={{scale:0.96}} onClick={()=>{setShowAddReward(false);setNewReward({brand:"",label:"",cost_coins:"",codes:""}); }}
                                style={{flex:1,padding:"11px",borderRadius:12,background:T.glass,
                                  border:`1px solid ${T.glassBorder}`,color:T.textSub,
                                  fontSize:13,fontWeight:600,fontFamily:"inherit",cursor:"pointer"}}>
                                Cancel
                              </motion.button>
                              <motion.button whileTap={{scale:0.96}} onClick={async()=>{
                                  if(!newReward.brand||!newReward.label||!newReward.cost_coins||!newReward.codes.trim()){
                                    setActionMsg("Fill all fields and add at least one code."); return;
                                  }
                                  setRewardsLoading(true);
                                  const codes=newReward.codes.split("\n").map(c=>c.trim()).filter(Boolean);
                                  await apiAdminBulkAddCodes(newReward.brand, newReward.label, Number(newReward.cost_coins), codes, founderPw);
                                  const rw=await apiAdminGetRewards(founderPw); setRewards(rw);
                                  setShowAddReward(false);
                                  setNewReward({brand:"",label:"",cost_coins:"",codes:""});
                                  setRewardsLoading(false);
                                  setActionMsg(`Added ${codes.length} code${codes.length!==1?"s":""} for ${newReward.brand}.`);
                                }}
                                style={{flex:2,padding:"11px",borderRadius:12,
                                  background:`linear-gradient(135deg,${T.blue},${T.blueDeep})`,
                                  border:"none",color:"white",fontSize:13,fontWeight:700,
                                  fontFamily:"inherit",cursor:"pointer"}}>
                                Add Codes
                              </motion.button>
                            </div>
                          </>
                        )}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Header row */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <div>
                    <p style={{margin:0,fontSize:13,fontWeight:700,color:T.text}}>Reward Inventory</p>
                    <p style={{margin:"2px 0 0",fontSize:11,color:T.textMute}}>
                      {rewards.filter(r=>r.active).length} active · {rewards.length} total codes
                    </p>
                  </div>
                  <motion.button whileTap={{scale:0.94}} onClick={()=>setShowAddReward(true)}
                    style={{padding:"8px 14px",borderRadius:20,
                      background:`linear-gradient(135deg,${T.blue},${T.blueDeep})`,
                      border:"none",color:"white",fontSize:12,fontWeight:700,
                      fontFamily:"inherit",cursor:"pointer",flexShrink:0}}>
                    + Add Reward
                  </motion.button>
                </div>

                {rewardsLoading?(
                  <div style={{textAlign:"center",paddingTop:32}}>
                    <motion.div animate={{rotate:360}} transition={{duration:1.4,repeat:Infinity,ease:"linear"}}
                      style={{width:32,height:32,borderRadius:"50%",border:`2px solid ${T.blue}`,
                        borderTopColor:"transparent",margin:"0 auto"}}/>
                  </div>
                ):rewards.length===0?(
                  <div style={{textAlign:"center",paddingTop:32}}>
                    <p style={{margin:0,fontSize:13.5,color:T.textMute,lineHeight:1.7}}>
                      {"No rewards yet.\nClick \"+ Add Reward\" to upload your first batch of coupon codes."}
                    </p>
                  </div>
                ):(
                  (() => {
                    // Group by brand+label for display
                    const grouped = {};
                    rewards.forEach(r => {
                      const key = r.brand + "||" + r.label + "||" + r.cost_coins;
                      if (!grouped[key]) grouped[key] = { brand:r.brand, label:r.label, cost_coins:r.cost_coins, active:0, total:0, codes:[] };
                      grouped[key].total++;
                      if (r.active && r.stock > 0) grouped[key].active++;
                      grouped[key].codes.push(r);
                    });
                    return Object.values(grouped).map((g, gi) => (
                      <div key={gi} style={{borderRadius:16,padding:"15px 16px",marginBottom:10,
                        background: g.active > 0 ? "rgba(74,158,255,0.05)" : "rgba(255,255,255,0.02)",
                        border:`1px solid ${g.active>0?"rgba(74,158,255,0.2)":T.glassBorder}`}}>
                        <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                          <div style={{width:40,height:40,borderRadius:11,flexShrink:0,
                            background:g.active>0?"rgba(74,158,255,0.12)":"rgba(255,255,255,0.04)",
                            border:`1px solid ${g.active>0?"rgba(74,158,255,0.25)":T.glassBorder}`,
                            display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                              <rect x="2" y="7" width="16" height="11" rx="2.5" stroke={g.active>0?T.blue:T.textMute} strokeWidth="1.4"/>
                              <path d="M6 7V5a4 4 0 018 0v2" stroke={g.active>0?T.blue:T.textMute} strokeWidth="1.4" strokeLinecap="round"/>
                            </svg>
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3,flexWrap:"wrap"}}>
                              <p style={{margin:0,fontSize:14,fontWeight:700,color:g.active>0?T.text:"rgba(242,242,247,0.45)"}}>
                                {g.brand}
                              </p>
                              <p style={{margin:0,fontSize:12,color:T.textSub}}>— {g.label}</p>
                              <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,
                                color:g.active>0?"#00FF88":"rgba(255,255,255,0.3)",
                                background:g.active>0?"rgba(0,255,136,0.1)":"rgba(255,255,255,0.04)",
                                border:`1px solid ${g.active>0?"rgba(0,255,136,0.25)":"rgba(255,255,255,0.08)"}`}}>
                                {g.active>0?"ACTIVE":"OUT OF STOCK"}
                              </span>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:10}}>
                              <p style={{margin:0,fontSize:12,color:T.textSub}}>
                                <span style={{fontWeight:700,color:g.active>0?T.blue:T.textMute}}>{g.active}</span>
                                <span style={{color:T.textMute}}> / {g.total} remaining</span>
                              </p>
                              <p style={{margin:0,fontSize:12,color:T.gold,fontWeight:600}}>{g.cost_coins} coins</p>
                            </div>
                            {/* Stock bar */}
                            <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden",marginBottom:12}}>
                              <div style={{height:"100%",borderRadius:4,
                                background:g.active>0?`linear-gradient(90deg,${T.blue},#90CAFF)`:"rgba(255,255,255,0.1)",
                                width:`${g.total>0?(g.active/g.total)*100:0}%`,transition:"width 0.5s ease"}}/>
                            </div>
                            {/* Action buttons */}
                            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                              <motion.button whileTap={{scale:0.94}}
                                onClick={()=>{ setEditRwForm({brand:g.brand,label:g.label,cost_coins:String(g.cost_coins),newCodes:""}); setEditReward(g.codes[0]); }}
                                style={{padding:"6px 12px",borderRadius:10,background:"rgba(74,158,255,0.1)",
                                  border:"1px solid rgba(74,158,255,0.2)",color:T.blue,
                                  fontSize:11.5,fontWeight:600,fontFamily:"inherit",cursor:"pointer"}}>
                                Edit / Add Codes
                              </motion.button>
                              <motion.button whileTap={{scale:0.94}}
                                onClick={async()=>{
                                  setRewardsLoading(true);
                                  // Toggle active on all codes in this group
                                  const newActive = g.active > 0 ? false : true;
                                  await Promise.all(g.codes.filter(c=>c.stock>0).map(c=>apiFetch("/api/rewards/manage",{method:"PATCH",founderPw,body:{action:"toggle",brand:g.brand,label:g.label,active:newActive}},{},founderPw)));
                                  const rw=await apiAdminGetRewards(founderPw); setRewards(rw);
                                  setRewardsLoading(false);
                                  setActionMsg(`${g.brand} ${newActive?"activated":"deactivated"}.`);
                                }}
                                style={{padding:"6px 12px",borderRadius:10,
                                  background:g.active>0?"rgba(255,96,88,0.08)":"rgba(0,255,136,0.08)",
                                  border:`1px solid ${g.active>0?"rgba(255,96,88,0.2)":"rgba(0,255,136,0.2)"}`,
                                  color:g.active>0?T.error:"#00FF88",
                                  fontSize:11.5,fontWeight:600,fontFamily:"inherit",cursor:"pointer"}}>
                                {g.active>0?"Deactivate":"Activate"}
                              </motion.button>
                              <motion.button whileTap={{scale:0.94}}
                                onClick={async()=>{
                                  if(!window.confirm(`Delete ALL ${g.total} code(s) for ${g.brand} ${g.label}? This cannot be undone.`)) return;
                                  setRewardsLoading(true);
                                  await apiAdminManageReward("delete",g.brand,g.label,{},founderPw);
                                  const rw=await apiAdminGetRewards(founderPw); setRewards(rw);
                                  setRewardsLoading(false);
                                  setActionMsg(`Deleted all codes for ${g.brand}.`);
                                }}
                                style={{padding:"6px 12px",borderRadius:10,background:"rgba(255,96,88,0.07)",
                                  border:"1px solid rgba(255,96,88,0.18)",color:T.error,
                                  fontSize:11.5,fontWeight:600,fontFamily:"inherit",cursor:"pointer"}}>
                                Delete All
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ));
                  })()
                )}
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// BETA DASHBOARD — Neon PostgreSQL backend, founder 5-tap
// ══════════════════════════════════════════════════════════════════════════════
function DismissTimer({id,onDismiss}){
  const seen=useRef(false);
  useEffect(()=>{
    if(!id) return; // no active prompt
    if(seen.current)return; seen.current=true;
    const t=setTimeout(onDismiss,8000);
    return()=>clearTimeout(t);
  },[id]);
  return null;
}

function BetaDashboard({profile,onExplorePrototype,onUpdateProfile}){
  const [tab,setTab]=useState("home");
  const [coins,setCoins]=useState(parseFloat(Number(profile.coin_balance||0).toFixed(1)));
  const [txns,setTxns]=useState([]);
  const [leaderboard,setLeaderboard]=useState([]);
  const [uploadOpen,setUploadOpen]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const [notif,setNotif]=useState(null);
  const [loadingData,setLoadingData]=useState(true);
  const [storeRewards,setStoreRewards]=useState([]); // grouped unique brand+label from API
  const [redeemedCodes,setRedeemedCodes]=useState({}); // {brand+label: code}
  const [redeemingId,setRedeemingId]=useState(null);
  const [purchasePromptTxId,setPurchasePromptTxId]=useState(null);
  const [purchasePendingTxIds,setPurchasePendingTxIds]=useState({}); // {txId: expiresAt ISO}
  const [bonusPendingTxIds,setBonusPendingTxIds]=useState({});       // {txId: bonusCoins}
  const [purchaseInputTxId,setPurchaseInputTxId]=useState(null);
  const [purchaseNote,setPurchaseNote]=useState("");
  const [savingNote,setSavingNote]=useState(false);
  const [founderOpen,setFounderOpen]=useState(false);
  const [showPwModal,setShowPwModal]=useState(false);
  const [pw,setPw]=useState("");
  const [pwErr,setPwErr]=useState("");
  const tapCount=useRef(0);
  const tapTimer=useRef(null);
  const notifTimer=useRef(null);

  // Founder 5-tap handler
  const handleTitleTap=()=>{
    tapCount.current++;
    if(tapTimer.current)clearTimeout(tapTimer.current);
    tapTimer.current=setTimeout(()=>{tapCount.current=0;},2000);
    if(tapCount.current>=5){tapCount.current=0;setShowPwModal(true);}
  };
  const handlePwSubmit=async()=>{
    const ok = await apiAdminAuth(pw);
    if(ok){setShowPwModal(false);setPw("");setPwErr("");setFounderOpen(true);}
    else{setPwErr("Incorrect password.");}
  };

  // Load data — API primary, localStorage cache fallback
  useEffect(()=>{
    (async()=>{
      setLoadingData(true);
      // Transactions from API
      const apiTxns = await apiGetTxns();
      if(apiTxns && apiTxns.length > 0){
        setTxns(apiTxns);
        await lc.set("beta-txns-"+profile.email, apiTxns);
      } else {
        const cached = await lc.get("beta-txns-"+profile.email);
        if(cached) setTxns(cached);
      }
      // Leaderboard
      const sbLB = await apiGetLB();
      if(sbLB && sbLB.length > 0){
        setLeaderboard(sbLB);
      } else {
        const cachedLB = await lc.get("beta-leaderboard");
        if(cachedLB) setLeaderboard(cachedLB);
      }
      // Store rewards — group by brand+label, show unique active reward types
      const allRw = await apiGetRewards();
      // apiGetRewards() already returns grouped {brand,label,cost_coins,available}
      setStoreRewards(allRw);
      setLoadingData(false);
    })();
  },[profile.email]);

  const showNotif=(n)=>{
    setNotif(n);
    if(notifTimer.current)clearTimeout(notifTimer.current);
    notifTimer.current=setTimeout(()=>setNotif(null),5000);
  };

  const handleSavePurchase=async()=>{
    if(!purchaseNote.trim()||savingNote) return;
    setSavingNote(true);
    const txId    = purchaseInputTxId;
    const note    = purchaseNote.trim();
    const bonus   = bonusPendingTxIds[txId];
    const already = txns.find(t=>t.id===txId)?.bonus_claimed;
    const eligible = !!bonus && !already;
    console.log("[PURCHASE] txId:",txId,"bonus eligible:",eligible,"bonus:",bonus);

    const noteResult = await apiSaveNote(txId, note);
    const actualBonus = noteResult?.bonus_coins || 0;
    const newBalance  = noteResult?.coin_balance || coins;

    if(noteResult?.bonus_awarded && actualBonus > 0){
      setCoins(newBalance);
      const up = {...profile, coin_balance: newBalance};
      await lc.set("beta-profile", up);
      onUpdateProfile(up);
      showNotif({type:"earn", title:`+${actualBonus} Bonus Coins Earned!`,
        sub:"Thanks for adding your purchase details", coins:actualBonus});
    }

    setTxns(prev=>prev.map(t=>
      t.id===txId?{...t,purchase_note:note,bonus_claimed:eligible||!!t.bonus_claimed}:t
    ));
    setPurchasePendingTxIds(prev=>{const n={...prev};delete n[txId];return n;});
    setBonusPendingTxIds(prev=>{const n={...prev};delete n[txId];return n;});
    try{
      const cached=await lc.get("beta-txns-"+profile.email);
      if(cached) await lc.set("beta-txns-"+profile.email,
        cached.map(t=>t.id===txId?{...t,purchase_note:note,bonus_claimed:eligible||!!t.bonus_claimed}:t));
    }catch(e){}
    setPurchaseInputTxId(null);
    setPurchaseNote("");
    setSavingNote(false);
  };

  const handleTx=async(tx,ssUrl)=>{
    // Always recalculate coins from amount — never trust OCR-provided coin value
    const earnedCoins = parseFloat((Number(tx.amount) * 0.10).toFixed(1));
    console.log("[DASH] handleTx:", tx.merchant, "₹"+tx.amount, "→ coins:", earnedCoins);
    const newCoins = parseFloat((coins + earnedCoins).toFixed(1));

    // 1. Save to backend (server calculates and validates coins)
    const apiResult = await apiSaveTx(tx, ssUrl);
    console.log("[DASH] apiSaveTx:", apiResult?.transaction?.id||"FAILED", "coins:", apiResult?.coins_earned);
    if(apiResult?.code === "duplicate_transaction"){
      showNotif({type:"error", title:"Already Submitted", sub:"This transaction was already verified."});
      return;
    }
    // Use server values — backend is source of truth for coins
    const serverCoins   = apiResult?.coins_earned || earnedCoins;
    const serverBalance = apiResult?.coin_balance  || newCoins;

    // 3. Build local tx object
    const newTx = {
      id:             apiResult?.transaction?.id || `local_${Date.now()}`,
      created_at:     apiResult?.transaction?.created_at || new Date().toISOString(),
      merchant:       tx.merchant,
      amount:         tx.amount,
      coins:          serverCoins,
      base_coins:     serverCoins,
      bonus_coins:    0,
      total_coins:    serverCoins,
      txn_id:         tx.txnId || "",
      screenshot_url: ssUrl || null,
    };

    // 4. Update local state with server balance
    const newTxns = [newTx, ...txns];
    setTxns(newTxns);
    setCoins(serverBalance);
    setUploadOpen(false);

    // 5. Update localStorage cache
    const up = { ...profile, coin_balance: serverBalance };
    await lc.set("beta-profile", up);
    await lc.set("beta-txns-"+profile.email, newTxns);
    onUpdateProfile(up);

    // 6. Refresh leaderboard
    const lb = await apiGetLB();
    if(lb && lb.length > 0){ setLeaderboard(lb); await lc.set("beta-leaderboard", lb); }

    // 7. Notification
    showNotif({ type:"earn", title:"Transaction Verified",
      sub:`+${serverCoins} Coins · ${tx.merchant}`, coins:serverCoins });

    // 8. Purchase prompt — fires 10s after verified, bonus expires after 30 min
    const insertedId = apiResult?.transaction?.id || newTx.id;
    const expiresAt  = new Date(Date.now() + 60*60*1000).toISOString(); // 1 hour window
    const bonusAmt   = parseFloat((tx.amount * 0.05).toFixed(1)); // 5% of payment amount (matches backend)

    setBonusPendingTxIds(prev=>({...prev, [insertedId]: bonusAmt}));
    setPurchasePendingTxIds(prev=>({...prev, [insertedId]: expiresAt}));

    // Expire after 30 min
    setTimeout(()=>{
      setBonusPendingTxIds(prev=>{const n={...prev};delete n[insertedId];return n;});
      setPurchasePendingTxIds(prev=>{const n={...prev};delete n[insertedId];return n;});
    }, 60*60*1000); // 1 hour

    // Show notification at 10s
    setTimeout(()=>{ setPurchasePromptTxId(insertedId); }, 10000);
  };


  const timeAgo=(iso)=>{
    const d=(Date.now()-new Date(iso))/1000;
    if(d<60)return"Just now";if(d<3600)return`${Math.floor(d/60)}m ago`;
    if(d<86400)return`${Math.floor(d/3600)}h ago`;return`${Math.floor(d/86400)}d ago`;
  };

  const BackBtn=({onClick})=>(
    <motion.button whileTap={{scale:0.88}} onClick={onClick}
      style={{width:34,height:34,borderRadius:10,background:T.glass,border:`1px solid ${T.glassBorder}`,
        display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
      <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
        <path d="M8 2L3 5.5l5 3.5" stroke={T.text} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </motion.button>
  );

  return(
    <div style={{position:"relative",width:"100%",height:"100%",background:T.black,overflow:"hidden"}}>

      {/* Password modal */}
      <AnimatePresence>
        {showPwModal&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:"absolute",inset:0,zIndex:300,background:"rgba(0,0,0,0.88)",
              backdropFilter:"blur(20px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 28px"}}>
            <motion.div initial={{scale:0.9,y:20}} animate={{scale:1,y:0}} transition={SP.bouncy}
              style={{width:"100%",borderRadius:22,background:"#0A0A0C",
                border:"1px solid rgba(255,255,255,0.1)",padding:"28px 22px"}}>
              <p style={{margin:"0 0 4px",fontSize:11,color:T.error,fontWeight:700,letterSpacing:"0.1em"}}>FOUNDER ACCESS</p>
              <h3 style={{margin:"0 0 18px",fontSize:20,fontWeight:800,color:T.text}}>Enter Password</h3>
              <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setPwErr("");}}
                onKeyDown={e=>e.key==="Enter"&&handlePwSubmit()}
                placeholder="Founder password"
                style={{width:"100%",padding:"13px 15px",borderRadius:12,border:`1px solid ${T.glassBorder}`,
                  background:T.glass,color:T.text,fontSize:15,fontFamily:"inherit",
                  outline:"none",caretColor:T.blue,boxSizing:"border-box",marginBottom:8}}/>
              {pwErr&&<p style={{margin:"0 0 10px",fontSize:12,color:T.error}}>{pwErr}</p>}
              <div style={{display:"flex",gap:10,marginTop:6}}>
                <Btn onClick={()=>{setShowPwModal(false);setPw("");setPwErr("");}} variant="ghost">Cancel</Btn>
                <Btn onClick={handlePwSubmit} full>Enter</Btn>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Founder dashboard */}
      <AnimatePresence>
        {founderOpen&&(
          <FounderDashboard key="founder" onClose={()=>setFounderOpen(false)}/>
        )}
      </AnimatePresence>

      {/* ── PURCHASE PROMPT NOTIFICATION ── */}
      <AnimatePresence>
        {purchasePromptTxId&&(
          <motion.div key={"pp"+purchasePromptTxId}
            initial={{y:-110,scale:0.78,opacity:0}} animate={{y:0,scale:1,opacity:1}}
            exit={{y:-90,scale:0.88,opacity:0}} transition={{...SP.island}}
            onClick={()=>{setPurchaseInputTxId(purchasePromptTxId);setPurchaseNote("");setPurchasePromptTxId(null);}}
            style={{position:"absolute",top:52,left:"50%",zIndex:510,
              width:"calc(100% - 32px)",maxWidth:360,cursor:"pointer",transform:"translateX(-50%)"}}>
            <motion.div
              initial={{width:120,height:34,borderRadius:100}}
              animate={{width:"100%",height:72,borderRadius:22}}
              transition={{...SP.island,delay:0.05}}
              style={{background:"rgba(10,10,14,0.96)",backdropFilter:"blur(36px)",
                border:"1px solid rgba(255,255,255,0.11)",overflow:"hidden",
                boxShadow:"0 0 0 1px rgba(255,255,255,0.05) inset,0 14px 50px rgba(0,0,0,0.7)"}}>
              <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}}
                style={{position:"absolute",inset:0,display:"flex",alignItems:"center",padding:"0 14px",gap:12}}>
                <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.36,...SP.bouncy}}
                  style={{width:44,height:44,borderRadius:13,flexShrink:0,
                    background:"rgba(232,196,106,0.14)",border:"1px solid rgba(232,196,106,0.3)",
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                    <circle cx="11" cy="11" r="9" stroke="#E8C46A" strokeWidth="1.6"/>
                    <path d="M11 7v4.5l3 1.5" stroke="#E8C46A" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                </motion.div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{margin:0,fontSize:12.5,fontWeight:700,color:"#F2F2F7",lineHeight:1.2}}>
                    Your reward is almost complete!
                  </p>
                  <p style={{margin:"2px 0 0",fontSize:11,color:"#E8C46A",fontWeight:600}}>
                    Tell us what you bought → earn +{(bonusPendingTxIds[purchasePromptTxId]||0).toFixed(1)} bonus coins
                  </p>
                </div>
                <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.42,...SP.bouncy}}
                  style={{background:"rgba(232,196,106,0.15)",border:"1px solid rgba(232,196,106,0.35)",
                    borderRadius:20,padding:"5px 11px",flexShrink:0}}>
                  <span style={{fontSize:11.5,fontWeight:700,color:"#E8C46A"}}>Add</span>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <DismissTimer key={purchasePromptTxId||"none"} id={purchasePromptTxId}
        onDismiss={()=>setPurchasePromptTxId(null)}/>

      {/* ── PURCHASE INPUT SHEET ── */}
      <AnimatePresence>
        {purchaseInputTxId&&(
          <motion.div key={"pis"+purchaseInputTxId}
            initial={{opacity:0,y:"100%"}} animate={{opacity:1,y:0}} exit={{opacity:0,y:"100%"}}
            transition={{duration:0.38,...SP.gentle}}
            style={{position:"absolute",inset:0,zIndex:92,display:"flex",
              flexDirection:"column",justifyContent:"flex-end"}}>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={()=>{setPurchaseInputTxId(null);setPurchaseNote("");}}
              style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(10px)"}}/>
            <motion.div style={{position:"relative",zIndex:2,background:"#0A0A0C",
              borderRadius:"24px 24px 0 0",border:"1px solid rgba(255,255,255,0.1)"}}>
              <div style={{display:"flex",justifyContent:"center",paddingTop:14,paddingBottom:4}}>
                <div style={{width:36,height:4,borderRadius:2,background:"rgba(255,255,255,0.14)"}}/>
              </div>
              <div style={{padding:"10px 24px 44px"}}>
                {(()=>{
                  const bonAmt=bonusPendingTxIds[purchaseInputTxId];
                  const isEdit=!!txns.find(t=>t.id===purchaseInputTxId)?.purchase_note;
                  return(<>
                    <h3 style={{margin:"0 0 8px",fontSize:20,fontWeight:800,color:"#F2F2F7"}}>
                      {isEdit?"Edit Purchase":"What did you buy?"}
                    </h3>
                    {bonAmt&&!isEdit?(
                      <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}
                        style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,
                          padding:"10px 13px",borderRadius:12,
                          background:"rgba(232,196,106,0.08)",
                          border:"1px solid rgba(232,196,106,0.28)"}}>
                        <motion.div animate={{scale:[1,1.5,1]}} transition={{duration:1,repeat:Infinity}}
                          style={{width:7,height:7,borderRadius:"50%",background:"#E8C46A",flexShrink:0}}/>
                        <p style={{margin:0,fontSize:12.5,fontWeight:700,color:"#E8C46A"}}>
                          Submit now → earn +{bonAmt} bonus coins instantly
                        </p>
                      </motion.div>
                    ):(
                      <p style={{margin:"0 0 14px",fontSize:13,
                        color:"rgba(242,242,247,0.55)",lineHeight:1.6}}>
                        {isEdit?"Update your purchase details."
                              :"Helps personalise your rewards experience."}
                      </p>
                    )}
                  </>);
                })()}
                <input value={purchaseNote} onChange={e=>setPurchaseNote(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&handleSavePurchase()}
                  autoFocus placeholder="e.g. milk, biscuits, shampoo…"
                  style={{width:"100%",padding:"14px 16px",borderRadius:14,
                    border:`1px solid ${purchaseNote.trim()?"#4A9EFF":"rgba(255,255,255,0.12)"}`,
                    background:"rgba(255,255,255,0.05)",color:"#F2F2F7",fontSize:15,
                    fontFamily:"inherit",outline:"none",caretColor:"#4A9EFF",
                    boxSizing:"border-box",marginBottom:12,transition:"border-color 0.2s"}}/>
                <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:14}}>
                  {["Groceries","Food","Medicine","Transport","Recharge","Shopping","Dining"].map(chip=>(
                    <motion.button key={chip} whileTap={{scale:0.93}}
                      onClick={()=>setPurchaseNote(p=>p?p+", "+chip:chip)}
                      style={{padding:"5px 12px",borderRadius:20,
                        background:"rgba(74,158,255,0.08)",
                        border:"1px solid rgba(74,158,255,0.2)",color:"#4A9EFF",
                        fontSize:12,fontWeight:600,fontFamily:"inherit",cursor:"pointer"}}>
                      {chip}
                    </motion.button>
                  ))}
                </div>
                <motion.button disabled={!purchaseNote.trim()||savingNote}
                  onClick={handleSavePurchase}
                  whileTap={purchaseNote.trim()&&!savingNote?{scale:0.97}:{}}
                  style={{width:"100%",padding:"14px",borderRadius:100,border:"none",
                    cursor:purchaseNote.trim()&&!savingNote?"pointer":"not-allowed",
                    background:purchaseNote.trim()
                      ?"linear-gradient(135deg,#4A9EFF,#1E5FCC)"
                      :"rgba(255,255,255,0.07)",
                    color:purchaseNote.trim()?"white":"rgba(255,255,255,0.25)",
                    fontSize:15,fontWeight:700,fontFamily:"inherit",
                    boxShadow:purchaseNote.trim()?"0 0 24px rgba(74,158,255,0.3)":"none",
                    transition:"all 0.2s"}}>
                  {savingNote?"Saving…":(()=>{
                    const b=bonusPendingTxIds[purchaseInputTxId];
                    return b?`Save & Earn +${b} Bonus Coins`:"Save Purchase";
                  })()}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Island Notif */}
      <AnimatePresence>
        {notif&&(
          <motion.div key={notif.title+notif.sub}
            initial={{y:-110,scale:0.78,opacity:0}} animate={{y:0,scale:1,opacity:1}}
            exit={{y:-90,scale:0.88,opacity:0}} transition={{...SP.island}}
            onClick={()=>setNotif(null)}
            style={{position:"absolute",top:52,left:"50%",zIndex:500,
              width:"calc(100% - 32px)",maxWidth:360,cursor:"pointer",
              transform:"translateX(-50%)"}}>
            <motion.div
              initial={{width:120,height:34,borderRadius:100}}
              animate={{width:"100%",height:70,borderRadius:22}}
              transition={{...SP.island,delay:0.05}}
              style={{background:"rgba(10,10,14,0.94)",backdropFilter:"blur(36px)",
                border:"1px solid rgba(255,255,255,0.11)",overflow:"hidden",position:"relative",
                boxShadow:"0 0 0 1px rgba(255,255,255,0.05) inset,0 14px 50px rgba(0,0,0,0.7)"}}>
              <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}}
                style={{position:"absolute",inset:0,display:"flex",alignItems:"center",padding:"0 14px",gap:12}}>
                <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.36,...SP.bouncy}}
                  style={{width:42,height:42,borderRadius:13,flexShrink:0,
                    background:notif.type==="redeem"?"rgba(232,196,106,0.14)":"rgba(74,158,255,0.14)",
                    border:`1px solid ${notif.type==="redeem"?"rgba(232,196,106,0.28)":"rgba(74,158,255,0.28)"}`,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {notif.type==="redeem"
                    ?<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2l2.5 5 5.5.8-4 3.9.95 5.5L10 14.5l-4.95 2.7.95-5.5L2 6.8l5.5-.8z" fill={T.gold} fillOpacity="0.3" stroke={T.gold} strokeWidth="1.3" strokeLinejoin="round"/></svg>
                    :<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" fill="none" stroke={T.blue} strokeWidth="1.4"/><text x="10" y="14" textAnchor="middle" fill={T.blue} fontSize="8.5" fontWeight="800" fontFamily="Inter,sans-serif">P</text></svg>
                  }
                </motion.div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{margin:0,fontSize:12.5,fontWeight:700,color:T.text,lineHeight:1.2}}>{notif.title}</p>
                  <p style={{margin:"2px 0 0",fontSize:11,color:T.textSub}}>{notif.sub}</p>
                </div>
                {notif.coins&&(
                  <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.4,...SP.bouncy}}
                    style={{background:"rgba(232,196,106,0.12)",border:"1px solid rgba(232,196,106,0.26)",
                      borderRadius:20,padding:"4px 9px",flexShrink:0,display:"flex",alignItems:"center",gap:4}}>
                    <motion.div animate={{scale:[1,1.5,1]}} transition={{duration:0.9,repeat:Infinity}}
                      style={{width:5,height:5,borderRadius:"50%",background:T.gold}}/>
                    <span style={{fontSize:11.5,fontWeight:800,color:T.gold}}>+{notif.coins}</span>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP BAR */}
      <div style={{position:"absolute",top:0,left:0,right:0,zIndex:30,padding:"48px 20px 14px",
        background:"linear-gradient(to bottom,rgba(0,0,0,0.96),rgba(0,0,0,0.7),transparent)",
        display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <motion.button whileTap={{scale:0.88}} onClick={()=>setMenuOpen(true)}
          style={{width:36,height:36,borderRadius:11,background:T.glass,border:`1px solid ${T.glassBorder}`,
            display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
          <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
            <path d="M1 1h15M1 6h11M1 11h15" stroke={T.text} strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </motion.button>

        {/* 5-tap founder trigger */}
        <motion.span onClick={handleTitleTap}
          style={{fontSize:15,fontWeight:800,letterSpacing:"0.04em",cursor:"default",
            userSelect:"none",WebkitUserSelect:"none"}}>
          <span style={{color:T.text}}>PAYMINT </span>
          <span style={{color:T.blue}}>BETA</span>
        </motion.span>

        <motion.button whileTap={{scale:0.9}} onClick={()=>setTab("leaderboard")}
          style={{width:36,height:36,borderRadius:11,
            background:tab==="leaderboard"?"rgba(74,158,255,0.14)":T.glass,
            border:`1px solid ${tab==="leaderboard"?T.blue:T.glassBorder}`,
            display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M10 2l1.8 3.6 4 .58-2.9 2.82.68 3.98L10 11.1l-3.58 1.88.68-3.98L4.2 6.18l4-.58z"
              stroke={tab==="leaderboard"?T.blue:T.textSub} strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M7 18h6M10 14v4"
              stroke={tab==="leaderboard"?T.blue:T.textSub} strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </motion.button>
      </div>

      {/* CONTENT */}
      <div style={{position:"absolute",inset:0,overflowY:"auto",paddingTop:106,paddingBottom:90}}>
        <AnimatePresence mode="wait">

          {/* HOME */}
          {tab==="home"&&(
            <motion.div key="bh" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}
              transition={{duration:0.28}} style={{padding:"0 20px 20px"}}>
              <Glow x={50} y={10} color="rgba(232,196,106,0.07)" size={380}/>
              <motion.div initial={{opacity:0,y:24,scale:0.94}} animate={{opacity:1,y:0,scale:1}}
                transition={{duration:0.5,...SP.gentle}}
                style={{borderRadius:24,padding:"30px 22px 26px",marginBottom:14,textAlign:"center",
                  background:"linear-gradient(145deg,#100E00,#070500)",
                  border:"1px solid rgba(232,196,106,0.18)",position:"relative",overflow:"hidden"}}>
                <motion.div animate={{opacity:[0.25,0.55,0.25]}} transition={{duration:3.5,repeat:Infinity}}
                  style={{position:"absolute",inset:0,
                    background:"radial-gradient(circle at 50% 40%,rgba(232,196,106,0.06),transparent 65%)",pointerEvents:"none"}}/>
                <div style={{width:56,height:56,borderRadius:"50%",
                  background:"rgba(232,196,106,0.1)",border:"1px solid rgba(232,196,106,0.22)",
                  display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
                  <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
                    <circle cx="14" cy="14" r="11" fill="none" stroke={T.gold} strokeWidth="1.6"/>
                    <text x="14" y="19" textAnchor="middle" fill={T.gold} fontSize="12" fontWeight="800" fontFamily="Inter,sans-serif">P</text>
                  </svg>
                </div>
                <p style={{margin:"0 0 3px",fontSize:11,color:T.textMute,fontWeight:600,letterSpacing:"0.09em",textTransform:"uppercase"}}>Your Coins</p>
                <motion.div key={coins} initial={{scale:1.12,color:"#FFE599"}} animate={{scale:1,color:T.gold}} transition={{duration:0.45,...SP.bouncy}}>
                  <span style={{fontSize:52,fontWeight:800,letterSpacing:"-0.05em",color:"inherit"}}>{coins.toFixed(1)}</span>
                </motion.div>
                <p style={{margin:"2px 0 0",fontSize:13,color:T.textMute}}>Paymint Coins</p>
              </motion.div>

              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:11}}>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:T.textSub}}>Recent Transactions</p>
                {txns.length>2&&(
                  <motion.button whileTap={{scale:0.92}} onClick={()=>setTab("allTx")}
                    style={{background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:600,color:T.blue,fontFamily:"inherit"}}>
                    View All
                  </motion.button>
                )}
              </div>
              {loadingData?(
                <div style={{textAlign:"center",padding:"24px 0"}}>
                  <motion.div animate={{rotate:360}} transition={{duration:1.4,repeat:Infinity,ease:"linear"}}
                    style={{width:32,height:32,borderRadius:"50%",border:`2px solid ${T.blue}`,borderTopColor:"transparent",margin:"0 auto"}}/>
                </div>
              ):txns.length===0?(
                <div style={{padding:"18px",borderRadius:16,background:T.glass,border:`1px solid ${T.glassBorder}`,textAlign:"center",marginBottom:8}}>
                  <p style={{margin:0,fontSize:13,color:T.textMute,lineHeight:1.7,whiteSpace:"pre-line"}}>
                    {"No transactions yet.\nUpload your first transaction to start earning coins."}
                  </p>
                </div>
              ):txns.slice(0,3).map((tx,i)=>{
                const isPending=purchasePendingTxIds[tx.id]&&new Date(purchasePendingTxIds[tx.id])>new Date();
                const bonusAmt=bonusPendingTxIds[tx.id];
                return(
                <motion.div key={tx.id||i} initial={{opacity:0,y:-10,scale:0.97}} animate={{opacity:1,y:0,scale:1}}
                  transition={{delay:i*0.06,...SP.snappy}}
                  style={{padding:"11px 0",
                    borderBottom:i<Math.min(txns.length,3)-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:38,height:38,borderRadius:11,flexShrink:0,
                      background:"rgba(74,158,255,0.1)",border:"1px solid rgba(74,158,255,0.18)",
                      display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <div style={{width:9,height:9,borderRadius:"50%",background:T.blue}}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{margin:0,fontSize:13.5,fontWeight:600,color:T.text}}>{tx.merchant}</p>
                      <p style={{margin:0,fontSize:11,color:T.textMute,marginTop:1}}>{timeAgo(tx.created_at||tx.ts)}</p>
                      {tx.purchase_note&&<p style={{margin:"2px 0 0",fontSize:11,
                        color:"rgba(242,242,247,0.4)",fontStyle:"italic",
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.purchase_note}</p>}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <p style={{margin:0,fontSize:13.5,fontWeight:700,color:T.text}}>₹{fmt(tx.amount)}</p>
                      <p style={{margin:0,fontSize:11,fontWeight:700,color:T.gold}}>+{tx.coins} coins</p>
                    </div>
                  </div>
                  {isPending&&!tx.purchase_note&&(
                    <motion.button initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}
                      transition={{delay:0.1}} whileTap={{scale:0.97}}
                      onClick={()=>{setPurchaseInputTxId(tx.id);setPurchaseNote("");}}
                      style={{marginTop:8,width:"100%",padding:"9px 13px",borderRadius:11,
                        cursor:"pointer",textAlign:"left",fontFamily:"inherit",
                        background:bonusAmt?"rgba(232,196,106,0.08)":"rgba(255,255,255,0.03)",
                        border:`1px solid ${bonusAmt?"rgba(232,196,106,0.3)":"rgba(255,255,255,0.08)"}`,
                        display:"flex",alignItems:"center",gap:9}}>
                      <motion.div animate={{opacity:[0.4,1,0.4]}} transition={{duration:1.4,repeat:Infinity}}
                        style={{width:7,height:7,borderRadius:"50%",flexShrink:0,
                          background:bonusAmt?"#E8C46A":"rgba(255,255,255,0.2)"}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{margin:0,fontSize:12,fontWeight:700,
                          color:bonusAmt?"#E8C46A":"rgba(242,242,247,0.3)"}}>
                          {bonusAmt
                            ?`Complete Purchase Details & Earn +${bonusAmt} Bonus Coins`
                            :"Add purchase details"}
                        </p>
                        {bonusAmt&&<p style={{margin:"2px 0 0",fontSize:10.5,
                          color:"rgba(232,196,106,0.6)"}}>
                          Tap now · bonus expires in 1 hour
                        </p>}
                      </div>
                      {bonusAmt&&<span style={{fontSize:11,fontWeight:800,color:"#E8C46A",
                        flexShrink:0,background:"rgba(232,196,106,0.12)",
                        border:"1px solid rgba(232,196,106,0.25)",
                        borderRadius:20,padding:"3px 9px"}}>+{bonusAmt}</span>}
                    </motion.button>
                  )}
                </motion.div>);
              })}
            </motion.div>
          )}

          {/* ALL TRANSACTIONS */}
          {tab==="allTx"&&(
            <motion.div key="alltx" initial={{opacity:0,x:28}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-28}}
              transition={{duration:0.28}} style={{padding:"0 20px 20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
                <BackBtn onClick={()=>setTab("home")}/>
                <h3 style={{margin:0,fontSize:18,fontWeight:800,color:T.text}}>All Transactions</h3>
              </div>
              {txns.length===0
                ?<p style={{color:T.textMute,fontSize:13,textAlign:"center",paddingTop:40}}>No transactions yet</p>
                :txns.map((tx,i)=>{
                  const isPending = purchasePendingTxIds[tx.id] && new Date(purchasePendingTxIds[tx.id])>new Date();
                  const bonusAmt  = bonusPendingTxIds[tx.id];
                  return(
                  <div key={tx.id||i} style={{padding:"11px 0",
                    borderBottom:i<txns.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                      <div style={{width:36,height:36,borderRadius:10,flexShrink:0,marginTop:2,
                        background:"rgba(74,158,255,0.09)",border:"1px solid rgba(74,158,255,0.18)",
                        display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:T.blue}}/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{margin:0,fontSize:13.5,fontWeight:600,color:T.text}}>{tx.merchant}</p>
                        <p style={{margin:0,fontSize:11,color:T.textMute,marginTop:1}}>
                          {(tx.txn_id||tx.txnId)?`${tx.txn_id||tx.txnId} · `:""}
                          {timeAgo(tx.created_at||tx.ts)}
                        </p>
                        {tx.purchase_note&&(
                          <p style={{margin:"3px 0 0",fontSize:11.5,color:T.textSub,fontStyle:"italic"}}>
                            {tx.purchase_note}
                          </p>
                        )}
                        {isPending&&!tx.purchase_note&&(
                          <motion.button initial={{opacity:0,y:3}} animate={{opacity:1,y:0}}
                            whileTap={{scale:0.96}}
                            onClick={()=>{setPurchaseInputTxId(tx.id);setPurchaseNote("");}}
                            style={{marginTop:6,padding:"5px 10px",borderRadius:8,cursor:"pointer",
                              background:bonusAmt?"rgba(232,196,106,0.08)":"rgba(255,255,255,0.03)",
                              border:`1px solid ${bonusAmt?"rgba(232,196,106,0.28)":"rgba(255,255,255,0.07)"}`,
                              display:"inline-flex",alignItems:"center",gap:6,fontFamily:"inherit"}}>
                            <motion.div animate={{opacity:[0.4,1,0.4]}} transition={{duration:1.5,repeat:Infinity}}
                              style={{width:5,height:5,borderRadius:"50%",
                                background:bonusAmt?"#E8C46A":"rgba(255,255,255,0.3)",flexShrink:0}}/>
                            <span style={{fontSize:11,fontWeight:700,
                              color:bonusAmt?"#E8C46A":"rgba(242,242,247,0.35)"}}>
                              {bonusAmt?`Add details · earn +${bonusAmt} coins`:"Add purchase details"}
                            </span>
                          </motion.button>
                        )}
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <p style={{margin:0,fontSize:13,fontWeight:700,color:T.text}}>₹{fmt(tx.amount)}</p>
                        <p style={{margin:0,fontSize:11,fontWeight:700,color:T.gold}}>+{tx.coins}</p>
                        <motion.button whileTap={{scale:0.9}}
                          onClick={()=>{setPurchaseInputTxId(tx.id);setPurchaseNote(tx.purchase_note||"");}}
                          style={{marginTop:4,background:"none",border:"none",cursor:"pointer",padding:0,
                            fontSize:10.5,fontWeight:600,fontFamily:"inherit",
                            color:tx.purchase_note?T.textMute:T.blue}}>
                          {tx.purchase_note?"Edit":"+ Add"}
                        </motion.button>
                      </div>
                    </div>
                  </div>
                  );
                })}
            </motion.div>
          )}

          {/* STORE */}
          {tab==="store"&&(
            <motion.div key="bs" initial={{opacity:0,x:28}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-28}}
              transition={{duration:0.28}} style={{padding:"0 20px 20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
                <BackBtn onClick={()=>setTab("home")}/>
                <div>
                  <h3 style={{margin:0,fontSize:18,fontWeight:800,color:T.text}}>Reward Store</h3>
                  <p style={{margin:0,fontSize:11.5,color:T.textMute}}>{coins.toFixed(1)} coins available</p>
                </div>
              </div>

              {storeRewards.length===0?(
                <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.1,...SP.gentle}}
                  style={{borderRadius:20,padding:"40px 24px",textAlign:"center",
                    background:"linear-gradient(145deg,rgba(74,158,255,0.06),rgba(74,158,255,0.02))",
                    border:"1px solid rgba(74,158,255,0.15)"}}>
                  <motion.div animate={{scale:[1,1.08,1]}} transition={{duration:2.5,repeat:Infinity,ease:"easeInOut"}}
                    style={{width:56,height:56,borderRadius:18,background:"rgba(74,158,255,0.1)",
                      border:"1px solid rgba(74,158,255,0.2)",display:"flex",alignItems:"center",
                      justifyContent:"center",margin:"0 auto 16px"}}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke={T.blue} strokeWidth="1.5" strokeLinejoin="round"/>
                      <line x1="3" y1="6" x2="21" y2="6" stroke={T.blue} strokeWidth="1.5"/>
                      <path d="M16 10a4 4 0 01-8 0" stroke={T.blue} strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </motion.div>
                  <h3 style={{margin:"0 0 8px",fontSize:18,fontWeight:800,color:T.text}}>Rewards Coming Soon</h3>
                  <p style={{margin:0,fontSize:13.5,color:T.textSub,lineHeight:1.7,whiteSpace:"pre-line"}}>
                    {"Earn coins by uploading your UPI transactions.\nRewards will be added as the beta grows."}
                  </p>
                </motion.div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {storeRewards.map((rw,i)=>{
                    const key=rw.brand+"||"+rw.label;
                    const isRedeemed=!!redeemedCodes[key];
                    const canAfford=coins>=rw.cost_coins;
                    const inStock=rw.available>0;
                    const isRedeeming=redeemingId===key;
                    const claimedCode=redeemedCodes[key];
                    return(
                      <motion.div key={key}
                        initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
                        transition={{delay:i*0.06,...SP.gentle}}
                        style={{borderRadius:18,padding:"16px",
                          background:canAfford&&inStock&&!isRedeemed
                            ?"linear-gradient(135deg,rgba(74,158,255,0.08),rgba(74,158,255,0.03))"
                            :"rgba(255,255,255,0.03)",
                          border:`1px solid ${canAfford&&inStock&&!isRedeemed?"rgba(74,158,255,0.22)":T.glassBorder}`,
                          position:"relative",overflow:"hidden"}}>
                        <div style={{display:"flex",alignItems:"center",gap:13}}>
                          <div style={{width:44,height:44,borderRadius:13,flexShrink:0,
                            background:canAfford&&inStock?"rgba(74,158,255,0.12)":"rgba(255,255,255,0.04)",
                            border:`1px solid ${canAfford&&inStock?"rgba(74,158,255,0.22)":T.glassBorder}`,
                            display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                              <rect x="2" y="7" width="16" height="11" rx="2.5"
                                stroke={canAfford&&inStock?T.blue:T.textMute} strokeWidth="1.4"/>
                              <path d="M6 7V5a4 4 0 018 0v2"
                                stroke={canAfford&&inStock?T.blue:T.textMute} strokeWidth="1.4" strokeLinecap="round"/>
                            </svg>
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <p style={{margin:0,fontSize:14.5,fontWeight:700,
                              color:canAfford&&inStock?T.text:"rgba(242,242,247,0.45)"}}>
                              {rw.brand}
                            </p>
                            <p style={{margin:"2px 0 0",fontSize:12,color:T.textMute}}>{rw.label}</p>
                            {!inStock&&(
                              <p style={{margin:"4px 0 0",fontSize:11,color:T.error,fontWeight:600}}>Out of stock</p>
                            )}
                            {isRedeemed&&claimedCode&&(
                              <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}
                                style={{marginTop:8,padding:"8px 12px",borderRadius:10,
                                  background:"rgba(0,255,136,0.08)",
                                  border:"1px solid rgba(0,255,136,0.2)"}}>
                                <p style={{margin:"0 0 2px",fontSize:10.5,color:"rgba(0,255,136,0.7)",fontWeight:600,
                                  letterSpacing:"0.06em",textTransform:"uppercase"}}>Your Code</p>
                                <p style={{margin:0,fontSize:15,fontWeight:800,color:"#00FF88",
                                  letterSpacing:"0.08em",fontFamily:"monospace"}}>{claimedCode}</p>
                              </motion.div>
                            )}
                          </div>
                          <div style={{flexShrink:0,textAlign:"right"}}>
                            <p style={{margin:"0 0 7px",fontSize:12,fontWeight:700,
                              color:canAfford?T.blue:T.textMute}}>{rw.cost_coins} coins</p>
                            {!isRedeemed?(
                              <motion.button whileTap={{scale:0.93}}
                                disabled={!canAfford||!inStock||isRedeeming}
                                onClick={async()=>{
                                  if(!canAfford||!inStock||isRedeeming)return;
                                  setRedeemingId(key);
                                  // Claim reward via API
                                  const claimed=await apiClaimReward(rw.brand,rw.label);
                                  if(!claimed){
                                    setRedeemingId(null);
                                    // Refresh store
                                    const allRw=await apiGetRewards();
                                    setStoreRewards(allRw);
                                    return;
                                  }
                                  // Use server-returned coin balance
                                  const newCoins=claimed.coin_balance ?? parseFloat((coins-rw.cost_coins).toFixed(1));
                                  setCoins(newCoins);
                                  // Update local state
                                  setRedeemedCodes(prev=>({...prev,[key]:claimed.code||"CODE_ERROR"}));
                                  const up={...profile,coin_balance:newCoins};
                                  await lc.set("beta-profile",up);
                                  onUpdateProfile(up);
                                  showNotif({type:"redeem",title:`${rw.brand} Redeemed`,
                                    sub:`Code: ${claimed.code}`});
                                  setRedeemingId(null);
                                  // Refresh store stock
                                  const allRw2=await apiGetRewards();
                                  const grp2={};
                                  allRw2.forEach(r=>{
                                    const k=r.brand+"||"+r.label;
                                    if(!grp2[k]) grp2[k]={brand:r.brand,label:r.label,cost_coins:r.cost_coins,available:0};
                                    if(r.active&&r.stock>0) grp2[k].available++;
                                  });
                                  setStoreRewards(Object.values(grp2));
                                }}
                                style={{padding:"7px 14px",borderRadius:10,
                                  background:canAfford&&inStock
                                    ?`linear-gradient(135deg,${T.blue},${T.blueDeep})`
                                    :"rgba(255,255,255,0.06)",
                                  border:"none",cursor:canAfford&&inStock?"pointer":"not-allowed",
                                  fontSize:12,fontWeight:700,
                                  color:canAfford&&inStock?"white":"rgba(255,255,255,0.3)",
                                  fontFamily:"inherit",minWidth:72}}>
                                {isRedeeming?"…":"Redeem"}
                              </motion.button>
                            ):(
                              <span style={{fontSize:11,fontWeight:700,color:"#00FF88",
                                background:"rgba(0,255,136,0.1)",
                                border:"1px solid rgba(0,255,136,0.2)",
                                padding:"5px 10px",borderRadius:10,display:"inline-block"}}>
                                Claimed ✓
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* LEADERBOARD */}
          {tab==="leaderboard"&&(
            <motion.div key="blb" initial={{opacity:0,x:28}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-28}}
              transition={{duration:0.28}} style={{padding:"0 20px 20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
                <BackBtn onClick={()=>setTab("home")}/>
                <h3 style={{margin:0,fontSize:18,fontWeight:800,color:T.text}}>Leaderboard</h3>
              </div>
              {leaderboard.length===0?(
                <div style={{textAlign:"center",paddingTop:40}}>
                  <p style={{margin:0,fontSize:13.5,color:T.textMute,lineHeight:1.7,whiteSpace:"pre-line"}}>
                    {"No rankings yet.\nBe the first to earn coins and claim the top spot."}
                  </p>
                </div>
              ):leaderboard.map((u,i)=>(
                <div key={u.id||u.email} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",
                  borderBottom:i<leaderboard.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
                  <div style={{width:30,height:30,borderRadius:8,flexShrink:0,fontSize:12,fontWeight:800,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    background:i===0?"rgba(232,196,106,0.14)":i===1?"rgba(168,169,173,0.1)":i===2?"rgba(205,127,50,0.1)":"rgba(255,255,255,0.04)",
                    border:`1px solid ${i===0?"rgba(232,196,106,0.22)":i===1?"rgba(168,169,173,0.14)":i===2?"rgba(205,127,50,0.14)":T.glassBorder}`,
                    color:i===0?T.gold:i===1?"#A8A9AD":i===2?"#CD7F32":T.textMute}}>
                    {i+1}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{margin:0,fontSize:13.5,fontWeight:700,
                      color:u.email===profile.email?T.blue:T.text}}>
                      {u.name}{u.email===profile.email?" (You)":""}
                    </p>
                    {u.occupation&&<p style={{margin:0,fontSize:11,color:T.textMute}}>{u.occupation}</p>}
                  </div>
                  <p style={{margin:0,fontSize:13.5,fontWeight:800,color:i===0?T.gold:T.text,flexShrink:0}}>
                    {Number(u.coin_balance||u.coins||0).toFixed(1)}
                  </p>
                </div>
              ))}
            </motion.div>
          )}

          {/* PROFILE */}
          {tab==="profile"&&(
            <motion.div key="bpr" initial={{opacity:0,x:28}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-28}}
              transition={{duration:0.28}} style={{padding:"0 20px 20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
                <BackBtn onClick={()=>setTab("home")}/>
                <h3 style={{margin:0,fontSize:18,fontWeight:800,color:T.text}}>Profile</h3>
              </div>
              <div style={{textAlign:"center",marginBottom:22}}>
                <div style={{width:70,height:70,borderRadius:"50%",
                  background:`linear-gradient(145deg,${T.blue},${T.blueDeep})`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  margin:"0 auto 10px",fontSize:28,fontWeight:800,color:"white"}}>
                  {profile.name?.[0]?.toUpperCase()||"?"}
                </div>
                <h3 style={{margin:0,fontSize:19,fontWeight:800,color:T.text}}>{profile.name}</h3>
                <p style={{margin:"3px 0 0",fontSize:13,color:T.textSub}}>{profile.occupation}</p>
              </div>
              {[
                {l:"Name",v:profile.name},{l:"Age",v:profile.age},
                {l:"Occupation",v:profile.occupation},{l:"Email",v:profile.email},
                {l:"Joined",v:profile.joined_at?new Date(profile.joined_at).toLocaleDateString("en-IN",{year:"numeric",month:"long",day:"numeric"}):""},
                {l:"Total Coins",v:coins.toFixed(1)},
              ].map((row,i)=>(
                <div key={row.l} style={{display:"flex",justifyContent:"space-between",padding:"12px 0",
                  borderBottom:i<5?"1px solid rgba(255,255,255,0.05)":"none"}}>
                  <p style={{margin:0,fontSize:13,color:T.textMute}}>{row.l}</p>
                  <p style={{margin:0,fontSize:13,fontWeight:600,color:T.text}}>{row.v}</p>
                </div>
              ))}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* UPLOAD */}
      <AnimatePresence>
        {uploadOpen&&(
          <BetaUpload key="upload" profile={profile} onDone={handleTx} onClose={()=>setUploadOpen(false)}/>
        )}
      </AnimatePresence>

      {/* MENU */}
      <AnimatePresence>
        {menuOpen&&(
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={()=>setMenuOpen(false)}
              style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(8px)",zIndex:70}}/>
            <motion.div initial={{x:"-100%"}} animate={{x:0}} exit={{x:"-100%"}}
              transition={{duration:0.36,...SP.snappy}}
              style={{position:"absolute",left:0,top:0,bottom:0,width:"72%",maxWidth:280,zIndex:71,
                background:"#09090C",borderRight:"1px solid rgba(255,255,255,0.08)"}}>
              <div style={{padding:"54px 22px 24px"}}>
                <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:24}}>
                  <LogoBadge size={30}/>
                  <span style={{fontSize:13,fontWeight:800,color:T.text}}>PAYMINT</span>
                </div>
                <div style={{marginBottom:22,padding:"12px 14px",borderRadius:14,background:T.glass,border:`1px solid ${T.glassBorder}`}}>
                  <div style={{width:32,height:32,borderRadius:"50%",
                    background:`linear-gradient(145deg,${T.blue},${T.blueDeep})`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:14,fontWeight:800,color:"white",marginBottom:7}}>
                    {profile.name?.[0]?.toUpperCase()||"?"}
                  </div>
                  <p style={{margin:"0 0 2px",fontSize:13,fontWeight:700,color:T.text}}>{profile.name}</p>
                  <p style={{margin:0,fontSize:11,color:T.blue,fontWeight:600}}>Beta · {coins.toFixed(1)} coins</p>
                </div>
                {[
                  {l:"Profile",           ico:"user",   fn:()=>{setTab("profile");setMenuOpen(false);}},
                  {l:"Leaderboard",       ico:"trophy", fn:()=>{setTab("leaderboard");setMenuOpen(false);}},
                  {l:"Explore Prototype", ico:"grid",   fn:()=>{setMenuOpen(false);onExplorePrototype();}},
                ].map(item=>(
                  <motion.button key={item.l} whileTap={{scale:0.97}} onClick={item.fn}
                    style={{width:"100%",display:"flex",alignItems:"center",gap:11,padding:"12px 10px",
                      borderRadius:12,background:"none",border:"none",cursor:"pointer",marginBottom:3,
                      textAlign:"left",fontFamily:"inherit"}}>
                    <div style={{width:30,height:30,borderRadius:8,background:T.glass,border:`1px solid ${T.glassBorder}`,
                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {item.ico==="user"&&<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="3" stroke={T.textSub} strokeWidth="1.3"/><path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" stroke={T.textSub} strokeWidth="1.3" strokeLinecap="round"/></svg>}
                      {item.ico==="trophy"&&<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 1.5l1.4 2.9 3.2.47-2.3 2.25.54 3.18L8 8.75l-2.84 1.55.54-3.18L3.4 4.87l3.2-.47z" stroke={T.gold} strokeWidth="1.2" strokeLinejoin="round"/></svg>}
                      {item.ico==="grid"&&<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke={T.blue} strokeWidth="1.2"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke={T.blue} strokeWidth="1.2"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke={T.blue} strokeWidth="1.2"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke={T.blue} strokeWidth="1.2"/></svg>}
                    </div>
                    <span style={{fontSize:13.5,fontWeight:600,color:T.text}}>{item.l}</span>
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{marginLeft:"auto"}}>
                      <path d="M3.5 2l4 3.5-4 3.5" stroke={T.textMute} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* BOTTOM NAV */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:40,
        background:"rgba(0,0,0,0.92)",backdropFilter:"blur(22px)",
        borderTop:"1px solid rgba(255,255,255,0.07)",
        display:"flex",alignItems:"center",justifyContent:"space-around",padding:"10px 28px 22px"}}>
        <motion.button whileTap={{scale:0.88}} onClick={()=>setTab("home")}
          style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",
            alignItems:"center",gap:3,padding:"4px 12px",color:tab==="home"?T.blue:T.textMute,fontFamily:"inherit"}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
            <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
          </svg>
          <span style={{fontSize:9.5,fontWeight:600,letterSpacing:"0.04em"}}>Home</span>
        </motion.button>
        <motion.button whileTap={{scale:0.88}} onClick={()=>setUploadOpen(true)}
          style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center",fontFamily:"inherit"}}>
          <motion.div whileHover={{scale:1.07}} whileTap={{scale:0.9}}
            animate={{boxShadow:["0 0 22px rgba(74,158,255,0.35)","0 0 40px rgba(74,158,255,0.58)","0 0 22px rgba(74,158,255,0.35)"]}}
            transition={{boxShadow:{duration:2.5,repeat:Infinity,ease:"easeInOut"}}}
            style={{width:54,height:54,borderRadius:"50%",
              background:`linear-gradient(145deg,${T.blue},${T.blueDeep})`,
              display:"flex",alignItems:"center",justifyContent:"center",marginBottom:-4}}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 4v14M4 11h14" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </motion.div>
        </motion.button>
        <motion.button whileTap={{scale:0.88}} onClick={()=>setTab("store")}
          style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",
            alignItems:"center",gap:3,padding:"4px 12px",color:tab==="store"?T.blue:T.textMute,fontFamily:"inherit"}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
            <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <span style={{fontSize:9.5,fontWeight:600,letterSpacing:"0.04em"}}>Store</span>
        </motion.button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT — God Mode
// ══════════════════════════════════════════════════════════════════════════════
export default function Paymint(){
  const [appMode,setAppMode]=useState("loading"); // loading|select_pending|select|beta|prototype
  const [betaStep,setBetaStep]=useState("profile");
  const [betaProfile,setBetaProfile]=useState(null);
  const [screen,setScreen]=useState(0);
  const [userName,setUserName]=useState("Friend");

  const V={initial:{opacity:0,x:44,scale:0.97},animate:{opacity:1,x:0,scale:1},exit:{opacity:0,x:-44,scale:0.97}};
  const D={initial:{opacity:0,scale:0.96,filter:"blur(6px)"},animate:{opacity:1,scale:1,filter:"blur(0px)"},exit:{opacity:0,scale:1.02,filter:"blur(3px)"}};
  const go=n=>setScreen(n);

  useEffect(()=>{
    (async()=>{
      // 1. Check localStorage cache (instant load)
      let profile = await lc.get("beta-profile");
      const token = tokenStore.get();
      console.log("[ROOT] profile:", profile?.email||"none", "token:", token?"YES":"NO");

      if(profile?.email && token){
        setBetaProfile(profile);
        setUserName(profile.name?.split(" ")[0]||"Friend");
        setAppMode("beta");
        setBetaStep("dashboard");
        // Background refresh from API
        apiGetMe().then(fresh=>{
          if(fresh && !fresh.error){
            const merged={...profile,...fresh};
            lc.set("beta-profile", merged);
            setBetaProfile(merged);
          }
        }).catch(()=>{});
      } else {
        lc.del("beta-profile"); tokenStore.del();
        setAppMode("select_pending");
      }
    })();
  },[]);

  return(
    <div style={{width:"100vw",height:"100dvh",background:T.black,
      fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      overflow:"hidden",position:"relative",maxWidth:430,margin:"0 auto"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:#000;height:100%;}
        input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.28);}
        input[type="number"]::-webkit-inner-spin-button{-webkit-appearance:none;}
        ::-webkit-scrollbar{display:none;}
        *{-webkit-tap-highlight-color:transparent;}
        input,textarea,select{-webkit-appearance:none;}
      `}</style>

      <AnimatePresence mode="wait">

        {appMode==="loading"&&(
          <motion.div key="ld" initial={{opacity:1}} exit={{opacity:0}} transition={{duration:0.3}}
            style={{position:"absolute",inset:0,background:T.black,
              display:"flex",alignItems:"center",justifyContent:"center"}}>
            <motion.div animate={{opacity:[0.3,1,0.3],scale:[0.95,1,0.95]}} transition={{duration:1.4,repeat:Infinity}}>
              <LogoBadge size={52}/>
            </motion.div>
          </motion.div>
        )}

        {(appMode==="select_pending"||appMode==="select")&&(
          <motion.div key="sel-wrap" variants={D} initial="initial" animate="animate" exit="exit"
            transition={{duration:0.4}} style={{position:"absolute",inset:0}}>
            <AnimatePresence mode="wait">
              {appMode==="select_pending"&&(
                <motion.div key="intro-sp" initial={{opacity:0}} animate={{opacity:1}}
                  exit={{opacity:0,scale:1.03,filter:"blur(4px)"}} transition={{duration:0.4}}
                  style={{position:"absolute",inset:0}}>
                  <IntroScreen onNext={()=>setAppMode("select")}/>
                </motion.div>
              )}
              {appMode==="select"&&(
                <motion.div key="exp-sel" initial={{opacity:0,y:28}} animate={{opacity:1,y:0}}
                  exit={{opacity:0,y:-16}} transition={{duration:0.4,...SP.gentle}}
                  style={{position:"absolute",inset:0}}>
                  <ExperienceSelect
                    onBeta={()=>{setAppMode("beta");setBetaStep("profile");}}
                    onPrototype={()=>{setAppMode("prototype");go(1);}}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {appMode==="beta"&&(
          <motion.div key="beta-wrap" variants={D} initial="initial" animate="animate" exit="exit"
            transition={{duration:0.45}} style={{position:"absolute",inset:0}}>
            <AnimatePresence mode="wait">
              {betaStep==="profile"&&(
                <motion.div key="bp" variants={V} initial="initial" animate="animate" exit="exit"
                  transition={SP.gentle} style={{position:"absolute",inset:0}}>
                  <BetaProfileSetup onDone={(p)=>{setBetaProfile(p);setUserName(p.name?.split(" ")[0]||"Friend");setBetaStep("how");}}/>
                </motion.div>
              )}
              {betaStep==="how"&&(
                <motion.div key="bhow" variants={V} initial="initial" animate="animate" exit="exit"
                  transition={SP.gentle} style={{position:"absolute",inset:0}}>
                  <BetaHowCards onStart={()=>setBetaStep("dashboard")}/>
                </motion.div>
              )}
              {betaStep==="dashboard"&&betaProfile&&(
                <motion.div key="bdash" variants={D} initial="initial" animate="animate" exit="exit"
                  transition={{duration:0.6,...SP.slow}} style={{position:"absolute",inset:0}}>
                  <BetaDashboard
                    profile={betaProfile}
                    onExplorePrototype={()=>{setAppMode("prototype");go(1);}}
                    onUpdateProfile={(p)=>setBetaProfile(p)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {appMode==="prototype"&&(
          <motion.div key="proto-wrap" variants={D} initial="initial" animate="animate" exit="exit"
            transition={{duration:0.45}} style={{position:"absolute",inset:0}}>
            <StepBar current={screen}/>
            <AnimatePresence mode="wait">
              {screen===0&&(<motion.div key="i" variants={V} initial="initial" animate="animate" exit="exit" transition={SP.gentle} style={{position:"absolute",inset:0}}><IntroScreen onNext={()=>go(1)}/></motion.div>)}
              {screen===1&&(<motion.div key="a" variants={V} initial="initial" animate="animate" exit="exit" transition={SP.gentle} style={{position:"absolute",inset:0}}><AccountScreen onNext={n=>{setUserName(n);go(2);}}/></motion.div>)}
              {screen===2&&(<motion.div key="c" variants={V} initial="initial" animate="animate" exit="exit" transition={SP.gentle} style={{position:"absolute",inset:0}}><ConnectScreen onNext={()=>go(3)}/></motion.div>)}
              {screen===3&&(<motion.div key="l" variants={V} initial="initial" animate="animate" exit="exit" transition={SP.gentle} style={{position:"absolute",inset:0}}><LoadingScreen onDone={()=>go(4)}/></motion.div>)}
              {screen===4&&(<motion.div key="w" variants={V} initial="initial" animate="animate" exit="exit" transition={SP.gentle} style={{position:"absolute",inset:0}}><WelcomeScreen userName={userName} onNext={()=>go(5)}/></motion.div>)}
              {screen===5&&(<motion.div key="o" variants={V} initial="initial" animate="animate" exit="exit" transition={{duration:0.55,ease:[0.4,0,0.2,1]}} style={{position:"absolute",inset:0}}><OnboardingCards onDone={()=>go(6)}/></motion.div>)}
              {screen===6&&(<motion.div key="d" variants={D} initial="initial" animate="animate" exit="exit" transition={{duration:0.7,...SP.slow}} style={{position:"absolute",inset:0}}><DashboardScreen userName={userName}/></motion.div>)}
            </AnimatePresence>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
