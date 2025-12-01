#!/usr/bin/env python3
"""
Comprehensive End-to-End Test for Property Evaluation System
Tests the complete flow: Create Property → Quick Evaluation → Full Evaluation → Retrieve
"""

import requests
import time
import json
from datetime import datetime

class PropertyEvaluationTester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.property_id = None
        self.quick_eval_job_id = None
        self.test_results = []
        self.start_time = None
        
    def log_result(self, test_name, success, message, duration=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "duration": duration,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"\n{status}: {test_name}")
        print(f"   {message}")
        if duration:
            print(f"   Duration: {duration:.2f}s")
        return success
    
    def test_1_create_property(self):
        """Test 1: Create New Property"""
        print("\n" + "="*70)
        print("TEST 1: Create New Property")
        print("="*70)
        
        property_data = {
            "location": "123 George Street, Sydney, NSW 2000",
            "property_type": "Apartment",
            "beds": 2,
            "baths": 2,
            "carpark": 1,
            "size": 90,
            "price": 850000,
            "features": "Modern kitchen, balcony, city views",
            "images": []
        }
        
        print(f"Creating property: {property_data['location']}")
        print(f"Type: {property_data['property_type']}, {property_data['beds']}bed/{property_data['baths']}bath/{property_data['carpark']}car")
        print(f"Size: {property_data['size']}sqm, Price: ${property_data['price']:,}")
        
        start = time.time()
        try:
            response = requests.post(
                f"{self.api_url}/properties",
                json=property_data,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            duration = time.time() - start
            
            if response.status_code == 200:
                data = response.json()
                self.property_id = data.get('id')
                
                if self.property_id:
                    return self.log_result(
                        "Create Property",
                        True,
                        f"Property created successfully. ID: {self.property_id}",
                        duration
                    )
                else:
                    return self.log_result(
                        "Create Property",
                        False,
                        "Property created but no ID returned",
                        duration
                    )
            else:
                return self.log_result(
                    "Create Property",
                    False,
                    f"Failed with status {response.status_code}: {response.text[:200]}",
                    duration
                )
                
        except Exception as e:
            duration = time.time() - start
            return self.log_result(
                "Create Property",
                False,
                f"Exception: {str(e)}",
                duration
            )
    
    def test_2_quick_evaluation(self):
        """Test 2: Quick Evaluation (without creating property)"""
        print("\n" + "="*70)
        print("TEST 2: Quick Evaluation")
        print("="*70)
        
        property_data = {
            "location": "123 George Street, Sydney, NSW 2000",
            "property_type": "Apartment",
            "beds": 2,
            "baths": 2,
            "carpark": 1,
            "size": 90,
            "price": 850000,
            "features": "Modern kitchen, balcony, city views",
            "images": []
        }
        
        print("Testing quick evaluation endpoint...")
        print("Expected: job_id returned, status polling works, evaluation completes")
        
        start = time.time()
        try:
            # Step 1: Submit quick evaluation
            response = requests.post(
                f"{self.api_url}/evaluate-quick",
                json=property_data,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code != 200:
                duration = time.time() - start
                return self.log_result(
                    "Quick Evaluation - Submit",
                    False,
                    f"Failed to submit: status {response.status_code}, {response.text[:200]}",
                    duration
                )
            
            data = response.json()
            job_id = data.get('job_id')
            
            if not job_id:
                duration = time.time() - start
                return self.log_result(
                    "Quick Evaluation - Submit",
                    False,
                    "No job_id returned in response",
                    duration
                )
            
            self.quick_eval_job_id = job_id
            print(f"   Job ID: {job_id}")
            
            # Step 2: Poll status until completed
            print("   Polling status...")
            max_polls = 40  # 80 seconds max (jobs complete in ~40s)
            poll_interval = 2
            
            for i in range(max_polls):
                time.sleep(poll_interval)
                
                status_response = requests.get(
                    f"{self.api_url}/evaluate-quick/{job_id}/status",
                    headers={'Content-Type': 'application/json'},
                    timeout=30  # Increased timeout for status poll
                )
                
                if status_response.status_code != 200:
                    continue
                
                status_data = status_response.json()
                status = status_data.get('status')
                
                print(f"   Poll {i+1}: Status = {status}")
                
                if status == 'completed':
                    duration = time.time() - start
                    
                    # Verify evaluation report - it's in result object
                    result = status_data.get('result', {})
                    evaluation = result.get('evaluation_report', '')
                    
                    # Check for required sections
                    required_sections = [
                        'VALUE RANGE',
                        'PRICE/SQM',
                        'MARKET POSITION',
                        'DAYS TO SELL',
                        'PRICING STRATEGY'
                    ]
                    
                    missing_sections = []
                    for section in required_sections:
                        if section not in evaluation:
                            missing_sections.append(section)
                    
                    if missing_sections:
                        return self.log_result(
                            "Quick Evaluation",
                            False,
                            f"Completed but missing sections: {', '.join(missing_sections)}",
                            duration
                        )
                    
                    return self.log_result(
                        "Quick Evaluation",
                        True,
                        f"Completed successfully. Report length: {len(evaluation)} chars. All required sections present.",
                        duration
                    )
                
                elif status == 'failed':
                    duration = time.time() - start
                    error = status_data.get('error', 'Unknown error')
                    return self.log_result(
                        "Quick Evaluation",
                        False,
                        f"Evaluation failed: {error}",
                        duration
                    )
            
            # Timeout
            duration = time.time() - start
            return self.log_result(
                "Quick Evaluation",
                False,
                f"Timeout after {duration:.1f}s (max 60s expected)",
                duration
            )
            
        except Exception as e:
            duration = time.time() - start
            return self.log_result(
                "Quick Evaluation",
                False,
                f"Exception: {str(e)}",
                duration
            )
    
    def test_3_full_evaluation(self):
        """Test 3: Full Property Evaluation"""
        print("\n" + "="*70)
        print("TEST 3: Full Property Evaluation")
        print("="*70)
        
        if not self.property_id:
            return self.log_result(
                "Full Property Evaluation",
                False,
                "Skipped - No property ID available from Test 1",
                0
            )
        
        print(f"Evaluating property: {self.property_id}")
        print("Expected: Evaluation completes, status tracking works, report generated")
        
        start = time.time()
        try:
            # Submit evaluation
            response = requests.post(
                f"{self.api_url}/properties/{self.property_id}/evaluate",
                headers={'Content-Type': 'application/json'},
                timeout=120  # Increased timeout - evaluation can take 60-90s
            )
            
            if response.status_code != 200:
                duration = time.time() - start
                return self.log_result(
                    "Full Property Evaluation - Submit",
                    False,
                    f"Failed to submit: status {response.status_code}, {response.text[:200]}",
                    duration
                )
            
            print("   Evaluation submitted, polling status...")
            
            # Poll status
            max_polls = 60  # 120 seconds max
            poll_interval = 2
            
            for i in range(max_polls):
                time.sleep(poll_interval)
                
                status_response = requests.get(
                    f"{self.api_url}/properties/{self.property_id}/evaluation-status",
                    headers={'Content-Type': 'application/json'},
                    timeout=30  # Increased timeout for status poll
                )
                
                if status_response.status_code != 200:
                    continue
                
                status_data = status_response.json()
                eval_status = status_data.get('evaluation_status')
                eval_stage = status_data.get('evaluation_stage', 'unknown')
                
                print(f"   Poll {i+1}: Status = {eval_status}, Stage = {eval_stage}")
                
                if eval_status == 'completed':
                    duration = time.time() - start
                    
                    # Get property to verify evaluation_report
                    prop_response = requests.get(
                        f"{self.api_url}/properties/{self.property_id}",
                        headers={'Content-Type': 'application/json'},
                        timeout=10
                    )
                    
                    if prop_response.status_code == 200:
                        prop_data = prop_response.json()
                        evaluation = prop_data.get('evaluation_report', '')
                        
                        if evaluation and len(evaluation) > 100:
                            return self.log_result(
                                "Full Property Evaluation",
                                True,
                                f"Completed successfully. Report length: {len(evaluation)} chars",
                                duration
                            )
                        else:
                            return self.log_result(
                                "Full Property Evaluation",
                                False,
                                "Completed but evaluation_report is empty or too short",
                                duration
                            )
                    else:
                        return self.log_result(
                            "Full Property Evaluation",
                            False,
                            f"Completed but failed to retrieve property: {prop_response.status_code}",
                            duration
                        )
                
                elif eval_status == 'failed':
                    duration = time.time() - start
                    return self.log_result(
                        "Full Property Evaluation",
                        False,
                        f"Evaluation failed at stage: {eval_stage}",
                        duration
                    )
            
            # Timeout
            duration = time.time() - start
            return self.log_result(
                "Full Property Evaluation",
                False,
                f"Timeout after {duration:.1f}s (max 90s expected)",
                duration
            )
            
        except Exception as e:
            duration = time.time() - start
            return self.log_result(
                "Full Property Evaluation",
                False,
                f"Exception: {str(e)}",
                duration
            )
    
    def test_4_retrieve_property(self):
        """Test 4: Retrieve Property with Evaluation"""
        print("\n" + "="*70)
        print("TEST 4: Retrieve Property with Evaluation")
        print("="*70)
        
        if not self.property_id:
            return self.log_result(
                "Retrieve Property",
                False,
                "Skipped - No property ID available",
                0
            )
        
        print(f"Retrieving property: {self.property_id}")
        
        start = time.time()
        try:
            response = requests.get(
                f"{self.api_url}/properties/{self.property_id}",
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            duration = time.time() - start
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify all fields
                required_fields = ['id', 'location', 'beds', 'baths', 'carpark', 'size', 'price']
                missing_fields = [f for f in required_fields if f not in data]
                
                if missing_fields:
                    return self.log_result(
                        "Retrieve Property",
                        False,
                        f"Missing required fields: {', '.join(missing_fields)}",
                        duration
                    )
                
                # Check evaluation_report
                evaluation = data.get('evaluation_report', '')
                if not evaluation:
                    return self.log_result(
                        "Retrieve Property",
                        False,
                        "Property retrieved but evaluation_report is empty",
                        duration
                    )
                
                # Verify data matches
                if data['location'] != "123 George Street, Sydney, NSW 2000":
                    return self.log_result(
                        "Retrieve Property",
                        False,
                        f"Location mismatch: {data['location']}",
                        duration
                    )
                
                return self.log_result(
                    "Retrieve Property",
                    True,
                    f"Property retrieved successfully with evaluation ({len(evaluation)} chars)",
                    duration
                )
            else:
                return self.log_result(
                    "Retrieve Property",
                    False,
                    f"Failed with status {response.status_code}: {response.text[:200]}",
                    duration
                )
                
        except Exception as e:
            duration = time.time() - start
            return self.log_result(
                "Retrieve Property",
                False,
                f"Exception: {str(e)}",
                duration
            )
    
    def check_backend_logs(self):
        """Check backend logs for errors"""
        print("\n" + "="*70)
        print("CHECKING BACKEND LOGS")
        print("="*70)
        
        import subprocess
        try:
            result = subprocess.run(
                ['tail', '-n', '100', '/var/log/supervisor/backend.err.log'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                logs = result.stdout
                
                # Check for critical errors
                error_keywords = ['ERROR', 'CRITICAL', 'Exception', '500', '502', 'Traceback']
                errors_found = []
                
                for line in logs.split('\n'):
                    for keyword in error_keywords:
                        if keyword in line:
                            errors_found.append(line)
                            break
                
                if errors_found:
                    print(f"⚠️  Found {len(errors_found)} error lines in backend logs:")
                    for error in errors_found[-10:]:  # Show last 10 errors
                        print(f"   {error}")
                else:
                    print("✅ No critical errors found in backend logs")
                    
        except Exception as e:
            print(f"⚠️  Could not check backend logs: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("\n" + "="*70)
        print("PROPERTY EVALUATION SYSTEM - COMPREHENSIVE E2E TEST")
        print("="*70)
        print(f"Backend URL: {self.api_url}")
        print(f"Test started: {datetime.now().isoformat()}")
        
        self.start_time = time.time()
        
        # Run tests in sequence
        test1_pass = self.test_1_create_property()
        test2_pass = self.test_2_quick_evaluation()
        test3_pass = self.test_3_full_evaluation()
        test4_pass = self.test_4_retrieve_property()
        
        # Check backend logs
        self.check_backend_logs()
        
        # Calculate total time
        total_time = time.time() - self.start_time
        
        # Print summary
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)
        
        passed = sum(1 for r in self.test_results if r['success'])
        total = len(self.test_results)
        
        print(f"\nTotal Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Total Time: {total_time:.2f}s")
        
        print("\nDetailed Results:")
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            duration = f"{result['duration']:.2f}s" if result['duration'] else "N/A"
            print(f"{status} {result['test']}: {result['message']} ({duration})")
        
        # Success criteria
        print("\n" + "="*70)
        print("SUCCESS CRITERIA CHECK")
        print("="*70)
        
        criteria = {
            "All endpoints return 200 OK": test1_pass and test2_pass and test3_pass and test4_pass,
            "Quick evaluation completes in < 60 seconds": any(r['test'] == 'Quick Evaluation' and r['success'] and r['duration'] < 60 for r in self.test_results),
            "Full evaluation generates comprehensive report": test3_pass,
            "Property data correctly stored and retrieved": test4_pass
        }
        
        all_passed = all(criteria.values())
        
        for criterion, passed in criteria.items():
            status = "✅" if passed else "❌"
            print(f"{status} {criterion}")
        
        if all_passed:
            print("\n🎉 ALL SUCCESS CRITERIA MET - SYSTEM IS PRODUCTION READY!")
            return 0
        else:
            print("\n⚠️  SOME CRITERIA NOT MET - REVIEW REQUIRED")
            return 1

def main():
    tester = PropertyEvaluationTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    import sys
    sys.exit(main())
