let scenarios=[]; let playbooks=[]; let tenants=[];
const state={
  user:null,pendingEmail:"",tab:"login",selectedScenarioId:null,currentStepIndex:0,
  selectedTenantId:"msp-demo",selectedClientId:"client-1",customTenantName:"", environmentMode:"fictitious", currentSimulationName:"",
  meetingLocation:"Security War Room",meetingDate:"2026-03-09",meetingTimeOnly:"10:00",meetingTime:"2026-03-09 10:00",meetingNotes:"Bring laptops and incident response materials.",
  team:[], editingMemberId:null,
  form:{firstName:"",lastName:"",title:"",role:"",email:"",phone:""},
  roleAssignments:{}, taskAssignments:{}, notificationsGenerated:false,
  notificationPreview:[],
  notificationsSent:false,
  search:"",
  completedSimulations:[],
  summaryNotes:"",
  environmentSystems:[],
  stepNotes:{},
  currentNoteStepKey:"",
  currentNoteMode:"did",
  exportReady:false,
  revealedInjectCount:1,
  injectAutoRun:false,
  injectIntervalSeconds:30,
  injectTimer:null
};

const availableRoles=["Incident Commander","Technical Lead","Security Analyst","Help Desk Lead","IT Operations","Backup / Recovery Lead","Communications Lead","Executive Sponsor"];

const documents=[
{name:"Incident Log",purpose:"Track the incident timeline and decisions.",questions:["What happened first?","What changed next?","Who approved key actions?"]},
{name:"Evidence Log",purpose:"Track evidence collected during the scenario.",questions:["What evidence confirms the incident?","What evidence is missing?"]},
{name:"Communications Log",purpose:"Track internal and external communications.",questions:["Who needs to know now?","What should leadership hear?"]},
{name:"Containment Checklist",purpose:"Track containment actions.",questions:["What reduces risk fastest?","What might break if this action is taken?"]},
{name:"Recovery Checklist",purpose:"Track restoration and validation.",questions:["What has been restored?","What still needs validation?"]},
{name:"After-Action Review",purpose:"Capture lessons learned.",questions:["What worked?","What did not?","What should change?"]}
];

const hardwareCatalog=["Firewall","Domain Controller","File Server","Backup Appliance","User Workstations","Laptops","VPN Gateway","Core Switch","Wireless Access Points","Database Server"];
const softwareCatalog=["Active Directory / Identity Provider","EDR Platform","SIEM / Log Platform","Email Security Gateway","Backup Software","Patch Management Platform","MFA Platform","Ticketing System","Cloud Productivity Suite","Threat Intelligence Platform"];

function tenantDisplayName(){
  return state.customTenantName?.trim() || currentTenant()?.name || "No tenant";
}
function clientDisplayName(){
  return currentClient()?.name || "No client";
}
function normalizeRole(v){ return String(v||"").trim().toLowerCase(); }
function syncRoleAssignmentsFromTeam(){
  state.team.forEach(m=>{
    const roleName = (m.role||"").trim();
    if(!roleName) return;
    const exact = suggestedRoles().find(r=>normalizeRole(r)===normalizeRole(roleName));
    if(exact && !state.roleAssignments[exact]){
      state.roleAssignments[exact]=m.id;
    }
  });
}
function toggleEnvironmentSystem(name){
  const list = state.environmentSystems || [];
  const idx = list.indexOf(name);
  if(idx >= 0) list.splice(idx,1); else list.push(name);
  state.environmentSystems = list;
}

