/**
 * Classic Chat UI - Simple JavaScript Client with Theming & Dark Mode
 * Handles communication with the Spring Boot /chat endpoint.
 */

// State tracking
let isWaiting = false;
let codeBlockCounter = 0;
window.codeBlockCache = window.codeBlockCache || {};

/**
 * Get or initialize conversation ID for chat memory
 */
function getOrCreateConversationId() {
    let convId = localStorage.getItem('chat_conversation_id');
    if (!convId) {
        convId = 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('chat_conversation_id', convId);
    }
    return convId;
}

/**
 * Reset conversation ID (e.g. when user clicks Clear)
 */
function resetConversationId() {
    const newConvId = 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('chat_conversation_id', newConvId);
    return newConvId;
}

let conversationId = getOrCreateConversationId();

// DOM Element references
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const welcomeCard = document.getElementById('welcomeCard');
const statusBadge = document.getElementById('statusBadge');
const colorDropdownMenu = document.getElementById('colorDropdownMenu');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');
const autocompletePopup = document.getElementById('autocompletePopup');
const autocompleteList = document.getElementById('autocompleteList');

// Autocomplete State
let userSearchHistory = [];
try {
    userSearchHistory = JSON.parse(localStorage.getItem('chat_user_history') || '[]');
} catch (e) {
    userSearchHistory = [];
}
let currentAutocompleteMatches = [];
let autocompleteSelectedIndex = -1;

/**
 * Return Travel AI Logo SVG (Feather / Lucide travel jet with subtle aerodynamic wing)
 */
function getTravelAiLogoSvg(className = 'w-4 h-4 theme-text') {
    return `
    <svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.8-.2-1.6.1-2 .7l-.5.7 6.4 3.7-3.1 3.1-2.2-.4c-.4-.1-.8.1-1.1.4l-.4.4 2.8 2 2 2.8.4-.4c.3-.3.5-.7.4-1.1l-.4-2.2 3.1-3.1 3.7 6.4.7-.5c.6-.4.9-1.2.7-2z" fill="currentColor" fill-opacity="0.25"/>
    </svg>
    `;
}

/**
 * Send the current message from the textarea
 */
async function sendMessage() {
    if (isWaiting) return;

    const message = messageInput.value.trim();
    if (!message) return;

    // Close autocomplete and remember query
    closeAutocomplete();
    recordUserSearch(message);

    // Hide starter welcome card if present
    if (welcomeCard) {
        welcomeCard.style.display = 'none';
    }

    // Append user message to UI
    appendMessage({
        sender: 'user',
        text: message,
        time: getCurrentTime()
    });

    // Reset input textarea
    messageInput.value = '';
    messageInput.style.height = 'auto';
    updateSendButtonState();

    // Set waiting state and display typing indicator
    setWaitingState(true);
    showTypingIndicator();

    try {
        // Send request to /chat endpoint with Conversation-Id header & JSON payload
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/plain, application/json',
                'Conversation-Id': conversationId
            },
            body: JSON.stringify({
                message: message,
                conversationId: conversationId
            })
        });

        const data = await response.text();

        removeTypingIndicator();

        if (response.ok) {
            appendMessage({
                sender: 'bot',
                text: data,
                time: getCurrentTime()
            });
        } else {
            appendErrorMessage(data || `Server returned error (${response.status})`);
        }
    } catch (error) {
        removeTypingIndicator();
        console.error('Chat error:', error);
        appendErrorMessage('Unable to reach the server. Please verify your connection or backend logs.');
    } finally {
        setWaitingState(false);
    }
}

/**
 * Handle starter suggestion clicks
 */
function sendSuggestion(text) {
    if (isWaiting) return;
    closeAutocomplete();
    messageInput.value = text;
    sendMessage();
}

/**
 * Clear chat history and restore welcome screen with a fresh conversation ID
 */
function clearChat() {
    closeAutocomplete();
    chatMessages.innerHTML = '';
    if (welcomeCard) {
        welcomeCard.style.display = 'block';
        chatMessages.appendChild(welcomeCard);
    }
    conversationId = resetConversationId();
    messageInput.value = '';
    messageInput.style.height = 'auto';
    updateSendButtonState();
    messageInput.focus();
}

/**
 * Append a regular message bubble (user or bot)
 */
function appendMessage({ sender, text, time }) {
    const isUser = sender === 'user';
    const msgDiv = document.createElement('div');
    msgDiv.className = `w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto flex ${isUser ? 'justify-end' : 'justify-start'} message-enter mb-6`;

    if (isUser) {
        msgDiv.innerHTML = `
            <div class="flex items-end gap-2.5 max-w-[88%] sm:max-w-[75%] md:max-w-[65%] flex-row-reverse">
                <div class="w-8 h-8 rounded-full theme-bg text-white flex items-center justify-center font-semibold text-xs shadow-sm flex-shrink-0 mb-0.5" title="You">
                    You
                </div>
                <div class="flex flex-col items-end min-w-0 max-w-full">
                    <div class="user-message-bubble theme-bg text-white px-4 py-2 rounded-2xl rounded-br-sm shadow-sm text-[14.5px] leading-relaxed break-words whitespace-pre-wrap text-left">${escapeHtml(text.trim())}</div>
                    <span class="text-[11px] text-slate-400 dark:text-slate-500 mt-1 px-1">${time}</span>
                </div>
            </div>
        `;
    } else {
        msgDiv.innerHTML = `
            <div class="flex items-start gap-3.5 w-full">
                <div class="w-8 h-8 rounded-full bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center font-semibold text-xs shadow-sm flex-shrink-0 mt-0.5" title="AI Travel Agent">
                    ${getTravelAiLogoSvg('w-4 h-4 theme-text')}
                </div>
                <div class="flex flex-col items-start flex-1 min-w-0">
                    <div class="bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-6 py-5 rounded-2xl rounded-tl-sm shadow-sm text-[15px] leading-relaxed ai-content w-full transition-colors duration-200">
                        ${formatMarkdown(text)}
                    </div>
                    <span class="text-[11px] text-slate-400 dark:text-slate-500 mt-1 px-1">${time}</span>
                </div>
            </div>
        `;
    }

    chatMessages.appendChild(msgDiv);
    if (!isUser) {
        enhanceWeatherCards(msgDiv);
        enhanceTables(msgDiv);
    }
    scrollToBottom();
}

/**
 * Append error message alert bubble
 */
function appendErrorMessage(errorText) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto flex justify-start message-enter mb-6';
    errorDiv.innerHTML = `
        <div class="flex items-start gap-3 max-w-[85%] sm:max-w-[75%]">
            <div class="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <div class="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm">
                <span class="font-medium">Error:</span> ${escapeHtml(errorText)}
            </div>
        </div>
    `;
    chatMessages.appendChild(errorDiv);
    scrollToBottom();
}

/**
 * Display typing indicator
 */
function showTypingIndicator() {
    removeTypingIndicator();
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typingIndicator';
    typingDiv.className = 'w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto flex justify-start message-enter mb-6';
    typingDiv.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center text-xs shadow-sm flex-shrink-0" title="AI Travel Agent">
                ${getTravelAiLogoSvg('w-4 h-4 theme-text')}
            </div>
            <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5 transition-colors duration-200">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="text-xs text-slate-400 dark:text-slate-400 ml-1.5 font-medium">Assistant is thinking...</span>
            </div>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
}

/**
 * Remove typing indicator
 */
function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

/**
 * Toggle UI state during request execution
 */
function setWaitingState(waiting) {
    isWaiting = waiting;
    messageInput.disabled = waiting;
    sendBtn.disabled = waiting || !messageInput.value.trim();

    if (waiting) {
        messageInput.placeholder = 'Waiting for response...';
        if (statusBadge) {
            statusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span> Thinking...';
            statusBadge.className = 'inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800';
        }
    } else {
        messageInput.placeholder = 'Type your message... (Enter to send, Shift+Enter for new line)';
        if (statusBadge) {
            statusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500"></span> Online';
            statusBadge.className = 'inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800';
        }
        messageInput.focus();
    }
}

/**
 * Update the send button enabled/disabled state
 */
