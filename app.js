// ============================================================
//  THINK-BEFORE-ACT — app.js
//  PHASE 1: Giao diện Admin tạo task + Lark SDK lấy user_id
//  (Chưa gọi API tạo task — chỉ thu thập data + preview)
// ============================================================

const APP_ID = 'cli_aab1ef7c8d785ed4'

// ─── members.json (tạm hardcode — Phase 4 sẽ tách ra file riêng) ───
// Cấu trúc: name → { open_id, team, base_token }
// Phase 1 chỉ cần name + open_id để chọn assignee. team/base dùng sau.
const MEMBERS = [
  { name: 'Quân',       open_id: 'ou_placeholder_quan',   team: 'PRODUCT' },
  { name: 'Chi',        open_id: 'ou_placeholder_chi',    team: 'L&D' },
  { name: 'Giang',      open_id: 'ou_placeholder_giang',  team: 'BD' },
  { name: 'Huyền Linh', open_id: 'ou_placeholder_hlinh',  team: 'BD' },
  { name: 'Nga Linh',   open_id: 'ou_placeholder_nlinh',  team: 'BD' },
  { name: 'Minh Anh',   open_id: 'ou_placeholder_manh',   team: 'ACCOUNT' },
  { name: 'Hân',        open_id: 'ou_placeholder_han',    team: 'ACCOUNT' },
]

// ─── State ─────────────────────────────────────────────────

let currentUser = {
  open_id: '',
  name:    '',
  avatar:  '',
}
let isInLark = false

let selectedAssignee  = null   // 1 người
let selectedFollowers = []     // nhiều người

// ─── Init ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  renderMembers()
  await initLark()
})

// ─── Lark SDK: lấy user identity ───────────────────────────

async function initLark() {
  const nameEl   = document.getElementById('nameDisplay')
  const avatarEl = document.getElementById('userAvatar')

  // Detect Lark client
  if (typeof window.h5sdk === 'undefined' && typeof window.tt === 'undefined') {
    console.warn('[Lark] Không phải trong Lark client — standalone mode')
    isInLark = false
    nameEl.textContent = '(ngoài Lark)'
    nameEl.classList.remove('loading')
    return
  }

  isInLark = true

  try {
    if (window.h5sdk) {
      window.h5sdk.ready(() => {
        window.h5sdk.call('getUserInfo', {}, (res) => {
          if (res && res.user) {
            currentUser.name    = res.user.name   || res.user.displayName || ''
            currentUser.avatar  = res.user.avatar || res.user.avatarUrl   || ''
            currentUser.open_id = res.user.openId || ''
            updateHeaderUser(nameEl, avatarEl)
          } else {
            fallbackUser(nameEl)
          }
        })
      })
      window.h5sdk.error((err) => {
        console.warn('[Lark h5sdk] error:', err)
        fallbackUser(nameEl)
      })
    } else if (window.tt) {
      window.tt.ready(() => {
        window.tt.getUserInfo({
          success(res) {
            currentUser.name   = res.userInfo?.nickName || res.userInfo?.name || ''
            currentUser.avatar = res.userInfo?.avatarUrl || ''
            updateHeaderUser(nameEl, avatarEl)
          },
          fail(err) {
            console.warn('[Lark tt] fail:', err)
            fallbackUser(nameEl)
          }
        })
      })
    }
  } catch (e) {
    console.warn('[Lark] init error:', e.message)
    fallbackUser(nameEl)
  }
}

function updateHeaderUser(nameEl, avatarEl) {
  if (currentUser.name) {
    nameEl.textContent = currentUser.name
    nameEl.classList.remove('loading')
  }
  if (currentUser.avatar) {
    avatarEl.src = currentUser.avatar
    avatarEl.style.display = 'block'
  }
  console.log('[Lark] User:', currentUser)
}

function fallbackUser(nameEl) {
  nameEl.textContent = '(không lấy được tên)'
  nameEl.classList.remove('loading')
}

// ─── Render member chips ───────────────────────────────────

function renderMembers() {
  const assigneeEl = document.getElementById('assigneeList')
  const followerEl = document.getElementById('followerList')

  assigneeEl.innerHTML = ''
  followerEl.innerHTML = ''

  MEMBERS.forEach(m => {
    // Assignee chip (chọn 1)
    const aChip = document.createElement('div')
    aChip.className = 'member-chip'
    aChip.textContent = m.name
    aChip.onclick = () => selectAssignee(m, aChip)
    assigneeEl.appendChild(aChip)

    // Follower chip (chọn nhiều)
    const fChip = document.createElement('div')
    fChip.className = 'member-chip'
    fChip.textContent = m.name
    fChip.onclick = () => toggleFollower(m, fChip)
    followerEl.appendChild(fChip)
  })
}

