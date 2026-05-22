import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useEditMode } from '@/contexts/edit-mode-context';
import { useNotificationsSort } from '@/contexts/notifications-sort-context';
import { useSelectedCities } from '@/contexts/selected-cities-context';
import { useLocalizedCityNames } from '@/hooks/use-localized-city-names';
import React, { useEffect } from 'react';
import { createStyles } from '@/features/MainLayout/HeaderButtons.styles';
import { RouteNamePaths } from '@/types/router';
import { getCityDisplayName } from '@/utils/city-display';
import { AddCityModal, CityRow } from '@/components/add-city-modal';
import { NotificationFormValues, NotificationModal } from '@/components/notification-modal';
import { Pressable, View } from 'react-native';
import IconBack from '@/assets/images/icon--arrow-2--outlined.svg';
import IconAddNotificationOutlined from '@/assets/images/icon--add-notification-1--outlined.svg';
import IconAddNotificationFilled from '@/assets/images/icon--add-notification-1--filled.svg';
import IconDelete1 from '@/assets/images/icon--delete-2--outlined.svg';
import IconCheckmarkFilled from '@/assets/images/icon--checkmark-1--filled.svg';
import IconEditOutlined from '@/assets/images/icon--edit-1--outlined.svg';
import IconMiscMenuFilled from '@/assets/images/icon--menu-2--filled.svg';
import IconMiscMenuOutlined from '@/assets/images/icon--menu-2--outlined.svg';
import IconAddLocationFilled from '@/assets/images/icon--add-location-1--filled.svg';
import IconAddLocationOutlined from '@/assets/images/icon--add-location-1--outlined.svg';
import { DeleteCityModal } from '@/components/delete-city-modal';

