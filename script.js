// Базовый URL для PokeAPI
const API_BASE_URL = 'https://pokeapi.co/api/v2';

// Глобальные переменные для пагинации
let currentPage = 1;
let itemsPerPage = 20;
let totalItems = 0;
let currentSearchQuery = '';
let allPokemonList = [];

// Функция для получения данных с API
async function fetchFromAPI(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Ошибка при получении данных:', error);
        return null;
    }
}

// Функция для создания карточки покемона
function createCardElement(pokemon) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    
    // Получаем URL изображения покемона
    const imageUrl = pokemon.sprites && pokemon.sprites.other ? 
                    (pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default) : 
                    'https://images.unsplash.com/photo-1542779283-429940ce8336?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80';
    
    // Создаем HTML для карточки
    cardElement.innerHTML = `
        <div class="card-image">
            <img src="${imageUrl}" alt="${pokemon.name || 'Покемон'}">
        </div>
        <div class="card-content">
            <h3>${pokemon.name ? pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1) : 'Неизвестный покемон'}</h3>
            <p>${pokemon.types ? `Тип: ${pokemon.types.map(type => type.type.name.charAt(0).toUpperCase() + type.type.name.slice(1)).join(', ')}` : 'Покемон'}</p>
            <div class="card-details">
                <span>${pokemon.stats ? pokemon.stats.find(stat => stat.stat.name === 'hp')?.base_stat || '??' : '??'} HP</span>
                <span>ID: ${pokemon.id || '???'}</span>
            </div>
        </div>
    `;
    
    // Добавляем обработчик клика для перехода на детальную страницу
    cardElement.addEventListener('click', () => {
        window.location.href = `card-detail.html?id=${pokemon.id}`;
    });
    
    return cardElement;
}

// Функция для загрузки популярных карт на главной странице
async function loadFeaturedCards() {
    const featuredCardsContainer = document.getElementById('featured-cards-container');
    if (!featuredCardsContainer) return;
    
    // Показываем индикатор загрузки
    featuredCardsContainer.innerHTML = '<div class="loading">Загрузка карт...</div>';
    
    try {
        // Получаем список покемонов (ограничиваем до 151 - первое поколение)
        const pokemonList = await fetchFromAPI('/pokemon?limit=151');
        if (!pokemonList || !pokemonList.results) {
            throw new Error('Не удалось получить список покемонов');
        }
        
        // Выбираем случайные 4 покемона для отображения
        const randomPokemons = pokemonList.results
            .sort(() => 0.5 - Math.random())
            .slice(0, 4);
        
        // Очищаем контейнер
        featuredCardsContainer.innerHTML = '';
        
        // Получаем детальную информацию о каждом покемоне и отображаем
        for (const pokemon of randomPokemons) {
            const pokemonData = await fetchFromAPI(`/pokemon/${pokemon.name}`);
            if (pokemonData) {
                const cardElement = createCardElement(pokemonData);
                featuredCardsContainer.appendChild(cardElement);
            }
        }
        
        // Если не удалось загрузить ни одного покемона
        if (featuredCardsContainer.children.length === 0) {
            throw new Error('Не удалось загрузить карты');
        }
    } catch (error) {
        console.error('Ошибка при загрузке популярных карт:', error);
        featuredCardsContainer.innerHTML = '<p>Не удалось загрузить карты. Пожалуйста, попробуйте позже.</p>';
    }
}

