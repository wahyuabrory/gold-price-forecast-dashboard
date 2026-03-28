import logging
import time
import json
from dataclasses import dataclass, field
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any

import requests
from flask import Blueprint, request, jsonify, current_app

logger = logging.getLogger(__name__)

demo_bp = Blueprint('demo', __name__, url_prefix='/api')

# Realistic user agent strings
USER_AGENTS = {
    "Chrome": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Firefox": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0",
    "Safari": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
    "Mobile": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15",
    "Crawler": "Mozilla/5.0 (compatible; Googlebot/2.1)"
}


@dataclass
class DemoConfig:
    """Configuration for demo endpoint."""
    num_parallel_requests: int = 5
    user_agents: List[str] = field(default_factory=lambda: list(USER_AGENTS.keys()))
    endpoints: List[str] = field(default_factory=lambda: ["/api/health", "/api/dashboard"])
    enable_prediction: bool = False

    def validate(self) -> tuple[bool, str]:
        """Validate configuration. Returns (is_valid, error_message)."""
        if self.num_parallel_requests < 1 or self.num_parallel_requests > 20:
            return False, "num_parallel_requests must be between 1 and 20"
        if not self.endpoints or len(self.endpoints) == 0:
            return False, "endpoints list cannot be empty"
        if not self.user_agents or len(self.user_agents) == 0:
            return False, "user_agents list cannot be empty"
        return True, ""


def _make_request(endpoint: str, user_agent: str, user_agent_name: str, client=None) -> Dict[str, Any]:
    """Execute a single HTTP request and capture timing."""
    try:
        start_time = time.time()
        
        # Use Flask test client if available (for testing), otherwise use requests
        if client is not None:
            response = client.get(
                endpoint,
                headers={"User-Agent": user_agent}
            )
            response_content = response.get_data()
            status_code = response.status_code
        else:
            # Fallback to requests for production
            base_url = request.host_url.rstrip('/')
            resp = requests.get(
                f"{base_url}{endpoint}",
                headers={"User-Agent": user_agent},
                timeout=10
            )
            response_content = resp.content
            status_code = resp.status_code
        
        end_time = time.time()
        
        duration_ms = round((end_time - start_time) * 1000, 2)
        
        # Capture response size
        try:
            response_size = len(response_content)
        except Exception:
            response_size = 0
        
        return {
            'endpoint': endpoint,
            'user_agent': user_agent_name,
            'status': status_code,
            'response_time_ms': duration_ms,
            'response_size_bytes': response_size,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'success': 200 <= status_code < 300,
        }
    except Exception as e:
        logger.error(f"Request to {endpoint} failed: {e}")
        return {
            'endpoint': endpoint,
            'user_agent': user_agent_name,
            'status': 0,
            'response_time_ms': 0,
            'response_size_bytes': 0,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'success': False,
            'error': str(e)
        }


@demo_bp.route('/demo', methods=['POST'])
def demo():
    """Execute multiple API calls in parallel and measure performance."""
    try:
        # Parse configuration
        data = request.get_json(silent=True) or {}
        
        config = DemoConfig(
            num_parallel_requests=data.get('num_parallel_requests', 5),
            user_agents=data.get('user_agents', list(USER_AGENTS.keys())),
            endpoints=data.get('endpoints', ['/health', '/dashboard']),
            enable_prediction=data.get('enable_prediction', False)
        )
        
        # Validate configuration
        is_valid, error_msg = config.validate()
        if not is_valid:
            return jsonify({
                'success': False,
                'error': error_msg
            }), 400
        
        # Get a test client for making internal requests
        client = current_app.test_client()
        
        # Create list of tasks: (endpoint, user_agent_index)
        tasks = []
        user_agent_names = config.user_agents
        for i in range(config.num_parallel_requests):
            for endpoint in config.endpoints:
                # Rotate through user agents
                ua_index = (i + len(tasks)) % len(user_agent_names)
                ua_name = user_agent_names[ua_index]
                ua_string = USER_AGENTS.get(ua_name, USER_AGENTS['Chrome'])
                tasks.append((endpoint, ua_string, ua_name))
        
        # Execute requests in parallel
        all_results = []
        start_total = time.time()
        
        with ThreadPoolExecutor(max_workers=config.num_parallel_requests) as executor:
            futures = [
                executor.submit(_make_request, endpoint, ua_string, ua_name, client)
                for endpoint, ua_string, ua_name in tasks
            ]
            
            for future in as_completed(futures):
                result = future.result()
                all_results.append(result)
        
        end_total = time.time()
        total_time_ms = round((end_total - start_total) * 1000, 2)
        
        # Calculate metrics
        response_times = [r['response_time_ms'] for r in all_results]
        sequential_equivalent_ms = sum(response_times)
        
        speedup_factor = sequential_equivalent_ms / total_time_ms if total_time_ms > 0 else 1.0
        speedup_factor = round(speedup_factor, 2)
        
        avg_response_time = round(sum(response_times) / len(response_times), 2) if response_times else 0
        min_response_time = min(response_times) if response_times else 0
        max_response_time = max(response_times) if response_times else 0
        
        # Count successes/failures
        successful = sum(1 for r in all_results if r.get('success', False))
        failed = len(all_results) - successful
        
        # Per-user-agent breakdown
        per_ua_data: Dict[str, Dict[str, Any]] = {}
        for result in all_results:
            ua = result['user_agent']
            if ua not in per_ua_data:
                per_ua_data[ua] = {
                    'times': [],
                    'successes': 0,
                    'total': 0
                }
            per_ua_data[ua]['times'].append(result['response_time_ms'])
            per_ua_data[ua]['total'] += 1
            if result.get('success', False):
                per_ua_data[ua]['successes'] += 1
        
        per_user_agent = {}
        for ua, data_dict in per_ua_data.items():
            avg_time = sum(data_dict['times']) / len(data_dict['times']) if data_dict['times'] else 0
            success_rate = round((data_dict['successes'] / data_dict['total'] * 100), 1) if data_dict['total'] > 0 else 0
            per_user_agent[ua] = {
                'avg': round(avg_time, 2),
                'count': data_dict['total'],
                'success_rate': success_rate
            }
        
        # Build response
        response_data = {
            'success': True,
            'total_time_ms': total_time_ms,
            'sequential_equivalent_ms': round(sequential_equivalent_ms, 2),
            'speedup_factor': speedup_factor,
            'requests': all_results,
            'summary': {
                'total_requests': len(all_results),
                'successful': successful,
                'failed': failed,
                'avg_response_time': avg_response_time,
                'min_response_time': min_response_time,
                'max_response_time': max_response_time,
            },
            'per_user_agent': per_user_agent
        }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Demo endpoint error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
