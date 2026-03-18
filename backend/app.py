import os
import logging
from datetime import timedelta

from flask import Flask
from flask_cors import CORS
from flask_session import Session

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'aurum-predict-dev-key-2026')
    app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB max upload
    
    # Session configuration (filesystem-based)
    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['SESSION_FILE_DIR'] = os.path.join(os.path.dirname(__file__), 'flask_session')
    app.config['SESSION_PERMANENT'] = True
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=4)
    app.config['SESSION_FILE_THRESHOLD'] = 100
    
    # Initialize extensions
    CORS(app, supports_credentials=True)
    Session(app)
    
    # Register blueprints
    from routes.api import api_bp
    app.register_blueprint(api_bp)
    
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    )
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
