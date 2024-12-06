document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const recorder = new ScreenRecorder();
    const preview = document.getElementById('preview');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const micToggle = document.getElementById('micToggle');
    const cursorToggle = document.getElementById('cursorToggle');
    const formatSelect = document.getElementById('formatSelect');
    const themeToggle = document.getElementById('themeToggle');
    const previewModal = new bootstrap.Modal(document.getElementById('preview-modal'));
    const previewVideo = document.getElementById('preview-video');
    const downloadBtn = document.getElementById('downloadBtn');

    let recordingBlob = null;

    startBtn.addEventListener('click', async () => {
        try {
            const stream = await recorder.startRecording({
                microphone: micToggle.checked,
                showCursor: cursorToggle.checked
            });
            
            preview.srcObject = stream;
            startBtn.classList.add('hidden');
            pauseBtn.classList.remove('hidden');
            stopBtn.classList.remove('hidden');
            
            // Add recording indicator
            const indicator = document.createElement('span');
            indicator.className = 'recording-indicator';
            startBtn.parentNode.insertBefore(indicator, startBtn);
        } catch (error) {
            console.error('Failed to start recording:', error);
            let errorMessage = 'Failed to start recording. ';
            
            if (error.name === 'NotAllowedError') {
                if (error.message.includes('Permission denied by system')) {
                    errorMessage += 'System permission denied. Please check your operating system\'s screen recording permissions:\n\n' +
                        '• On Windows: Check your Privacy Settings > Screen Recording\n' +
                        '• On macOS: Check System Preferences > Security & Privacy > Screen Recording\n' +
                        '• On Linux: Ensure your desktop environment allows screen sharing';
                } else {
                    errorMessage += 'Please click "Share" when your browser asks for screen recording permission.';
                }
            } else if (error.name === 'NotReadableError') {
                errorMessage += 'Unable to access your screen. Please try again or use a different window.';
            } else if (error.name === 'NotFoundError') {
                errorMessage += 'No available screens found. Please ensure you have a display connected.';
            } else if (error.message.includes('not supported')) {
                errorMessage += 'Your browser does not support screen recording. Please use Chrome, Firefox, or Edge.';
            } else {
                errorMessage += 'An unexpected error occurred. Please refresh the page and try again.';
            }
            
            // Show error in a more visible way
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger alert-dismissible fade show';
            errorDiv.innerHTML = `
                <strong>Error:</strong> ${errorMessage}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            document.querySelector('.container-fluid').insertBefore(errorDiv, document.querySelector('.preview-container'));
        }
    });

    pauseBtn.addEventListener('click', () => {
        if (recorder.isPaused) {
            recorder.resumeRecording();
            pauseBtn.textContent = 'Pause';
        } else {
            recorder.pauseRecording();
            pauseBtn.textContent = 'Resume';
        }
    });

    stopBtn.addEventListener('click', async () => {
        recordingBlob = await recorder.stopRecording();
        preview.srcObject = null;
        
        // Show preview
        previewVideo.src = URL.createObjectURL(recordingBlob);
        previewModal.show();
        
        // Reset UI
        startBtn.classList.remove('hidden');
        pauseBtn.classList.add('hidden');
        stopBtn.classList.add('hidden');
        document.querySelector('.recording-indicator')?.remove();
    });

    downloadBtn.addEventListener('click', async () => {
        if (!recordingBlob) return;

        const format = formatSelect.value;
        const convertedBlob = await recorder.convertToFormat(recordingBlob, format);
        
        // Create form data for upload
        const formData = new FormData();
        formData.append('recording', convertedBlob);
        formData.append('format', format);

        try {
            const response = await fetch('/save-recording', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `screen-recording.${format === 'video' ? 'mp4' : 'gif'}`;
                a.click();
                URL.revokeObjectURL(url);
                previewModal.hide();
            } else {
                throw new Error('Failed to save recording');
            }
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
        } catch (error) {
            console.error('Error saving recording:', error);
            alert('Failed to save recording');
        }
    });
});
