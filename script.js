// Variables de estado globales
let data = null;                     // Datos cargados desde data.json
let readLectures = new Set();         // IDs de lecturas leídas
let readActivities = new Set();       // IDs de actividades vistas
let doneFC = new Set();               // Índices de flashcards vistas
let doneQ = new Set();                // Índices de preguntas respondidas correctamente
let curFC = 0;                        // Flashcard actual
let curQ = 0;                         // Pregunta actual

const STORAGE_KEY = 'maritimeEthicsProgress';

// Cargar datos al iniciar
async function loadData() {
    try {
        const response = await fetch('data.json');
        data = await response.json();
        await buildAccordion('lecturesAccordion', data.lectures, 'lecture');
        await buildAccordion('activitiesAccordion', data.activities, 'activity');
        await loadSummary();
        initFlashcards();
        initQuiz();
        loadProgress();
        updateProgress();
    } catch (error) {
        console.error('Error cargando data.json:', error);
    }
}

// Construir un acordeón genérico (para lectures o activities)
async function buildAccordion(containerId, items, type) {
    const accordion = document.getElementById(containerId);
    accordion.innerHTML = '';

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemDiv = document.createElement('div');
        itemDiv.className = 'accordion-item shadow-sm mb-3 border-0';

        const header = document.createElement('h2');
        header.className = 'accordion-header';

        const button = document.createElement('button');
        button.className = 'accordion-button collapsed fw-bold';
        button.type = 'button';
        button.setAttribute('data-bs-toggle', 'collapse');
        button.setAttribute('data-bs-target', `#${type}-${item.id}`);
        button.setAttribute('onclick', `markAsRead('${type}', ${item.id})`);

        const icon = document.createElement('i');
        icon.id = `icon-${type}-${item.id}`;
        icon.className = 'bi bi-circle read-status-icon status-pending';
        button.appendChild(icon);
        button.appendChild(document.createTextNode(' ' + item.title));

        header.appendChild(button);

        const collapseDiv = document.createElement('div');
        collapseDiv.id = `${type}-${item.id}`;
        collapseDiv.className = 'accordion-collapse collapse';
        collapseDiv.setAttribute('data-bs-parent', `#${containerId}`);

        const body = document.createElement('div');
        body.className = 'accordion-body';
        body.id = `body-${type}-${item.id}`;
        body.innerHTML = '<p class="text-muted">Cargando contenido...</p>';

        collapseDiv.appendChild(body);
        itemDiv.appendChild(header);
        itemDiv.appendChild(collapseDiv);
        accordion.appendChild(itemDiv);

        // Cargar contenido del archivo HTML
        try {
            const resp = await fetch(item.file);
            const html = await resp.text();
            body.innerHTML = html;
        } catch (err) {
            body.innerHTML = '<p class="text-danger">Error al cargar el contenido.</p>';
        }
    }
}

// Cargar resumen desde summary.html
async function loadSummary() {
    const summaryContainer = document.getElementById('summary-content');
    if (!summaryContainer) return;
    try {
        const resp = await fetch(data.summaryFile);
        const html = await resp.text();
        summaryContainer.innerHTML = html;
    } catch (err) {
        summaryContainer.innerHTML = '<p class="text-danger">Error al cargar el resumen.</p>';
    }
}

// Inicializar flashcards
function initFlashcards() {
    if (!data || data.flashcards.length === 0) return;
    curFC = 0;
    renderFC();
}

// Renderizar flashcard actual
function renderFC() {
    const fc = data.flashcards[curFC];
    document.getElementById('fc-front').textContent = fc.f;
    document.getElementById('fc-back').textContent = fc.b;
    document.getElementById('fc-counter').textContent = `${curFC + 1} / ${data.flashcards.length}`;
    doneFC.add(curFC);
    saveProgress();
    updateProgress();
}

// Cambiar de flashcard
function changeFC(dir) {
    if (!data) return;
    curFC = (curFC + dir + data.flashcards.length) % data.flashcards.length;
    renderFC();
}

// Inicializar quiz
function initQuiz() {
    if (!data || data.quiz.length === 0) return;
    curQ = 0;
    renderQ();
}

// Renderizar pregunta actual
function renderQ() {
    const q = data.quiz[curQ];
    document.getElementById('quiz-question').textContent = q.q;
    document.getElementById('quiz-prog').textContent = `${curQ + 1} / ${data.quiz.length}`;
    const optCont = document.getElementById('quiz-options');
    optCont.innerHTML = "";
    const expDiv = document.getElementById('quiz-exp');
    expDiv.style.display = 'none';
    expDiv.classList.remove('incorrect');
    expDiv.className = 'explanation-box rounded'; // resetear clases
    document.getElementById('btn-next-q').classList.add('d-none');

    q.o.forEach((o, i) => {
        const btn = document.createElement('button');
        btn.className = "quiz-option btn text-start mb-2 d-block w-100";
        btn.textContent = o;
        btn.onclick = () => handleQuizAnswer(i, q.c, q.e, btn);
        optCont.appendChild(btn);
    });

    // Si la pregunta ya fue respondida correctamente, restaurar estado
    if (doneQ.has(curQ)) {
        const options = document.querySelectorAll('.quiz-option');
        options.forEach(opt => opt.disabled = true);
        options[q.c].classList.add('correct');
        expDiv.textContent = q.e;
        expDiv.style.display = 'block';
        expDiv.classList.remove('incorrect');
        document.getElementById('btn-next-q').classList.remove('d-none');
    }
}

