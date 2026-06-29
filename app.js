// ============================================================
//  THINK-BEFORE-ACT — app.js
//  Phase 9: Brief Template Library + AI Member Memory context
// ============================================================

const APP_ID     = 'cli_aab1ef7c8d785ed4'
const WORKER_URL = 'https://think-before-act-proxy.minhwuan889.workers.dev'

const MEMBERS = [
  { name: 'Quân',       open_id: 'ou_9ed35df790cc4a522b2c184ee5a87159', teams: ['BD', 'PM', 'AI', 'ACCOUNT'] },
  { name: 'Chi',        open_id: 'ou_90bf9de23e0771d26a58637225ea6de8', teams: ['AI'] },
  { name: 'Giang',      open_id: 'ou_c66bb984971506ca47c6125c250d3096', teams: ['BD', 'PM', 'ACCOUNT'] },
  { name: 'Huyền Linh', open_id: 'ou_05980c37366dc083e5c5cb123824f28a', teams: ['BD'] },
  { name: 'Nga Linh',   open_id: 'ou_cb8dfc4f8b0c05678d7e48833032708b', teams: ['BD'] },
  { name: 'Minh Anh',   open_id: 'ou_5c68f826e269bad95695890a02693cc3', teams: ['ACCOUNT'] },
  { name: 'Hân',        open_id: 'ou_f0e44708bb670f3ab55d376b7f801797', teams: ['BD'] },
]

const TEAMS        = ['BD', 'PM', 'AI', 'ACCOUNT']
const TEAM_FALLBACK    = 'BD'
const TEAM_STORAGE_KEY = 'tba_selected_team'

// ─── State ────────────────────────────────────────────────────

let currentUser       = { open_id: '', name: '', avatar: '', team: '' }
let isInLark          = false
let selectedAssignee  = null
let selectedFollowers = []
let selectedTaskType  = null   // { id, name }
let selectedSkillId   = null   // UUID từ brief_templates.skill_id
let selectedTemplateId = null   // template được apply vào task hiện tại
let selectedTemplateName = null
let taskTypes         = []     // loaded from /skills?target_type=task_type
let currentTeam       = ''
let isSubmitting      = false
let lastGenResult     = null   // kết quả generate-suggestion gần nhất

// ─── Init ─────────────────────────────────────────────────────

let __initialized = false
document.addEventListener('DOMContentLoaded', async () => {
  if (__initialized) return
  __initialized = true
  renderMembers()
  renderTeamSelector()
  await Promise.all([initLark(), loadTaskTypes()])
})

// ─── Task types — load từ /skills?target_type=task_type ───────

async function loadTaskTypes() {
  try {
    const res  = await fetch(`${WORKER_URL}/skills?target_type=task_type`)
    const data = await res.json()
    taskTypes  = Array.isArray(data) ? data : []
    renderTaskTypePicker()
  } catch (err) {
    console.warn('[taskTypes] load lỗi:', err.message)
    taskTypes = []
    renderTaskTypePicker()
  }
}

function renderTaskTypePicker() {
  const wrap = document.getElementById('taskTypeList')
  if (!wrap) return

  if (taskTypes.length === 0) {
    wrap.innerHTML = `<span style="font-size:11px;color:var(--muted)">chưa có loại task — <a href="skills.html" style="color:var(--accent);text-decoration:none">thêm tại skills</a></span>`
    return
  }

  wrap.innerHTML = taskTypes.map(t => `
    <div class="member-chip" data-type-id="${t.target_id}" onclick="selectTaskType('${t.target_id}', '${escAttr(t.target_name)}', this)">
      ${t.target_name}
    </div>
  `).join('')
}

function escAttr(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;')
}


function escHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function selectTaskType(typeId, typeName, chipEl) {
  const chips = document.querySelectorAll('#taskTypeList .member-chip')

  // Toggle off nếu click lại chip đã chọn
  if (selectedTaskType?.id === typeId) {
    selectedTaskType = null
    selectedTemplateId = null
    selectedTemplateName = null
    chips.forEach(c => c.classList.remove('selected'))
    hideTemplatePicker()
    return
  }

  chips.forEach(c => c.classList.remove('selected'))
  chipEl.classList.add('selected')
  selectedTaskType = { id: typeId, name: typeName }

  // Fetch templates cho loại task này
  await fetchTemplatesForType(typeId)
}

// ─── Template picker ──────────────────────────────────────────

async function fetchTemplatesForType(taskTypeId) {
  const wrap = document.getElementById('templatePickerWrap')
  if (!wrap) return
  wrap.style.display = 'block'
  wrap.innerHTML = `<div style="font-size:11px;color:var(--muted);padding:8px 0">đang tải template...</div>`

  try {
    const res       = await fetch(`${WORKER_URL}/templates?task_type_id=${encodeURIComponent(taskTypeId)}`)
    const templates = await res.json()

    if (!Array.isArray(templates) || templates.length === 0) {
      wrap.innerHTML = `
        <div class="template-empty">
          chưa có template cho loại task này —
          <a href="templates.html" style="color:var(--accent);text-decoration:none">thêm tại templates</a>
        </div>`
      return
    }

    renderTemplatePicker(templates, wrap)
  } catch (err) {
    wrap.innerHTML = `<div style="font-size:11px;color:var(--red)">lỗi tải template: ${err.message}</div>`
  }
}

function renderTemplatePicker(templates, wrap) {
  const rows = templates.map(t => `
    <div class="template-row" onclick="applyTemplate(${JSON.stringify(t).replace(/"/g, '&quot;')})">
      <div class="template-name">${t.name}</div>
      <div class="template-meta">
        ${t.category ? `<span>${t.category}</span>` : ''}
        ${t.used_count > 0 ? `<span>dùng ${t.used_count} lần</span>` : ''}
      </div>
    </div>
  `).join('')

  wrap.innerHTML = `
    <div class="template-picker">
      <div class="template-picker-label">chọn template:</div>
      ${rows}
    </div>
  `
}

function hideTemplatePicker() {
  const wrap = document.getElementById('templatePickerWrap')
  if (wrap) { wrap.style.display = 'none'; wrap.innerHTML = '' }
}

