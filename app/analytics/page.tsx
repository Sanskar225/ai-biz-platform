"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { SideNav } from "@/components/SideNav";

const wonLost = [
  {month:"Feb",won:3,lost:5},{month:"Mar",won:5,lost:4},{month:"Apr",won:4,lost:6},
  {month:"May",won:8,lost:3},{month:"Jun",won:7,lost:4},{month:"Jul",won:9,lost:2},
];
const sources = [
  {name:"Meta Ads",value:38,fill:"#3b82f6"},{name:"Referral",value:27,fill:"#8b5cf6"},
  {name:"Website",value:19,fill:"#22c55e"},{name:"Cold",value:16,fill:"#f59e0b"},
];
const responseTime = [
  {day:"Mon",minutes:14},{day:"Tue",minutes:8},{day:"Wed",minutes:22},{day:"Thu",minutes:6},{day:"Fri",minutes:11},
];

export default function AnalyticsPage() {
  return (
    <div className="flex min-h-screen bg-neutral-950">
      <SideNav />
      <main className="flex-1 overflow-auto px-8 py-8">
        <h1 className="text-xl font-semibold text-white mb-1">Analytics</h1>
        <p className="text-xs text-neutral-400 mb-6">AI-powered insights about your sales performance</p>

        {/* Top KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            {label:"Conversion Rate",value:"6.3%",sub:"Leads → Won",trend:"+1.2%"},
            {label:"Avg Deal Size",value:"₹73K",sub:"Per closed deal",trend:"+8%"},
            {label:"Sales Cycle",value:"18 days",sub:"Avg time to close",trend:"-3 days"},
            {label:"Response Time",value:"11 min",sub:"First reply avg",trend:"-6 min"},
          ].map(k=>(
            <div key={k.label} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <p className="text-xs text-neutral-500">{k.label}</p>
              <p className="mt-1 text-2xl font-bold text-white">{k.value}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{k.sub}</p>
              <p className="mt-1 text-xs text-green-400">{k.trend} vs last month</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Won vs Lost */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <h2 className="text-sm font-semibold text-white mb-4">Won vs Lost Deals</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={wonLost} barGap={2}>
                <XAxis dataKey="month" tick={{fill:"#6b7280",fontSize:11}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill:"#6b7280",fontSize:11}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{background:"#171717",border:"1px solid #262626",borderRadius:8,fontSize:12}} />
                <Bar dataKey="won" fill="#22c55e" radius={[4,4,0,0]} name="Won" />
                <Bar dataKey="lost" fill="#ef4444" radius={[4,4,0,0]} name="Lost" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Lead Sources */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <h2 className="text-sm font-semibold text-white mb-4">Lead Sources</h2>
            <div className="flex items-center gap-6">
              <PieChart width={160} height={160}>
                <Pie data={sources} cx={75} cy={75} innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                  {sources.map((s,i)=><Cell key={i} fill={s.fill}/>)}
                </Pie>
              </PieChart>
              <div className="space-y-2">
                {sources.map(s=>(
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{background:s.fill}} />
                    <span className="text-xs text-neutral-300">{s.name}</span>
                    <span className="ml-auto text-xs font-medium text-white">{s.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Response Time */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <h2 className="text-sm font-semibold text-white mb-1">Response Time (minutes)</h2>
            <p className="text-xs text-neutral-500 mb-4">22% of leads lost due to &gt;10 min response</p>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={responseTime}>
                <XAxis dataKey="day" tick={{fill:"#6b7280",fontSize:11}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill:"#6b7280",fontSize:11}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{background:"#171717",border:"1px solid #262626",borderRadius:8,fontSize:12}} />
                <Line type="monotone" dataKey="minutes" stroke="#f59e0b" strokeWidth={2} dot={{fill:"#f59e0b",r:3}} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* AI Insights */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <h2 className="text-sm font-semibold text-white mb-4">✦ AI Insights</h2>
            <div className="space-y-3">
              {[
                {icon:"↑",color:"text-green-400",text:"Meta Ads convert 3.2× better than Google — consider reallocating ₹40K budget."},
                {icon:"⚠",color:"text-amber-400",text:"5 customers likely to churn — usage dropped 40% week-over-week."},
                {icon:"↗",color:"text-blue-400",text:"Responding within 5 min closes deals 3.4× more — consider auto-reply on WhatsApp."},
              ].map((i,idx)=>(
                <div key={idx} className="flex items-start gap-3 rounded-lg border border-neutral-800 p-3">
                  <span className={`text-lg font-bold ${i.color}`}>{i.icon}</span>
                  <p className="text-xs text-neutral-300 leading-relaxed">{i.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
