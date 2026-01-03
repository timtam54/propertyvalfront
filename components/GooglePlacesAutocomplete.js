'use client';

import React, { useEffect, useRef } from 'react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';

const GooglePlacesAutocomplete = ({ value, onChange, onSelect, placeholder, required }) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const { loaded: scriptLoaded, error: scriptError } = useGoogleMaps();

  // Initialize Autocomplete
  useEffect(() => {
    if (!scriptLoaded || !inputRef.current || !window.google || scriptError) return;

    try {
      // Create autocomplete instance
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'au' }, // Restrict to Australia
        fields: ['formatted_address', 'address_components', 'geometry']
      });

      // Listen for place selection
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();

        if (place && place.formatted_address) {
          // Format the address with all components
          let formattedAddress = '';
          const components = place.address_components || [];

          // Extract components
          let streetNumber = '';
          let route = '';
          let locality = '';
          let state = '';
          let postcode = '';

          components.forEach(component => {
            const types = component.types;
            if (types.includes('street_number')) {
              streetNumber = component.long_name;
            } else if (types.includes('route')) {
              route = component.long_name;
            } else if (types.includes('locality')) {
              locality = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
              state = component.short_name;
            } else if (types.includes('postal_code')) {
              postcode = component.long_name;
            }
          });

          // Build formatted address: "123 Main Street, Suburb, State Postcode"
          formattedAddress = [
            streetNumber && route ? `${streetNumber} ${route}` : route,
            locality,
            state && postcode ? `${state} ${postcode}` : (state || postcode)
          ].filter(Boolean).join(', ');

          onSelect(formattedAddress || place.formatted_address);
        }
      });
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
    }

    return () => {
      if (autocompleteRef.current && window.google) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [scriptLoaded, onSelect, scriptError]);

  // If there's an error with Google Maps, show regular input with warning
  if (scriptError) {
    return (
      <div>
        <input
          ref={inputRef}
          type="text"
          id="location"
          name="location"
          value={value}
          onChange={(e) => onChange(e)}
          placeholder={placeholder}
          required={required}
          className="form-input"
          autoComplete="off"
        />
        <p style={{
          fontSize: '0.75rem',
          color: '#f59e0b',
          marginTop: '0.25rem',
          fontStyle: 'italic'
        }}>
          ⚠️ Google Places autocomplete unavailable. Please check your API key configuration.
        </p>
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      id="location"
      name="location"
      value={value}
      onChange={(e) => onChange(e)}
      placeholder={placeholder}
      required={required}
      className="form-input"
      autoComplete="off"
    />
  );
};

export default GooglePlacesAutocomplete;