function applyTemplate(tpl) {
  if (tpl.summary_tpl)     document.getElementById('f-summary').value     = tpl.summary_tpl
  if (tpl.description_tpl) document.getElementById('f-description').value = tpl.description_tpl
  if (tpl.output_tpl)      document.getElementById('f-output').value      = tpl.output_tpl

  // Lưu skill_id từ template → dùng khi check-brief + generate-suggestion
  selectedSkillId = tpl.skill_id || null
  selectedTemplateId = tpl.id || null
  selectedTemplateName = tpl.name || null

  // Increment used_count (fire-and-forget)
  if (tpl.id) {
    fetch(`${WORKER_URL}/templates/${tpl.id}/use`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {})
  }

  // Collapse picker sau khi apply
  const wrap = document.getElementById('templatePickerWrap')
  if (wrap) {
    wrap.innerHTML = `
      <div class="template-applied">
        ✓ đã điền từ template <strong>${tpl.name}</strong>
        <button class="btn-link" onclick="fetchTemplatesForType('${selectedTaskType?.id || ''}')">đổi template</button>
      </div>`
  }

  // Scroll xuống form để senior chỉnh
  document.getElementById('f-summary').scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

// ─── Save as template ─────────────────────────────────────────

function saveAsTemplate() {
  const summary = document.getElementById('f-summary').value.trim()
  const desc    = document.getElementById('f-description').value.trim()
  const output  = document.getElementById('f-output').value.trim()

  if (!summary && !desc && !output) {
    alert('điền ít nhất 1 trường trước khi lưu template.')
    return
  }

  const modal = document.getElementById('saveTemplateModal')
  if (!modal) return

  // Pre-fill tên template
  const nameInput = document.getElementById('tpl-name')
  if (nameInput && !nameInput.value) {
    nameInput.value = selectedTaskType?.name
      ? `${selectedTaskType.name} — ${summary.slice(0, 30) || 'template'}`
      : (summary.slice(0, 40) || 'template mới')
  }

  // Pre-select task type nếu đã chọn
  const typeSelect = document.getElementById('tpl-task-type')
  if (typeSelect && selectedTaskType) typeSelect.value = selectedTaskType.id

  modal.classList.add('open')
}

function closeSaveTemplateModal() {
  const modal = document.getElementById('saveTemplateModal')
  if (modal) modal.classList.remove('open')
}

function populateSaveTemplateTypeOptions() {
  const sel = document.getElementById('tpl-task-type')
  if (!sel) return
  sel.innerHTML = `<option value="">— không gán loại task —</option>`
  taskTypes.forEach(t => {
    const opt = document.createElement('option')
    opt.value       = t.target_id
    opt.textContent = t.target_name
    sel.appendChild(opt)
  })
  if (selectedTaskType) sel.value = selectedTaskType.id
}

async function confirmSaveTemplate() {
  const name   = document.getElementById('tpl-name').value.trim()
  const typeId = document.getElementById('tpl-task-type').value
  const btn    = document.getElementById('btnConfirmSaveTemplate')

  if (!name) { alert('nhập tên template'); return }

  const summary = document.getElementById('f-summary').value.trim()
  const desc    = document.getElementById('f-description').value.trim()
  const output  = document.getElementById('f-output').value.trim()

  btn.textContent = 'đang lưu...'
  btn.disabled    = true

  try {
    const res  = await fetch(`${WORKER_URL}/templates`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        task_type_id:    typeId || null,
        category:        currentTeam || null,
        summary_tpl:     summary || null,
        description_tpl: desc   || null,
        output_tpl:      output || null,
        used_count:      0,
      }),
    })
    const data = await res.json()
    if (data && data.length > 0) {
      closeSaveTemplateModal()
      showToast('✓ đã lưu template')
    } else {
      alert('lỗi lưu template: ' + JSON.stringify(data))
    }
  } catch (err) {
    alert('lỗi: ' + err.message)
  } finally {
    btn.textContent = 'lưu template'
    btn.disabled    = false
  }
}

// ─── Toast ────────────────────────────────────────────────────

let toastTimer
function showToast(msg) {
  let el = document.getElementById('appToast')
  if (!el) {
    el = document.createElement('div')
    el.id        = 'appToast'
    el.className = 'app-toast'
    document.body.appendChild(el)
  }
  el.textContent = msg
  el.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500)
}

// ─── Team selector — custom chips (native select bị Lark iframe chặn) ──

function renderTeamSelector() {
  const wrap = document.getElementById('teamChipsHeader')
  if (!wrap) return

  TEAMS.forEach(t => {
    const btn = document.createElement('button')
    btn.className    = 'team-chip-btn'
    btn.textContent  = t
    btn.dataset.team = t
    btn.onclick      = () => {
      localStorage.setItem(TEAM_STORAGE_KEY, t)
      setTeam(t)
    }
    wrap.appendChild(btn)
  })

  // Restore saved preference
  const saved = localStorage.getItem(TEAM_STORAGE_KEY)
  if (saved && TEAMS.includes(saved)) highlightTeamChip(saved)
}

function highlightTeamChip(team) {
  document.querySelectorAll('.team-chip-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.team === team)
  })
}

// ─── Nav tabs ──────────────────────────────────────────────────

function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'))
  document.getElementById('view-' + viewName).classList.add('active')
  document.querySelector(`.nav-tab[data-view="${viewName}"]`).classList.add('active')
  if (viewName === 'members') renderMembersView()
}

function renderMembersView() {
  const grid = document.getElementById('memberGrid')
  grid.innerHTML = MEMBERS.map(m => `
    <div class="member-card" onclick="openMemberProfile('${m.open_id}','${m.name.replace(/'/g, "\\'")}')">
      <div class="member-card-name">${m.name}</div>
      <div class="member-card-teams">
        ${m.teams.map(t => `<span class="member-card-team">${t}</span>`).join('')}
      </div>
      <div class="member-card-id">${m.open_id.startsWith('ou_placeholder') ? '⚠ chưa có open_id thật' : m.open_id}</div>
    </div>
  `).join('')
}

// ─── Side panel: Member profile ───────────────────────────────

async function openMemberProfile(openId, name) {
  const panel   = document.getElementById('sidePanel')
  const overlay = document.getElementById('sidePanelOverlay')
  panel.innerHTML = `
    <div class="side-head">
      <div>
        <div class="side-name">${name}</div>
        <div class="side-id">đang tải profile...</div>
      </div>
      <button class="side-close" onclick="closeMemberProfile()">×</button>
    </div>
    <div style="padding:40px 0;text-align:center;color:var(--muted);font-size:11px">⏳ pulling data từ Lark Base...</div>
  `
  panel.classList.add('open')
  overlay.classList.add('open')

  if (openId.startsWith('ou_placeholder')) {
    panel.innerHTML = `
      <div class="side-head">
        <div>
          <div class="side-name">${name}</div>
          <div class="side-id">⚠ chưa có open_id thật</div>
        </div>
        <button class="side-close" onclick="closeMemberProfile()">×</button>
      </div>
      <div style="padding:24px 0;color:var(--amber);font-size:12px">Member này đang dùng placeholder open_id — chưa thể pull profile. Cần lấy open_id thật từ Lark Contact API.</div>
    `
    return
  }

  try {
    const res  = await fetch(`${WORKER_URL}/member-profile?open_id=${encodeURIComponent(openId)}`)
    const data = await res.json()
    renderMemberProfile(name, openId, data)
  } catch (err) {
    panel.innerHTML = `
      <div class="side-head">
        <div><div class="side-name">${name}</div></div>
        <button class="side-close" onclick="closeMemberProfile()">×</button>
      </div>
      <div style="color:var(--red);font-size:12px">Lỗi tải profile: ${err.message}</div>
    `
  }
}

