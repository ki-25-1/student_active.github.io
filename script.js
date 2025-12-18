import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBlL5_c9oZTuNLt8oaJYWoNYOMaU3iCAe0",
  authDomain: "studients-sheets.firebaseapp.com",
  databaseURL: "https://studients-sheets-default-rtdb.firebaseio.com",
  projectId: "studients-sheets",
  storageBucket: "studients-sheets.firebasestorage.app",
  messagingSenderId: "50024321456",
  appId: "1:50024321456:web:4dd7e999c0235ee3d68675",
  measurementId: "G-TCGHS1MYSN"
};

// Ініціалізація (обгорнута в try-catch для вилову помилок)
let app, db;
try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    console.log("Firebase підключено успішно");
} catch (error) {
    alert("Помилка підключення до Firebase! Перевір консоль (F12).");
    console.error(error);
}

let cachedSettings = null;
let allReports = [];

// --- 2. ПРИЗНАЧЕННЯ КНОПОК (Замість onclick в HTML) ---
document.addEventListener('DOMContentLoaded', () => {
    // Встановлюємо дату
    document.getElementById('date').valueAsDate = new Date();
    
    // Завантажуємо налаштування
    loadSettings();

    // Кнопки вкладок
    document.getElementById('btn-tab-mark').addEventListener('click', () => switchTab('mark'));
    document.getElementById('btn-tab-report').addEventListener('click', () => switchTab('report'));

    // Кнопка збереження
    document.getElementById('saveBtn').addEventListener('click', saveData);

    // Кнопка фільтру
    document.getElementById('filterBtn').addEventListener('click', renderReports);

    // Автовибір викладача
    document.getElementById('subject').addEventListener('change', autoSelectTeacher);
});

// Функція перемикання вкладок
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('section').forEach(sec => sec.classList.remove('active-section'));
    document.querySelectorAll('section').forEach(sec => sec.classList.add('hidden-section'));

    if (tabName === 'mark') {
        document.getElementById('mark-section').classList.remove('hidden-section');
        document.getElementById('mark-section').classList.add('active-section');
        document.getElementById('btn-tab-mark').classList.add('active');
    } else {
        document.getElementById('report-section').classList.remove('hidden-section');
        document.getElementById('report-section').classList.add('active-section');
        document.getElementById('btn-tab-report').classList.add('active');
        renderReports();
    }
}

// Завантаження data.json
async function loadSettings() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error("Файл не знайдено");
        cachedSettings = await response.json();
        
        // Студенти
        const listContainer = document.getElementById('student-list');
        listContainer.innerHTML = '';
        cachedSettings.students.forEach((student, index) => {
            const div = document.createElement('div');
            div.className = 'student-item';
            div.innerHTML = `
                <label for="student_${index}">${student}</label>
                <input type="checkbox" id="student_${index}" checked>
            `;
            listContainer.appendChild(div);
        });

        // Предмети
        const subjectSelect = document.getElementById('subject');
        subjectSelect.innerHTML = '<option value="" disabled selected>Оберіть предмет</option>';
        cachedSettings.subjects.forEach(subjObj => {
            const option = document.createElement('option');
            option.value = subjObj.name;
            option.textContent = subjObj.name;
            subjectSelect.appendChild(option);
        });

    } catch (error) {
        console.error(error);
        document.getElementById('student-list').innerHTML = '<span style="color:red">Помилка data.json! Залийте файл на GitHub.</span>';
    }
}

// Автовибір викладача
function autoSelectTeacher() {
    const selectedName = document.getElementById('subject').value;
    const teacherInput = document.getElementById('teacher');
    
    if (cachedSettings) {
        const subjObj = cachedSettings.subjects.find(s => s.name === selectedName);
        teacherInput.value = subjObj ? subjObj.teacher : "";
    }
}

// Функція збереження
function saveData() {
    const date = document.getElementById('date').value;
    const pair = document.getElementById('pairNumber').value;
    const type = document.getElementById('type').value;
    const subject = document.getElementById('subject').value;
    const teacher = document.getElementById('teacher').value;

    if (!subject) { alert('Оберіть предмет!'); return; }

    const checkboxes = document.querySelectorAll('#student-list input[type="checkbox"]');
    const attendance = [];
    checkboxes.forEach(chk => {
        attendance.push({
            name: chk.previousElementSibling.innerText,
            present: chk.checked
        });
    });

    const record = {
        id: Date.now(),
        date, pair, type, subject, teacher, attendance
    };

    // Відправка
    const reportsRef = ref(db, 'reports');
    push(reportsRef, record)
        .then(() => alert("✅ Дані полетіли в хмару!"))
        .catch((error) => alert("❌ Помилка: " + error.message));
}

// Читання з бази
const reportsRef = ref(db, 'reports');
onValue(reportsRef, (snapshot) => {
    const data = snapshot.val();
    document.getElementById('status-indicator').innerHTML = '<span style="color:green;">● Онлайн</span>';
    allReports = data ? Object.values(data) : [];
});

// Відображення звітів
function renderReports() {
    const start = document.getElementById('filter-start').value;
    const end = document.getElementById('filter-end').value;
    const output = document.getElementById('report-output');
    
    let filtered = [...allReports];
    if (start) filtered = filtered.filter(r => r.date >= start);
    if (end) filtered = filtered.filter(r => r.date <= end);
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    output.innerHTML = '';
    if (filtered.length === 0) {
        output.innerHTML = '<p style="text-align:center;">Записів немає.</p>';
        return;
    }

    filtered.forEach(record => {
        const absents = record.attendance.filter(s => !s.present).map(s => s.name);
        const card = document.createElement('div');
        card.className = 'record-card';
        card.style.borderLeft = absents.length === 0 ? "5px solid #28a745" : "5px solid #ffc107";
        card.innerHTML = `
            <div class="record-header">${record.date} | ${record.pair} пара (${record.type})</div>
            <div><strong>${record.subject}</strong> (${record.teacher})</div>
            <div class="absent-list">${absents.length > 0 ? "Н/Б: " + absents.join(', ') : "Всі є"}</div>
        `;
        output.appendChild(card);
    });
}
