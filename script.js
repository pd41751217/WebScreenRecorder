class BrowserRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.mediaStream = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.isPaused = false;
        this.recordingStartTime = 0;
        this.recordingTimer = null;
        this.currentRecording = null;
        this.recordings = [];
        
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.populateDeviceOptions();
    }

    initializeElements() {
        // Video elements
        this.videoPreview = document.getElementById('videoPreview');
        this.placeholder = document.getElementById('placeholder');
        this.recordingOverlay = document.getElementById('recordingOverlay');
        this.recordingTime = document.getElementById('recordingTime');

        // Control buttons
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resumeBtn = document.getElementById('resumeBtn');

        // Recording options
        this.recordingTypeInputs = document.querySelectorAll('input[name="recordingType"]');
        this.qualitySelect = document.getElementById('qualitySelect');
        this.audioSourceSelect = document.getElementById('audioSourceSelect');
        this.videoSourceSelect = document.getElementById('videoSourceSelect');

        // Modals
        this.settingsModal = document.getElementById('settingsModal');
        this.downloadModal = document.getElementById('downloadModal');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.closeSettings = document.getElementById('closeSettings');
        this.closeDownload = document.getElementById('closeDownload');

        // Download elements
        this.downloadBtn = document.getElementById('downloadBtn');
        this.shareBtn = document.getElementById('shareBtn');
        this.recordingDuration = document.getElementById('recordingDuration');
        this.recordingSize = document.getElementById('recordingSize');

        // Recordings list
        this.recordingsList = document.getElementById('recordingsList');
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
            this.startBtn.disabled = true;
            this.startBtn.classList.add('loading');

            const constraints = await this.getMediaConstraints();
            
            if (this.getRecordingType() === 'screen') {
                this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
                    video: constraints.video,
                    audio: constraints.audio
                });
            } else {
                this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            }

            this.videoPreview.srcObject = this.mediaStream;
            this.placeholder.classList.add('hidden');

            // Set up MediaRecorder
            const mimeType = this.getSupportedMimeType();
            this.mediaRecorder = new MediaRecorder(this.mediaStream, {
                mimeType: mimeType,
                videoBitsPerSecond: 2500000 // 2.5 Mbps
            });

            this.recordedChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.handleRecordingComplete();
            };

            this.mediaRecorder.onpause = () => {
                this.isPaused = true;
                this.updateControlButtons();
            };

            this.mediaRecorder.onresume = () => {
                this.isPaused = false;
                this.updateControlButtons();
            };

            // Start recording
            this.mediaRecorder.start(1000); // Collect data every second
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            this.startRecordingTimer();
            this.updateControlButtons();
            this.showRecordingOverlay();

        } catch (error) {
            console.error('Error starting recording:', error);
            this.showError('Failed to start recording. Please check your permissions and try again.');
            this.startBtn.disabled = false;
            this.startBtn.classList.remove('loading');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.isPaused = false;
            this.stopRecordingTimer();
            this.hideRecordingOverlay();
            this.updateControlButtons();
            
            // Stop all tracks
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
            }
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