// Функция для загрузки всех карт на странице карт
async function loadAllCards() {
    const cardsContainer = document.getElementById('cards-container');
    if (!cardsContainer) return;
    
    // Показываем индикатор загрузки
    cardsContainer.innerHTML = '<div class="loading">Загрузка карт...</div>';
    
    try {
        // Если список покемонов еще не загружен, загружаем его
        if (allPokemonList.length === 0) {
            // Получаем список покемонов (ограничиваем до 151 - первое поколение)
            const pokemonList = await fetchFromAPI('/pokemon?limit=151');
            if (!pokemonList || !pokemonList.results) {
                throw new Error('Не удалось получить список покемонов');
            }
            allPokemonList = pokemonList.results;
            totalItems = allPokemonList.length;
        }
        
        // Фильтруем покемонов по запросу, если есть
        let filteredPokemons = allPokemonList;
        if (currentSearchQuery) {
            filteredPokemons = allPokemonList.filter(pokemon => 
                pokemon.name && pokemon.name.toLowerCase().includes(currentSearchQuery.toLowerCase())
            );
            totalItems = filteredPokemons.length;
        }
        
        // Если покемоны не найдены
        if (filteredPokemons.length === 0) {
            cardsContainer.innerHTML = '<p>Карты не найдены. Попробуйте изменить запрос.</p>';
            // Отключаем кнопки пагинации
            updatePaginationButtons(0, 0);
            return;
        }
        
        // Вычисляем индексы для текущей страницы
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredPokemons.length);
        
        // Получаем покемонов для текущей страницы
        const pokemonsToShow = filteredPokemons.slice(startIndex, endIndex);
        
        // Очищаем контейнер
        cardsContainer.innerHTML = '';
        
        // Получаем детальную информацию о каждом покемоне и отображаем
        for (const pokemon of pokemonsToShow) {
            const pokemonData = await fetchFromAPI(`/pokemon/${pokemon.name}`);
            if (pokemonData) {
                const cardElement = createCardElement(pokemonData);
                cardsContainer.appendChild(cardElement);
            }
        }
        
        // Обновляем кнопки пагинации
        updatePaginationButtons(currentPage, Math.ceil(totalItems / itemsPerPage));
        
        // Если не удалось загрузить ни одного покемона
        if (cardsContainer.children.length === 0) {
            throw new Error('Не удалось загрузить карты');
        }
    } catch (error) {
        console.error('Ошибка при загрузке всех карт:', error);
        cardsContainer.innerHTML = '<p>Не удалось загрузить карты. Пожалуйста, попробуйте позже.</p>';
    }
}

// Функция для обновления кнопок пагинации
function updatePaginationButtons(currentPage, totalPages) {
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    
    if (!prevButton || !nextButton) return;
    
    // Отключаем кнопку "Предыдущая", если мы на первой странице
    prevButton.disabled = currentPage <= 1;
    
    // Отключаем кнопку "Следующая", если мы на последней странице или нет результатов
    nextButton.disabled = currentPage >= totalPages || totalPages === 0;
}

