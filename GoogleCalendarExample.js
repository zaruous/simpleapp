// main.js

// ⚠️ 중요: Google Cloud Console에서 발급받은 본인의 값으로 변경하세요!
const API_KEY = 'AIzaSyB2aFGko73dm28qnYikMbTbtZLWNaigrJc';
const CLIENT_ID = '515379016462-qr52dncduipq08kcqqmi53rbbmdcqbo3.apps.googleusercontent.com';

const helper = new GoogleCalendarHelper(API_KEY, CLIENT_ID);

// --- UI 요소 ---
const authorizeButton = document.getElementById('authorize_button');
const signoutButton = document.getElementById('signout_button');
const controls = document.getElementById('controls');
const content = document.getElementById('content');

// --- 조회 컨트롤 ---
const searchDateInput = document.getElementById('search_date');
const searchButton = document.getElementById('search_button');

// --- 상세 정보 폼 컨트롤 ---
const eventIdInput = document.getElementById('event_id');
const eventSummaryInput = document.getElementById('event_summary');
const allDayCheckbox = document.getElementById('all_day_checkbox');
const startDateInput = document.getElementById('start_date');
const startTimeInput = document.getElementById('start_time');
const endDateInput = document.getElementById('end_date');
const endTimeInput = document.getElementById('end_time');

// --- 작업 버튼 ---
const createButton = document.getElementById('create_button');
const updateButton = document.getElementById('update_button');
const deleteButton = document.getElementById('delete_button');
const clearFormButton = document.getElementById('clear_form_button');


/**
 * 인증 상태에 따라 UI 업데이트
 */
function updateUi(isSignedIn) {
    if (isSignedIn) {
        authorizeButton.style.display = 'none';
        signoutButton.style.display = 'block';
        controls.style.display = 'block';
        content.innerText = '로그인되었습니다. 날짜를 선택해 스케줄을 조회하세요.';
        searchDateInput.valueAsDate = new Date();
        clearForm(); // 폼 초기화
    } else {
        authorizeButton.style.display = 'block';
        signoutButton.style.display = 'none';
        controls.style.display = 'none';
        content.innerText = 'Google 계정으로 로그인하여 캘린더에 접근하세요.';
    }
}

/**
 * '종일' 체크박스 상태에 따라 시간 입력 필드 활성화/비활성화
 */
function toggleTimeInputs() {
    const isAllDay = allDayCheckbox.checked;
    startTimeInput.disabled = isAllDay;
    endTimeInput.disabled = isAllDay;
    if (isAllDay) {
        startTimeInput.value = '';
        endTimeInput.value = '';
    }
}

/**
 * 조회된 이벤트를 목록으로 화면에 표시
 */
function displayEvents(events) {
    content.innerHTML = ''; // 기존 목록 초기화
    if (events && events.length > 0) {
        events.forEach(event => {
            const item = document.createElement('div');
            item.className = 'event-item';

            const start = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date);
            const startStr = event.start.dateTime ? start.toLocaleString() : start.toLocaleDateString() + ' (종일)';

            item.innerText = `${startStr} - ${event.summary}`;
            item.onclick = () => {
                // 기존 선택 효과 제거
                document.querySelectorAll('.event-item.selected').forEach(el => el.classList.remove('selected'));
                // 새 항목에 선택 효과 추가
                item.classList.add('selected');
                populateForm(event);
            };
            content.appendChild(item);
        });
    } else {
        content.innerText = '해당 날짜에 스케줄이 없습니다.';
    }
}

/**
 * 이벤트 객체 정보로 상세 정보 폼 채우기
 */
function populateForm(event) {
    eventIdInput.value = event.id;
    eventSummaryInput.value = event.summary || '';

    if (event.start.dateTime) { // 시간 지정 이벤트
        allDayCheckbox.checked = false;
        startDateInput.value = event.start.dateTime.substring(0, 10);
        startTimeInput.value = event.start.dateTime.substring(11, 16);
        endDateInput.value = event.end.dateTime.substring(0, 10);
        endTimeInput.value = event.end.dateTime.substring(11, 16);
    } else { // 종일 이벤트
        allDayCheckbox.checked = true;
        startDateInput.value = event.start.date;
        // 종일 이벤트의 end.date는 마지막 날 + 1일이므로, -1일을 해줘야 실제 종료일
        const actualEndDate = new Date(event.end.date);
        actualEndDate.setDate(actualEndDate.getDate() - 1);
        endDateInput.valueAsDate = actualEndDate;
    }
    toggleTimeInputs();
}

/**
 * 상세 정보 폼 초기화
 */