// Manejar respuesta del quiz
function handleQuizAnswer(selectedIdx, correctIdx, explanation, btn) {
    const allOptions = document.querySelectorAll('.quiz-option');
    const expDiv = document.getElementById('quiz-exp');
    const nextBtn = document.getElementById('btn-next-q');

    // Reiniciar clases de explicación
    expDiv.classList.remove('incorrect');

    // Si ya estaba respondida correctamente, no permitir cambios
    if (doneQ.has(curQ)) return;

    if (selectedIdx === correctIdx) {
        // Respuesta correcta
        doneQ.add(curQ);
        saveProgress();
        updateProgress();
        allOptions.forEach(opt => opt.disabled = true);
        btn.classList.add('correct');
        expDiv.textContent = explanation; // texto original
        expDiv.style.display = 'block';
        expDiv.classList.remove('incorrect');
        nextBtn.classList.remove('d-none');
    } else {
        // Respuesta incorrecta: mostrar explicación con prefijo de error
        allOptions.forEach(opt => opt.classList.remove('incorrect'));
        btn.classList.add('incorrect');
        expDiv.textContent = "❌ Incorrecto."
        expDiv.classList.add('incorrect');
        expDiv.style.display = 'block';
        nextBtn.classList.add('d-none'); // aseguramos que no aparezca
    }
}

// Siguiente pregunta
function nextQuestion() {
    if (!data) return;
    curQ = (curQ + 1) % data.quiz.length;
    renderQ();
}

// Marcar lectura/actividad como leída
function markAsRead(type, id) {
    if (type === 'lecture') {
        readLectures.add(id);
        const icon = document.getElementById(`icon-lecture-${id}`);
        if (icon) {
            icon.classList.replace('bi-circle', 'bi-check-circle-fill');
            icon.classList.replace('status-pending', 'status-completed');
        }
    } else if (type === 'activity') {
        readActivities.add(id);
        const icon = document.getElementById(`icon-activity-${id}`);
        if (icon) {
            icon.classList.replace('bi-circle', 'bi-check-circle-fill');
            icon.classList.replace('status-pending', 'status-completed');
        }
    }
    saveProgress();
    updateProgress();
}

// Calcular y actualizar progreso global
function updateProgress() {
    if (!data) return;
    const total = data.lectures.length + data.activities.length + data.flashcards.length + data.quiz.length;
    const current = readLectures.size + readActivities.size + doneFC.size + doneQ.size;
    const perc = Math.round((current / total) * 100);

    document.getElementById('global-progress').style.width = perc + "%";
    document.getElementById('progress-text').textContent = `${current} / ${total} hitos completados`;
    const badge = document.getElementById('progressBadge');
    badge.textContent = `${current} / ${total}`;

    if (perc === 100) {
        badge.classList.add('bg-success');
    } else {
        badge.classList.remove('bg-success');
    }
}

// Guardar progreso en localStorage
function saveProgress() {
    const progress = {
        readLectures: Array.from(readLectures),
        readActivities: Array.from(readActivities),
        doneFC: Array.from(doneFC),
        doneQ: Array.from(doneQ)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

// Cargar progreso desde localStorage
function loadProgress() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
        const progress = JSON.parse(saved);
        readLectures = new Set(progress.readLectures || []);
        readActivities = new Set(progress.readActivities || []);
        doneFC = new Set(progress.doneFC || []);
        doneQ = new Set(progress.doneQ || []);

        // Actualizar iconos de lecturas y actividades
        readLectures.forEach(id => {
            const icon = document.getElementById(`icon-lecture-${id}`);
            if (icon) {
                icon.classList.replace('bi-circle', 'bi-check-circle-fill');
                icon.classList.replace('status-pending', 'status-completed');
            }
        });
        readActivities.forEach(id => {
            const icon = document.getElementById(`icon-activity-${id}`);
            if (icon) {
                icon.classList.replace('bi-circle', 'bi-check-circle-fill');
                icon.classList.replace('status-pending', 'status-completed');
            }
        });

        updateProgress();
    } catch (e) {
        console.warn('Error al cargar progreso guardado', e);
    }
}

// Exponer funciones globales para los botones HTML
window.markAsRead = markAsRead;
window.changeFC = changeFC;
window.nextQuestion = nextQuestion;

// Iniciar la aplicación
window.onload = loadData;