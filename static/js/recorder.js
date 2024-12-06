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
            const displayMediaOptions = {
                video: {
                    cursor: options.showCursor ? "always" : "never"
                },
                audio: false
            };

            if (options.microphone) {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
                const tracks = [...this.stream.getTracks(), ...audioStream.getTracks()];
                this.stream = new MediaStream(tracks);
            } else {
                this.stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
            }

            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'video/webm;codecs=vp9'
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
