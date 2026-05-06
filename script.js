// 1. Kiểm tra đăng nhập
const ESP32_CAM_IP = "http://10.85.246.107";
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) window.location.href = 'login.html';

document.getElementById('display-name').innerText = `Chào, ${currentUser.username} (${currentUser.role})`;

// --- BIẾN QUẢN LÝ THỜI GIAN THỰC ---
let dataTimeout; 
const TIMEOUT_MS = 12000; // Đợi 12s để tránh reset nhầm khi ESP32 gửi mỗi 5s
const GAS_THRESHOLD_DANGER = 1000; 
const GAS_THRESHOLD_WARNING = 400; 

// 2. Cấu hình MQTT (HiveMQ Cloud - WebSocket 8884)
const mqtt_url = 'wss://aecd780b1f264cadacf3a1ffb4c985d2.s1.eu.hivemq.cloud:8884/mqtt'; 
const options = {
    connectTimeout: 4000,
    clientId: 'Web_Client_' + Math.random().toString(16).substr(2, 8),
    username: 'SMART_3003',
    password: 'DOANTOTNGHIEP2025a',
};
//camera
function setCameraOnline() {
    const img = document.getElementById("stream");
    if (img) {
        img.src = ESP32_CAM_IP + "/stream";
    }

    document.getElementById('alert-box').innerText = "Camera: Đang hoạt động";
}
//----------------------------------
const client = (typeof mqtt !== 'undefined') ? mqtt.connect(mqtt_url, options) : null;
let isSyncing = false;

if (client) {
    client.on('connect', () => {
        console.log('MQTT Connected via WebSocket');
        client.subscribe('esp32/data');
        const alertBox = document.getElementById('alert-box');
        if (alertBox) alertBox.innerText = "Hệ thống: Trực tuyến (Online)";
    });

    client.on('message', (topic, payload) => {
        if (topic !== 'esp32/data') return;

    clearTimeout(dataTimeout);

    try {

    const data = JSON.parse(payload.toString());
    console.log("LIGHT:", data.light);
console.log("RAIN:", data.rain);

    console.log("ESP32 Data:", data);

// ===== GAS =====
    if (data.gas !== undefined) {

    const gasValue = data.gas;

    document.getElementById('gas-val').innerText =
    gasValue + " ppm";


    const airStatus =
    document.getElementById('air-status');

    airStatus.classList.remove(
    "good",
    "warning",
    "danger"
    );


    if (gasValue > GAS_THRESHOLD_DANGER) {

    airStatus.innerText = "Nguy hiểm";

    airStatus.classList.add("danger");

    document.getElementById('alert-box').innerText =
    "🚨 CẢNH BÁO: Khí gas nguy hiểm!";

    }

    else if (gasValue > GAS_THRESHOLD_WARNING) {

    airStatus.innerText = "Kém";

    airStatus.classList.add("warning");

    document.getElementById('alert-box').innerText =
    "⚠️ Chất lượng không khí thấp";

    }

    else {

    airStatus.innerText = "Tốt";

    airStatus.classList.add("good");

    }

    }

    // ===== TEMP =====
    if (data.temp !== undefined) {

    document.getElementById('t-val').innerText =
    data.temp + "°C";

    }


    // ===== HUMI =====
    if (data.humi !== undefined) {

    document.getElementById('h-val').innerText =
    data.humi + "%";

    updateSensorData(data.temp, data.humi);

    }
    
    // ===== RAIN =====
    // ===== RAIN =====
    if (data.rain !== undefined) {

    document.getElementById("rain-status").innerText =
    (data.rain == 1)
    ? "Đang mưa"
    : "Không mưa";

    }
// ===== LIGHT =====
    if (data.light !== undefined) {

    document.getElementById("light-val").innerText =
    data.light + " lux";

    }



    

    // ===== DEVICE STATE =====
    if (data.devices && Array.isArray(data.devices)) {

    isSyncing = true;

    data.devices.forEach((st, i) => {

    const checkbox =
    document.getElementById(devices[i]);

    if (checkbox)
    checkbox.checked = (st === 1);

    });

    isSyncing = false;

    }

    }
    catch(e){
        console.error("JSON lỗi:", e);
    }

    // reset timeout watchdog
    dataTimeout = setTimeout(resetDashboardData, TIMEOUT_MS);
});
} else {
    console.warn('MQTT library không tải được. Một số tính năng kết nối sẽ bị tắt.');
    const alertBox = document.getElementById('alert-box');
    if (alertBox) alertBox.innerText = "MQTT library không tải. Chế độ demo.";
}

