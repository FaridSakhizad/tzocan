import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View, ImageBackground } from 'react-native';

type DeleteNotificationModalProps = {
  visible: boolean;
  notificationTitle?: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteNotificationModal({
  visible,
  notificationTitle,
  onClose,
  onConfirm,
}: DeleteNotificationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalWrapper}
      >
        <ImageBackground
          source={require('@/assets/images/bg--main-1.jpg')}
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageAsset}
          resizeMode="cover"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              {notificationTitle ? (
                <Text style={styles.modalHeaderText}>Delete notification{'\n'}
                  <Text style={styles.modalHeaderTextAccent}>&#34;{notificationTitle}&#34;</Text>
                  ?</Text>
              ) : (
                <Text style={styles.modalHeaderText}>Delete this notification?</Text>
              )}
            </View>

            <View style={styles.actions}>
              <Pressable style={[styles.dialogButton, styles.dialogButtonDelete]} onPress={onConfirm}>
                <Text style={[styles.dialogButtonText, styles.dialogButtonTextDelete]}>Delete</Text>
              </Pressable>
              <Pressable style={[styles.dialogButton, styles.dialogButtonSecondary]} onPress={onClose}>
                <Text style={[styles.dialogButtonText, styles.dialogButtonTextSecondary]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </ImageBackground>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalWrapper: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-evenly',
    backgroundColor: 'rgba(62, 63, 86, 0.9)',
    padding: 40,
  },
  modalTop: {
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 'auto',
  },
  backgroundImage: {
    borderRadius: 36,
    overflow: 'hidden',
  },
  backgroundImageAsset: {
    transform: [{ scale: 2 }],
  },
  modalContainer: {
    backgroundColor: 'rgba(62, 63, 86, 0.3)',
    borderRadius: 36,
    paddingVertical: 20,
    paddingHorizontal: 23,
  },
  modalHeader: {
    paddingVertical: 12,
    paddingBottom: 24,
    minHeight: 100,
  },
  modalHeaderText: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 26,
    color: '#fff',
  },
  modalHeaderTextAccent: {
    fontWeight: 'bold',
  },
  actions: {
    gap: 10,
  },
  dialogButton: {
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(62, 63, 86, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  dialogButtonDelete: {
    backgroundColor: 'rgba(62, 63, 86, 0.6)',
  },
  dialogButtonTextDelete: {
    color: 'rgba(255, 255, 204, 1)',
  },
  dialogButtonSecondary: {
    backgroundColor: 'rgba(62, 63, 86, 0.2)',
  },
  dialogButtonTextSecondary: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
});
