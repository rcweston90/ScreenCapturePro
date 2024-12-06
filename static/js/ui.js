document.addEventListener('DOMContentLoaded', () => {
    const recorder = new ScreenRecorder();
    const preview = document.getElementById('preview');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const micToggle = document.getElementById('micToggle');
    const cursorToggle = document.getElementById('cursorToggle');
    const formatSelect = document.getElementById('formatSelect');
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
            alert('Failed to start recording. Please make sure you have granted the necessary permissions.');
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
        } catch (error) {
            console.error('Error saving recording:', error);
            alert('Failed to save recording');
        }
    });
});