// Функция для загрузки детальной информации о карте
async function loadCardDetail() {
    const cardDetailContainer = document.getElementById('card-detail-container');
    if (!cardDetailContainer) return;
    
    // Получаем ID покемона из URL
    const urlParams = new URLSearchParams(window.location.search);
    const pokemonId = urlParams.get('id');
    
    if (!pokemonId) {
        cardDetailContainer.innerHTML = '<p>Карта не найдена. Пожалуйста, вернитесь на <a href="cards.html">страницу карт</a>.</p>';
        return;
    }
    
    // Показываем индикатор загрузки
    cardDetailContainer.innerHTML = '<div class="loading">Загрузка информации о карте...</div>';
    
    try {
        // Получаем детальную информацию о покемоне
        const pokemonData = await fetchFromAPI(`/pokemon/${pokemonId}`);
        if (!pokemonData) {
            throw new Error('Не удалось получить информацию о покемоне');
        }
        
        // Получаем URL изображения покемона
        const imageUrl = pokemonData.sprites && pokemonData.sprites.other ? 
                        (pokemonData.sprites.other['official-artwork'].front_default || pokemonData.sprites.front_default) : 
                        'https://images.unsplash.com/photo-1542779283-429940ce8336?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80';
        
        // Получаем информацию о виде покемона для дополнительных данных
        const speciesData = await fetchFromAPI(`/pokemon-species/${pokemonId}`);
        
        // Создаем HTML для детальной информации о покемоне
        cardDetailContainer.innerHTML = `
            <div class="card-detail">
                <div class="card-detail-image">
                    <img src="${imageUrl}" alt="${pokemonData.name || 'Покемон'}">
                </div>
                <div class="card-detail-content">
                    <h2>${pokemonData.name ? pokemonData.name.charAt(0).toUpperCase() + pokemonData.name.slice(1) : 'Неизвестный покемон'}</h2>
                    <div class="card-info">
                        <p><span>ID:</span> #${pokemonData.id || '???'}</p>
                        <p><span>Тип:</span> ${pokemonData.types ? pokemonData.types.map(type => type.type.name.charAt(0).toUpperCase() + type.type.name.slice(1)).join(', ') : 'Не указан'}</p>
                        <p><span>Рост:</span> ${pokemonData.height / 10 || '?'} м</p>
                        <p><span>Вес:</span> ${pokemonData.weight / 10 || '?'} кг</p>
                        <p><span>Базовый опыт:</span> ${pokemonData.base_experience || '?'}</p>
                        <p><span>Способности:</span> ${pokemonData.abilities ? pokemonData.abilities.map(ability => ability.ability.name.charAt(0).toUpperCase() + ability.ability.name.slice(1)).join(', ') : 'Не указаны'}</p>
                        ${speciesData && speciesData.flavor_text_entries ? `<p><span>Описание:</span> ${speciesData.flavor_text_entries.find(entry => entry.language.name === 'en')?.flavor_text.replace(/\f/g, ' ') || 'Нет описания'}</p>` : ''}
                    </div>
                    <h3>Характеристики</h3>
                    <div class="stats">
                        ${pokemonData.stats ? pokemonData.stats.map(stat => `
                            <div class="stat">
                                <span class="stat-name">${stat.stat.name.charAt(0).toUpperCase() + stat.stat.name.slice(1).replace('-', ' ')}:</span>
                                <span class="stat-value">${stat.base_stat}</span>
                                <div class="stat-bar">
                                    <div class="stat-fill" style="width: ${Math.min(100, stat.base_stat / 1.5)}%"></div>
                                </div>
                            </div>
                        `).join('') : ''}
                    </div>
                    <a href="cards.html" class="btn">Назад к списку карт</a>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Ошибка при загрузке детальной информации о карте:', error);
        cardDetailContainer.innerHTML = '<p>Не удалось загрузить информацию о карте. Пожалуйста, попробуйте позже.</p>';
    }
}

// Функция для поиска карт
async function searchCards(query) {
    // Сохраняем текущий запрос
    currentSearchQuery = query;
    // Сбрасываем на первую страницу при новом поиске
    currentPage = 1;
    // Загружаем карты с учетом нового запроса
    loadAllCards();
}

// Инициализация страницы
document.addEventListener('DOMContentLoaded', () => {
    // Загрузка популярных карт на главной странице
    loadFeaturedCards();
    
    // Загрузка всех карт на странице карт
    loadAllCards();
    
    // Загрузка детальной информации о карте
    loadCardDetail();
    
    // Обработчик формы поиска
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    
    if (searchForm) {
        searchForm.addEventListener('submit', (event) => {
            event.preventDefault();
            if (searchInput) {
                searchCards(searchInput.value.trim());
            }
        });
    }
    
    // Обработчик изменения поля поиска (для очистки)
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            if (event.target.value.trim() === '') {
                searchCards(''); // Пустой запрос вернет все карты
            }
        });
    }
    
    // Обработчики кнопок пагинации
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadAllCards();
                // Прокручиваем страницу вверх
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            if (currentPage < Math.ceil(totalItems / itemsPerPage)) {
                currentPage++;
                loadAllCards();
                // Прокручиваем страницу вверх
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
});