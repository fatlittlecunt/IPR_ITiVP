document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').min = today;
    
    const movieSelect = document.getElementById('movie');
    const dateInput = document.getElementById('date');
    const timeSelect = document.getElementById('time');
    const seatsContainer = document.getElementById('seats-container');
    const selectedSeatsList = document.getElementById('selected-seats-list');
    const totalPriceElement = document.getElementById('total-price');
    const bookingForm = document.getElementById('booking-form');
    const successMessage = document.getElementById('success-message');
    const newBookingBtn = document.getElementById('new-booking');
    
    const movies = {
        1: { title: 'Дюна', price: 400, vipPrice: 700 },
        2: { title: 'Оппенгеймер', price: 350, vipPrice: 600 },
        3: { title: 'Гарри Поттер', price: 300, vipPrice: 500 },
        4: { title: 'Мстители', price: 450, vipPrice: 800 }
    };
    
    let selectedSeats = [];
    let currentSessionId = null;
    
    movieSelect.addEventListener('change', updateAvailableDates);
    dateInput.addEventListener('change', updateAvailableTimes);
    timeSelect.addEventListener('change', loadHallLayout);
    newBookingBtn.addEventListener('click', resetForm);
    bookingForm.addEventListener('submit', submitBooking);
    
    function updateAvailableDates() {
        const movieId = movieSelect.value;
        
        if (!movieId) {
            timeSelect.innerHTML = '<option value="">-- Сначала выберите дату --</option>';
            timeSelect.disabled = true;
            seatsContainer.innerHTML = '<p>Выберите фильм, дату и время для отображения схемы зала</p>';
            return;
        }
        
        console.log(`Запрос доступных дат для фильма ${movieId}`);
        
        dateInput.disabled = false;
    }
    
    function updateAvailableTimes() {
        const movieId = movieSelect.value;
        const date = dateInput.value;
        
        if (!movieId || !date) {
            timeSelect.innerHTML = '<option value="">Сначала выберите дату </option>';
            timeSelect.disabled = true;
            return;
        }
        
        simulateAjaxRequest(`/api/sessions?movie=${movieId}&date=${date}`, 'GET')
            .then(data => {
                timeSelect.innerHTML = '<option value=""> Выберите время </option>';
                
                if (data.sessions && data.sessions.length > 0) {
                    data.sessions.forEach(session => {
                        const option = document.createElement('option');
                        option.value = session.time;
                        option.textContent = session.time;
                        option.dataset.sessionId = session.id;
                        timeSelect.appendChild(option);
                    });
                    timeSelect.disabled = false;
                } else {
                    timeSelect.innerHTML = '<option value=""> Нет доступных сеансов </option>';
                    timeSelect.disabled = true;
                }
            })
            .catch(error => {
                console.error('Ошибка при получении сеансов:', error);
                timeSelect.innerHTML = '<option value=""> Ошибка загрузки </option>';
                timeSelect.disabled = true;
            });
    }
    
    function loadHallLayout() {
        selectedSeats = [];
        updateSelectedSeatsList();
        const sessionOption = timeSelect.options[timeSelect.selectedIndex];
        currentSessionId = sessionOption.dataset.sessionId;
        
        if (!currentSessionId) {
            seatsContainer.innerHTML = '<p>Выберите фильм, дату и время для отображения схемы зала</p>';
            return;
        }
        
        simulateAjaxRequest(`/api/hall-layout?session=${currentSessionId}`, 'GET')
            .then(data => {
                document.getElementById('hall-name').textContent = data.hallName || 'Зал 1';
                
                
                seatsContainer.innerHTML = '';
                
                data.seats.forEach(row => {
                    row.forEach(seat => {
                        const seatElement = document.createElement('div');
                        seatElement.className = 'seat';
                        
                        if (seat.reserved) {
                            seatElement.classList.add('reserved');
                        } else if (seat.vip) {
                            seatElement.classList.add('vip');
                        }
                        
                        seatElement.dataset.row = seat.row;
                        seatElement.dataset.number = seat.number;
                        seatElement.dataset.vip = seat.vip;
                        seatElement.title = `Ряд ${seat.row}, Место ${seat.number}`;
                        
                        seatElement.addEventListener('click', () => toggleSeatSelection(seatElement, seat));
                        
                        seatsContainer.appendChild(seatElement);
                    });
                    
                    
                });
            })
            .catch(error => {
                console.error('Ошибка при загрузке схемы зала:', error);
                seatsContainer.innerHTML = '<p>Не удалось загрузить схему зала. Пожалуйста, попробуйте позже.</p>';
            });
    }
    
    function toggleSeatSelection(seatElement, seat) {
        if (seatElement.classList.contains('reserved')) return;
        
        const seatId = `${seat.row}-${seat.number}`;
        const seatIndex = selectedSeats.findIndex(s => s.id === seatId);
        
        if (seatIndex === -1) {
            selectedSeats.push({
                id: seatId,
                row: seat.row,
                number: seat.number,
                vip: seat.vip,
                element: seatElement
            });
            seatElement.classList.add('selected');
            seatElement.classList.remove('vip');
        } else {
            selectedSeats.splice(seatIndex, 1);
            seatElement.classList.remove('selected');
            if (seat.vip) {
                seatElement.classList.add('vip');
            }
        }
        
        updateSelectedSeatsList();
    }
    
    function updateSelectedSeatsList() {
        selectedSeatsList.innerHTML = '';
        
        if (selectedSeats.length === 0) {
            selectedSeatsList.innerHTML = '<li>Нет выбранных мест</li>';
            totalPriceElement.textContent = '0';
            bookingForm.classList.add('hidden');
            return;
        }
        
        const movieId = movieSelect.value;
        const movie = movies[movieId];
        let totalPrice = 0;
        
        selectedSeats.forEach(seat => {
            const li = document.createElement('li');
            const seatPrice = seat.vip ? movie.vipPrice : movie.price;
            totalPrice += seatPrice;
            
            li.textContent = `Ряд ${seat.row}, Место ${seat.number} (${seat.vip ? 'VIP' : 'Стандарт'}) - ${seatPrice} руб.`;
            selectedSeatsList.appendChild(li);
        });
        
        totalPriceElement.textContent = totalPrice;
        bookingForm.classList.remove('hidden');
    }
    
    function submitBooking(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            sessionId: currentSessionId,
            seats: selectedSeats.map(seat => ({
                row: seat.row,
                number: seat.number,
                vip: seat.vip
            }))
        };
        
        simulateAjaxRequest('/api/bookings', 'POST', formData)
            .then(data => {
                if (data.success) {
                    document.getElementById('order-number').textContent = data.bookingId;
                    bookingForm.classList.add('hidden');
                    successMessage.classList.remove('hidden');
                } else {
                    alert('Ошибка при бронировании: ' + (data.message || 'Неизвестная ошибка'));
                }
            })
            .catch(error => {
                console.error('Ошибка при бронировании:', error);
                alert('Произошла ошибка при бронировании. Пожалуйста, попробуйте позже.');
            });
    }
    
    function resetForm() {
        selectedSeats = [];
        currentSessionId = null;
        
        document.querySelectorAll('.seat.selected').forEach(seat => {
            seat.classList.remove('selected');
        });
        
        bookingForm.reset();
        selectedSeatsList.innerHTML = '<li>Нет выбранных мест</li>';
        totalPriceElement.textContent = '0';
        
        successMessage.classList.add('hidden');
        bookingForm.classList.add('hidden');
    }
    
    function simulateAjaxRequest(url, method, data = null) {
        console.log(`Имитация ${method} запроса на ${url}`, data);
        
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (url.startsWith('/api/sessions')) {
                    const sessions = [];
                    const times = ['10:00', '13:30', '17:00', '20:30', '23:59'];
                    
                    times.forEach(time => {
                        if (Math.random() < 0.7) {
                            sessions.push({
                                id: `sess-${Math.floor(Math.random() * 10000)}`,
                                time: time
                            });
                        }
                    });
                    
                    resolve({ sessions });
                } 
                else if (url.startsWith('/api/hall-layout')) {
                    const hallNames = ['Красный', 'Синий', 'Зеленый', 'Золотой', 'Платиновый'];
                    const hallName = hallNames[Math.floor(Math.random() * hallNames.length)];
                    
                    const rows = 5;
                    const seatsPerRow = 10;
                    const seats = [];
                    
                    for (let row = 1; row <= rows; row++) {
                        const rowSeats = [];
                        for (let num = 1; num <= seatsPerRow; num++) {
                            const isVip = Math.random() < 0.3;
                            const isReserved = Math.random() < 0.2;
                            
                            rowSeats.push({
                                row: row,
                                number: num,
                                vip: isVip,
                                reserved: isReserved
                            });
                        }
                        seats.push(rowSeats);
                    }
                    
                    resolve({ hallName, seats });
                } 
                else if (url === '/api/bookings') {
                    resolve({
                        success: true,
                        bookingId: `BK-${Math.floor(Math.random() * 1000000)}`,
                        message: 'Бронирование успешно создано'
                    });
                } 
                else {
                    reject(new Error('Неизвестный URL запроса'));
                }
            }, 500); 
        });
    }
});