import { useEffect, useState } from 'react';
import { useCameraPermission } from 'react-native-vision-camera';

export function useCameraPermissions() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [permissionError, setPermissionError] = useState<boolean>(false);

  useEffect(() => {
    const handlePermissions = async () => {
      if (!hasPermission) {
        const isGranted = await requestPermission();
        if (!isGranted) {
          setPermissionError(true);
        }
      }
    };
    handlePermissions();
  }, [hasPermission, requestPermission]);

  return { permissionError };
}
