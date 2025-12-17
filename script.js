const DATA_FILE = 'data.json';
const DB_KEY = 'attendance_db_v1';
let cachedData = null; // Тут будемо тимчасово тримати завантажені дані

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    document.getElementById('date').valueAsDate = new Date();
});

function showTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('section').forEach(sec => sec.classList.remove('active-section'));
    document.querySelectorAll('section').forEach(sec => sec.classList.add('hidden-section'));

    if (tabName === 'mark') {
        document.getElementById('mark-section').classList.remove('hidden-section');
        document.getElementById('mark-section').classList.add('active-section');
        document.querySelector('button[onclick="showTab(\'mark\')"]').classList.add('active');
    } else {
        document.getElementById('report-section').classList.remove('hidden-section');
        document.getElementById('report-section').classList.add('active-section');
        document.querySelector('button[onclick="showTab(\'report\')"]').classList.add('active');
    }
}

// Завантаження даних
async function loadData() {
    try {
        const response = await fetch(DATA_FILE);
        cachedData = await response.json(); // Зберігаємо дані в глобальну змінну

        // 1. Заповнюємо студентів
        const listContainer = document.getElementById('student-list');
        listContainer.innerHTML = '';
        cachedData.students.forEach((student, index) => {
            const div = document.createElement('div');
            div.className = 'student-item';
            div.innerHTML = `
                <label for="student_${index}">${student}</label>
                <input type="checkbox" id="student_${index}" checked>
            `;
            listContainer.appendChild(div);
        });

        // 2. Заповнюємо ТІЛЬКИ предмети (викладачі тепер прив'язані до них)
        const subjectSelect = document.getElementById('subject');
        cachedData.subjects.forEach(subjObj => {
            const option = document.createElement('option');
            // Тепер ми беремо name з об'єкта
            option.value = subjObj.name; 
            option.textContent = subjObj.name;
            subjectSelect.appendChild(option);
        });

    } catch (error) {
        alert('Помилка завантаження data.json. Перевірте формат JSON.');
        console.error(error);
    }
}

// НОВА ФУНКЦІЯ: Автоматичний вибір викладача
function autoSelectTeacher() {
    const selectedSubjectName = document.getElementById('subject').value;
    const teacherInput = document.getElementById('teacher');
    
    // Шукаємо предмет у збережених даних
    const subjectObj = cachedData.subjects.find(s => s.name === selectedSubjectName);
    
    if (subjectObj) {
        teacherInput.value = subjectObj.teacher;
    } else {
        teacherInput.value = "";
    }
}

function saveAttendance() {
    const date = document.getElementById('date').value;
    const pair = document.getElementById('pairNumber').value;
    const type = document.getElementById('type').value;
    const subject = document.getElementById('subject').value;
    const teacher = document.getElementById('teacher').value;

    if (!subject || !teacher) {
        alert('Спочатку оберіть предмет!');
        return;
    }

    const checkboxes = document.querySelectorAll('#student-list input[type="checkbox"]');
    const attendance = [];

    checkboxes.forEach(chk => {
        const name = chk.previousElementSibling.innerText; 
        attendance.push({
            name: name,
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
        attendance
    };

    let db = JSON.parse(localStorage.getItem(DB_KEY)) || [];
    db.push(record);
    localStorage.setItem(DB_KEY, JSON.stringify(db));

    alert('✅ Записано!');
}

function generateReport() {
    const start = document.getElementById('filter-start').value;
    const end = document.getElementById('filter-end').value;
    const output = document.getElementById('report-output');
    
    let db = JSON.parse(localStorage.getItem(DB_KEY)) || [];

    if (start) db = db.filter(r => r.date >= start);
    if (end) db = db.filter(r => r.date <= end);

    db.sort((a, b) => new Date(b.date) - new Date(a.date));

    output.innerHTML = '';
    
    if (db.length === 0) {
        output.innerHTML = '<p style="text-align:center; color:#777;">Записів за цей період немає.</p>';
        return;
    }

    db.forEach(record => {
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

function exportData() {
    const db = localStorage.getItem(DB_KEY);
    if (!db) {
        alert("Даних немає для збереження");
        return;
    }
    const blob = new Blob([db], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Журнал_групи_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}
