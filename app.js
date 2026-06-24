// ============================================================
//  WARM-UP TASK — app.js
//  Supabase local: http://minhquandatabase.local:54321
// ============================================================

const SUPABASE_URL = 'http://minhquandatabase.local:54321'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

// supabase khởi tạo bên trong DOMContentLoaded — tránh lỗi nếu CDN chưa load xong
let db = null

// ─── Data: 6 câu hỏi ───────────────────────────────────────

const QUESTIONS = [
  {
    id: 'q1',
    icon: '👤',
    label: 'Phục vụ ai?',
    hint: 'Tên cụ thể, vai trò, context của người dùng cuối',
    sparseNote: 'Câu này hay bị bỏ qua nhất — nhưng không biết cho-ai thì mọi quyết định sau đều có thể sai hướng.',
  },
  {
    id: 'q2',
    icon: '🎯',
    label: 'Mục đích là gì?',
    hint: 'Vì sao cần làm — kết quả đạt được nếu làm đúng là gì',
    sparseNote: 'Biết format/deadline mà không biết vì-sao → có thể deliver đúng hình thức nhưng sai nội dung.',
  },
  {
    id: 'q3',
    icon: '📦',
    label: 'Output trông như thế nào?',
    hint: 'Sản phẩm cuối sếp sẽ nhận — dạng gì, cỡ nào, kênh nào',
    sparseNote: null,
  },
  {
    id: 'q4',
    icon: '⏰',
    label: 'Deadline là khi nào?',
    hint: 'Deadline cứng hay mềm — có milestone review giữa chừng không',
    sparseNote: null,
  },
  {
    id: 'q5',
    icon: '🔧',
    label: 'Nguồn lực có gì?',
    hint: 'Người, ngân sách, công cụ — có gì và không có gì',
    sparseNote: 'Hay bị bỏ qua — nhưng nếu thiếu nguồn lực thì cần báo sớm, không phải đợi tới deadline.',
  },
  {
    id: 'q6',
    icon: '📊',
    label: 'Sếp muốn đào sâu tới đâu?',
    hint: 'Cần draft để approve hướng, hay cần file hoàn chỉnh luôn',
    sparseNote: null,
  },
]

// ─── Data: Ví dụ mẫu ───────────────────────────────────────

const EXAMPLES = {
  q1: [
    { text: 'Team sales — 5 người, đang dùng quy trình follow-up thủ công, quen Google Sheets' },
    { text: 'Onboarding batch mới — 3 bạn fresher bắt đầu tháng tới, chưa biết gì về product' },
    { text: 'Chị Hạnh — để present lên BOD cuối tháng, không cần detail kỹ thuật' },
  ],
  q2: [
    { text: 'Giúp team sales rút thời gian soạn follow-up từ 20 phút xuống 5 phút' },
    { text: 'Chuẩn hóa onboard để mọi người hiểu product workflow trong ngày đầu tiên' },
    { text: 'Có data để pitch thêm ngân sách Q3 cho L&D với BOD' },
  ],
  q3: [
    { text: '1 slide deck Google Slides, khoảng 10–15 slides, present được trực tiếp' },
    { text: 'Video 3–5 phút, voiceover tiếng Việt, upload lên LMS nội bộ' },
    { text: 'Checklist 1 trang A4 Google Docs, in ra dùng ngay trong buổi họp' },
  ],
  q4: [
    { text: 'EOD thứ 6 tuần này — cần qua tay chị Hạnh review trước khi gửi' },
    { text: 'Thứ 3 tuần sau 9h sáng — trình bày trong buổi họp all-hands' },
    { text: 'Cuối tháng nhưng có check-in với sếp vào giữa tháng' },
  ],
  q5: [
    { text: 'Chỉ mình t — không có ngân sách extra, dùng Canva free' },
    { text: 'T + Quân cùng làm — deadline chồng nhau, cần align lịch trước' },
    { text: 'Có budget nhỏ (~500k) cho tool hoặc asset nếu cần' },
  ],
  q6: [
    { text: 'Sếp muốn xem draft structure trước — chưa cần polish, approve hướng là đủ' },
    { text: 'Cần file hoàn chỉnh luôn vì sếp gửi thẳng cho khách, không qua review' },
    { text: 'Phác 3–4 dòng ý tưởng để sếp approve concept trước khi bắt tay' },
  ],
}

