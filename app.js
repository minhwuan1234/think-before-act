// ============================================================
//  THINK-BEFORE-ACT — app.js
//  PHASE 2: Gọi Cloudflare Worker → tạo Lark Task thật
//  + Debug logs cho Lark SDK (Phase 1 fix)
//  + Team selector thủ công (fallback khi SDK chưa lấy được user)
// ============================================================

const APP_ID     = 'cli_aab1ef7c8d785ed4'
const WORKER_URL = 'https://think-before-act-proxy.minhwuan889.workers.dev'

const MEMBERS = [
  { name: 'Quân',       open_id: 'ou_9ed35df790cc4a522b2c184ee5a87159', team: 'BD' },
  { name: 'Chi',        open_id: 'ou_90bf9de23e0771d26a58637225ea6de8', team: 'L&D' },
  { name: 'Giang',      open_id: 'ou_placeholder_giang',                  team: 'BD' },
  { name: 'Huyền Linh', open_id: 'ou_placeholder_hlinh',                  team: 'BD' },
  { name: 'Nga Linh',   open_id: 'ou_placeholder_nlinh',                  team: 'BD' },
  { name: 'Minh Anh',   open_id: 'ou_placeholder_manh',                   team: 'ACCOUNT' },
  { name: 'Hân',        open_id: 'ou_placeholder_han',                    team: 'ACCOUNT' },
]

const TEAMS = ['BD', 'PM', 'AI', 'ACCOUNT']
const TEAM_FALLBACK = 'BD'
const TEAM_STORAGE_KEY = 'tba_selected_team'

// ─── State ─────────────────────────────────────────────────

let currentUser = { open_id: '', name: '', avatar: '', team: '' }
let isInLark = false
let selectedAssignee  = null
let selectedFollowers = []
let currentTeam = ''
let isSubmitting = false

// ─── Init ──────────────────────────────────────────────────

// Guard chống init 2 lần (Lark có thể fire DOMContentLoaded 2 lần)
let __initialized = false
document.addEventListener('DOMContentLoaded', async () => {
  if (__initialized) return
  __initialized = true
  renderMembers()
  renderTeamSelector()
  await initLark()
})

// ─── Team selector ──────────────────────────────────────────

function renderTeamSelector() {
  const sel = document.getElementById('teamSelector')
  if (!sel) return
  TEAMS.forEach(t => {
    const opt = document.createElement('option')
    opt.value = t
    opt.textContent = t
    sel.appendChild(opt)
  })

  // Restore từ localStorage nếu có
  const saved = localStorage.getItem(TEAM_STORAGE_KEY)
  if (saved && TEAMS.includes(saved)) sel.value = saved

  sel.addEventListener('change', () => {
    localStorage.setItem(TEAM_STORAGE_KEY, sel.value)
    setTeam(sel.value)
  })
}

function syncTeamSelector(team) {
  const sel = document.getElementById('teamSelector')
  if (sel && TEAMS.includes(team)) sel.value = team
}

// ─── Lark SDK ──────────────────────────────────────────────

