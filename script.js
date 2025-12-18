// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Глобальні змінні
let cachedSettings = null; // Для data.json
let allReports = [];       // Всі звіти з хмари

// --- ЗАВАНТАЖЕННЯ НАЛАШТУВАНЬ (data.json з GitHub) ---
async function loadSettings() {
    try {
        const response = await fetch('data.json');
        cachedSettings = await response.json();
        
        // 1. Рендеримо студентів
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

        // 2. Рендеримо предмети
        const subjectSelect = document.getElementById('subject');
        subjectSelect.innerHTML = '<option value="" disabled selected>Оберіть предмет</option>';
        cachedSettings.subjects.forEach(subjObj => {
            const option = document.createElement('option');
            option.value = subjObj.name;
            option.textContent = subjObj.name;
            subjectSelect.appendChild(option);
        });

    } catch (error) {
        console.error("Помилка data.json", error);
        alert("Не вдалось завантажити список групи (data.json)");
    }
}

// --- ЛОГІКА ІНТЕРФЕЙСУ ---

// Автовибір викладача
document.getElementById('subject').addEventListener('change', function() {
    const selectedName = this.value;
    const teacherInput = document.getElementById('teacher');
    const subjObj = cachedSettings.subjects.find(s => s.name === selectedName);
    teacherInput.value = subjObj ? subjObj.teacher : "";
});

// Перемикання вкладок (через window, бо модуль ізольований)
window.showTab = function(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('section').forEach(sec => sec.classList.remove('active-section'));
    document.querySelectorAll('section').forEach(sec => sec.classList.add('hidden-section'));

    if (tabName === 'mark') {
        document.getElementById('mark-section').classList.remove('hidden-section');
        document.getElementById('mark-section').classList.add('active-section');
        document.querySelector('button[onclick="window.showTab(\'mark\')"]').classList.add('active');
    } else {
        document.getElementById('report-section').classList.remove('hidden-section');
        document.getElementById('report-section').classList.add('active-section');
        document.querySelector('button[onclick="window.showTab(\'report\')"]').classList.add('active');
        renderReports(); // Оновити вигляд при вході
    }
}

// --- РОБОТА З FIREBASE (ЗБЕРЕЖЕННЯ І ЧИТАННЯ) ---

// 1. Слухаємо зміни в базі даних (Realtime)
const reportsRef = ref(db, 'reports');

onValue(reportsRef, (snapshot) => {
    const data = snapshot.val();
    const status = document.getElementById('status-indicator');
    
    status.innerHTML = '<span style="color:green;">● Онлайн</span>';
    
    // Перетворюємо об'єкт Firebase у масив
    allReports = [];
    if (data) {
        allReports = Object.values(data);
    }
    renderReports(); // Оновлюємо список звітів автоматично
});

// 2. Функція Збереження
document.getElementById('saveBtn').addEventListener('click', () => {
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
        date,
        pair,
        type,
        subject,
        teacher,
        attendance,
        timestamp: new Date().toISOString() // Час створення запису
    };

    // ВІДПРАВКА В FIREBASE
    push(reportsRef, record)
        .then(() => {
            alert("✅ Успішно збережено в хмару!");
        })
        .catch((error) => {
            alert("❌ Помилка збереження: " + error.message);
        });
});

// 3. Відображення звітів (з фільтрацією)
function renderReports() {
    const start = document.getElementById('filter-start').value;
    const end = document.getElementById('filter-end').value;
    const output = document.getElementById('report-output');
    
    let filtered = [...allReports]; // Копія масиву

    if (start) filtered = filtered.filter(r => r.date >= start);
    if (end) filtered = filtered.filter(r => r.date <= end);

    // Сортуємо: нові дати зверху
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    output.innerHTML = '';
    
    if (filtered.length === 0) {
        output.innerHTML = '<p style="text-align:center; color:#777;">Записів поки немає.</p>';
        return;
    }

    filtered.forEach(record => {
        const absents = record.attendance.filter(s => !s.present).map(s => s.name);
        
        const card = document.createElement('div');
        card.className = 'record-card';
        card.style.borderLeft = absents.length === 0 ? "5px solid #28a745" : "5px solid #ffc107";
        
        card.innerHTML = `
            <div class="record-header" style="display:flex; justify-content:space-between;">
                <span>${record.date} | ${record.pair} пара</span>
                <span style="font-size:0.8em; color:#555;">${record.type}</span>
            </div>
            <h4 style="margin: 5px 0;">${record.subject}</h4>
            <div style="font-size: 0.9em; color: #555; margin-bottom:5px;">${record.teacher}</div>
            <div class="absent-list">
                ${absents.length > 0 
                    ? `<strong>Н/Б:</strong> ${absents.join(', ')}` 
                    : '<strong style="color:green;">Всі присутні!</strong>'}
            </div>
        `;
        output.appendChild(card);
    });
}

// Кнопка оновлення фільтру
document.getElementById('filterBtn').addEventListener('click', renderReports);

// Старт
document.getElementById('date').valueAsDate = new Date();
loadSettings();
