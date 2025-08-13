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
        this.currentTransition = 'none';
        this.transitionDurationMs = 500;
        this.videoEffects = {
            brightness: 100,
            contrast: 100,
            saturation: 100,
            blur: 0,
            hue: 0,
            sepia: 0
        };
        this.audioEffects = {
            volume: 100,
            bass: 0,
            treble: 0,
            noiseGate: 0,
            compression: 0,
            echo: 0
        };
        
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

        // Transition button
        this.transitionBtn = document.getElementById('transitionBtn');

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

        // Transition button
        this.transitionBtn.addEventListener('click', () => this.triggerTransition());

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.hideSettings();
            if (e.target === this.downloadModal) this.hideDownloadModal();
        });

        // Device selection changes
        this.audioSourceSelect.addEventListener('change', () => this.updateStream());
        this.videoSourceSelect.addEventListener('change', () => this.updateStream());
        this.recordingTypeSelect = document.getElementById('recordingTypeSelect');
        this.recordingTypeSelect.addEventListener('change', () => this.updateStream());

        // Transition controls
        this.transitionSelect = document.getElementById('transitionSelect');
        this.transitionDuration = document.getElementById('transitionDuration');
        this.durationValue = document.getElementById('durationValue');

        this.transitionSelect.addEventListener('change', () => this.updateTransition());
        this.transitionDuration.addEventListener('input', () => this.updateTransitionDuration());

        // Video effects controls
        this.brightnessEffect = document.getElementById('brightnessEffect');
        this.contrastEffect = document.getElementById('contrastEffect');
        this.saturationEffect = document.getElementById('saturationEffect');
        this.blurEffect = document.getElementById('blurEffect');
        this.hueEffect = document.getElementById('hueEffect');
        this.sepiaEffect = document.getElementById('sepiaEffect');
        this.resetEffectsBtn = document.getElementById('resetEffectsBtn');

        this.brightnessEffect.addEventListener('input', () => this.updateVideoEffects());
        this.contrastEffect.addEventListener('input', () => this.updateVideoEffects());
        this.saturationEffect.addEventListener('input', () => this.updateVideoEffects());
        this.blurEffect.addEventListener('input', () => this.updateVideoEffects());
        this.hueEffect.addEventListener('input', () => this.updateVideoEffects());
        this.sepiaEffect.addEventListener('input', () => this.updateVideoEffects());
        this.resetEffectsBtn.addEventListener('click', () => this.resetVideoEffects());

        // Audio effects controls
        this.volumeEffect = document.getElementById('volumeEffect');
        this.bassEffect = document.getElementById('bassEffect');
        this.trebleEffect = document.getElementById('trebleEffect');
        this.noiseGateEffect = document.getElementById('noiseGateEffect');
        this.compressionEffect = document.getElementById('compressionEffect');
        this.echoEffect = document.getElementById('echoEffect');
        this.resetAudioEffectsBtn = document.getElementById('resetAudioEffectsBtn');

        this.volumeEffect.addEventListener('input', () => this.updateAudioEffects());
        this.bassEffect.addEventListener('input', () => this.updateAudioEffects());
        this.trebleEffect.addEventListener('input', () => this.updateAudioEffects());
        this.noiseGateEffect.addEventListener('input', () => this.updateAudioEffects());
        this.compressionEffect.addEventListener('input', () => this.updateAudioEffects());
        this.echoEffect.addEventListener('input', () => this.updateAudioEffects());
        this.resetAudioEffectsBtn.addEventListener('click', () => this.resetAudioEffects());

        // Tab functionality
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });
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
        return this.recordingTypeSelect ? this.recordingTypeSelect.value : 'video';
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

            // Initialize audio context for recording
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Apply audio effects to the stream
            this.applyAudioEffects();

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
        if (settings.transition) {
            this.transitionSelect.value = settings.transition;
            this.currentTransition = settings.transition;
            this.updateTransition();
        }
        if (settings.transitionDuration) {
            this.transitionDuration.value = settings.transitionDuration;
            this.transitionDurationMs = settings.transitionDuration;
            this.durationValue.textContent = `${settings.transitionDuration}ms`;
        }
        if (settings.videoEffects) {
            this.videoEffects = settings.videoEffects;
            this.brightnessEffect.value = this.videoEffects.brightness;
            this.contrastEffect.value = this.videoEffects.contrast;
            this.saturationEffect.value = this.videoEffects.saturation;
            this.blurEffect.value = this.videoEffects.blur;
            this.hueEffect.value = this.videoEffects.hue;
            this.sepiaEffect.value = this.videoEffects.sepia;
            this.updateVideoEffects();
        }
        if (settings.audioEffects) {
            this.audioEffects = settings.audioEffects;
            this.volumeEffect.value = this.audioEffects.volume;
            this.bassEffect.value = this.audioEffects.bass;
            this.trebleEffect.value = this.audioEffects.treble;
            this.noiseGateEffect.value = this.audioEffects.noiseGate;
            this.compressionEffect.value = this.audioEffects.compression;
            this.echoEffect.value = this.audioEffects.echo;
            this.updateAudioEffects();
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
            showTimer: document.getElementById('showTimer').checked,
            transition: this.currentTransition,
            transitionDuration: this.transitionDurationMs,
            videoEffects: this.videoEffects,
            audioEffects: this.audioEffects
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

    updateTransition() {
        const transition = this.transitionSelect.value;
        this.currentTransition = transition;
        
        // Remove all transition classes
        this.videoPreview.classList.remove('transition-fade', 'transition-slide', 'transition-zoom', 'transition-wipe', 'transition-dissolve');
        
        if (transition !== 'none') {
            this.videoPreview.classList.add(`transition-${transition}`);
        }
        
        this.saveSettings();
    }

    updateTransitionDuration() {
        const duration = this.transitionDuration.value;
        this.transitionDurationMs = parseInt(duration);
        this.durationValue.textContent = `${duration}ms`;
        
        // Update CSS transition duration
        if (this.currentTransition !== 'none') {
            this.videoPreview.style.transitionDuration = `${duration}ms`;
        }
        
        this.saveSettings();
    }

    triggerTransition() {
        if (this.currentTransition === 'none') return;
        
        const videoPreview = this.videoPreview;
        
        // Add transitioning class
        videoPreview.classList.add('transitioning');
        
        // For wipe transition, trigger the wipe effect
        if (this.currentTransition === 'wipe') {
            videoPreview.classList.add('active');
        }
        
        // Remove transitioning class after duration
        setTimeout(() => {
            videoPreview.classList.remove('transitioning');
            if (this.currentTransition === 'wipe') {
                videoPreview.classList.remove('active');
            }
        }, this.transitionDurationMs);
    }

    updateVideoEffects() {
        // Update effect values
        this.videoEffects.brightness = parseInt(this.brightnessEffect.value);
        this.videoEffects.contrast = parseInt(this.contrastEffect.value);
        this.videoEffects.saturation = parseInt(this.saturationEffect.value);
        this.videoEffects.blur = parseFloat(this.blurEffect.value);
        this.videoEffects.hue = parseInt(this.hueEffect.value);
        this.videoEffects.sepia = parseInt(this.sepiaEffect.value);

        // Update display values
        this.brightnessEffect.nextElementSibling.textContent = `${this.videoEffects.brightness}%`;
        this.contrastEffect.nextElementSibling.textContent = `${this.videoEffects.contrast}%`;
        this.saturationEffect.nextElementSibling.textContent = `${this.videoEffects.saturation}%`;
        this.blurEffect.nextElementSibling.textContent = `${this.videoEffects.blur}px`;
        this.hueEffect.nextElementSibling.textContent = `${this.videoEffects.hue}°`;
        this.sepiaEffect.nextElementSibling.textContent = `${this.videoEffects.sepia}%`;

        // Apply effects to video preview
        this.applyVideoEffects();
        
        // Save settings
        this.saveSettings();
    }

    applyVideoEffects() {
        const videoPreview = this.videoPreview;
        const effects = this.videoEffects;
        
        // Build CSS filter string
        const filters = [
            `brightness(${effects.brightness}%)`,
            `contrast(${effects.contrast}%)`,
            `saturate(${effects.saturation}%)`,
            `blur(${effects.blur}px)`,
            `hue-rotate(${effects.hue}deg)`,
            `sepia(${effects.sepia}%)`
        ].join(' ');
        
        videoPreview.style.filter = filters;
    }

    resetVideoEffects() {
        // Reset all effect values to defaults
        this.brightnessEffect.value = 100;
        this.contrastEffect.value = 100;
        this.saturationEffect.value = 100;
        this.blurEffect.value = 0;
        this.hueEffect.value = 0;
        this.sepiaEffect.value = 0;

        // Reset video effects object
        this.videoEffects = {
            brightness: 100,
            contrast: 100,
            saturation: 100,
            blur: 0,
            hue: 0,
            sepia: 0
        };

        // Update display values
        this.updateVideoEffects();
        
        // Remove all filters from video
        this.videoPreview.style.filter = 'none';
    }

    updateAudioEffects() {
        // Update effect values
        this.audioEffects.volume = parseInt(this.volumeEffect.value);
        this.audioEffects.bass = parseInt(this.bassEffect.value);
        this.audioEffects.treble = parseInt(this.trebleEffect.value);
        this.audioEffects.noiseGate = parseInt(this.noiseGateEffect.value);
        this.audioEffects.compression = parseInt(this.compressionEffect.value);
        this.audioEffects.echo = parseInt(this.echoEffect.value);

        // Update display values
        this.volumeEffect.nextElementSibling.textContent = `${this.audioEffects.volume}%`;
        this.bassEffect.nextElementSibling.textContent = `${this.audioEffects.bass}dB`;
        this.trebleEffect.nextElementSibling.textContent = `${this.audioEffects.treble}dB`;
        this.noiseGateEffect.nextElementSibling.textContent = `${this.audioEffects.noiseGate}%`;
        this.compressionEffect.nextElementSibling.textContent = `${this.audioEffects.compression}%`;
        this.echoEffect.nextElementSibling.textContent = `${this.audioEffects.echo}%`;

        // Apply effects to audio context if available
        this.applyAudioEffects();
        
        // Save settings
        this.saveSettings();
    }

    applyAudioEffects() {
        // Create audio context for real-time processing
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Apply volume to video element
        if (this.videoPreview) {
            this.videoPreview.volume = this.audioEffects.volume / 100;
        }

        // For recording, we'll apply effects through Web Audio API
        if (this.mediaStream && this.audioContext.state === 'running') {
            this.setupAudioProcessing();
        }
    }

    setupAudioProcessing() {
        try {
            // Create audio source from media stream
            const audioSource = this.audioContext.createMediaStreamSource(this.mediaStream);
            
            // Create gain node for volume control
            const volumeGain = this.audioContext.createGain();
            volumeGain.gain.value = this.audioEffects.volume / 100;
            
            // Create biquad filter for bass boost
            const bassFilter = this.audioContext.createBiquadFilter();
            bassFilter.type = 'lowshelf';
            bassFilter.frequency.value = 200;
            bassFilter.gain.value = this.audioEffects.bass;
            
            // Create biquad filter for treble boost
            const trebleFilter = this.audioContext.createBiquadFilter();
            trebleFilter.type = 'highshelf';
            trebleFilter.frequency.value = 3000;
            trebleFilter.gain.value = this.audioEffects.treble;
            
            // Create compressor for compression effect
            const compressor = this.audioContext.createDynamicsCompressor();
            compressor.threshold.value = -50 + (this.audioEffects.compression * 0.5);
            compressor.knee.value = 40;
            compressor.ratio.value = 12;
            compressor.attack.value = 0;
            compressor.release.value = 0.25;
            
            // Connect the audio processing chain
            audioSource
                .connect(volumeGain)
                .connect(bassFilter)
                .connect(trebleFilter)
                .connect(compressor)
                .connect(this.audioContext.destination);
                
        } catch (error) {
            console.log('Audio processing setup failed:', error);
        }
    }

    resetAudioEffects() {
        // Reset all audio effect values to defaults
        this.volumeEffect.value = 100;
        this.bassEffect.value = 0;
        this.trebleEffect.value = 0;
        this.noiseGateEffect.value = 0;
        this.compressionEffect.value = 0;
        this.echoEffect.value = 0;

        // Reset audio effects object
        this.audioEffects = {
            volume: 100,
            bass: 0,
            treble: 0,
            noiseGate: 0,
            compression: 0,
            echo: 0
        };

        // Update display values
        this.updateAudioEffects();
        
        // Reset video volume
        if (this.videoPreview) {
            this.videoPreview.volume = 1.0;
        }
    }

    switchTab(tabName) {
        // Remove active class from all tabs and contents
        this.tabButtons.forEach(btn => btn.classList.remove('active'));
        this.tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to selected tab and content
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        const activeContent = document.getElementById(`${tabName}-tab`);
        
        if (activeTab && activeContent) {
            activeTab.classList.add('active');
            activeContent.classList.add('active');
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
        border: 1px solid rgba(178, 34, 52, 0.2);
        border-radius: 15px;
        margin-bottom: 15px;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }
    
    .recording-item:hover {
        box-shadow: 0 8px 25px rgba(178, 34, 52, 0.2);
        transform: translateY(-2px);
        background: rgba(255, 255, 255, 0.15);
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
        background: rgba(178, 34, 52, 0.1);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #B22234;
        font-size: 1.5rem;
        border: 2px solid rgba(178, 34, 52, 0.2);
        backdrop-filter: blur(5px);
    }
    
    .recording-details h4 {
        margin: 0 0 5px 0;
        font-size: 1rem;
        color: white;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    }
    
    .recording-details p {
        margin: 0;
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.8);
        text-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
    }
    
    .recording-actions {
        display: flex;
        gap: 8px;
    }
    
    .btn-small {
        padding: 8px 12px;
        font-size: 0.9rem;
        border-radius: 10px;
        font-weight: 600;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        transition: all 0.3s ease;
    }
    
    .btn-small:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    
    .btn-small.btn-primary {
        background: linear-gradient(45deg, #B22234, #3C3B6E);
        color: white;
        border: none;
    }
    
    .btn-small.btn-secondary {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 2px solid rgba(255, 255, 255, 0.4);
        backdrop-filter: blur(10px);
    }
    
    .btn-small.btn-secondary:hover {
        background: rgba(255, 255, 255, 0.3);
        border-color: rgba(255, 255, 255, 0.6);
    }
`;
document.head.appendChild(style);