function clearForm() {
    eventIdInput.value = '';
    eventSummaryInput.value = '';
    allDayCheckbox.checked = false;

    const now = new Date();
    startDateInput.valueAsDate = now;
    endDateInput.valueAsDate = now;
    startTimeInput.value = now.toTimeString().substring(0, 5);
    // 종료 시간은 1시간 뒤로 설정
    now.setHours(now.getHours() + 1);
    endTimeInput.value = now.toTimeString().substring(0, 5);

    toggleTimeInputs();
    document.querySelectorAll('.event-item.selected').forEach(el => el.classList.remove('selected'));
}

/**
 * 폼 데이터로부터 API가 요구하는 Event 리소스 객체 생성
 */
function buildEventResourceFromForm() {
    const summary = eventSummaryInput.value;
    if (!summary) {
        alert('스케줄 제목을 입력해주세요.');
        return null;
    }

    const eventResource = {
        'summary': summary,
    };

    if (allDayCheckbox.checked) {
        // 종일 이벤트: end.date는 마지막 날짜 + 1일 이어야 함
        const endDate = new Date(endDateInput.value);
        endDate.setDate(endDate.getDate() + 1);

        eventResource['start'] = { 'date': startDateInput.value };
        eventResource['end'] = { 'date': endDate.toISOString().substring(0, 10) };
    } else {
        // 시간 지정 이벤트
        const startDateTime = `${startDateInput.value}T${startTimeInput.value}:00`;
        const endDateTime = `${endDateInput.value}T${endTimeInput.value}:00`;

        eventResource['start'] = { 'dateTime': startDateTime, 'timeZone': 'Asia/Seoul' };
        eventResource['end'] = { 'dateTime': endDateTime, 'timeZone': 'Asia/Seoul' };
    }
    return eventResource;
}


// --- 이벤트 리스너 등록 ---

// 헬퍼 초기화
helper.init(updateUi);

// 인증 버튼
authorizeButton.onclick = () => helper.signIn();
signoutButton.onclick = () => helper.signOut();

// '종일' 체크박스
allDayCheckbox.onchange = toggleTimeInputs;

// [조회] 버튼
searchButton.onclick = async () => {
    const date = searchDateInput.valueAsDate;
    if (!date) {
        content.innerText = "조회할 날짜를 선택해주세요.";
        return;
    }
    clearForm();
    content.innerText = '스케줄을 조회하는 중...';
    try {
        const events = await helper.listEventsForDate(date);
        displayEvents(events);
    } catch (error) {
        content.innerText = '스케줄 조회 중 오류가 발생했습니다.\n' + error.message;
    }
};

// [새로 등록] 버튼
createButton.onclick = async () => {
    const eventResource = buildEventResourceFromForm();
    if (!eventResource) return;

    try {
        content.innerText = '스케줄을 등록하는 중...';
        const createdEvent = await helper.createEvent(eventResource);
        alert(`스케줄이 성공적으로 등록되었습니다: ${createdEvent.summary}`);
        searchButton.click(); // 목록 새로고침
    } catch (error) {
        alert('스케줄 등록 중 오류가 발생했습니다.\n' + error.message);
    }
};

// [수정] 버튼
updateButton.onclick = async () => {
    const eventId = eventIdInput.value;
    if (!eventId) {
        alert("수정할 스케줄을 목록에서 먼저 선택해주세요.");
        return;
    }

    const updatedEventResource = buildEventResourceFromForm();
    if (!updatedEventResource) return;

    try {
        content.innerText = '스케줄을 수정하는 중...';
        const updatedEvent = await helper.updateEvent(eventId, updatedEventResource);
        alert(`스케줄이 성공적으로 수정되었습니다: ${updatedEvent.summary}`);
        searchButton.click(); // 목록 새로고침
    } catch (error) {
        alert('스케줄 수정 중 오류가 발생했습니다.\n' + error.message);
    }
};

// [삭제] 버튼
deleteButton.onclick = async () => {
    const eventId = eventIdInput.value;
    if (!eventId) {
        alert("삭제할 스케줄을 목록에서 먼저 선택해주세요.");
        return;
    }
    if (!confirm(`정말로 '${eventSummaryInput.value}' 스케줄을 삭제하시겠습니까?`)) {
        return;
    }

    try {
        content.innerText = '스케줄을 삭제하는 중...';
        await helper.deleteEvent(eventId);
        alert('스케줄이 삭제되었습니다.');
        searchButton.click(); // 목록 새로고침
    } catch (error) {
        alert('스케줄 삭제 중 오류가 발생했습니다.\n' + error.message);
    }
};

// [폼 비우기] 버튼
clearFormButton.onclick = clearForm;