function renderMemberProfile(name, openId, data) {
  const panel = document.getElementById('sidePanel')
  const p     = data.patterns || {}
  const s     = p.summary || { total: 0, done: 0, pending: 0, overdue: 0 }
  const teamCounts = data.team_counts || {}
  const tasks      = data.tasks || []
  const feedbackItems = data.task_feedback || []
  const latestFeedbackByGuid = {}
  feedbackItems.forEach(f => { if (f.task_guid && !latestFeedbackByGuid[f.task_guid]) latestFeedbackByGuid[f.task_guid] = f })

  const summaryHTML = `
    <div class="summary-grid">
      <div class="summary-cell"><div class="summary-num">${s.total}</div><div class="summary-lbl">tổng</div></div>
      <div class="summary-cell"><div class="summary-num" style="color:var(--green)">${s.done}</div><div class="summary-lbl">done</div></div>
      <div class="summary-cell ${s.pending > 5 ? 'warn' : ''}"><div class="summary-num">${s.pending}</div><div class="summary-lbl">pending</div></div>
      <div class="summary-cell ${s.overdue > 0 ? 'bad' : ''}"><div class="summary-num">${s.overdue}</div><div class="summary-lbl">quá hạn</div></div>
    </div>
  `

  let patternHTML = ''
  if (p.brief_quality) {
    const bq = p.brief_quality
    const shortPct = s.total > 0 ? Math.round(bq.short_count / s.total * 100) : 0
    patternHTML += `
      <div class="pattern-sec">
        <div class="pattern-title">📝 brief quality</div>
        <div class="pattern-list">
          ${bq.short_count > 0
            ? `<span class="pattern-warn">⚠</span> <strong>${bq.short_count}/${s.total}</strong> task có brief &lt; 50 ký tự (${shortPct}%)`
            : `<span class="pattern-good">✓</span> Tất cả brief đều đủ dài`}<br>
          Brief trung bình: <strong>${bq.avg_length}</strong> ký tự
        </div>
      </div>`
  }

  if (p.deadline?.with_deadline > 0) {
    const d = p.deadline
    const onTimePct = Math.round(d.on_time / d.with_deadline * 100)
    patternHTML += `
      <div class="pattern-sec">
        <div class="pattern-title">⏰ deadline</div>
        <div class="pattern-list">
          ${onTimePct >= 70
            ? `<span class="pattern-good">✓</span>`
            : `<span class="pattern-warn">⚠</span>`}
          <strong>${d.on_time}/${d.with_deadline}</strong> đúng hạn (${onTimePct}%)
          ${d.missed > 0 ? `<br><span class="pattern-warn">⚠</span> <strong>${d.missed}</strong> task đang quá hạn` : ''}
          ${d.overdue_streak >= 2 ? `<br><span class="pattern-warn">⚠</span> Streak quá hạn: <strong>${d.overdue_streak}</strong> task liên tiếp` : ''}
        </div>
      </div>`
  }

  if (p.status) {
    const st = p.status
    patternHTML += `
      <div class="pattern-sec">
        <div class="pattern-title">📊 status</div>
        <div class="pattern-list">
          ${st.stuck_count > 0
            ? `<span class="pattern-warn">⚠</span> <strong>${st.stuck_count}</strong> task stuck &gt; 7 ngày`
            : `<span class="pattern-good">✓</span> Không có task stuck quá lâu`}
          ${st.longest_stuck_days > 0 ? `<br>Lâu nhất: <strong>${st.longest_stuck_days} ngày</strong> — "${st.longest_stuck_name || '(không tên)'}"` : ''}
        </div>
      </div>`
  }

  if (p.workload) {
    patternHTML += `
      <div class="pattern-sec">
        <div class="pattern-title">💼 workload</div>
        <div class="pattern-list"><strong>${p.workload.active_count}</strong> task active hiện tại</div>
      </div>`
  }

  const teamHTML = Object.keys(teamCounts).length > 0
    ? `<div class="pattern-sec">
         <div class="pattern-title">📂 phân bố theo team</div>
         <div class="pattern-list">
           ${Object.entries(teamCounts).map(([t, c]) => `<strong>${t}</strong>: ${c} task`).join(' • ')}
         </div>
       </div>`
    : ''

  const memory = data.memory || null
  const aiSummary = memory?.ai_summary || memory?.summary?.ai_memory?.ai_summary || null
  const aiLearnings = memory?.ai_learnings?.length ? memory.ai_learnings : (memory?.learnings || [])
  const aiRecommendations = memory?.ai_recommendations || memory?.summary?.ai_memory?.ai_recommendations || []
  const memoryHTML = memory
    ? `<div class="pattern-sec">
         <div class="pattern-title">🧠 memory tổng hợp</div>
         <div class="pattern-list">
           ${aiSummary?.working_style ? `<strong>Cách làm việc:</strong> ${aiSummary.working_style}<br>` : ''}
           ${aiSummary?.risk_pattern ? `<strong>Rủi ro:</strong> ${aiSummary.risk_pattern}<br>` : ''}
           ${aiSummary?.best_way_to_assign ? `<strong>Cách giao việc tốt:</strong> ${aiSummary.best_way_to_assign}<br>` : ''}
           ${aiLearnings?.length ? `<br><strong>Learning:</strong><br>${aiLearnings.slice(0,4).map(l => `• ${l}`).join('<br>')}` : ''}
           ${aiRecommendations?.length ? `<br><br><strong>Gợi ý:</strong><br>${aiRecommendations.slice(0,4).map(l => `• ${l}`).join('<br>')}` : ''}
           ${memory.last_rebuilt_at ? `<br><br><span style="color:var(--muted)">cập nhật: ${formatDateShort(memory.last_rebuilt_at)}</span>` : ''}
         </div>
       </div>`
    : ''

  const feedbackSummaryHTML = feedbackItems.length > 0
    ? `<div class="pattern-sec">
         <div class="pattern-title">🗣️ senior feedback (${feedbackItems.length})</div>
         <div class="pattern-list">
           ${feedbackItems.slice(0,5).map(f => `• ${escHtml(f.task_summary || f.task_guid || 'task')} — ${escHtml(f.outcome || 'no outcome')}${f.blocker_reason ? ` / ${escHtml(f.blocker_reason)}` : ''}`).join('<br>')}
         </div>
       </div>`
    : ''

  const sortedTasks = [...tasks].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  const historyHTML = sortedTasks.length > 0
    ? sortedTasks.map((t, i) => {
        const guid = t.task_guid || `idx-${i}`
        return `
          <div class="history-task">
            <div class="history-row" onclick="toggleHistoryDetail('${guid}')">
              <div class="history-dot ${t.status === 'done' ? 'done' : t.status === 'in-progress' ? 'in-progress' : ''}"></div>
              <div class="history-main">
                <div class="history-name">${t.summary || '(không tên)'}</div>
                <div class="history-meta">
                  <span>${t.status}</span>
                  ${t.created_at ? `<span>tạo: ${formatDateShort(t.created_at)}</span>` : ''}
                  ${t.deadline   ? `<span>deadline: ${formatDateShort(t.deadline)}</span>` : ''}
                </div>
              </div>
              <span class="history-team-badge">${t.team}</span>
            </div>
            <div class="history-expand" id="hist-${guid}">
              <div class="history-detail-label">brief</div>
              <div class="history-detail-text">${(t.description || '(không có brief)').replace(/</g, '&lt;')}</div>
              <div class="history-detail-label">metadata</div>
              <div class="history-detail-text">team: ${t.team} • status: ${t.status} • guid: ${t.task_guid || '—'}</div>
            </div>
          </div>`
      }).join('')
    : `<div style="padding:24px;text-align:center;color:var(--muted);font-size:11px">Chưa có task nào</div>`

  panel.innerHTML = `
    <div class="side-head">
      <div>
        <div class="side-name">${name}</div>
        <div class="side-id">${openId}</div>
      </div>
      <button class="side-close" onclick="closeMemberProfile()">×</button>
    </div>
    ${summaryHTML}
    ${patternHTML}
    ${teamHTML}
    ${memoryHTML}
    ${feedbackSummaryHTML}
    <div class="pattern-sec">
      <div class="pattern-title">📋 lịch sử task (${tasks.length})</div>
      ${historyHTML}
    </div>
  `
}

