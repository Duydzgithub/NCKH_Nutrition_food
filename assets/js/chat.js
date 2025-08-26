/* ========================================
   Food Ninja - AI Chat Interface
   ======================================== */

class ChatManager {
    constructor() {
        this.chatContainer = null;
        this.chatMessages = null;
        this.chatInput = null;
        this.sendButton = null;
        this.isTyping = false;
        this.chatHistory = [];
        this.maxMessages = 100;
        this.typingDelay = 1000;
        this.autoScroll = true;
        
        this.init();
    }
    
    init() {
        this.loadChatHistory();
        this.setupEventListeners();
    }
    
    /* ========================================
       Chat Initialization
       ======================================== */
    
    initializeChat(containerId) {
        this.chatContainer = document.getElementById(containerId);
        if (!this.chatContainer) {
            console.error(`❌ Chat container not found: ${containerId}`);
            return false;
        }
        
        this.chatMessages = this.chatContainer.querySelector('.chat-messages');
        this.chatInput = this.chatContainer.querySelector('.chat-input');
        this.sendButton = this.chatContainer.querySelector('.send-button');
        
        if (!this.chatMessages || !this.chatInput || !this.sendButton) {
            console.error('❌ Required chat elements not found');
            return false;
        }
        
        this.setupChatEvents();
        this.displayWelcomeMessage();
        this.restoreChatHistory();
        
        console.log('💬 Chat initialized successfully');
        return true;
    }
    
