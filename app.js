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
    }

    function loadPlaces() {
      try {
        const raw = localStorage.getItem(storageKey);
        return raw ? JSON.parse(raw) : [];
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
      if (!days) return state.places;
      const cutoff = Date.now() - days * 86400000;
      return state.places.filter(p => !p.last || new Date(p.last).getTime() < cutoff);
    }

    function spin() {
      const list = filteredPlaces();
      if (!list.length) {
        toast('名單符合條件的餐廳為空，先新增或調整排除規則。');
        return;
      }
      if (state.spinning) return;
      state.spinning = true;
      const duration = 3000 + Math.random() * 1500;
      const finalAngle = state.currentAngle + Math.PI * 6 + Math.random() * Math.PI * 4;
      const start = performance.now();

      function animate(now) {
        const progress = Math.min(1, (now - start) / duration);
        const ease = 1 - Math.pow(1 - progress, 3);
        state.currentAngle = lerp(state.currentAngle, finalAngle, ease);
        drawWheel();
        if (progress < 1) {
          state.animationId = requestAnimationFrame(animate);
        } else {
          finishSpin(list, finalAngle);
        }
      }
      state.animationId = requestAnimationFrame(animate);
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    function finishSpin(list, angle) {
      const normAngle = ((angle % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
      const slice = (2*Math.PI) / list.length;
      const index = Math.floor(((2*Math.PI - normAngle + Math.PI/2) % (2*Math.PI)) / slice);
      const picked = list[index];
      picked.last = new Date().toISOString();
      persist();
      renderTable();
      updateStats();
      pickedEl.textContent = `今天吃：${picked.name}`;
      pickedEl.classList.remove('hidden');
      toast(`選中了 ${picked.name}`);
      state.spinning = false;
    }

    function addPlace() {
      const name = nameInput.value.trim();
      if (!name) return toast('請輸入餐廳名稱');
      if (state.places.some(p => p.name === name)) return toast('已存在相同名稱');
      state.places.push({ name, last: null });
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
      statEl.textContent = `目前名單 ${filtered}/${total} 家符合規則`;
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
          state.places = data.map(item => ({ name: String(item.name), last: item.last || null }));
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