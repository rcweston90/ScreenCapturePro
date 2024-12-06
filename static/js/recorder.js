class ScreenRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.stream = null;
        this.isRecording = false;
        this.isPaused = false;
    }

    async startRecording(options = {}) {
        try {
            // Check if getDisplayMedia is supported
            if (!navigator.mediaDevices?.getDisplayMedia) {
                throw new Error('Screen capture is not supported in this browser');
            }

            const displayMediaOptions = {
                video: {
                    cursor: options.showCursor ? "always" : "never",
                    displaySurface: "monitor"
                },
                audio: options.microphone ? true : false,
                selfBrowserSurface: "exclude"
            };

            // Request screen sharing first
            this.stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
            
            // If microphone is requested, get it separately
            if (options.microphone) {
                try {
                    const audioStream = await navigator.mediaDevices.getUserMedia({ 
                        audio: true,
                        echoCancellation: true,
                        noiseSuppression: true
                    });
                    const tracks = [...this.stream.getTracks(), ...audioStream.getTracks()];
                    this.stream = new MediaStream(tracks);
                } catch (audioError) {
                    console.warn('Microphone access denied, continuing without audio');
                }
            }

            const mimeTypes = [
                'video/webm;codecs=vp9',
                'video/webm;codecs=vp8',
                'video/webm',
                'video/mp4'
            ];
            
            let selectedMimeType;
            for (const mimeType of mimeTypes) {
                if (MediaRecorder.isTypeSupported(mimeType)) {
                    selectedMimeType = mimeType;
                    break;
                }
            }
            
            if (!selectedMimeType) {
                throw new Error('No supported MIME type found for recording');
            }

            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: selectedMimeType
            });

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            return this.stream;
        } catch (error) {
            console.error('Error starting recording:', error);
            throw error;
        }
    }

    pauseRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.pause();
            this.isPaused = true;
        }
    }

    resumeRecording() {
        if (this.mediaRecorder && this.isPaused) {
            this.mediaRecorder.resume();
            this.isPaused = false;
        }
    }

    async stopRecording() {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject(new Error('No recording in progress'));
                return;
            }

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, {
                    type: 'video/webm'
                });
                this.recordedChunks = [];
                this.isRecording = false;
                this.isPaused = false;
                this.stream.getTracks().forEach(track => track.stop());
                resolve(blob);
            };

            this.mediaRecorder.stop();
        });
    }

    async convertToFormat(blob, format) {
        if (format === 'video') {
            return blob;
        }

        // Convert to GIF using FFmpeg.js
        const ffmpeg = createFFmpeg({ log: true });
        await ffmpeg.load();

        const inputName = 'recording.webm';
        const outputName = 'output.gif';

        ffmpeg.FS('writeFile', inputName, await fetchFile(blob));

        await ffmpeg.run(
            '-i', inputName,
            '-vf', 'fps=10,scale=320:-1:flags=lanczos',
            '-f', 'gif',
            outputName
        );

        const data = ffmpeg.FS('readFile', outputName);
        return new Blob([data.buffer], { type: 'image/gif' });
    }
}
