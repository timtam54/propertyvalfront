#!/usr/bin/env node

/**
 * Script to update historic sales weights with new ultra_close distance threshold
 * Run with: node scripts/update-distance-weights.js
 */

const BACKEND_URL = process.env.BACKEND_URL || 'https://propertyval-api.azurewebsites.net';

async function updateWeights() {
  console.log('Fetching current weights...');

  // Get current weights
  const getResponse = await fetch(`${BACKEND_URL}/api/historic-sales-weights`);
  if (!getResponse.ok) {
    console.error('Failed to fetch weights:', await getResponse.text());
    process.exit(1);
  }

  const currentWeights = await getResponse.json();
  console.log('Current weights ID:', currentWeights.id);
  console.log('Current distance settings:');
  console.log('  - distance_ultra_close_bonus:', currentWeights.distance_ultra_close_bonus ?? 'NOT SET');
  console.log('  - distance_ultra_close_threshold_km:', currentWeights.distance_ultra_close_threshold_km ?? 'NOT SET');
  console.log('  - distance_very_close_bonus:', currentWeights.distance_very_close_bonus);
  console.log('  - distance_very_close_threshold_km:', currentWeights.distance_very_close_threshold_km);
  console.log('  - distance_close_bonus:', currentWeights.distance_close_bonus);
  console.log('  - distance_close_threshold_km:', currentWeights.distance_close_threshold_km);

  // New distance values
  const updatedDistanceSettings = {
    // New ultra close tier
    distance_ultra_close_bonus: 40,
    distance_ultra_close_threshold_km: 0.2,  // 200m
    // Adjusted existing tiers
    distance_very_close_bonus: 30,
    distance_very_close_threshold_km: 0.35,  // 350m
    distance_close_bonus: 15,
    distance_close_threshold_km: 0.5,        // 500m
    distance_moderate_penalty: 8,
    distance_moderate_threshold_km: 1,       // 1km
    distance_far_penalty: 15,
    distance_far_threshold_km: 2,            // 2km
    distance_very_far_penalty: 25,
    distance_very_far_threshold_km: 5,       // 5km
  };

  console.log('\nUpdating with new distance settings:');
  console.log('  - Ultra Close: 0-200m → +40 bonus');
  console.log('  - Very Close: 200-350m → +30 bonus');
  console.log('  - Close: 350-500m → +15 bonus');
  console.log('  - Neutral: 500m-1km → no adjustment');
  console.log('  - Moderate: 1-2km → -8 penalty');
  console.log('  - Far: 2-5km → -15 penalty');
  console.log('  - Very Far: >5km → -25 penalty');

  // Update weights
  const updateResponse = await fetch(`${BACKEND_URL}/api/historic-sales-weights/${currentWeights.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedDistanceSettings),
  });

  if (!updateResponse.ok) {
    console.error('\nFailed to update weights:', await updateResponse.text());
    process.exit(1);
  }

  const updatedWeights = await updateResponse.json();
  console.log('\n✅ Weights updated successfully!');
  console.log('Updated at:', updatedWeights.updated_at);

  // Verify
  console.log('\nVerifying new settings:');
  console.log('  - distance_ultra_close_bonus:', updatedWeights.distance_ultra_close_bonus);
  console.log('  - distance_ultra_close_threshold_km:', updatedWeights.distance_ultra_close_threshold_km);
  console.log('  - distance_very_close_bonus:', updatedWeights.distance_very_close_bonus);
  console.log('  - distance_very_close_threshold_km:', updatedWeights.distance_very_close_threshold_km);
}

updateWeights().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