function toggleHistoryDetail(guid) {
  const el = document.getElementById('hist-' + guid)
  if (el) el.classList.toggle('open')
}


// Senior result input now lives on current dashboard task cards, not in member history.

function openMemberByName(name) {
  const m = MEMBERS.find(x => x.name === name)
  if (!m) { alert('Không tìm thấy member "' + name + '"'); return }
  openMemberProfile(m.open_id, m.name)
}

function closeMemberProfile() {
  document.getElementById('sidePanel').classList.remove('open')
  document.getElementById('sidePanelOverlay').classList.remove('open')
}

function syncTeamSelector(team) {
  highlightTeamChip(team)
}

// ─── Lark SDK ──────────────────────────────────────────────────

async function initLark() {
  const nameEl   = document.getElementById('nameDisplay')
  const avatarEl = document.getElementById('userAvatar')

  // Timeout fallback: nếu Lark SDK hang sau 3s → dùng saved team
  let sdkResolved = false
  const sdkTimeout = setTimeout(() => {
    if (!sdkResolved) {
      console.warn('[Lark SDK] timeout 3s — fallback to saved team')
      fallbackUser(nameEl)
    }
  }, 3000)

  function resolve(fn) {
    sdkResolved = true
    clearTimeout(sdkTimeout)
    fn()
  }

  if (typeof window.h5sdk === 'undefined' && typeof window.tt === 'undefined') {
    resolve(() => {
      isInLark = false
      nameEl.textContent = '(ngoài Lark)'
      nameEl.classList.remove('loading')
      const saved = localStorage.getItem(TEAM_STORAGE_KEY)
      setTeam(saved && TEAMS.includes(saved) ? saved : TEAM_FALLBACK)
    })
    return
  }

  isInLark = true
  try {
    if (window.h5sdk) {
      window.h5sdk.ready(() => {
        window.h5sdk.call('getUserInfo', {}, (res) => {
          resolve(() => {
            if (res?.user) {
              currentUser.name    = res.user.name    || res.user.displayName || ''
              currentUser.avatar  = res.user.avatar  || res.user.avatarUrl   || ''
              currentUser.open_id = res.user.openId  || ''
              updateHeaderUser(nameEl, avatarEl)
              resolveUserTeam()
            } else { fallbackUser(nameEl) }
          })
        })
      })
      window.h5sdk.error(() => resolve(() => fallbackUser(nameEl)))
    } else if (window.tt) {
      window.tt.ready(() => {
        window.tt.getUserInfo({
          success(res) {
            resolve(() => {
              currentUser.name   = res.userInfo?.nickName || res.userInfo?.name || ''
              currentUser.avatar = res.userInfo?.avatarUrl || ''
              updateHeaderUser(nameEl, avatarEl)
              resolveUserTeam()
            })
          },
          fail() { resolve(() => fallbackUser(nameEl)) }
        })
      })
    }
  } catch (e) { resolve(() => fallbackUser(nameEl)) }
}

function updateHeaderUser(nameEl, avatarEl) {
  if (currentUser.name) {
    nameEl.textContent = currentUser.name
    nameEl.classList.remove('loading')
    localStorage.setItem('tba_creator_name', currentUser.name)  // lưu để dùng cho created_by
  }
  if (currentUser.avatar) { avatarEl.src = currentUser.avatar; avatarEl.style.display = 'block' }
}

function fallbackUser(nameEl) {
  nameEl.textContent = '(không lấy được tên)'
  nameEl.classList.remove('loading')
  const saved = localStorage.getItem(TEAM_STORAGE_KEY)
  setTeam(saved && TEAMS.includes(saved) ? saved : TEAM_FALLBACK)
}

function resolveUserTeam() {
  const match = MEMBERS.find(m => m.open_id === currentUser.open_id)
  if (match) {
    const saved = localStorage.getItem(TEAM_STORAGE_KEY)
    const team  = (saved && match.teams.includes(saved)) ? saved : match.teams[0]
    currentUser.team = team
    setTeam(team)
  } else {
    const saved = localStorage.getItem(TEAM_STORAGE_KEY)
    setTeam(saved && TEAMS.includes(saved) ? saved : TEAM_FALLBACK)
  }
}

// ─── Set team + render dashboard ──────────────────────────────

function setTeam(team) {
  currentTeam = team
  const labelEl = document.getElementById('teamLabel')
  labelEl.textContent = 'team: ' + team
  labelEl.classList.remove('loading')
  syncTeamSelector(team)
  renderDashboard(team)
}

// ─── Dashboard render ──────────────────────────────────────────

