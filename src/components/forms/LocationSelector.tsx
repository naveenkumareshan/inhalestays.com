import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useLocations } from '@/hooks/useLocations';
import { City, Area } from '@/api/locationsService';

interface LocationSelectorProps {
  selectedCountry?: string;
  selectedState?: string;
  selectedCity?: string;
  selectedArea?: string;
  onCountryChange?: (countryId: string) => void;
  onStateChange?: (stateId: string) => void;
  onCityChange?: (cityId: string) => void;
  onAreaChange?: (areaId: string) => void;
  showCountry?: boolean;
  showState?: boolean;
  showCity?: boolean;
  showArea?: boolean;
  disabled?: boolean;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedState,
  selectedCity,
  selectedArea,
  onStateChange,
  onCityChange,
  onAreaChange,
  showState = true,
  showCity = true,
  showArea = true,
  disabled = false
}) => {
  const { states, getCitiesByState, getAreasByCity } = useLocations();

  const [localCities, setLocalCities] = useState<City[]>([]);
  const [localAreas, setLocalAreas] = useState<Area[]>([]);

  useEffect(() => {
    if (selectedState) {
      getCitiesByState(selectedState).then(setLocalCities);
    } else {
      setLocalCities([]);
    }
  }, [selectedState]);

  useEffect(() => {
    if (selectedCity) {
      getAreasByCity(selectedCity).then(setLocalAreas);
    } else {
      setLocalAreas([]);
    }
  }, [selectedCity]);

  const handleStateChange = (stateId: string) => {
    onStateChange?.(stateId);
    onCityChange?.('');
    onAreaChange?.('');
  };

  const handleCityChange = (cityId: string) => {
    onCityChange?.(cityId);
    onAreaChange?.('');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {showState && (
        <div>
          <label className="text-sm font-medium mb-1 block">State</label>
          <Select value={selectedState || undefined} onValueChange={handleStateChange} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {states.map((state) => (
                <SelectItem key={state.id} value={state.id}>
                  {state.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showCity && (
        <div>
          <label className="text-sm font-medium mb-1 block">City</label>
          <Select value={selectedCity || undefined} onValueChange={handleCityChange} disabled={disabled || !selectedState}>
            <SelectTrigger>
              <SelectValue placeholder="Select city" />
            </SelectTrigger>
            <SelectContent>
              {localCities.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">No cities found</div>
              ) : (
                localCities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {showArea && (
        <div>
          <label className="text-sm font-medium mb-1 block">Area</label>
          <Select value={selectedArea || undefined} onValueChange={onAreaChange} disabled={disabled || !selectedCity}>
            <SelectTrigger>
              <SelectValue placeholder="Select area" />
            </SelectTrigger>
            <SelectContent>
              {localAreas.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  {selectedCity ? 'No areas found — add areas in Location Management' : 'Select a city first'}
                </div>
              ) : (
                localAreas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