// ─── State ─────────────────────────────────────────────────

let startTime = null
let currentBrief = ''
let userName = localStorage.getItem('warmup_name') || ''

// ─── Init ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Khởi tạo Supabase sau khi DOM + CDN đã load xong
  try {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    console.log('[Supabase] Kết nối thành công ✓')
  } catch (e) {
    console.warn('[Supabase] Không kết nối được — app vẫn chạy bình thường, data sẽ không được lưu:', e.message)
  }

  if (userName) document.getElementById('nameDisplay').textContent = userName
  renderQuestions()
})

// ─── Name management ───────────────────────────────────────

function editName() {
  document.getElementById('nameInput').value = userName
  document.getElementById('nameModal').classList.remove('hidden')
  setTimeout(() => document.getElementById('nameInput').focus(), 80)
}

function saveName() {
  const val = document.getElementById('nameInput').value.trim()
  if (!val) return
  userName = val
  localStorage.setItem('warmup_name', val)
  document.getElementById('nameDisplay').textContent = val
  document.getElementById('nameModal').classList.add('hidden')
}

function closeNameModal(e) {
  if (!e || e.target === document.getElementById('nameModal')) {
    document.getElementById('nameModal').classList.add('hidden')
  }
}

// ─── Phase 1: Brief input ──────────────────────────────────

function onBriefInput() {
  const val = document.getElementById('briefInput').value.trim()
  if (val.length > 0) document.getElementById('briefError').classList.add('hidden')
}

function startWarmup() {
  if (!userName) {
    editName()
    return
  }

  const brief = document.getElementById('briefInput').value.trim()
  if (!brief) {
    document.getElementById('briefError').classList.remove('hidden')
    document.getElementById('briefInput').focus()
    return
  }

  currentBrief = brief
  startTime = Date.now()
  document.getElementById('briefPreview').textContent = brief
  showPhase('phase2')
}

function goBack() {
  showPhase('phase1')
}

// ─── Phase 2: Question cards ───────────────────────────────

function renderQuestions() {
  const container = document.getElementById('questionCards')
  container.innerHTML = ''

  QUESTIONS.forEach((q, i) => {
    const card = document.createElement('div')
    card.id = `card-${q.id}`
    card.className = 'q-card'

    card.innerHTML = `
      <div class="q-meta">
        <span class="q-num">// câu ${i + 1}</span>
        <button class="q-ex-btn" onclick="showExamples('${q.id}')">xem ví dụ</button>
      </div>
      <div class="q-label">${q.label}</div>
      <div class="q-hint">${q.hint}</div>

      <textarea
        id="ans-${q.id}"
        rows="3"
        placeholder="trả lời ở đây..."
        oninput="onAnswerInput('${q.id}')"
      ></textarea>

      <div id="sparse-${q.id}" class="sparse-warn">
        ⚡ câu trả lời khá ngắn — task thiếu thông tin ở đây thường phải làm lại.
        ${q.sparseNote ? `<br>${q.sparseNote}` : ''}
      </div>

      <label class="ask-label">
        <input type="checkbox" id="ask-${q.id}" onchange="onAskBossToggle('${q.id}')">
        <span>cần hỏi sếp câu này</span>
      </label>
    `

    container.appendChild(card)
  })
}

function onAnswerInput(qId) {
  const val = document.getElementById(`ans-${qId}`).value.trim()
  const isAsk = document.getElementById(`ask-${qId}`).checked
  if (isAsk) return

  if (val.length === 0) {
    document.getElementById(`sparse-${qId}`).classList.add('hidden')
    setCardState(qId, '')
  } else if (val.length < 15) {
    document.getElementById(`sparse-${qId}`).classList.remove('hidden')
    setCardState(qId, 'sparse')
  } else {
    document.getElementById(`sparse-${qId}`).classList.add('hidden')
    setCardState(qId, 'good')
  }

  updateDots()
}