// Hàm đưa giao diện về trạng thái Offline
function resetDashboardData() {
    const ids = ['t-val', 'h-val', 'gas-val'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = "--";
    });
    
    const airStatus = document.getElementById('air-status');
    if (airStatus) {
        airStatus.innerText = "Ngoại tuyến (Offline)";
        airStatus.style.color = "gray";
    }
    // 👉 Reset camera về placeholder
    const img = document.getElementById("stream");
    if (img) {
        img.src = "http://10.85.246.107";
    }

    document.getElementById('alert-box').innerText = "Hệ thống: Mất kết nối ESP32 (Timeout)";
  
}

// 3. Khởi tạo danh sách thiết bị (Đồng bộ tên với Dashboard)
const devices = [
"dev1",
"dev2",
"dev3",
"dev4",
"dev5",
"dev6",
"dev7",
"dev8"
];

const deviceLabels = [
"Đèn Phòng Khách",
"Đèn Phòng Ngủ",
"Đèn Phòng Bếp",
"Đèn Nhà Vệ Sinh",
"Đèn Ngoài Trời",
"Rèm Cửa",
"Cổng Chính",
"Quạt"
];
const container = document.getElementById('controls-container');

function initializeDeviceControls() {
    if (!container) return;
    container.innerHTML = "";
    const fragment = document.createDocumentFragment();

    devices.forEach((id, i) => {
        const controlItem = document.createElement('div');
        controlItem.className = 'control-item';
        controlItem.innerHTML = `
            <span>${deviceLabels[i] || id}</span>
            <label class="switch">
                <input type="checkbox" id="${id}">
                <span class="slider"></span>
            </label>
        `;

        const checkbox = controlItem.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.addEventListener('change', () => onControlChange(id, checkbox.checked));
        }
        fragment.appendChild(controlItem);
    });

    container.appendChild(fragment);
}

initializeDeviceControls();

function showDeviceSetupPanel(action) {
    const panel = document.getElementById('device-setup-panel');
    if (!panel) return;

    if (action === 'add') {
        panel.innerHTML = `
            <div class="device-setup-block">
                <h3>Thêm thiết bị mới</h3>
                <input type="text" id="new-device-name" placeholder="Tên thiết bị">
                <select id="new-device-type">
                    <option value="">Chọn loại thiết bị</option>
                    <option value="light">Đèn</option>
                    <option value="fan">Quạt</option>
                    <option value="curtain">Rèm</option>
                    <option value="lock">Khóa</option>
                </select>
                <button class="btn btn-primary" id="save-new-device">Lưu thiết bị</button>
            </div>
        `;
        const saveBtn = document.getElementById('save-new-device');
        if (saveBtn) saveBtn.addEventListener('click', () => {
            const name = document.getElementById('new-device-name').value.trim();
            const type = document.getElementById('new-device-type').value;
            if (!name || !type) return alert('Vui lòng điền tên và chọn loại thiết bị.');
            alert(`Thiết bị "${name}" (${type}) đã được thêm (demo).`);
        });
    } else if (action === 'schedule') {
        panel.innerHTML = `
            <div class="device-setup-block">
                <h3>Tạo kịch bản mới</h3>
                <input type="text" id="new-schedule-name" placeholder="Tên kịch bản">
                <input type="time" id="new-schedule-time">
                <button class="btn btn-primary" id="save-new-schedule">Lưu kịch bản</button>
            </div>
        `;
        const saveBtn = document.getElementById('save-new-schedule');
        if (saveBtn) saveBtn.addEventListener('click', () => {
            const name = document.getElementById('new-schedule-name').value.trim();
            const time = document.getElementById('new-schedule-time').value;
            if (!name || !time) return alert('Vui lòng điền tên và thời gian kịch bản.');
            alert(`Kịch bản "${name}" lúc ${time} đã được lưu (demo).`);
        });
    } else if (action === 'room') {
        panel.innerHTML = `
            <div class="device-setup-block">
                <h3>Phân loại phòng</h3>
                <input type="text" id="new-room-name" placeholder="Tên phòng">
                <select id="new-room-device">
                    <option value="">Chọn thiết bị</option>
                    <option value="dev1">Đèn Phòng Khách</option>
                    <option value="dev2">Đèn Phòng Ngủ</option>
                    <option value="dev3">Đèn Phòng Bếp</option>
                </select>
                <button class="btn btn-primary" id="save-room-setup">Lưu phòng</button>
            </div>
        `;
        const saveBtn = document.getElementById('save-room-setup');
        if (saveBtn) saveBtn.addEventListener('click', () => {
            const name = document.getElementById('new-room-name').value.trim();
            const device = document.getElementById('new-room-device').value;
            if (!name || !device) return alert('Vui lòng điền tên phòng và chọn thiết bị.');
            alert(`Phòng "${name}" đã được tạo với thiết bị ${device} (demo).`);
        });
    }
}

