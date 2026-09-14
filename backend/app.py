import os
import logging
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from flask_session import Session

env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

def _validate_environment():
    required_vars = ['SECRET_KEY']
    missing = [var for var in required_vars if not os.environ.get(var)]

    if missing:
        raise ValueError(
            f"Missing required environment variable(s): {', '.join(missing)}. "
            "Create backend/.env and set the required variables."
        )

def create_app():
    _validate_environment()

    app = Flask(__name__)

    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
    app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['SESSION_FILE_DIR'] = os.path.join(os.path.dirname(__file__), 'flask_session')
    app.config['SESSION_PERMANENT'] = True
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=4)
    app.config['SESSION_FILE_THRESHOLD'] = 100

    cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:5173').split(',')
    cors_origins = [origin.strip() for origin in cors_origins]

    CORS(app,
         origins=cors_origins,
         supports_credentials=True,
         max_age=3600)
    Session(app)

    from routes.api import api_bp
    from routes.demo import demo_bp
    app.register_blueprint(api_bp)
    app.register_blueprint(demo_bp)

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    )

    return app

if __name__ == '__main__':
    app = create_app()
    host = '127.0.0.1'
    port = int(os.environ.get('PORT', '5000'))
    app.run(host=host, port=port, debug=True, use_reloader=False)
