// ניקוי אגרסיבי של ה-Service Worker הישן לתיקון ספארי
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister();
        }
    });
}

let currentIdx = 0;
const stackContainer = document.getElementById('stack');
const progressContainer = document.getElementById('story-progress');
const fallback = document.getElementById('fallback');
const dateContainer = document.getElementById('live-date');

function setLiveDate() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    dateContainer.innerText = `${day}.${month}.${year}`;
}

// פונקציה שמעדכנת וצובעת את מלבני הסטורי למעלה
function updateStoryProgress() {
    const segments = document.querySelectorAll('.story-segment');
    segments.forEach((segment, index) => {
        if (index <= currentIdx) {
            segment.classList.add('filled');
        } else {
            segment.classList.remove('filled');
        }
    });
}

function renderApp() {
    // בודק אם קובץ ה-data.js המעודכן של הסוכן נטען בזיכרון
    if (typeof aiArticles === 'undefined' || aiArticles.length === 0) {
        setTimeout(renderApp, 100);
        return;
    }

    fallback.style.display = 'none';
    stackContainer.innerHTML = '';
    progressContainer.innerHTML = ''; 
    
    aiArticles.forEach((article, index) => {
        // בניית מלבן סטורי לכל כתבה שנמצאה
        const segment = document.createElement('div');
        segment.className = 'story-segment' + (index === 0 ? ' filled' : '');
        progressContainer.appendChild(segment);

        // בניית כרטיסיית התוכן
        const cardDiv = document.createElement('div');
        cardDiv.className = index === 0 ? 'card active' : 'card waiting-right'; 
        
        cardDiv.innerHTML = `
            <div>
                <div class="card-meta-row">
                    <div class="card-tag">${article.type || article.category || 'עדכון טכנולוגי'}</div>
                    <div class="source-platform">${article.source_site || article.source || 'רשת הטכנולוגיה'}</div>
                </div>
                <div class="card-title">${article.title || 'ללא כותרת'}</div>
                <div class="card-description">${article.description || article.summary || ''}</div>
            </div>
            <div>
                <div class="audience-box">
                    <div class="audience-title">קהל יעד ממוקד:</div>
                    <p class="audience-text">${article.audience || 'אנשי טכנולוגיה'}</p>
                </div>
                <a href="${article.link || '#'}" target="_blank" class="action-btn">למעבר לאתר הרשמי ↗</a>
            </div>
        `;
        stackContainer.appendChild(cardDiv);
    });
}

function changeCard(direction) {
    const cards = document.querySelectorAll('.card');
    if (cards.length === 0) return;

    const oldCard = cards[currentIdx];
    currentIdx = (currentIdx + direction + cards.length) % cards.length;
    const newCard = cards[currentIdx];

    if (direction === 1) { 
        oldCard.classList.remove('active');
        oldCard.classList.add('waiting-right');
        
        newCard.style.transition = 'none';
        newCard.classList.remove('waiting-right', 'active');
        newCard.classList.add('waiting-left');
        
        void newCard.offsetWidth; 
        
        newCard.style.transition = ''; 
        newCard.classList.remove('waiting-left');
        newCard.classList.add('active');
    } else { 
        oldCard.classList.remove('active');
        oldCard.classList.add('waiting-left');
        
        newCard.style.transition = 'none';
        newCard.classList.remove('waiting-left', 'active');
        newCard.classList.add('waiting-right');
        
        void newCard.offsetWidth; 
        
        newCard.style.transition = '';
        newCard.classList.remove('waiting-right');
        newCard.classList.add('active');
    }

    // עדכון קווי הסטורי בזמן תנועה
    updateStoryProgress();
}

// ניהול מחוות מגע (Swipe) למובייל
let touchstartX = 0; let touchstartY = 0; let touchendX = 0; let touchendY = 0;
stackContainer.addEventListener('touchstart', e => {
    touchstartX = e.changedTouches[0].screenX;
    touchstartY = e.changedTouches[0].screenY;
}, {passive: true});

stackContainer.addEventListener('touchend', e => {
    touchendX = e.changedTouches[0].screenX;
    touchendY = e.changedTouches[0].screenY;
    handleSwipe();
}, {passive: true});

function handleSwipe() {
    const diffX = touchstartX - touchendX;
    const diffY = touchstartY - touchendY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX < -50) changeCard(1); 
        else if (diffX > 50) changeCard(-1); 
    }
}

setLiveDate();
renderApp();