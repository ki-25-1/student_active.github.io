import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

let app, db;
try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
} catch (error) {
    console.error("Помилка Firebase:", error);
}

let cachedSettings = null;
let allReports = [];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('date').valueAsDate = new Date();
    loadSettings();

    document.getElementById('btn-tab-mark').addEventListener('click', () => switchTab('mark'));
    document.getElementById('btn-tab-report').addEventListener('click', () => switchTab('report'));
    document.getElementById('saveBtn').addEventListener('click', saveData);
    document.getElementById('filterBtn').addEventListener('click', renderReports);
    document.getElementById('subject').addEventListener('change', autoSelectTeacher);
});

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

async function loadSettings() {
    try {
        const response = await fetch('data.json');
        cachedSettings = await response.json();
        
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
    }
}

function autoSelectTeacher() {
    const selectedName = document.getElementById('subject').value;
    const teacherInput = document.getElementById('teacher');
    if (cachedSettings) {
        const subjObj = cachedSettings.subjects.find(s => s.name === selectedName);
        teacherInput.value = subjObj ? subjObj.teacher : "";
    }
}

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
        date, pair, type, subject, teacher, attendance,
        timestamp: Date.now()
    };

    push(ref(db, 'reports'), record)
        .then(() => alert("✅ Дані збережено!"))
        .catch((error) => alert("❌ Помилка: " + error.message));
}

// --- ЧИТАННЯ ДАНИХ (Оновлено для отримання ключів) ---
onValue(ref(db, 'reports'), (snapshot) => {
    const data = snapshot.val();
    document.getElementById('status-indicator').innerHTML = '<span style="color:green;">● Онлайн</span>';
    
    // Тут важлива зміна: ми зберігаємо ключ запису (key)
    allReports = [];
    if (data) {
        allReports = Object.entries(data).map(([key, value]) => {
            return { ...value, firebaseKey: key }; // додаємо ID від Firebase
        });
    }
    // Якщо ми на вкладці звітів - оновити їх
    if(!document.getElementById('report-section').classList.contains('hidden-section')){
        renderReports();
    }
});

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
        
        // Додаємо кнопку смітничка (fa-trash)
        card.innerHTML = `
            <div class="record-header" style="display:flex; justify-content:space-between; align-items:center;">
                <span>${record.date} | ${record.pair} пара (${record.type})</span>
                <button class="delete-btn" data-key="${record.firebaseKey}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
            <div><strong>${record.subject}</strong> (${record.teacher})</div>
            <div class="absent-list">${absents.length > 0 ? "Н/Б: " + absents.join(', ') : "Всі є"}</div>
        `;
        output.appendChild(card);
    });

    // Додаємо події на нові кнопки видалення
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const key = this.getAttribute('data-key');
            deleteRecord(key);
        });
    });
}

// --- НОВА ФУНКЦІЯ ВИДАЛЕННЯ ---
function deleteRecord(key) {
    if (confirm("Ви впевнені, що хочете видалити цей запис? Це неможливо скасувати!")) {
        const recordRef = ref(db, 'reports/' + key);
        remove(recordRef)
            .then(() => alert("🗑 Запис видалено."))
            .catch(err => alert("Помилка видалення: " + err.message));
    }
}