const deviceSetupButtons = [
    { id: 'add-device-btn', action: 'add' },
    { id: 'create-schedule-btn', action: 'schedule' },
    { id: 'classify-room-btn', action: 'room' }
];

deviceSetupButtons.forEach(item => {
    const btn = document.getElementById(item.id);
    if (btn) btn.addEventListener('click', () => showDeviceSetupPanel(item.action));
});

// 4. TRUYỀN TÍN HIỆU XUỐNG ESP32 (Gửi lệnh DK01 - DK16)
function onControlChange(deviceId, state) {
    if (isSyncing) return;
    const index = devices.indexOf(deviceId);
    if (index < 0) return;

    const cmdNum = state ? (index + 1) : (index + 9);
    const command = "DK" + cmdNum.toString().padStart(2, '0');
    if (client && typeof client.publish === 'function') {
        client.publish('esp32/commands', command);
        console.log("Lệnh gửi:", command);
    } else {
        console.warn('MQTT chưa sẵn sàng, lệnh chỉ hiển thị demo:', command);
    }
}

// 5. Quản lý Đồ thị (Chart.js)
let envChart = null;
const envCanvas = document.getElementById('envChart');
if (typeof Chart !== 'undefined' && envCanvas) {
    const ctx = envCanvas.getContext('2d');
    envChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Nhiệt độ', data: [], borderColor: 'red', tension: 0.3, fill: false },
                { label: 'Độ ẩm', data: [], borderColor: 'blue', tension: 0.3, fill: false }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
} else {
    console.warn('Chart.js không tải được hoặc #envChart không tồn tại.');
}

function updateSensorData(temp, humi) {
    document.getElementById('t-val').innerText = temp + "°C";
    document.getElementById('h-val').innerText = humi + "%";
    
    const now = new Date().toLocaleTimeString();
    if (envChart) {
        if (envChart.data.labels.length > 15) {
            envChart.data.labels.shift();
            envChart.data.datasets[0].data.shift();
            envChart.data.datasets[1].data.shift();
        }
        envChart.data.labels.push(now);
        envChart.data.datasets[0].data.push(temp);
        envChart.data.datasets[1].data.push(humi);
        envChart.update();
    }
}

// 6. Quản lý Admin
if (currentUser.role === 'admin') {
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) adminPanel.style.display = 'block';
    renderUserTable();
}

function renderUserTable() {
    const accounts = JSON.parse(localStorage.getItem('accounts')) || [];
    const tbody = document.getElementById('user-table-body');
    if (tbody) {
        tbody.innerHTML = accounts.filter(a => a.role !== 'admin').map(acc => `
            <tr>
                <td>${acc.username}</td>
                <td>User</td>
                <td><button class="btn btn-danger" onclick="deleteUser('${acc.username}')">Xoá</button></td>
            </tr>
        `).join('');
    }
}

function addNewUser() {
    const u = document.getElementById('user-u').value;
    const p = document.getElementById('user-p').value;
    if(!u || !p) return;
    let accounts = JSON.parse(localStorage.getItem('accounts'));
    if(accounts.find(a => a.username === u)) return alert("Tên đã tồn tại!");
    accounts.push({username: u, password: p, role: 'user'});
    localStorage.setItem('accounts', JSON.stringify(accounts));
    renderUserTable();
}

function deleteUser(u) {
    let accounts = JSON.parse(localStorage.getItem('accounts'));
    localStorage.setItem('accounts', JSON.stringify(accounts.filter(a => a.username !== u)));
    renderUserTable();
}

function updateAdminProfile() {
    const newU = document.getElementById('admin-new-u').value;
    const newP = document.getElementById('admin-new-p').value;
    if(!newU || !newP) return alert("Vui lòng điền đủ thông tin!");
    let accounts = JSON.parse(localStorage.getItem('accounts')) || [];
    const idx = accounts.findIndex(a => a.username === currentUser.username);
    if (idx < 0) return alert("Không tìm thấy thông tin admin!");
    accounts[idx].username = newU;
    accounts[idx].password = newP;
    localStorage.setItem('accounts', JSON.stringify(accounts));
    localStorage.setItem('currentUser', JSON.stringify(accounts[idx]));
    alert("Cập nhật thành công! Hãy đăng nhập lại.");
    window.location.href = 'login.html';
}

const tabLabelMap = {
    'home-card': 'Tổng quan',
    'device-card': 'Điều Khiển Thiết Bị',
    'env-card': 'Giám Sát Cảm Biến',
    'security-card': 'An Ninh',
    'energy-card': 'Năng Lượng',
    'automation-card': 'Tự động hóa',
    'history-card': 'Lịch sử',
    'alerts-card': 'Cảnh báo',
    'rooms-card': 'Phòng',
    'admin-panel': 'Quản Trị'
};

function getTabLabel(button) {
    if (!button) return 'Tổng quan';
    return button.dataset.label || button.innerText.trim() || 'Tổng quan';
}

