// Variables de estado globales
let data = null;                // Datos cargados desde data.json
let readLectures = new Set();   // IDs de lecturas leídas
let doneFC = new Set();         // Índices de flashcards vistas
let doneQ = new Set();          // Índices de preguntas respondidas correctamente
let curFC = 0;                  // Flashcard actual
let curQ = 0;                   // Pregunta actual

// Cargar datos al iniciar
async function loadData() {
    try {
        const response = await fetch('data.json');
        data = await response.json();
        await buildLectures();   // Construir acordeón de lecturas (fetch a cada archivo)
        initFlashcards();
        initQuiz();
        initSummary();
        updateProgress();        // Calcular progreso inicial
    } catch (error) {
        console.error('Error cargando data.json:', error);
    }
}

// Construir el acordeón de lecturas dinámicamente
async function buildLectures() {
    const accordion = document.getElementById('lecturesAccordion');
    accordion.innerHTML = ''; // Limpiar

    for (let i = 0; i < data.lectures.length; i++) {
        const lecture = data.lectures[i];
        // Crear elementos del acordeón
        const item = document.createElement('div');
        item.className = 'accordion-item shadow-sm mb-3 border-0';

        const header = document.createElement('h2');
        header.className = 'accordion-header';

        const button = document.createElement('button');
        button.className = 'accordion-button collapsed fw-bold';
        button.type = 'button';
        button.setAttribute('data-bs-toggle', 'collapse');
        button.setAttribute('data-bs-target', `#l${lecture.id}`);
        button.setAttribute('onclick', `markAsRead(${lecture.id})`);

        const icon = document.createElement('i');
        icon.id = `icon-l${lecture.id}`;
        icon.className = 'bi bi-circle read-status-icon status-pending';
        button.appendChild(icon);
        button.appendChild(document.createTextNode(' ' + lecture.title));

        header.appendChild(button);

        const collapseDiv = document.createElement('div');
        collapseDiv.id = `l${lecture.id}`;
        collapseDiv.className = 'accordion-collapse collapse';
        collapseDiv.setAttribute('data-bs-parent', '#lecturesAccordion');

        const body = document.createElement('div');
        body.className = 'accordion-body';
        body.id = `body-l${lecture.id}`;
        body.innerHTML = '<p class="text-muted">Cargando contenido...</p>';

        collapseDiv.appendChild(body);
        item.appendChild(header);
        item.appendChild(collapseDiv);
        accordion.appendChild(item);

        // Cargar el contenido del archivo HTML
        try {
            const resp = await fetch(lecture.file);
            const html = await resp.text();
            body.innerHTML = html;
        } catch (err) {
            body.innerHTML = '<p class="text-danger">Error al cargar el contenido.</p>';
        }
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
    document.getElementById('quiz-exp').style.display = 'none';
    document.getElementById('btn-next-q').classList.add('d-none');

    q.o.forEach((o, i) => {
        const btn = document.createElement('button');
        btn.className = "quiz-option btn text-start mb-2 d-block w-100";
        btn.textContent = o;
        btn.onclick = () => {
            document.querySelectorAll('.quiz-option').forEach(b => b.disabled = true);
            if (i === q.c) {
                btn.classList.add('correct');
                doneQ.add(curQ);
            } else {
                btn.classList.add('incorrect');
            }
            document.getElementById('quiz-exp').textContent = q.e;
            document.getElementById('quiz-exp').style.display = 'block';
            document.getElementById('btn-next-q').classList.remove('d-none');
            updateProgress();
        };
        optCont.appendChild(btn);
    });
}

// Siguiente pregunta
function nextQuestion() {
    if (!data) return;
    curQ = (curQ + 1) % data.quiz.length;
    renderQ();
}

// Inicializar resumen
function initSummary() {
    const sCont = document.getElementById('summary-cont');
    sCont.innerHTML = '';
    data.summary.forEach(text => {
        const div = document.createElement('div');
        div.className = 'summary-item';
        div.innerHTML = `<i class="bi bi-info-circle-fill me-2 text-secondary"></i>${text}`;
        sCont.appendChild(div);
    });
}

// Marcar lectura como leída
function markAsRead(idx) {
    readLectures.add(idx);
    const icon = document.getElementById(`icon-l${idx}`);
    if (icon) {
        icon.classList.replace('bi-circle', 'bi-check-circle-fill');
        icon.classList.replace('status-pending', 'status-completed');
    }
    updateProgress();
}

// Calcular y actualizar progreso global
function updateProgress() {
    if (!data) return;
    const total = data.lectures.length + data.flashcards.length + data.quiz.length;
    const current = readLectures.size + doneFC.size + doneQ.size;
    const perc = Math.round((current / total) * 100);

    document.getElementById('global-progress').style.width = perc + "%";
    document.getElementById('progress-text').textContent = `${current} / ${total} hitos completados`;
    const badge = document.getElementById('progressBadge');
    badge.textContent = `${current} / ${total}`;

    // Cambiar color si está completo (opcional)
    if (perc === 100) {
        badge.classList.add('bg-success');
    } else {
        badge.classList.remove('bg-success');
    }
}

// Exponer funciones globales
window.markAsRead = markAsRead;
window.changeFC = changeFC;
window.nextQuestion = nextQuestion;

// Iniciar la aplicación
window.onload = loadData;