function onAskBossToggle(qId) {
  const checked = document.getElementById(`ask-${qId}`).checked
  const ta = document.getElementById(`ans-${qId}`)
  const sparseEl = document.getElementById(`sparse-${qId}`)

  if (checked) {
    ta.disabled = true
    sparseEl.classList.add('hidden')
    setCardState(qId, 'ask')
  } else {
    ta.disabled = false
    onAnswerInput(qId)
  }

  updateDots()
}

function setCardState(qId, state) {
  const card = document.getElementById(`card-${qId}`)
  card.classList.remove('state-sparse', 'state-good', 'state-ask')
  if (state) card.classList.add(`state-${state}`)
}

function updateDots() {
  QUESTIONS.forEach((q, i) => {
    const dot = document.getElementById(`dot${i + 1}`)
    const val = document.getElementById(`ans-${q.id}`)?.value.trim() || ''
    const isAsk = document.getElementById(`ask-${q.id}`)?.checked

    dot.classList.remove('state-sparse', 'state-good', 'state-ask')

    if (isAsk) {
      dot.classList.add('state-ask')
    } else if (val.length >= 15) {
      dot.classList.add('state-good')
    } else if (val.length > 0) {
      dot.classList.add('state-sparse')
    }
  })
}

function scrollToQ(qId) {
  document.getElementById(`card-${qId}`).scrollIntoView({ behavior: 'smooth', block: 'center' })
}

// ─── Submit ────────────────────────────────────────────────

function submitWarmup() {
  const answers = QUESTIONS.map(q => ({
    q,
    value: document.getElementById(`ans-${q.id}`).value.trim(),
    askBoss: document.getElementById(`ask-${q.id}`).checked,
  }))

  const filled  = answers.filter(a => !a.askBoss && a.value.length >= 15)
  const sparse  = answers.filter(a => !a.askBoss && a.value.length > 0 && a.value.length < 15)
  const askBoss = answers.filter(a => a.askBoss)

  const problemCount = sparse.length + answers.filter(a => !a.askBoss && a.value.length === 0).length
  const warnEl = document.getElementById('preSubmitWarning')
  if (problemCount >= 3) {
    warnEl.innerHTML = `⚡ <strong>${problemCount} câu</strong> chưa điền đủ. Submit vẫn được nhưng cân nhắc thêm vào hoặc tích "Cần hỏi sếp".`
    warnEl.classList.remove('hidden')
  } else {
    warnEl.classList.add('hidden')
  }

  const elapsed = startTime ? Math.round((Date.now() - startTime) / 60000) : 0

  buildOutput(answers, filled, askBoss, elapsed)
  saveToSupabase({ brief: currentBrief, answers, userName, elapsed })

  showPhase('phase3')
}

function buildOutput(answers, filled, askBoss, elapsed) {
  document.getElementById('statFilled').textContent = filled.length
  document.getElementById('statAsk').textContent = askBoss.length
  document.getElementById('statTime').textContent = elapsed + "'"

  // Câu hỏi gửi sếp
  const needClarify = answers.filter(a => a.askBoss || (!a.askBoss && a.value.length === 0))
  if (needClarify.length > 0) {
    document.getElementById('sectionAsk').classList.remove('hidden')
    const snippet = currentBrief.length > 80 ? currentBrief.substring(0, 80) + '...' : currentBrief
    let askText = `Chị/Anh ơi, về task:\n"${snippet}"\n\nEm cần làm rõ thêm trước khi bắt tay:\n\n`
    needClarify.forEach((a, i) => {
      askText += `${i + 1}. ${a.q.label.replace('?', '')} — ${a.q.hint}?\n`
    })
    askText += `\nCảm ơn chị/anh!`
    document.getElementById('outputAsk').textContent = askText
  } else {
    document.getElementById('sectionAsk').classList.add('hidden')
  }

  // Bản hiểu task
  const date = new Date().toLocaleDateString('vi-VN')
  let summaryText = `TASK BRIEF — ${date}\n${'─'.repeat(36)}\n\n`

  if (filled.length > 0) {
    filled.forEach(a => {
      summaryText += `${a.q.icon}  ${a.q.label.toUpperCase()}\n${a.value}\n\n`
    })
  } else {
    summaryText += `(Chưa điền được câu nào — cần hỏi sếp trước.)\n\n`
  }

  const pending = answers.filter(a => a.askBoss || (!a.askBoss && a.value.length === 0))
  if (pending.length > 0) {
    summaryText += `${'─'.repeat(36)}\n⏳ CHỜ LÀM RÕ: ${pending.map(a => a.q.label).join(' · ')}`
  }

  document.getElementById('outputSummary').textContent = summaryText
}