function setBreadcrumb(label) {
    const breadcrumb = document.getElementById('breadcrumb');
    if (!breadcrumb) return;
    breadcrumb.innerText = `Trang chủ / ${label}`;
}

function activateDashboardTab(tabId) {
    const targetBtn = document.querySelector(`.tab-btn[data-target="${tabId}"]`);
    const targetPanel = document.getElementById(tabId);
    if (!targetPanel) return;

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));

    targetPanel.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');

    const label = tabLabelMap[tabId] || getTabLabel(targetBtn);
    setBreadcrumb(label);
}

function renderFutureTabPlaceholders() {
    const sections = [
        {
            id: 'energy-card',
            title: 'Chỉ số Năng Lượng',
            content: `
                <div class="future-grid">
                    <div class="future-card"><strong>Điện</strong><span>345 kWh</span></div>
                    <div class="future-card"><strong>Nước</strong><span>28 m³</span></div>
                    <div class="future-card"><strong>Khí</strong><span>1.2 m³</span></div>
                </div>
                <p>Giao diện placeholder cho module năng lượng. Sau này sẽ mở rộng để hiển thị tiêu thụ và cảnh báo.</p>
            `
        },
        {
            id: 'automation-card',
            title: 'Tự động hóa',
            content: `
                <div class="future-grid">
                    <div class="future-card"><strong>Kịch bản sáng</strong><span>Bật đèn khi trời tối</span></div>
                    <div class="future-card"><strong>Giờ ngủ</strong><span>Tắt thiết bị lúc 23:00</span></div>
                    <div class="future-card"><strong>An ninh</strong><span>Kích hoạt khóa cửa</span></div>
                </div>
                <p>Thêm kịch bản bật/tắt tự động và điều kiện thông minh cho từng phòng.</p>
            `
        },
        {
            id: 'history-card',
            title: 'Lịch sử',
            content: `
                <div class="future-grid">
                    <div class="future-card"><strong>08:12</strong><span>Bật đèn phòng khách</span></div>
                    <div class="future-card"><strong>09:35</strong><span>Cảm biến gas bình thường</span></div>
                    <div class="future-card"><strong>11:20</strong><span>Tắt quạt phòng ngủ</span></div>
                </div>
                <p>Sẽ ghi lại log lệnh, trạng thái cảm biến và cảnh báo theo thời gian thực.</p>
            `
        },
        {
            id: 'alerts-card',
            title: 'Cảnh báo',
            content: `
                <div class="future-grid">
                    <div class="future-card"><strong>Gas</strong><span>Chưa có cảnh báo</span></div>
                    <div class="future-card"><strong>Camera</strong><span>Đang hoạt động</span></div>
                    <div class="future-card"><strong>MQTT</strong><span>Đã kết nối</span></div>
                </div>
                <p>Hiển thị thông báo an ninh, an toàn và đề xuất xử lý khi cần.</p>
            `
        },
        {
            id: 'rooms-card',
            title: 'Phòng',
            content: `
                <div class="future-grid">
                    <div class="future-card"><strong>Phòng khách</strong><span>6 thiết bị</span></div>
                    <div class="future-card"><strong>Phòng ngủ</strong><span>4 thiết bị</span></div>
                    <div class="future-card"><strong>Phòng bếp</strong><span>3 thiết bị</span></div>
                </div>
                <p>Quản lý phòng, phân vùng thiết bị và hiển thị trạng thái theo từng khu vực.</p>
            `
        }
    ];

    sections.forEach(section => {
        const panel = document.getElementById(section.id);
        if (panel) {
            panel.innerHTML = `<h2>${section.title}</h2>${section.content}`;
        }
    });
}

function initTabs() {
    const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
    if (!tabButtons.length) return;

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            activateDashboardTab(btn.dataset.target);
        });
    });

    if (currentUser.role !== 'admin') {
        const adminTab = document.querySelector('.tab-btn[data-target="admin-panel"]');
        if (adminTab) adminTab.style.display = 'none';
        const adminPanel = document.getElementById('admin-panel');
        if (adminPanel) adminPanel.style.display = 'none';
    } else {
        const adminShortcut = document.getElementById('admin-shortcut');
        if (adminShortcut) adminShortcut.style.display = 'inline-block';
    }

    renderFutureTabPlaceholders();

    const initialBtn = tabButtons.find(btn => btn.classList.contains('active')) || tabButtons[0];
    if (initialBtn) activateDashboardTab(initialBtn.dataset.target);
}

const adminShortcut = document.getElementById('admin-shortcut');
if (adminShortcut) {
    adminShortcut.addEventListener('click', () => {
        activateDashboardTab(adminShortcut.dataset.target);
    });
}

initTabs();