async function renderDashboard(team) {
  const listEl = document.getElementById('taskList')
  listEl.innerHTML = '<div class="empty-state"><p>đang tải...</p></div>'
  document.getElementById('stat-total').textContent   = '—'
  document.getElementById('stat-done').textContent    = '—'
  document.getElementById('stat-pending').textContent = '—'

  try {
    const res   = await fetch(`${WORKER_URL}/base-tasks?team=${team}`)
    const data  = await res.json()
    const tasks = data.tasks || []

    if (tasks.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><p>chưa có task nào cho team ${team}.</p></div>`
      document.getElementById('riskPanel').innerHTML = ''
      document.getElementById('stat-total').textContent   = 0
      document.getElementById('stat-done').textContent    = 0
      document.getElementById('stat-pending').textContent = 0
      return
    }

    const taskList = tasks.map(t => ({
      guid:        t.fields['task_guid']     || t.record_id,
      summary:     t.fields['summary']       || '',
      description: t.fields['description']   || '',
      assignee:    t.fields['assignee_name'] || '',
      created_by:  t.fields['created_by']    || '',
      created_at:  t.fields['created_at']    || '',
      deadline:    t.fields['deadline']      || '',
      status:      t.fields['status']        || 'pending',
      team,
    }))

    const total   = taskList.length
    const done    = taskList.filter(t => t.status === 'done').length
    const pending = taskList.filter(t => t.status !== 'done').length
    document.getElementById('stat-total').textContent   = total
    document.getElementById('stat-done').textContent    = done
    document.getElementById('stat-pending').textContent = pending

    document.getElementById('riskPanel').innerHTML = buildRiskPanel(taskList)
    listEl.innerHTML = ''
    taskList.forEach(task => listEl.appendChild(buildTaskCard(task)))

  } catch (err) {
    listEl.innerHTML = `<div class="empty-state"><p>lỗi tải data: ${err.message}</p></div>`
  }
}

// ─── Risk Panel ───────────────────────────────────────────────

function buildRiskPanel(tasks) {
  const now    = Date.now()
  const DAY_MS = 1000 * 60 * 60 * 24
  const risks  = []

  tasks.forEach(task => {
    if (task.status === 'done') return
    const deadlineMs     = task.deadline   ? new Date(task.deadline).getTime()   : null
    const createdMs      = task.created_at ? new Date(task.created_at).getTime() : null
    const daysSince      = createdMs   ? Math.floor((now - createdMs) / DAY_MS)   : null
    const daysToDeadline = deadlineMs  ? Math.floor((deadlineMs - now) / DAY_MS)  : null
    const briefLen       = (task.description || '').replace(/\s+/g, ' ').trim().length

    if (deadlineMs && deadlineMs < now) {
      risks.push({ level: 'red',   task, reason: `quá hạn ${Math.abs(daysToDeadline)} ngày`, sort: 0 }); return
    }
    if (daysToDeadline !== null && daysToDeadline <= 1 && task.status === 'pending') {
      risks.push({ level: 'red',   task, reason: `deadline ${daysToDeadline === 0 ? 'hôm nay' : 'ngày mai'}, vẫn pending`, sort: 1 }); return
    }
    if (daysToDeadline !== null && daysToDeadline <= 3 && task.status === 'pending') {
      risks.push({ level: 'amber', task, reason: `deadline còn ${daysToDeadline} ngày, vẫn pending`, sort: 2 })
    }
    if (daysSince !== null && daysSince >= 3 && task.status === 'pending') {
      risks.push({ level: 'amber', task, reason: `${daysSince} ngày chưa có update`, sort: 3 })
    }
    if (briefLen < 50) {
      risks.push({ level: 'amber', task, reason: `brief quá ngắn (${briefLen} ký tự)`, sort: 4 })
    }
  })

  const seen = {}
  const deduped = risks
    .sort((a, b) => a.sort - b.sort)
    .filter(r => { if (seen[r.task.guid]) return false; seen[r.task.guid] = true; return true })

  if (deduped.length === 0) return ''

  const rows = deduped.map(r => `
    <div class="risk-row" onclick="highlightTask('${r.task.guid}')">
      <div class="risk-dot risk-dot-${r.level}"></div>
      <div class="risk-info">
        <div class="risk-name">${r.task.summary || '(không tên)'}</div>
        <div class="risk-assignee">→ <span class="assignee-link" onclick="event.stopPropagation(); openMemberByName('${r.task.assignee.replace(/'/g, "\\'")}')">${r.task.assignee}</span></div>
        <div class="risk-reason">${r.reason}</div>
      </div>
    </div>
  `).join('')

  return `
    <div class="risk-panel" id="riskPanelInner">
      <div class="risk-header" onclick="toggleRiskPanel()">
        <span class="risk-title">⚠ cần chú ý</span>
        <div class="risk-header-right">
          <span class="risk-count">${deduped.length}</span>
          <span class="risk-chevron">▾</span>
        </div>
      </div>
      <div class="risk-list">${rows}</div>
    </div>`
}

function highlightTask(guid) {
  const card = document.querySelector(`.task-card[data-guid="${guid}"]`)
  if (!card) return
  card.scrollIntoView({ behavior: 'smooth', block: 'center' })
  card.classList.add('highlight')
  setTimeout(() => card.classList.remove('highlight'), 2000)
}

function toggleRiskPanel() {
  document.getElementById('riskPanelInner')?.classList.toggle('collapsed')
}

function buildTaskCard(task) {
  const deadlineBadge = getDeadlineBadge(task.deadline)
  const statusClass   = task.status === 'done' ? 'done' : task.status === 'in-progress' ? 'in-progress' : ''
  const card = document.createElement('div')
  card.className    = 'task-card'
  card.dataset.guid = task.guid
  card.innerHTML = `
    <div class="task-row" onclick="toggleTaskDetail('${task.guid}')">
      <div class="task-status ${statusClass}"></div>
      <div class="task-main">
        <div class="task-name">${task.summary}</div>
        <div class="task-meta">
          <span>→ <span class="assignee-link" onclick="event.stopPropagation(); openMemberByName('${task.assignee.replace(/'/g, "\'")}')">${task.assignee}</span></span>
          <span>by ${task.created_by || '—'}</span>
          ${deadlineBadge}
        </div>
      </div>
      <div class="chevron">▾</div>
    </div>
    <div class="task-detail" id="detail-${task.guid}">
      <div class="detail-sec">
        <div class="detail-label">brief</div>
        <div class="detail-text">${task.description || '(chưa có brief)'}</div>
      </div>
      ${task.status !== 'done' ? renderCurrentTaskResultBox(task) : ''}
      <div class="detail-actions">
        ${task.status !== 'done'
          ? `<button class="btn-done" onclick="completeTaskWithResult('${task.guid}', '${task.team}', this)">✓ hoàn thành + gửi AI memory</button>`
          : `<button class="btn-reopen" onclick="markTaskDone('${task.guid}', '${task.team}', false, this)">↩ reopen</button>`
        }
      </div>
    </div>
  `
  return card
}

function feedbackDomId(guid) {
  return String(guid || '').replace(/[^a-zA-Z0-9_-]/g, '_')
}

function renderCurrentTaskResultBox(task) {
  const domId = feedbackDomId(task.guid)
  return `
    <div class="detail-sec" style="border-top:1px solid var(--border);margin-top:12px;padding-top:12px">
      <div class="detail-label">đánh giá kết quả → AI memory</div>
      <textarea
        id="task-result-${domId}"
        rows="3"
        placeholder="Nhập đánh giá kết quả task này. VD: done ổn, nhưng thiếu reference nên phải sửa 2 vòng; lần sau cần đưa sample trước."
        style="width:100%;font-family:inherit;font-size:11px;padding:9px;border:1px solid var(--border);background:transparent;color:var(--text);resize:vertical;line-height:1.6"
      ></textarea>
      <div style="font-size:10px;color:var(--muted);margin-top:6px">
        Khi bấm “hoàn thành + gửi AI memory”, đánh giá này sẽ được lưu vào memory của member và task sẽ được đánh dấu done.
      </div>
    </div>
  `
}

async function completeTaskWithResult(guid, team, btnEl) {
  const domId = feedbackDomId(guid)
  const noteEl = document.getElementById(`task-result-${domId}`)
  const resultText = noteEl?.value?.trim() || ''

  if (!resultText) {
    showToast('nhập đánh giá kết quả trước khi hoàn thành')
    noteEl?.focus()
    return
  }

  const label = '✓ hoàn thành + gửi AI memory'
  if (btnEl) {
    btnEl.textContent = 'đang hoàn thành...'
    btnEl.disabled = true
  }

  try {
    const res = await fetch(`${WORKER_URL}/complete-task-result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task_guid: guid,
        team,
        result_text: resultText,
        reviewer_name: currentUser.name || localStorage.getItem('tba_creator_name') || '',
        reviewer_open_id: currentUser.open_id || '',
        context: { source: 'dashboard_complete_button' },
      }),
    })

    const data = await res.json()
    if (!data.ok) {
      showToast('lỗi hoàn thành: ' + (data.error || JSON.stringify(data)))
      if (btnEl) { btnEl.textContent = label; btnEl.disabled = false }
      return
    }

    if (noteEl) noteEl.value = ''
    showToast(data.memory_updated ? '✓ task done + AI memory đã update' : '✓ task done + đã lưu đánh giá')
    renderDashboard(currentTeam)
  } catch (err) {
    showToast('lỗi: ' + err.message)
    if (btnEl) { btnEl.textContent = label; btnEl.disabled = false }
  }
}

