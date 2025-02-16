import requests
import json
import sys
from datetime import datetime

# API endpoint - Updated with correct path
base_url = "http://127.0.0.1:8000"
endpoint = "/api/v1/schedule"
url = base_url + endpoint

# Sample test data
test_data = {
    "tasks": [
        {
            "task_name": "Morning Meeting",
            "hours_per_day": 1.0,
            "deadline": None
        },
        {
            "task_name": "Project Work",
            "hours_per_day": 2.0,
            "deadline": None
        },
        {
            "task_name": "chess",
            "hours_per_day": 2.0,
            "deadline": None
        }
    ],
    "available_time": {
        "Monday": [
            {
                "start": "09:00",
                "end": "17:00"
            }
        ],
        "Tuesday": [
            {
                "start": "09:00",
                "end": "17:00"
            }
        ],
        "Wednesday": [
            {
                "start": "09:00",
                "end": "17:00"
            }
        ]
    }
}

def test_with_requests():
    print("\n=== Scheduler API Test ===")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Testing endpoint: {url}")
    print("\nSending test data:")
    print(json.dumps(test_data, indent=2))
    
    try:
        print("\nMaking POST request...")
        response = requests.post(url, json=test_data)
        
        print(f"\nResponse Status Code: {response.status_code}")
        print("\nResponse Headers:")
        print(json.dumps(dict(response.headers), indent=2))
        
        print("\nResponse Body:")
        try:
            response_json = response.json()
            print(json.dumps(response_json, indent=2))
            
            if response.status_code == 200:
                if response_json.get("status") == "success":
                    print("\n✅ Test successful! Schedule was created.")
                    print("\nScheduled Tasks:")
                    for day in response_json["schedule"]:
                        print(f"\n{day['day']}:")
                        for task in day["tasks"]:
                            print(f"  • {task['task_name']}: {task['start_time']} - {task['end_time']}")
                else:
                    print(f"\n⚠️ Scheduler returned status: {response_json.get('status')}")
                    print(f"Message: {response_json.get('message')}")
            else:
                print(f"\n❌ Request failed with status code: {response.status_code}")
                
        except json.JSONDecodeError:
            print("Could not parse JSON response. Raw response:")
            print(response.text)
            
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Error making request: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_with_requests()