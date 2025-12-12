import React, { useEffect, useRef, useState } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const GooglePlacesAutocomplete = ({ value, onChange, onSelect, placeholder, required }) => {
  const inputRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const [scriptError, setScriptError] = useState(false);
  const autocompleteRef = useRef(null);
  const errorListenerRef = useRef(null);

  // Load Google API key from settings
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/google-places-key`);
        const data = await response.json();
        if (data.success && data.api_key) {
          setApiKey(data.api_key);
        }
      } catch (error) {
        console.error('Failed to load Google API key:', error);
        setScriptError(true);
      }
    };

    loadApiKey();
  }, []);

  // Listen for Google Maps API errors
  useEffect(() => {
    const handleGoogleError = (error) => {
      console.error('Google Maps API Error:', error);
      setScriptError(true);
    };

    // Listen for Google Maps authentication failures
    errorListenerRef.current = (event) => {
      if (event && event.type === 'error' && event.target && 
          event.target.src && event.target.src.includes('maps.googleapis.com')) {
        handleGoogleError('Google Maps script failed to load');
      }
    };

    window.addEventListener('error', errorListenerRef.current, true);

    // Check for gm_authFailure callback (Google's error callback)
    window.gm_authFailure = () => {
      console.error('Google Maps authentication failure - Invalid API key');
      setScriptError(true);
    };

    return () => {
      if (errorListenerRef.current) {
        window.removeEventListener('error', errorListenerRef.current, true);
      }
    };
  }, []);

  // Wait for Google Maps Script (loaded by main page's Script component)
  useEffect(() => {
    if (scriptLoaded || scriptError) return;

    // Check if script already exists
    if (window.google && window.google.maps && window.google.maps.places) {
      setScriptLoaded(true);
      return;
    }

    // Poll for Google Maps to be loaded (loaded by page's Script component)
    const checkInterval = setInterval(() => {
      if (window.google && window.google.maps && window.google.maps.places) {
        clearInterval(checkInterval);
        setScriptLoaded(true);
      }
    }, 100);

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      if (!window.google?.maps?.places) {
        console.error('Google Maps failed to load after 10 seconds');
        setScriptError(true);
      }
    }, 10000);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, [scriptLoaded, scriptError]);

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
      setScriptError(true);
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
          ⚠️ Google Places autocomplete unavailable. Please update your API key in Settings.
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