function toggleTaskDetail(guid) {
  const detailEl = document.getElementById('detail-' + guid)
  const cardEl   = detailEl.closest('.task-card')
  detailEl.classList.toggle('open')
  cardEl.classList.toggle('open')
}

// ─── Deadline badge ────────────────────────────────────────────

function getDeadlineBadge(deadlineStr) {
  if (!deadlineStr) return ''
  const dl   = new Date(deadlineStr)
  const now  = new Date()
  const diff = dl - now
  const days = diff / (1000 * 60 * 60 * 24)
  if (diff < 0)  return `<span class="deadline-badge overdue">quá hạn</span>`
  if (days <= 3) return `<span class="deadline-badge soon">deadline: ${formatDateShort(deadlineStr)}</span>`
  return             `<span class="deadline-badge ok">deadline: ${formatDateShort(deadlineStr)}</span>`
}

// ─── Create form ───────────────────────────────────────────────

function toggleCreateForm() {
  const section = document.getElementById('createSection')
  const toggle  = document.getElementById('createToggle')
  const isOpen  = section.classList.toggle('open')
  toggle.classList.toggle('open', isOpen)
  toggle.querySelector('span:last-child').textContent = isOpen ? 'đóng form' : 'tạo task mới'
  toggle.querySelector('.icon').textContent = isOpen ? '×' : '+'
  if (isOpen) {
    populateSaveTemplateTypeOptions()
    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  } else { resetForm() }
}

