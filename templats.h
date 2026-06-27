<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>think-before-act / templates</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg:         #f9f9f8;
      --text:       #111110;
      --muted:      #888882;
      --border:     #ddddd8;
      --accent:     #4338ca;
      --accent-bg:  #eef2ff;
      --amber:      #92400e;
      --amber-bg:   #fffbeb;
      --amber-bd:   #fcd34d;
      --green:      #166534;
      --green-bg:   #f0fdf4;
      --green-bd:   #86efac;
      --red:        #991b1b;
      --red-bg:     #fef2f2;
      --red-bd:     #fca5a5;
    }
    [data-theme="dark"] {
      --bg:         #111110;
      --text:       #f0efed;
      --muted:      #666660;
      --border:     #2a2a28;
      --accent:     #818cf8;
      --accent-bg:  #1e1b4b;
      --amber:      #fbbf24;
      --amber-bg:   #1c1507;
      --amber-bd:   #78350f;
      --green:      #4ade80;
      --green-bg:   #052e16;
      --green-bd:   #166534;
      --red:        #f87171;
      --red-bg:     #1f0707;
      --red-bd:     #7f1d1d;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.6; background: var(--bg); color: var(--text); min-height: 100vh; }

    .hdr {
      position: sticky; top: 0; z-index: 10;
      background: var(--bg); border-bottom: 1px solid var(--border);
      height: 48px; display: flex; align-items: center; justify-content: space-between;
      padding: 0 8vw;
    }
    .hdr-left { display: flex; align-items: center; gap: 12px; }
    .hdr-logo { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    .hdr-sep  { color: var(--border); }
    .hdr-page { font-size: 11px; color: var(--muted); }
    .hdr-right { display: flex; align-items: center; gap: 8px; }
    .hdr-link {
      font-size: 11px; color: var(--muted); text-decoration: none;
      border: 1px solid var(--border); padding: 4px 10px; transition: all .15s;
    }
    .hdr-link:hover { color: var(--text); border-color: var(--text); }
    .theme-toggle {
      background: none; border: 1px solid var(--border);
      font-family: inherit; font-size: 11px; color: var(--muted);
      cursor: pointer; padding: 4px 10px; transition: all .15s; line-height: 1;
    }
    .theme-toggle:hover { color: var(--text); border-color: var(--text); }

    main { padding: 0 8vw 80px; }
    .content-wrap { max-width: 760px; }

    .page-head { padding: 32px 0 24px; border-bottom: 1px solid var(--border); margin-bottom: 28px; }
    .page-head h1 { font-size: 18px; font-weight: 700; letter-spacing: -.02em; margin-bottom: 4px; }
    .page-head p  { font-size: 11px; color: var(--muted); }

    /* Add section */
    .add-section { border: 1px dashed var(--border); margin-bottom: 32px; transition: border-color .15s; }
    .add-section.open { border-style: solid; border-color: var(--accent); }
    .add-toggle {
      background: none; border: none; font-family: inherit; font-size: 12px;
      color: var(--muted); cursor: pointer; display: flex; align-items: center; gap: 8px;
      width: 100%; text-align: left; padding: 14px 18px; transition: color .15s;
    }
    .add-toggle:hover { color: var(--text); }
    .add-toggle.open  { color: var(--accent); }
    .add-toggle-icon  { font-size: 14px; line-height: 1; width: 18px; text-align: center; }
    .add-form { display: none; padding: 0 18px 18px; border-top: 1px solid var(--border); }
    .add-form.open { display: block; }

    /* Fields */
    .field { margin-bottom: 14px; }
    .field:first-child { margin-top: 18px; }
    .field-label { font-size: 11px; font-weight: 700; display: block; margin-bottom: 6px; }
    .field-label .req { color: var(--red); }
    .field-hint { font-size: 10px; color: var(--muted); margin-top: 4px; }
    .field-row { display: flex; gap: 8px; }
    .field-row > * { flex: 1; }

    input[type="text"], textarea, select {
      width: 100%; font-family: inherit; font-size: 12px;
      background: transparent; border: 1px solid var(--border); color: var(--text);
      padding: 10px 12px; outline: none; resize: none; transition: border-color .15s; line-height: 1.6;
    }
    input:focus, textarea:focus, select:focus { border-color: var(--accent); }
    select { cursor: pointer; }

    /* Buttons */
    .btn { font-family: inherit; font-size: 12px; cursor: pointer; border: 1px solid; padding: 10px 16px; transition: opacity .15s; display: inline-block; }
    .btn-dark   { background: var(--text); color: var(--bg); border-color: var(--text); }
    .btn-dark:hover { opacity: .75; }
    .btn-ghost  { background: transparent; color: var(--muted); border-color: var(--border); }
    .btn-ghost:hover { color: var(--text); border-color: var(--text); }
    .btn-danger { background: transparent; color: var(--red); border-color: var(--red-bd); }
    .btn-danger:hover { background: var(--red-bg); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .form-actions { display: flex; gap: 8px; margin-top: 16px; }

    /* Section divider */
    .sec-divider { font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .sec-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
    .sec-count { font-size: 10px; font-weight: 700; color: var(--accent); background: var(--accent-bg); padding: 1px 7px; border: 1px solid var(--accent); }

    /* Template cards */
    .template-group { margin-bottom: 32px; }
    .template-card { border: 1px solid var(--border); border-top: none; transition: border-color .15s; }
    .template-card:first-child { border-top: 1px solid var(--border); }
    .template-card:hover { border-color: var(--text); }

    .template-row { padding: 14px 16px; display: flex; align-items: flex-start; gap: 12px; cursor: pointer; }
    .template-badge {
      font-size: 9px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
      padding: 3px 8px; border: 1px solid; flex-shrink: 0; margin-top: 2px; line-height: 1.4;
    }
    .template-badge.has-type { color: var(--green); border-color: var(--green-bd); background: var(--green-bg); }
    .template-badge.no-type  { color: var(--muted); border-color: var(--border); }

    .template-main { flex: 1; min-width: 0; }
    .template-name { font-size: 13px; font-weight: 500; }
    .template-meta { font-size: 10px; color: var(--muted); margin-top: 3px; display: flex; gap: 10px; flex-wrap: wrap; }
    .template-meta .used-badge { color: var(--accent); }
    .template-preview { font-size: 11px; color: var(--muted); margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .chevron { font-size: 10px; color: var(--muted); flex-shrink: 0; transition: transform .15s; margin-top: 3px; }
    .template-card.open .chevron { transform: rotate(180deg); }

    .template-detail {
      display: none; border-top: 1px solid var(--border); padding: 18px 16px;
      background: var(--bg); filter: brightness(.97);
    }
    .template-detail.open { display: block; }
    [data-theme="dark"] .template-detail { filter: brightness(1.05); }

    .detail-meta { font-size: 10px; color: var(--muted); margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }

    .edit-actions { display: flex; gap: 8px; margin-top: 14px; }

    /* Empty / loading */
    .empty-state { padding: 40px 0; text-align: center; border: 1px dashed var(--border); }
    .empty-state p { font-size: 12px; color: var(--muted); }
    .loading-state { padding: 40px 0; text-align: center; color: var(--muted); font-size: 11px; }

    /* Toast */
    .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: var(--text); color: var(--bg); font-size: 11px; padding: 10px 16px; opacity: 0; transition: opacity .2s; pointer-events: none; z-index: 100; }
    .toast.show { opacity: 1; }
  </style>
</head>
<body>

<header class="hdr">
  <div class="hdr-left">
    <span class="hdr-logo">// think-before-act</span>
    <span class="hdr-sep">/</span>
    <span class="hdr-page">templates</span>
  </div>
  <div class="hdr-right">
    <button class="theme-toggle" id="themeToggle" onclick="toggleTheme()">dark</button>
    <a class="hdr-link" href="skills.html">skills</a>
    <a class="hdr-link" href="index.html">← dashboard</a>
  </div>
</header>

<main>
  <div class="page-head">
    <h1>brief templates.</h1>
    <p>lưu brief mẫu theo từng loại task — senior chọn template khi tạo task, form tự điền, chỉ cần chỉnh nhanh.</p>
  </div>

  <div class="content-wrap">

    <!-- Add form -->
    <div class="add-section" id="addSection">
      <button class="add-toggle" id="addToggle" onclick="toggleAddForm()">
        <span class="add-toggle-icon">+</span>
        <span id="addToggleLabel">thêm template mới</span>
      </button>
      <div class="add-form" id="addForm">

        <div class="field">
          <label class="field-label">tên template <span class="req">*</span></label>
          <input type="text" id="new-name" placeholder="vd: Video Onboarding — Fresher">
        </div>

        <div class="field-row" style="margin-bottom:14px">
          <div>
            <label class="field-label">loại task</label>
            <select id="new-task-type">
              <option value="">— không gán —</option>
            </select>
            <div class="field-hint">gán để xuất hiện khi chọn loại task trong form tạo task</div>
          </div>
          <div>
            <label class="field-label">team</label>
            <select id="new-category">
              <option value="">— tất cả —</option>
              <option value="BD">BD</option>
              <option value="PM">PM</option>
              <option value="AI">AI</option>
              <option value="ACCOUNT">ACCOUNT</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label class="field-label">tên task mẫu</label>
          <input type="text" id="new-summary" placeholder="vd: làm video onboarding cho [tên fresher]">
          <div class="field-hint">sẽ điền vào field "tên task" — dùng [bracket] cho phần cần thay</div>
        </div>

        <div class="field">
          <label class="field-label">brief mẫu <span class="req">*</span></label>
          <textarea id="new-description" rows="6" placeholder="mô tả task mẫu — context, yêu cầu, điểm cần lưu ý...&#10;Dùng [placeholder] cho phần cần customize mỗi lần."></textarea>
        </div>

        <div class="field">
          <label class="field-label">output mẫu</label>
          <textarea id="new-output" rows="3" placeholder="vd: file mp4 HD + script Google Doc, gửi Drive trước [deadline]"></textarea>
        </div>

        <div class="form-actions">
          <button class="btn btn-dark" id="btnAdd" onclick="addTemplate()">lưu template</button>
          <button class="btn btn-ghost" onclick="toggleAddForm()">huỷ</button>
        </div>
      </div>
    </div>

    <!-- Template list -->
    <div id="templateList">
      <div class="loading-state">⏳ đang tải template...</div>
    </div>

  </div>
</main>

<div class="toast" id="toast"></div>

<script>
const WORKER_URL = 'https://think-before-act-proxy.minhwuan889.workers.dev'
const THEME_KEY  = 'tba_theme'

let templates  = []
let taskTypes  = []   // { target_id, target_name }

// ─── Theme ────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  const btn = document.getElementById('themeToggle')
  if (btn) btn.textContent = theme === 'dark' ? 'light' : 'dark'
}
function toggleTheme() {
  const next = (document.documentElement.getAttribute('data-theme') || 'light') === 'dark' ? 'light' : 'dark'
  localStorage.setItem(THEME_KEY, next)
  applyTheme(next)
}
applyTheme(localStorage.getItem(THEME_KEY) || 'light')

// ─── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([loadTaskTypes(), loadTemplates()])
})

async function loadTaskTypes() {
  try {
    const res = await fetch(`${WORKER_URL}/skills?target_type=task_type`)
    taskTypes = await res.json()
    populateTaskTypeSelects()
  } catch { taskTypes = [] }
}

function populateTaskTypeSelects() {
  const selects = ['new-task-type']
  selects.forEach(id => {
    const sel = document.getElementById(id)
    if (!sel) return
    // Keep first option, add types
    while (sel.options.length > 1) sel.remove(1)
    taskTypes.forEach(t => {
      const opt = document.createElement('option')
      opt.value = t.target_id; opt.textContent = t.target_name
      sel.appendChild(opt)
    })
  })
}

async function loadTemplates() {
  try {
    const res  = await fetch(`${WORKER_URL}/templates`)
    templates  = await res.json()
    renderTemplates()
  } catch (err) {
    document.getElementById('templateList').innerHTML =
      `<div class="empty-state"><p>⚠ lỗi tải template: ${err.message}</p></div>`
  }
}

// ─── Render ───────────────────────────────────────────────────
function renderTemplates() {
  const listEl = document.getElementById('templateList')

  if (!templates?.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <p>chưa có template nào.</p>
        <p style="margin-top:6px">thêm template để senior tạo task nhanh hơn — không cần viết brief từ đầu mỗi lần.</p>
      </div>`
    return
  }

  // Group theo task_type_id
  const grouped = {}
  templates.forEach(t => {
    const key = t.task_type_id || '__none'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(t)
  })

  let html = ''

  // Nhóm có task_type trước
  Object.entries(grouped).forEach(([key, list]) => {
    if (key === '__none') return
    const typeObj    = taskTypes.find(t => t.target_id === key)
    const typeName   = typeObj?.target_name || key
    html += `
      <div class="template-group">
        <div class="sec-divider">
          ${typeName}
          <span class="sec-count">${list.length}</span>
        </div>
        ${list.map(t => buildTemplateCard(t)).join('')}
      </div>`
  })

  // Nhóm không có task_type
  if (grouped['__none']?.length) {
    html += `
      <div class="template-group">
        <div class="sec-divider">
          không gán loại task
          <span class="sec-count">${grouped['__none'].length}</span>
        </div>
        ${grouped['__none'].map(t => buildTemplateCard(t)).join('')}
      </div>`
  }

  listEl.innerHTML = html
}

function buildTemplateCard(t) {
  const hasType    = !!t.task_type_id
  const typeObj    = taskTypes.find(x => x.target_id === t.task_type_id)
  const typeName   = typeObj?.target_name || t.task_type_id || ''
  const preview    = (t.description_tpl || t.summary_tpl || '(không có preview)').slice(0, 100)
  const usedLabel  = t.used_count > 0 ? `dùng ${t.used_count} lần` : 'chưa dùng'

  return `
    <div class="template-card" id="tcard-${t.id}">
      <div class="template-row" onclick="toggleTemplateDetail('${t.id}')">
        <div class="template-badge ${hasType ? 'has-type' : 'no-type'}">${hasType ? typeName : 'chung'}</div>
        <div class="template-main">
          <div class="template-name">${t.name}</div>
          <div class="template-meta">
            ${t.category ? `<span>${t.category}</span>` : ''}
            <span class="${t.used_count > 0 ? 'used-badge' : ''}">${usedLabel}</span>
          </div>
          <div class="template-preview">${preview}</div>
        </div>
        <div class="chevron">▾</div>
      </div>
      <div class="template-detail" id="tdetail-${t.id}">
        <div class="detail-meta">
          ${hasType ? `loại task: ${typeName}` : 'chưa gán loại task'} ${t.category ? `· team: ${t.category}` : ''}
        </div>

        <div class="field">
          <label class="field-label">tên template</label>
          <input type="text" id="edit-name-${t.id}" value="${esc(t.name)}">
        </div>

        <div class="field-row" style="margin-bottom:14px">
          <div>
            <label class="field-label">loại task</label>
            <select id="edit-task-type-${t.id}">
              <option value="">— không gán —</option>
              ${taskTypes.map(x => `<option value="${x.target_id}" ${x.target_id === t.task_type_id ? 'selected' : ''}>${x.target_name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="field-label">team</label>
            <select id="edit-category-${t.id}">
              <option value="" ${!t.category ? 'selected' : ''}>— tất cả —</option>
              ${['BD','PM','AI','ACCOUNT'].map(c => `<option value="${c}" ${t.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="field">
          <label class="field-label">tên task mẫu</label>
          <input type="text" id="edit-summary-${t.id}" value="${esc(t.summary_tpl || '')}">
        </div>

        <div class="field">
          <label class="field-label">brief mẫu</label>
          <textarea id="edit-description-${t.id}" rows="6">${esc(t.description_tpl || '')}</textarea>
        </div>

        <div class="field">
          <label class="field-label">output mẫu</label>
          <textarea id="edit-output-${t.id}" rows="3">${esc(t.output_tpl || '')}</textarea>
        </div>

        <div class="edit-actions">
          <button class="btn btn-dark"   id="btnSave-${t.id}" onclick="saveTemplate('${t.id}')">lưu thay đổi</button>
          <button class="btn btn-ghost"                        onclick="toggleTemplateDetail('${t.id}')">đóng</button>
          <button class="btn btn-danger"                       onclick="deleteTemplate('${t.id}', '${escAttr(t.name)}')">xoá</button>
        </div>
      </div>
    </div>`
}

function toggleTemplateDetail(id) {
  document.getElementById('tdetail-' + id)?.classList.toggle('open')
  document.getElementById('tcard-'   + id)?.classList.toggle('open')
}

// ─── Add template ─────────────────────────────────────────────
function toggleAddForm() {
  const form    = document.getElementById('addForm')
  const section = document.getElementById('addSection')
  const toggle  = document.getElementById('addToggle')
  const label   = document.getElementById('addToggleLabel')
  const icon    = toggle.querySelector('.add-toggle-icon')
  const isOpen  = form.classList.toggle('open')
  section.classList.toggle('open', isOpen)
  toggle.classList.toggle('open', isOpen)
  icon.textContent  = isOpen ? '×' : '+'
  label.textContent = isOpen ? 'đóng' : 'thêm template mới'
}

async function addTemplate() {
  const name   = document.getElementById('new-name').value.trim()
  const typeId = document.getElementById('new-task-type').value
  const cat    = document.getElementById('new-category').value
  const sum    = document.getElementById('new-summary').value.trim()
  const desc   = document.getElementById('new-description').value.trim()
  const out    = document.getElementById('new-output').value.trim()

  if (!name || !desc) { showToast('⚠ cần điền tên và brief mẫu'); return }

  const btn = document.getElementById('btnAdd')
  btn.textContent = 'đang lưu...'
  btn.disabled    = true

  try {
    const res  = await fetch(`${WORKER_URL}/templates`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        task_type_id:    typeId || null,
        category:        cat    || null,
        summary_tpl:     sum    || null,
        description_tpl: desc,
        output_tpl:      out    || null,
        used_count:      0,
      }),
    })
    const data = await res.json()
    if (data?.length > 0) {
      templates.unshift(data[0])
      renderTemplates()
      toggleAddForm()
      ;['new-name','new-summary','new-description','new-output'].forEach(id => { document.getElementById(id).value = '' })
      document.getElementById('new-task-type').value = ''
      document.getElementById('new-category').value  = ''
      showToast('✓ template đã được thêm')
    } else {
      showToast('lỗi: ' + JSON.stringify(data))
    }
  } catch (err) {
    showToast('lỗi: ' + err.message)
  } finally {
    btn.textContent = 'lưu template'
    btn.disabled    = false
  }
}

// ─── Save template ────────────────────────────────────────────
async function saveTemplate(id) {
  const name   = document.getElementById(`edit-name-${id}`).value.trim()
  const typeId = document.getElementById(`edit-task-type-${id}`).value
  const cat    = document.getElementById(`edit-category-${id}`).value
  const sum    = document.getElementById(`edit-summary-${id}`).value.trim()
  const desc   = document.getElementById(`edit-description-${id}`).value.trim()
  const out    = document.getElementById(`edit-output-${id}`).value.trim()

  if (!name || !desc) { showToast('⚠ cần điền tên và brief mẫu'); return }

  const btn = document.getElementById(`btnSave-${id}`)
  btn.textContent = 'đang lưu...'
  btn.disabled    = true

  try {
    const res  = await fetch(`${WORKER_URL}/templates/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        task_type_id:    typeId || null,
        category:        cat    || null,
        summary_tpl:     sum    || null,
        description_tpl: desc,
        output_tpl:      out    || null,
      }),
    })
    const data = await res.json()
    if (data?.length > 0) {
      const idx = templates.findIndex(t => t.id === id)
      if (idx >= 0) templates[idx] = data[0]
      renderTemplates()
      setTimeout(() => {
        document.getElementById('tdetail-' + id)?.classList.add('open')
        document.getElementById('tcard-'   + id)?.classList.add('open')
      }, 50)
      showToast('✓ template đã cập nhật')
    } else {
      showToast('lỗi: ' + JSON.stringify(data))
    }
  } catch (err) {
    showToast('lỗi: ' + err.message)
  } finally {
    btn.textContent = 'lưu thay đổi'
    btn.disabled    = false
  }
}

// ─── Delete template ──────────────────────────────────────────
async function deleteTemplate(id, name) {
  if (!confirm(`xoá template "${name}"? không thể hoàn tác.`)) return
  try {
    await fetch(`${WORKER_URL}/templates/${id}`, { method: 'DELETE' })
    templates = templates.filter(t => t.id !== id)
    renderTemplates()
    showToast('✓ đã xoá template')
  } catch (err) {
    showToast('lỗi: ' + err.message)
  }
}

// ─── Utils ────────────────────────────────────────────────────
function esc(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
function escAttr(str) {
  return (str || '').replace(/'/g, "\\'")
}

let toastTimer
function showToast(msg) {
  const el = document.getElementById('toast')
  el.textContent = msg
  el.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500)
}
</script>
</body>
</html>