// ─── Copy ──────────────────────────────────────────────────

function copySection(type, btn) {
  const el = document.getElementById(type === 'ask' ? 'outputAsk' : 'outputSummary')
  navigator.clipboard.writeText(el.textContent).then(() => {
    const orig = btn.textContent
    const isAsk = type === 'ask'
    btn.textContent = 'Copied ✓'
    btn.classList.add('bg-emerald-500')
    btn.classList.remove(isAsk ? 'bg-indigo-600' : 'bg-slate-700')
    setTimeout(() => {
      btn.textContent = orig
      btn.classList.remove('bg-emerald-500')
      btn.classList.add(isAsk ? 'bg-indigo-600' : 'bg-slate-700')
    }, 1500)
  }).catch(() => {
    const range = document.createRange()
    range.selectNode(el)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)
  })
}

// ─── New task ──────────────────────────────────────────────

function newTask() {
  currentBrief = ''
  startTime = null
  document.getElementById('briefInput').value = ''
  document.getElementById('briefPreview').textContent = ''
  document.getElementById('preSubmitWarning').classList.add('hidden')

  QUESTIONS.forEach(q => {
    const ta = document.getElementById(`ans-${q.id}`)
    if (ta) { ta.value = ''; ta.disabled = false }
    const cb = document.getElementById(`ask-${q.id}`)
    if (cb) cb.checked = false
    document.getElementById(`sparse-${q.id}`)?.classList.add('hidden')
    setCardState(q.id, '')
  })

  updateDots()
  showPhase('phase1')
}

// ─── Phase switching ───────────────────────────────────────

function showPhase(id) {
  document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'))
  document.getElementById(id).classList.add('active')
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ─── Examples modal ────────────────────────────────────────

function showExamples(qId) {
  const q = QUESTIONS.find(q => q.id === qId)
  const examples = EXAMPLES[qId] || []

  document.getElementById('modalTitle').textContent = `Ví dụ: ${q.label}`
  document.getElementById('modalBody').innerHTML = examples.map((ex, i) => `
    <div class="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
      <div class="text-xs font-semibold text-slate-400 mb-1.5">Mẫu ${i + 1}</div>
      <p class="text-sm text-slate-700 leading-relaxed">${ex.text}</p>
    </div>
  `).join('')

  document.getElementById('exModal').classList.remove('hidden')
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('exModal')) {
    document.getElementById('exModal').classList.add('hidden')
  }
}

// ─── Supabase Integration ──────────────────────────────────

async function saveToSupabase(data) {
  if (!db) {
    console.warn('[Supabase] Chưa kết nối — bỏ qua lưu data')
    return
  }

  const row = {
    user_name:   data.userName || 'Unknown',
    brief:       data.brief,
    elapsed:     data.elapsed,
    q1_answer:   data.answers[0].value,  q1_ask_boss: data.answers[0].askBoss,
    q2_answer:   data.answers[1].value,  q2_ask_boss: data.answers[1].askBoss,
    q3_answer:   data.answers[2].value,  q3_ask_boss: data.answers[2].askBoss,
    q4_answer:   data.answers[3].value,  q4_ask_boss: data.answers[3].askBoss,
    q5_answer:   data.answers[4].value,  q5_ask_boss: data.answers[4].askBoss,
    q6_answer:   data.answers[5].value,  q6_ask_boss: data.answers[5].askBoss,
  }

  const { error } = await db.from('submissions').insert(row)

  if (error) {
    console.error('[Supabase] Lỗi khi lưu:', error.message)
  } else {
    console.log('[Supabase] Lưu thành công ✓')
  }
}