async function initLark() {
  const nameEl   = document.getElementById('nameDisplay')
  const avatarEl = document.getElementById('userAvatar')

  console.log('[Lark SDK] env check — h5sdk:', typeof window.h5sdk, 'tt:', typeof window.tt, 'UA:', navigator.userAgent)

  if (typeof window.h5sdk === 'undefined' && typeof window.tt === 'undefined') {
    isInLark = false
    nameEl.textContent = '(ngoài Lark)'
    nameEl.classList.remove('loading')
    // Dùng team đã lưu hoặc fallback
    const saved = localStorage.getItem(TEAM_STORAGE_KEY)
    setTeam(saved && TEAMS.includes(saved) ? saved : TEAM_FALLBACK)
    return
  }

  isInLark = true

  try {
    if (window.h5sdk) {
      console.log('[Lark SDK] using h5sdk path')
      window.h5sdk.ready(() => {
        console.log('[Lark SDK] h5sdk.ready fired')
        window.h5sdk.call('getUserInfo', {}, (res) => {
          console.log('[Lark SDK] getUserInfo response:', JSON.stringify(res))
          if (res && res.user) {
            currentUser.name    = res.user.name   || res.user.displayName || ''
            currentUser.avatar  = res.user.avatar || res.user.avatarUrl   || ''
            currentUser.open_id = res.user.openId || ''
            console.log('[Lark SDK] parsed user:', currentUser)
            updateHeaderUser(nameEl, avatarEl)
            resolveUserTeam()
          } else {
            console.warn('[Lark SDK] no res.user — fallback')
            fallbackUser(nameEl)
          }
        })
      })
      window.h5sdk.error((err) => {
        console.error('[Lark SDK] h5sdk.error:', JSON.stringify(err))
        fallbackUser(nameEl)
      })
    } else if (window.tt) {
      console.log('[Lark SDK] using tt path')
      window.tt.ready(() => {
        console.log('[Lark SDK] tt.ready fired')
        window.tt.getUserInfo({
          success(res) {
            console.log('[Lark SDK] tt.getUserInfo success:', JSON.stringify(res))
            currentUser.name    = res.userInfo?.nickName || res.userInfo?.name || ''
            currentUser.avatar  = res.userInfo?.avatarUrl || ''
            updateHeaderUser(nameEl, avatarEl)
            resolveUserTeam()
          },
          fail(err) {
            console.error('[Lark SDK] tt.getUserInfo fail:', JSON.stringify(err))
            fallbackUser(nameEl)
          }
        })
      })
    }
  } catch (e) {
    console.error('[Lark SDK] init exception:', e.message)
    fallbackUser(nameEl)
  }
}

function updateHeaderUser(nameEl, avatarEl) {
  if (currentUser.name) { nameEl.textContent = currentUser.name; nameEl.classList.remove('loading') }
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
    // SDK lấy được user thật → dùng team từ MEMBERS, sync selector
    currentUser.team = match.team
    console.log('[Lark SDK] resolved team:', currentUser.team, '— matched member:', match.name)
    setTeam(currentUser.team)
  } else {
    // Không match (open_id placeholder) → giữ team đang chọn trên selector
    console.warn('[Lark SDK] open_id không match member nào — giữ team hiện tại')
    const saved = localStorage.getItem(TEAM_STORAGE_KEY)
    setTeam(saved && TEAMS.includes(saved) ? saved : TEAM_FALLBACK)
  }
}

// ─── Set team + render dashboard ───────────────────────────

function setTeam(team) {
  currentTeam = team
  const labelEl = document.getElementById('teamLabel')
  labelEl.textContent = 'team: ' + team
  labelEl.classList.remove('loading')
  syncTeamSelector(team)
  renderDashboard(team)
}

// ─── Dashboard render ───────────────────────────────────────