function updateSendButtonState() {
    sendBtn.disabled = isWaiting || !messageInput.value.trim();
}

/**
 * Auto-resize textarea to fit content
 */
function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 140) + 'px';
    updateSendButtonState();
}

/* ==========================================================================
   Real-Time Auto-Suggestion & Auto-Completion Engine
   ========================================================================== */

/**
 * Curated Travel & Assistant Prompt Bank for Auto-Suggestion
 */
const AUTOCOMPLETE_PROMPTS = [
    // Hotels & Stays
    { text: "Find hotels under 5000 in Patna", category: "Hotels", icon: "🏨", keywords: ["hotel", "hotels", "patna", "under", "stay", "room"] },
    { text: "Find hotels in Goa under 4000", category: "Hotels", icon: "🏨", keywords: ["hotel", "hotels", "goa", "under", "resort", "beach"] },
    { text: "Find luxury hotels in Jaipur with heritage view", category: "Hotels", icon: "🏨", keywords: ["hotel", "hotels", "jaipur", "luxury", "palace"] },
    { text: "Find budget hotels in Delhi near railway station", category: "Hotels", icon: "🏨", keywords: ["hotel", "hotels", "delhi", "budget", "railway", "station"] },
    { text: "Find 5 star hotels in Mumbai near airport", category: "Hotels", icon: "🏨", keywords: ["hotel", "hotels", "mumbai", "airport", "5 star"] },
    { text: "Find hotels in Bangalore near tech park", category: "Hotels", icon: "🏨", keywords: ["hotel", "hotels", "bangalore", "bengaluru", "tech park"] },
    { text: "Find resorts in Kerala with backwaters view", category: "Hotels", icon: "🏨", keywords: ["hotel", "resort", "kerala", "backwaters", "alleppey"] },
    { text: "Find budget stays in Manali with mountain view", category: "Hotels", icon: "🏨", keywords: ["hotel", "manali", "mountain", "budget", "stay"] },
    { text: "Find hotels in Varanasi near Ganga ghats", category: "Hotels", icon: "🏨", keywords: ["hotel", "varanasi", "ghats", "kashi"] },
    { text: "Find hotels in Udaipur near Lake Pichola", category: "Hotels", icon: "🏨", keywords: ["hotel", "udaipur", "lake", "pichola"] },
    { text: "Find hotels in Hyderabad near Hitec City", category: "Hotels", icon: "🏨", keywords: ["hotel", "hyderabad", "hitec city"] },

    // Flights
    { text: "Find flights from Delhi to Mumbai", category: "Flights", icon: "✈️", keywords: ["flight", "flights", "delhi", "mumbai", "airline", "fare"] },
    { text: "Search flights from Patna to Bangalore", category: "Flights", icon: "✈️", keywords: ["flight", "flights", "patna", "bangalore", "bengaluru"] },
    { text: "Search cheap flights from Mumbai to Goa", category: "Flights", icon: "✈️", keywords: ["flight", "flights", "mumbai", "goa", "cheap"] },
    { text: "Find direct flights from Kolkata to Delhi", category: "Flights", icon: "✈️", keywords: ["flight", "flights", "kolkata", "delhi", "direct"] },
    { text: "Find flights from Chennai to Bangalore", category: "Flights", icon: "✈️", keywords: ["flight", "flights", "chennai", "bangalore"] },
    { text: "Find flights from Hyderabad to Goa", category: "Flights", icon: "✈️", keywords: ["flight", "flights", "hyderabad", "goa"] },
    { text: "Compare flight options from Ahmedabad to Delhi", category: "Flights", icon: "✈️", keywords: ["flight", "flights", "ahmedabad", "delhi"] },
    { text: "Find flights from Delhi to Srinagar, Kashmir", category: "Flights", icon: "✈️", keywords: ["flight", "flights", "delhi", "srinagar", "kashmir"] },

    // Weather & Forecasts
    { text: "Weather in Patna today", category: "Weather", icon: "☀️", keywords: ["weather", "patna", "forecast", "temp", "temperature", "rain"] },
    { text: "Weather in Goa this week", category: "Weather", icon: "☀️", keywords: ["weather", "goa", "forecast", "beach"] },
    { text: "How is the weather in Manali currently?", category: "Weather", icon: "☀️", keywords: ["weather", "manali", "cold", "snow", "temp"] },
    { text: "Weather forecast and rainfall in Delhi", category: "Weather", icon: "☀️", keywords: ["weather", "delhi", "rainfall", "rain"] },
    { text: "Weather and temperature in Shimla", category: "Weather", icon: "☀️", keywords: ["weather", "shimla", "temperature"] },
    { text: "Check live weather in Mumbai", category: "Weather", icon: "☀️", keywords: ["weather", "mumbai", "live"] },
    { text: "Weather forecast in Jaipur, Rajasthan", category: "Weather", icon: "☀️", keywords: ["weather", "jaipur", "rajasthan"] },
    { text: "Weather and packing tips for Kashmir", category: "Weather", icon: "☀️", keywords: ["weather", "kashmir", "packing", "cold"] },

    // Itinerary & Vacation Planning
    { text: "Plan a 3-day trip to Goa under 25000 budget", category: "Plan", icon: "🗺️", keywords: ["plan", "trip", "goa", "vacation", "budget", "itinerary"] },
    { text: "Plan a 5-day vacation to Kerala with family", category: "Plan", icon: "🗺️", keywords: ["plan", "kerala", "vacation", "family", "itinerary"] },
    { text: "Plan a weekend getaway from Delhi to Rishikesh", category: "Plan", icon: "🗺️", keywords: ["plan", "weekend", "delhi", "rishikesh", "rafting"] },
    { text: "Plan a 4-day Golden Triangle tour: Delhi, Agra, Jaipur", category: "Plan", icon: "🗺️", keywords: ["plan", "golden triangle", "agra", "jaipur", "delhi"] },
    { text: "Plan a 4-day holiday in Manali under 30000", category: "Plan", icon: "🗺️", keywords: ["plan", "manali", "holiday", "budget"] },
    { text: "Plan a heritage trip to Udaipur and Jodhpur", category: "Plan", icon: "🗺️", keywords: ["plan", "udaipur", "jodhpur", "rajasthan"] },

    // Orders & Inventory (E-Commerce support)
    { text: "What products are currently in stock in inventory?", category: "Inventory", icon: "📦", keywords: ["inventory", "stock", "products", "items", "warehouse"] },
    { text: "What is the status of order 1042?", category: "Orders", icon: "🔍", keywords: ["order", "status", "1042", "track", "delivery"] },
    { text: "Check delivery status for order 1001", category: "Orders", icon: "🔍", keywords: ["order", "1001", "delivery", "track"] },
    { text: "Cancel order 1002", category: "Orders", icon: "❌", keywords: ["cancel", "order", "1002"] },
    { text: "Check inventory stock for item 201", category: "Inventory", icon: "📦", keywords: ["inventory", "item", "201", "stock"] },

    // Developer / Code Assistance
    { text: "Write Python code to call OpenAI chat API", category: "Code", icon: "💻", keywords: ["code", "python", "api", "chat", "openai"] },
    { text: "Write Java Spring Boot RestController example", category: "Code", icon: "💻", keywords: ["code", "java", "spring", "boot", "restcontroller"] },
    { text: "Convert Python dictionary code to Java Map", category: "Code", icon: "💻", keywords: ["code", "convert", "python", "java", "map"] },
    { text: "Write JavaScript fetch function to call backend chat API", category: "Code", icon: "💻", keywords: ["code", "javascript", "fetch", "api"] }
];

/**
 * Check if the auto-suggestion popup is visible
 */
function isAutocompleteOpen() {
    return autocompletePopup && !autocompletePopup.classList.contains('hidden') && currentAutocompleteMatches.length > 0;
}

/**
 * Close auto-suggestion popup and reset active index
 */
function closeAutocomplete() {
    if (autocompletePopup) {
        autocompletePopup.classList.add('hidden');
    }
    currentAutocompleteMatches = [];
    autocompleteSelectedIndex = -1;
}

/**
 * Record a user search in localStorage for personalized auto-suggestions
 */
