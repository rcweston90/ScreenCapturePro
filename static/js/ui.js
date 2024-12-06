document.addEventListener('DOMContentLoaded', () => {
    const recorder = new ScreenRecorder();
    const preview = document.getElementById('preview');
    const startBtn = document.getElementById('startBtn');
    const selectionBox = document.getElementById('selection-box');
    const previewContainer = document.getElementById('preview-container');
    
    let isSelecting = false;
    let startX, startY;
    let currentX, currentY;
    let selectedArea = null;

    previewContainer.addEventListener('mousedown', (e) => {
        isSelecting = true;
        startX = e.clientX - previewContainer.getBoundingClientRect().left;
        startY = e.clientY - previewContainer.getBoundingClientRect().top;
        selectionBox.style.left = `${startX}px`;
        selectionBox.style.top = `${startY}px`;
        selectionBox.style.width = '0';
        selectionBox.style.height = '0';
        selectionBox.classList.remove('hidden');
    });

    previewContainer.addEventListener('mousemove', (e) => {
        if (!isSelecting) return;
        
        currentX = e.clientX - previewContainer.getBoundingClientRect().left;
        currentY = e.clientY - previewContainer.getBoundingClientRect().top;
        
        const width = currentX - startX;
        const height = currentY - startY;
        
        selectionBox.style.width = `${Math.abs(width)}px`;
        selectionBox.style.height = `${Math.abs(height)}px`;
        selectionBox.style.left = `${width > 0 ? startX : currentX}px`;
        selectionBox.style.top = `${height > 0 ? startY : currentY}px`;
    });

    previewContainer.addEventListener('mouseup', () => {
        if (!isSelecting) return;
        isSelecting = false;
        
        selectedArea = {
            x: parseInt(selectionBox.style.left),
            y: parseInt(selectionBox.style.top),
            width: parseInt(selectionBox.style.width),
            height: parseInt(selectionBox.style.height)
        };
    });
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
            let errorMessage = 'Failed to start recording. ';
            if (error.name === 'NotAllowedError') {
                errorMessage += 'Please grant screen sharing permissions to record your screen.';
            } else if (error.name === 'NotReadableError') {
                errorMessage += 'Unable to access your screen. Please try again or use a different window.';
            } else if (error.message.includes('MIME type')) {
                errorMessage += 'Your browser may not support screen recording. Please try using a modern browser like Chrome or Firefox.';
            } else {
                errorMessage += 'Please make sure you have granted the necessary permissions and try again.';
            }
            alert(errorMessage);
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
