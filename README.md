# Browser Audio Video Recorder

A modern, professional browser-based audio and video recorder similar to Panopto Express. This application allows users to record video, audio, and screen captures directly in the browser using Web APIs.

## Features

### 🎥 Recording Capabilities
- **Video + Audio Recording**: Record from webcam with microphone
- **Audio Only Recording**: Record audio from microphone
- **Screen Capture**: Record your screen with system audio
- **Multiple Quality Options**: High (1080p), Medium (720p), Low (480p)

### 🎛️ Advanced Controls
- **Pause/Resume**: Pause and resume recordings
- **Real-time Preview**: Live video preview before and during recording
- **Recording Timer**: Real-time recording duration display
- **Device Selection**: Choose from available audio and video devices

### 💾 Recording Management
- **Download Recordings**: Download recordings in WebM or MP4 format
- **Share Recordings**: Share recordings using Web Share API
- **Recording History**: View and manage all previous recordings
- **Auto-save**: Automatically save recording metadata

### ⚙️ Customization
- **Settings Panel**: Configure default formats and preferences
- **Quality Settings**: Adjust recording quality and bitrate
- **Device Management**: Select specific audio and video sources
- **Responsive Design**: Works on desktop and mobile devices

## Technologies Used

- **HTML5**: Semantic markup and structure
- **CSS3**: Modern styling with gradients, animations, and responsive design
- **JavaScript ES6+**: Modern JavaScript with classes and async/await
- **Web APIs**: 
  - MediaRecorder API for recording
  - getUserMedia API for camera/microphone access
  - getDisplayMedia API for screen capture
  - Web Share API for sharing
  - LocalStorage for data persistence

## Browser Compatibility

This application works in modern browsers that support the MediaRecorder API:

- ✅ Chrome 47+
- ✅ Firefox 25+
- ✅ Safari 14.1+
- ✅ Edge 79+

**Note**: Screen recording requires HTTPS in most browsers.

## Installation & Usage

### Quick Start
1. Download or clone this repository
2. Open `index.html` in a modern web browser
3. Grant camera and microphone permissions when prompted
4. Start recording!

### Local Development
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd browser-recorder
   ```

2. Serve the files using a local server (required for media APIs):
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

3. Open `http://localhost:8000` in your browser

### Production Deployment
For production deployment, ensure you're serving the files over HTTPS, as most browsers require a secure context for media APIs.

## File Structure

```
browser-recorder/
├── index.html          # Main HTML file
├── styles.css          # CSS styles and responsive design
├── script.js           # JavaScript functionality
└── README.md           # Project documentation
```

## API Reference

### BrowserRecorder Class

The main class that handles all recording functionality.

#### Methods

- `startRecording()`: Start a new recording
- `stopRecording()`: Stop the current recording
- `pauseRecording()`: Pause the current recording
- `resumeRecording()`: Resume a paused recording
- `downloadRecording()`: Download the current recording
- `shareRecording()`: Share the current recording

#### Properties

- `isRecording`: Boolean indicating if currently recording
- `isPaused`: Boolean indicating if recording is paused
- `recordings`: Array of all recorded sessions

## Configuration

### Recording Settings

The application supports various configuration options:

- **Recording Type**: Video+Audio, Audio Only, Screen Capture
- **Quality**: High (1080p), Medium (720p), Low (480p)
- **Audio Source**: Select specific microphone
- **Video Source**: Select specific camera
- **Default Format**: WebM or MP4
- **Auto-save**: Automatically save recording metadata
- **Show Timer**: Display recording duration

### Local Storage

The application uses localStorage to persist:
- User settings and preferences
- Recording metadata (when auto-save is enabled)
- Device preferences

## Security Considerations

- **Permissions**: The app requires camera and microphone permissions
- **HTTPS**: Screen recording requires HTTPS in most browsers
- **Data Privacy**: Recordings are stored locally and not uploaded to any server
- **Browser Security**: All media access is handled through secure Web APIs

## Troubleshooting

### Common Issues

1. **"Failed to start recording"**
   - Check browser permissions for camera/microphone
   - Ensure you're using HTTPS (for screen recording)
   - Try refreshing the page

2. **No video preview**
   - Check if camera is connected and working
   - Verify browser permissions
   - Try selecting a different video source

3. **Audio not recording**
   - Check microphone permissions
   - Verify microphone is not muted
   - Try selecting a different audio source

4. **Screen recording not working**
   - Ensure you're using HTTPS
   - Check browser support for getDisplayMedia API
   - Try a different browser

### Browser-Specific Notes

- **Chrome**: Best support for all features
- **Firefox**: May require enabling media.navigator.enabled in about:config
- **Safari**: Limited support for some advanced features
- **Edge**: Good support, similar to Chrome

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For support or questions:
- Create an issue in the repository
- Check the troubleshooting section above
- Ensure you're using a supported browser

## Roadmap

Future features planned:
- [ ] Video editing capabilities
- [ ] Cloud storage integration
- [ ] Advanced audio filters
- [ ] Recording scheduling
- [ ] Multi-track recording
- [ ] Export to different formats
- [ ] Recording analytics
- [ ] Collaborative recording

---

**Note**: This application is designed for educational and demonstration purposes. For production use, consider additional security measures and compliance requirements.