function recordUserSearch(text) {
    if (!text || text.length < 3) return;
    const clean = text.trim();
    userSearchHistory = userSearchHistory.filter(q => q.toLowerCase() !== clean.toLowerCase());
    userSearchHistory.unshift(clean);
    if (userSearchHistory.length > 20) userSearchHistory.pop();
    try {
        localStorage.setItem('chat_user_history', JSON.stringify(userSearchHistory));
    } catch (e) {}
}

/**
 * Return CSS badge class for auto-suggestion category
 */
function getCategoryPillClass(category) {
    switch ((category || '').toLowerCase()) {
        case 'hotels':
            return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20';
        case 'flights':
            return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20';
        case 'weather':
            return 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20';
        case 'plan':
            return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20';
        case 'orders':
        case 'inventory':
            return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20';
        case 'code':
            return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20';
        default:
            return 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20';
    }
}

/**
 * Highlight matching tokens in suggestion text
 */
function highlightAutocompleteMatches(text, query) {
    if (!query) return escapeHtml(text);
    const tokens = query.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return escapeHtml(text);

    const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const escapedText = escapeHtml(text);
    return escapedText.replace(regex, '<span class="autocomplete-match-highlight">$1</span>');
}

/**
 * Filter and rank suggestions against user input
 */
function findAutocompleteMatches(rawQuery) {
    const query = (rawQuery || '').trim();
    if (!query || query.length < 1) return [];

    const lowerQuery = query.toLowerCase();
    const tokens = lowerQuery.split(/\s+/).filter(Boolean);
    const results = [];
    const seenTexts = new Set();

    // 1. Check user recent search history
    for (const hist of userSearchHistory) {
        const histLower = hist.toLowerCase();
        if (tokens.every(t => histLower.includes(t)) && histLower !== lowerQuery) {
            results.push({
                text: hist,
                category: 'Recent',
                icon: '🕒',
                score: 200 + (histLower.startsWith(lowerQuery) ? 50 : 0)
            });
            seenTexts.add(histLower);
            if (results.length >= 2) break;
        }
    }

    // 2. Check predefined prompt bank
    for (const item of AUTOCOMPLETE_PROMPTS) {
        const itemLower = item.text.toLowerCase();
        if (seenTexts.has(itemLower)) continue;
        if (itemLower === lowerQuery) continue;

        let score = 0;
        if (itemLower.startsWith(lowerQuery)) {
            score += 100;
        } else if (itemLower.includes(lowerQuery)) {
            score += 60;
        } else {
            const matchedAllTokens = tokens.every(token => {
                return itemLower.includes(token) || (item.keywords && item.keywords.some(k => k.includes(token)));
            });
            if (matchedAllTokens) {
                score += 40;
            }
        }

        if (score > 0) {
            results.push({
                text: item.text,
                category: item.category,
                icon: item.icon,
                score: score
            });
            seenTexts.add(itemLower);
        }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 6);
}

/**
 * Update the auto-suggestion dropdown with matched suggestions
 */
function updateAutocomplete(query) {
    if (!autocompletePopup || !autocompleteList) return;

    const matches = findAutocompleteMatches(query);
    currentAutocompleteMatches = matches;
    autocompleteSelectedIndex = -1;

    if (matches.length === 0) {
        closeAutocomplete();
        return;
    }

    renderAutocompleteList(matches, query);
    autocompletePopup.classList.remove('hidden');
}

/**
 * Render items inside auto-suggestion list
 */
