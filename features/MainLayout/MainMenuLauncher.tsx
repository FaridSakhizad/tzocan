import React from 'react';
import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router';

import { AddCityModal, CityRow } from '@/components/add-city-modal';
import { MainMenuModal } from '@/components/main-menu-modal';
import { NotificationFormValues, NotificationModal } from '@/components/notification-modal';
import { useEditMode } from '@/contexts/edit-mode-context';
import { useSelectedCities } from '@/contexts/selected-cities-context';
import { useLocalizedCityNames } from '@/hooks/use-localized-city-names';
import { RouteNamePaths } from '@/types/router';
import { getCityDisplayName } from '@/utils/city-display';

type MainMenuLauncherProps = {
  visible: boolean;
  onClose: () => void;
};

export default function MainMenuLauncher({ visible, onClose }: MainMenuLauncherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const globalParams = useGlobalSearchParams<{ cityId?: string }>();
  const { isEditMode } = useEditMode();
  const { selectedCities, addCity, addNotification } = useSelectedCities();
  const localizedCityNames = useLocalizedCityNames(selectedCities.map((city) => city.cityId));
  const [isAddCityModalVisible, setIsAddCityModalVisible] = React.useState(false);
  const [isAddNotificationModalVisible, setIsAddNotificationModalVisible] = React.useState(false);
  const [selectedNotificationCityId, setSelectedNotificationCityId] = React.useState<number | null>(null);
  const [shouldForceUnmountMainMenu, setShouldForceUnmountMainMenu] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setShouldForceUnmountMainMenu(false);
    }
  }, [visible]);

  const forceCloseMainMenu = () => {
    setShouldForceUnmountMainMenu(true);
    onClose();
  };

  const notificationCityOptions = React.useMemo(
    () => selectedCities.map((city) => ({
      id: city.id,
      label: getCityDisplayName(city, localizedCityNames[city.cityId]),
      hint: city.tz,
      timezone: city.tz,
    })),
    [localizedCityNames, selectedCities]
  );

  const selectedNotificationCity = React.useMemo(
    () => selectedCities.find((city) => city.id === selectedNotificationCityId) || null,
    [selectedCities, selectedNotificationCityId]
  );

  const handleOpenAddCityModal = () => {
    if (isEditMode) {
      return;
    }

    forceCloseMainMenu();
    setIsAddCityModalVisible(true);
  };

  const handleCloseAddCityModal = () => {
    setIsAddCityModalVisible(false);
  };

  const handleSaveCity = (city: CityRow) => {
    addCity(city);
    setIsAddCityModalVisible(false);
  };

  const handleOpenAddNotificationModal = () => {
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

    forceCloseMainMenu();
    setSelectedNotificationCityId(defaultCityId);
    setIsAddNotificationModalVisible(true);
  };

  const handleCloseAddNotificationModal = () => {
    setIsAddNotificationModalVisible(false);
  };

  const handleSaveNotification = async (values: NotificationFormValues) => {
    if (!selectedNotificationCityId) {
      return false;
    }

    const didSave = await addNotification(
      selectedNotificationCityId,
      values.hour,
      values.minute,
      values.year,
      values.month,
      values.day,
      values.label,
      values.notes,
      values.url,
      values.repeat,
      values.weekdays
    );

    if (didSave) {
      setIsAddNotificationModalVisible(false);
    }

    return didSave;
  };

  const handleOpenContactScreen = () => {
    if (isEditMode) {
      return;
    }

    forceCloseMainMenu();
    router.replace(RouteNamePaths.contact);
  };

  const handleOpenSettingsScreen = () => {
    if (isEditMode) {
      return;
    }

    forceCloseMainMenu();
    router.replace(RouteNamePaths.settings);
  };

  const handleOpenAboutScreen = () => {
    if (isEditMode) {
      return;
    }

    forceCloseMainMenu();
    router.replace(RouteNamePaths.about);
  };

  return (
    <>
      <AddCityModal
        visible={isAddCityModalVisible}
        onClose={handleCloseAddCityModal}
        onSave={handleSaveCity}
      />

      <NotificationModal
        visible={isAddNotificationModalVisible}
        cityName={selectedNotificationCity ? getCityDisplayName(selectedNotificationCity, localizedCityNames[selectedNotificationCity.cityId]) : ''}
        mode="add"
        citySelectionMode={pathname === RouteNamePaths.editCity ? 'locked' : 'selectable'}
        cityOptions={notificationCityOptions}
        selectedCityId={selectedNotificationCityId}
        onSelectCityId={setSelectedNotificationCityId}
        initialNotification={null}
        onClose={handleCloseAddNotificationModal}
        onSave={handleSaveNotification}
      />

      {!shouldForceUnmountMainMenu && (
        <MainMenuModal
          visible={visible}
          onClose={onClose}
          onAddNotification={handleOpenAddNotificationModal}
          onAddCity={handleOpenAddCityModal}
          onContact={handleOpenContactScreen}
          onSettings={handleOpenSettingsScreen}
          onAbout={handleOpenAboutScreen}
          canAddNotification={selectedCities.length > 0}
        />
      )}
    </>
  );
}