function selectAssignee(member, chipEl) {
  // Bỏ chọn tất cả assignee chip
  document.querySelectorAll('#assigneeList .member-chip').forEach(c => c.classList.remove('selected'))
  // Chọn chip này
  chipEl.classList.add('selected')
  selectedAssignee = member
  document.getElementById('err-assignee').classList.remove('show')
}

function toggleFollower(member, chipEl) {
  const idx = selectedFollowers.findIndex(f => f.open_id === member.open_id)
  if (idx >= 0) {
    selectedFollowers.splice(idx, 1)
    chipEl.classList.remove('selected')
  } else {
    selectedFollowers.push(member)
    chipEl.classList.add('selected')
  }
}

// ─── Advanced toggle ───────────────────────────────────────

function toggleAdvanced() {
  document.getElementById('advSection').classList.toggle('open')
}

// ─── Helpers ───────────────────────────────────────────────

// Convert datetime-local string → Unix timestamp milliseconds (string)
function toTimestampMs(dateStr) {
  if (!dateStr) return null
  const ms = new Date(dateStr).getTime()
  return isNaN(ms) ? null : String(ms)
}

// Convert date string (yyyy-mm-dd) → timestamp ms
function dateToTimestampMs(dateStr) {
  if (!dateStr) return null
  const ms = new Date(dateStr + 'T00:00:00').getTime()
  return isNaN(ms) ? null : String(ms)
}

// ─── Build Lark Task body ──────────────────────────────────

function buildTaskBody() {
  const summary     = document.getElementById('f-summary').value.trim()
  const description = document.getElementById('f-description').value.trim()
  const startVal    = document.getElementById('f-start').value
  const dueVal      = document.getElementById('f-due').value
  const isAllDay    = document.getElementById('f-allday').checked
  const reminderVal = document.getElementById('f-reminder').value
  const repeatVal   = document.getElementById('f-repeat').value
  const tasklistVal = document.getElementById('f-tasklist').value.trim()

  // members: assignee + followers
  const members = []
  if (selectedAssignee) {
    members.push({ id: selectedAssignee.open_id, type: 'user', role: 'assignee' })
  }
  selectedFollowers.forEach(f => {
    // Tránh trùng: nếu follower cũng là assignee thì bỏ
    if (!selectedAssignee || f.open_id !== selectedAssignee.open_id) {
      members.push({ id: f.open_id, type: 'user', role: 'follower' })
    }
  })

  // Body theo schema Lark Task v2 create
  const body = {
    summary,
    description,
    members,
  }

  // due
  if (dueVal) {
    body.due = {
      timestamp:  toTimestampMs(dueVal),
      is_all_day: isAllDay,
    }
  }

  // start
  if (startVal) {
    body.start = { timestamp: dateToTimestampMs(startVal), is_all_day: true }
  }

  // reminders
  if (reminderVal && Number(reminderVal) >= 0) {
    body.reminders = [{ relative_fire_minute: Number(reminderVal) }]
  }

  // repeat
  if (repeatVal) body.repeat_rule = repeatVal

  // tasklist
  if (tasklistVal) body.tasklists = [{ tasklist_guid: tasklistVal }]

  return body
}

// ─── Validate ──────────────────────────────────────────────

function validate() {
  let ok = true

  const summary = document.getElementById('f-summary').value.trim()
  const desc    = document.getElementById('f-description').value.trim()

  document.getElementById('err-summary').classList.toggle('show', !summary)
  document.getElementById('err-description').classList.toggle('show', !desc)
  document.getElementById('err-assignee').classList.toggle('show', !selectedAssignee)

  if (!summary || !desc || !selectedAssignee) ok = false
  return ok
}

// ─── Submit (Phase 1: chỉ preview data, chưa gọi API) ──────

function submitTask() {
  if (!validate()) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  const body = buildTaskBody()

  // Phase 1: hiển thị data ra debug panel để kiểm tra
  const preview = {
    _created_by: {
      name:    currentUser.name    || '(chưa lấy được)',
      open_id: currentUser.open_id || '(chưa lấy được)',
    },
    _assignee_team: selectedAssignee ? selectedAssignee.team : null,
    lark_task_body: body,
  }

  document.getElementById('debugPanel').style.display = 'block'
  document.getElementById('debugOutput').textContent = JSON.stringify(preview, null, 2)
  document.getElementById('debugPanel').scrollIntoView({ behavior: 'smooth', block: 'start' })

  console.log('[Phase 1] Task body sẵn sàng gửi:', body)
}