function renderAutocompleteList(matches, query) {
    autocompleteList.innerHTML = matches.map((item, idx) => {
        const isSelected = idx === autocompleteSelectedIndex;
        return `
            <div class="autocomplete-item ${isSelected ? 'active-suggestion' : ''}"
                 data-index="${idx}"
                 onclick="selectAutocompleteSuggestion(${idx})">
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <span class="text-base flex-shrink-0">${item.icon}</span>
                    <span class="text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate">
                        ${highlightAutocompleteMatches(item.text, query)}
                    </span>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span class="autocomplete-category-pill ${getCategoryPillClass(item.category)}">
                        ${item.category}
                    </span>
                    <span class="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline-flex items-center gap-0.5" title="Insert suggestion">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Navigate through suggestions using up/down arrow keys
 */
function navigateAutocomplete(direction) {
    if (currentAutocompleteMatches.length === 0) return;

    autocompleteSelectedIndex += direction;
    if (autocompleteSelectedIndex >= currentAutocompleteMatches.length) {
        autocompleteSelectedIndex = 0;
    } else if (autocompleteSelectedIndex < 0) {
        autocompleteSelectedIndex = currentAutocompleteMatches.length - 1;
    }

    const items = autocompleteList.querySelectorAll('.autocomplete-item');
    items.forEach((item, idx) => {
        if (idx === autocompleteSelectedIndex) {
            item.classList.add('active-suggestion');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('active-suggestion');
        }
    });
}

/**
 * Accept the currently highlighted (or first) auto-suggestion
 */
function acceptCurrentAutocomplete() {
    if (currentAutocompleteMatches.length === 0) return;
    const targetIndex = autocompleteSelectedIndex >= 0 ? autocompleteSelectedIndex : 0;
    selectAutocompleteSuggestion(targetIndex);
}

/**
 * Select a specific suggestion by index
 */
function selectAutocompleteSuggestion(index) {
    if (!currentAutocompleteMatches[index]) return;
    const chosen = currentAutocompleteMatches[index].text;

    messageInput.value = chosen;
    closeAutocomplete();
    autoResize(messageInput);
    updateSendButtonState();
    messageInput.focus();

    try {
        messageInput.setSelectionRange(chosen.length, chosen.length);
    } catch (e) {}
}

/**
 * Handle input event on textarea (auto-resize + auto-suggestions)
 */
function handleInput(event) {
    autoResize(messageInput);
    updateAutocomplete(messageInput.value);
}

/**
 * Keyboard listener: Enter sends message, Shift+Enter creates newline, Arrow keys & Tab navigate auto-suggestions
 */
function handleKeyDown(event) {
    if (isAutocompleteOpen()) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            navigateAutocomplete(1);
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            navigateAutocomplete(-1);
            return;
        }
        if (event.key === 'Tab') {
            event.preventDefault();
            acceptCurrentAutocomplete();
            return;
        }
        if (event.key === 'Enter' && !event.shiftKey) {
            if (autocompleteSelectedIndex >= 0) {
                event.preventDefault();
                acceptCurrentAutocomplete();
                return;
            }
            closeAutocomplete();
            event.preventDefault();
            sendMessage();
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            closeAutocomplete();
            return;
        }
    } else {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }
}

/**
 * Scroll chat messages to bottom
 */
function scrollToBottom() {
    requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

/**
 * Return current formatted time (e.g. 10:45 AM)
 */
function getCurrentTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Escape HTML to prevent injection
 */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Modern Markdown renderer supporting tables, code blocks, checklists, bold, etc.
 */
function formatMarkdown(text) {
    if (!text) return '';

    // Step 1: Pre-process custom ```weather blocks into unique unindented placeholders.
    // This prevents marked.parse from treating indented HTML in the rendered card as a markdown code block!
    const weatherCards = {};
    let cardIdx = 0;
    let processedText = text.replace(/```weather\s*\n([\s\S]*?)```/gi, function(match, content) {
        const getVal = (key) => {
            const m = content.match(new RegExp(`(?:^|\\n)\\s*${key}\\s*:\\s*(.+)`, 'i'));
            return m ? m[1].trim() : '';
        };
        const token = `%%GW_WEATHER_CARD_TOKEN_${cardIdx++}%%`;
        weatherCards[token] = renderWeatherCardHtml({
            city: getVal('city') || getVal('location') || 'Destination',
            temp: getVal('temp') || getVal('temperature') || '26',
            condition: getVal('condition') || 'Light rain',
            humidity: getVal('humidity') || '100',
            wind: getVal('wind') || '18.50',
            precip: getVal('precip') || '100',
            tip: getVal('tip') || getVal('packing') || ''
        });
        return '\n\n' + token + '\n\n';
    });

    try {
        if (typeof marked !== 'undefined') {
            const renderer = new marked.Renderer();

            // Custom ChatGPT / Claude style code block renderer with syntax highlighting & language converter
            renderer.code = function(code, lang) {
                let codeText = typeof code === 'object' && code !== null ? (code.text || '') : (code || '');
                let language = (typeof code === 'object' && code !== null ? code.lang : lang) || 'code';
                const cbId = 'cb_' + (++codeBlockCounter) + '_' + Math.random().toString(36).substring(2, 6);

                let highlighted = escapeHtml(codeText);
                if (typeof hljs !== 'undefined') {
                    try {
                        if (language && hljs.getLanguage(language)) {
                            highlighted = hljs.highlight(codeText, { language: language }).value;
                        } else {
                            highlighted = hljs.highlightAuto(codeText).value;
                        }
                    } catch (err) {
                        highlighted = escapeHtml(codeText);
                    }
                }

                // Register code block in memory cache for instant conversion switching
                window.codeBlockCache = window.codeBlockCache || {};
                window.codeBlockCache[cbId] = {
                    originalCode: codeText,
                    currentCode: codeText,
                    currentLang: language.toLowerCase(),
                    translations: {
                        [language.toLowerCase()]: codeText
                    }
                };

                return `
                <div class="code-block-wrapper" id="${cbId}">
                    <div class="code-block-header">
                        <div class="code-lang-badge">
                            <span class="code-window-dots">
                                <span class="code-dot code-dot-red"></span>
                                <span class="code-dot code-dot-yellow"></span>
                                <span class="code-dot code-dot-green"></span>
                            </span>
                            <span id="${cbId}_badge">${language}</span>
                        </div>
                        <div class="code-block-actions">
                            <div class="code-convert-box" id="${cbId}_convertBox" title="Convert code to another programming language">
                                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                <select class="code-convert-select" id="${cbId}_select" onchange="convertCodeBlock('${cbId}', this.value)">
                                    <option value="" disabled selected>Convert to...</option>
                                    <option value="java">Java</option>
                                    <option value="javascript">JavaScript</option>
                                    <option value="csharp">C#</option>
                                    <option value="python">Python</option>
                                    <option value="typescript">TypeScript</option>
                                    <option value="go">Go</option>
                                </select>
                            </div>
                            <button type="button" onclick="copyCode(this)" class="code-copy-btn">
                                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span>Copy</span>
                            </button>
                        </div>
                    </div>
                    <pre><code class="hljs language-${language}" id="${cbId}_code">${highlighted}</code></pre>
                </div>`;
            };

            marked.setOptions({
                gfm: true,
                breaks: true,
                renderer: renderer
            });
            let rawHtml = marked.parse(processedText);

            // Wrap tables in modern responsive wrapper
            rawHtml = rawHtml.replace(/<table>/gi, '<div class="table-responsive-wrapper"><table class="modern-table">');
            rawHtml = rawHtml.replace(/<\/table>/gi, '</table></div>');

            // Re-inject weather cards in place of placeholder tokens
            for (const token in weatherCards) {
                const cardHtml = weatherCards[token];
                rawHtml = rawHtml.replace(new RegExp(`<p>\\s*${token}\\s*<\\/p>`, 'g'), cardHtml);
                rawHtml = rawHtml.replace(new RegExp(token, 'g'), cardHtml);
            }

            const cleanHtml = typeof DOMPurify !== 'undefined'
                ? DOMPurify.sanitize(rawHtml, {
                    ADD_TAGS: ['div', 'span', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'svg', 'path', 'defs', 'linearGradient', 'stop', 'text', 'pre', 'code', 'button', 'select', 'option'],
                    ADD_ATTR: ['class', 'style', 'align', 'target', 'viewBox', 'fill', 'd', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'clip-rule', 'fill-rule', 'onclick', 'onchange', 'type', 'id', 'title', 'value', 'selected', 'disabled', 'x1', 'y1', 'x2', 'y2', 'offset', 'stop-color', 'stop-opacity', 'x', 'y', 'text-anchor', 'font-size', 'font-weight', 'font-family', 'preserveAspectRatio']
                })
                : rawHtml;
            return cleanHtml;
        }
    } catch (e) {
        console.warn('Marked parse error, falling back to basic regex', e);
    }

    let html = escapeHtml(processedText);

    // Code blocks with syntax wrapper, copy button, and converter
    html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, function(match, lang, code) {
        const language = lang || 'text';
        const cbId = 'cb_' + (++codeBlockCounter) + '_' + Math.random().toString(36).substring(2, 6);

        window.codeBlockCache = window.codeBlockCache || {};
        window.codeBlockCache[cbId] = {
            originalCode: code.trim(),
            currentCode: code.trim(),
            currentLang: language.toLowerCase(),
            translations: {
                [language.toLowerCase()]: code.trim()
            }
        };

        return `
            <div class="code-block-wrapper" id="${cbId}">
                <div class="code-block-header">
                    <div class="code-lang-badge">
                        <span class="code-window-dots">
                            <span class="code-dot code-dot-red"></span>
                            <span class="code-dot code-dot-yellow"></span>
                            <span class="code-dot code-dot-green"></span>
                        </span>
                        <span id="${cbId}_badge">${language}</span>
                    </div>
                    <div class="code-block-actions">
                        <div class="code-convert-box" id="${cbId}_convertBox" title="Convert code to another programming language">
                            <select class="code-convert-select" id="${cbId}_select" onchange="convertCodeBlock('${cbId}', this.value)">
                                <option value="" disabled selected>Convert to...</option>
                                <option value="java">Java</option>
                                <option value="javascript">JavaScript</option>
                                <option value="csharp">C#</option>
                                <option value="python">Python</option>
                                <option value="typescript">TypeScript</option>
                                <option value="go">Go</option>
                            </select>
                        </div>
                        <button type="button" onclick="copyCode(this)" class="code-copy-btn">
                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                        </button>
                    </div>
                </div>
                <pre><code class="language-${language}" id="${cbId}_code">${escapeHtml(code.trim())}</code></pre>
            </div>
        `;
    });

    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
    html = html.replace(/(?:^|\n)[-*] (.+)/g, '\n<li>$1</li>');
    html = html.replace(/(<li>.+<\/li>(\n<li>.+<\/li>)*)/g, '<ul>$1</ul>');
    html = html.replace(/(?:^|\n)\d+\. (.+)/g, '\n<li>$1</li>');
    html = html.replace(/\n{2,}/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    for (const token in weatherCards) {
        const cardHtml = weatherCards[token];
        html = html.replace(new RegExp(`<p>\\s*${token}\\s*<\\/p>`, 'g'), cardHtml);
        html = html.replace(new RegExp(token, 'g'), cardHtml);
    }

    return `<p>${html}</p>`;
}

let gwWidgetCounter = 0;

/**
 * Detect dynamic colorful theme configuration based on temperature and weather situation
 */
function getGwThemeConfig(tempNum, condition) {
    const cond = (condition || '').toLowerCase();
    const t = typeof tempNum === 'number' ? tempNum : (parseInt(tempNum, 10) || 26);

    if (cond.includes('snow') || cond.includes('ice') || cond.includes('freeze') || cond.includes('blizzard') || cond.includes('frost') || t <= 12) {
        return {
            themeClass: 'gw-theme-cold',
            name: 'Cold & Frost',
            gradColor: '#38bdf8',
            lineColor: '#bae6fd'
        };
    }
    if (cond.includes('thunder') || cond.includes('storm')) {
        return {
            themeClass: 'gw-theme-storm',
            name: 'Thunderstorm',
            gradColor: '#a855f7',
            lineColor: '#e9d5ff'
        };
    }
    if (cond.includes('rain') || cond.includes('shower') || cond.includes('drizzle') || cond.includes('monsoon')) {
        return {
            themeClass: 'gw-theme-rain',
            name: 'Rainy Showers',
            gradColor: '#0284c7',
            lineColor: '#7dd3fc'
        };
    }
    if (t >= 35 || cond.includes('heat') || cond.includes('hot')) {
        return {
            themeClass: 'gw-theme-hot',
            name: 'Warm & Hot',
            gradColor: '#ea580c',
            lineColor: '#fed7aa'
        };
    }
    if (t >= 25 || cond.includes('sun') || cond.includes('clear')) {
        return {
            themeClass: 'gw-theme-sunny',
            name: 'Sunny & Clear',
            gradColor: '#d97706',
            lineColor: '#fef08a'
        };
    }
    if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('fog') || cond.includes('mist') || cond.includes('haze')) {
        return {
            themeClass: 'gw-theme-cloudy',
            name: 'Cloudy & Overcast',
            gradColor: '#3b82f6',
            lineColor: '#bfdbfe'
        };
    }
    return {
        themeClass: 'gw-theme-pleasant',
        name: 'Pleasant & Mild',
        gradColor: '#059669',
        lineColor: '#a7f3d0'
    };
}

/**
 * Render Google-Style Weather Card Widget matching screenshot
 * Displays City Name, Date/Time, Sunrise/Sunset, Large Weather Icon, Temp with C/F toggle,
 * High/Low, Metrics Table, and Hourly SVG Curve Area Chart with tabs (Temperature, Precipitation, Wind)
 */
function renderWeatherCardHtml({ city, temp, condition, humidity, wind, precip, tip }) {
    const uniqueId = 'gw_' + (++gwWidgetCounter) + '_' + Math.random().toString(36).substring(2, 7);

    // Format city: e.g. "Patna, India" or "Goa, India"
    let cleanCity = (city || 'Patna, India').replace(/\(.*?\)/g, '').trim();
    if (!cleanCity.includes(',') && !cleanCity.toLowerCase().includes('india') && !cleanCity.toLowerCase().includes('dubai')) {
        cleanCity = cleanCity + ', India';
    }

    const tempNum = parseInt((temp || '26').toString().replace(/[^\d]/g, ''), 10) || 26;
    const cleanCond = condition || 'Light rain';
    const humNum = parseInt((humidity || '100').toString().replace(/[^\d]/g, ''), 10) || 100;

    let windSpeed = '18.50';
    if (wind) {
        const wMatch = wind.toString().match(/[\d\.]+/);
        if (wMatch) windSpeed = parseFloat(wMatch[0]).toFixed(2);
    }

    let precipVal = '100';
    if (precip !== undefined && precip !== null && precip !== '') {
        const pMatch = precip.toString().match(/[\d\.]+/);
        if (pMatch) precipVal = Math.round(parseFloat(pMatch[0])).toString();
    } else {
        if (/rain|shower|drizzle|storm/i.test(cleanCond)) {
            precipVal = '100';
        } else if (/cloud/i.test(cleanCond)) {
            precipVal = '20';
        } else {
            precipVal = '0';
        }
    }

    const cleanTip = tip || 'Bring a lightweight, waterproof jacket or a fold-away rain poncho plus quick-dry shirts/shorts.';

    // Dynamic colorful theme based on temperature and situation
    const theme = getGwThemeConfig(tempNum, cleanCond);

    // Date & Time formatting: e.g. "Saturday, Sep 26, 2:36 PM"
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = now.toLocaleDateString('en-US', { month: 'short' });
    const dateNum = now.getDate();
    const timeFormatted = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const formattedDate = `${dayName}, ${monthName} ${dateNum}, ${timeFormatted}`;

    const sunrise = '5:39 AM';
    const sunset = '5:42 PM';
    const highTemp = tempNum + 2;
    const lowTemp = Math.max(15, tempNum - 1);

    // 8 hourly time intervals (every 3 hours starting from Now)
    const times = [];
    const baseHour = now.getHours();
    times.push('Now');
    for (let i = 1; i < 8; i++) {
        const h = (baseHour + i * 3) % 24;
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 === 0 ? 12 : h % 12;
        times.push(`${displayH} ${period}`);
    }

    // Hourly temperatures pattern matching user screenshot: [T, T+1, T, T, T, T-1, T+1, T+5]
    const hourlyTemps = [
        tempNum,
        tempNum + 1,
        tempNum,
        tempNum,
        tempNum,
        Math.max(15, tempNum - 1),
        tempNum + 1,
        tempNum + 5
    ];

    // Hourly precip
    const pBase = parseInt(precipVal, 10);
    const hourlyPrecip = [
        pBase,
        Math.max(0, Math.min(100, Math.round(pBase * 0.9))),
        Math.max(0, Math.min(100, Math.round(pBase * 0.75))),
        Math.max(0, Math.min(100, Math.round(pBase * 0.5))),
        Math.max(0, Math.min(100, Math.round(pBase * 0.3))),
        Math.max(0, Math.min(100, Math.round(pBase * 0.15))),
        Math.max(0, Math.min(100, Math.round(pBase * 0.1))),
        Math.max(0, Math.min(100, Math.round(pBase * 0.05)))
    ];

    // Hourly wind
    const wBase = parseFloat(windSpeed);
    const hourlyWind = [
        wBase.toFixed(1),
        (wBase * 0.95).toFixed(1),
        (wBase * 0.9).toFixed(1),
        (wBase * 0.82).toFixed(1),
        (wBase * 0.75).toFixed(1),
        (wBase * 0.7).toFixed(1),
        (wBase * 0.8).toFixed(1),
        (wBase * 0.92).toFixed(1)
    ];

    // Store in global cache for tab switching and C/F toggle
    window.gwData = window.gwData || {};
    window.gwData[uniqueId] = {
        city: cleanCity,
        tempC: tempNum,
        highC: highTemp,
        lowC: lowTemp,
        unit: 'C',
        activeTab: 'temp',
        themeConfig: theme,
        times: times,
        hourlyTemps: hourlyTemps,
        hourlyPrecip: hourlyPrecip,
        hourlyWind: hourlyWind
    };

    // Realistic Weather Icons
    let iconHtml = '';
    const condLower = cleanCond.toLowerCase();
    if (condLower.includes('thunder') || condLower.includes('storm')) {
        iconHtml = `
            <div class="gw-icon-storm">
                <div class="gw-icon-cloud gw-storm-cloud"></div>
                <div class="gw-lightning-bolt">
                    <svg viewBox="0 0 24 24" fill="#fde047" class="w-6 h-6"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                </div>
                <div class="gw-rain-drops">
                    <span class="gw-drop d1"></span>
                    <span class="gw-drop d2"></span>
                </div>
            </div>
        `;
    } else if (condLower.includes('rain') || condLower.includes('shower') || condLower.includes('drizzle') || condLower.includes('monsoon')) {
        iconHtml = `
            <div class="gw-icon-rain">
                <div class="gw-icon-sun-behind"></div>
                <div class="gw-icon-cloud"></div>
                <div class="gw-rain-drops">
                    <span class="gw-drop d1"></span>
                    <span class="gw-drop d2"></span>
                    <span class="gw-drop d3"></span>
                </div>
            </div>
        `;
    } else if (condLower.includes('snow') || condLower.includes('ice') || condLower.includes('frost')) {
        iconHtml = `
            <div class="gw-icon-snow">
                <div class="gw-icon-cloud"></div>
                <div class="gw-snow-flakes">
                    <span class="gw-flake f1">❄</span>
                    <span class="gw-flake f2">❄</span>
                </div>
            </div>
        `;
    } else if (condLower.includes('cloud') || condLower.includes('overcast') || condLower.includes('fog') || condLower.includes('mist')) {
        iconHtml = `
            <div class="gw-icon-cloud-pure"></div>
        `;
    } else {
        // Large Realistic 3D Glowing Sun with pulsating corona ring
        iconHtml = `
            <div class="gw-icon-sun-pure">
                <div class="gw-sun-corona-ring"></div>
            </div>
        `;
    }

    const chartSvg = renderGwChartSvg(uniqueId, 'temp');

    return `
    <div class="google-weather-widget ${theme.themeClass}" id="${uniqueId}">
        <div class="gw-header">
            <div class="gw-header-left">
                <h2 class="gw-city-title">${escapeHtml(cleanCity)}</h2>
                <div class="gw-condition-date">
                    <span class="gw-condition-name">${escapeHtml(cleanCond)}</span>
                    <span class="gw-dot-sep">·</span>
                    <span class="gw-datetime">${formattedDate}</span>
                </div>
            </div>
            <div class="gw-header-right">
                <div class="gw-sun-times">
                    <span>Sunrise ${sunrise}</span>
                    <span class="gw-dot-sep">·</span>
                    <span>Sunset ${sunset}</span>
                </div>
            </div>
        </div>

        <div class="gw-body-grid">
            <!-- Left Column -->
            <div class="gw-left-col">
                <div class="gw-hero-row">
                    <div class="gw-weather-icon-wrap">
                        ${iconHtml}
                    </div>
                    <div class="gw-temp-wrap">
                        <span class="gw-temp-val" id="${uniqueId}_temp">${tempNum}°</span>
                        <div class="gw-unit-toggle">
                            <button type="button" class="gw-unit-btn active" id="${uniqueId}_btnC" onclick="toggleGwUnit('${uniqueId}', 'C')">C</button>
                            <span class="gw-unit-divider">|</span>
                            <button type="button" class="gw-unit-btn" id="${uniqueId}_btnF" onclick="toggleGwUnit('${uniqueId}', 'F')">F</button>
                        </div>
                    </div>
                </div>
                <div class="gw-high-low" id="${uniqueId}_highlow">High ${highTemp}° · Low ${lowTemp}°</div>

                <div class="gw-divider"></div>

                <div class="gw-metrics-table">
                    <div class="gw-metric-row">
                        <span class="gw-metric-label">Humidity</span>
                        <span class="gw-metric-value">${humNum}%</span>
                    </div>
                    <div class="gw-metric-row">
                        <span class="gw-metric-label">Precipitation</span>
                        <span class="gw-metric-value">${precipVal}%</span>
                    </div>
                    <div class="gw-metric-row">
                        <span class="gw-metric-label">Wind</span>
                        <span class="gw-metric-value">${windSpeed} KpH</span>
                    </div>
                </div>
            </div>

            <!-- Right Column -->
            <div class="gw-right-col">
                <div class="gw-tabs-row">
                    <button type="button" class="gw-tab-btn active" id="${uniqueId}_tab_temp" onclick="switchGwTab('${uniqueId}', 'temp')">Temperature</button>
                    <button type="button" class="gw-tab-btn" id="${uniqueId}_tab_precip" onclick="switchGwTab('${uniqueId}', 'precip')">Precipitation</button>
                    <button type="button" class="gw-tab-btn" id="${uniqueId}_tab_wind" onclick="switchGwTab('${uniqueId}', 'wind')">Wind</button>
                </div>

                <div class="gw-chart-container" id="${uniqueId}_chartContainer">
                    ${chartSvg}
                </div>
            </div>
        </div>

        <div class="gw-packing-tip">
            <svg class="gw-tip-icon" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14H8a4 4 0 01-.8-7.92 4.01 4.01 0 017.6 0A4 4 0 0112 14z"/>
            </svg>
            <div class="gw-tip-content">
                <span class="gw-tip-title">Smart Packing & Travel Tip:</span>${escapeHtml(cleanTip)}
            </div>
        </div>
    </div>
    `;
}

/**
 * Generate smooth SVG Area Curve Chart for Weather Widget
 */
function renderGwChartSvg(uniqueId, tabType) {
    const data = (window.gwData && window.gwData[uniqueId]) || null;
    if (!data) return '';

    const width = 500;
    const height = 155;
    const topY = 36;
    const baseY = 100;
    const times = data.times;

    let values = [];
    let labels = [];
    let gradColor = '#eab308';
    let lineColor = '#facc15';

    if (tabType === 'temp') {
        const isF = data.unit === 'F';
        values = data.hourlyTemps.map(c => isF ? Math.round(c * 9/5 + 32) : c);
        labels = values.map(v => `${v}°`);
        gradColor = (data.themeConfig && data.themeConfig.gradColor) || '#d97706';
        lineColor = (data.themeConfig && data.themeConfig.lineColor) || '#fef08a';
    } else if (tabType === 'precip') {
        values = data.hourlyPrecip;
        labels = values.map(v => `${v}%`);
        gradColor = '#0284c7';
        lineColor = '#38bdf8';
    } else if (tabType === 'wind') {
        values = data.hourlyWind.map(w => parseFloat(w));
        labels = values.map(v => `${v}`);
        gradColor = '#059669';
        lineColor = '#34d399';
    }

    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    if (minVal === maxVal) {
        minVal -= 2;
        maxVal += 2;
    }
    const range = (maxVal - minVal) || 1;

    const stepX = (width - 60) / (values.length - 1);
    const points = values.map((val, idx) => {
        const x = 30 + idx * stepX;
        const normalized = (val - minVal) / range;
        const y = baseY - (normalized * (baseY - topY));
        return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    });

    let curvePath = '';
    if (points.length > 0) {
        curvePath = `M ${points[0].x},${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];

            const cp1x = p1.x + (p2.x - p0.x) / 5;
            const cp1y = p1.y + (p2.y - p0.y) / 5;
            const cp2x = p2.x - (p3.x - p1.x) / 5;
            const cp2y = p2.y - (p3.y - p1.y) / 5;

            curvePath += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
        }
    }

    const firstPt = points[0];
    const lastPt = points[points.length - 1];
    const areaPath = `${curvePath} L ${lastPt.x},${baseY + 12} L ${firstPt.x},${baseY + 12} Z`;

    const gradId = `gwGrad_${uniqueId}_${tabType}`;

    const valueTexts = points.map((p, idx) => {
        return `<text x="${p.x}" y="${p.y - 9}" text-anchor="middle" fill="#ffffff" font-size="12.5" font-weight="600" font-family="'Plus Jakarta Sans', system-ui, sans-serif">${labels[idx]}</text>`;
    }).join('');

    const timeTexts = points.map((p, idx) => {
        return `<text x="${p.x}" y="${height - 8}" text-anchor="middle" fill="rgba(255, 255, 255, 0.88)" font-size="11.5" font-weight="500" font-family="'Plus Jakarta Sans', system-ui, sans-serif">${times[idx]}</text>`;
    }).join('');

    return `
    <svg class="gw-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <defs>
            <linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="${gradColor}" stop-opacity="0.55" />
                <stop offset="45%" stop-color="${gradColor}" stop-opacity="0.25" />
                <stop offset="100%" stop-color="${gradColor}" stop-opacity="0.0" />
            </linearGradient>
        </defs>
        <!-- Area Under Curve -->
        <path d="${areaPath}" fill="url(#${gradId})" />
        <!-- Curve Stroke Line -->
        <path d="${curvePath}" fill="none" stroke="${lineColor}" stroke-width="2.5" stroke-linecap="round" />
        <!-- Labels Above Curve -->
        ${valueTexts}
        <!-- Time Labels -->
        ${timeTexts}
    </svg>
    `;
}

/**
 * Toggle Celsius / Fahrenheit
 */
window.toggleGwUnit = function(uniqueId, targetUnit) {
    const data = window.gwData && window.gwData[uniqueId];
    if (!data || data.unit === targetUnit) return;

    data.unit = targetUnit;
    const btnC = document.getElementById(`${uniqueId}_btnC`);
    const btnF = document.getElementById(`${uniqueId}_btnF`);
    const tempEl = document.getElementById(`${uniqueId}_temp`);
    const highLowEl = document.getElementById(`${uniqueId}_highlow`);

    if (targetUnit === 'F') {
        if (btnC) btnC.classList.remove('active');
        if (btnF) btnF.classList.add('active');
        const tempF = Math.round(data.tempC * 9/5 + 32);
        const highF = Math.round(data.highC * 9/5 + 32);
        const lowF = Math.round(data.lowC * 9/5 + 32);
        if (tempEl) tempEl.textContent = `${tempF}°`;
        if (highLowEl) highLowEl.textContent = `High ${highF}° · Low ${lowF}°`;
    } else {
        if (btnF) btnF.classList.remove('active');
        if (btnC) btnC.classList.add('active');
        if (tempEl) tempEl.textContent = `${data.tempC}°`;
        if (highLowEl) highLowEl.textContent = `High ${data.highC}° · Low ${data.lowC}°`;
    }

    if (data.activeTab === 'temp') {
        const chartContainer = document.getElementById(`${uniqueId}_chartContainer`);
        if (chartContainer) {
            chartContainer.innerHTML = renderGwChartSvg(uniqueId, 'temp');
        }
    }
};

/**
 * Switch tabs in Weather Widget (Temperature, Precipitation, Wind)
 */
window.switchGwTab = function(uniqueId, tabType) {
    const data = window.gwData && window.gwData[uniqueId];
    if (!data) return;

    data.activeTab = tabType;
    ['temp', 'precip', 'wind'].forEach(t => {
        const btn = document.getElementById(`${uniqueId}_tab_${t}`);
        if (btn) {
            if (t === tabType) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });

    const chartContainer = document.getElementById(`${uniqueId}_chartContainer`);
    if (chartContainer) {
        chartContainer.innerHTML = renderGwChartSvg(uniqueId, tabType);
    }
};

/**
 * Scan AI message DOM and enhance standard weather headers into the Google-style weather widget
 */
function enhanceWeatherCards(container) {
    if (!container) return;

    const headings = container.querySelectorAll('h1, h2, h3, h4');
    headings.forEach(h => {
        const text = h.textContent.trim();
        if (text.includes('Weather') || text.includes('☀️')) {
            let current = h.nextElementSibling;
            let combinedText = '';
            const siblings = [h];
            while (current && !['H1','H2','H3','H4','HR'].includes(current.tagName)) {
                combinedText += ' ' + current.textContent;
                siblings.push(current);
                current = current.nextElementSibling;
            }

            // Extract weather data from combined text
            const tempMatch = combinedText.match(/(\d+)\s*(?:°C|deg(?:rees)?\s*C|\s*°\s*C)/i);
            if (tempMatch) {
                const temp = tempMatch[1];
                const cityMatch = combinedText.match(/(?:in|for)\s+([A-Za-z\s,]+?)(?:\s*\(.*?\))?[:,\.]/i) || text.match(/(?:in|for)\s+([A-Za-z\s,]+)/i);
                let city = cityMatch ? cityMatch[1].trim() : 'Patna, India';
                city = city.replace(/^the\s+/i, '');

                const humMatch = combinedText.match(/humidity\s*[≈:=]?\s*(\d+)\s*%/i);
                const humidity = humMatch ? humMatch[1] : '100';

                const windMatch = combinedText.match(/wind\s*[≈:=]?\s*([\d\.]+)\s*(?:km\/h|kph|mph)?/i);
                const wind = windMatch ? windMatch[1] : '18.50';

                const precipMatch = combinedText.match(/precip(?:itation)?\s*[≈:=]?\s*([\d\.]+)\s*(?:%|mm)?/i);
                const precip = precipMatch ? precipMatch[1] : '';

                let condition = 'Light rain';
                const condMatch = combinedText.match(/(?:°C|deg C)[,\s]+([a-zA-Z\s]+?)(?:[,\.]|humidity)/i);
                if (condMatch && condMatch[1].trim().length > 2) {
                    condition = condMatch[1].trim();
                } else if (/rain/i.test(combinedText)) {
                    condition = 'Light rain';
                } else if (/cloud/i.test(combinedText)) {
                    condition = 'Partly Cloudy';
                } else if (/sun|clear/i.test(combinedText)) {
                    condition = 'Sunny & Clear';
                }

                const tipMatch = combinedText.match(/(?:smart\s*)?packing\s*tip\s*:\s*([^.]+?\.)/i) || combinedText.match(/(?:packing|tip)\s*:\s*(.+)/i);
                const tip = tipMatch ? tipMatch[1].trim() : 'Bring a lightweight, waterproof jacket or a fold-away rain poncho plus quick-dry shirts/shorts.';

                const cardHtml = renderWeatherCardHtml({ city, temp, condition, humidity, wind, precip, tip });
                const wrapper = document.createElement('div');
                wrapper.innerHTML = cardHtml;

                h.parentNode.insertBefore(wrapper.firstElementChild, h);
                siblings.forEach(s => s.remove());
            }
        }
    });
}

/**
 * Enhance tables with colorful headers, pure integer serial numbers, hotel IDs, prices, ratings, and transit distances.
 * STRICT ENFORCEMENT: Hotel ID and Price columns contain ONLY integer values (zero stars, zero asterisks).
 * Star (★) is strictly reserved for the Rating column only.
 */
function enhanceTables(container) {
    if (!container) return;
    const tables = container.querySelectorAll('table');
    tables.forEach(table => {
        // Ensure table is wrapped in responsive scroll container
        if (!table.parentElement.classList.contains('table-responsive-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-responsive-wrapper';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }
        table.classList.add('modern-table');

        // Ensure table has a header immediately before it
        const scrollWrapper = table.closest('.table-responsive-wrapper') || table;
        const prevEl = scrollWrapper.previousElementSibling;
        const hasHeader = prevEl && ['H1','H2','H3','H4'].includes(prevEl.tagName);
        if (!hasHeader) {
            const headerDiv = document.createElement('h3');
            headerDiv.className = 'table-section-header';
            headerDiv.innerHTML = `
                <svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
                <span>Recommended Travel & Accommodation Options</span>
            `;
            scrollWrapper.parentNode.insertBefore(headerDiv, scrollWrapper);
        }

        // Identify header types and alignment
        const ths = Array.from(table.querySelectorAll('thead th'));
        const totalCols = ths.length;
        const colTypes = ths.map((th, idx) => {
            const txt = th.textContent.trim().toLowerCase();
            const align = th.getAttribute('align');

            if (align === 'center') th.classList.add('col-center');
            else if (align === 'right') th.classList.add('col-right');

            if (idx === 0 || txt === '#' || txt === 'no' || txt === 'num' || txt === 'sn' || txt === 's.no' || txt.includes('serial')) {
                th.classList.add('col-center', 'col-index');
                return 'index';
            }
            if (txt.includes('hotel id') || txt === 'id') {
                th.classList.add('col-center', 'col-id');
                return 'id';
            }
            if (txt.includes('rating') || txt.includes('score') || txt.includes('★')) {
                th.classList.add('col-center', 'col-rating');
                return 'rating';
            }
            if (txt.includes('price') || txt.includes('rate') || txt.includes('fare') || txt.includes('₹') || txt.includes('cost')) {
                th.classList.add('col-center', 'col-price');
                return 'price';
            }
            if (idx === 1 || txt.includes('hotel') || txt.includes('name') || txt.includes('property') || txt.includes('resort') || txt.includes('stay') || txt.includes('airline') || txt.includes('flight')) {
                th.classList.add('col-hotel-name');
                return 'hotel-name';
            }
            if (txt.includes('distance') || txt.includes('transit') || txt.includes('airport') || txt.includes('station') || txt.includes('rly')) {
                th.classList.add('col-transit');
                return 'transit';
            }
            return 'text';
        });

        // Enhance body cells
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(tr => {
            const tds = Array.from(tr.querySelectorAll('td'));
            tds.forEach((td, idx) => {
                const type = colTypes[idx] || 'text';
                const cellText = td.textContent.trim();
                const align = td.getAttribute('align');

                if (align === 'center' || type === 'index' || type === 'id' || type === 'rating') {
                    td.classList.add('col-center');
                } else if (align === 'right') {
                    td.classList.add('col-right');
                }

                if (type === 'hotel-name') {
                    td.classList.add('col-hotel-name');
                } else if (type === 'transit') {
                    td.classList.add('col-transit');
                } else if (type === 'index') {
                    td.classList.add('col-index');
                } else if (type === 'id') {
                    td.classList.add('col-id');
                } else if (type === 'price') {
                    td.classList.add('col-price');
                } else if (type === 'rating') {
                    td.classList.add('col-rating');
                }

                // If not already enhanced
                if (!td.querySelector('.rating-pill, .price-pill, .id-pill, .index-pill, .transit-pill, .hotel-name-text')) {
                    if (type === 'index') {
                        // Extract pure digits only
                        const digits = cellText.replace(/[^\d]/g, '');
                        td.innerHTML = `<span class="index-pill">${digits || cellText}</span>`;
                    } else if (type === 'hotel-name') {
                        // Hotel / property name without asterisks, strictly nowrap
                        const cleanName = cellText.replace(/[*★]/g, '').trim();
                        td.innerHTML = `<span class="hotel-name-text">${escapeHtml(cleanName)}</span>`;
                    } else if (type === 'id') {
                        // Hotel ID MUST contain ONLY integer value, absolutely NO stars, NO asterisks
                        const digits = cellText.replace(/[^\d]/g, '');
                        if (digits) {
                            td.innerHTML = `<span class="id-pill">${digits}</span>`;
                        } else {
                            td.textContent = cellText.replace(/[*★]/g, '').trim();
                        }
                    } else if (type === 'price') {
                        // Price MUST contain ONLY integer value, absolutely NO stars, NO asterisks
                        const digits = cellText.replace(/[^\d]/g, '');
                        if (digits) {
                            const val = parseInt(digits, 10);
                            td.innerHTML = `<span class="price-pill">₹${val.toLocaleString('en-IN')}</span>`;
                        } else {
                            td.textContent = cellText.replace(/[*★]/g, '').trim();
                        }
                    } else if (type === 'rating') {
                        // Rating is the ONLY column allowed to have a star (★)
                        const scoreMatch = cellText.match(/(\d+(?:\.\d+)?)/);
                        if (scoreMatch) {
                            td.innerHTML = `<span class="rating-pill">★ ${scoreMatch[1]}</span>`;
                        } else {
                            td.textContent = cellText;
                        }
                    } else if (type === 'transit') {
                        const cleanTransit = cellText.replace(/[*★]/g, '').trim();
                        td.innerHTML = `<span class="transit-pill">📍 ${cleanTransit}</span>`;
                    } else {
                        // For any other column: strictly remove any stray stars or asterisks
                        if (cellText.includes('★') || cellText.includes('*')) {
                            td.textContent = cellText.replace(/[*★]/g, '').trim();
                        }
                    }
                }
            });
        });
    });
}


/**
 * Copy code block content to clipboard
 */
function copyCode(button) {
    const pre = button.closest('.code-block-wrapper').querySelector('pre code');
    if (!pre) return;

    navigator.clipboard.writeText(pre.textContent).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = `
            <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span class="text-emerald-400">Copied!</span>
        `;
        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

/**
 * Convert Code Block to Selected Programming Language (Java, JavaScript, C#, Python, TypeScript, Go)
 */
window.convertCodeBlock = async function(cbId, targetLang) {
    if (!cbId || !targetLang) return;
    const entry = window.codeBlockCache && window.codeBlockCache[cbId];
    if (!entry) return;

    const selectEl = document.getElementById(`${cbId}_select`);
    const convertBox = document.getElementById(`${cbId}_convertBox`);
    const codeEl = document.getElementById(`${cbId}_code`);
    const badgeEl = document.getElementById(`${cbId}_badge`);

    const targetKey = targetLang.toLowerCase();

    // Already on this language
    if (entry.currentLang === targetKey) {
        if (selectEl) selectEl.value = '';
        return;
    }

    // 1. Instant switch if translation already exists in cache
    if (entry.translations && entry.translations[targetKey]) {
        const cachedCode = entry.translations[targetKey];
        entry.currentCode = cachedCode;
        entry.currentLang = targetKey;
        applyCodeTranslation(codeEl, badgeEl, cachedCode, targetKey);
        if (selectEl) selectEl.value = '';
        return;
    }

    // 2. Otherwise, request translation from backend /chat/translate-code
    const originalConvertBoxHtml = convertBox ? convertBox.innerHTML : '';
    if (convertBox) {
        convertBox.innerHTML = `
            <span class="code-translating-pulse">
                <span class="code-translating-spinner"></span>
                <span>Translating to ${targetLang}...</span>
            </span>
        `;
    }

    try {
        const response = await fetch('/chat/translate-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: entry.currentCode || entry.originalCode,
                sourceLanguage: entry.currentLang,
                targetLanguage: targetLang
            })
        });

        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`);
        }

        const data = await response.json();
        const translatedCode = data.translatedCode || '';

        if (translatedCode) {
            entry.translations[targetKey] = translatedCode;
            entry.currentCode = translatedCode;
            entry.currentLang = targetKey;
            applyCodeTranslation(codeEl, badgeEl, translatedCode, targetKey);
        }
    } catch (err) {
        console.error('Failed to translate code block:', err);
        if (badgeEl) {
            const oldBadge = badgeEl.textContent;
            badgeEl.textContent = 'Translation failed';
            badgeEl.style.color = '#f87171';
            setTimeout(() => {
                badgeEl.textContent = oldBadge;
                badgeEl.style.color = '';
            }, 3000);
        }
    } finally {
        if (convertBox) {
            convertBox.innerHTML = originalConvertBoxHtml;
            const newSelect = document.getElementById(`${cbId}_select`);
            if (newSelect) newSelect.value = '';
        }
    }
};

