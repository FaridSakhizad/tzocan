import { Modal, View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ImageBackground } from 'react-native';

type DeleteCityModalProps = {
  visible: boolean;
  cityName: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteCityModal({ visible, cityName, onClose, onConfirm }: DeleteCityModalProps) {
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
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>
              <Text style={styles.modalHeaderText}>
                Delete <Text style={styles.modalHeaderTextAccent}>&#34;{cityName}&#34;</Text>{'\n'}and all of its notifications?
              </Text>
            </Text>

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
  backgroundImage: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  backgroundImageAsset: {
    transform: [{ scale: 2 }],
  },
  modalContent: {
    backgroundColor: 'rgba(62, 63, 86, 0.3)',
    borderRadius: 20,
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
