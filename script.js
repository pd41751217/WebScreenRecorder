class BrowserRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.stream = null;
        this.isRecording = false;
        this.isPaused = false;
        this.recordingStartTime = 0;
        this.pausedTime = 0;
        this.timerInterval = null;
        this.recordings = JSON.parse(localStorage.getItem('recordings') || '[]');
        
        // Scene Transitions
        this.transitionType = 'none';
        this.transitionDuration = 500;
        this.isTransitioning = false;
        
        // Live Filters & Effects
        this.filterType = 'none';
        this.filterIntensity = 50;
        this.isFilterPreviewActive = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.displayRecordings();
        this.enumerateDevices();
    }

    initializeElements() {
        // Existing elements
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resumeBtn = document.getElementById('resumeBtn');
        this.videoPreview = document.getElementById('videoPreview');
        this.placeholder = document.getElementById('placeholder');
        this.recordingOverlay = document.getElementById('recordingOverlay');
        this.recordingTime = document.getElementById('recordingTime');
        this.recordingsList = document.getElementById('recordingsList');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettings = document.getElementById('closeSettings');
        this.downloadModal = document.getElementById('downloadModal');
        this.closeDownload = document.getElementById('closeDownload');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.shareBtn = document.getElementById('shareBtn');
        this.recordingDuration = document.getElementById('recordingDuration');
        this.recordingSize = document.getElementById('recordingSize');
        
        // Scene Transitions
        this.transitionTypeSelect = document.getElementById('transitionType');
        this.transitionDurationSlider = document.getElementById('transitionDuration');
        this.durationValue = document.getElementById('durationValue');
        
        // Live Filters & Effects
        this.filterTypeSelect = document.getElementById('filterType');
        this.filterIntensitySlider = document.getElementById('filterIntensity');
        this.intensityValue = document.getElementById('intensityValue');
        this.previewFilterBtn = document.getElementById('previewFilterBtn');
    }

    bindEvents() {
        // Recording controls
        this.startBtn.addEventListener('click', () => this.startRecording());
        this.stopBtn.addEventListener('click', () => this.stopRecording());
        this.pauseBtn.addEventListener('click', () => this.pauseRecording());
        this.resumeBtn.addEventListener('click', () => this.resumeRecording());

        // Modal controls
        this.settingsBtn.addEventListener('click', () => this.showSettings());
        this.closeSettings.addEventListener('click', () => this.hideSettings());
        this.closeDownload.addEventListener('click', () => this.hideDownloadModal());

        // Download controls
        this.downloadBtn.addEventListener('click', () => this.downloadRecording());
        this.shareBtn.addEventListener('click', () => this.shareRecording());

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.hideSettings();
            if (e.target === this.downloadModal) this.hideDownloadModal();
        });

        // Scene Transitions
        this.transitionTypeSelect.addEventListener('change', () => this.updateTransitionType());
        this.transitionDurationSlider.addEventListener('input', () => this.updateTransitionDuration());
        this.durationValue.addEventListener('input', () => this.updateDurationValue());

        // Demo transition button
        document.getElementById('demoTransitionBtn').addEventListener('click', () => this.demoTransition());

        // Live Filters & Effects
        this.filterTypeSelect.addEventListener('change', () => this.updateFilterType());
        this.filterIntensitySlider.addEventListener('input', () => this.updateFilterIntensity());
        this.previewFilterBtn.addEventListener('click', () => this.previewFilter());

        // Device selection changes
        this.audioSourceSelect.addEventListener('change', () => this.updateStream());
        this.videoSourceSelect.addEventListener('change', () => this.updateStream());
    }

    async populateDeviceOptions() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            const audioDevices = devices.filter(device => device.kind === 'audioinput');
            const videoDevices = devices.filter(device => device.kind === 'videoinput');

            // Populate audio devices
            this.audioSourceSelect.innerHTML = '';
            audioDevices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Microphone ${this.audioSourceSelect.children.length + 1}`;
                this.audioSourceSelect.appendChild(option);
            });

            // Populate video devices
            this.videoSourceSelect.innerHTML = '';
            videoDevices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Camera ${this.videoSourceSelect.children.length + 1}`;
                this.videoSourceSelect.appendChild(option);
            });

        } catch (error) {
            console.error('Error getting devices:', error);
        }
    }

    getRecordingType() {
        return document.querySelector('input[name="recordingType"]:checked').value;
    }

    getQualityConstraints() {
        const quality = this.qualitySelect.value;
        const constraints = {
            high: { width: 1920, height: 1080 },
            medium: { width: 1280, height: 720 },
            low: { width: 854, height: 480 }
        };
        return constraints[quality] || constraints.medium;
    }

    async getMediaConstraints() {
        const recordingType = this.getRecordingType();
        const quality = this.getQualityConstraints();
        
        let constraints = {
            audio: {
                deviceId: this.audioSourceSelect.value ? { exact: this.audioSourceSelect.value } : undefined,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        };

        if (recordingType === 'video' || recordingType === 'screen') {
            if (recordingType === 'screen') {
                constraints.video = {
                    mediaSource: 'screen',
                    ...quality
                };
            } else {
                constraints.video = {
                    deviceId: this.videoSourceSelect.value ? { exact: this.videoSourceSelect.value } : undefined,
                    ...quality,
                    facingMode: 'user'
                };
            }
        }

        return constraints;
    }

    async startRecording() {
        try {
            const recordingType = document.querySelector('input[name="recordingType"]:checked').value;
            const quality = document.getElementById('qualitySelect').value;
            
            let stream;
            
            if (recordingType === 'screen') {
                stream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        cursor: 'always',
                        displaySurface: 'monitor'
                    },
                    audio: true
                });
            } else if (recordingType === 'audio') {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: true
                });
            } else {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: quality === 'high' ? 1920 : quality === 'medium' ? 1280 : 854 },
                        height: { ideal: quality === 'high' ? 1080 : quality === 'medium' ? 720 : 480 }
                    },
                    audio: true
                });
            }

            this.stream = stream;
            
            if (recordingType !== 'audio') {
                this.videoPreview.srcObject = stream;
                this.placeholder.classList.add('hidden');
            }

            const options = {
                mimeType: 'video/webm;codecs=vp9,opus',
                videoBitsPerSecond: quality === 'high' ? 8000000 : quality === 'medium' ? 4000000 : 2000000
            };

            this.mediaRecorder = new MediaRecorder(stream, options);
            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.handleRecordingComplete();
            };

            // Apply scene transition before starting
            await this.applySceneTransition('start');
            
            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            this.startTimer();
            this.updateUI();
            
        } catch (error) {
            console.error('Error starting recording:', error);
            alert('Failed to start recording. Please check your permissions.');
        }
    }

    async stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            // Apply scene transition before stopping
            await this.applySceneTransition('stop');
            
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.stopTimer();
            this.updateUI();
            
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }
            
            this.videoPreview.srcObject = null;
            this.placeholder.classList.remove('hidden');
        }
    }

    pauseRecording() {
        if (this.mediaRecorder && this.isRecording && !this.isPaused) {
            this.mediaRecorder.pause();
        }
    }

    resumeRecording() {
        if (this.mediaRecorder && this.isRecording && this.isPaused) {
            this.mediaRecorder.resume();
        }
    }

    updateControlButtons() {
        this.startBtn.classList.toggle('hidden', this.isRecording);
        this.stopBtn.classList.toggle('hidden', !this.isRecording);
        this.pauseBtn.classList.toggle('hidden', !this.isRecording || this.isPaused);
        this.resumeBtn.classList.toggle('hidden', !this.isRecording || !this.isPaused);
    }

    showRecordingOverlay() {
        this.recordingOverlay.classList.remove('hidden');
    }

    hideRecordingOverlay() {
        this.recordingOverlay.classList.add('hidden');
    }

    startRecordingTimer() {
        this.recordingTimer = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            this.recordingTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopRecordingTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

    handleRecordingComplete() {
        const blob = new Blob(this.recordedChunks, {
            type: this.getSupportedMimeType()
        });

        const recording = {
            id: Date.now(),
            blob: blob,
            duration: Date.now() - this.recordingStartTime,
            size: blob.size,
            type: this.getRecordingType(),
            timestamp: new Date().toISOString(),
            url: URL.createObjectURL(blob)
        };

        this.currentRecording = recording;
        this.recordings.push(recording);
        this.updateRecordingsList();
        this.showDownloadModal(recording);
        this.saveRecordings();
    }

    showDownloadModal(recording) {
        const minutes = Math.floor(recording.duration / 60000);
        const seconds = Math.floor((recording.duration % 60000) / 1000);
        const sizeMB = (recording.size / (1024 * 1024)).toFixed(2);

        this.recordingDuration.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        this.recordingSize.textContent = `${sizeMB} MB`;
        
        this.downloadModal.classList.remove('hidden');
    }

    hideDownloadModal() {
        this.downloadModal.classList.add('hidden');
    }

    downloadRecording() {
        if (this.currentRecording) {
            const a = document.createElement('a');
            a.href = this.currentRecording.url;
            a.download = `recording_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${this.getFileExtension()}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    async shareRecording() {
        if (this.currentRecording && navigator.share) {
            try {
                const file = new File([this.currentRecording.blob], `recording.${this.getFileExtension()}`, {
                    type: this.getSupportedMimeType()
                });
                
                await navigator.share({
                    title: 'My Recording',
                    text: 'Check out this recording I made!',
                    files: [file]
                });
            } catch (error) {
                console.error('Error sharing:', error);
                this.showError('Sharing failed. You can download the recording instead.');
            }
        } else {
            this.showError('Sharing is not supported in this browser. You can download the recording instead.');
        }
    }

    updateRecordingsList() {
        if (this.recordings.length === 0) {
            this.recordingsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <p>No recordings yet</p>
                </div>
            `;
            return;
        }

        this.recordingsList.innerHTML = this.recordings.map(recording => `
            <div class="recording-item" data-id="${recording.id}">
                <div class="recording-info">
                    <div class="recording-preview">
                        <i class="fas fa-${this.getRecordingIcon(recording.type)}"></i>
                    </div>
                    <div class="recording-details">
                        <h4>Recording ${new Date(recording.timestamp).toLocaleString()}</h4>
                        <p>${this.formatDuration(recording.duration)} • ${this.formatSize(recording.size)} • ${recording.type}</p>
                    </div>
                </div>
                <div class="recording-actions">
                    <button class="btn btn-secondary btn-small" onclick="recorder.playRecording(${recording.id})">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="btn btn-primary btn-small" onclick="recorder.downloadRecordingById(${recording.id})">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn btn-danger btn-small" onclick="recorder.deleteRecording(${recording.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    getRecordingIcon(type) {
        const icons = {
            video: 'video',
            audio: 'microphone',
            screen: 'desktop'
        };
        return icons[type] || 'file';
    }

    formatDuration(duration) {
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    formatSize(size) {
        const mb = size / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    }

    playRecording(id) {
        const recording = this.recordings.find(r => r.id === id);
        if (recording) {
            window.open(recording.url, '_blank');
        }
    }

    downloadRecordingById(id) {
        const recording = this.recordings.find(r => r.id === id);
        if (recording) {
            const a = document.createElement('a');
            a.href = recording.url;
            a.download = `recording_${new Date(recording.timestamp).toISOString().slice(0, 19).replace(/:/g, '-')}.${this.getFileExtension()}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    deleteRecording(id) {
        const index = this.recordings.findIndex(r => r.id === id);
        if (index !== -1) {
            const recording = this.recordings[index];
            URL.revokeObjectURL(recording.url);
            this.recordings.splice(index, 1);
            this.updateRecordingsList();
            this.saveRecordings();
        }
    }

    getSupportedMimeType() {
        const types = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4'
        ];
        
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        
        return 'video/webm';
    }

    getFileExtension() {
        const mimeType = this.getSupportedMimeType();
        return mimeType.includes('webm') ? 'webm' : 'mp4';
    }

    showSettings() {
        this.settingsModal.classList.remove('hidden');
    }

    hideSettings() {
        this.settingsModal.classList.add('hidden');
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('recorderSettings') || '{}');
        
        if (settings.defaultFormat) {
            document.getElementById('defaultFormat').value = settings.defaultFormat;
        }
        if (settings.autoSave !== undefined) {
            document.getElementById('autoSave').checked = settings.autoSave;
        }
        if (settings.showTimer !== undefined) {
            document.getElementById('showTimer').checked = settings.showTimer;
        }

        // Load recordings
        const savedRecordings = JSON.parse(localStorage.getItem('recordings') || '[]');
        this.recordings = savedRecordings;
        this.updateRecordingsList();
    }

    saveSettings() {
        const settings = {
            defaultFormat: document.getElementById('defaultFormat').value,
            autoSave: document.getElementById('autoSave').checked,
            showTimer: document.getElementById('showTimer').checked
        };
        localStorage.setItem('recorderSettings', JSON.stringify(settings));
    }

    saveRecordings() {
        if (document.getElementById('autoSave').checked) {
            const recordingsData = this.recordings.map(r => ({
                ...r,
                blob: null, // Don't save blob data to localStorage
                url: null
            }));
            localStorage.setItem('recordings', JSON.stringify(recordingsData));
        }
    }

    showError(message) {
        // Create a simple error notification
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    async updateStream() {
        if (this.mediaStream && this.isRecording) {
            // Stop current stream
            this.mediaStream.getTracks().forEach(track => track.stop());
            
            // Get new stream with updated constraints
            const constraints = await this.getMediaConstraints();
            this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoPreview.srcObject = this.mediaStream;
        }
    }

    // Scene Transitions Methods
    updateTransitionType() {
        this.transitionType = this.transitionTypeSelect.value;
        this.applyTransitionClass();
    }

    updateTransitionDuration() {
        this.transitionDuration = parseInt(this.transitionDurationSlider.value);
        this.durationValue.textContent = `${this.transitionDuration}ms`;
        this.updateTransitionCSS();
    }

    updateDurationValue() {
        this.transitionDuration = parseInt(this.durationValue.textContent);
        this.transitionDurationSlider.value = this.transitionDuration;
        this.updateTransitionCSS();
    }

    applyTransitionClass() {
        const videoPreview = document.querySelector('.video-preview');
        videoPreview.classList.remove('transition-fade', 'transition-slide', 'transition-zoom', 'transition-wipe', 'transition-dissolve');
        
        if (this.transitionType !== 'none') {
            videoPreview.classList.add(`transition-${this.transitionType}`);
        }
    }

    updateTransitionCSS() {
        const videoPreview = document.querySelector('.video-preview');
        if (this.transitionType !== 'none') {
            videoPreview.style.transitionDuration = `${this.transitionDuration}ms`;
        }
    }

    async applySceneTransition(action) {
        if (this.transitionType === 'none' || this.isTransitioning) return;

        const videoPreview = document.querySelector('.video-preview');
        this.isTransitioning = true;

        return new Promise((resolve) => {
            if (this.transitionType === 'wipe') {
                videoPreview.classList.add('active');
                setTimeout(() => {
                    videoPreview.classList.remove('active');
                    this.isTransitioning = false;
                    resolve();
                }, this.transitionDuration);
            } else {
                videoPreview.classList.add('transitioning');
                setTimeout(() => {
                    videoPreview.classList.remove('transitioning');
                    this.isTransitioning = false;
                    resolve();
                }, this.transitionDuration);
            }
        });
    }

    async demoTransition() {
        if (this.isTransitioning) return;

        const videoPreview = document.querySelector('.video-preview');
        this.isTransitioning = true;

        // Fade out
        videoPreview.classList.add('transition-fade');
        await new Promise(resolve => setTimeout(resolve, this.transitionDuration));
        videoPreview.classList.remove('transition-fade');

        // Slide in
        videoPreview.classList.add('transition-slide');
        await new Promise(resolve => setTimeout(resolve, this.transitionDuration));
        videoPreview.classList.remove('transition-slide');

        // Zoom in
        videoPreview.classList.add('transition-zoom');
        await new Promise(resolve => setTimeout(resolve, this.transitionDuration));
        videoPreview.classList.remove('transition-zoom');

        // Wipe out
        videoPreview.classList.add('transition-wipe');
        await new Promise(resolve => setTimeout(resolve, this.transitionDuration));
        videoPreview.classList.remove('transition-wipe');

        // Dissolve
        videoPreview.classList.add('transition-dissolve');
        await new Promise(resolve => setTimeout(resolve, this.transitionDuration));
        videoPreview.classList.remove('transition-dissolve');

        this.isTransitioning = false;
    }

    // Live Filters & Effects Methods
    updateFilterType() {
        this.filterType = this.filterTypeSelect.value;
        this.applyFilter();
    }

    updateFilterIntensity() {
        this.filterIntensity = parseInt(this.filterIntensitySlider.value);
        this.intensityValue.textContent = `${this.filterIntensity}%`;
        this.applyFilter();
    }

    applyFilter() {
        const videoPreview = document.querySelector('.video-preview');
        
        // Remove all filter classes
        videoPreview.classList.remove(
            'filter-sepia', 'filter-grayscale', 'filter-blur', 'filter-brightness',
            'filter-contrast', 'filter-saturation', 'filter-hue', 'filter-invert',
            'filter-vintage', 'filter-cool', 'filter-warm'
        );

        if (this.filterType !== 'none') {
            videoPreview.classList.add(`filter-${this.filterType}`);
            videoPreview.setAttribute('data-filter-intensity', this.filterIntensity);
            this.updateFilterCSS();
        } else {
            videoPreview.removeAttribute('data-filter-intensity');
        }
    }

    updateFilterCSS() {
        const videoPreview = document.querySelector('.video-preview');
        const intensity = this.filterIntensity / 100;
        
        // Set CSS custom properties for dynamic filter intensity
        const filterEffects = this.getFilterEffects(intensity);
        videoPreview.style.setProperty('--filter-effect-10', filterEffects[10]);
        videoPreview.style.setProperty('--filter-effect-20', filterEffects[20]);
        videoPreview.style.setProperty('--filter-effect-30', filterEffects[30]);
        videoPreview.style.setProperty('--filter-effect-40', filterEffects[40]);
        videoPreview.style.setProperty('--filter-effect-50', filterEffects[50]);
        videoPreview.style.setProperty('--filter-effect-60', filterEffects[60]);
        videoPreview.style.setProperty('--filter-effect-70', filterEffects[70]);
        videoPreview.style.setProperty('--filter-effect-80', filterEffects[80]);
        videoPreview.style.setProperty('--filter-effect-90', filterEffects[90]);
        videoPreview.style.setProperty('--filter-effect-100', filterEffects[100]);
    }

    getFilterEffects(intensity) {
        const effects = {};
        
        for (let i = 10; i <= 100; i += 10) {
            const currentIntensity = (i / 100) * intensity;
            
            switch (this.filterType) {
                case 'sepia':
                    effects[i] = `sepia(${currentIntensity})`;
                    break;
                case 'grayscale':
                    effects[i] = `grayscale(${currentIntensity})`;
                    break;
                case 'blur':
                    effects[i] = `blur(${currentIntensity * 4}px)`;
                    break;
                case 'brightness':
                    effects[i] = `brightness(${1 + currentIntensity * 0.4})`;
                    break;
                case 'contrast':
                    effects[i] = `contrast(${1 + currentIntensity * 0.6})`;
                    break;
                case 'saturation':
                    effects[i] = `saturate(${1 + currentIntensity})`;
                    break;
                case 'hue':
                    effects[i] = `hue-rotate(${currentIntensity * 180}deg)`;
                    break;
                case 'invert':
                    effects[i] = `invert(${currentIntensity})`;
                    break;
                case 'vintage':
                    effects[i] = `sepia(${currentIntensity * 0.8}) contrast(${1 + currentIntensity * 0.4}) brightness(${1 - currentIntensity * 0.2}) saturate(${1 - currentIntensity * 0.4})`;
                    break;
                case 'cool':
                    effects[i] = `hue-rotate(${currentIntensity * 180}deg) saturate(${1 + currentIntensity * 0.4}) brightness(${1 - currentIntensity * 0.1})`;
                    break;
                case 'warm':
                    effects[i] = `sepia(${currentIntensity * 0.6}) saturate(${1 + currentIntensity * 0.8}) brightness(${1 + currentIntensity * 0.2}) hue-rotate(${-currentIntensity * 20}deg)`;
                    break;
                default:
                    effects[i] = 'none';
            }
        }
        
        return effects;
    }

    async previewFilter() {
        if (this.isFilterPreviewActive) return;
        
        this.isFilterPreviewActive = true;
        this.previewFilterBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Previewing...';
        
        // Cycle through different filters for preview
        const filters = ['sepia', 'grayscale', 'vintage', 'cool', 'warm', 'brightness', 'contrast'];
        const originalFilter = this.filterType;
        const originalIntensity = this.filterIntensity;
        
        for (let i = 0; i < filters.length; i++) {
            this.filterType = filters[i];
            this.filterIntensity = 70;
            this.applyFilter();
            
            await new Promise(resolve => setTimeout(resolve, 800));
        }
        
        // Restore original settings
        this.filterType = originalFilter;
        this.filterIntensity = originalIntensity;
        this.applyFilter();
        
        this.isFilterPreviewActive = false;
        this.previewFilterBtn.innerHTML = '<i class="fas fa-eye"></i> Preview Filter';
    }
}

// Initialize the recorder when the page loads
let recorder;
document.addEventListener('DOMContentLoaded', () => {
    recorder = new BrowserRecorder();
});

// Add CSS for error notification animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .recording-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        border: 1px solid #e1e5e9;
        border-radius: 8px;
        margin-bottom: 10px;
        background: white;
        transition: all 0.3s;
    }
    
    .recording-item:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    .recording-info {
        display: flex;
        align-items: center;
        gap: 15px;
        flex: 1;
    }
    
    .recording-preview {
        width: 50px;
        height: 50px;
        background: #f8f9fa;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #667eea;
        font-size: 1.5rem;
    }
    
    .recording-details h4 {
        margin: 0 0 5px 0;
        font-size: 1rem;
        color: #333;
    }
    
    .recording-details p {
        margin: 0;
        font-size: 0.9rem;
        color: #666;
    }
    
    .recording-actions {
        display: flex;
        gap: 8px;
    }
    
    .btn-small {
        padding: 8px 12px;
        font-size: 0.9rem;
    }
`;
document.head.appendChild(style);
