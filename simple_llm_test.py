import requests
import json
import time

def test_llm_budget():
    """Simple test to check LLM budget status"""
    print("🔍 Testing Emergent LLM Key Budget Status")
    print("=" * 50)
    
    # Test with quick evaluation (faster than full evaluation)
    url = "https://aiagent-estate.preview.emergentagent.com/api/evaluate-quick"
    
    test_data = {
        "beds": 2,
        "baths": 1,
        "carpark": 1,
        "location": "Sydney, NSW",
        "price": 500000,
        "size": 60,
        "property_type": "Apartment",
        "features": "Modern, city views",
        "images": []  # No photos to avoid vision processing
    }
    
    print("📡 Making API request...")
    print(f"URL: {url}")
    print("Data: Property without photos (to avoid vision processing)")
    
    try:
        start_time = time.time()
        response = requests.post(
            url, 
            json=test_data, 
            headers={'Content-Type': 'application/json'},
            timeout=60
        )
        end_time = time.time()
        
        print(f"⏱️  Response time: {end_time - start_time:.2f} seconds")
        print(f"📊 HTTP Status Code: {response.status_code}")
        
        try:
            response_data = response.json()
            print(f"📄 Response type: JSON")
        except:
            response_data = {"raw_text": response.text}
            print(f"📄 Response type: Raw text")
        
        # Analyze the response
        if response.status_code == 200:
            if response_data.get("success"):
                evaluation_length = len(response_data.get("evaluation_report", ""))
                print(f"✅ SUCCESS: LLM Budget is OK")
                print(f"   - Evaluation completed successfully")
                print(f"   - Report length: {evaluation_length} characters")
                print(f"   - Price per sqm: ${response_data.get('price_per_sqm', 'N/A')}")
                return "BUDGET_OK"
            else:
                print(f"❌ FAILED: Request succeeded but evaluation failed")
                print(f"   - Response: {response_data}")
                return "EVALUATION_FAILED"
        
        elif response.status_code == 502:
            print(f"🚨 BUDGET ISSUE: 502 Bad Gateway")
            print(f"   - This typically indicates LLM API budget/quota exceeded")
            print(f"   - Response: {response_data}")
            return "BUDGET_EXCEEDED_502"
        
        elif response.status_code == 429:
            print(f"🚨 RATE LIMITED: 429 Too Many Requests")
            print(f"   - This indicates rate limiting or budget constraints")
            print(f"   - Response: {response_data}")
            return "RATE_LIMITED_429"
        
        elif response.status_code == 500:
            error_detail = response_data.get("detail", "").lower()
            if any(keyword in error_detail for keyword in ["budget", "quota", "limit", "insufficient", "credit"]):
                print(f"🚨 BUDGET ISSUE: 500 Internal Server Error (Budget-related)")
                print(f"   - Error: {response_data.get('detail', 'Unknown')}")
                return "BUDGET_EXCEEDED_500"
            else:
                print(f"❌ SERVER ERROR: 500 Internal Server Error (Non-budget)")
                print(f"   - Error: {response_data.get('detail', 'Unknown')}")
                return "SERVER_ERROR"
        
        else:
            print(f"❓ UNEXPECTED: Status {response.status_code}")
            print(f"   - Response: {response_data}")
            return f"UNEXPECTED_{response.status_code}"
    
    except requests.exceptions.Timeout:
        print(f"⏰ TIMEOUT: Request timed out after 60 seconds")
        print(f"   - This might indicate server overload or budget issues")
        return "TIMEOUT"
    
    except Exception as e:
        print(f"💥 ERROR: {str(e)}")
        return "EXCEPTION"

def test_no_photos_handling():
    """Test that evaluation works without photos"""
    print("\n🔍 Testing No-Photo Scenario")
    print("=" * 30)
    
    # Use existing property ID
    try:
        # Get existing properties
        response = requests.get("https://aiagent-estate.preview.emergentagent.com/api/properties")
        if response.status_code == 200:
            properties = response.json()
            if properties:
                property_id = properties[0]["id"]
                print(f"📋 Using existing property: {property_id}")
                
                # Check if it has photos
                has_photos = len(properties[0].get("images", [])) > 0
                print(f"📸 Property has photos: {has_photos}")
                
                if not has_photos:
                    print("✅ PERFECT: Property has no photos - ideal for testing")
                    return "NO_PHOTOS_AVAILABLE"
                else:
                    print("ℹ️  Property has photos - will still test vision handling")
                    return "PHOTOS_PRESENT"
            else:
                print("❌ No properties found in database")
                return "NO_PROPERTIES"
        else:
            print(f"❌ Failed to get properties: {response.status_code}")
            return "API_ERROR"
    
    except Exception as e:
        print(f"💥 ERROR: {str(e)}")
        return "EXCEPTION"

if __name__ == "__main__":
    print("🧪 Simple LLM Budget & No-Photo Test")
    print("=" * 60)
    
    # Test 1: LLM Budget Status
    budget_status = test_llm_budget()
    
    # Test 2: No-Photo Handling
    photo_status = test_no_photos_handling()
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 TEST SUMMARY")
    print("=" * 60)
    print(f"🔑 LLM Budget Status: {budget_status}")
    print(f"📸 No-Photo Scenario: {photo_status}")
    
    # Recommendations
    print("\n💡 RECOMMENDATIONS:")
    if "BUDGET" in budget_status or "502" in budget_status:
        print("   🚨 CRITICAL: Emergent LLM key has budget/quota issues")
        print("   📞 Action: Contact Emergent support or add credits")
    elif budget_status == "BUDGET_OK":
        print("   ✅ LLM budget is sufficient")
    
    if photo_status == "NO_PHOTOS_AVAILABLE":
        print("   ✅ Perfect test scenario - property without photos exists")
    elif photo_status == "PHOTOS_PRESENT":
        print("   ℹ️  Test will include vision processing")