async function renderDashboard(team) {
  const listEl = document.getElementById('taskList')
  listEl.innerHTML = '<div class="empty-state"><p>đang tải...</p></div>'

  document.getElementById('stat-total').textContent   = '—'
  document.getElementById('stat-done').textContent    = '—'
  document.getElementById('stat-pending').textContent = '—'

  try {
    const res  = await fetch(`${WORKER_URL}/base-tasks?team=${team}`)
    const data = await res.json()

    const tasks = data.tasks || []

    if (tasks.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><p>chưa có task nào cho team ${team}.</p></div>`
      document.getElementById('riskPanel').innerHTML = ''
      document.getElementById('stat-total').textContent   = 0
      document.getElementById('stat-done').textContent    = 0
      document.getElementById('stat-pending').textContent = 0
      return
    }

    const taskList = tasks.map(t => {
      const f = t.fields
      return {
        guid:        f['task_guid']     || t.record_id,
        summary:     f['summary']       || '',
        description: f['description']   || '',
        assignee:    f['assignee_name'] || '',
        created_by:  f['created_by']    || '',
        created_at:  f['created_at']    || '',
        deadline:    f['deadline']      || '',
        status:      f['status']        || 'pending',
        team,
      }
    })

    const total   = taskList.length
    const done    = taskList.filter(t => t.status === 'done').length
    const pending = taskList.filter(t => t.status !== 'done').length
    document.getElementById('stat-total').textContent   = total
    document.getElementById('stat-done').textContent    = done
    document.getElementById('stat-pending').textContent = pending

    // Risk panel
    const riskEl = document.getElementById('riskPanel')
    riskEl.innerHTML = buildRiskPanel(taskList)

    listEl.innerHTML = ''
    taskList.forEach(task => listEl.appendChild(buildTaskCard(task)))

  } catch (err) {
    listEl.innerHTML = `<div class="empty-state"><p>lỗi tải data: ${err.message}</p></div>`
  }
}

// ─── Risk Panel ────────────────────────────────────────────

function buildRiskPanel(tasks) {
  const now     = Date.now()
  const DAY_MS  = 1000 * 60 * 60 * 24

  const risks = []

  tasks.forEach(task => {
    if (task.status === 'done') return

    const deadlineMs  = task.deadline ? new Date(task.deadline).getTime() : null
    const createdMs   = task.created_at ? new Date(task.created_at).getTime() : null
    const daysSince   = createdMs ? Math.floor((now - createdMs) / DAY_MS) : null
    const daysToDeadline = deadlineMs ? Math.floor((deadlineMs - now) / DAY_MS) : null
    const briefLen    = (task.description || '').replace(/\s+/g, ' ').trim().length

    // 🔴 Overdue
    if (deadlineMs && deadlineMs < now) {
      const overdueDays = Math.abs(daysToDeadline)
      risks.push({
        level:   'red',
        task,
        reason:  `quá hạn ${overdueDays} ngày`,
        sort:    0,
      })
      return
    }

    // 🔴 Deadline trong 1 ngày mà vẫn pending
    if (daysToDeadline !== null && daysToDeadline <= 1 && task.status === 'pending') {
      risks.push({
        level:  'red',
        task,
        reason: `deadline ${daysToDeadline === 0 ? 'hôm nay' : 'ngày mai'}, vẫn pending`,
        sort:   1,
      })
      return
    }

    // 🟡 Deadline trong 3 ngày mà vẫn pending
    if (daysToDeadline !== null && daysToDeadline <= 3 && task.status === 'pending') {
      risks.push({
        level:  'amber',
        task,
        reason: `deadline còn ${daysToDeadline} ngày, vẫn pending`,
        sort:   2,
      })
    }

    // 🟡 Tạo task hơn 3 ngày chưa có update (status vẫn pending)
    if (daysSince !== null && daysSince >= 3 && task.status === 'pending') {
      risks.push({
        level:  'amber',
        task,
        reason: `${daysSince} ngày chưa có update`,
        sort:   3,
      })
    }

    // 🟡 Brief quá ngắn (< 50 ký tự)
    if (briefLen < 50) {
      risks.push({
        level:  'amber',
        task,
        reason: `brief quá ngắn (${briefLen} ký tự) — junior có thể chưa đủ context`,
        sort:   4,
      })
    }
  })

  // Dedup theo task guid — giữ risk nặng nhất
  const seen = {}
  const deduped = risks
    .sort((a, b) => a.sort - b.sort)
    .filter(r => {
      if (seen[r.task.guid]) return false
      seen[r.task.guid] = true
      return true
    })

  if (deduped.length === 0) return ''

  const rows = deduped.map(r => `
    <div class="risk-row" onclick="highlightTask('${r.task.guid}')">
      <div class="risk-dot risk-dot-${r.level}"></div>
      <div class="risk-info">
        <div class="risk-name">${r.task.summary || '(không tên)'}</div>
        <div class="risk-assignee">→ ${r.task.assignee}</div>
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
    </div>
  `
}

function highlightTask(guid) {
  const card = document.querySelector(`.task-card[data-guid="${guid}"]`)
  if (!card) return
  card.scrollIntoView({ behavior: 'smooth', block: 'center' })
  card.classList.add('highlight')
  setTimeout(() => card.classList.remove('highlight'), 2000)
}

function toggleRiskPanel() {
  const panel = document.getElementById('riskPanelInner')
  if (panel) panel.classList.toggle('collapsed')
}

function buildTaskCard(task) {
  const deadlineBadge = getDeadlineBadge(task.deadline)

  const card = document.createElement('div')
  card.className = 'task-card'
  card.dataset.guid = task.guid
  card.innerHTML = `
    <div class="task-row" onclick="toggleTaskDetail('${task.guid}')">
      <div class="task-status ${task.status === 'done' ? 'done' : task.status === 'in-progress' ? 'in-progress' : ''}"></div>
      <div class="task-main">
        <div class="task-name">${task.summary}</div>
        <div class="task-meta">
          <span>→ ${task.assignee}</span>
          <span>by ${task.created_by}</span>
          ${deadlineBadge}
        </div>
      </div>
      <div class="chevron">▾</div>
    </div>
    <div class="task-detail" id="detail-${task.guid}">
      ${buildTaskDetail(task)}
    </div>
  `
  return card
}

function buildTaskDetail(task) {
  return `
    <div class="detail-sec">
      <div class="detail-label">brief</div>
      <div class="detail-text">${task.description}</div>
    </div>
    <div class="detail-sec">
      <div class="detail-label">câu hỏi warm-up</div>
      <div class="detail-text" style="color:var(--muted);font-size:11px">AI đã comment câu hỏi warm-up vào Lark task. Junior mở task trong Lark để xem.</div>
    </div>
  `
}

function toggleTaskDetail(guid) {
  const detailEl = document.getElementById('detail-' + guid)
  const cardEl   = detailEl.closest('.task-card')
  detailEl.classList.toggle('open')
  cardEl.classList.toggle('open')
}

// ─── Deadline badge ─────────────────────────────────────────

function getDeadlineBadge(deadlineStr) {
  if (!deadlineStr) return ''
  const dl   = new Date(deadlineStr)
  const now  = new Date()
  const diff = dl - now
  const days = diff / (1000 * 60 * 60 * 24)
  if (diff < 0)    return `<span class="deadline-badge overdue">quá hạn</span>`
  if (days <= 3)   return `<span class="deadline-badge soon">deadline: ${formatDateShort(deadlineStr)}</span>`
  return             `<span class="deadline-badge ok">deadline: ${formatDateShort(deadlineStr)}</span>`
}

// ─── Create form toggle ─────────────────────────────────────

function toggleCreateForm() {
  const section = document.getElementById('createSection')
  const toggle  = document.getElementById('createToggle')
  const isOpen  = section.classList.toggle('open')
  toggle.classList.toggle('open', isOpen)
  toggle.querySelector('span:last-child').textContent = isOpen ? 'đóng form' : 'tạo task mới'
  toggle.querySelector('.icon').textContent = isOpen ? '×' : '+'
  if (isOpen) section.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  else resetForm()
}

function resetForm() {
  document.getElementById('f-summary').value     = ''
  document.getElementById('f-description').value = ''
  document.getElementById('f-output').value      = ''
  document.getElementById('f-start').value       = ''
  document.getElementById('f-due').value         = ''
  document.getElementById('f-allday').checked    = false
  document.getElementById('f-reminder').value    = ''
  document.getElementById('f-repeat').value      = ''
  document.getElementById('f-tasklist').value    = ''
  document.getElementById('resultPanel').style.display = 'none'
  const cp = document.getElementById('checkPanel')
  if (cp) { cp.className = 'check-panel'; cp.innerHTML = '' }
  selectedAssignee  = null
  selectedFollowers = []
  document.querySelectorAll('.member-chip').forEach(c => c.classList.remove('selected'))
  document.querySelectorAll('.err').forEach(e => e.classList.remove('show'))
  document.getElementById('advSection').classList.remove('open')
  setSubmitState(false)
}

function toggleAdvanced() {
  document.getElementById('advSection').classList.toggle('open')
}

// ─── Render member chips ────────────────────────────────────

function renderMembers() {
  const assigneeEl = document.getElementById('assigneeList')
  const followerEl = document.getElementById('followerList')
  assigneeEl.innerHTML = ''
  followerEl.innerHTML = ''

  MEMBERS.forEach(m => {
    const aChip = document.createElement('div')
    aChip.className = 'member-chip'
    aChip.textContent = m.name
    aChip.onclick = () => selectAssignee(m, aChip)
    assigneeEl.appendChild(aChip)

    const fChip = document.createElement('div')
    fChip.className = 'member-chip'
    fChip.textContent = m.name
    fChip.onclick = () => toggleFollower(m, fChip)
    followerEl.appendChild(fChip)
  })
}

function selectAssignee(member, chipEl) {
  document.querySelectorAll('#assigneeList .member-chip').forEach(c => c.classList.remove('selected'))
  chipEl.classList.add('selected')
  selectedAssignee = member
  document.getElementById('err-assignee').classList.remove('show')
}

function toggleFollower(member, chipEl) {
  const idx = selectedFollowers.findIndex(f => f.open_id === member.open_id)
  if (idx >= 0) { selectedFollowers.splice(idx, 1); chipEl.classList.remove('selected') }
  else          { selectedFollowers.push(member);    chipEl.classList.add('selected') }
}

// ─── Helpers ────────────────────────────────────────────────

function toTimestampMs(dateStr) {
  if (!dateStr) return null
  const normalized = dateStr.length === 10 ? dateStr + 'T00:00' : dateStr
  const ms = new Date(normalized).getTime()
  return isNaN(ms) ? null : String(ms)
}

function formatDate(isoStr) {
  const d = new Date(isoStr)
  return `${d.getDate()}/${d.getMonth()+1} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function formatDateShort(isoStr) {
  const d = new Date(isoStr)
  return `${d.getDate()}/${d.getMonth()+1}`
}

function setSubmitState(loading, step) {
  isSubmitting = loading
  const btn = document.getElementById('btnSubmit')
  const txt = step === 'base'       ? 'đang ghi vào base...'
            : step === 'suggestion' ? 'AI đang sinh câu hỏi...'
            : loading ? 'đang tạo task...' : 'tạo task →'
  btn.textContent   = txt
  btn.disabled      = loading
  btn.style.opacity = loading ? '.6' : '1'
}

// ─── Build task body ────────────────────────────────────────

function buildTaskBody() {
  const summary      = document.getElementById('f-summary').value.trim()
  const descRaw      = document.getElementById('f-description').value.trim()
  const outputExpect = document.getElementById('f-output').value.trim()
  const startVal     = document.getElementById('f-start').value
  const dueVal       = document.getElementById('f-due').value
  const isAllDay     = document.getElementById('f-allday').checked
  const reminderVal  = document.getElementById('f-reminder').value
  const repeatVal    = document.getElementById('f-repeat').value
  const tasklistVal  = document.getElementById('f-tasklist').value.trim()

  const description = outputExpect
    ? `${descRaw}\n\n---\n📦 output kỳ vọng:\n${outputExpect}`
    : descRaw

  const members = []
  if (selectedAssignee) members.push({ id: selectedAssignee.open_id, type: 'user', role: 'assignee' })
  selectedFollowers.forEach(f => {
    if (!selectedAssignee || f.open_id !== selectedAssignee.open_id)
      members.push({ id: f.open_id, type: 'user', role: 'follower' })
  })

  const body = { summary, description, members }
  console.log('[Phase 2] members array:', JSON.stringify(members))
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

// ─── Validate ───────────────────────────────────────────────

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

// ─── Check brief (pre-submit review) ────────────────────────

async function checkBrief() {
  const summary      = document.getElementById('f-summary').value.trim()
  const desc         = document.getElementById('f-description').value.trim()
  const output       = document.getElementById('f-output').value.trim()
  const panel        = document.getElementById('checkPanel')
  const btn          = document.getElementById('btnCheckBrief')

  if (!selectedAssignee) {
    panel.className   = 'check-panel open fail'
    panel.innerHTML   = `<div class="check-header"><span>⚠ chưa chọn assignee</span></div><div style="font-size:11px;color:var(--muted)">Chọn người nhận task trước khi check brief — để hệ thống kéo đúng skill + lịch sử của họ.</div>`
    return
  }

  if (!summary && !desc && !output) {
    panel.className = 'check-panel open fail'
    panel.innerHTML = `<div class="check-header"><span>⚠ brief trống</span></div><div style="font-size:11px;color:var(--muted)">Điền ít nhất tên task hoặc brief để check.</div>`
    return
  }

  // Tổng hợp brief y như cách submitTask làm
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
        assignee_team:    selectedAssignee.team,
      }),
    })
    const data = await res.json()
    console.log('[check-brief] response:', JSON.stringify(data))

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
  const panel = document.getElementById('checkPanel')
  const pass  = data.pass_count
  const total = data.total
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

  const historyHTML = data.history_context
    ? `<div class="check-history">
         📚 lịch sử ${selectedAssignee.name}: <strong>${data.history_context.total_tasks}</strong> task,
         <strong>${data.history_context.stuck_count}</strong> đang pending
       </div>`
    : `<div class="check-history">📚 ${selectedAssignee.name} chưa có task nào trong base team này</div>`

  panel.className = `check-panel open ${allPass ? 'pass' : 'fail'}`
  panel.innerHTML = `
    <div class="check-header">
      <span>// brief check — ${selectedAssignee.name}</span>
      <span class="score ${allPass ? 'pass' : 'fail'}">${pass}/${total} pass</span>
    </div>
    <div class="check-list">${rows}</div>
    ${historyHTML}
  `

  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

// ─── Submit ─────────────────────────────────────────────────

async function submitTask() {
  if (isSubmitting) return
  if (!validate()) {
    document.getElementById('createSection').scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }

  setSubmitState(true)
  const body = buildTaskBody()

  try {
    // Bước 1: tạo task chính
    const res  = await fetch(`${WORKER_URL}/create-task`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json()

    if (!data.data || !data.data.task || !data.data.task.guid) {
      const errMsg = data.msg || data.message || JSON.stringify(data)
      showResult('error', null, errMsg)
      return
    }

    const taskGuid = data.data.task.guid

    // Bước 2: ghi vào Lark Base
    setSubmitState(true, 'base')
    try {
      const wrRes  = await fetch(`${WORKER_URL}/write-to-base`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team:          selectedAssignee.team,
          task_guid:     taskGuid,
          summary:       body.summary,
          description:   body.description,
          assignee_name:    selectedAssignee.name,
          assignee_open_id: selectedAssignee.open_id,
          created_by:    currentUser.name || '(unknown)',
          deadline:      body.due ? new Date(Number(body.due.timestamp)).toISOString() : '',
        }),
      })
      const wrData = await wrRes.json()
      console.log('[write-to-base]', JSON.stringify(wrData))
    } catch (e) {
      console.warn('[write-to-base] lỗi:', e.message)
    }

    // Bước 3: AI vào Lark Base đọc task + history + skill → sinh câu hỏi → PATCH vào description Lark Task
    setSubmitState(true, 'suggestion')
    try {
      const sugRes  = await fetch(`${WORKER_URL}/generate-suggestion`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_guid:        taskGuid,
          assignee_open_id: selectedAssignee.open_id,
          assignee_team:    selectedAssignee.team,
        }),
      })
      const sugData = await sugRes.json()
      console.log('[generate-suggestion]', JSON.stringify(sugData))
    } catch (e) {
      console.warn('[generate-suggestion] lỗi:', e.message)
    }

    showResult('success', taskGuid)

  } catch (err) {
    showResult('error', null, err.message)
  } finally {
    setSubmitState(false)
  }
}



function showResult(type, taskGuid, errMsg) {
  const panel = document.getElementById('resultPanel')
  panel.style.display = 'block'

  if (type === 'success') {
    panel.className = 'result-panel success'
    panel.innerHTML = `
      <div class="result-title">// task đã tạo thành công</div>
      <div class="result-body">
        task guid: <strong>${taskGuid}</strong><br>
        AI đang sinh câu hỏi warm-up và comment vào Lark task.<br>
        junior sẽ nhận được notification trong Lark.
      </div>
      <button class="btn btn-ghost" style="margin-top:12px;width:auto;padding:8px 14px" onclick="resetForm();toggleCreateForm()">tạo task khác</button>
      <button class="btn btn-ghost" style="margin-top:12px;width:auto;padding:8px 14px;margin-left:8px" onclick="renderDashboard(currentTeam)">↻ refresh dashboard</button>
    `
  } else {
    panel.className = 'result-panel error'
    panel.innerHTML = `
      <div class="result-title">// lỗi khi tạo task</div>
      <div class="result-body">${errMsg}</div>
    `
  }

  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}
