// Основні змінні
const STUDENTS_FILE = 'students.json';
const DB_KEY = 'attendance_db_v1';

// При завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    loadStudents();
    document.getElementById('date').valueAsDate = new Date(); // Ставимо сьогоднішню дату
});

// Функція перемикання вкладок
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

// Завантаження списку студентів з JSON
async function loadStudents() {
    try {
        const response = await fetch(STUDENTS_FILE);
        const students = await response.json();
        const listContainer = document.getElementById('student-list');
        
        listContainer.innerHTML = '';
        students.forEach((student, index) => {
            const div = document.createElement('div');
            div.className = 'student-item';
            div.innerHTML = `
                <input type="checkbox" id="student_${index}" checked>
                <label for="student_${index}">${student}</label>
            `;
            listContainer.appendChild(div);
        });
    } catch (error) {
        alert('Помилка завантаження students.json. Перевірте файл.');
        console.error(error);
    }
}

// Збереження даних
function saveAttendance() {
    const date = document.getElementById('date').value;
    const pair = document.getElementById('pairNumber').value;
    const type = document.getElementById('type').value;
    const subject = document.getElementById('subject').value;
    const teacher = document.getElementById('teacher').value;

    if (!subject || !teacher) {
        alert('Будь ласка, заповніть назву предмету та викладача');
        return;
    }

    const checkboxes = document.querySelectorAll('#student-list input[type="checkbox"]');
    const attendance = [];

    checkboxes.forEach(chk => {
        attendance.push({
            name: chk.nextElementSibling.innerText,
            present: chk.checked
        });
    });

    const record = {
        id: Date.now(), // Унікальний ID
        date,
        pair,
        type,
        subject,
        teacher,
        attendance
    };

    // Зберігаємо в LocalStorage
    let db = JSON.parse(localStorage.getItem(DB_KEY)) || [];
    db.push(record);
    localStorage.setItem(DB_KEY, JSON.stringify(db));

    alert('Дані збережено!');
    // Очистити форму (опціонально)
}

// Генерація звіту
function generateReport() {
    const start = document.getElementById('filter-start').value;
    const end = document.getElementById('filter-end').value;
    const output = document.getElementById('report-output');
    
    let db = JSON.parse(localStorage.getItem(DB_KEY)) || [];

    // Фільтрація за датою (якщо вибрано)
    if (start) db = db.filter(r => r.date >= start);
    if (end) db = db.filter(r => r.date <= end);

    // Сортування (нові зверху)
    db.sort((a, b) => new Date(b.date) - new Date(a.date));

    output.innerHTML = '';
    
    if (db.length === 0) {
        output.innerHTML = '<p>Записів не знайдено.</p>';
        return;
    }

    db.forEach(record => {
        const absents = record.attendance.filter(s => !s.present).map(s => s.name);
        const card = document.createElement('div');
        card.className = 'record-card';
        card.innerHTML = `
            <div class="record-header">
                ${record.date} | ${record.pair}-а пара (${record.type})
            </div>
            <div><strong>Предмет:</strong> ${record.subject}</div>
            <div><strong>Викладач:</strong> ${record.teacher}</div>
            <div class="absent-list">
                <strong>Відсутні (${absents.length}):</strong> ${absents.length > 0 ? absents.join(', ') : 'Всі присутні'}
            </div>
        `;
        output.appendChild(card);
    });
}

// Експорт бази даних у файл (щоб не загубити)
function exportData() {
    const db = localStorage.getItem(DB_KEY);
    const blob = new Blob([db], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}