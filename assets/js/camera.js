/* ========================================
   Food Ninja - Camera & File Handling
   ======================================== */

class CameraManager {
    constructor() {
        this.stream = null;
        this.video = null;
        this.canvas = null;
        this.context = null;
        this.facingMode = 'environment'; // 'user' for front camera, 'environment' for back camera
        this.isCapturing = false;
        this.constraints = {
            video: {
                facingMode: this.facingMode,
                width: { ideal: 1920, max: 1920 },
                height: { ideal: 1080, max: 1080 }
            },
            audio: false
        };
        
        this.supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        
        this.init();
    }
    
    init() {
        this.checkCameraSupport();
        this.setupElements();
        this.bindEvents();
    }
    
    /* ========================================
       Camera Support Detection
       ======================================== */
    
    checkCameraSupport() {
        this.hasCamera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        this.hasFileAPI = !!(window.File && window.FileReader && window.FileList && window.Blob);
        
        console.log('📷 Camera support:', this.hasCamera);
        console.log('📁 File API support:', this.hasFileAPI);
        
        if (!this.hasCamera) {
            console.warn('⚠️ Camera not supported in this browser');
        }
        
        if (!this.hasFileAPI) {
            console.warn('⚠️ File API not supported in this browser');
        }
    }
    
    /* ========================================
       Element Setup
       ======================================== */
    
    setupElements() {
        // Create canvas for image capture
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d');
    }
    
