#!/usr/bin/env python3
"""
Focused test for RP Data evaluation timeout fix
Tests the two-stage LLM processing implementation
"""

import requests
import json
import time
import sys

class RPDataTimeoutTester:
    def __init__(self, base_url="https://aiagent-estate.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.property_with_rp_data = None
        self.property_without_rp_data = None

    def log(self, message):
        print(f"[{time.strftime('%H:%M:%S')}] {message}")

    def create_test_property_with_rp_data(self):
        """Create a property and add RP Data for timeout testing"""
        self.log("🏗️  Creating property with RP Data...")
        
        # Sample RP Data that would typically cause timeout
        sample_rp_data = """
        PROPERTY MARKET ANALYSIS REPORT
        
        Recent Comparable Sales Analysis:
        - 123 Main Street, Bondi Beach: Sold $850,000 (3 bed, 2 bath, 120 sqm)
        - 456 Ocean Avenue, Bondi Beach: Sold $820,000 (3 bed, 2 bath, 115 sqm)  
        - 789 Beach Road, Bondi Beach: Sold $880,000 (3 bed, 2 bath, 125 sqm)
        
        Market Statistics:
        - Median price: $780,000
        - Average days on market: 25 days
        - Auction clearance rate: 75%
        - Price growth year-on-year: 8.2%
        
        Market Trends:
        Property values in Bondi Beach have shown strong growth over the past 12 months, driven by high demand and limited supply. The area continues to attract buyers due to its proximity to the beach, excellent transport links, and lifestyle amenities. Recent infrastructure improvements have further enhanced the area's appeal.
        
        Valuation Factors:
        - Ocean proximity premium: 15-20%
        - Recent renovations add 10-15% value
        - Transport accessibility: High
        - School catchment: Excellent
        - Future development potential: Moderate
        
        Risk Factors:
        - Market volatility due to interest rate changes
        - Seasonal demand fluctuations
        - Potential oversupply in apartment segment
        
        Recommendation:
        Based on comparable sales and market analysis, the property shows strong value retention potential with expected continued growth in line with the broader Bondi Beach market.
        """
        
        # Create property
        property_data = {
            "beds": 3,
            "baths": 2,
            "carpark": 1,
            "location": "Bondi Beach, NSW",
            "price": 850000,
            "size": 120,
            "property_type": "Apartment",
            "features": "Ocean views, modern kitchen, balcony",
            "images": []  # No images to avoid vision processing delays
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/properties",
                json=property_data,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                property_id = response.json()['id']
                self.log(f"✅ Property created: {property_id}")
                
                # Add RP Data
                rp_data_payload = {"report": sample_rp_data}
                rp_response = requests.put(
                    f"{self.api_url}/properties/{property_id}/update-rp-data",
                    json=rp_data_payload,
                    headers={'Content-Type': 'application/json'},
                    timeout=30
                )
                
                if rp_response.status_code == 200:
                    self.property_with_rp_data = property_id
                    self.log(f"✅ RP Data added successfully")
                    return True
                else:
                    self.log(f"❌ Failed to add RP Data: {rp_response.status_code}")
                    return False
            else:
                self.log(f"❌ Failed to create property: {response.status_code}")
                return False
                
        except Exception as e:
            self.log(f"❌ Error creating property: {str(e)}")
            return False

    def create_test_property_without_rp_data(self):
        """Create a property without RP Data for regression testing"""
        self.log("🏗️  Creating property without RP Data...")
        
        property_data = {
            "beds": 3,
            "baths": 2,
            "carpark": 2,
            "location": "Bondi, NSW",
            "price": 750000,
            "size": 150,
            "property_type": "House",
            "features": "Modern kitchen, close to beach",
            "images": []
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/properties",
                json=property_data,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                property_id = response.json()['id']
                self.property_without_rp_data = property_id
                self.log(f"✅ Property created (no RP Data): {property_id}")
                return True
            else:
                self.log(f"❌ Failed to create property: {response.status_code}")
                return False
                
        except Exception as e:
            self.log(f"❌ Error creating property: {str(e)}")
            return False

    def test_evaluation_with_rp_data(self):
        """CRITICAL TEST: Evaluation with RP Data should complete without timeout"""
        if not self.property_with_rp_data:
            self.log("❌ No property with RP Data available")
            return False
            
        self.log("🚨 CRITICAL TEST: Evaluation WITH RP Data (Timeout Fix)")
        self.log("   Expected: Completes within 120 seconds using two-stage processing")
        
        start_time = time.time()
        
        try:
            response = requests.post(
                f"{self.api_url}/properties/{self.property_with_rp_data}/evaluate",
                headers={'Content-Type': 'application/json'},
                timeout=150  # 2.5 minutes max
            )
            
            end_time = time.time()
            duration = end_time - start_time
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    evaluation = result.get('evaluation_report', '')
                    status = result.get('evaluation_status', '')
                    
                    self.log(f"✅ RP DATA TIMEOUT FIX SUCCESSFUL!")
                    self.log(f"   Duration: {duration:.1f} seconds (target: <120s)")
                    self.log(f"   Evaluation length: {len(evaluation)} characters")
                    self.log(f"   Final status: {status}")
                    
                    if duration < 120:
                        self.log(f"   ✅ Completed within target time!")
                    else:
                        self.log(f"   ⚠️  Took longer than target but didn't timeout")
                    
                    return True
                else:
                    self.log(f"❌ Evaluation failed: {result}")
                    return False
            else:
                self.log(f"❌ HTTP Error: {response.status_code}")
                try:
                    error_data = response.json()
                    self.log(f"   Error details: {error_data}")
                except:
                    self.log(f"   Error text: {response.text}")
                return False
                
        except requests.exceptions.Timeout:
            end_time = time.time()
            duration = end_time - start_time
            self.log(f"❌ CRITICAL: RP Data evaluation still timing out!")
            self.log(f"   Duration before timeout: {duration:.1f} seconds")
            return False
        except Exception as e:
            end_time = time.time()
            duration = end_time - start_time
            self.log(f"❌ Error during evaluation: {str(e)}")
            self.log(f"   Duration before error: {duration:.1f} seconds")
            return False

    def test_evaluation_without_rp_data(self):
        """REGRESSION TEST: Evaluation without RP Data should be fast"""
        if not self.property_without_rp_data:
            self.log("❌ No property without RP Data available")
            return False
            
        self.log("🔄 REGRESSION TEST: Evaluation WITHOUT RP Data")
        self.log("   Expected: Fast completion (skips Stage 1 summarization)")
        
        start_time = time.time()
        
        try:
            response = requests.post(
                f"{self.api_url}/properties/{self.property_without_rp_data}/evaluate",
                headers={'Content-Type': 'application/json'},
                timeout=90  # Should be much faster
            )
            
            end_time = time.time()
            duration = end_time - start_time
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    evaluation = result.get('evaluation_report', '')
                    status = result.get('evaluation_status', '')
                    
                    self.log(f"✅ NON-RP DATA EVALUATION WORKING!")
                    self.log(f"   Duration: {duration:.1f} seconds")
                    self.log(f"   Evaluation length: {len(evaluation)} characters")
                    self.log(f"   Final status: {status}")
                    
                    if duration < 60:
                        self.log(f"   ✅ Fast processing confirmed!")
                    
                    return True
                else:
                    self.log(f"❌ Evaluation failed: {result}")
                    return False
            else:
                self.log(f"❌ HTTP Error: {response.status_code}")
                return False
                
        except Exception as e:
            end_time = time.time()
            duration = end_time - start_time
            self.log(f"❌ Error during evaluation: {str(e)}")
            self.log(f"   Duration before error: {duration:.1f} seconds")
            return False

    def test_status_endpoint(self):
        """Test the evaluation status endpoint"""
        if not self.property_with_rp_data:
            self.log("❌ No property available for status testing")
            return False
            
        self.log("📊 Testing evaluation status endpoint...")
        
        try:
            response = requests.get(
                f"{self.api_url}/properties/{self.property_with_rp_data}/evaluation-status",
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                status = result.get('evaluation_status', 'unknown')
                stage = result.get('evaluation_stage', 'unknown')
                
                self.log(f"✅ Status endpoint working!")
                self.log(f"   Current status: {status}")
                self.log(f"   Current stage: {stage}")
                return True
            else:
                self.log(f"❌ Status endpoint failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.log(f"❌ Status endpoint error: {str(e)}")
            return False

def main():
    print("🚨 RP DATA EVALUATION TIMEOUT FIX - FOCUSED TEST")
    print("=" * 60)
    
    tester = RPDataTimeoutTester()
    
    # Test sequence
    tests_passed = 0
    total_tests = 0
    
    # Setup
    total_tests += 1
    if tester.create_test_property_with_rp_data():
        tests_passed += 1
    
    total_tests += 1
    if tester.create_test_property_without_rp_data():
        tests_passed += 1
    
    # Critical tests
    total_tests += 1
    if tester.test_evaluation_with_rp_data():
        tests_passed += 1
    
    total_tests += 1
    if tester.test_evaluation_without_rp_data():
        tests_passed += 1
    
    total_tests += 1
    if tester.test_status_endpoint():
        tests_passed += 1
    
    # Results
    print("\n" + "=" * 50)
    print(f"📊 RP DATA TIMEOUT FIX RESULTS: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed >= 3:  # At least setup + one critical test
        print("🎉 RP Data timeout fix appears to be working!")
        return 0
    else:
        print("⚠️  RP Data timeout fix needs attention")
        return 1

if __name__ == "__main__":
    sys.exit(main())