    setupChatEvents() {
        // Send button click
        this.sendButton.addEventListener('click', () => {
            this.handleSendMessage();
        });
        
        // Enter key press
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });
        
        // Input changes
        this.chatInput.addEventListener('input', () => {
            this.handleInputChange();
        });
        
        // Auto-resize textarea
        this.chatInput.addEventListener('input', () => {
            this.autoResizeTextarea();
        });
    }
    
    setupEventListeners() {
        // Listen for nutrition analysis results
        window.addEventListener('nutritionAnalysisComplete', (e) => {
            this.handleNutritionResult(e.detail);
        });
        
        // Listen for chat requests
        window.addEventListener('chatRequest', (e) => {
            this.handleChatRequest(e.detail);
        });
    }
    
    /* ========================================
       Message Handling
       ======================================== */
    
    async handleSendMessage() {
        const message = this.chatInput.value.trim();
        if (!message || this.isTyping) return;
        
        // Add user message
        this.addMessage(message, 'user');
        this.chatInput.value = '';
        this.autoResizeTextarea();
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            // Send to AI
            const response = await window.FoodNinjaAPI.sendChatMessage(message);
            
            this.hideTypingIndicator();
            
            if (response.success) {
                this.addMessage(response.response, 'ai');
            } else {
                this.addMessage(
                    `Xin lỗi, tôi gặp lỗi khi xử lý tin nhắn của bạn: ${response.error}`,
                    'ai',
                    'error'
                );
            }
            
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage(
                'Xin lỗi, tôi không thể phản hồi ngay bây giờ. Vui lòng thử lại sau.',
                'ai',
                'error'
            );
            console.error('❌ Chat error:', error);
        }
    }
    
    async handleChatRequest(data) {
        const { message, type = 'general' } = data;
        
        if (type === 'nutrition') {
            this.addMessage(message, 'user');
            this.showTypingIndicator();
            
            try {
                const response = await window.FoodNinjaAPI.askAI(message);
                
                this.hideTypingIndicator();
                
                if (response.success) {
                    this.addMessage(response.result, 'ai');
                } else {
                    this.addMessage(
                        `Không thể trả lời câu hỏi về dinh dưỡng: ${response.error}`,
                        'ai',
                        'error'
                    );
                }
                
            } catch (error) {
                this.hideTypingIndicator();
                this.addMessage(
                    'Lỗi khi xử lý câu hỏi dinh dưỡng.',
                    'ai',
                    'error'
                );
            }
        }
    }
    
    handleNutritionResult(data) {
        const { foodName, nutrition, aiAdvice } = data;
        
        if (aiAdvice) {
            this.addMessage(
                `Tôi đã phân tích món ${foodName} cho bạn. ${aiAdvice}`,
                'ai',
                'nutrition'
            );
        }
    }
    
    /* ========================================
       Message Display
       ======================================== */
    
    addMessage(content, sender, type = 'normal') {
        if (!this.chatMessages) return;
        
        const messageElement = this.createMessageElement(content, sender, type);
        this.chatMessages.appendChild(messageElement);
        
        // Add to history
        const messageData = {
            content,
            sender,
            type,
            timestamp: new Date().toISOString()
        };
        
        this.chatHistory.push(messageData);
        this.saveChatHistory();
        
        // Limit message count
        if (this.chatHistory.length > this.maxMessages) {
            this.chatHistory = this.chatHistory.slice(-this.maxMessages);
            this.removeOldMessages();
        }
        
        // Auto scroll
        if (this.autoScroll) {
            this.scrollToBottom();
        }
        
        // Animate message
        this.animateMessage(messageElement);
    }
    
    createMessageElement(content, sender, type = 'normal') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}-message ${type}-message`;
        
        const time = new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const avatar = sender === 'user' ? 
            '<i class="fas fa-user"></i>' : 
            '<i class="fas fa-robot"></i>';
        
        let messageClass = '';
        if (type === 'error') messageClass = 'text-danger';
        if (type === 'nutrition') messageClass = 'text-success';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                ${avatar}
            </div>
            <div class="message-content">
                <div class="message-text ${messageClass}">
                    ${this.formatMessage(content)}
                </div>
                <div class="message-time">
                    ${time}
                </div>
            </div>
        `;
        
        return messageDiv;
    }
    
    formatMessage(content) {
        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        content = content.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>');
        
        // Convert line breaks
        content = content.replace(/\n/g, '<br>');
        
        // Format nutrition data if present
        if (content.includes('Calories:')) {
            content = this.formatNutritionData(content);
        }
        
        return content;
    }
    
    formatNutritionData(content) {
        // Enhanced formatting for nutrition data
        content = content.replace(/(\d+\.?\d*)\s*(calories|kcal)/gi, '<strong>$1 $2</strong>');
        content = content.replace(/(\d+\.?\d*)\s*g\s*(protein|fat|carbs|fiber)/gi, '<strong>$1g $2</strong>');
        content = content.replace(/(\d+\.?\d*)\s*mg\s*(sodium|cholesterol)/gi, '<strong>$1mg $2</strong>');
        
        return content;
    }
    
    /* ========================================
       Typing Indicator
       ======================================== */
    
    showTypingIndicator() {
        if (this.typingIndicator) return;
        
        this.isTyping = true;
        this.typingIndicator = document.createElement('div');
        this.typingIndicator.className = 'chat-message ai-message typing-indicator';
        this.typingIndicator.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-animation">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        this.chatMessages.appendChild(this.typingIndicator);
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        if (this.typingIndicator) {
            this.typingIndicator.remove();
            this.typingIndicator = null;
        }
        this.isTyping = false;
    }
    
    /* ========================================
       UI Helpers
       ======================================== */
    
    handleInputChange() {
        const hasText = this.chatInput.value.trim().length > 0;
        this.sendButton.disabled = !hasText || this.isTyping;
        
        // Update button style
        if (hasText && !this.isTyping) {
            this.sendButton.classList.add('active');
        } else {
            this.sendButton.classList.remove('active');
        }
    }
    
    autoResizeTextarea() {
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 120) + 'px';
    }
    
    scrollToBottom() {
        if (this.chatMessages) {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }
    
    animateMessage(messageElement) {
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            messageElement.style.transition = 'all 0.3s ease';
            messageElement.style.opacity = '1';
            messageElement.style.transform = 'translateY(0)';
        }, 10);
    }
    
    removeOldMessages() {
        const messages = this.chatMessages.querySelectorAll('.chat-message:not(.typing-indicator)');
        if (messages.length > this.maxMessages) {
            const toRemove = messages.length - this.maxMessages;
            for (let i = 0; i < toRemove; i++) {
                messages[i].remove();
            }
        }
    }
    
    /* ========================================
       Welcome & Predefined Messages
       ======================================== */
    
    displayWelcomeMessage() {
        const welcomeMessage = `
            Xin chào! Tôi là AI trợ lý dinh dưỡng của Food Ninja. 🤖🥗
            
            Tôi có thể giúp bạn:
            • Phân tích thông tin dinh dưỡng từ hình ảnh thực phẩm
            • Tư vấn về chế độ ăn uống lành mạnh
            • Trả lời các câu hỏi về dinh dưỡng
            • Đề xuất món ăn phù hợp với mục tiêu sức khỏe
            
            Hãy chụp ảnh món ăn hoặc đặt câu hỏi cho tôi nhé! 😊
        `;
        
        this.addMessage(welcomeMessage, 'ai', 'welcome');
    }
    
    addQuickReplies(replies) {
        if (!this.chatMessages) return;
        
        const quickRepliesDiv = document.createElement('div');
        quickRepliesDiv.className = 'quick-replies';
        
        replies.forEach(reply => {
            const button = document.createElement('button');
            button.className = 'quick-reply-btn';
            button.textContent = reply;
            button.addEventListener('click', () => {
                this.chatInput.value = reply;
                this.handleSendMessage();
                quickRepliesDiv.remove();
            });
            quickRepliesDiv.appendChild(button);
        });
        
        this.chatMessages.appendChild(quickRepliesDiv);
        this.scrollToBottom();
    }
    
    /* ========================================
       Chat History Management
       ======================================== */
    
    saveChatHistory() {
        try {
            const historyToSave = this.chatHistory.slice(-50); // Keep last 50 messages
            localStorage.setItem('foodNinja_chatHistory', JSON.stringify(historyToSave));
        } catch (error) {
            console.warn('⚠️ Could not save chat history:', error);
        }
    }
    
    loadChatHistory() {
        try {
            const saved = localStorage.getItem('foodNinja_chatHistory');
            if (saved) {
                this.chatHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('⚠️ Could not load chat history:', error);
            this.chatHistory = [];
        }
    }
    
    restoreChatHistory() {
        if (this.chatHistory.length === 0) return;
        
        // Restore last few messages
        const recentMessages = this.chatHistory.slice(-10);
        recentMessages.forEach(msg => {
            if (msg.sender !== 'ai' || msg.type !== 'welcome') {
                const messageElement = this.createMessageElement(msg.content, msg.sender, msg.type);
                this.chatMessages.appendChild(messageElement);
            }
        });
        
        this.scrollToBottom();
    }
    
    clearChat() {
        if (this.chatMessages) {
            this.chatMessages.innerHTML = '';
        }
        this.chatHistory = [];
        this.saveChatHistory();
        this.displayWelcomeMessage();
    }
    
    /* ========================================
       Export Chat
       ======================================== */
    
    exportChatHistory() {
        const exportData = {
            timestamp: new Date().toISOString(),
            messages: this.chatHistory,
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `food-ninja-chat-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    /* ========================================
       Voice Integration (Future)
       ======================================== */
    
    async startVoiceInput() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.addMessage('Trình duyệt không hỗ trợ nhận dạng giọng nói.', 'ai', 'error');
            return;
        }
        
        // Voice recognition implementation
        console.log('🎤 Voice input feature - coming soon!');
    }
    
    /* ========================================
       Cleanup
       ======================================== */
    
    cleanup() {
        // Remove event listeners
        if (this.sendButton) {
            this.sendButton.removeEventListener('click', this.handleSendMessage);
        }
        
        if (this.chatInput) {
            this.chatInput.removeEventListener('keypress', this.handleSendMessage);
            this.chatInput.removeEventListener('input', this.handleInputChange);
        }
        
        // Clear typing indicator
        this.hideTypingIndicator();
        
        console.log('🧹 Chat manager cleaned up');
    }
}

/* ========================================
   Export Chat Manager
   ======================================== */

const chatManager = new ChatManager();

// Global functions for easy access
window.ChatManager = {
    instance: chatManager,
    initialize: (containerId) => chatManager.initializeChat(containerId),
    addMessage: (content, sender, type) => chatManager.addMessage(content, sender, type),
    clearChat: () => chatManager.clearChat(),
    exportHistory: () => chatManager.exportChatHistory(),
    sendMessage: (message) => chatManager.handleChatRequest({ message, type: 'general' }),
    askNutrition: (question) => chatManager.handleChatRequest({ message: question, type: 'nutrition' })
};

console.log('💬 Chat Manager module loaded successfully!');