export default function HeaderButtons() {
  const router = useRouter();
  const pathname = usePathname();
  const globalParams = useGlobalSearchParams<{ cityId?: string }>();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { isEditMode, toggleEditMode } = useEditMode();
  const { openSortPicker, isSortPickerVisible } = useNotificationsSort();
  const { selectedCities, addCity, addNotification, removeCity } = useSelectedCities();
  const localizedCityNames = useLocalizedCityNames(selectedCities.map((city) => city.cityId));

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const [isAddCityModalVisible, setIsAddCityModalVisible] = React.useState(false);
  const [isAddNotificationModalVisible, setIsAddNotificationModalVisible] = React.useState(false);
  const [selectedNotificationCityId, setSelectedNotificationCityId] = React.useState<number | null>(null);
  const [isDeleteCityModalVisible, setIsDeleteCityModalVisible] = React.useState(false);

  const lastActiveTabPathRef = React.useRef<RouteNamePaths.root | RouteNamePaths.timeline | RouteNamePaths.notifications>(RouteNamePaths.root);

  const isEditCityScreen = pathname === RouteNamePaths.editCity;
  const isContactScreen = pathname === RouteNamePaths.contact;
  const isSettingsScreen = pathname === RouteNamePaths.settings;
  const isAboutScreen = pathname === RouteNamePaths.about;
  const isNotificationsScreen = pathname === RouteNamePaths.notifications;
  const isIndexScreen = pathname === RouteNamePaths.root || pathname === RouteNamePaths.cities;
  const isTimelineScreen = pathname === RouteNamePaths.timeline;

  const isSortScreen = isIndexScreen || isTimelineScreen || isNotificationsScreen;
  const isDetailScreen = isEditCityScreen || isContactScreen || isSettingsScreen || isAboutScreen;

  const currentEditCityId = isEditCityScreen && globalParams.cityId ? Number(globalParams.cityId) : null;

  const currentEditCity = React.useMemo(
    () => currentEditCityId ? selectedCities.find((city) => city.id === currentEditCityId) || null : null,
    [currentEditCityId, selectedCities]
  );

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

  useEffect(() => {
    if (
      pathname === RouteNamePaths.root ||
      pathname === RouteNamePaths.cities ||
      pathname === RouteNamePaths.timeline ||
      pathname === RouteNamePaths.notifications
    ) {
      lastActiveTabPathRef.current = pathname === RouteNamePaths.cities ? RouteNamePaths.root : pathname;
    }
  }, [pathname]);

  const handleOpenAddCityModal = () => {
    if (isEditMode) {
      return;
    }

    setIsAddCityModalVisible(true);
  };

  const handleCloseAddCityModal = () => {
    setIsAddCityModalVisible(false);
  };

  const handleSaveCity = (city: CityRow) => {
    addCity(city);
    setIsAddCityModalVisible(false);
  };

  const handleOpenDeleteCityModal = () => {
    if (pathname !== RouteNamePaths.editCity || !currentEditCity) {
      return;
    }

    setIsDeleteCityModalVisible(true);
  };

  const handleCloseDeleteCityModal = () => {
    setIsDeleteCityModalVisible(false);
  };

  const handleConfirmDeleteCity = () => {
    if (!currentEditCity) {
      return;
    }

    removeCity(currentEditCity.id);
    setIsDeleteCityModalVisible(false);

    router.navigate(RouteNamePaths.root);
  };

  const handleBackFromEditCity = () => {
    router.navigate(lastActiveTabPathRef.current);
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

  return (
    <>
      <View style={{
        ...styles.headerButtonsContainer,
        paddingTop: insets.top + 5,
      }}>
        {isEditCityScreen && (
          <>
            <Pressable
              onPress={handleBackFromEditCity}
              disabled={isEditMode || selectedCities.length === 0}
              style={[
                styles.headerButton,
                styles.headerButtonBack,
              ]}
            >
              <IconBack
                style={styles.headerButtonIcon}
                fill={theme.text.primary}
              />
            </Pressable>

            <Pressable
              onPress={handleOpenAddNotificationModal}
              disabled={isEditMode || selectedCities.length === 0}
              style={[styles.headerButton, (isEditMode || selectedCities.length === 0) && styles.headerButtonDisabled]}
            >
              {isAddNotificationModalVisible ? (
                <IconAddNotificationOutlined
                  style={styles.headerButtonIcon}
                  fill={theme.text.primary}
                />
              ) : (
                <IconAddNotificationFilled
                  style={styles.headerButtonIcon}
                  fill={theme.text.primary}
                />
              )}
            </Pressable>

            <Pressable
              onPress={handleOpenDeleteCityModal}
              style={[
                styles.headerButton,
                styles.headerButtonDelete,
              ]}
            >
              <IconDelete1
                style={styles.headerButtonIcon}
                fill={theme.text.warning}
              />
            </Pressable>
          </>
        )}

        {(isContactScreen || isSettingsScreen || isAboutScreen) && (
          <>
            <Pressable
              onPress={handleBackFromEditCity}
              style={[
                styles.headerButton,
                styles.headerButtonBack,
              ]}
            >
              <IconBack
                style={styles.headerButtonIcon}
                fill={theme.text.primary}
              />
            </Pressable>
          </>
        )}

        {!isDetailScreen && (
          <>
            <Pressable
              onPress={toggleEditMode}
              style={[
                styles.headerButton,
                styles.headerButtonEditCitiesList,
              ]}
            >
              {isEditMode ? (
                <IconCheckmarkFilled
                  style={styles.headerButtonIcon}
                  fill={theme.text.primary}
                />
              ) : (
                <IconEditOutlined
                  style={styles.headerButtonIcon}
                  fill={theme.text.primary}
                />
              )}
            </Pressable>

            <Pressable
              onPress={handleOpenAddNotificationModal}
              disabled={isEditMode || selectedCities.length === 0}
              style={[styles.headerButton, (isEditMode || selectedCities.length === 0) && styles.headerButtonDisabled]}
            >
              {isAddNotificationModalVisible ? (
                <IconAddNotificationOutlined
                  style={styles.headerButtonIcon}
                  fill={theme.text.primary}
                />
              ) : (
                <IconAddNotificationFilled
                  style={styles.headerButtonIcon}
                  fill={theme.text.primary}
                />
              )}
            </Pressable>

            <Pressable
              onPress={handleOpenAddCityModal}
              disabled={isEditMode}
              style={[styles.headerButton, isEditMode && styles.headerButtonDisabled]}
            >
              {isAddCityModalVisible ? (
                <IconAddLocationFilled
                  style={styles.headerButtonIcon}
                  fill={theme.text.primary}
                />
              ) : (
                <IconAddLocationOutlined
                  style={styles.headerButtonIcon}
                  fill={theme.text.primary}
                />
              )}
            </Pressable>

            {isSortScreen && (
              <Pressable
                onPress={openSortPicker}
                disabled={isEditMode}
                style={[
                  styles.headerButton,
                  styles.headerButtonSort,
                  isEditMode && styles.headerButtonDisabled,
                ]}
              >
                {isSortPickerVisible ? (
                  <IconMiscMenuFilled
                    style={styles.headerButtonIcon}
                    fill={theme.text.primary}
                  />
                ) : (
                  <IconMiscMenuOutlined
                    style={styles.headerButtonIcon}
                    fill={theme.text.primary}
                  />
                )}
              </Pressable>
            )}
          </>
        )}
      </View>

      <AddCityModal
        visible={isAddCityModalVisible}
        onClose={handleCloseAddCityModal}
        onSave={handleSaveCity}
      />

      <NotificationModal
        visible={isAddNotificationModalVisible}
        cityName={selectedNotificationCity ? getCityDisplayName(selectedNotificationCity, localizedCityNames[selectedNotificationCity.cityId]) : ''}
        mode="add"
        citySelectionMode={pathname === '/edit-city' ? 'locked' : 'selectable'}
        cityOptions={notificationCityOptions}
        selectedCityId={selectedNotificationCityId}
        onSelectCityId={setSelectedNotificationCityId}
        initialNotification={null}
        onClose={handleCloseAddNotificationModal}
        onSave={handleSaveNotification}
      />
      <DeleteCityModal
        visible={isDeleteCityModalVisible}
        cityName={currentEditCity ? getCityDisplayName(currentEditCity, localizedCityNames[currentEditCity.cityId]) : 'this city'}
        onClose={handleCloseDeleteCityModal}
        onConfirm={handleConfirmDeleteCity}
      />
    </>
  );
}
