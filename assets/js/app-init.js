/* ========================================
   Food Ninja - App Initialization
   ======================================== */

// EMERGENCY: Show app immediately
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Emergency: Force show app');
    
    // Force show app container
    const app = document.getElementById('app');
    if (app) {
        app.style.display = 'block';
        app.style.visibility = 'visible';
        app.style.opacity = '1';
        console.log('✅ App container force shown');
    }
    
    // Force hide loading screen
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
        console.log('✅ Loading screen force hidden');
    }
    
    console.log('🚀 Food Ninja App starting...');
    
    // Auto-hide loading screen after 3 seconds (fallback)
    setTimeout(function() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(function() {
                loadingScreen.style.display = 'none';
            }, 500);
        }
        console.log('✅ Loading screen auto-hidden');
    }, 3000);
    
    // Initialize PWA features
    if (window.PWAInstaller) {
        console.log('📱 PWA features enabled');
    }
    
    // Auto-generate icons in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🔧 Development mode detected');
    }
    
    // Initialize app modules
    if (window.FoodNinjaApp) {
        try {
            window.app = new FoodNinjaApp();
            console.log('✅ FoodNinjaApp initialized');
        } catch (error) {
            console.error('❌ Failed to initialize FoodNinjaApp:', error);
        }
    }
    
    // Initialize API
    if (window.FoodNinjaAPI) {
        try {
            window.api = new FoodNinjaAPI();
            console.log('✅ FoodNinjaAPI initialized');
        } catch (error) {
            console.error('❌ Failed to initialize FoodNinjaAPI:', error);
        }
    }
});

// Global helper functions
window.selectFromGallery = function() {
    console.log('📁 Selecting from gallery...');
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.click();
    }
};

window.analyzeImage = function() {
    console.log('🔍 Analyzing image...');
    if (window.app && window.app.analyzeImage) {
        window.app.analyzeImage();
    } else {
        alert('Chức năng phân tích chưa sẵn sàng. Vui lòng thử lại.');
    }
};

window.handleFileSelect = function(event) {
    console.log('📁 File selected');
    const file = event.target.files[0];
    if (file) {
        // Set selectedImage in app if available
        if (window.app) {
            window.app.selectedImage = file;
            console.log('✅ Image set in app.selectedImage:', file.name);
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById('previewImg');
            const preview = document.getElementById('imagePreview');
            const cameraContent = document.querySelector('.camera-content');
            const analyzeBtn = document.getElementById('analyzeBtn');
            
            if (img && preview) {
                img.src = e.target.result;
                preview.style.display = 'block';
                if (cameraContent) cameraContent.style.display = 'none';
                if (analyzeBtn) analyzeBtn.disabled = false;
            }
        };
        reader.readAsDataURL(file);
    }
};

// Display Analysis Results Function
function displayAnalysisResults(result) {
    console.log('📋 Displaying results:', result);
    
    const resultsSection = document.getElementById('resultsSection');
    const foodResult = document.getElementById('foodResult');
    
    if (!resultsSection || !foodResult) {
        console.error('❌ Results sections not found');
        alert(`Phân tích thành công!\n\nThực phẩm: ${result.foodName}\nĐộ tin cậy: ${(result.confidence * 100).toFixed(1)}%\n\n${result.aiAdvice || 'Không có lời khuyên bổ sung.'}`);
        return;
    }
    
    // Display food recognition result
    foodResult.innerHTML = `
        <div class="row">
            <div class="col-md-8">
                <h4 class="text-success mb-2">
                    <i class="fas fa-check-circle me-2"></i>Thực phẩm: 
                    <span class="text-primary">${result.foodName || 'Không xác định'}</span>
                </h4>
                <p class="mb-2">Độ tin cậy: <strong class="text-success">${((result.confidence || 0) * 100).toFixed(1)}%</strong></p>
                ${result.lowConfidence ? '<div class="alert alert-warning"><i class="fas fa-exclamation-triangle me-2"></i>Độ tin cậy thấp - kết quả có thể không chính xác</div>' : ''}
            </div>
            <div class="col-md-4">
                ${result.nutrition ? buildNutritionDisplay(result.nutrition) : '<div class="text-muted">Không có thông tin dinh dưỡng</div>'}
            </div>
        </div>
        ${result.aiAdvice ? `
            <div class="mt-3">
                <h6><i class="fas fa-robot me-2"></i>Lời khuyên từ AI:</h6>
                <div class="alert alert-info">${result.aiAdvice}</div>
            </div>
        ` : ''}
        ${result.alternatives && result.alternatives.length > 0 ? `
            <div class="mt-3">
                <h6>Các lựa chọn khác:</h6>
                <div class="d-flex flex-wrap gap-2">
                    ${result.alternatives.map(alt => `<span class="badge bg-secondary">${alt}</span>`).join('')}
                </div>
            </div>
        ` : ''}
    `;
    
    // Show results section
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Build nutrition display
function buildNutritionDisplay(nutrition) {
    if (!nutrition || !nutrition.items || nutrition.items.length === 0) {
        return '<div class="text-muted">Không có thông tin dinh dưỡng</div>';
    }
    
    const item = nutrition.items[0];
    return `
        <div class="nutrition-grid">
            <div class="nutrition-item text-center">
                <strong class="text-primary">${item.calories || 0}</strong>
                <div class="text-muted small">Calories</div>
            </div>
            <div class="nutrition-item text-center">
                <strong class="text-success">${item.protein_g || 0}g</strong>
                <div class="text-muted small">Protein</div>
            </div>
            <div class="nutrition-item text-center">
                <strong class="text-warning">${item.carbohydrates_total_g || 0}g</strong>
                <div class="text-muted small">Carbs</div>
            </div>
            <div class="nutrition-item text-center">
                <strong class="text-danger">${item.fat_total_g || 0}g</strong>
                <div class="text-muted small">Fat</div>
            </div>
        </div>
    `;
}

// Debug function to check app state
window.debugApp = function() {
    console.log('🔧 App Debug Info:');
    console.log('- App instance:', !!window.app);
    console.log('- FoodNinjaApp class:', !!window.FoodNinjaApp);
    console.log('- App type:', typeof window.app);
    console.log('- App constructor:', window.app ? window.app.constructor.name : 'N/A');
    
    if (window.app) {
        console.log('- App prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.app)));
        console.log('- App direct properties:', Object.getOwnPropertyNames(window.app));
        console.log('- Has analyzeImage:', 'analyzeImage' in window.app);
        console.log('- analyzeImage type:', typeof window.app.analyzeImage);
        console.log('- Selected image:', !!window.app.selectedImage);
        console.log('- Is analyzing:', !!window.app.isAnalyzing);
        console.log('- Current view:', window.app.currentView);
    }
    
    // Check script loading
    console.log('- FoodNinjaAPI loaded:', !!window.FoodNinjaAPI);
    console.log('- FoodNinjaApp loaded:', !!window.FoodNinjaApp);
    console.log('- Utils loaded:', !!window.Utils);
    console.log('- Chat loaded:', !!window.Chat);
};

// Make functions global
window.displayAnalysisResults = displayAnalysisResults;
window.buildNutritionDisplay = buildNutritionDisplay;
