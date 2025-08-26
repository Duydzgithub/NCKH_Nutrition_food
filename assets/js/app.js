/* ========================================
   Food Ninja - Main Application
   ======================================== */

class FoodNinjaApp {
    constructor() {
        this.currentView = 'landing';
        this.isAnalyzing = false;
        this.analysisResults = null;
        this.selectedImage = null;
        
        // UI Elements
        this.elements = {};
        
        // Managers
        this.themeManager = window.Utils?.ThemeManager ? new window.Utils.ThemeManager() : null;
        this.loadingManager = window.Utils?.LoadingManager ? new window.Utils.LoadingManager() : null;
        this.notificationManager = window.Utils?.NotificationManager ? new window.Utils.NotificationManager() : null;
        
        this.init();
    }
    
    /* ========================================
       Application Initialization
       ======================================== */
    
    async init() {
        try {
            console.log('🚀 Initializing Food Ninja App...');
            
            // Wait for DOM
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeApp());
            } else {
                await this.initializeApp();
            }
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.showError('Lỗi khởi tạo ứng dụng. Vui lòng tải lại trang.');
        }
    }
    
    async initializeApp() {
        // Initialize managers
        await this.initializeManagers();
        
        // Setup UI elements
        this.setupElements();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize components
        await this.initializeComponents();
        
        // Check API connection
        await this.checkAPIConnection();
        
        // Setup navigation
        this.setupNavigation();
        
        // Initialize view
        this.initializeCurrentView();
        
        console.log('✅ Food Ninja App initialized successfully');
        
        // Show success notification
        if (this.notificationManager) {
            this.notificationManager.show('Ứng dụng đã sẵn sàng!', 'success');
        }
    }
    
    async initializeManagers() {
        // Initialize theme
        if (this.themeManager) {
            this.themeManager.init();
        }
        
        // Initialize loading manager
        if (this.loadingManager) {
            this.loadingManager.init();
        }
        
        // Initialize notification manager
        if (this.notificationManager) {
            this.notificationManager.init();
        }
    }
    
    /* ========================================
       UI Elements Setup
       ======================================== */
    
    setupElements() {
        // Navigation elements
        this.elements.navButtons = document.querySelectorAll('[data-nav]');
        this.elements.views = document.querySelectorAll('.view');
        
        // Camera elements
        this.elements.cameraBtn = document.getElementById('camera-btn');
        this.elements.fileInput = document.getElementById('file-input');
        this.elements.uploadBtn = document.getElementById('upload-btn');
        this.elements.videoElement = document.getElementById('camera-video');
        this.elements.captureBtn = document.getElementById('capture-btn');
        this.elements.switchCameraBtn = document.getElementById('switch-camera-btn');
        
        // Analysis elements
        this.elements.imagePreview = document.getElementById('image-preview');
        this.elements.analyzeBtn = document.getElementById('analyze-btn');
        this.elements.resultsContainer = document.getElementById('results-container');
        this.elements.nutritionInfo = document.getElementById('nutrition-info');
        this.elements.aiAdvice = document.getElementById('ai-advice');
        
        // Chat elements
        this.elements.chatContainer = document.getElementById('chat-container');
        this.elements.chatToggle = document.getElementById('chat-toggle');
        
        // Theme elements
        this.elements.themeToggle = document.getElementById('theme-toggle');
        
        // Loading elements
        this.elements.loadingOverlay = document.getElementById('loading-overlay');
        
        console.log('🎛️ UI elements setup complete');
    }
    
    /* ========================================
       Event Listeners
       ======================================== */
    
    setupEventListeners() {
        // Navigation
        this.elements.navButtons?.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.nav;
                this.navigateTo(view);
            });
        });
        
        // Camera controls
        this.elements.cameraBtn?.addEventListener('click', () => this.toggleCamera());
        this.elements.captureBtn?.addEventListener('click', () => this.captureImage());
        this.elements.switchCameraBtn?.addEventListener('click', () => this.switchCamera());
        
        // File upload
        this.elements.fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));
        this.elements.uploadBtn?.addEventListener('click', () => this.elements.fileInput?.click());
        
        // Analysis
        this.elements.analyzeBtn?.addEventListener('click', () => this.analyzeImage());
        
        // Chat
        this.elements.chatToggle?.addEventListener('click', () => this.toggleChat());
        
        // Theme
        this.elements.themeToggle?.addEventListener('click', () => this.toggleTheme());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Window events
        window.addEventListener('beforeunload', () => this.cleanup());
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Custom events
        window.addEventListener('nutritionAnalysisComplete', (e) => this.handleAnalysisComplete(e.detail));
        window.addEventListener('cameraError', (e) => this.handleCameraError(e.detail));
        
        console.log('📡 Event listeners setup complete');
    }
    
    /* ========================================
       Component Initialization
       ======================================== */
    
    async initializeComponents() {
        // Initialize camera manager
        if (window.CameraManager) {
            console.log('📷 Camera manager available');
        }
        
        // Initialize chat
        if (window.ChatManager && this.elements.chatContainer) {
            const chatInitialized = window.ChatManager.initialize('chat-container');
            if (chatInitialized) {
                console.log('💬 Chat initialized');
            }
        }
        
        // Setup drag and drop
        this.setupDragAndDrop();
        
        // Setup file validation
        this.setupFileValidation();
    }
    
    /* ========================================
       Navigation
       ======================================== */
    
    navigateTo(view) {
        if (this.currentView === view) return;
        
        // Hide current view
        this.elements.views?.forEach(v => {
            v.classList.remove('active');
        });
        
        // Show target view - Fix mapping for view names
        let targetViewId;
        switch(view) {
            case 'camera':
            case 'home':
                targetViewId = 'homeView';
                break;
            case 'chat':
                targetViewId = 'chatView';
                break;
            case 'history':
                targetViewId = 'historyView';
                break;
            case 'settings':
                targetViewId = 'settingsView';
                break;
            default:
                targetViewId = view + 'View';
        }
        
        const targetView = document.getElementById(targetViewId);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = view;
            
            // Update navigation
            this.updateNavigation();
            
            // View-specific initialization
            this.initializeView(view);
            
            console.log(`✅ Navigated to ${view} (${targetViewId})`);
        } else {
            console.error(`❌ Target view not found: ${targetViewId}`);
        }
    }
    
    updateNavigation() {
        this.elements.navButtons?.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.nav === this.currentView);
        });
    }
    
    initializeView(view) {
        switch (view) {
            case 'camera':
            case 'home':
                this.initializeCameraView();
                break;
            case 'chat':
                this.initializeChatView();
                break;
            case 'history':
                this.initializeHistoryView();
                break;
            case 'settings':
                this.initializeSettingsView();
                break;
            case 'results':
                this.initializeResultsView();
                break;
        }
    }
    
    initializeCurrentView() {
        const hash = window.location.hash.slice(1);
        const view = hash || 'home'; // Default to home instead of camera
        this.navigateTo(view);
        console.log(`🏠 Initializing view: ${view}`);
    }
    
    setupNavigation() {
        // Handle hash changes
        window.addEventListener('hashchange', () => {
            this.initializeCurrentView();
        });
    }
    
    /* ========================================
       Camera Functions
       ======================================== */
    
    async initializeCameraView() {
        if (!this.elements.videoElement) return;
        
        try {
            if (window.CameraManager) {
                const result = await window.CameraManager.startCamera(this.elements.videoElement);
                if (result.success) {
                    this.showCameraControls(true);
                } else {
                    this.showCameraError(result.error);
                }
            }
        } catch (error) {
            this.showCameraError('Không thể khởi động camera');
        }
    }
    
    initializeChatView() {
        console.log('📱 Initializing chat view');
        // Initialize chat if needed
    }
    
    initializeHistoryView() {
        console.log('📋 Initializing history view');
        // Load history if needed
    }
    
    initializeSettingsView() {
        console.log('⚙️ Initializing settings view');
        // Load settings if needed
    }
    
    initializeResultsView() {
        console.log('📊 Initializing results view');
        // Load results if needed
    }
    
    async toggleCamera() {
        if (!window.CameraManager) return;
        
        try {
            if (window.CameraManager.instance.stream) {
                await window.CameraManager.stopCamera();
                this.showCameraControls(false);
            } else {
                await this.initializeCameraView();
            }
        } catch (error) {
            this.showError('Lỗi điều khiển camera');
        }
    }
    
    async captureImage() {
        if (!window.CameraManager) return;
        
        try {
            this.showLoading('Đang chụp ảnh...');
            
            const result = await window.CameraManager.captureImage(0.92);
            
            this.hideLoading();
            
            if (result.success) {
                this.selectedImage = result.file;
                this.displayImagePreview(result.dataURL);
                this.showAnalysisControls(true);
                
                if (this.notificationManager) {
                    this.notificationManager.show('Ảnh đã được chụp thành công!', 'success');
                }
            } else {
                this.showError(`Lỗi chụp ảnh: ${result.error}`);
            }
            
        } catch (error) {
            this.hideLoading();
            this.showError('Không thể chụp ảnh');
        }
    }
    
    async switchCamera() {
        if (!window.CameraManager) return;
        
        try {
            await window.CameraManager.switchCamera();
        } catch (error) {
            this.showError('Không thể chuyển đổi camera');
        }
    }
    
    /* ========================================
       File Handling
       ======================================== */
    
    async handleFileSelect(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        
        const file = files[0];
        await this.processSelectedFile(file);
    }
    
    async processSelectedFile(file) {
        try {
            // Validate file
            if (window.CameraManager) {
                const validation = window.CameraManager.validateFile(file);
                if (!validation.valid) {
                    this.showError(validation.errors.join(', '));
                    return;
                }
            }
            
            this.showLoading('Đang xử lý ảnh...');
            
            // Read file
            let result;
            if (window.CameraManager) {
                result = await window.CameraManager.readFileAsDataURL(file);
            } else {
                result = await this.readFileAsDataURL(file);
            }
            
            this.hideLoading();
            
            if (result.success) {
                this.selectedImage = file;
                this.displayImagePreview(result.dataURL);
                this.showAnalysisControls(true);
                
                if (this.notificationManager) {
                    this.notificationManager.show('Ảnh đã được tải lên thành công!', 'success');
                }
            } else {
                this.showError(`Lỗi đọc file: ${result.error}`);
            }
            
        } catch (error) {
            this.hideLoading();
            this.showError('Không thể xử lý file đã chọn');
        }
    }
    
    setupDragAndDrop() {
        const dropZone = document.getElementById('drop-zone') || document.body;
        
        if (window.CameraManager) {
            window.CameraManager.setupDropZone(
                dropZone,
                (files) => this.handleDroppedFiles(files),
                (e) => this.handleDragOver(e)
            );
        }
    }
    
    async handleDroppedFiles(files) {
        if (files.length > 0) {
            await this.processSelectedFile(files[0]);
        }
    }
    
    handleDragOver(e) {
        // Visual feedback for drag over
        console.log('📁 File dragged over');
    }
    
    /* ========================================
       Image Analysis
       ======================================== */
    
    async analyzeImage() {
        if (!this.selectedImage || this.isAnalyzing) return;
        
        try {
            this.isAnalyzing = true;
            this.showLoading('Đang phân tích thực phẩm...');
            this.showAnalysisControls(false);
            
            // Call API
            const result = await window.FoodNinjaAPI.analyzeFood(this.selectedImage);
            
            this.hideLoading();
            this.isAnalyzing = false;
            
            if (result.success) {
                this.analysisResults = result;
                this.displayAnalysisResults(result);
                this.navigateTo('results');
                
                // Dispatch event
                window.dispatchEvent(new CustomEvent('nutritionAnalysisComplete', {
                    detail: result
                }));
                
            } else {
                this.showError(`Lỗi phân tích: ${result.error}`);
                this.showAnalysisControls(true);
            }
            
        } catch (error) {
            this.hideLoading();
            this.isAnalyzing = false;
            this.showAnalysisControls(true);
            this.showError('Không thể phân tích ảnh');
        }
    }
    
    /* ========================================
       Results Display
       ======================================== */
    
    displayImagePreview(dataURL) {
        if (this.elements.imagePreview) {
            this.elements.imagePreview.innerHTML = `
                <img src="${dataURL}" alt="Preview" class="img-fluid rounded">
                <div class="image-overlay">
                    <button class="btn btn-sm btn-danger" onclick="app.clearImage()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }
    }
    
    displayAnalysisResults(results) {
        if (!this.elements.resultsContainer) return;
        
        const { foodName, confidence, nutrition, aiAdvice, lowConfidence } = results;
        
        // Clear previous results
        this.elements.resultsContainer.innerHTML = '';
        
        // Food identification
        const foodCard = this.createFoodCard(foodName, confidence, lowConfidence);
        this.elements.resultsContainer.appendChild(foodCard);
        
        // Nutrition information
        if (nutrition) {
            const nutritionCard = this.createNutritionCard(nutrition);
            this.elements.resultsContainer.appendChild(nutritionCard);
        }
        
        // AI advice
        if (aiAdvice) {
            const adviceCard = this.createAdviceCard(aiAdvice);
            this.elements.resultsContainer.appendChild(adviceCard);
        }
        
        // Action buttons
        const actionsCard = this.createActionsCard();
        this.elements.resultsContainer.appendChild(actionsCard);
    }
    
    createFoodCard(foodName, confidence, lowConfidence) {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        
        const confidenceClass = confidence >= 0.7 ? 'success' : confidence >= 0.5 ? 'warning' : 'danger';
        const confidenceText = lowConfidence ? 'Độ tin cậy thấp' : `${Math.round(confidence * 100)}% tin cậy`;
        
        card.innerHTML = `
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">
                    <i class="fas fa-utensils me-2"></i>
                    Thực phẩm đã nhận dạng
                </h5>
            </div>
            <div class="card-body">
                <h4 class="food-name">${foodName}</h4>
                <div class="confidence-badge">
                    <span class="badge bg-${confidenceClass}">${confidenceText}</span>
                </div>
                ${lowConfidence ? '<p class="text-warning mt-2"><i class="fas fa-exclamation-triangle"></i> Có thể không chính xác hoàn toàn</p>' : ''}
            </div>
        `;
        
        return card;
    }
    
    createNutritionCard(nutrition) {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        
        card.innerHTML = `
            <div class="card-header bg-success text-white">
                <h5 class="mb-0">
                    <i class="fas fa-chart-pie me-2"></i>
                    Thông tin dinh dưỡng
                </h5>
            </div>
            <div class="card-body">
                <div class="nutrition-grid">
                    ${this.formatNutritionData(nutrition)}
                </div>
            </div>
        `;
        
        return card;
    }
    
    createAdviceCard(advice) {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        
        card.innerHTML = `
            <div class="card-header bg-info text-white">
                <h5 class="mb-0">
                    <i class="fas fa-lightbulb me-2"></i>
                    Lời khuyên từ AI
                </h5>
            </div>
            <div class="card-body">
                <p class="ai-advice-text">${advice}</p>
            </div>
        `;
        
        return card;
    }
    
    createActionsCard() {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        
        card.innerHTML = `
            <div class="card-header">
                <h5 class="mb-0">
                    <i class="fas fa-cogs me-2"></i>
                    Hành động
                </h5>
            </div>
            <div class="card-body">
                <div class="d-grid gap-2 d-md-flex justify-content-md-start">
                    <button class="btn btn-primary me-md-2" onclick="app.analyzeAnother()">
                        <i class="fas fa-camera me-2"></i>
                        Phân tích ảnh khác
                    </button>
                    <button class="btn btn-success me-md-2" onclick="app.askNutritionQuestion()">
                        <i class="fas fa-question-circle me-2"></i>
                        Hỏi về dinh dưỡng
                    </button>
                    <button class="btn btn-info me-md-2" onclick="app.shareResults()">
                        <i class="fas fa-share me-2"></i>
                        Chia sẻ
                    </button>
                    <button class="btn btn-secondary" onclick="app.saveResults()">
                        <i class="fas fa-save me-2"></i>
                        Lưu kết quả
                    </button>
                </div>
            </div>
        `;
        
        return card;
    }
    
    formatNutritionData(nutrition) {
        const items = [];
        
        for (const [key, value] of Object.entries(nutrition)) {
            if (value && value !== 'N/A') {
                items.push(`
                    <div class="nutrition-item">
                        <span class="nutrition-label">${this.translateNutritionKey(key)}:</span>
                        <span class="nutrition-value">${value}</span>
                    </div>
                `);
            }
        }
        
        return items.join('');
    }
    
    translateNutritionKey(key) {
        const translations = {
            'calories': 'Calo',
            'protein': 'Protein',
            'carbohydrates': 'Carbohydrate',
            'fat': 'Chất béo',
            'fiber': 'Chất xơ',
            'sugar': 'Đường',
            'sodium': 'Natri',
            'cholesterol': 'Cholesterol'
        };
        
        return translations[key.toLowerCase()] || key;
    }
    
    /* ========================================
       UI Controls
       ======================================== */
    
    showCameraControls(show) {
        this.elements.captureBtn?.style.setProperty('display', show ? 'block' : 'none');
        this.elements.switchCameraBtn?.style.setProperty('display', show ? 'block' : 'none');
    }
    
    showAnalysisControls(show) {
        this.elements.analyzeBtn?.style.setProperty('display', show ? 'block' : 'none');
    }
    
    showLoading(message = 'Đang xử lý...') {
        if (this.loadingManager) {
            this.loadingManager.show(message);
        }
    }
    
    hideLoading() {
        if (this.loadingManager) {
            this.loadingManager.hide();
        }
    }
    
    showError(message) {
        if (this.notificationManager) {
            this.notificationManager.show(message, 'error');
        } else {
            alert(message);
        }
    }
    
    showCameraError(error) {
        this.showError(`Camera error: ${error}`);
        this.showCameraControls(false);
    }
    
    /* ========================================
       Action Handlers
       ======================================== */
    
    clearImage() {
        this.selectedImage = null;
        this.analysisResults = null;
        
        if (this.elements.imagePreview) {
            this.elements.imagePreview.innerHTML = '';
        }
        
        if (this.elements.fileInput) {
            this.elements.fileInput.value = '';
        }
        
        this.showAnalysisControls(false);
    }
    
    analyzeAnother() {
        this.clearImage();
        this.navigateTo('camera');
    }
    
    askNutritionQuestion() {
        this.navigateTo('chat');
        
        if (this.analysisResults && window.ChatManager) {
            const question = `Tôi vừa ăn ${this.analysisResults.foodName}. Hãy cho tôi lời khuyên về dinh dưỡng.`;
            window.ChatManager.askNutrition(question);
        }
    }
    
    async shareResults() {
        if (!this.analysisResults) return;
        
        const shareData = {
            title: 'Food Ninja - Kết quả phân tích dinh dưỡng',
            text: `Tôi vừa phân tích ${this.analysisResults.foodName} với Food Ninja!`,
            url: window.location.href
        };
        
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback to copy to clipboard
                await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
                this.showError('Đã copy link chia sẻ!');
            }
        } catch (error) {
            console.error('Share failed:', error);
        }
    }
    
    saveResults() {
        if (!this.analysisResults) return;
        
        const data = {
            timestamp: new Date().toISOString(),
            ...this.analysisResults
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `food-analysis-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    /* ========================================
       Utility Functions
       ======================================== */
    
    toggleChat() {
        this.navigateTo('chat');
    }
    
    toggleTheme() {
        if (this.themeManager) {
            this.themeManager.toggle();
        }
    }
    
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    this.navigateTo('camera');
                    break;
                case '2':
                    e.preventDefault();
                    this.navigateTo('chat');
                    break;
                case '3':
                    e.preventDefault();
                    this.navigateTo('results');
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (this.selectedImage && !this.isAnalyzing) {
                        this.analyzeImage();
                    }
                    break;
            }
        }
        
        // Space for capture
        if (e.code === 'Space' && this.currentView === 'camera') {
            e.preventDefault();
            this.captureImage();
        }
    }
    
    async checkAPIConnection() {
        try {
            const result = await window.FoodNinjaAPI.healthCheck();
            if (result.success) {
                console.log('✅ API connection successful');
                return true;
            } else {
                console.warn('⚠️ API connection failed:', result.error);
                return false;
            }
        } catch (error) {
            console.error('❌ API connection error:', error);
            return false;
        }
    }
    
    handleOnline() {
        if (this.notificationManager) {
            this.notificationManager.show('Đã kết nối internet', 'success');
        }
    }
    
    handleOffline() {
        if (this.notificationManager) {
            this.notificationManager.show('Mất kết nối internet', 'warning');
        }
    }
    
    handleAnalysisComplete(data) {
        console.log('✅ Analysis completed:', data);
    }
    
    handleCameraError(error) {
        console.error('❌ Camera error:', error);
        this.showCameraError(error);
    }
    
    async readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({ success: true, dataURL: e.target.result });
            reader.onerror = () => reject({ success: false, error: 'File read error' });
            reader.readAsDataURL(file);
        });
    }
    
    setupFileValidation() {
        // Additional file validation setup
        console.log('📝 File validation setup complete');
    }
    
    initializeChatView() {
        // Chat view specific initialization
        console.log('💬 Chat view initialized');
    }
    
    initializeResultsView() {
        // Results view specific initialization
        console.log('📊 Results view initialized');
    }
    
    /* ========================================
       Cleanup
       ======================================== */
    
    cleanup() {
        // Stop camera
        if (window.CameraManager) {
            window.CameraManager.stopCamera();
        }
        
        // Cleanup managers
        if (this.themeManager) {
            this.themeManager.cleanup();
        }
        
        if (this.loadingManager) {
            this.loadingManager.cleanup();
        }
        
        if (this.notificationManager) {
            this.notificationManager.cleanup();
        }
        
        console.log('🧹 App cleanup complete');
    }
}

/* ========================================
   Initialize Application
   ======================================== */

// Export class for manual initialization
window.FoodNinjaApp = FoodNinjaApp;

// Create and export global app instance 
try {
    window.app = new FoodNinjaApp();
    console.log('✅ App instance created successfully');
    console.log('🔧 App prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.app)));
    console.log('🔧 App has analyzeImage:', typeof window.app.analyzeImage);
} catch (error) {
    console.error('❌ Failed to create app instance:', error);
}

console.log('🍃 Food Ninja App module loaded successfully!');
