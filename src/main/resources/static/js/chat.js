/**
 * Classic Chat UI - Simple JavaScript Client with Theming & Dark Mode
 * Handles communication with the Spring Boot /chat endpoint.
 */

// State tracking
let isWaiting = false;

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

/**
 * Send the current message from the textarea
 */
async function sendMessage() {
    if (isWaiting) return;

    const message = messageInput.value.trim();
    if (!message) return;

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
    messageInput.value = text;
    sendMessage();
}

/**
 * Clear chat history and restore welcome screen with a fresh conversation ID
 */
function clearChat() {
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
    msgDiv.className = `flex ${isUser ? 'justify-end' : 'justify-start'} message-enter mb-5`;

    if (isUser) {
        msgDiv.innerHTML = `
            <div class="flex items-end gap-2 max-w-[85%] sm:max-w-[75%] flex-row-reverse">
                <div class="w-8 h-8 rounded-full theme-bg text-white flex items-center justify-center font-semibold text-xs shadow-sm flex-shrink-0">
                    You
                </div>
                <div class="flex flex-col items-end">
                    <div class="theme-bg text-white px-4 py-2.5 rounded-2xl rounded-br-sm shadow-sm text-sm leading-relaxed whitespace-pre-wrap">
                        ${escapeHtml(text)}
                    </div>
                    <span class="text-[11px] text-slate-400 dark:text-slate-500 mt-1 px-1">${time}</span>
                </div>
            </div>
        `;
    } else {
        msgDiv.innerHTML = `
            <div class="flex items-start gap-3 max-w-[88%] sm:max-w-[80%]">
                <div class="w-8 h-8 rounded-full bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center font-semibold text-xs shadow-sm flex-shrink-0 mt-0.5">
                    <svg class="w-4 h-4 theme-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <div class="flex flex-col items-start flex-1 min-w-0">
                    <div class="bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm text-sm leading-relaxed ai-content w-full transition-colors duration-200">
                        ${formatMarkdown(text)}
                    </div>
                    <span class="text-[11px] text-slate-400 dark:text-slate-500 mt-1 px-1">${time}</span>
                </div>
            </div>
        `;
    }

    chatMessages.appendChild(msgDiv);
    scrollToBottom();
}

/**
 * Append error message alert bubble
 */
function appendErrorMessage(errorText) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'flex justify-start message-enter mb-5';
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
    typingDiv.className = 'flex justify-start message-enter mb-5';
    typingDiv.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center text-xs shadow-sm flex-shrink-0">
                <svg class="w-4 h-4 theme-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
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

/**
 * Keyboard listener: Enter sends message, Shift+Enter creates newline
 */
function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
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
 * Simple Markdown renderer supporting code blocks, bold, lists, etc.
 */
function formatMarkdown(text) {
    if (!text) return '';

    let html = escapeHtml(text);

    // Code blocks with syntax wrapper and copy button
    html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, function(match, lang, code) {
        const language = lang || 'text';
        return `
            <div class="code-block-wrapper">
                <div class="code-block-header">
                    <span>${language}</span>
                    <button type="button" onclick="copyCode(this)" class="hover:text-white transition-colors cursor-pointer text-[11px] font-mono flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                    </button>
                </div>
                <pre><code class="language-${language}">${code.trim()}</code></pre>
            </div>
        `;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold text
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic text
    html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>');

    // Unordered lists (- or *)
    html = html.replace(/(?:^|\n)[-*] (.+)/g, '\n<li>$1</li>');
    html = html.replace(/(<li>.+<\/li>(\n<li>.+<\/li>)*)/g, '<ul>$1</ul>');

    // Ordered lists (1. 2.)
    html = html.replace(/(?:^|\n)\d+\. (.+)/g, '\n<li>$1</li>');

    // Paragraphs
    html = html.replace(/\n{2,}/g, '</p><p>');

    // Single newlines
    html = html.replace(/\n/g, '<br>');

    return `<p>${html}</p>`;
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

// Close dropdown on outside click
document.addEventListener('click', (e) => {
    const dropdownBtn = document.getElementById('colorDropdownBtn');
    if (colorDropdownMenu && dropdownBtn) {
        if (!colorDropdownMenu.contains(e.target) && !dropdownBtn.contains(e.target)) {
            colorDropdownMenu.classList.add('hidden');
        }
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
    messageInput.addEventListener('input', () => {
        autoResize(messageInput);
    });
    updateSendButtonState();
    messageInput.focus();
});
