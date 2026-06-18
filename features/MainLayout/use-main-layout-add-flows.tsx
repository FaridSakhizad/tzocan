import React from 'react';
import { useGlobalSearchParams, usePathname } from 'expo-router';

import { AddCityModal, type CityRow } from '@/components/add-city-modal';
import { NotificationModal, type NotificationFormValues } from '@/components/notification-modal';
import { useEditMode } from '@/contexts/edit-mode-context';
import { useSelectedCities } from '@/contexts/selected-cities-context';
import { useLocalizedCityNames } from '@/hooks/use-localized-city-names';
import { RouteNamePaths } from '@/types/router';
import { getCityDisplayName } from '@/utils/city-display';

type UseMainLayoutAddFlowsOptions = {
  onBeforeOpenAddCity?: () => void;
  onBeforeOpenAddReminder?: () => void;
};

export function useMainLayoutAddFlows({
  onBeforeOpenAddCity,
  onBeforeOpenAddReminder,
}: UseMainLayoutAddFlowsOptions = {}) {
  const pathname = usePathname();
  const globalParams = useGlobalSearchParams<{ cityId?: string }>();
  const { isEditMode } = useEditMode();
  const { selectedCities, addCity, addNotification } = useSelectedCities();
  const localizedCityNames = useLocalizedCityNames(selectedCities.map((city) => city.cityId));

  const [isAddCityModalVisible, setIsAddCityModalVisible] = React.useState(false);
  const [isAddReminderModalVisible, setIsAddReminderModalVisible] = React.useState(false);
  const [selectedAddReminderCityId, setSelectedAddReminderCityId] = React.useState<number | null>(null);

  const canAddReminder = selectedCities.length > 0;

  const reminderCityOptions = React.useMemo(
    () => selectedCities.map((city) => ({
      id: city.id,
      label: getCityDisplayName(city, localizedCityNames[city.cityId]),
      hint: city.tz,
      timezone: city.tz,
    })),
    [localizedCityNames, selectedCities]
  );

  const selectedAddReminderCity = React.useMemo(
    () => selectedCities.find((city) => city.id === selectedAddReminderCityId) || null,
    [selectedCities, selectedAddReminderCityId]
  );

  const openAddCityModal = React.useCallback(() => {
    if (isEditMode) {
      return;
    }

    onBeforeOpenAddCity?.();
    setIsAddCityModalVisible(true);
  }, [isEditMode, onBeforeOpenAddCity]);

  const closeAddCityModal = React.useCallback(() => {
    setIsAddCityModalVisible(false);
  }, []);

  const saveCity = React.useCallback((city: CityRow) => {
    addCity(city);
    setIsAddCityModalVisible(false);
  }, [addCity]);

  const openAddReminderModal = React.useCallback(() => {
    if (isEditMode || selectedCities.length === 0) {
      return;
    }

    const currentCityId = pathname === RouteNamePaths.editCity && globalParams.cityId
      ? Number(globalParams.cityId)
      : null;

    const defaultCityId =
      currentCityId && selectedCities.some((city) => city.id === currentCityId)
        ? currentCityId
        : null;

    onBeforeOpenAddReminder?.();
    setSelectedAddReminderCityId(defaultCityId);
    setIsAddReminderModalVisible(true);
  }, [globalParams.cityId, isEditMode, onBeforeOpenAddReminder, pathname, selectedCities]);

  const closeAddReminderModal = React.useCallback(() => {
    setIsAddReminderModalVisible(false);
  }, []);

  const saveReminder = React.useCallback(async (values: NotificationFormValues) => {
    if (!selectedAddReminderCityId) {
      return false;
    }

    const didSave = await addNotification(
      selectedAddReminderCityId,
      values.hour,
      values.minute,
      values.year,
      values.month,
      values.day,
      values.label,
      values.notes,
      values.url,
      values.repeat,
      values.weekdays,
      values.calendarId,
      values.calendarTitle,
      values.durationMinutes
    );

    if (didSave) {
      setIsAddReminderModalVisible(false);
    }

    return didSave;
  }, [addNotification, selectedAddReminderCityId]);

  const addFlowModals = (
    <>
      <AddCityModal
        visible={isAddCityModalVisible}
        onClose={closeAddCityModal}
        onSave={saveCity}
      />

      <NotificationModal
        visible={isAddReminderModalVisible}
        cityName={selectedAddReminderCity ? getCityDisplayName(selectedAddReminderCity, localizedCityNames[selectedAddReminderCity.cityId]) : ''}
        mode="add"
        citySelectionMode={pathname === RouteNamePaths.editCity ? 'locked' : 'selectable'}
        cityOptions={reminderCityOptions}
        selectedCityId={selectedAddReminderCityId}
        onSelectCityId={setSelectedAddReminderCityId}
        initialNotification={null}
        onClose={closeAddReminderModal}
        onSave={saveReminder}
      />
    </>
  );

  return {
    canAddReminder,
    isAddCityModalVisible,
    isAddReminderModalVisible,
    openAddCityModal,
    openAddReminderModal,
    addFlowModals,
  };
}