function byId(id){return document.getElementById(id)}
function escapeHtml(str){return String(str??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}
function escapeAttr(str){return escapeHtml(str)}
function normalizeTitle(v){return String(v??"").normalize("NFKD").replace(/[‐‑‒–—―]/g,"-").replace(/[^a-zA-Z0-9]+/g," ").trim().toLowerCase()}
function currentScenario(){return scenarios.find(s=>s.id===state.selectedScenarioId)||scenarios[0]}
function currentPlaybook(){
  if(!currentScenario()) return null;
  const exact=playbooks.find(p=>p.scenarioTitle===currentScenario().title);
  if(exact) return exact;
  const want=normalizeTitle(currentScenario().title);
  return playbooks.find(p=>normalizeTitle(p.scenarioTitle)===want);
}
function currentTenant(){return tenants.find(t=>t.id===state.selectedTenantId)}
function currentClient(){return (currentTenant()?.clients||[]).find(c=>c.id===state.selectedClientId)}
function suggestedRoles(){
  const title=(currentScenario()?.title||"").toLowerCase();
  if(title.includes("ransom")) return ["Incident Commander","Technical Lead","Backup / Recovery Lead","Communications Lead","Executive Sponsor"];
  if(title.includes("email")||title.includes("phish")||title.includes("credential")) return ["Incident Commander","Technical Lead","Security Analyst","Help Desk Lead","Communications Lead"];
  return ["Incident Commander","Technical Lead","Security Analyst","IT Operations","Communications Lead"];
}
function scenarioTimeline(){
  const s=currentScenario();
  if(!s) return [];
  if(s.timeline&&Array.isArray(s.timeline)){
    return s.timeline.map(x=> typeof x==="string" ? x : `${x.time}: ${x.event}`);
  }
  return s.injects||[];
}
function buildStepTasks(step){
  const name=(typeof step==="string"?step:step.name||"").toLowerCase();
  if(name.includes("detect")) return [{task:"Review the initial alert details", role:"Security Analyst"},{task:"Record detection time and source", role:"Incident Commander"}];
  if(name.includes("triage")) return [{task:"Validate whether the activity is malicious", role:"Security Analyst"},{task:"Confirm business impact and severity", role:"Incident Commander"}];
  if(name.includes("contain")) return [{task:"Choose the fastest safe containment action", role:"IT Operations"},{task:"Communicate the containment decision", role:"Communications Lead"}];
  if(name.includes("investigat")) return [{task:"Collect logs and artifacts", role:"Security Analyst"},{task:"Establish the most likely root cause", role:"Incident Commander"}];
  if(name.includes("recover")) return [{task:"Restore systems or accounts", role:"IT Operations"},{task:"Validate systems are ready for business use", role:"Technical Lead"}];
  return [{task:(typeof step==="string"?step:(step.name||"Complete the assigned activity")), role:"Incident Commander"}];
}
function docsForTask(task){
  const t=task.toLowerCase();
  if(t.includes("alert")||t.includes("detect")||t.includes("triage")) return ["Incident Log","Evidence Log"];
  if(t.includes("contain")) return ["Containment Checklist","Incident Log","Communications Log"];
  if(t.includes("recover")) return ["Recovery Checklist","Incident Log"];
  if(t.includes("communicat")) return ["Communications Log"];
  return ["Incident Log"];
}
function stepMeaning(stepName){
  const s=String(stepName||"").toLowerCase();
  if(s.includes("detect")) return "Detection is where the team confirms that something abnormal has happened and determines whether the event may represent a true security incident.";
  if(s.includes("triage")) return "Triage is where the team validates severity, prioritizes response actions, and decides how urgently the organization needs to act.";
  if(s.includes("contain")) return "Containment is where the team takes controlled action to stop the incident from spreading further or causing additional damage.";
  if(s.includes("investigat")) return "Investigation is where the team gathers evidence, determines scope, and develops the most likely explanation of what happened.";
  if(s.includes("recover")) return "Recovery is where the team restores systems, validates safe operation, and prepares the business to return to normal activity.";
  if(s.includes("after action")) return "After Action Review is where the team documents lessons learned, identifies gaps, and captures improvements for future readiness.";
  return "This step guides the team through the current response phase for the scenario.";
}

function suggestedSystemsForScenario(){
  const title=(currentScenario()?.title||"").toLowerCase();
  if(title.includes("ransom")) return ["Endpoint Detection & Response (EDR)","Backup system","Active Directory","File servers","Email security platform","Firewall"];
  if(title.includes("phish")||title.includes("email")) return ["Email security gateway","Identity provider / MFA","User endpoints","Security awareness platform","SIEM / log system"];
  if(title.includes("data")||title.includes("exfiltration")) return ["DLP system","SIEM","Firewall","Cloud storage logs","Endpoint protection"];
  return ["Firewall","Endpoint protection platform","Identity provider / Active Directory","Email system","Backup platform","SIEM / logging platform"];
}
function stepTools(stepName){
  const s=String(stepName||"").toLowerCase();
  if(s.includes("detect")) return ["SIEM / log platform","EDR console","Email security alerts","Monitoring dashboards"];
  if(s.includes("triage")) return ["SIEM queries","Endpoint forensic tools","User activity logs","Threat intelligence feeds"];
  if(s.includes("contain")) return ["Firewall console","Endpoint isolation tools","Identity management system","Network segmentation controls"];
  if(s.includes("investigat")) return ["Endpoint forensic toolkit","Log analysis tools","Packet capture data","Threat intelligence platforms"];
  if(s.includes("recover")) return ["Backup platform","System rebuild tools","Configuration management system","Patch management system"];
  if(s.includes("after action")) return ["Incident documentation","Ticketing / project system","Knowledge base","Post‑incident review template"];
  return ["Security monitoring platform","Endpoint tools","Administrative consoles"];
}
function stepHowTo(stepName){
  const s=String(stepName||"").toLowerCase();
  if(s.includes("detect")) return [
    "Review the triggering alert, report, or symptom and document when it was first observed.",
    "Validate whether the event appears malicious, accidental, or still unknown.",
    "Record the affected systems, users, or business functions that are initially visible."
  ];
  if(s.includes("triage")) return [
    "Determine how severe the situation is based on operational impact, affected assets, and possible data exposure.",
    "Prioritize the first actions that reduce risk quickly without causing unnecessary business disruption.",
    "Confirm which roles must be engaged immediately and assign accountability."
  ];
  if(s.includes("contain")) return [
    "Choose the safest containment action, such as disabling access, isolating hosts, or restricting communications.",
    "Document why the containment action was selected and any business tradeoffs it may introduce.",
    "Communicate the containment decision to stakeholders so parallel work can proceed."
  ];
  if(s.includes("investigat")) return [
    "Collect logs, endpoint evidence, user reports, and other artifacts that help explain the incident.",
    "Identify the likely entry point, the systems involved, and any indicators that the issue spread further.",
    "Update the incident record with confirmed findings versus assumptions still being tested."
  ];
  if(s.includes("recover")) return [
    "Restore affected systems, accounts, or services in a controlled order based on business priority.",
    "Validate that systems are stable, secure, and ready for production use before full return to service.",
    "Communicate status updates and document what was restored, when, and by whom."
  ];
  if(s.includes("after action")) return [
    "Review what worked well, what was confusing, and what slowed the response down.",
    "Capture improvement actions, assign owners, and record realistic follow-up dates.",
    "Summarize the exercise so leadership and future participants can learn from it."
  ];
  return [
    "Review the goal of the current step and confirm who owns each task.",
    "Complete the tasks in order and record your decisions as you go.",
    "Document results clearly before moving on to the next phase."
  ];
}
function allTaskRows(){
  const pb=currentPlaybook(); if(!pb) return [];
  const rows=[];
  (pb.steps||[]).forEach((step, idx)=>{
    const stepName=typeof step==="string"?step:step.name;
    buildStepTasks(step).forEach((t,j)=>{
      const key=`${idx}:${j}`;
      rows.push({key, stepName, task:t.task, role:t.role});
    });
  });
  return rows;
}
function assignedNameForTask(key, fallbackRole){
  const memberId=state.taskAssignments[key] || state.roleAssignments[fallbackRole];
  const member=state.team.find(m=>m.id===memberId);
  return member ? `${member.firstName} ${member.lastName}` : "";
}
function teamOptions(selectedId){
  return `<option value="">Unassigned</option>` + state.team.map(m=>`<option value="${escapeAttr(m.id)}" ${m.id===selectedId?'selected':''}>${escapeHtml(m.firstName + ' ' + m.lastName + ' (' + (m.role || m.title || 'No role') + ')')}</option>`).join("");
}
function logOff(){
  if(typeof stopInjectTimer === "function"){ stopInjectTimer(); }
  state.user = null;
  state.pendingEmail = "";
  state.tab = "login";
  state.notificationPreview = [];
  state.notificationsGenerated = false;
  state.notificationsSent = false;
  byId("userBadge").textContent = "Signed out";
  byId("tenantBadge").textContent = "No tenant";
  renderLogin();
  renderAll();
  setTab("login");
}
function setTab(tab){
  if(tab !== "login" && !state.user){ alert("Sign in first."); return; }
  state.tab = tab;
  document.querySelectorAll(".tab").forEach(el=>el.classList.remove("active"));
  document.querySelectorAll(".nav-btn[data-tab]").forEach(el=>el.classList.remove("active"));
  const tabEl = byId(tab + "Tab");
  if(tabEl) tabEl.classList.add("active");
  const btn = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
  if(btn) btn.classList.add("active");
}
function renderLogin(){
  byId("loginTab").innerHTML=`<div class="hero">
    <div class="card hero-panel">
      <h2>Welcome</h2>
      <p class="muted">Sign in to browse the full scenario library, assign teams, review notifications, and step through the matching playbooks.</p>
      
    </div>
    <div class="card">
      <h2>Login</h2>
      <p class="small">This build starts at login and requires MFA.</p>
      <div class="stack">
        <div><div class="small">Email</div><input id="emailInput" class="input" placeholder="you@example.com"></div>
        <div><div class="small">Password</div><input id="passwordInput" class="input" type="password" placeholder="Any password for demo"></div>
        <button type="button" class="btn primary" id="continueMfaBtn">Continue to MFA</button>
      </div>
    </div>
  </div>`;
  byId("continueMfaBtn").onclick=()=>{
    const email=byId("emailInput").value.trim();
    if(!email) return alert("Enter an email.");
    state.pendingEmail=email;
    byId("loginTab").innerHTML=`<div class="hero">
      <div class="card hero-panel">
        <h2>MFA Verification</h2>
        <div class="notice callout">Demo MFA code: <strong>123456</strong></div>
      </div>
      <div class="card">
        <h2>Verify MFA</h2>
        <div class="stack">
          <div><div class="small">MFA code</div><input id="mfaInput" class="input" placeholder="123456"></div>
          <div class="row"><button type="button" class="btn primary" id="verifyMfaBtn">Verify MFA</button><button type="button" class="btn secondary" id="useDemoBtn">Use Demo Code</button></div>
        </div>
      </div>
    </div>`;
    byId("verifyMfaBtn").onclick=verifyMfa;
    byId("useDemoBtn").onclick=()=>{ byId("mfaInput").value="123456"; verifyMfa(); };
  };
}
function verifyMfa(){
  const code = byId("mfaInput").value.trim();
  if(code !== "123456") return alert("Invalid demo MFA code.");
  state.user = state.pendingEmail || "demo@example.com";
  if(byId("userBadge")) byId("userBadge").textContent = `Signed in: ${state.user}`;
  if(byId("tenantBadge")) byId("tenantBadge").textContent = `${tenantDisplayName()} / ${clientDisplayName()}`;
  if(!state.environmentSystems || !state.environmentSystems.length) state.environmentSystems = suggestedSystemsForScenario();
  renderDashboard();
  renderLibrary();
  renderSetup();
  renderNotify();
  renderRun();
  if(typeof renderDocuments === 'function') renderDocuments();
  document.querySelectorAll(".tab").forEach(el=>el.classList.remove("active"));
  document.querySelectorAll(".nav-btn[data-tab]").forEach(el=>el.classList.remove("active"));
  if(byId("dashboardTab")) byId("dashboardTab").classList.add("active");
  const dashBtn = document.querySelector('.nav-btn[data-tab="dashboard"]');
  if(dashBtn) dashBtn.classList.add("active");
  state.tab = "dashboard";
}
function renderDashboard(){
  if(!state.user){ byId("dashboardTab").innerHTML=`<div class="card"><div class="warn">Sign in first.</div></div>`; return; }
  byId("tenantBadge").textContent=`${tenantDisplayName()} / ${clientDisplayName()}`;
  byId("dashboardTab").innerHTML=`<div class="grid g4">
    <div class="card"><div class="small">Scenarios Loaded</div><div class="metric">${scenarios.length}</div></div>
    <div class="card"><div class="small">Playbooks Loaded</div><div class="metric">${playbooks.length}</div></div>
    <div class="card"><div class="small">Current Scenario</div><div class="metric" style="font-size:22px">${escapeHtml(currentScenario()?.title || "None")}</div></div>
    <div class="card"><div class="small">Team Members</div><div class="metric">${state.team.length}</div></div>
  </div>
  <div class="grid g2">
    <div class="card">
      <h2 style="margin-top:0">Tenant Context</h2>
      <div class="small">MSP</div>
      <select id="tenantSelect" class="select">${tenants.map(t=>`<option value="${escapeAttr(t.id)}" ${t.id===state.selectedTenantId?'selected':''}>${escapeHtml(t.name)}</option>`).join("")}</select>
      <div class="small" style="margin-top:10px">Client</div>
      <select id="clientSelect" class="select">${(currentTenant()?.clients||[]).map(c=>`<option value="${escapeAttr(c.id)}" ${c.id===state.selectedClientId?'selected':''}>${escapeHtml(c.name)}</option>`).join("")}</select>
      <div class="small" style="margin-top:10px">Custom tenant context name</div>
      <input id="customTenantName" class="input" placeholder="Optional custom tenant name..." value="${escapeAttr(state.customTenantName || "")}">
      <div class="task-card" style="margin-top:12px">
        <div><strong>Suggested Hardware and Software for This Scenario</strong></div>
        <div class="small" style="margin-top:6px">These recommended systems will be used by the simulator as the fictitious environment reference for this scenario.</div>
        <ul style="margin:10px 0 0 18px">${suggestedSystemsForScenario().map(s=>`<li>${escapeHtml(s)}</li>`).join("")}</ul>
      </div>
      <div class="row" style="margin-top:12px"><button type="button" class="btn primary" id="saveTenantBtn">Save Context</button></div>
    </div>
    <div class="card">
      <h2 style="margin-top:0">Quick Start</h2>
      <div class="stack">
        <button type="button" class="btn secondary" id="qsLibraryBtn">Browse all 100 scenarios</button>
        <button type="button" class="btn secondary" id="qsSetupBtn">Set up the selected scenario</button>
        <button type="button" class="btn secondary" id="qsRunBtn">Open the guided run</button>
      </div>
    </div>
  </div>`;
  byId("saveTenantBtn").onclick=()=>{
    state.selectedTenantId=byId("tenantSelect").value;
    const kids=(tenants.find(t=>t.id===state.selectedTenantId)?.clients)||[];
    state.selectedClientId=byId("clientSelect")?.value || kids[0]?.id || "";
    state.customTenantName = byId("customTenantName")?.value?.trim() || "";
    state.environmentSystems = suggestedSystemsForScenario();
    byId("tenantBadge").textContent=`${tenantDisplayName()} / ${clientDisplayName()}`;
    renderDashboard();
    alert("Context has been saved.");
  };
  byId("qsLibraryBtn").onclick=()=>setTab("library");
  byId("qsSetupBtn").onclick=()=>setTab("setup");
  byId("qsRunBtn").onclick=()=>setTab("run");
}
function renderLibrary(){
  if(!state.user){ byId("libraryTab").innerHTML=`<div class="card"><div class="warn">Sign in first.</div></div>`; return; }
  const q=(state.search||"").toLowerCase();
  const list=scenarios.filter(s=>!q || [s.title,s.incidentType,s.startingSituation,s.description,s.detailedExplanation].join(" ").toLowerCase().includes(q));
  const rows=list.map(s=>`<tr><td>${escapeHtml(s.title)}</td><td>${escapeHtml(s.incidentType||"")}</td><td>${escapeHtml(s.startingSituation||"")}</td><td><button type="button" class="btn primary choose-scenario-btn" data-scenario-id="${escapeAttr(s.id)}">Choose</button></td></tr>`).join("");
  byId("libraryTab").innerHTML=`<div class="card"><h2>Scenario Library</h2><p class="small">All ${scenarios.length} scenarios are loaded here.</p><div class="search-wrap"><input id="searchBox" class="input" style="max-width:420px" placeholder="Search scenarios..." value="${escapeAttr(state.search)}"><span class="badge">${list.length} results</span></div><div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Scenario</th><th>Type</th><th>Starting Situation</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  byId("searchBox").oninput=(e)=>{ state.search=e.target.value; renderLibrary(); };
  document.querySelectorAll(".choose-scenario-btn").forEach(btn=>{
    btn.onclick=()=>{
      const scenarioId = btn.getAttribute("data-scenario-id");
      if(scenarioId) selectScenario(scenarioId);
    };
  });
}
function selectScenario(id){
  state.selectedScenarioId = id;
  state.currentStepIndex = 0;
  state.revealedInjectCount = 1;
  if(typeof stopInjectTimer === "function") stopInjectTimer();
  state.environmentSystems = suggestedSystemsForScenario();
  state.roleAssignments = {};
  state.taskAssignments = {};
  state.notificationsGenerated = false;
  state.notificationPreview = [];
  state.notificationsSent = false;
  renderDashboard();
  renderLibrary();
  renderSetup();
  renderNotify();
  renderRun();
  if(typeof renderDocuments === 'function') renderDocuments();
  setTab("setup");
}
function addTeamMember(){
  const f=state.form;
  if(!f.firstName.trim()||!f.lastName.trim()) return alert("Enter first and last name.");
  const newMember={id:crypto.randomUUID(),firstName:f.firstName.trim(),lastName:f.lastName.trim(),title:f.title.trim(),role:f.role.trim(),email:f.email.trim(),phone:f.phone.trim()};
  state.team.push(newMember);
  syncRoleAssignmentsFromTeam();
  state.form={firstName:"",lastName:"",title:"",role:"",email:"",phone:""};
  renderSetup();
}
function editTeamMember(id){
  const m=state.team.find(x=>x.id===id); if(!m) return;
  state.editingMemberId=id;
  state.form={firstName:m.firstName,lastName:m.lastName,title:m.title,role:m.role,email:m.email,phone:m.phone};
  renderSetup();
}
function saveEditedMember(){
  const m=state.team.find(x=>x.id===state.editingMemberId); if(!m) return;
  Object.assign(m,{...state.form});
  syncRoleAssignmentsFromTeam();
  state.editingMemberId=null;
  state.form={firstName:"",lastName:"",title:"",role:"",email:"",phone:""};
  renderSetup();
}
function removeTeamMember(id){
  state.team=state.team.filter(x=>x.id!==id);
  Object.keys(state.roleAssignments).forEach(role=>{ if(state.roleAssignments[role]===id) delete state.roleAssignments[role]; });
  Object.keys(state.taskAssignments).forEach(key=>{ if(state.taskAssignments[key]===id) delete state.taskAssignments[key]; });
  renderAll();
}
function setRoleAssignment(role, memberId){ if(memberId) state.roleAssignments[role]=memberId; else delete state.roleAssignments[role]; renderAll(); }
function setTaskAssignment(key, memberId){ if(memberId) state.taskAssignments[key]=memberId; else delete state.taskAssignments[key]; renderAll(); }
function renderSetup(){
  if(!state.user){ byId("setupTab").innerHTML=`<div class="card"><div class="warn">Sign in first.</div></div>`; return; }
  syncRoleAssignmentsFromTeam();
  const s=currentScenario(); const taskRows=allTaskRows();
  if(!s){ byId("setupTab").innerHTML=`<div class="card"><div class="warn">Choose a scenario first.</div></div>`; return; }
  byId("setupTab").innerHTML=`<div class="card"><h2>Exercise Setup</h2><div class="notice"><strong>Scenario:</strong> ${escapeHtml(s.title)}</div><div class="row" style="margin-top:12px"><button type="button" class="btn secondary" onclick="setTab('library')">Change Scenario</button><button type="button" class="btn primary" onclick="setTab('notify')">Continue to Notification Page</button></div></div>
  <div class="grid g2">
    <div class="card">
      <h3 style="margin-top:0">${state.editingMemberId ? 'Edit Team Member' : 'Add Team Member'}</h3>
      <div class="grid g2">
        <div><div class="small">First name</div><input id="fName" class="input" value="${escapeAttr(state.form.firstName)}"></div>
        <div><div class="small">Last name</div><input id="lName" class="input" value="${escapeAttr(state.form.lastName)}"></div>
        <div><div class="small">Title</div><input id="title" class="input" value="${escapeAttr(state.form.title)}"></div>
        <div><div class="small">Role</div><select id="role" class="select"><option value="">Select role</option>${availableRoles.map(r=>`<option value="${escapeAttr(r)}" ${state.form.role===r?'selected':''}>${escapeHtml(r)}</option>`).join("")}</select></div>
        <div><div class="small">Email</div><input id="email" class="input" value="${escapeAttr(state.form.email)}"></div>
        <div><div class="small">Phone</div><input id="phone" class="input" value="${escapeAttr(state.form.phone)}"></div>
      </div>
      <div class="row" style="margin-top:12px">
        <button type="button" class="btn primary" id="saveMemberBtn">${state.editingMemberId ? 'Update Team Member' : 'Save Team Member'}</button>
        <button type="button" class="btn secondary" id="clearMemberBtn">Clear</button>
      </div>
    </div>
    <div class="card">
      <h3 style="margin-top:0">Assign Team to Roles</h3>
      <div class="table-wrap"><table><thead><tr><th>Role</th><th>Assigned Team Member</th></tr></thead><tbody>
      ${suggestedRoles().map(role=>`<tr><td>${escapeHtml(role)}</td><td><select class="select" onchange="setRoleAssignment('${escapeAttr(role)}', this.value)">${teamOptions(state.roleAssignments[role]||"")}</select></td></tr>`).join("")}
      </tbody></table></div>
    </div>
  </div>
  <div class="card">
    <h3 style="margin-top:0">Saved Team Members</h3>
    <div class="table-wrap"><table><thead><tr><th>Name</th><th>Title / Role</th><th>Email</th><th>Phone</th><th>Action</th></tr></thead><tbody>
    ${state.team.length ? state.team.map(m=>`<tr><td>${escapeHtml(m.firstName)} ${escapeHtml(m.lastName)}</td><td>${escapeHtml(m.title||"")}<br><span class="small">${escapeHtml(m.role||"")}</span></td><td>${escapeHtml(m.email||"")}</td><td>${escapeHtml(m.phone||"")}</td><td><div class="row"><button type="button" class="btn secondary" onclick="editTeamMember('${escapeAttr(m.id)}')">Edit</button><button type="button" class="btn warn" onclick="removeTeamMember('${escapeAttr(m.id)}')">Remove</button></div></td></tr>`).join("") : `<tr><td colspan="5">No team members saved yet.</td></tr>`}
    </tbody></table></div>
  </div>
  <div class="card">
    <h3 style="margin-top:0">Fictitious Environment Setup</h3>
    <div class="small">The simulator now uses the recommended environment for the selected scenario. The systems below are the environment reference for this exercise.</div>
    <div class="task-card" style="margin-top:12px">
      <div><strong>Suggested systems for this scenario</strong></div>
      <ul style="margin:10px 0 0 18px">${suggestedSystemsForScenario().map(s=>`<li>${escapeHtml(s)}</li>`).join("")}</ul>
    </div>
  </div>
  <div class="card">
    <h3 style="margin-top:0">Assign People to Individual Tasks</h3>
    <div class="small">All 100 playbooks are loaded. Tasks inherit from role assignment unless you override them here.</div>
    <div class="table-wrap" style="margin-top:10px"><table><thead><tr><th>Step</th><th>Task</th><th>Role</th><th>Assigned Person</th></tr></thead><tbody>
    ${taskRows.length ? taskRows.map(r=>`<tr><td>${escapeHtml(r.stepName)}</td><td>${escapeHtml(r.task)}</td><td>${escapeHtml(r.role)}</td><td><select class="select" onchange="setTaskAssignment('${escapeAttr(r.key)}', this.value)">${teamOptions(state.taskAssignments[r.key] || state.roleAssignments[r.role] || "")}</select></td></tr>`).join("") : `<tr><td colspan="4">No playbook matched this scenario.</td></tr>`}
    </tbody></table></div>
  </div>`;
  byId("saveMemberBtn").onclick=()=>{
    state.form={firstName:byId("fName").value.trim(),lastName:byId("lName").value.trim(),title:byId("title").value.trim(),role:byId("role").value.trim(),email:byId("email").value.trim(),phone:byId("phone").value.trim()};
    state.editingMemberId ? saveEditedMember() : addTeamMember();
  };
  byId("clearMemberBtn").onclick=()=>{ state.editingMemberId=null; state.form={firstName:"",lastName:"",title:"",role:"",email:"",phone:""}; renderSetup(); };
}
function notificationRows(){
  syncRoleAssignmentsFromTeam();
  const rows=allTaskRows();
  const byMember={};

  // Start with every saved team member so they are available on the notification screen.
  state.team.forEach(member=>{
    byMember[member.id]={member, roles:new Set(), tasks:[]};
    if(member.role){ byMember[member.id].roles.add(member.role); }
  });

  // Add explicit role assignments from the role table.
  Object.entries(state.roleAssignments).forEach(([role, memberId])=>{
    const member=state.team.find(m=>m.id===memberId);
    if(!member) return;
    if(!byMember[memberId]) byMember[memberId]={member, roles:new Set(), tasks:[]};
    byMember[memberId].roles.add(role);
  });

  // Add task assignments and inherited role assignments from playbook steps.
  rows.forEach(r=>{
    const fallbackMemberId = state.taskAssignments[r.key] || state.roleAssignments[r.role] || state.team.find(m=>normalizeRole(m.role)===normalizeRole(r.role))?.id;
    if(!fallbackMemberId) return;
    const member=state.team.find(m=>m.id===fallbackMemberId);
    if(!member) return;
    if(!byMember[fallbackMemberId]) byMember[fallbackMemberId]={member, roles:new Set(), tasks:[]};
    byMember[fallbackMemberId].roles.add(r.role);
    byMember[fallbackMemberId].tasks.push(`${r.stepName}: ${r.task}`);
  });

  // Return all saved team members, with any roles/tasks found.
  return Object.values(byMember);
}




function buildNotificationPreview(){
  const s = currentScenario();
  const people = notificationRows();
  return people.map(p => {
    const roles = Array.from(p.roles || []);
    const email = p.member?.email || "";
    const phone = p.member?.phone || "";
    const hasEmail = !!String(email).trim();
    const hasPhone = !!String(phone).trim();
    const channel = hasEmail && hasPhone ? "Email + Text" : hasEmail ? "Email" : hasPhone ? "Text" : "No delivery target";
    const message = `${s.title} incident declared. You are assigned as ${roles.join(", ") || "response team member"}. Meet at ${state.meetingLocation} at ${state.meetingTime}. ${state.meetingNotes}`.trim();
    return { name: `${p.member.firstName} ${p.member.lastName}`.trim(), email, phone, roles, tasks: p.tasks || [], channel, message };
  });
}

async function sendLiveNotifications(){
  const s = currentScenario();
  const preview = (state.notificationPreview && state.notificationPreview.length) ? state.notificationPreview : buildNotificationPreview();
  const notifications = preview
    .filter(n => String(n.email || "").trim() || String(n.phone || "").trim())
    .map(n => ({ name: n.name, email: n.email || "", phone: n.phone || "", message: n.message }));

  if(!notifications.length){
    throw new Error("There are no email addresses or phone numbers available for the selected team members.");
  }

  const res = await fetch("/api/send-notifications", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      scenarioTitle: s.title,
      meetingLocation: state.meetingLocation,
      meetingTime: state.meetingTime,
      notes: state.meetingNotes,
      notifications
    })
  });

  let data = {};
  try { data = await res.json(); } catch(e) {}
  if(!res.ok){ throw new Error(data.error || "Notification request failed."); }
  return data;
}



function getStepNote(stepKey){
  return state.stepNotes[stepKey] || {did:"", found:""};
}
function updateStepNote(stepKey, field, value){
  const note = getStepNote(stepKey);
  note[field] = value;
  state.stepNotes[stepKey] = note;
}
function openStepNotes(stepKey, stepName, taskName){
  const note = getStepNote(stepKey);
  byId("dashboardTab").innerHTML=`<div class="card"><h2>Step Notes</h2>
    <div class="notice"><strong>Step:</strong> ${escapeHtml(stepName)}</div>
    <div class="notice" style="margin-top:10px"><strong>Task:</strong> ${escapeHtml(taskName)}</div>
    <div style="margin-top:12px"><div class="small">What they actually did</div><textarea id="stepDidBox" class="textarea">${escapeHtml(note.did || "")}</textarea></div>
    <div style="margin-top:12px"><div class="small">What they found</div><textarea id="stepFoundBox" class="textarea">${escapeHtml(note.found || "")}</textarea></div>
    <div class="row" style="margin-top:12px">
      <button type="button" class="btn primary" id="saveStepNotesBtn">Save Step Notes</button>
      <button type="button" class="btn secondary" id="backToRunBtn">Return to Guided Run</button>
    </div>
  </div>`;
  byId("saveStepNotesBtn").onclick=()=>{
    updateStepNote(stepKey, "did", byId("stepDidBox").value.trim());
    updateStepNote(stepKey, "found", byId("stepFoundBox").value.trim());
    alert("Step notes saved.");
  };
  byId("backToRunBtn").onclick=()=>{ renderRun(); setTab("run"); };
  setTab("dashboard");
}
function stepArtifacts(stepName){
  const s=String(stepName||"").toLowerCase();
  if(s.includes("detect")) return ["Phishing Email","Email Headers","SIEM Alert"];
  if(s.includes("triage")) return ["Authentication Log","User Report","SIEM Alert"];
  if(s.includes("contain")) return ["Identity Log","Containment Action Record","Firewall Change Log"];
  if(s.includes("investigat") || s.includes("analysis") || s.includes("scope")) return ["Cloud Access Log","Threat Intel Report","Endpoint Alert"];
  if(s.includes("recover")) return ["Recovery Checklist","System Health Summary","Executive Briefing"];
  if(s.includes("communicat")) return ["Employee Advisory","Leadership Update","External Notification Draft"];
  if(s.includes("after action")) return ["After Action Review","Lessons Learned Summary","Improvement Plan"];
  return ["Incident Log","Evidence Log"];
}
function artifactBody(type, stepName){
  const scenario = currentScenario();
  const title = scenario?.title || "Incident Simulation";
  const step = stepName || "Current Step";
  const bodies = {
    "Phishing Email": `<p><strong>Subject:</strong> Immediate Password Reset Verification Required</p><p>An email impersonating IT asks the recipient to verify their account using an external link.</p>`,
    "Email Headers": `<pre>Return-Path: no-reply@suspicious-reset.example\nSPF: fail\nDKIM: none\nDMARC: fail</pre>`,
    "SIEM Alert": `<pre>Alert: Suspicious Authentication Activity\nSeverity: High\nUser: employee@company.example\nSource: 203.0.113.77</pre>`,
    "Authentication Log": `<pre>${new Date().toISOString()}  employee@company.example  Successful login  203.0.113.77</pre>`,
    "User Report": `<p>User states they clicked a password reset email and entered credentials into a page that looked similar to Microsoft 365.</p>`,
    "Identity Log": `<pre>Session revoked\nPassword reset enforced\nMFA re-registration pending</pre>`,
    "Containment Action Record": `<p>Account disabled, sessions revoked, password reset required, monitoring expanded.</p>`,
    "Firewall Change Log": `<pre>Blocked source IP 203.0.113.77 and related indicators.</pre>`,
    "Cloud Access Log": `<pre>Attempted access to SharePoint Finance folder detected from suspicious session.</pre>`,
    "Threat Intel Report": `<p>Indicators overlap with recent credential harvesting campaign using lookalike login portals.</p>`,
    "Endpoint Alert": `<pre>No malware detected. Browser artifacts indicate credential harvesting activity.</pre>`,
    "Recovery Checklist": `<p>Validate account access, confirm no further suspicious logins, re-enable services in controlled order.</p>`,
    "System Health Summary": `<p>Core systems operational. Monitoring remains elevated while investigation continues.</p>`,
    "Executive Briefing": `<p>One account affected, business impact under review, no confirmed widespread compromise.</p>`,
    "Employee Advisory": `<p>Employees should avoid the phishing email, report suspicious messages, and reset passwords if they clicked the link.</p>`,
    "Leadership Update": `<p>Response actions underway. Containment in progress. Follow-up update scheduled for leadership.</p>`,
    "External Notification Draft": `<p>Draft language for regulator, customer, or partner notification if disclosure becomes necessary.</p>`,
    "After Action Review": `<p>Document what worked, what slowed the response, and what controls should be improved.</p>`,
    "Lessons Learned Summary": `<p>Need improved phishing resistance, faster user reporting, and stronger conditional access controls.</p>`,
    "Improvement Plan": `<p>Assign action owners, due dates, and control enhancements for future preparedness.</p>`,
    "Incident Log": `<p>Chronological log of actions, findings, and decisions for this simulation.</p>`,
    "Evidence Log": `<p>Collected indicators, screenshots, alerts, and authentication events tied to the incident.</p>`
  };
  return `<h1 style="margin-top:0">${type}</h1><p><strong>Scenario:</strong> ${title}</p><p><strong>Step:</strong> ${step}</p>${bodies[type] || "<p>Generated artifact for the current exercise step.</p>"}`;
}
function openGeneratedArtifact(type, stepName){
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${type}</title><style>
  body{font-family:Arial,sans-serif;margin:0;background:#f4f7fb;color:#17212f}
  .toolbar{background:#16324f;color:#fff;padding:12px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .toolbar button{padding:10px 14px;border:0;border-radius:8px;cursor:pointer}
  .page{width:8.5in;min-height:11in;margin:18px auto;background:#fff;padding:.6in;box-shadow:0 10px 30px rgba(0,0,0,.12)}
  @media print{.toolbar{display:none}.page{margin:0;box-shadow:none;width:auto;min-height:auto}body{background:#fff}}
  pre{white-space:pre-wrap;background:#f8fbfd;border:1px solid #cbd7e3;padding:12px;border-radius:10px}
  </style></head><body><div class="toolbar"><strong>Generated Artifact</strong><button onclick="window.print()">Print / Save as PDF</button><button onclick="window.close()">Close</button></div><div class="page">${artifactBody(type, stepName)}</div></body></html>`;
  const blob = new Blob([html], {type:"text/html"});
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if(!w){
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }
  setTimeout(()=>URL.revokeObjectURL(url), 60000);
}
function revealNextInject(){
  const timeline = scenarioTimeline();
  if(state.revealedInjectCount < timeline.length){
    state.revealedInjectCount += 1;
    renderRun();
  }
}
function stopInjectTimer(){
  if(state.injectTimer){
    clearInterval(state.injectTimer);
    state.injectTimer = null;
  }
  state.injectAutoRun = false;
}
function startInjectTimer(){
  stopInjectTimer();
  state.injectAutoRun = true;
  state.injectTimer = setInterval(()=>{
    const timeline = scenarioTimeline();
    if(state.revealedInjectCount < timeline.length){
      state.revealedInjectCount += 1;
      renderRun();
    } else {
      stopInjectTimer();
      renderRun();
    }
  }, Math.max(5, Number(state.injectIntervalSeconds || 30)) * 1000);
}
function renderNotify(){
  if(!state.user){
    byId("notifyTab").innerHTML=`<div class="card"><div class="warn">Sign in first.</div></div>`;
    return;
  }
  syncRoleAssignmentsFromTeam();
  const s=currentScenario();
  if(!s){
    byId("notifyTab").innerHTML=`<div class="card"><div class="warn">Choose a scenario first.</div></div>`;
    return;
  }
  const people=notificationRows();
  const preview = Array.isArray(state.notificationPreview) ? state.notificationPreview : [];

  byId("notifyTab").innerHTML=`<div class="card"><h2>Team Notification Center</h2><p class="small">Use Generate Preview to review the exact message, recipients, and delivery channel before sending. After preview is generated, Send Notifications will deliver the hosted email and text notifications.</p></div>
  <div class="split">
    <div class="card">
      <h3 style="margin-top:0">Meeting & Scenario Details</h3>
      <div class="notice"><strong>Scenario:</strong> ${escapeHtml(s.title)}</div>
      <div style="margin-top:10px"><div class="small">Meeting location</div><input id="meetLoc" class="input" value="${escapeAttr(state.meetingLocation)}"></div>
      <div class="grid g2" style="margin-top:10px">
        <div><div class="small">Meeting date</div><input id="meetDate" class="input" type="date" value="${escapeAttr(state.meetingDate || "")}"></div>
        <div><div class="small">Meeting time</div><input id="meetTimeOnly" class="input" type="time" value="${escapeAttr(state.meetingTimeOnly || "")}"></div>
      </div>
      <div class="notice" style="margin-top:10px"><strong>Scheduled meeting:</strong> ${escapeHtml(state.meetingTime || "Not set")}</div>
      <div style="margin-top:10px"><div class="small">Notes / instructions</div><textarea id="meetNotes" class="textarea">${escapeHtml(state.meetingNotes)}</textarea></div>
      <div class="row" style="margin-top:12px">
        <button type="button" class="btn secondary" id="saveNotifySettingsBtn">Save Details</button>
        <button type="button" class="btn primary" id="generatePreviewBtn">Generate Preview</button>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-top:0">Assigned Team</h3>
      <div class="small" style="margin-bottom:10px">Saved team members now carry over automatically to this screen. Role and task assignments are shown when available.</div>
      <div class="table-wrap"><table><thead><tr><th>Person</th><th>Roles</th><th>Assigned Tasks</th></tr></thead><tbody>
      ${people.length ? people.map(p=>`<tr><td>${escapeHtml(p.member.firstName)} ${escapeHtml(p.member.lastName)}<br><span class="small">${escapeHtml(p.member.email||"(no email)")} · ${escapeHtml(p.member.phone||"(no phone)")}</span></td><td>${escapeHtml(Array.from(p.roles).join(", ") || "No role")}</td><td>${p.tasks.length ? `<ul>${p.tasks.map(t=>`<li>${escapeHtml(t)}</li>`).join("")}</ul>` : `<span class="small">No explicit task assignments yet</span>`}</td></tr>`).join("") : `<tr><td colspan="3">No assigned team yet. Go back to setup.</td></tr>`}
      </tbody></table></div>
    </div>

    <div class="card">
      <h3 style="margin-top:0">Notification Preview</h3>
      ${preview.length ? preview.map(p=>`
        <div class="task-card">
          <div><strong>${escapeHtml(p.name)}</strong></div>
          <div class="small">Delivery: ${escapeHtml(p.channel)}</div>
          <div class="small">Email: ${escapeHtml(p.email || "(none)")}</div>
          <div class="small">Text: ${escapeHtml(p.phone || "(none)")}</div>
          <div class="notice" style="margin-top:10px"><strong>Message Preview:</strong><br>${escapeHtml(p.message)}</div>
        </div>
      `).join("") : `<div class="warn">Generate Preview to see what the message will look like, who it will be sent to, and whether the delivery method is email, text, or both.</div>`}
      <div class="row" style="margin-top:12px">
        <button type="button" class="btn secondary" id="backToSetupBtn">Back to Setup</button>
        <button type="button" class="btn primary" id="sendNotifyBtn" ${preview.length ? "" : "disabled"}>Send Notifications</button>
        <button type="button" class="btn secondary" id="continueRunBtn">Continue to Guided Run</button>
      </div>
    </div>
  </div>`;

  function syncFormToState(){
    state.meetingLocation = byId("meetLoc").value.trim() || state.meetingLocation;
    state.meetingDate = byId("meetDate").value || state.meetingDate;
    state.meetingTimeOnly = byId("meetTimeOnly").value || state.meetingTimeOnly;
    syncMeetingTimestamp();
    state.meetingNotes = byId("meetNotes").value.trim();
  }

  byId("saveNotifySettingsBtn").onclick = () => {
    syncFormToState();
    alert("Notification details saved.");
  };

  byId("generatePreviewBtn").onclick = () => {
    syncFormToState();
    const built = buildNotificationPreview();
    state.notificationPreview = built;
    state.notificationsGenerated = true;
    state.notificationsSent = false;
    renderNotify();
    if(!built.length){
      alert("No recipients are available to preview yet. Please add or assign team members first.");
    }
  };

  const sendBtn = byId("sendNotifyBtn");
  if(sendBtn){
    sendBtn.onclick = async () => {
      try{
        syncFormToState();
        sendBtn.disabled = true;
        sendBtn.textContent = "Sending...";
        const result = await sendLiveNotifications();
        state.notificationsSent = true;
        alert(`Notifications sent. Emails: ${result.emailCount || 0}. Texts: ${result.smsCount || 0}.`);
        renderNotify();
      }catch(err){
        alert(`Notification send failed: ${err.message}`);
        renderNotify();
      }
    };
  }

  byId("backToSetupBtn").onclick = () => setTab("setup");
  byId("continueRunBtn").onclick = () => setTab("run");
}
function renderRun(){
  if(!state.user){ byId("runTab").innerHTML=`<div class="card"><div class="warn">Sign in first.</div></div>`; return; }
  const scenario=currentScenario(); const playbook=currentPlaybook();
  if(!scenario){ byId("runTab").innerHTML=`<div class="card"><div class="warn">Choose a scenario first.</div></div>`; return; }
  if(!playbook){ byId("runTab").innerHTML=`<div class="card"><div class="warn">No playbook matched this scenario. Manual mapping may be needed.</div></div>`; return; }
  const steps=playbook.steps||[];
  const currentStep=steps[state.currentStepIndex];
  const currentStepName=typeof currentStep==="string" ? currentStep : (currentStep?.name || currentStep?.step_name);
  const currentTasks=buildStepTasks(currentStep);
  const timeline=scenarioTimeline();
  if(!state.revealedInjectCount || state.revealedInjectCount < 1) state.revealedInjectCount = 1;
  const shownInjects = timeline.slice(0, state.revealedInjectCount);
  const artifacts = stepArtifacts(currentStepName);

  byId("runTab").innerHTML=`<div class="grid g2">
    <div class="card">
      <h2>Scenario Timeline & Inject Engine</h2>
      <div class="small" style="margin-bottom:10px">Use manual or automated injects to progressively reveal new scenario events during the exercise.</div>
      <div class="stack">${shownInjects.map(item=>`<div class="notice">${escapeHtml(item)}</div>`).join("")}</div>
      <div class="task-card" style="margin-top:12px">
        <div><strong>Inject Controls</strong></div>
        <div class="row" style="margin-top:10px">
          <button type="button" class="btn secondary" id="revealInjectBtn" ${state.revealedInjectCount >= timeline.length ? "disabled" : ""}>Reveal Next Inject</button>
          <input id="injectIntervalBox" class="input" type="number" min="5" value="${escapeAttr(state.injectIntervalSeconds || 30)}" style="max-width:120px">
          <button type="button" class="btn secondary" id="startInjectBtn">${state.injectAutoRun ? "Auto Injects Running" : "Start Auto Injects"}</button>
          <button type="button" class="btn secondary" id="stopInjectBtn">Stop Auto Injects</button>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Current Guided Step</h2>
      <div class="notice"><strong>${escapeHtml(currentStepName||"Step")}</strong></div>
      <div class="task-card" style="margin-top:12px">
        <div><strong>What this step means</strong></div>
        <div class="small" style="margin-top:6px;color:#2f4358">${escapeHtml(stepMeaning(currentStepName))}</div>
      </div>
      <div class="task-card" style="margin-top:12px">
        <div><strong>How to accomplish this step</strong></div>
        <ul style="margin:10px 0 0 18px; padding:0">${stepHowTo(currentStepName).map(item=>`<li style="margin:6px 0; color:#2f4358">${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
      <div class="task-card" style="margin-top:12px">
        <div><strong>Equipment / Software to Review</strong></div>
        <ul style="margin:10px 0 0 18px">${stepTools(currentStepName).map(t=>`<li style="margin:6px 0;color:#2f4358">${escapeHtml(t)}</li>`).join("")}</ul>
      </div>
      <div class="task-card" style="margin-top:12px">
        <div><strong>Generated Artifacts for This Step</strong></div>
        <div class="small" style="margin-top:6px">Open realistic example artifacts tied to this phase of the exercise.</div>
        <div style="margin-top:8px">${artifacts.map(a=>`<span class="badge-link" onclick="openGeneratedArtifact('${escapeAttr(a)}','${escapeAttr(currentStepName||"Step")}')">${escapeHtml(a)}</span>`).join("")}</div>
      </div>
      <div class="stack" style="margin-top:12px">
        ${currentTasks.map((t,idx)=>{const key=`${state.currentStepIndex}:${idx}`; const person=assignedNameForTask(key, t.role); return `<div class="task-card"><div><strong>${escapeHtml(t.task)}</strong></div><div class="small">Role: ${escapeHtml(t.role)} · Assigned to: ${escapeHtml(person || "Unassigned")}</div><div style="margin-top:8px">${docsForTask(t.task).map(doc=>`<span class="badge-link" onclick="openForm('${escapeAttr(doc)}','${escapeAttr(t.task)}','${escapeAttr(person||"")}')">${escapeHtml(doc)}</span>`).join("")}<span class="badge-link" onclick="openStepNotes('${escapeAttr(key)}','${escapeAttr(currentStepName||'Step')}','${escapeAttr(t.task)}')">Step Notes</span></div></div>`;}).join("")}
      </div>
      <div class="row" style="margin-top:12px">
        <button type="button" class="btn secondary" id="prevStepBtn" ${state.currentStepIndex===0?"disabled":""}>Previous Step</button>
        ${((String(currentStepName||"").toLowerCase().includes("after action")) || state.currentStepIndex>=steps.length-1) ? `<button type="button" class="btn primary" id="endSimulationBtn">End Simulation</button>` : `<button type="button" class="btn primary" id="nextStepBtn">Continue to Next Step</button>`}
      </div>
    </div>
  </div>
  <div class="card"><h3 style="margin-top:0">Overview of All Titles, Tasks, and Assignments</h3><div class="table-wrap"><table><thead><tr><th>Step</th><th>Task</th><th>Role</th><th>Assigned Person</th></tr></thead><tbody>
  ${allTaskRows().map(r=>`<tr><td>${escapeHtml(r.stepName)}</td><td>${escapeHtml(r.task)}</td><td>${escapeHtml(r.role)}</td><td>${escapeHtml(assignedNameForTask(r.key, r.role) || "Unassigned")}</td></tr>`).join("")}
  </tbody></table></div></div>`;

  byId("prevStepBtn").onclick=()=>{ if(state.currentStepIndex>0){ state.currentStepIndex-=1; renderRun(); } };
  const endBtn = byId("endSimulationBtn");
  if(endBtn){
    endBtn.onclick=()=>{ state.summaryNotes=""; stopInjectTimer(); renderSummary(); setTab("dashboard"); };
  }
  const nextBtn = byId("nextStepBtn");
  if(nextBtn){
    nextBtn.onclick=()=>{ if(state.currentStepIndex<steps.length-1){ state.currentStepIndex+=1; state.revealedInjectCount=Math.max(state.revealedInjectCount,state.currentStepIndex+1); renderRun(); } };
  }
  if(byId("revealInjectBtn")) byId("revealInjectBtn").onclick=()=>revealNextInject();
  if(byId("startInjectBtn")) byId("startInjectBtn").onclick=()=>{ state.injectIntervalSeconds=Number(byId("injectIntervalBox").value||30); startInjectTimer(); renderRun(); };
  if(byId("stopInjectBtn")) byId("stopInjectBtn").onclick=()=>{ stopInjectTimer(); renderRun(); };
}
function saveSimulationSummary(){
  const record = gatherSimulationRecord();
  if(record.simulationName){
    const idx = state.completedSimulations.findIndex(x => x.simulationName===record.simulationName);
    if(idx >= 0) state.completedSimulations.splice(idx,1);
  }
  state.completedSimulations.unshift(record);
  return record;
}
function recordToPdfHtml(record){
  const teamRows = (record.team || []).map(t=>`<tr><td>${escapeHtml(t.name)}</td><td>${escapeHtml(t.title)}</td><td>${escapeHtml(t.role)}</td><td>${escapeHtml(t.email)}</td><td>${escapeHtml(t.phone)}</td></tr>`).join("");
  const stepRows = Object.entries(record.stepNotes || {}).map(([key,val])=>`<div class="box"><strong>${escapeHtml(key)}</strong><div style="margin-top:8px"><strong>What they did:</strong><br>${escapeHtml(val.did || "").replaceAll("\n","<br>")}</div><div style="margin-top:8px"><strong>What they found:</strong><br>${escapeHtml(val.found || "").replaceAll("\n","<br>")}</div></div>`).join("");
  const envList = (record.environmentSystems || []).map(x=>`<li>${escapeHtml(x)}</li>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Simulation Export</title><style>
body{font-family:Arial,sans-serif;margin:0;background:#f4f7fb;color:#17212f}
.toolbar{background:#16324f;color:#fff;padding:12px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.toolbar button{padding:10px 14px;border:0;border-radius:8px;cursor:pointer}
.page{width:8.5in;min-height:11in;margin:18px auto;background:#fff;padding:.6in;box-shadow:0 10px 30px rgba(0,0,0,.12)}
.box{border:1px solid #cbd7e3;background:#f8fbfd;padding:12px;border-radius:10px;margin-top:16px}
table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{border:1px solid #cbd7e3;padding:8px;text-align:left;vertical-align:top}
th{background:#eef4fa}
@media print{.toolbar{display:none}.page{margin:0;box-shadow:none;width:auto;min-height:auto}body{background:#fff}}
</style></head><body><div class="toolbar"><strong>Simulation Export</strong><button onclick="window.print()">Print / Save as PDF</button><button onclick="window.close()">Close</button></div>
<div class="page">
<h1 style="margin-top:0">Incident Simulation Export</h1><div class="box"><strong>Simulation Name</strong><div style="margin-top:8px">${escapeHtml(record.simulationName || "Unnamed Simulation")}</div></div>
<div class="box"><strong>Scenario</strong><div style="margin-top:8px">${escapeHtml(record.scenarioTitle)}</div></div>
<div class="box"><strong>Saved</strong><div style="margin-top:8px">${escapeHtml(record.savedAtLabel)}</div></div>
<div class="box"><strong>Tenant / Client</strong><div style="margin-top:8px">${escapeHtml(record.tenant)} / ${escapeHtml(record.client)}</div></div>
<div class="box"><strong>Meeting</strong><div style="margin-top:8px">${escapeHtml(record.meetingLocation)} · ${escapeHtml(record.meetingTime)}</div></div>
<div class="box"><strong>Fictitious Environment</strong><ul>${envList || "<li>No environment systems listed.</li>"}</ul></div>
<div class="box"><strong>Team</strong><table><thead><tr><th>Name</th><th>Title</th><th>Role</th><th>Email</th><th>Phone</th></tr></thead><tbody>${teamRows || '<tr><td colspan="5">No team listed.</td></tr>'}</tbody></table></div>
<div class="box"><strong>Simulation Summary Notes</strong><div style="margin-top:8px">${escapeHtml(record.summaryNotes || "").replaceAll("\n","<br>") || "No summary notes."}</div></div>
<div class="box"><strong>Per-Step Notes</strong>${stepRows || "<div style='margin-top:8px'>No step notes captured.</div>"}</div>
</div></body></html>`;
}
function exportSimulationPdf(record){
  const html = recordToPdfHtml(record);
  const blob = new Blob([html], {type:"text/html"});
  const url = URL.createObjectURL(blob);
  const w = window.open(url,"_blank","noopener,noreferrer");
  if(!w){
    const a=document.createElement("a");
    a.href=url; a.target="_blank"; a.rel="noopener noreferrer";
    a.click();
  }
  setTimeout(()=>URL.revokeObjectURL(url), 60000);
}
function openSavedSimulation(simId){
  const sim = state.completedSimulations.find(x=>x.id===simId);
  if(!sim) return;
  const teamRows = (sim.team||[]).map(t=>`<tr><td>${escapeHtml(t.name||"")}</td><td>${escapeHtml(t.title||"")}</td><td>${escapeHtml(t.role||"")}</td><td>${escapeHtml(t.email||"")}</td><td>${escapeHtml(t.phone||"")}</td></tr>`).join("");
  const stepRows = Object.entries(sim.stepNotes || {}).map(([key,val])=>`<div class="task-card"><div><strong>${escapeHtml(key)}</strong></div><div class="small" style="margin-top:6px"><strong>What they did:</strong><br>${escapeHtml(val.did || "").replaceAll("\n","<br>")}</div><div class="small" style="margin-top:10px"><strong>What they found:</strong><br>${escapeHtml(val.found || "").replaceAll("\n","<br>")}</div></div>`).join("");
  byId("dashboardTab").innerHTML=`<div class="card"><h2>${escapeHtml(sim.simulationName || sim.scenarioTitle)}</h2>
    <div class="notice"><strong>Scenario:</strong> ${escapeHtml(sim.scenarioTitle || "")}</div>
    <div class="notice" style="margin-top:10px"><strong>Saved:</strong> ${escapeHtml(sim.savedAtLabel || sim.savedAt || "")}</div>
    <div class="notice" style="margin-top:10px"><strong>Meeting:</strong> ${escapeHtml(sim.meetingLocation || "")} · ${escapeHtml(sim.meetingTime || "")}</div>
    <div class="task-card" style="margin-top:12px"><strong>Summary Notes</strong><div class="small" style="margin-top:8px">${escapeHtml(sim.summaryNotes || "").replaceAll("\n","<br>") || "No summary notes."}</div></div>
  </div>
  <div class="card"><h3 style="margin-top:0">Team</h3><div class="table-wrap"><table><thead><tr><th>Name</th><th>Title</th><th>Role</th><th>Email</th><th>Phone</th></tr></thead><tbody>${teamRows || '<tr><td colspan="5">No team saved.</td></tr>'}</tbody></table></div></div>
  <div class="card"><h3 style="margin-top:0">Per-Step Notes</h3>${stepRows || '<div class="small">No per-step notes saved.</div>'}
    <div class="row" style="margin-top:12px"><button type="button" class="btn secondary" id="backSavedListBtn">Back</button><button type="button" class="btn primary" id="exportSavedBtn">Export PDF</button></div>
  </div>`;
  byId("backSavedListBtn").onclick=()=>{ renderSummary(); setTab("dashboard"); };
  byId("exportSavedBtn").onclick=()=>exportSimulationPdf(sim);
}
function renderSummary(){
  if(!state.user){ return; }
  const priorRows = state.completedSimulations.map(sim => `
    <tr>
      <td><a href="#" onclick="openSavedSimulation(\'${escapeAttr(sim.id)}\'); return false;">${escapeHtml(sim.simulationName || sim.scenarioTitle)}</a></td>
      <td>${escapeHtml(sim.savedAtLabel || sim.savedAt || "")}</td>
      <td>${escapeHtml((sim.summaryNotes || "").slice(0,120))}</td>
    </tr>
  `).join("");
  byId("dashboardTab").innerHTML=`<div class="card"><h2>Simulation Summary & Notes</h2><p class="small">Use this page to capture summary notes after the after-action review. Notes are stored with this simulation in your current browser session for later review.</p>
  <div class="notice"><strong>Scenario:</strong> ${escapeHtml(currentScenario()?.title || "Unknown")}</div>
  <div style="margin-top:12px"><div class="small">Simulation name</div><input id="simulationNameBox" class="input" placeholder="Name this saved simulation..." value="${escapeAttr(state.currentSimulationName || "")}"></div>
  <div style="margin-top:12px"><div class="small">Summary notes</div><textarea id="summaryNotesBox" class="textarea" placeholder="Capture key takeaways, major findings, what worked well, what did not, and follow-up actions...">${escapeHtml(state.summaryNotes || "")}</textarea></div>
  <div class="row" style="margin-top:12px"><button type="button" class="btn primary" id="saveSummaryBtn">Save Simulation Notes</button><button type="button" class="btn secondary" id="exportSummaryBtn">Export PDF</button><button type="button" class="btn secondary" id="backToDashboardBtn">Return to Dashboard</button></div></div>
  <div class="card"><h3 style="margin-top:0">Saved Simulations In This Session</h3><div class="table-wrap"><table><thead><tr><th>Simulation</th><th>Saved</th><th>Summary Notes</th></tr></thead><tbody>${priorRows || `<tr><td colspan="3">No saved simulations yet.</td></tr>`}</tbody></table></div></div>`;
  byId("saveSummaryBtn").onclick=()=>{
    state.currentSimulationName = byId("simulationNameBox").value.trim();
    state.summaryNotes = byId("summaryNotesBox").value.trim();
    const record = saveSimulationSummary();
    alert("Simulation saved.");
    renderSummary();
  };
  byId("exportSummaryBtn").onclick=()=>{
    state.currentSimulationName = byId("simulationNameBox").value.trim();
    state.summaryNotes = byId("summaryNotesBox").value.trim();
    const record = saveSimulationSummary();
    exportSimulationPdf(record);
  };
  byId("backToDashboardBtn").onclick=()=>{ renderDashboard(); setTab("dashboard"); };
}


function openForm(docName, taskName, assigneeName){
  const doc=documents.find(d=>d.name===docName); if(!doc) return;
  const scenario=currentScenario();
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(doc.name)}</title><style>body{font-family:Arial,sans-serif;margin:0;background:#f4f7fb;color:#17212f}.toolbar{background:#16324f;color:#fff;padding:12px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}.toolbar button{padding:10px 14px;border:0;border-radius:8px;cursor:pointer}.page{width:8.5in;min-height:11in;margin:18px auto;background:#fff;padding:.6in;box-shadow:0 10px 30px rgba(0,0,0,.12)}.box{border:1px solid #cbd7e3;background:#f8fbfd;padding:12px;border-radius:10px;margin-top:16px}textarea,input{width:100%;padding:10px;border:1px solid #b7c7d8;border-radius:8px;color:#17212f}textarea{min-height:90px}@media print{.toolbar{display:none}.page{margin:0;box-shadow:none;width:auto;min-height:auto}body{background:#fff}}</style></head><body><div class="toolbar"><strong>Fillable Incident Worksheet</strong><button onclick="window.print()">Print / Save as PDF</button><button onclick="window.close()">Close</button></div><div class="page"><h1>${escapeHtml(doc.name)}</h1><div>Purpose: ${escapeHtml(doc.purpose)}</div><div class="box"><strong>Scenario</strong><div style="margin-top:8px">${escapeHtml(scenario?scenario.title:"")}</div></div><div class="box"><strong>Current Task</strong><div style="margin-top:8px">${escapeHtml(taskName)}</div></div><div class="box"><strong>Assigned Person</strong><div style="margin-top:8px">${escapeHtml(assigneeName||"Unassigned")}</div></div><div class="box"><strong>Questions to Answer in Order</strong>${doc.questions.map((q,idx)=>`<div style="margin-top:12px"><label><strong>Question ${idx+1}:</strong> ${escapeHtml(q)}</label><textarea></textarea></div>`).join("")}</div><div class="box"><strong>Additional Notes</strong><textarea style="min-height:140px"></textarea></div></div></body></html>`;
  const blob=new Blob([html],{type:"text/html"}); const url=URL.createObjectURL(blob); const w=window.open(url,"_blank","noopener,noreferrer");
  if(!w){
    const a=document.createElement("a");
    a.href=url; a.target="_blank"; a.rel="noopener noreferrer";
    a.click();
  }
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}

function renderDocuments(){
  if(!state.user){
    byId("documentsTab").innerHTML=`<div class="card"><div class="warn">Sign in first.</div></div>`;
    return;
  }
  byId("documentsTab").innerHTML=`<div class="card"><h2>Document Repository</h2><div class="stack">${documents.map(doc=>`<div class="task-card"><div><strong>${escapeHtml(doc.name)}</strong></div><div class="small">${escapeHtml(doc.purpose)}</div><button type="button" class="btn secondary" onclick="openForm('${escapeAttr(doc.name)}','General Use','')">Open Form</button></div>`).join("")}</div></div>`;
}

function renderAll(){ renderDashboard(); renderLibrary(); renderSetup(); renderNotify(); renderRun(); if(typeof renderDocuments==='function') renderDocuments(); }
async function init(){
  const [sResp,pResp,tResp]=await Promise.all([fetch("scenarios.json"), fetch("playbooks.json"), fetch("tenants.json")]);
  const sJson=await sResp.json(); const pJson=await pResp.json(); const tJson=await tResp.json();
  scenarios=sJson.scenarios||[]; playbooks=pJson.playbooks||[]; tenants=tJson.tenants||[];
  state.selectedScenarioId=scenarios[0]?.id||null;
  state.selectedTenantId=tenants[0]?.id||"";
  state.selectedClientId=tenants[0]?.clients?.[0]?.id||"";
  document.querySelectorAll(".nav-btn[data-tab]").forEach(btn=>btn.onclick=()=>setTab(btn.dataset.tab));
  byId("resetBtn").onclick=()=>location.reload();
  const logoutBtn = byId("logoutBtn"); if(logoutBtn) logoutBtn.onclick=()=>logOff();
  renderLogin();
  renderDashboard();
  renderLibrary();
  renderSetup();
  renderNotify();
  renderRun();
  if(typeof renderDocuments==='function') renderDocuments();
  setTab("login");
}
init().catch(err=>{ document.body.innerHTML=`<pre style="padding:20px;color:#17212f;background:#f4f7fb">App failed to load.\n\n${escapeHtml(err.stack||err.message||String(err))}</pre>`; });