    bindEvents() {
        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.video && this.stream) {
                this.adjustVideoSize();
            }
        });
        
        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.stream) {
                this.pauseCamera();
            }
        });
    }
    
    /* ========================================
       Camera Controls
       ======================================== */
    
    async startCamera(videoElement, options = {}) {
        try {
            if (!this.hasCamera) {
                throw new Error('Camera not supported in this browser');
            }
            
            this.video = videoElement;
            
            // Merge options with default constraints
            const constraints = {
                ...this.constraints,
                video: {
                    ...this.constraints.video,
                    ...options
                }
            };
            
            console.log('📷 Starting camera with constraints:', constraints);
            
            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Set video source
            this.video.srcObject = this.stream;
            this.video.playsInline = true; // Important for iOS
            
            // Wait for video to load
            await new Promise((resolve, reject) => {
                this.video.onloadedmetadata = () => {
                    this.video.play()
                        .then(resolve)
                        .catch(reject);
                };
                this.video.onerror = reject;
            });
            
            this.adjustVideoSize();
            
            console.log('✅ Camera started successfully');
            return {
                success: true,
                stream: this.stream,
                capabilities: this.getCameraCapabilities()
            };
            
        } catch (error) {
            console.error('❌ Camera start error:', error);
            
            let errorMessage = 'Không thể truy cập camera';
            
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Vui lòng cho phép truy cập camera để chụp ảnh';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'Không tìm thấy camera trên thiết bị';
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Camera đang được sử dụng bởi ứng dụng khác';
            } else if (error.name === 'OverconstrainedError') {
                errorMessage = 'Camera không hỗ trợ cài đặt yêu cầu';
            }
            
            return {
                success: false,
                error: errorMessage,
                originalError: error
            };
        }
    }
    
    async stopCamera() {
        try {
            if (this.stream) {
                this.stream.getTracks().forEach(track => {
                    track.stop();
                });
                this.stream = null;
            }
            
            if (this.video) {
                this.video.srcObject = null;
            }
            
            console.log('📷 Camera stopped');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Error stopping camera:', error);
            return { success: false, error: error.message };
        }
    }
    
    pauseCamera() {
        if (this.video && !this.video.paused) {
            this.video.pause();
        }
    }
    
    resumeCamera() {
        if (this.video && this.video.paused) {
            this.video.play();
        }
    }
    
    /* ========================================
       Camera Switching
       ======================================== */
    
    async switchCamera() {
        try {
            // Toggle between front and back camera
            this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
            
            if (this.stream && this.video) {
                await this.stopCamera();
                return await this.startCamera(this.video, {
                    facingMode: this.facingMode
                });
            }
            
            return { success: true, facingMode: this.facingMode };
            
        } catch (error) {
            console.error('❌ Error switching camera:', error);
            return { success: false, error: error.message };
        }
    }
    
    /* ========================================
       Image Capture
       ======================================== */
    
    async captureImage(quality = 0.92) {
        try {
            if (!this.video || !this.stream) {
                throw new Error('Camera not active');
            }
            
            if (this.isCapturing) {
                throw new Error('Capture already in progress');
            }
            
            this.isCapturing = true;
            
            // Set canvas size to match video
            this.canvas.width = this.video.videoWidth || 1920;
            this.canvas.height = this.video.videoHeight || 1080;
            
            // Draw video frame to canvas
            this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            
            // Convert to blob
            const blob = await new Promise((resolve, reject) => {
                this.canvas.toBlob(resolve, 'image/jpeg', quality);
            });
            
            if (!blob) {
                throw new Error('Failed to capture image');
            }
            
            // Create file object
            const file = new File([blob], `photo_${Date.now()}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now()
            });
            
            console.log('📸 Image captured:', {
                size: blob.size,
                type: blob.type,
                dimensions: `${this.canvas.width}x${this.canvas.height}`
            });
            
            this.isCapturing = false;
            
            return {
                success: true,
                file: file,
                blob: blob,
                dataURL: this.canvas.toDataURL('image/jpeg', quality),
                metadata: {
                    width: this.canvas.width,
                    height: this.canvas.height,
                    size: blob.size,
                    type: 'image/jpeg',
                    timestamp: new Date().toISOString()
                }
            };
            
        } catch (error) {
            this.isCapturing = false;
            console.error('❌ Capture error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /* ========================================
       File Handling
       ======================================== */
    
    validateFile(file) {
        const errors = [];
        
        // Check if file exists
        if (!file) {
            errors.push('Không có file được chọn');
            return { valid: false, errors };
        }
        
        // Check file type
        if (!this.supportedFormats.includes(file.type)) {
            errors.push(`Định dạng file không được hỗ trợ. Chỉ chấp nhận: ${this.supportedFormats.join(', ')}`);
        }
        
        // Check file size
        if (file.size > this.maxFileSize) {
            const maxSizeMB = this.maxFileSize / (1024 * 1024);
            errors.push(`File quá lớn. Kích thước tối đa: ${maxSizeMB}MB`);
        }
        
        // Check if file is empty
        if (file.size === 0) {
            errors.push('File trống');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    async readFileAsDataURL(file) {
        try {
            const validation = this.validateFile(file);
            if (!validation.valid) {
                throw new Error(validation.errors.join(', '));
            }
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    resolve({
                        success: true,
                        dataURL: e.target.result,
                        file: file,
                        metadata: {
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            lastModified: new Date(file.lastModified).toISOString()
                        }
                    });
                };
                
                reader.onerror = () => {
                    reject(new Error('Lỗi đọc file'));
                };
                
                reader.readAsDataURL(file);
            });
            
        } catch (error) {
            console.error('❌ File read error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async readFileAsArrayBuffer(file) {
        try {
            const validation = this.validateFile(file);
            if (!validation.valid) {
                throw new Error(validation.errors.join(', '));
            }
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    resolve({
                        success: true,
                        arrayBuffer: e.target.result,
                        file: file
                    });
                };
                
                reader.onerror = () => {
                    reject(new Error('Lỗi đọc file'));
                };
                
                reader.readAsArrayBuffer(file);
            });
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /* ========================================
       Image Processing
       ======================================== */
    
    async resizeImage(file, maxWidth = 1920, maxHeight = 1080, quality = 0.92) {
        try {
            const dataURL = await this.readFileAsDataURL(file);
            if (!dataURL.success) {
                throw new Error(dataURL.error);
            }
            
            return new Promise((resolve, reject) => {
                const img = new Image();
                
                img.onload = () => {
                    // Calculate new dimensions
                    let { width, height } = this.calculateDimensions(
                        img.width, 
                        img.height, 
                        maxWidth, 
                        maxHeight
                    );
                    
                    // Set canvas size
                    this.canvas.width = width;
                    this.canvas.height = height;
                    
                    // Draw resized image
                    this.context.clearRect(0, 0, width, height);
                    this.context.drawImage(img, 0, 0, width, height);
                    
                    // Convert to blob
                    this.canvas.toBlob((blob) => {
                        if (blob) {
                            const resizedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            });
                            
                            resolve({
                                success: true,
                                file: resizedFile,
                                originalSize: file.size,
                                newSize: blob.size,
                                originalDimensions: { width: img.width, height: img.height },
                                newDimensions: { width, height }
                            });
                        } else {
                            reject(new Error('Failed to resize image'));
                        }
                    }, 'image/jpeg', quality);
                };
                
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = dataURL.dataURL;
            });
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
        let width = originalWidth;
        let height = originalHeight;
        
        // Scale down if necessary
        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        
        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }
        
        return { width: Math.round(width), height: Math.round(height) };
    }
    
    /* ========================================
       Utility Functions
       ======================================== */
    
    adjustVideoSize() {
        if (!this.video) return;
        
        const container = this.video.parentElement;
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        const videoRect = this.video.getBoundingClientRect();
        
        // Maintain aspect ratio
        const containerAspect = containerRect.width / containerRect.height;
        const videoAspect = this.video.videoWidth / this.video.videoHeight;
        
        if (containerAspect > videoAspect) {
            this.video.style.height = '100%';
            this.video.style.width = 'auto';
        } else {
            this.video.style.width = '100%';
            this.video.style.height = 'auto';
        }
    }
    
    getCameraCapabilities() {
        if (!this.stream) return null;
        
        const videoTrack = this.stream.getVideoTracks()[0];
        if (!videoTrack) return null;
        
        const capabilities = videoTrack.getCapabilities();
        const settings = videoTrack.getSettings();
        
        return {
            capabilities,
            settings,
            facingMode: this.facingMode
        };
    }
    
    async getAvailableCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter(device => device.kind === 'videoinput');
            
            return {
                success: true,
                cameras: cameras.map(camera => ({
                    deviceId: camera.deviceId,
                    label: camera.label || 'Camera',
                    groupId: camera.groupId
                }))
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    getImageMetadata(file) {
        return {
            name: file.name,
            size: this.formatFileSize(file.size),
            type: file.type,
            lastModified: new Date(file.lastModified).toLocaleString(),
            sizeBytes: file.size
        };
    }
    
    /* ========================================
       File Drop Handling
       ======================================== */
    
    setupDropZone(element, onDrop, onDragOver) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.add('drag-over');
            if (onDragOver) onDragOver(e);
        });
        
        element.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.remove('drag-over');
        });
        
        element.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            element.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files);
            const imageFiles = files.filter(file => file.type.startsWith('image/'));
            
            if (imageFiles.length > 0 && onDrop) {
                onDrop(imageFiles);
            }
        });
    }
    
    /* ========================================
       Cleanup
       ======================================== */
    
    cleanup() {
        this.stopCamera();
        
        if (this.canvas) {
            this.canvas.remove();
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.adjustVideoSize);
        document.removeEventListener('visibilitychange', this.pauseCamera);
        
        console.log('🧹 Camera manager cleaned up');
    }
}

/* ========================================
   Export Camera Manager
   ======================================== */

const cameraManager = new CameraManager();

// Global functions for easy access
window.CameraManager = {
    instance: cameraManager,
    startCamera: (videoElement, options) => cameraManager.startCamera(videoElement, options),
    stopCamera: () => cameraManager.stopCamera(),
    captureImage: (quality) => cameraManager.captureImage(quality),
    switchCamera: () => cameraManager.switchCamera(),
    validateFile: (file) => cameraManager.validateFile(file),
    readFileAsDataURL: (file) => cameraManager.readFileAsDataURL(file),
    resizeImage: (file, maxWidth, maxHeight, quality) => cameraManager.resizeImage(file, maxWidth, maxHeight, quality),
    setupDropZone: (element, onDrop, onDragOver) => cameraManager.setupDropZone(element, onDrop, onDragOver)
};

console.log('📷 Camera Manager module loaded successfully!');
