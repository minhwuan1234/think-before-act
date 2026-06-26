// ============================================================
//  THINK-BEFORE-ACT — app.js
//  PHASE 2: Gọi Cloudflare Worker → tạo Lark Task thật
//  + Debug logs cho Lark SDK (Phase 1 fix)
// ============================================================

const APP_ID     = 'cli_aab1ef7c8d785ed4'
const WORKER_URL = 'https://think-before-act-proxy.minhwuan889.workers.dev'

const MEMBERS = [
  { name: 'Quân',       open_id: 'ou_9ed35df790cc4a522b2c184ee5a87159', team: 'AI' },
  { name: 'Chi',        open_id: 'ou_90bf9de23e0771d26a58637225ea6de8', team: 'L&D' },
  { name: 'Giang',      open_id: 'ou_placeholder_giang',                  team: 'BD' },
  { name: 'Huyền Linh', open_id: 'ou_placeholder_hlinh',                  team: 'BD' },
  { name: 'Nga Linh',   open_id: 'ou_placeholder_nlinh',                  team: 'BD' },
  { name: 'Minh Anh',   open_id: 'ou_placeholder_manh',                   team: 'ACCOUNT' },
  { name: 'Hân',        open_id: 'ou_placeholder_han',                    team: 'ACCOUNT' },
]

const TEAM_FALLBACK = 'BD'

// ─── State ─────────────────────────────────────────────────

let currentUser = { open_id: '', name: '', avatar: '', team: '' }
let isInLark = false
let selectedAssignee  = null
let selectedFollowers = []
let currentTeam = ''
let isSubmitting = false

// ─── Init ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  renderMembers()
  await initLark()
})

// ─── Lark SDK ──────────────────────────────────────────────

async function initLark() {
  const nameEl   = document.getElementById('nameDisplay')
  const avatarEl = document.getElementById('userAvatar')

  console.log('[Lark SDK] env check — h5sdk:', typeof window.h5sdk, 'tt:', typeof window.tt, 'UA:', navigator.userAgent)

  if (typeof window.h5sdk === 'undefined' && typeof window.tt === 'undefined') {
    isInLark = false
    nameEl.textContent = '(ngoài Lark)'
    nameEl.classList.remove('loading')
    setTeam(TEAM_FALLBACK)
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
    setTeam(TEAM_FALLBACK)
  }
}

function updateHeaderUser(nameEl, avatarEl) {
  if (currentUser.name) { nameEl.textContent = currentUser.name; nameEl.classList.remove('loading') }
  if (currentUser.avatar) { avatarEl.src = currentUser.avatar; avatarEl.style.display = 'block' }
}

function fallbackUser(nameEl) {
  nameEl.textContent = '(không lấy được tên)'
  nameEl.classList.remove('loading')
  setTeam(TEAM_FALLBACK)
}

function resolveUserTeam() {
  const match = MEMBERS.find(m => m.open_id === currentUser.open_id)
  currentUser.team = match ? match.team : TEAM_FALLBACK
  console.log('[Lark SDK] resolved team:', currentUser.team, 'matched member:', !!match)
  setTeam(currentUser.team)
}

// ─── Set team + render dashboard ───────────────────────────