/**
 * Apply translated code text and trigger Highlight.js
 */
function applyCodeTranslation(codeEl, badgeEl, code, lang) {
    if (!codeEl) return;
    codeEl.textContent = code;
    codeEl.className = `hljs language-${lang}`;

    if (typeof hljs !== 'undefined') {
        try {
            hljs.highlightElement(codeEl);
        } catch (e) {
            // fallback if language definition not loaded
        }
    }

    if (badgeEl) {
        badgeEl.textContent = lang;
        badgeEl.style.color = '#38bdf8';
        setTimeout(() => {
            badgeEl.style.color = '';
        }, 1500);
    }
}

/* ==========================================================================
   Theming & Dark Mode Logic
   ========================================================================== */

/**
 * Toggle Dark / Light mode
 */
function toggleDarkLightMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('chat_theme_mode', isDark ? 'dark' : 'light');
    updateThemeToggleIcons(isDark);
}

function updateThemeToggleIcons(isDark) {
    if (sunIcon && moonIcon) {
        if (isDark) {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        } else {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        }
    }
}

/**
 * Open / Close Color Dropdown
 */
function toggleColorDropdown() {
    if (colorDropdownMenu) {
        colorDropdownMenu.classList.toggle('hidden');
    }
}

/**
 * Select Color Palette (blue, rose, emerald, amber, violet, cyan, orange, fuchsia)
 */
