import requests
import sys
import json
import asyncio
import threading
import time
from datetime import datetime

# Import the scraper functions for direct testing
sys.path.append('/app/backend')
try:
    from property_scraper import get_comparable_properties, calculate_price_per_sqm, scrape_domain_properties, scrape_realestate_properties
    SCRAPER_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Could not import property_scraper: {e}")
    SCRAPER_AVAILABLE = False

class RealEstateAPITester:
    def __init__(self, base_url="https://aiagent-estate.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_property_id = None
        self.created_property_id_no_images = None
        self.created_property_with_rp_data = None

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else self.api_url
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout after {timeout}s")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_create_property(self):
        """Test creating a new property"""
        test_property = {
            "beds": 3,
            "baths": 2,
            "carpark": 1,
            "location": "123 Test Street, Test City",
            "price": 750000,
            "size": 200,
            "property_type": "House",
            "features": "Modern kitchen, garden, solar panels",
            "images": [
                "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
            ]
        }
        
        success, response = self.run_test(
            "Create Property",
            "POST",
            "properties",
            200,
            data=test_property
        )
        
        if success and 'id' in response:
            self.created_property_id = response['id']
            print(f"   Created property ID: {self.created_property_id}")
            return True
        return False

    def test_create_property_no_images(self):
        """Test creating a property without images to avoid vision errors"""
        test_property = {
            "beds": 3,
            "baths": 2,
            "carpark": 2,
            "location": "Bondi, NSW",
            "price": 750000,
            "size": 150,
            "property_type": "House",
            "features": "Modern kitchen, close to beach",
            "images": []  # No images to avoid vision processing errors
        }
        
        success, response = self.run_test(
            "Create Property (No Images)",
            "POST",
            "properties",
            200,
            data=test_property
        )
        
        if success and 'id' in response:
            self.created_property_id_no_images = response['id']
            print(f"   Created property ID (no images): {self.created_property_id_no_images}")
            return True
        return False

    def test_get_properties(self):
        """Test getting all properties"""
        success, response = self.run_test(
            "Get All Properties",
            "GET",
            "properties",
            200
        )
        
        if success:
            print(f"   Found {len(response)} properties")
            return True
        return False

    def test_get_single_property(self):
        """Test getting a single property by ID"""
        if not self.created_property_id:
            print("❌ Skipping - No property ID available")
            return False
            
        success, response = self.run_test(
            "Get Single Property",
            "GET",
            f"properties/{self.created_property_id}",
            200
        )
        
        if success and response.get('id') == self.created_property_id:
            print(f"   Retrieved property: {response.get('location')}")
            return True
        return False

    def test_generate_pitch(self):
        """Test AI pitch generation"""
        if not self.created_property_id:
            print("❌ Skipping - No property ID available")
            return False
            
        print("   Note: This test may take 10-30 seconds due to AI processing...")
        success, response = self.run_test(
            "Generate AI Pitch",
            "POST",
            f"properties/{self.created_property_id}/generate-pitch",
            200,
            timeout=60  # Longer timeout for AI processing
        )
        
        if success and response.get('success') and response.get('pitch'):
            print(f"   Generated pitch length: {len(response['pitch'])} characters")
            print(f"   Pitch preview: {response['pitch'][:100]}...")
            return True
        return False

    def test_invalid_property_id(self):
        """Test getting property with invalid ID"""
        success, response = self.run_test(
            "Get Invalid Property",
            "GET",
            "properties/invalid-id-123",
            404
        )
        return success

    def test_create_property_missing_fields(self):
        """Test creating property with missing required fields"""
        invalid_property = {
            "beds": 3,
            # Missing required fields: baths, carpark, location
        }
        
        success, response = self.run_test(
            "Create Property - Missing Fields",
            "POST",
            "properties",
            422  # Validation error
        )
        return success

    def test_api_settings_get(self):
        """Test getting API settings"""
        success, response = self.run_test(
            "Get API Settings",
            "GET",
            "api-settings",
            200
        )
        
        if success:
            print(f"   API Settings response: {response.get('success', False)}")
            return True
        return False

    def test_api_settings_post(self):
        """Test saving API settings"""
        test_settings = {
            "domain_api_key": "test_domain_key_12345",
            "corelogic_api_key": "test_corelogic_key_67890",
            "realestate_api_key": "test_realestate_key_abcde",
            "pricefinder_api_key": "test_pricefinder_key_fghij"
        }
        
        success, response = self.run_test(
            "Save API Settings",
            "POST",
            "api-settings",
            200,
            data=test_settings
        )
        
        if success and response.get('success'):
            print(f"   Settings saved: {response.get('message', 'Success')}")
            return True
        return False

    def test_quick_evaluation(self):
        """Test quick property evaluation endpoint - FIXED VERSION"""
        # Using exact test data from review request
        test_property_data = {
            "beds": 3,
            "baths": 2,
            "carpark": 2,
            "location": "Bondi, NSW",
            "price": 750000,  # Exact price from review request
            "size": 150,      # Exact size from review request
            "property_type": "house",
            "features": "Modern kitchen, ocean views, renovated"
        }
        
        print("   Note: Testing FIXED version - should handle None values gracefully...")
        print("   Expected: No format string errors, $0 for None values, correct price per sqm ($5000)")
        success, response = self.run_test(
            "Quick Property Evaluation (FIXED)",
            "POST",
            "evaluate-quick",
            200,
            data=test_property_data,
            timeout=90  # Longer timeout for scraping and AI
        )
        
        if success and response.get('success'):
            evaluation = response.get('evaluation_report', '')
            comparables = response.get('comparables_data', {})
            price_per_sqm = response.get('price_per_sqm')
            
            print(f"   ✅ No 500 errors - None value formatting fixed!")
            print(f"   Evaluation length: {len(evaluation)} characters")
            print(f"   Comparables found: {comparables.get('statistics', {}).get('total_found', 0)}")
            print(f"   Price per sqm: ${price_per_sqm}" if price_per_sqm else "   Price per sqm: Not calculated")
            
            # Verify expected price per sqm calculation
            expected_price_per_sqm = 750000 / 150  # Should be 5000
            if price_per_sqm and abs(price_per_sqm - expected_price_per_sqm) < 0.01:
                print(f"   ✅ Price per sqm calculation correct: ${price_per_sqm}/sqm")
            elif price_per_sqm:
                print(f"   ⚠️  Price per sqm unexpected: ${price_per_sqm}/sqm (expected ${expected_price_per_sqm}/sqm)")
            
            # Check if we got meaningful data
            if evaluation and len(evaluation) > 100:
                print(f"   ✅ Evaluation report generated successfully")
                return True
            else:
                print("   ⚠️  Warning: Evaluation seems too short or empty")
                return False
        else:
            print(f"   ❌ CRITICAL: Still getting errors - None value fix may not be working")
            return False

    def test_property_evaluation(self):
        """Test property evaluation with existing property - FIXED VERSION"""
        if not self.created_property_id:
            print("❌ Skipping - No property ID available")
            return False
            
        print("   Note: Testing FIXED version - should handle None values and empty scraping results...")
        print("   Expected: No format string errors, $0 for None values, successful completion")
        success, response = self.run_test(
            "Property Evaluation with Scraping (FIXED)",
            "POST",
            f"properties/{self.created_property_id}/evaluate",
            200,
            timeout=90  # Longer timeout for scraping and AI
        )
        
        if success and response.get('success'):
            evaluation = response.get('evaluation_report', '')
            comparables = response.get('comparables_data', {})
            improvements = response.get('improvements_detected', '')
            price_per_sqm = response.get('price_per_sqm')
            
            print(f"   ✅ No 500 errors - None value formatting fixed!")
            print(f"   Evaluation length: {len(evaluation)} characters")
            print(f"   Improvements detected: {len(improvements)} characters")
            print(f"   Comparables found: {comparables.get('statistics', {}).get('total_found', 0)}")
            print(f"   Price per sqm: ${price_per_sqm}" if price_per_sqm else "   Price per sqm: Not calculated")
            
            # Check if we got meaningful data
            if evaluation and len(evaluation) > 100:
                print(f"   ✅ Evaluation report generated successfully")
                return True
            else:
                print("   ⚠️  Warning: Evaluation seems too short or empty")
                return False
        else:
            print(f"   ❌ CRITICAL: Still getting errors - None value fix may not be working")
            return False

    def test_property_evaluation_no_images(self):
        """Test property evaluation without images to avoid vision errors"""
        if not self.created_property_id_no_images:
            print("❌ Skipping - No property ID (no images) available")
            return False
            
        print("   Note: Testing property without images - should avoid vision processing errors...")
        success, response = self.run_test(
            "Property Evaluation (No Images)",
            "POST",
            f"properties/{self.created_property_id_no_images}/evaluate",
            200,
            timeout=90
        )
        
        if success and response.get('success'):
            evaluation = response.get('evaluation_report', '')
            improvements = response.get('improvements_detected', '')
            
            print(f"   ✅ No vision processing errors!")
            print(f"   Evaluation length: {len(evaluation)} characters")
            print(f"   Improvements detected: {len(improvements)} characters")
            
            # Should mention no photos provided
            if "NO PHOTOS" in improvements or "no photos" in improvements.lower():
                print(f"   ✅ Correctly handled missing photos")
            
            if evaluation and len(evaluation) > 100:
                print(f"   ✅ Evaluation completed successfully without images")
                return True
            else:
                print("   ⚠️  Warning: Evaluation seems too short")
                return False
        else:
            print(f"   ❌ CRITICAL: Still getting errors even without images")
            return False

    def test_create_property_with_rp_data(self):
        """Create a property with RP Data for timeout testing"""
        sample_rp_data = """Recent comparable sales: 123 Main St sold for $800k, 456 Oak Ave sold for $750k. Market is strong with median price $780k. Property values have increased 8% year-on-year. Days on market average 25 days. Auction clearance rate 75%. Strong demand in this location due to proximity to schools and transport. Recent renovations in the area have lifted property values. Market outlook positive with continued growth expected."""
        
        test_property = {
            "beds": 3,
            "baths": 2,
            "carpark": 2,
            "location": "Bondi Beach, NSW",
            "price": 850000,
            "size": 120,
            "property_type": "Apartment",
            "features": "Ocean views, modern kitchen, balcony",
            "images": []  # No images to avoid vision processing delays
        }
        
        success, response = self.run_test(
            "Create Property with RP Data",
            "POST",
            "properties",
            200,
            data=test_property
        )
        
        if success and 'id' in response:
            property_id = response['id']
            print(f"   Created property ID for RP Data testing: {property_id}")
            
            # Add RP Data to the property
            rp_data_payload = {"report": sample_rp_data}
            try:
                url = f"{self.api_url}/properties/{property_id}/update-rp-data"
                headers = {'Content-Type': 'application/json'}
                rp_response = requests.put(url, json=rp_data_payload, headers=headers, timeout=30)
                rp_success = rp_response.status_code == 200
                print(f"   RP Data update status: {rp_response.status_code}")
            except Exception as e:
                print(f"   RP Data update error: {str(e)}")
                rp_success = False
            
            if rp_success:
                self.created_property_with_rp_data = property_id
                print(f"   ✅ RP Data added successfully")
                return True
            else:
                print(f"   ❌ Failed to add RP Data")
                return False
        return False

    def test_evaluation_with_rp_data_timeout_fix(self):
        """CRITICAL TEST: Test evaluation WITH RP Data - verify it completes without timing out"""
        if not hasattr(self, 'created_property_with_rp_data') or not self.created_property_with_rp_data:
            print("❌ Skipping - No property with RP Data available")
            return False
            
        print("   🚨 CRITICAL TEST: RP Data evaluation timeout fix")
        print("   Expected: Completes within 120 seconds (previously timed out)")
        print("   Two-stage processing: Stage 1 (summarize RP Data) + Stage 2 (main evaluation)")
        
        import time
        start_time = time.time()
        
        success, response = self.run_test(
            "Evaluation WITH RP Data (Timeout Fix)",
            "POST",
            f"properties/{self.created_property_with_rp_data}/evaluate",
            200,
            timeout=150  # 2.5 minutes - should complete within 120s
        )
        
        end_time = time.time()
        duration = end_time - start_time
        
        if success and response.get('success'):
            evaluation = response.get('evaluation_report', '')
            status = response.get('evaluation_status', '')
            
            print(f"   ✅ TIMEOUT FIX SUCCESSFUL!")
            print(f"   Duration: {duration:.1f} seconds (target: <120s)")
            print(f"   Evaluation length: {len(evaluation)} characters")
            print(f"   Final status: {status}")
            
            if duration < 120:
                print(f"   ✅ Completed within target time!")
            else:
                print(f"   ⚠️  Took longer than target but didn't timeout")
            
            if evaluation and len(evaluation) > 500:
                print(f"   ✅ Comprehensive evaluation report generated")
                return True
            else:
                print("   ⚠️  Warning: Evaluation seems too short")
                return False
        else:
            print(f"   ❌ CRITICAL: RP Data evaluation still timing out or failing!")
            print(f"   Duration before failure: {duration:.1f} seconds")
            return False

    def test_evaluation_without_rp_data_regression(self):
        """CRITICAL TEST: Test evaluation WITHOUT RP Data - verify it still works instantly"""
        if not self.created_property_id_no_images:
            print("❌ Skipping - No property without RP Data available")
            return False
            
        print("   🚨 REGRESSION TEST: Evaluation without RP Data should be fast")
        print("   Expected: Completes within 30-40 seconds (skips Stage 1)")
        
        import time
        start_time = time.time()
        
        success, response = self.run_test(
            "Evaluation WITHOUT RP Data (Regression Test)",
            "POST",
            f"properties/{self.created_property_id_no_images}/evaluate",
            200,
            timeout=60  # Should be much faster
        )
        
        end_time = time.time()
        duration = end_time - start_time
        
        if success and response.get('success'):
            evaluation = response.get('evaluation_report', '')
            status = response.get('evaluation_status', '')
            
            print(f"   ✅ NON-RP DATA EVALUATION WORKING!")
            print(f"   Duration: {duration:.1f} seconds (target: <40s)")
            print(f"   Evaluation length: {len(evaluation)} characters")
            print(f"   Final status: {status}")
            
            if duration < 40:
                print(f"   ✅ Fast processing confirmed - Stage 1 skipped!")
            else:
                print(f"   ⚠️  Slower than expected but still working")
            
            if evaluation and len(evaluation) > 100:
                print(f"   ✅ Evaluation report generated successfully")
                return True
            else:
                print("   ⚠️  Warning: Evaluation seems too short")
                return False
        else:
            print(f"   ❌ CRITICAL: Non-RP Data evaluation broken!")
            print(f"   Duration before failure: {duration:.1f} seconds")
            return False

    def test_evaluation_status_endpoint(self):
        """Test the new evaluation status endpoint"""
        if not hasattr(self, 'created_property_with_rp_data') or not self.created_property_with_rp_data:
            print("❌ Skipping - No property with RP Data available")
            return False
            
        success, response = self.run_test(
            "Evaluation Status Endpoint",
            "GET",
            f"properties/{self.created_property_with_rp_data}/evaluation-status",
            200
        )
        
        if success:
            status = response.get('evaluation_status', '')
            stage = response.get('evaluation_stage', '')
            
            print(f"   ✅ Status endpoint working!")
            print(f"   Current status: {status}")
            print(f"   Current stage: {stage}")
            
            # Status should be one of: in_progress, completed, failed
            valid_statuses = ['in_progress', 'completed', 'failed']
            if status in valid_statuses:
                print(f"   ✅ Valid status returned")
                return True
            else:
                print(f"   ⚠️  Unexpected status: {status}")
                return False
        else:
            print(f"   ❌ Status endpoint failed")
            return False

    def test_evaluation_status_polling_simulation(self):
        """Simulate status polling during evaluation"""
        if not hasattr(self, 'created_property_with_rp_data') or not self.created_property_with_rp_data:
            print("❌ Skipping - No property with RP Data available")
            return False
            
        print("   🔄 POLLING TEST: Simulating status polling during evaluation")
        print("   Expected stages: starting → analyzing_photos → fetching_comparables → processing_rp_data → generating_evaluation → completed")
        
        import threading
        import time
        
        # Start evaluation in background
        evaluation_started = False
        evaluation_result = {}
        
        def start_evaluation():
            nonlocal evaluation_started, evaluation_result
            evaluation_started = True
            try:
                url = f"{self.api_url}/properties/{self.created_property_with_rp_data}/evaluate"
                headers = {'Content-Type': 'application/json'}
                response = requests.post(url, headers=headers, timeout=150)
                evaluation_result = {'success': response.status_code == 200, 'response': response}
            except Exception as e:
                evaluation_result = {'success': False, 'error': str(e)}
        
        # Start evaluation thread
        eval_thread = threading.Thread(target=start_evaluation)
        eval_thread.start()
        
        # Wait for evaluation to start
        time.sleep(2)
        
        # Poll status multiple times
        stages_seen = []
        poll_count = 0
        max_polls = 30  # Poll for up to 60 seconds
        
        while eval_thread.is_alive() and poll_count < max_polls:
            try:
                url = f"{self.api_url}/properties/{self.created_property_with_rp_data}/evaluation-status"
                headers = {'Content-Type': 'application/json'}
                response = requests.get(url, headers=headers, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    stage = data.get('evaluation_stage', 'unknown')
                    status = data.get('evaluation_status', 'unknown')
                    
                    if stage not in stages_seen:
                        stages_seen.append(stage)
                        print(f"   📊 Stage {len(stages_seen)}: {stage} (status: {status})")
                
                poll_count += 1
                time.sleep(2)  # Poll every 2 seconds
                
            except Exception as e:
                print(f"   ⚠️  Polling error: {str(e)}")
                break
        
        # Wait for evaluation to complete
        eval_thread.join(timeout=120)
        
        self.tests_run += 1
        
        if len(stages_seen) >= 3:  # Should see at least a few stages
            print(f"   ✅ Status polling working - saw {len(stages_seen)} stages")
            print(f"   Stages observed: {' → '.join(stages_seen)}")
            self.tests_passed += 1
            return True
        else:
            print(f"   ❌ Status polling incomplete - only saw {len(stages_seen)} stages")
            print(f"   Stages observed: {' → '.join(stages_seen)}")
            return False

    def test_error_handling_invalid_property(self):
        """Test error handling with invalid property ID"""
        success, response = self.run_test(
            "Evaluation Status - Invalid Property",
            "GET",
            "properties/invalid-id-999/evaluation-status",
            404
        )
        
        if success:
            print(f"   ✅ Proper 404 error for invalid property ID")
            return True
        else:
            print(f"   ❌ Error handling not working correctly")
            return False
    def test_web_scraping_direct(self):
        """Test web scraping functions directly"""
        if not SCRAPER_AVAILABLE:
            print("❌ Skipping - Property scraper not available")
            return False
            
        print("   Testing web scraping functions directly...")
        print("   Note: This may take 15-30 seconds...")
        
        try:
            # Test the scraper functions directly
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            # Test comparable properties function
            comparables = loop.run_until_complete(
                get_comparable_properties("Bondi, NSW", 3, 2, "house")
            )
            
            loop.close()
            
            self.tests_run += 1
            print(f"🔍 Testing Direct Web Scraping...")
            
            if comparables:
                stats = comparables.get('statistics', {})
                sold_count = stats.get('sold_count', 0)
                listing_count = stats.get('listing_count', 0)
                total_found = stats.get('total_found', 0)
                
                print(f"✅ Passed - Web Scraping")
                print(f"   Total properties found: {total_found}")
                print(f"   Sold properties: {sold_count}")
                print(f"   Current listings: {listing_count}")
                
                if total_found > 0:
                    print(f"   Price range: ${stats.get('price_range', {}).get('min', 0):,} - ${stats.get('price_range', {}).get('max', 0):,}")
                    print(f"   Average price: ${stats.get('price_range', {}).get('avg', 0):,}")
                
                self.tests_passed += 1
                return True
            else:
                print(f"❌ Failed - No data returned from scrapers")
                return False
                
        except Exception as e:
            self.tests_run += 1
            print(f"❌ Failed - Web scraping error: {str(e)}")
            return False

    def test_price_per_sqm_calculation(self):
        """Test price per square meter calculation"""
        if not SCRAPER_AVAILABLE:
            print("❌ Skipping - Property scraper not available")
            return False
            
        self.tests_run += 1
        print(f"🔍 Testing Price per SQM Calculation...")
        
        try:
            # Test valid calculation
            result1 = calculate_price_per_sqm(750000, 150)  # Should be 5000
            result2 = calculate_price_per_sqm(1200000, 200)  # Should be 6000
            result3 = calculate_price_per_sqm(0, 150)  # Should be None
            result4 = calculate_price_per_sqm(750000, 0)  # Should be None
            
            if result1 == 5000.0 and result2 == 6000.0 and result3 is None and result4 is None:
                print(f"✅ Passed - Price per SQM Calculation")
                print(f"   $750,000 ÷ 150 sqm = ${result1}/sqm")
                print(f"   $1,200,000 ÷ 200 sqm = ${result2}/sqm")
                self.tests_passed += 1
                return True
            else:
                print(f"❌ Failed - Incorrect calculations: {result1}, {result2}, {result3}, {result4}")
                return False
                
        except Exception as e:
            print(f"❌ Failed - Calculation error: {str(e)}")
            return False

def main():
    print("🏠 Real Estate API Testing Suite - Web Scraping & Evaluation")
    print("=" * 70)
    
    tester = RealEstateAPITester()
    
    # Test sequence - prioritizing RP Data timeout fix tests
    tests = [
        ("Root Endpoint", tester.test_root_endpoint),
        ("Price per SQM Calculation", tester.test_price_per_sqm_calculation),
        ("Direct Web Scraping", tester.test_web_scraping_direct),
        ("Get API Settings", tester.test_api_settings_get),
        ("Save API Settings", tester.test_api_settings_post),
        ("Create Property", tester.test_create_property),
        ("Create Property (No Images)", tester.test_create_property_no_images),
        ("Create Property with RP Data", tester.test_create_property_with_rp_data),
        # CRITICAL RP DATA TIMEOUT FIX TESTS
        ("🚨 CRITICAL: Evaluation WITH RP Data (Timeout Fix)", tester.test_evaluation_with_rp_data_timeout_fix),
        ("🚨 REGRESSION: Evaluation WITHOUT RP Data (Fast)", tester.test_evaluation_without_rp_data_regression),
        ("Evaluation Status Endpoint", tester.test_evaluation_status_endpoint),
        ("Status Polling Simulation", tester.test_evaluation_status_polling_simulation),
        ("Error Handling - Invalid Property", tester.test_error_handling_invalid_property),
        # Other evaluation tests
        ("Quick Property Evaluation (FIXED)", tester.test_quick_evaluation),
        ("Property Evaluation with Scraping (FIXED)", tester.test_property_evaluation),
        ("Property Evaluation (No Images)", tester.test_property_evaluation_no_images),
        ("Get All Properties", tester.test_get_properties),
        ("Get Single Property", tester.test_get_single_property),
        ("Generate AI Pitch", tester.test_generate_pitch),
        ("Invalid Property ID", tester.test_invalid_property_id),
        ("Missing Required Fields", tester.test_create_property_missing_fields),
    ]
    
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())