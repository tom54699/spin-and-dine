const storageKey = 'lunch-places-v1';
    const state = {
      places: loadPlaces(),
      spinning: false,
      currentAngle: 0,
      animationId: null
    };

    const canvas = document.getElementById('wheelCanvas');
    const ctx = canvas.getContext('2d');
    const spinBtn = document.getElementById('spinBtn');
    const filterSel = document.getElementById('filter');
    const pickedEl = document.getElementById('picked');
    const statEl = document.getElementById('stat');
    const nameInput = document.getElementById('nameInput');
    const addBtn = document.getElementById('addBtn');
    const tbody = document.getElementById('tbody');
    const exportBtn = document.getElementById('exportBtn');
    const importFile = document.getElementById('importFile');
    const importLabel = document.getElementById('importLabel');

    const tabs = document.querySelectorAll('.tab');
    const sections = { wheel: document.getElementById('wheel'), list: document.getElementById('list') };

    init();

    function init() {
      resizeCanvas();
      drawWheel();
      renderTable();
      updateStats();
      window.addEventListener('resize', () => { resizeCanvas(); drawWheel(); });
      tabs.forEach(btn => btn.addEventListener('click', handleTab));
      spinBtn.addEventListener('click', spin);
      filterSel.addEventListener('change', () => { drawWheel(); updateStats(); });
      addBtn.addEventListener('click', addPlace);
      exportBtn.addEventListener('click', exportData);
      importLabel.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', importData);
      // 快捷鍵：空白鍵開始、R 重置指針（不清資料）
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { e.preventDefault(); spin(); }
        if (e.code === 'KeyR') {
          state.currentAngle = 0;
          drawWheel();
        }
      });
    }

    function loadPlaces() {
      try {
        const raw = localStorage.getItem(storageKey);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list.map(p => ({ ...p, enabled: p.enabled !== false })) : [];
      } catch (e) {
        console.warn('讀取失敗，改用空名單', e);
        return [];
      }
    }

    function persist() {
      localStorage.setItem(storageKey, JSON.stringify(state.places));
    }

    function handleTab(e) {
      const tab = e.target.dataset.tab;
      tabs.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
      Object.entries(sections).forEach(([key, el]) => {
        el.classList.toggle('hidden', key !== tab);
      });
    }

    function resizeCanvas() {
      const box = document.getElementById('wheelBox');
      const size = box.clientWidth;
      canvas.width = size;
      canvas.height = size;
    }

    function drawWheel() {
      const places = filteredPlaces();
      const count = places.length || 1;
      const radius = canvas.width / 2;
      ctx.clearRect(0,0,canvas.width, canvas.height);
      ctx.save();
      ctx.translate(radius, radius);
      const colors = ['#f97316','#fb7185','#38bdf8','#22c55e','#a855f7','#f59e0b','#14b8a6'];
      for (let i = 0; i < count; i++) {
        const angleStart = (i / count) * 2 * Math.PI + state.currentAngle;
        const angleEnd = ((i + 1) / count) * 2 * Math.PI + state.currentAngle;
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.arc(0,0,radius, angleStart, angleEnd);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        ctx.save();
        ctx.rotate((angleStart + angleEnd)/2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.max(14, radius/12)}px sans-serif`;
        ctx.fillText(places[i]?.name || '請新增餐廳', radius - 18, 6);
        ctx.restore();
      }
      ctx.restore();
    }

    function filteredPlaces() {
      const days = filterSel.value === 'none' ? 0 : Number(filterSel.value);
      const enabledList = state.places.filter(p => p.enabled !== false);
      if (!days) return enabledList;
      const cutoff = Date.now() - days * 86400000;
      return enabledList.filter(p => !p.last || new Date(p.last).getTime() < cutoff);
    }

    function spin() {
      const list = filteredPlaces();
      if (!list.length) {
        toast('名單符合條件的餐廳為空，先新增或調整排除規則。');
        return;
      }
      if (state.spinning) return;
      state.spinning = true;
      // 預先決定中獎切片，讓指針最終指向該切片中心
      const slice = (2 * Math.PI) / list.length;
      const pointer = -Math.PI / 2; // 指針在上方、指向圓心
      const turns = 12 + Math.random() * 4; // 12~16 圈
      const targetIndex = Math.floor(Math.random() * list.length);
      const baseAngle = pointer - (targetIndex * slice + slice / 2);
      const finalAngle = baseAngle + turns * 2 * Math.PI;
      const picked = list[targetIndex];
      // 時間略長，減速明顯
      const duration = 3200 + Math.random() * 700; // 3.2s ~ 3.9s
      const start = performance.now();

      function animate(now) {
        const progress = Math.min(1, (now - start) / duration);
        // 自訂 easing（接近 cubic-bezier(.12,.9,.18,1)）
        const ease = cubicBezierEase(progress);
        state.currentAngle = lerp(state.currentAngle, finalAngle, ease);
        drawWheel();
        if (progress < 1) {
          state.animationId = requestAnimationFrame(animate);
        } else {
          finishSpin(picked, finalAngle);
        }
      }
      state.animationId = requestAnimationFrame(animate);
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    // 近似 cubic-bezier(.12,.9,.18,1) 的 easing，模擬 PiliApp 減速曲線
    function cubicBezierEase(t) {
      const p1 = { x: 0.12, y: 0.9 };
      const p2 = { x: 0.18, y: 1 };
      const u = 1 - t;
      return (3 * u * u * t * p1.y) + (3 * u * t * t * p2.y) + (t * t * t);
    }

    function finishSpin(picked, angle) {
      try {
        picked.last = new Date().toISOString();
        persist();
        renderTable();
        updateStats();
        pickedEl.textContent = `今天吃：${picked.name}`;
        pickedEl.classList.remove('hidden');
        toast(`選中了 ${picked.name}`);
        // 將角度收斂在 0~2π，避免累積誤差
        state.currentAngle = ((angle % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
      } catch (err) {
        console.error('finishSpin error', err);
        toast('轉盤發生錯誤，請再試一次');
      } finally {
        state.spinning = false;
      }
    }

    function addPlace() {
      const name = nameInput.value.trim();
      if (!name) return toast('請輸入餐廳名稱');
      if (state.places.some(p => p.name === name)) return toast('已存在相同名稱');
      state.places.push({ name, last: null, enabled: true });
      nameInput.value = '';
      persist();
      drawWheel();
      renderTable();
      updateStats();
      toast('已新增');
    }

    function removePlace(name) {
      state.places = state.places.filter(p => p.name !== name);
      persist();
      drawWheel();
      renderTable();
      updateStats();
      toast('已刪除');
    }

    function markToday(name) {
      const item = state.places.find(p => p.name === name);
      if (item) item.last = new Date().toISOString();
      persist();
      drawWheel();
      renderTable();
      updateStats();
      toast('已標記今天吃過');
    }

    function renderTable() {
      tbody.innerHTML = '';
      state.places.forEach(p => {
        const tr = document.createElement('tr');
        const last = p.last ? formatDate(p.last) : '—';
        tr.innerHTML = `
          <td style="text-align:center">
            <input type="checkbox" ${p.enabled !== false ? 'checked' : ''} onchange="toggleEnabled('${escapeAttr(p.name)}', this.checked)" />
          </td>
          <td>${p.name}</td>
          <td>${last}</td>
          <td>
            <div class="actions">
              <button onclick="markToday('${escapeAttr(p.name)}')">今天吃</button>
              <button onclick="removePlace('${escapeAttr(p.name)}')">刪除</button>
            </div>
          </td>`;
        tbody.appendChild(tr);
      });
    }

    function updateStats() {
      const total = state.places.length;
      const filtered = filteredPlaces().length;
      const enabled = state.places.filter(p => p.enabled !== false).length;
      statEl.textContent = `轉盤名單 ${filtered}/${enabled}（已啟用 ${enabled}/${total}）`;
    }

    function formatDate(str) {
      const d = new Date(str);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth()+1).padStart(2,'0');
      const dd = String(d.getDate()).padStart(2,'0');
      return `${yyyy}-${mm}-${dd}`;
    }

    function toast(msg) {
      const el = document.getElementById('toast');
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(el._timer);
      el._timer = setTimeout(() => el.classList.remove('show'), 2200);
    }

    function exportData() {
      const blob = new Blob([JSON.stringify(state.places, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'restaurants.json';
      a.click();
      URL.revokeObjectURL(a.href);
      toast('已匯出 JSON');
    }

    function importData(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target.result);
          if (!Array.isArray(data)) throw new Error('格式不符');
          state.places = data.map(item => ({ name: String(item.name), last: item.last || null, enabled: item.enabled !== false }));
          persist();
          drawWheel();
          renderTable();
          updateStats();
          toast('匯入成功');
        } catch (err) {
          toast('匯入失敗：' + err.message);
        }
        importFile.value = '';
      };
      reader.readAsText(file);
    }

    function escapeAttr(str) { return str.replace(/"/g, '&quot;').replace(/'/g, "&#39;"); }

    function toggleEnabled(name, value) {
      const item = state.places.find(p => p.name === name);
      if (item) {
        item.enabled = value;
        persist();
        drawWheel();
        updateStats();
      }
    }
