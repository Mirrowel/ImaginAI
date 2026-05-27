import requests
import json

# Base URL for the Django API
BASE_URL = "http://127.0.0.1:8000/api"

# Endpoints to test
endpoints = [
    "/scenarios/",
    "/adventures/",
    "/settings/",
    "/model-input-limits/",
]

def test_api_endpoints():
    """
    Tests the API endpoints and logs the results.
    """
    for endpoint in endpoints:
        url = f"{BASE_URL}{endpoint}"
        print(f"--- Testing endpoint: {url} ---")
        try:
            response = requests.get(url)
            print(f"Status Code: {response.status_code}")
            try:
                # Try to parse and print JSON response
                response_json = response.json()
                print("Response JSON:")
                print(json.dumps(response_json, indent=2))
            except json.JSONDecodeError:
                # If it's not JSON, print the raw text
                print("Response Text (not valid JSON):")
                print(response.text)
        except requests.exceptions.RequestException as e:
            print(f"An error occurred: {e}")
        print("-" * (len(url) + 20))
        print()

if __name__ == "__main__":
    test_api_endpoints()