function setTeam(team) {
  currentTeam = team
  const labelEl = document.getElementById('teamLabel')
  labelEl.textContent = 'team: ' + team
  labelEl.classList.remove('loading')
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

    const tasks    = data.tasks    || []
    const subtasks = data.subtasks || []

    if (tasks.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><p>chưa có task nào cho team ${team}.</p></div>`
      document.getElementById('stat-total').textContent   = 0
      document.getElementById('stat-done').textContent    = 0
      document.getElementById('stat-pending').textContent = 0
      return
    }

    const subMap = {}
    subtasks.forEach(s => {
      const f       = s.fields
      const tguid   = f['task_guid'] || ''
      if (!subMap[tguid]) subMap[tguid] = []
      subMap[tguid].push({
        angle:      f['question']   || '',
        done:       f['completed']  || false,
        checked_at: f['checked_at'] || null,
      })
    })

    const taskList = tasks.map(t => {
      const f = t.fields
      return {
        guid:        f['task_guid']       || t.record_id,
        summary:     f['summary']         || '',
        description: f['description']     || '',
        assignee:    f['assignee_name']   || '',
        created_by:  f['created_by']      || '',
        created_at:  f['created_at']      || '',
        deadline:    f['deadline']        || '',
        status:      f['status']          || 'pending',
        team,
        subtasks:    subMap[f['task_guid']] || [],
        claude_suggestion: null,
      }
    })

    const total   = taskList.length
    const done    = taskList.filter(t => t.status === 'done').length
    const pending = taskList.filter(t => t.status !== 'done').length
    document.getElementById('stat-total').textContent   = total
    document.getElementById('stat-done').textContent    = done
    document.getElementById('stat-pending').textContent = pending

    listEl.innerHTML = ''
    taskList.forEach(task => listEl.appendChild(buildTaskCard(task)))

  } catch (err) {
    listEl.innerHTML = `<div class="empty-state"><p>lỗi tải data: ${err.message}</p></div>`
  }
}

function buildTaskCard(task) {
  const doneCount     = task.subtasks.filter(s => s.done).length
  const total         = task.subtasks.length
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
      <div class="task-progress">
        <span class="done-count">${doneCount}</span>/${total}
        <div style="font-size:9px;margin-top:1px;color:var(--muted)">warm-up</div>
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
  const subtaskHTML = task.subtasks.map(s => `
    <div class="subtask-row">
      <div class="subtask-check ${s.done ? 'done' : ''}">${s.done ? '✓' : ''}</div>
      <span class="subtask-label ${s.done ? 'done' : ''}">${s.angle}</span>
      ${s.done && s.checked_at ? `<span style="font-size:9px;color:var(--muted);margin-left:auto">${formatDate(s.checked_at)}</span>` : ''}
    </div>
  `).join('')

  const claudeHTML = task.claude_suggestion ? `
    <div class="claude-block">
      <div class="claude-label">// gợi ý từ claude</div>
      <div class="claude-text">${task.claude_suggestion}</div>
    </div>
  ` : ''

  return `
    <div class="detail-sec">
      <div class="detail-label">brief</div>
      <div class="detail-text">${task.description}</div>
    </div>
    <div class="detail-sec">
      <div class="detail-label">6 câu warm-up</div>
      <div class="subtask-list">${subtaskHTML}</div>
    </div>
    ${claudeHTML}
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
  document.getElementById('f-summary').value    = ''
  document.getElementById('f-description').value = ''
  document.getElementById('f-output').value       = ''
  document.getElementById('f-start').value      = ''
  document.getElementById('f-due').value        = ''
  document.getElementById('f-allday').checked   = false
  document.getElementById('f-reminder').value   = ''
  document.getElementById('f-repeat').value     = ''
  document.getElementById('f-tasklist').value   = ''
  document.getElementById('resultPanel').style.display = 'none'
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
  const txt = step === 'subtask' ? 'đang tạo subtask...' : step === 'base' ? 'đang ghi vào base...' : step === 'suggestion' ? 'đang tạo gợi ý...' : loading ? 'đang tạo task...' : 'tạo task →'
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

// ─── Submit → gọi Worker thật ───────────────────────────────

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

    // Bước 2: tạo 6 subtask
    setSubmitState(true, 'subtask')
    const assigneeId = selectedAssignee.open_id
    const subtasks = WARMUP_QUESTIONS.map(q => ({
      summary: q,
      members: [{ id: assigneeId, type: 'user', role: 'assignee' }],
    }))

    const subRes  = await fetch(`${WORKER_URL}/create-subtasks`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ task_guid: taskGuid, subtasks }),
    })
    const subData = await subRes.json()
    console.log('[Phase 3] create-subtasks response:', JSON.stringify(subData))

    const subFailed = subData.results
      ? subData.results.filter(r => !r.data || !r.data.task).length
      : 1

    // Bước 3: ghi vào Lark Base
    setSubmitState(true, 'base')
    const subtaskList = (subData.results || [])
      .filter(r => r.data?.task?.guid)
      .map((r, i) => ({
        subtask_guid: r.data.task.guid,
        question:     WARMUP_QUESTIONS[i],
      }))
    console.log('[Phase 6] subtaskList to write-to-base:', JSON.stringify(subtaskList))

    try {
      const wrRes  = await fetch(`${WORKER_URL}/write-to-base`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team:          currentTeam || selectedAssignee.team,
          task_guid:     taskGuid,
          summary:       body.summary,
          description:   body.description,
          assignee_name: selectedAssignee.name,
          created_by:    currentUser.name || '(unknown)',
          deadline:      body.due ? new Date(Number(body.due.timestamp)).toISOString() : '',
          subtasks:      subtaskList,
        }),
      })
      const wrData = await wrRes.json()
      console.log('[Phase 6] write-to-base response:', JSON.stringify(wrData))
    } catch (e) {
      console.warn('[Phase 6] write-to-base lỗi:', e.message)
    }

    // Bước 4: generate suggestion + post comment
    setSubmitState(true, 'suggestion')
    try {
      const sugRes  = await fetch(`${WORKER_URL}/generate-suggestion`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_guid:        taskGuid,
          summary:          body.summary,
          description:      body.description,
          assignee_open_id: selectedAssignee.open_id,
          assignee_team:    selectedAssignee.team,
        }),
      })
      const sugData = await sugRes.json()
      console.log('[Phase 5] generate-suggestion response:', JSON.stringify(sugData))
    } catch (e) {
      console.warn('[Phase 5] generate-suggestion lỗi:', e.message)
    }

    showResult('success', taskGuid, null, subFailed)

  } catch (err) {
    showResult('error', null, err.message)
  } finally {
    setSubmitState(false)
  }
}

const WARMUP_QUESTIONS = [
  'q1 👤 phục vụ ai? — audience: tên cụ thể, vai trò, context user cuối',
  'q2 🎯 mục đích là gì? — purpose: vì sao cần, kết quả nếu làm đúng',
  'q3 📦 output trông thế nào? — output: dạng gì, cỡ nào, kênh nào',
  'q4 ⏰ deadline khi nào? — deadline: cứng/mềm, có milestone giữa chừng không',
  'q5 🔧 nguồn lực có gì? — resources: người, ngân sách, công cụ',
  'q6 📊 đào sâu tới đâu? — depth: cần draft approve hướng hay file hoàn chỉnh',
]

function showResult(type, taskGuid, errMsg, subFailed) {
  const panel = document.getElementById('resultPanel')
  panel.style.display = 'block'

  if (type === 'success') {
    const subNote = subFailed === 0
      ? '6 câu warm-up đã được tạo thành subtask.'
      : `⚠ ${subFailed}/6 subtask tạo không thành công — kiểm tra lại trong Lark.`
    panel.className = 'result-panel success'
    panel.innerHTML = `
      <div class="result-title">// task đã tạo thành công</div>
      <div class="result-body">
        task guid: <strong>${taskGuid}</strong><br>
        ${subNote}<br>
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