function resetForm() {
  ['f-summary', 'f-description', 'f-output', 'f-start-date', 'f-start-time', 'f-due-date', 'f-due-time', 'f-reminder', 'f-tasklist'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
  const allday = document.getElementById('f-allday')
  if (allday) allday.checked = false

  document.getElementById('resultPanel').style.display = 'none'
  const cp = document.getElementById('checkPanel')
  if (cp) { cp.className = 'check-panel'; cp.innerHTML = '' }

  selectedAssignee  = null
  selectedFollowers = []
  selectedTaskType  = null
  selectedSkillId   = null
  selectedTemplateId = null
  selectedTemplateName = null

  document.querySelectorAll('.member-chip').forEach(c => c.classList.remove('selected'))
  document.querySelectorAll('#taskTypeList .member-chip').forEach(c => c.classList.remove('selected'))

  const picker = document.getElementById('assigneeTeamPicker')
  if (picker) { picker.innerHTML = ''; picker.style.display = 'none' }

  hideTemplatePicker()
  closeSaveTemplateModal()

  document.querySelectorAll('.err').forEach(e => e.classList.remove('show'))
  document.getElementById('advSection').classList.remove('open')
  setSubmitState(false)
}

function toggleAdvanced() {
  document.getElementById('advSection').classList.toggle('open')
}

// ─── Members chips ─────────────────────────────────────────────

function renderMembers() {
  const assigneeEl = document.getElementById('assigneeList')
  const followerEl = document.getElementById('followerList')
  assigneeEl.innerHTML = ''
  followerEl.innerHTML = ''

  MEMBERS.forEach(m => {
    const aChip = document.createElement('div')
    aChip.className  = 'member-chip'
    aChip.textContent = m.name
    aChip.onclick    = () => selectAssignee(m, aChip)
    assigneeEl.appendChild(aChip)

    const fChip = document.createElement('div')
    fChip.className  = 'member-chip'
    fChip.textContent = m.name
    fChip.onclick    = () => toggleFollower(m, fChip)
    followerEl.appendChild(fChip)
  })
}

function selectAssignee(member, chipEl) {
  document.querySelectorAll('#assigneeList .member-chip').forEach(c => c.classList.remove('selected'))
  chipEl.classList.add('selected')
  selectedAssignee = member
  document.getElementById('err-assignee').classList.remove('show')
  renderAssigneeTeamPicker(member)
}

function renderAssigneeTeamPicker(member) {
  const wrap = document.getElementById('assigneeTeamPicker')
  if (!wrap) return
  if (!member.teams || member.teams.length <= 1) {
    wrap.innerHTML = ''; wrap.style.display = 'none'; return
  }
  const defaultTeam = member.teams[0]
  wrap.style.display = 'block'
  wrap.innerHTML = `
    <label class="field-label" style="margin-top:12px;display:block">team Base ghi vào <span class="req">*</span></label>
    <div class="member-list" id="assigneeTeamList">
      ${member.teams.map(t => `<div class="member-chip ${t === defaultTeam ? 'selected' : ''}" onclick="selectAssigneeTeam('${t}', this)">${t}</div>`).join('')}
    </div>
    <div class="field-hint">${member.name} thuộc ${member.teams.length} team — chọn Base để ghi task này vào</div>
  `
  selectedAssignee._chosenTeam = defaultTeam
}

function selectAssigneeTeam(team, chipEl) {
  document.querySelectorAll('#assigneeTeamList .member-chip').forEach(c => c.classList.remove('selected'))
  chipEl.classList.add('selected')
  if (selectedAssignee) selectedAssignee._chosenTeam = team
}

function getAssigneeTargetTeam() {
  if (!selectedAssignee) return TEAM_FALLBACK
  if (selectedAssignee._chosenTeam) return selectedAssignee._chosenTeam
  return selectedAssignee.teams?.[0] || TEAM_FALLBACK
}

function toggleFollower(member, chipEl) {
  const idx = selectedFollowers.findIndex(f => f.open_id === member.open_id)
  if (idx >= 0) { selectedFollowers.splice(idx, 1); chipEl.classList.remove('selected') }
  else          { selectedFollowers.push(member);    chipEl.classList.add('selected') }
}

// ─── Helpers ───────────────────────────────────────────────────

function toTimestampMs(dateStr) {
  if (!dateStr) return null
  const normalized = dateStr.length === 10 ? dateStr + 'T00:00' : dateStr
  const ms = new Date(normalized).getTime()
  return isNaN(ms) ? null : String(ms)
}

function formatDateShort(isoStr) {
  const d = new Date(isoStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

function setSubmitState(loading, step) {
  isSubmitting = loading
  const btn = document.getElementById('btnSubmit')
  const txt = step === 'base'       ? 'đang ghi vào base...'
            : step === 'suggestion' ? 'AI đang sinh câu hỏi...'
            : loading ? 'đang tạo task...' : 'tạo task →'
  btn.textContent = txt
  btn.disabled    = loading
  btn.style.opacity = loading ? '.6' : '1'
}

function buildTaskBody() {
  const summary      = document.getElementById('f-summary').value.trim()
  const descRaw      = document.getElementById('f-description').value.trim()
  const outputExpect = document.getElementById('f-output').value.trim()
  const startDate    = document.getElementById('f-start-date').value
  const startTime    = document.getElementById('f-start-time').value
  const startVal     = startDate ? (startTime ? `${startDate}T${startTime}` : `${startDate}T00:00`) : ''
  const dueDate      = document.getElementById('f-due-date').value
  const dueTime      = document.getElementById('f-due-time').value
  const dueVal       = dueDate ? (dueTime ? `${dueDate}T${dueTime}` : `${dueDate}T23:59`) : ''
  const isAllDay     = document.getElementById('f-allday').checked
  const reminderVal  = document.getElementById('f-reminder').value
  const repeatVal    = document.getElementById('f-repeat').value
  const tasklistVal  = document.getElementById('f-tasklist').value.trim()

  const typeTag     = selectedTaskType ? `[${selectedTaskType.name}] ` : ''
  const description = outputExpect
    ? `${descRaw}\n\n---\n📦 output kỳ vọng:\n${outputExpect}`
    : descRaw

  const members = []
  if (selectedAssignee) members.push({ id: selectedAssignee.open_id, type: 'user', role: 'assignee' })
  selectedFollowers.forEach(f => {
    if (!selectedAssignee || f.open_id !== selectedAssignee.open_id)
      members.push({ id: f.open_id, type: 'user', role: 'follower' })
  })

  const body = { summary: typeTag + summary, description, members }
  if (dueVal) {
    const dueTs = toTimestampMs(dueVal)
    if (dueTs) body.due = { timestamp: dueTs, is_all_day: isAllDay }
  }
  if (startVal) {
    const startTs = toTimestampMs(startVal)
    if (startTs) body.start = { timestamp: startTs, is_all_day: isAllDay }
  }
  if (reminderVal && Number(reminderVal) >= 0) body.reminders = [{ relative_fire_minute: Number(reminderVal) }]
  if (repeatVal)   body.repeat_rule = repeatVal
  if (tasklistVal) body.tasklists   = [{ tasklist_guid: tasklistVal }]

  return body
}

function validate() {
  const summary = document.getElementById('f-summary').value.trim()
  const desc    = document.getElementById('f-description').value.trim()
  const output  = document.getElementById('f-output').value.trim()
  document.getElementById('err-summary').classList.toggle('show', !summary)
  document.getElementById('err-description').classList.toggle('show', !desc)
  document.getElementById('err-output').classList.toggle('show', !output)
  document.getElementById('err-assignee').classList.toggle('show', !selectedAssignee)
  return !!(summary && desc && output && selectedAssignee)
}

// ─── Check brief ───────────────────────────────────────────────

// ─── Memory event context ─────────────────────────────────────

function getMemoryEventContext() {
  return {
    assignee_name: selectedAssignee?.name || '',
    task_type_id: selectedTaskType?.id || null,
    task_type_name: selectedTaskType?.name || null,
    template_id: selectedTemplateId || null,
    template_name: selectedTemplateName || null,
    created_by_name: currentUser.name || localStorage.getItem('tba_creator_name') || '',
    created_by_open_id: currentUser.open_id || '',
  }
}

async function checkBrief() {
  const summary = document.getElementById('f-summary').value.trim()
  const desc    = document.getElementById('f-description').value.trim()
  const output  = document.getElementById('f-output').value.trim()
  const panel   = document.getElementById('checkPanel')
  const btn     = document.getElementById('btnCheckBrief')

  if (!selectedAssignee) {
    panel.className = 'check-panel open fail'
    panel.innerHTML = `<div class="check-header"><span>⚠ chưa chọn assignee</span></div><div style="font-size:11px;color:var(--muted)">Chọn người nhận task trước khi check brief.</div>`
    return
  }

  const briefFull = [
    summary ? `Task: ${summary}` : '',
    desc,
    output ? `Output kỳ vọng:\n${output}` : '',
  ].filter(Boolean).join('\n\n')

  btn.textContent = 'đang check...'
  btn.disabled    = true

  try {
    const res  = await fetch(`${WORKER_URL}/check-brief`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brief:            briefFull,
        assignee_open_id: selectedAssignee.open_id,
        assignee_team:    getAssigneeTargetTeam(),
        skill_id:         selectedSkillId || null,
        task_summary:     summary,
        ...getMemoryEventContext(),
      }),
    })
    const data = await res.json()
    if (!data.checklist) {
      panel.className = 'check-panel open fail'
      panel.innerHTML = `<div class="check-header"><span>⚠ lỗi check</span></div><pre style="font-size:11px">${JSON.stringify(data)}</pre>`
      return
    }
    renderCheckPanel(data)
  } catch (err) {
    panel.className = 'check-panel open fail'
    panel.innerHTML = `<div class="check-header"><span>⚠ lỗi network</span></div><div style="font-size:11px;color:var(--muted)">${err.message}</div>`
  } finally {
    btn.textContent = '↻ check brief'
    btn.disabled    = false
  }
}

