from flask import Flask, render_template, jsonify, request, send_file
import logging
import os

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.urandom(24)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/save-recording', methods=['POST'])
def save_recording():
    if 'recording' not in request.files:
        return jsonify({'error': 'No recording file'}), 400
    
    recording = request.files['recording']
    format_type = request.form.get('format', 'video')
    
    # Save the recording temporarily
    temp_path = f'temp_recording.{format_type}'
    recording.save(temp_path)
    
    return send_file(temp_path, as_attachment=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