function selectColorTheme(colorName) {
    document.documentElement.setAttribute('data-color', colorName);
    localStorage.setItem('chat_theme_color', colorName);
    updateColorChecks(colorName);
    if (colorDropdownMenu) {
        colorDropdownMenu.classList.add('hidden');
    }
}

function updateColorChecks(activeColor) {
    const colors = ['blue', 'rose', 'emerald', 'amber', 'violet', 'cyan', 'orange', 'fuchsia'];
    colors.forEach(c => {
        const check = document.querySelector(`.theme-check-${c}`);
        if (check) {
            if (c === activeColor) {
                check.classList.remove('hidden');
            } else {
                check.classList.add('hidden');
            }
        }
    });
}

// Close dropdown & autocomplete on outside click
document.addEventListener('click', (e) => {
    const dropdownBtn = document.getElementById('colorDropdownBtn');
    if (colorDropdownMenu && dropdownBtn) {
        if (!colorDropdownMenu.contains(e.target) && !dropdownBtn.contains(e.target)) {
            colorDropdownMenu.classList.add('hidden');
        }
    }
    if (autocompletePopup && !autocompletePopup.contains(e.target) && e.target !== messageInput) {
        closeAutocomplete();
    }
});

// Initial setup on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Sync dark mode icon
    const isDark = document.documentElement.classList.contains('dark');
    updateThemeToggleIcons(isDark);

    // Sync active color checkmark
    const activeColor = document.documentElement.getAttribute('data-color') || 'blue';
    updateColorChecks(activeColor);

    // Setup input listeners
    messageInput.addEventListener('input', (e) => {
        handleInput(e);
    });
    updateSendButtonState();
    messageInput.focus();
});