function renderCheckPanel(data) {
  const panel   = document.getElementById('checkPanel')
  const pass    = data.pass_count
  const total   = data.total
  const allPass = pass === total

  const rows = data.checklist.map(c => `
    <div class="check-row">
      <div class="check-icon ${c.pass ? 'pass' : 'fail'}">${c.pass ? '✓' : '!'}</div>
      <div class="check-body">
        <div class="check-item">${c.item}</div>
        ${c.suggestion ? `<div class="check-suggest">→ ${c.suggestion}</div>` : ''}
      </div>
    </div>
  `).join('')

  // Task type note
  const typeNoteHTML = data.task_type_note
    ? `<div class="check-type-note">📌 đặc thù loại task <strong>${selectedTaskType?.name || ''}</strong>: ${data.task_type_note}</div>`
    : (selectedTaskType ? `<div class="check-type-note" style="color:var(--muted)">📌 loại task "${selectedTaskType.name}" chưa có skill — <a href="skills.html" style="color:var(--accent);text-decoration:none">thêm tại skills</a></div>` : '')

  const historyHTML = data.history_context
    ? `<div class="check-history">📚 lịch sử ${selectedAssignee.name}: <strong>${data.history_context.total_tasks}</strong> task, <strong>${data.history_context.stuck_count}</strong> đang pending</div>`
    : `<div class="check-history">📚 ${selectedAssignee.name} chưa có task nào trong base team này</div>`

  const skillLabel = selectedSkillId
    ? (selectedTaskType ? ` · ${selectedTaskType.name}` : ' · skill đã chọn')
    : ''
  panel.className = `check-panel open ${allPass ? 'pass' : 'fail'}`
  panel.innerHTML = `
    <div class="check-header">
      <span>// brief check — ${selectedAssignee.name}${skillLabel}</span>
      <span class="score ${allPass ? 'pass' : 'fail'}">${pass}/${total} pass</span>
    </div>
    <div class="check-list">${rows}</div>
    ${typeNoteHTML}
    ${historyHTML}
  `
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

// ─── Submit ────────────────────────────────────────────────────

async function submitTask() {
  if (isSubmitting) return
  if (!validate()) {
    document.getElementById('createSection').scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }

  setSubmitState(true)
  const body = buildTaskBody()

  try {
    // Bước 1: tạo Lark Task
    const res  = await fetch(`${WORKER_URL}/create-task`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const data = await res.json()

    if (!data.data?.task?.guid) {
      showResult('error', null, data.msg || data.message || JSON.stringify(data))
      return
    }

    const taskGuid = data.data.task.guid

    // Bước 2: ghi vào Lark Base
    setSubmitState(true, 'base')
    try {
      await fetch(`${WORKER_URL}/write-to-base`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team:             getAssigneeTargetTeam(),
          task_guid:        taskGuid,
          summary:          body.summary,
          description:      body.description,
          assignee_name:    selectedAssignee.name,
          assignee_open_id: selectedAssignee.open_id,
          created_by:       currentUser.name
                              || localStorage.getItem('tba_creator_name')
                              || '(chưa xác định)',
          deadline:         body.due ? new Date(Number(body.due.timestamp)).toISOString() : '',
        }),
      })
    } catch (e) { console.warn('[write-to-base]', e.message) }

    // Bước 3: generate warm-up
    setSubmitState(true, 'suggestion')
    try {
      const genRes  = await fetch(`${WORKER_URL}/generate-suggestion`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_guid:        taskGuid,
          assignee_open_id: selectedAssignee.open_id,
          assignee_team:    getAssigneeTargetTeam(),
          skill_id:         selectedSkillId || null,
          // Pass data trực tiếp — tránh Base timing issue
          task_summary:     body.summary,
          task_description: body.description,
          ...getMemoryEventContext(),
        }),
      })
      const genData = await genRes.json()
      lastGenResult = genData
      if (!genData.ok) {
        console.warn('[generate-suggestion] không thành công:', JSON.stringify(genData))
      }
    } catch (e) { console.warn('[generate-suggestion]', e.message) }

    showResult('success', taskGuid)

  } catch (err) {
    showResult('error', null, err.message)
  } finally {
    setSubmitState(false)
  }
}

// ─── Mark task done / reopen ─────────────────────────────────────

async function markTaskDone(guid, team, done, btnEl) {
  const label = done ? '✓ hoàn thành' : '↩ reopen'
  if (btnEl) { btnEl.textContent = '⏳'; btnEl.disabled = true }

  try {
    const res  = await fetch(`${WORKER_URL}/mark-done`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ task_guid: guid, team, done }),
    })
    const data = await res.json()
    if (data.ok) {
      showToast(done ? '✓ task đã hoàn thành' : '↩ task đã reopen')
      renderDashboard(currentTeam)
    } else {
      showToast('lỗi: ' + (data.error || JSON.stringify(data)))
      if (btnEl) { btnEl.textContent = label; btnEl.disabled = false }
    }
  } catch (err) {
    showToast('lỗi: ' + err.message)
    if (btnEl) { btnEl.textContent = label; btnEl.disabled = false }
  }
}

// ─── Sync status từ Lark Task về Base ───────────────────────────

async function syncTaskStatus(guid, team, btnEl) {
  if (btnEl) { btnEl.textContent = '⏳'; btnEl.disabled = true }
  try {
    const res  = await fetch(`${WORKER_URL}/sync-task-status`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ task_guid: guid, team }),
    })
    const data = await res.json()
    if (data.ok) {
      showToast(`✓ cập nhật status: ${data.new_status}`)
      renderDashboard(currentTeam)
    } else {
      showToast('lỗi sync: ' + (data.error || JSON.stringify(data)))
    }
  } catch (err) {
    showToast('lỗi: ' + err.message)
  } finally {
    if (btnEl) { btnEl.textContent = '↻'; btnEl.disabled = false }
  }
}

function showResult(type, taskGuid, errMsg) {
  const panel = document.getElementById('resultPanel')
  panel.style.display = 'block'
  if (type === 'success') {
    panel.className = 'result-panel success'
    const warmupNote = lastGenResult?.ok === false
      ? '<br><span style="color:var(--amber)">⚠ warm-up chưa được chèn — kiểm tra Lark app scope hoặc task guid.</span>'
      : '<br>câu hỏi warm-up đã được chèn vào description Lark task.'
    panel.innerHTML = `
      <div class="result-title">// task đã tạo thành công</div>
      <div class="result-body">
        task guid: <strong>${taskGuid}</strong>${warmupNote}
      </div>
      <button class="btn btn-ghost" style="margin-top:12px;width:auto;padding:8px 14px" onclick="resetForm();toggleCreateForm()">tạo task khác</button>
      <button class="btn btn-ghost" style="margin-top:12px;width:auto;padding:8px 14px;margin-left:8px" onclick="renderDashboard(currentTeam)">↻ refresh dashboard</button>
    `
  } else {
    panel.className = 'result-panel error'
    panel.innerHTML = `<div class="result-title">// lỗi khi tạo task</div><div class="result-body">${errMsg}</div>`
  }
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}
